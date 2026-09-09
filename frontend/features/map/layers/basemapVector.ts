/**
 * Dark ocean vector basemap - landmasses, coastline, and bathymetric contours.
 *
 * The default style, and the one built for this application rather than borrowed. It
 * draws the ocean the way a paper chart does: land as flat fill, the coastline as the
 * one firm edge, and depth as fine contour line-work. Nothing here is saturated, so
 * the thermal and haline colour ramps on the point cloud keep the entire chromatic
 * range to themselves (see the Basemap section of DESIGN.md for the argument).
 *
 * Geometry comes from Natural Earth via `npm run basemap`, decimated to a viewing
 * tolerance and committed. Coordinates are raw [lon, lat] degrees, which is exactly
 * what OrbitView wants - no projection step.
 */

import { PathLayer, PolygonLayer } from '@deck.gl/layers';
import { basemapRgb, bathymetryColor } from '@/design/tokens';
import { registerLayer } from './registry';
import { BASEMAP_BOUNDS, BASEMAP_PARAMETERS } from './basemapShared';

type Ring = [number, number][];
interface BathymetryRing {
  depth_m: number;
  path: [number, number][];
}

/** The whole-globe water plane the geography sits on. */
const OCEAN_PLANE: Ring[] = [
  [
    [BASEMAP_BOUNDS[0], BASEMAP_BOUNDS[1]],
    [BASEMAP_BOUNDS[2], BASEMAP_BOUNDS[1]],
    [BASEMAP_BOUNDS[2], BASEMAP_BOUNDS[3]],
    [BASEMAP_BOUNDS[0], BASEMAP_BOUNDS[3]],
  ],
];

export const basemapVector = registerLayer({
  id: 'basemap-ocean',
  label: 'Dark ocean basemap',
  supports: () => true,
  build: (ctx) => {
    if (ctx.basemap !== 'ocean') return null;

    return [
      // Water. Slightly darker and cooler than the page, so the canvas reads as
      // deeper than the chrome around it.
      new PolygonLayer<Ring>({
        id: 'basemap-ocean-plane',
        data: OCEAN_PLANE,
        getPolygon: (d) => d,
        stroked: false,
        filled: true,
        getFillColor: [...basemapRgb.ocean, 255],
        parameters: BASEMAP_PARAMETERS,
      }),

      // Depth structure. Drawn beneath the coastline so the shelf break tucks under
      // the shore rather than crossing it.
      new PathLayer<BathymetryRing>({
        id: 'basemap-bathymetry',
        data: '/basemap/bathymetry.json',
        getPath: (d) => d.path,
        widthUnits: 'pixels',
        getWidth: 0.7,
        widthMinPixels: 0.5,
        getColor: (d) => [...bathymetryColor(d.depth_m), 200],
        parameters: BASEMAP_PARAMETERS,
      }),

      new PolygonLayer<Ring>({
        id: 'basemap-land',
        data: '/basemap/land.json',
        getPolygon: (d) => d,
        stroked: false,
        filled: true,
        getFillColor: [...basemapRgb.land, 255],
        parameters: BASEMAP_PARAMETERS,
      }),

      // The ocean/land boundary is the one edge that has to read at every zoom, so it
      // is the firmest line in the basemap.
      new PathLayer<Ring>({
        id: 'basemap-coastline',
        data: '/basemap/coastline.json',
        getPath: (d) => d,
        widthUnits: 'pixels',
        getWidth: 1,
        widthMinPixels: 0.8,
        getColor: [...basemapRgb.landEdge, 255],
        parameters: BASEMAP_PARAMETERS,
      }),
    ];
  },
});
