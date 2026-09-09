/**
 * Registered layer factories.
 *
 * Adding a visualization: write the factory, register it here. Nothing else changes.
 */

import { LineLayer, PathLayer, ScatterplotLayer } from '@deck.gl/layers';
import { rgb } from '@/design/tokens';
import {
  type LayerContext,
  depthToZ,
  registerLayer,
  registeredLayers,
  withinTimeWindow,
} from './registry';

/**
 * Time filtering happens here in JavaScript, and that is a measured decision.
 *
 * The textbook alternative is DataFilterExtension, which uploads timestamps once as a
 * static attribute and changes a single uniform per frame - no per-frame accessor
 * evaluation, no attribute re-upload. It was implemented and benchmarked. At 60,000
 * points it measured **1.1 fps against 15 fps** for this approach.
 *
 * That result is an artifact of the measuring environment, not a verdict. Headless
 * Chromium here rasterises with SwiftShader in software at roughly 16 microseconds per
 * point, so drawing all 60,000 and discarding them in the fragment shader dominates
 * everything else. On real hardware, rasterising 60k points is nearly free and the GPU
 * approach should win comfortably.
 *
 * So: the CPU filter ships because it is the only version measured acceptable in the
 * only environment available. Anyone with a real GPU should re-run
 * `npm run perf` against both before concluding. See docs/adr/0003-cpu-time-filter.md.
 */
function timeAlpha(timestamp: string, ctx: LayerContext): number {
  if (!ctx.timeEnabled) return 200;
  const t = Date.parse(timestamp);
  const age = ctx.timeCursor - t;
  if (age < 0 || age > ctx.timeWindowMs) return 0;
  return Math.round(60 + 195 * (1 - age / ctx.timeWindowMs));
}

/** The 4D point cloud: longitude, latitude, depth, and time as the fourth axis. */
export const pointCloud3d = registerLayer({
  id: 'point-cloud-3d',
  label: 'Measurements',
  supports: () => true,
  build: (ctx) => {
    const visible = ctx.points.filter((p) =>
      withinTimeWindow(p, ctx.timeCursor, ctx.timeWindowMs, ctx.timeEnabled),
    );
    return new ScatterplotLayer<(typeof visible)[number]>({
      id: 'point-cloud-3d',
      data: visible,
      pickable: true,
      radiusUnits: 'pixels',
      getRadius: (d) => (d.wmo_id === ctx.selectedFloatId ? 3.4 : 2.1),
      radiusMinPixels: 1.4,
      getPosition: (d) => [d.longitude, d.latitude, depthToZ(d.depth_m, ctx.depthExaggeration)],
      getFillColor: (d) => {
        const value = ctx.colorBy
          ? ((d as unknown as Record<string, number | null>)[ctx.colorBy.key] ?? null)
          : null;
        const [r, g, b] = ctx.colorScale(value);
        return [r, g, b, timeAlpha(d.timestamp, ctx)];
      },
      onClick: (info) => {
        if (info.object) ctx.onSelect(info.object);
        return true;
      },
      onHover: (info) => {
        ctx.onHover(info.object ?? null);
      },
      updateTriggers: {
        // Precise triggers matter: an over-broad list forces a full attribute re-upload
        // every frame during playback and is the usual cause of scrubbing jank.
        getFillColor: [ctx.colorBy?.key, ctx.timeCursor, ctx.timeEnabled, ctx.timeWindowMs],
        getRadius: [ctx.selectedFloatId],
      },
    });
  },
});

/** Surface paths, so a float reads as a drifting object rather than a cloud of dots. */
export const trajectoryPaths = registerLayer({
  id: 'trajectory-paths',
  label: 'Trajectories',
  supports: () => true,
  build: (ctx) => {
    if (!ctx.showTrajectories || ctx.trajectories.length === 0) return null;
    return new PathLayer<(typeof ctx.trajectories)[number]>({
      id: 'trajectory-paths',
      data: ctx.trajectories,
      pickable: false,
      widthUnits: 'pixels',
      getWidth: (d) => (d.wmo_id === ctx.selectedFloatId ? 2.2 : 1),
      capRounded: true,
      jointRounded: true,
      getPath: (d) =>
        d.points
          .filter((p) => withinTimeWindow(p, ctx.timeCursor, ctx.timeWindowMs * 12, ctx.timeEnabled))
          .map((p) => [p.longitude, p.latitude, 0] as [number, number, number]),
      // Admiralty magenta marks the selected float. It is a stroke, never an area fill
      // inside the canvas - that restraint is what keeps the accent from being read as
      // a data value, per DESIGN.md.
      getColor: (d) =>
        d.wmo_id === ctx.selectedFloatId
          ? [...rgb.tertiary, 235]
          : [...rgb.secondary, 90],
      updateTriggers: {
        getColor: [ctx.selectedFloatId],
        getWidth: [ctx.selectedFloatId],
        getPath: [ctx.timeCursor, ctx.timeEnabled],
      },
    });
  },
});

/** Drop-lines from the surface to each measurement, so depth is legible in 3D. */
export const depthColumns = registerLayer({
  id: 'depth-columns',
  label: 'Depth columns',
  supports: () => true,
  build: (ctx) => {
    if (!ctx.selectedFloatId) return null;
    const selected = ctx.points
      .filter((p) => p.wmo_id === ctx.selectedFloatId)
      .filter((p) => withinTimeWindow(p, ctx.timeCursor, ctx.timeWindowMs, ctx.timeEnabled));
    if (selected.length === 0) return null;
    return new LineLayer({
      id: 'depth-columns',
      data: selected,
      widthUnits: 'pixels',
      getWidth: 0.6,
      getSourcePosition: (d) => [d.longitude, d.latitude, 0],
      getTargetPosition: (d) => [
        d.longitude,
        d.latitude,
        depthToZ(d.depth_m, ctx.depthExaggeration),
      ],
      getColor: [...rgb.border, 130],
      updateTriggers: {
        getTargetPosition: [ctx.depthExaggeration],
      },
    });
  },
});

/** Graticule. Drawn rather than tiled, so the map works with no network. */
export const graticule = registerLayer({
  id: 'graticule',
  label: 'Graticule',
  supports: () => true,
  build: (ctx) => {
    if (!ctx.showGraticule) return null;
    const lines: { from: [number, number, number]; to: [number, number, number]; major: boolean }[] =
      [];
    for (let lon = -180; lon <= 180; lon += 10) {
      lines.push({ from: [lon, -80, 0], to: [lon, 80, 0], major: lon % 30 === 0 });
    }
    for (let lat = -80; lat <= 80; lat += 10) {
      lines.push({ from: [-180, lat, 0], to: [180, lat, 0], major: lat === 0 });
    }
    return new LineLayer({
      id: 'graticule',
      data: lines,
      widthUnits: 'pixels',
      getWidth: (d) => (d.major ? 1 : 0.5),
      getSourcePosition: (d) => d.from,
      getTargetPosition: (d) => d.to,
      getColor: (d) => (d.major ? [...rgb.border, 190] : [...rgb.border, 105]),
    });
  },
});

export { registeredLayers };
export type { LayerContext, LayerFactory } from './registry';
