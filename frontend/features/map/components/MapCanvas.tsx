'use client';

import { useEffect, useRef, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { LinearInterpolator, OrbitView, type OrbitViewState } from '@deck.gl/core';
import { CanvasAtmosphere } from '@/components/ui/Surface';
import { camera, ease } from '@/design/tokens';
import { useLayerBuilder } from '../hooks/useLayerBuilder';
import { useFitCamera } from '../hooks/useFitCamera';
import { useQueryStore, useSelectionStore } from '@/lib/state/stores';

/**
 * The 4D canvas.
 *
 * Renders whatever useLayerBuilder produced. It receives a deck-agnostic LayerContext,
 * so replacing deck.gl with React Three Fiber later is a sibling MapCanvas behind the
 * same props - the hooks and stores would be untouched.
 *
 * OrbitView rather than a geographic projection: the third axis is depth, and the user
 * needs to rotate the water column to read it. A Mercator map cannot show that.
 *
 * This is the one surface in the product that is allowed to be cinematic. Everything
 * layered on top of it - the atmosphere, the hover readout, the point count - is
 * `pointer-events: none`, because selecting a 2px measurement is a DOM click forwarded
 * to deck.gl and an overlay that swallows it kills picking. See UI_POLISH_PLAN.md §3.5.
 */
/**
 * FlyToInterpolator is MapView-only - it interpolates longitude/latitude/zoom/pitch and
 * throws "latitude is required for transition" against an OrbitViewState, which has
 * none of those. OrbitView's camera is a target vector plus zoom and two rotations, so
 * the transition has to name them explicitly.
 */
const ORBIT_INTERPOLATOR = new LinearInterpolator({
  transitionProps: ['target', 'zoom', 'rotationX', 'rotationOrbit'],
});

const INITIAL_VIEW: OrbitViewState = {
  target: [-145, 0, 0],
  zoom: 3.4,
  // The resting pitch, from tokens. Only ever seen before the first query lands; every
  // arrival after that starts top-down and eases back to this value.
  rotationX: camera.restPitchDeg,
  rotationOrbit: 12,
};

export function MapCanvas() {
  const { layers } = useLayerBuilder();
  const hovered = useSelectionStore((s) => s.hovered);
  const isLoading = useQueryStore((s) => s.isLoading);
  const points = useQueryStore((s) => s.response?.points.length ?? 0);
  const contextCount = useQueryStore((s) => s.contextPoints.length);

  // The fit needs pixel dimensions to turn a span in degrees into a zoom level, and
  // deck.gl does not report them until after its first render.
  const shell = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  useEffect(() => {
    const element = shell.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const { view, transitionMs } = useFitCamera(INITIAL_VIEW, size);

  /**
   * One controlled camera, and the transition props live ON it rather than beside it.
   *
   * This matters more than it looks. deck.gl emits onViewStateChange once per frame
   * WHILE a transition runs. If the state handed back to it still carries
   * transitionDuration, every one of those frames starts a NEW transition toward the
   * intermediate value it just reported - a fixed point at the starting camera, so the
   * view never moves and nothing errors. Setting the transition only on the state
   * object the fit produces, and stripping it from whatever deck.gl reports back, is
   * what makes the flight actually happen.
   */
  const [viewState, setViewState] = useState<OrbitViewState>(INITIAL_VIEW);
  useEffect(() => {
    setViewState(
      transitionMs > 0
        ? {
            ...view,
            transitionDuration: transitionMs,
            transitionInterpolator: ORBIT_INTERPOLATOR,
            transitionEasing: ease,
          }
        : view,
    );
  }, [view, transitionMs]);

  return (
    <div ref={shell} className="relative w-full h-full bg-[var(--color-surface)]">
      <DeckGL
        views={new OrbitView({ orbitAxis: 'Y', fovy: 50 })}
        viewState={viewState}
        onViewStateChange={({ viewState: next }) => {
          // Strip the transition props before echoing the state back - see above.
          const { transitionDuration, transitionInterpolator, transitionEasing, ...rest } =
            next as OrbitViewState & Record<string, unknown>;
          void transitionDuration;
          void transitionInterpolator;
          void transitionEasing;
          setViewState(rest as OrbitViewState);
        }}
        controller={{ inertia: 250 }}
        layers={layers}
        // Measurements render at ~2px. Requiring a pixel-exact hit makes them
        // effectively unclickable with a mouse, so widen the pick radius.
        pickingRadius={8}
        getCursor={({ isDragging, isHovering }) =>
          isDragging ? 'grabbing' : isHovering ? 'pointer' : 'grab'
        }
      />

      <CanvasAtmosphere />

      {/*
        Glass is permitted here and only here: this readout sits OVER the canvas, so
        what shows through it is literally the ocean. The same treatment on a Panel
        would make the instrument look like a consumer dashboard.
      */}
      {hovered && (
        <div className="glass hud-edge-t absolute left-3 bottom-3 rounded-sm px-3 py-2 pointer-events-none">
          <div className="data text-data-md text-[var(--color-primary)]">
            {hovered.wmo_id} · cycle {hovered.cycle_number}
          </div>
          <div className="data text-data-sm text-[var(--color-onsurface)] mt-1 leading-relaxed">
            {hovered.latitude.toFixed(3)}°, {hovered.longitude.toFixed(3)}°
            <br />
            {hovered.depth_m.toFixed(1)} m
            {hovered.temperature_c !== null && ` · ${hovered.temperature_c.toFixed(2)} °C`}
            {hovered.salinity_psu !== null && ` · ${hovered.salinity_psu.toFixed(3)} PSU`}
            <br />
            {hovered.timestamp.slice(0, 10)}
          </div>
        </div>
      )}

      {/*
        "60,000 points rendered" is a headline fact and it was a footnote.

        `data-point-count` is the machine-readable anchor: scripts/measure-perf.mjs used
        to scrape this from innerText, which broke the moment the label picked up
        `text-transform: uppercase` and started reading back as "POINTS RENDERED". A
        styling change must not be able to break a measurement.
      */}
      <div
        data-point-count={points}
        className="glass hud-edge-t absolute right-3 bottom-3 rounded-sm px-3 py-1.5 pointer-events-none"
      >
        <div className="flex items-baseline gap-2">
          <span className="data text-data-lg text-[var(--color-primary)]">
            {isLoading ? '—' : points.toLocaleString()}
          </span>
          <span className="label-caps">{isLoading ? 'querying' : 'points rendered'}</span>
        </div>
        {/* The excluded count is the whole argument for the context layer: it turns
            "there were 411" into "411 of 60,000 met your filter". */}
        {!isLoading && contextCount > 0 && (
          <div className="data text-data-sm text-[var(--color-secondary)] mt-0.5">
            {contextCount.toLocaleString()} excluded, shown dim
          </div>
        )}
      </div>
    </div>
  );
}
