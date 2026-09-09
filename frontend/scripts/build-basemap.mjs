/**
 * Builds the offline basemap assets in public/basemap/.
 *
 * Run once with `npm run basemap`; the output is COMMITTED. The repo's offline
 * guarantee (CLAUDE.md, PROGRESS.md, ADR 0001/0002, ADR 0004) means the map may not
 * reach a tile server at runtime, so the geography is baked in at build time instead.
 *
 * Natural Earth publishes bathymetry only at 10m scale, and the twelve contour levels
 * total ~49 MB of raw GeoJSON. That is why this is a script and not a curl: the
 * contours are decimated to a viewing tolerance before they are committed.
 *
 * Everything downloaded here is public domain (Natural Earth; NASA Blue Marble).
 */

import { mkdirSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const NE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson';
const BLUE_MARBLE =
  'https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73909/world.topo.bathy.200412.3x5400x2700.jpg';

const OUT = join(process.cwd(), 'public', 'basemap');
mkdirSync(OUT, { recursive: true });

/**
 * Contour levels to keep, shallow to deep.
 *
 * L_0 is the 0 m shoreline, which the coastline already draws. A/B/C (10000-8000 m)
 * are a handful of trench slivers - invisible at any zoom this app uses, so they only
 * cost bytes. What is left reads as ocean structure: shelf break, slope, abyssal plain.
 */
const BATHY_LEVELS = ['K_200', 'J_1000', 'I_2000', 'H_3000', 'G_4000', 'F_5000', 'E_6000'];

/** ~1 km at the equator. Finer than any pixel at this app's zoom range. */
const PRECISION = 2;

/**
 * Fetch with retry.
 *
 * The Blue Marble raster is 2.5 MB over TLS and resets the connection often enough
 * that a single attempt fails intermittently. Retrying here keeps the script
 * reproducible rather than something you have to babysit.
 */
async function getWithRetry(url, attempts = 5) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        console.log(`    retry ${attempt}/${attempts - 1} (${error.message ?? error})`);
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  throw new Error(`failed after ${attempts} attempts: ${url} (${lastError})`);
}

async function getJson(url) {
  return (await getWithRetry(url)).json();
}

const round = (n) => Number(n.toFixed(PRECISION));

/**
 * Perpendicular-distance simplification (Douglas-Peucker), iterative so that a
 * 40,000-vertex abyssal contour cannot blow the call stack.
 *
 * Implemented here rather than pulled from npm: it is ~30 lines, and the offline
 * guarantee is better served by one fewer dependency.
 */
function simplify(points, tolerance) {
  if (points.length < 3) return points;
  const sqTolerance = tolerance * tolerance;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];

  while (stack.length) {
    const [first, last] = stack.pop();
    let maxSq = 0;
    let index = -1;
    const [x1, y1] = points[first];
    const [x2, y2] = points[last];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = dx * dx + dy * dy;

    for (let i = first + 1; i < last; i += 1) {
      const [px, py] = points[i];
      let t = len === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / len;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const ex = x1 + t * dx - px;
      const ey = y1 + t * dy - py;
      const sq = ex * ex + ey * ey;
      if (sq > maxSq) {
        maxSq = sq;
        index = i;
      }
    }

    if (maxSq > sqTolerance && index !== -1) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }

  return points.filter((_, i) => keep[i]);
}

/** Every outer/inner ring in a Polygon or MultiPolygon, as flat coordinate arrays. */
function ringsOf(geometry) {
  if (geometry.type === 'Polygon') return geometry.coordinates;
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.flat();
  if (geometry.type === 'LineString') return [geometry.coordinates];
  if (geometry.type === 'MultiLineString') return geometry.coordinates;
  return [];
}

/** Shoelace area in square degrees - used only to discard specks. */
function ringArea(ring) {
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    sum += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1]);
  }
  return Math.abs(sum / 2);
}

