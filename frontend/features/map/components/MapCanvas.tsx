'use client';

import { useState } from 'react';
import DeckGL from '@deck.gl/react';
import { OrbitView, type OrbitViewState } from '@deck.gl/core';
import { CanvasAtmosphere } from '@/components/ui/Surface';
import { useLayerBuilder } from '../hooks/useLayerBuilder';
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
const INITIAL_VIEW: OrbitViewState = {
  target: [-145, 0, 0],
  zoom: 3.4,
  rotationX: 38,
  rotationOrbit: 12,
};

export function MapCanvas() {
  const { layers } = useLayerBuilder();
  const [viewState, setViewState] = useState<OrbitViewState>(INITIAL_VIEW);
  const hovered = useSelectionStore((s) => s.hovered);
  const isLoading = useQueryStore((s) => s.isLoading);
  const points = useQueryStore((s) => s.response?.points.length ?? 0);

  return (
    <div className="relative w-full h-full bg-[var(--color-surface)]">
      <DeckGL
        views={new OrbitView({ orbitAxis: 'Y', fovy: 50 })}
        viewState={viewState}
        onViewStateChange={({ viewState: next }) => setViewState(next as OrbitViewState)}
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

      {/* "60,000 points rendered" is a headline fact and it was a footnote. The figure
          is set at the display data size; the word stays a label, because the number is
          the claim and the noun is not. */}
      <div className="glass hud-edge-t absolute right-3 bottom-3 flex items-baseline gap-2 rounded-sm px-3 py-1.5 pointer-events-none">
        <span className="data text-data-lg text-[var(--color-primary)]">
          {isLoading ? '—' : points.toLocaleString()}
        </span>
        <span className="label-caps">{isLoading ? 'querying' : 'points rendered'}</span>
      </div>
    </div>
  );
}
