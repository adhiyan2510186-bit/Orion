/**
 * deck.gl layer registry.
 *
 * Visualizations are registered factories, not hardcoded JSX. `useLayerBuilder`
 * composes whatever is registered from the current data, time cursor, theme and
 * selection, so adding a new way to draw the ocean is ONE new file - `MapCanvas`,
 * the hooks and the stores are never touched.
 *
 * `supports(meta)` gates a factory on data availability, so a layer that renders a
 * variable the loaded dataset lacks disappears cleanly instead of throwing or
 * rendering an empty canvas.
 */

import type { Layer } from '@deck.gl/core';
import type { RGB } from '@/design/tokens';
import type { BasemapMode } from '@/lib/state/stores';
import type {
  ArgoFloatPoint,
  FloatTrajectory,
  MetaResponse,
  VariableDescriptor,
} from '@/types/argo';

export interface LayerContext {
  points: ArgoFloatPoint[];
  trajectories: FloatTrajectory[];
  /** Epoch ms. Points newer than this are hidden. */
  timeCursor: number;
  timeWindowMs: number;
  timeEnabled: boolean;
  colorScale: (value: number | null | undefined) => RGB;
  colorBy: VariableDescriptor | null;
  depthExaggeration: number;
  selectedFloatId: string | null;
  onSelect: (point: ArgoFloatPoint) => void;
  onHover: (point: ArgoFloatPoint | null) => void;
  showTrajectories: boolean;
  showGraticule: boolean;
  /** Which basemap style is active. Basemap factories return null for the others. */
  basemap: BasemapMode;
}

export interface LayerFactory {
  id: string;
  label: string;
  supports: (meta: MetaResponse | null) => boolean;
  build: (context: LayerContext) => Layer | Layer[] | null;
}

const registry: LayerFactory[] = [];

export function registerLayer(factory: LayerFactory): LayerFactory {
  if (registry.some((existing) => existing.id === factory.id)) {
    throw new Error(`layer ${factory.id} is already registered`);
  }
  registry.push(factory);
  return factory;
}

export function registeredLayers(): readonly LayerFactory[] {
  return registry;
}

/**
 * Vertical placement for a measurement.
 *
 * Depth is metres while x/y are degrees, so raw depth would render as a needle
 * thousands of units tall. Scaling to a fraction of a degree per kilometre keeps the
 * water column readable next to the horizontal extent, and the exaggeration control
 * lets the user stretch it deliberately rather than the layer guessing.
 */
export function depthToZ(depthMetres: number, exaggeration: number): number {
  const DEGREES_PER_KM = 0.35;
  return -(depthMetres / 1000) * DEGREES_PER_KM * exaggeration;
}

/** True when a point should be visible at the current time cursor. */
export function withinTimeWindow(
  point: { timestamp: string },
  cursor: number,
  windowMs: number,
  enabled: boolean,
): boolean {
  if (!enabled) return true;
  const t = Date.parse(point.timestamp);
  if (!Number.isFinite(t)) return false;
  return t <= cursor && t >= cursor - windowMs;
}