function report(name) {
  const bytes = statSync(join(OUT, name)).size;
  console.log(`  ${name.padEnd(26)} ${(bytes / 1024).toFixed(0).padStart(6)} KB`);
  return bytes;
}

let total = 0;

// ---------------------------------------------------------------- land + coastline

console.log('\nland + coastline (Natural Earth 110m)');

const land = await getJson(`${NE}/ne_110m_land.geojson`);
const landPolygons = [];
for (const feature of land.features) {
  const rings = ringsOf(feature.geometry)
    .map((ring) => simplify(ring, 0.08).map(([x, y]) => [round(x), round(y)]))
    .filter((ring) => ring.length >= 4 && ringArea(ring) > 0.05);
  // SolidPolygonLayer takes one polygon per datum; splitting MultiPolygons here keeps
  // the layer's accessor trivial.
  for (const ring of rings) landPolygons.push(ring);
}
writeFileSync(join(OUT, 'land.json'), JSON.stringify(landPolygons));
total += report('land.json');

const coast = await getJson(`${NE}/ne_110m_coastline.geojson`);
const coastPaths = [];
for (const feature of coast.features) {
  for (const ring of ringsOf(feature.geometry)) {
    const path = simplify(ring, 0.08).map(([x, y]) => [round(x), round(y)]);
    if (path.length >= 2) coastPaths.push(path);
  }
}
writeFileSync(join(OUT, 'coastline.json'), JSON.stringify(coastPaths));
total += report('coastline.json');

// ----------------------------------------------------------------------- bathymetry

console.log('\nbathymetry contours (Natural Earth 10m, decimated)');

const bathy = [];
for (const level of BATHY_LEVELS) {
  const collection = await getJson(`${NE}/ne_10m_bathymetry_${level}.geojson`);
  const depth = collection.features[0]?.properties?.depth ?? 0;
  let kept = 0;
  for (const feature of collection.features) {
    for (const ring of ringsOf(feature.geometry)) {
      // The deep contours are enormous and mostly noise at this zoom; a coarser
      // tolerance on them is what brings 49 MB down to something committable.
      const path = simplify(ring, 0.25).map(([x, y]) => [round(x), round(y)]);
      if (path.length >= 6 && ringArea(path) > 1.5) {
        bathy.push({ depth_m: depth, path });
        kept += 1;
      }
    }
  }
  console.log(`  ${level.padEnd(8)} ${String(depth).padStart(5)} m  ->  ${kept} rings`);
}
writeFileSync(join(OUT, 'bathymetry.json'), JSON.stringify(bathy));
total += report('bathymetry.json');

// --------------------------------------------------------------------- ocean labels

console.log('\nocean + sea labels');

const marine = await getJson(`${NE}/ne_110m_geography_marine_polys.geojson`);
const labels = marine.features
  .map((feature) => {
    // Bounding-box centre, not a true centroid: for a concave basin like the Bay of
    // Bengal the centroid can fall on land, and this is only a label anchor.
    let minX = 180;
    let minY = 90;
    let maxX = -180;
    let maxY = -90;
    for (const ring of ringsOf(feature.geometry)) {
      for (const [x, y] of ring) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
    return {
      name: feature.properties.label ?? feature.properties.name,
      lon: round((minX + maxX) / 2),
      lat: round((minY + maxY) / 2),
      // scalerank drives which labels survive at low zoom: oceans first, seas later.
      rank: feature.properties.scalerank ?? 5,
    };
  })
  .filter((label) => label.name);
writeFileSync(join(OUT, 'ocean-labels.json'), JSON.stringify(labels));
total += report('ocean-labels.json');

// ----------------------------------------------------------------- satellite raster

console.log('\nsatellite raster (NASA Blue Marble, topo + bathymetry)');

const image = await getWithRetry(BLUE_MARBLE);
writeFileSync(join(OUT, 'earth-bathy.jpg'), Buffer.from(await image.arrayBuffer()));
total += report('earth-bathy.jpg');

console.log(`\ntotal committed: ${(total / 1024 / 1024).toFixed(2)} MB\n`);
