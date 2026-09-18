'use client';

import { useEffect, useRef, useState } from 'react';
import type { OrbitViewState } from '@deck.gl/core';
import { motion, prefersReducedMotion } from '@/design/tokens';
import { useQueryStore } from '@/lib/state/stores';
import type { ArgoFloatPoint } from '@/types/argo';

/**
 * Frame the camera on what the query actually returned.
 *
 * The problem this solves: the camera sat at a fixed INITIAL_VIEW showing the whole
 * east Pacific and most of North America, while the demo query returns 411 points into
 * one small cluster near the equator. Two-thirds of the viewport was empty near-black,
 * and the canvas atmosphere had nothing to act on.
 *
 * This is the one piece of P3 pulled forward (UI_POLISH_PLAN.md §6). The rest of P3 -
 * additive blending, staggered point entry, scripted demo camera moves - is untouched,
 * and `viewState` deliberately stays local to MapCanvas rather than being hoisted into
 * the view store. Hoisting it is P3's job and carries the 60fps re-render risk that
 * §3.7 documents; nothing here needs to write the camera from outside the component.
 *
 * The move is explanatory motion under ADR 0005: it shows the relationship between the
 * sentence the user typed and the region it selected. It is therefore gated on
 * `prefers-reduced-motion` in JS, because the CSS blanket rule in globals.css cannot
 * reach a deck.gl camera transition.
 */

/** Degrees of padding around the result bounds, so points never touch the frame edge. */
const MARGIN_FRACTION = 0.18;
/** Floor for a degenerate cluster - a single cast would otherwise ask for infinite zoom. */
const MIN_SPAN_DEGREES = 6;
/** Ceiling. Past this the basemap has no more detail to give (ADR 0004). */
const MAX_ZOOM = 7;
const MIN_ZOOM = 1.2;

export interface Bounds {
  minLon: number;
  maxLon: number;
  minLat: number;
  maxLat: number;
}

/**
 * Longitude bounds that survive the antimeridian.
 *
 * These floats span -179.5 to +179.7, which PROGRESS.md records as a real case in this
 * dataset rather than a hypothetical. A naive min/max over that set returns the full
 * 360 degrees and frames the entire planet to contain a cluster 20 degrees wide.
 *
 * The fix is to find the largest angular GAP between consecutive sorted longitudes; the
 * tight bounds are the complement of that gap. When the tight range crosses +/-180 the
 * camera would need to sit outside [-180, 180], where the basemap simply stops - it is
 * drawn once over [-180, 180] and does not repeat (ADR 0004). In that case this falls
 * back to the naive span, which is wide but shows real geography rather than framing
 * the void past the edge of the world.
 */
function longitudeBounds(lons: number[]): { min: number; max: number; wrapped: boolean } {
  const sorted = [...lons].sort((a, b) => a - b);
  const naive = { min: sorted[0], max: sorted[sorted.length - 1], wrapped: false };
  if (sorted.length < 2) return naive;

  let gapStart = sorted[sorted.length - 1];
  let gapSize = 360 - (sorted[sorted.length - 1] - sorted[0]);
  for (let i = 1; i < sorted.length; i += 1) {
    const gap = sorted[i] - sorted[i - 1];
    if (gap > gapSize) {
      gapSize = gap;
      gapStart = sorted[i - 1];
    }
  }
  // The wrapped range runs from the far side of the largest gap, forward, to its near
  // side - unrolled past 180 so min <= max arithmetically.
  const min = gapStart === sorted[sorted.length - 1] ? sorted[0] : gapStart + gapSize;
  const span = 360 - gapSize;
  const max = min + span;
  if (max <= 180) return { min, max, wrapped: false };
  return naive;
}

export function boundsOf(points: ArgoFloatPoint[]): Bounds | null {
  if (points.length === 0) return null;
  const lats = points.map((p) => p.latitude);
  const lon = longitudeBounds(points.map((p) => p.longitude));
  return {
    minLon: lon.min,
    maxLon: lon.max,
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
  };
}

/**
 * Bounds to an OrbitViewState.
 *
 * OrbitView's world coordinates ARE degrees here (ADR 0004), and its scale is 2^zoom
 * pixels per world unit. So fitting a span of D degrees into P pixels is
 * `zoom = log2(P / D)` - no projection maths, which is the same property that made the
 * equirectangular basemap exact.
 *
 * The camera keeps INITIAL_VIEW's pitch and orbit. Framing is the thing being fixed;
 * choosing a new viewing angle per query would make consecutive results incomparable,
 * which is the same reason the inspector column has a fixed width.
 */
export function fitViewState(
  bounds: Bounds,
  width: number,
  height: number,
  base: OrbitViewState,
): OrbitViewState {
  const rawLonSpan = bounds.maxLon - bounds.minLon;
  const rawLatSpan = bounds.maxLat - bounds.minLat;
  const lonSpan = Math.max(rawLonSpan * (1 + MARGIN_FRACTION * 2), MIN_SPAN_DEGREES);
  const latSpan = Math.max(rawLatSpan * (1 + MARGIN_FRACTION * 2), MIN_SPAN_DEGREES);

  // Fit whichever axis is the binding constraint, so nothing falls outside the frame.
  const zoom = Math.min(Math.log2(width / lonSpan), Math.log2(height / latSpan));

  return {
    ...base,
    target: [(bounds.minLon + bounds.maxLon) / 2, (bounds.minLat + bounds.maxLat) / 2, 0],
    zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom)),
  };
}

/**
 * Watches the query result and produces a camera that frames it.
 *
 * Fires on first load and on every new query, because a result the camera does not
 * show is not a result the viewer has seen. It does NOT fire when the user has orbited
 * the camera themselves and then only the time cursor moves - it keys on the response
 * object identity, which changes exactly once per query.
 */
export function useFitCamera(
  base: OrbitViewState,
  size: { width: number; height: number } | null,
): { view: OrbitViewState; transitionMs: number } {
  const response = useQueryStore((s) => s.response);
  const [view, setView] = useState<OrbitViewState>(base);
  const [transitionMs, setTransitionMs] = useState(0);
  const fittedFor = useRef<object | null>(null);

  useEffect(() => {
    if (!response || !size || size.width === 0) return;
    // One fit per response. Without this guard a resize or a re-render would yank the
    // camera back while the user was orbiting it.
    if (fittedFor.current === response) return;

    const bounds = boundsOf(response.points);
    if (!bounds) return;
    fittedFor.current = response;

    setTransitionMs(prefersReducedMotion() ? 0 : motion.explainSlow);
    setView(fitViewState(bounds, size.width, size.height, base));
  }, [response, size, base]);

  return { view, transitionMs };
}
