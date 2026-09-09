/**
 * Registered layer factories.
 *
 * Adding a visualization: write the factory, register it here. Nothing else changes.
 */

import { DataFilterExtension, type DataFilterExtensionProps } from '@deck.gl/extensions';
import {
  LineLayer,
  PathLayer,
  ScatterplotLayer,
  type ScatterplotLayerProps,
} from '@deck.gl/layers';
import type { ArgoFloatPoint } from '@/types/argo';
import { rgb } from '@/design/tokens';
import {
  type LayerContext,
  depthToZ,
  registerLayer,
  registeredLayers,
  withinTimeWindow,
} from './registry';

/**
 * Basemap factories, imported FIRST on purpose.
 *
 * Registration order is draw order - `useLayerBuilder` flat-maps `registeredLayers()`
 * in sequence - and ES module imports are evaluated before this module's own body. So
 * importing them here guarantees the geography registers ahead of the data layers and
 * paints behind them. The ordering is structural, not a happy accident of file layout.
 */
import './basemapVector';
import './basemapSatellite';
import './oceanLabels';

/**
 * Time filtering runs on the GPU. This is measured, not assumed.
 *
 * The obvious implementation - filter the points array by the cursor each frame and
 * fold an age-based alpha into getFillColor - makes deck.gl re-evaluate every accessor
 * and re-upload every attribute buffer on every animation frame.
 *
 * DataFilterExtension uploads each timestamp once as a static attribute and changes
 * only a uniform per frame, so playback costs nothing per point. `filterSoftRange`
 * gives the comet-tail fade in the shader for free.
 *
 * Measured at 60,000 points, Intel UHD Graphics 620 (see docs/adr/0003):
 *
 *     CPU filter   33.4 ms   29.9 fps
 *     GPU filter   16.7 ms   59.9 fps   <- vsync-locked, p95 59.5
 *
 * Worth knowing: on a SOFTWARE rasteriser the comparison inverts (1.1 fps vs 15),
 * because rejecting 60k points in the fragment shader is expensive there and nearly
 * free on real hardware. Benchmark this on a GPU or the result will mislead you.
 */
const TIME_FILTER = new DataFilterExtension({ filterSize: 1 });

/** Epoch ms as the filter value. Computed once per point, never per frame. */
function epoch(timestamp: string): number {
  const t = Date.parse(timestamp);
  return Number.isFinite(t) ? t : 0;
}

/** The 4D point cloud: longitude, latitude, depth, and time as the fourth axis. */
export const pointCloud3d = registerLayer({
  id: 'point-cloud-3d',
  label: 'Measurements',
  supports: () => true,
  build: (ctx) => {
    const range: [number, number] = ctx.timeEnabled
      ? [ctx.timeCursor - ctx.timeWindowMs, ctx.timeCursor]
      : [-8.64e15, 8.64e15];

    const props: ScatterplotLayerProps<ArgoFloatPoint> &
      DataFilterExtensionProps<ArgoFloatPoint> = {
      id: 'point-cloud-3d',
      data: ctx.points,
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
        return [r, g, b, 210];
      },
      extensions: [TIME_FILTER],
      getFilterValue: (d) => epoch(d.timestamp),
      filterRange: range,
      filterSoftRange: [range[0] + (range[1] - range[0]) * 0.55, range[1]],
      filterTransformColor: true,
      onClick: (info) => {
        if (info.object) ctx.onSelect(info.object);
        return true;
      },
      onHover: (info) => {
        ctx.onHover(info.object ?? null);
      },
      updateTriggers: {
        // Deliberately excludes timeCursor. Time is a uniform now; listing it here
        // would reintroduce the per-frame attribute re-upload this design removes,
        // halving the frame rate.
        getFillColor: [ctx.colorBy?.key],
        getRadius: [ctx.selectedFloatId],
        getPosition: [ctx.depthExaggeration],
      },
    };
    return new ScatterplotLayer<ArgoFloatPoint>(props as ScatterplotLayerProps<ArgoFloatPoint>);
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
