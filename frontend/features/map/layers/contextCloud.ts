/**
 * The context cloud: measurements in the same region and period that did NOT match.
 *
 * Why it exists (ADR 0006). A query that returns 411 of 60,000 measurements used to
 * render as 411 dots in an empty ocean. That reads as a small dataset, not as a
 * selective filter - the viewer cannot tell "we excluded 59,589 measurements" from
 * "there were only ever 411". Drawing the rejected set makes the filter legible AS a
 * filter, fills the frame, and is the more honest of the two pictures.
 *
 * Three properties keep it subordinate to the data, and all three matter:
 *
 *  1. **Neutral, never a colormap.** A context point carries no encoded value. Running
 *     it through the active colormap would put tens of thousands of meaningful-looking
 *     samples on the canvas that mean nothing - the same argument DESIGN.md makes
 *     against a blue basemap. Graphite is hue-separated from thermal and haline, so a
 *     coloured pixel still always means a measurement that matched.
 *  2. **Drawn underneath.** Registered before `point-cloud-3d`, and registration order
 *     is draw order (see the import block in ./index.ts).
 *  3. **Not pickable.** Hovering or clicking a rejected measurement would open an
 *     inspector for something that is not in the result, and - more practically - it
 *     would intercept picks meant for the matched cloud sitting on top of it. This is
 *     also what keeps `npm run verify`'s framebuffer-scan-then-click check meaningful.
 *
 * Depth state is deliberately left at deck.gl's default. The basemap's
 * `depthCompare: 'always'` / `depthWriteEnabled: false` escape hatch (ADR 0004) exists
 * because geography is a flat backdrop at z=0 that would otherwise occlude the whole
 * water column. Context points are real measurements at real negative z; they must
 * depth-sort against the matched cloud like any other data, and copying the basemap's
 * parameters here would make them punch through solid geometry.
 */

import { DataFilterExtension, type DataFilterExtensionProps } from '@deck.gl/extensions';
import { ScatterplotLayer, type ScatterplotLayerProps } from '@deck.gl/layers';
import { contextCloud as contextTokens, rgb } from '@/design/tokens';
import type { ArgoFloatPoint } from '@/types/argo';
import { depthToZ, registerLayer } from './registry';

/**
 * Same extension instance shape as the matched cloud: time is a shader uniform, not a
 * per-frame attribute re-upload. This is the layer where that matters most - it holds
 * roughly 150x more points than the result does, so a CPU filter here would cost far
 * more than it ever did on the matched cloud.
 */
const TIME_FILTER = new DataFilterExtension({ filterSize: 1 });

function epoch(timestamp: string): number {
  const t = Date.parse(timestamp);
  return Number.isFinite(t) ? t : 0;
}

export const contextPointCloud = registerLayer({
  id: 'context-cloud',
  label: 'Context',
  supports: () => true,
  build: (ctx) => {
    if (!ctx.showContext || ctx.contextPoints.length === 0) return null;

    const range: [number, number] = ctx.timeEnabled
      ? [ctx.timeCursor - ctx.timeWindowMs, ctx.timeCursor]
      : [-8.64e15, 8.64e15];

    const props: ScatterplotLayerProps<ArgoFloatPoint> &
      DataFilterExtensionProps<ArgoFloatPoint> = {
      id: 'context-cloud',
      data: ctx.contextPoints,
      pickable: false,
      radiusUnits: 'pixels',
      getRadius: contextTokens.radiusPx,
      radiusMinPixels: contextTokens.radiusMinPx,
      getPosition: (d) => [d.longitude, d.latitude, depthToZ(d.depth_m, ctx.depthExaggeration)],
      getFillColor: [...rgb.secondary, contextTokens.alpha],
      extensions: [TIME_FILTER],
      getFilterValue: (d) => epoch(d.timestamp),
      filterRange: range,
      /*
       * NO soft range, deliberately - and this is the opposite of the matched cloud.
       *
       * `point-cloud-3d` fades the oldest 55% of its window toward transparent, which
       * gives 411 points a comet tail that reads as motion. Copying that here was the
       * first attempt and it gutted the layer: measured on a 1-year window, 60,000
       * context points produced a lit-pixel delta of 168 against context-off, because
       * most of the cloud was being faded to nothing by the very effect meant to
       * animate it.
       *
       * The hard `filterRange` above is what "respects the time cursor" actually means
       * - a context point is in the window or it is not. Recency is a story about the
       * results, not about the scenery they sit in.
       */
      updateTriggers: {
        // Excludes timeCursor, exactly as point-cloud-3d does and for the same reason:
        // listing a per-frame value here reintroduces the attribute re-upload the
        // GPU filter exists to remove. See ADR 0003.
        getPosition: [ctx.depthExaggeration],
      },
    };
    return new ScatterplotLayer<ArgoFloatPoint>(props as ScatterplotLayerProps<ArgoFloatPoint>);
  },
});
