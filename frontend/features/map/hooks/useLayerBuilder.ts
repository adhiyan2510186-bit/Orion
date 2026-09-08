'use client';

import { useMemo } from 'react';
import { makeColorScale, isColormapName } from '@/design/scales';
import { useQueryStore, useSelectionStore, useTimeStore, useViewStore } from '@/lib/state/stores';
import { useMeta } from '@/lib/hooks/useMeta';
import { type LayerContext, registeredLayers } from '../layers';
import type { ArgoFloatPoint } from '@/types/argo';

/**
 * The single point where the visualization is assembled.
 *
 * Iterates the layer registry and builds whatever is registered and supported. A new
 * visualization appears here automatically; this file never needs editing to add one.
 */
export function useLayerBuilder() {
  const response = useQueryStore((s) => s.response);
  const { cursor, windowMs, enabled } = useTimeStore();
  const { colorBy, depthExaggeration, showTrajectories, showGraticule } = useViewStore();
  const { floatId, select, hover } = useSelectionStore();
  const { meta, variables } = useMeta();

  const descriptor = useMemo(
    () => variables.find((v) => v.key === colorBy) ?? variables[0] ?? null,
    [variables, colorBy],
  );

  const colorScale = useMemo(() => {
    const name = descriptor && isColormapName(descriptor.colormap) ? descriptor.colormap : 'gray';
    return makeColorScale(name, descriptor?.min_value ?? 0, descriptor?.max_value ?? 1);
  }, [descriptor]);

  const context: LayerContext = useMemo(
    () => ({
      points: response?.points ?? [],
      trajectories: response?.trajectories ?? [],
      timeCursor: cursor,
      timeWindowMs: windowMs,
      timeEnabled: enabled,
      colorScale,
      colorBy: descriptor,
      depthExaggeration,
      selectedFloatId: floatId,
      onSelect: (point: ArgoFloatPoint) => select(point.wmo_id, point.cycle_number),
      onHover: hover,
      showTrajectories,
      showGraticule,
    }),
    [response, cursor, windowMs, enabled, colorScale, descriptor, depthExaggeration,
     floatId, select, hover, showTrajectories, showGraticule],
  );

  const layers = useMemo(
    () =>
      registeredLayers()
        .filter((factory) => factory.supports(meta))
        .flatMap((factory) => {
          const built = factory.build(context);
          if (!built) return [];
          return Array.isArray(built) ? built : [built];
        }),
    [context, meta],
  );

  return { layers, descriptor, colorScale, context };
}
