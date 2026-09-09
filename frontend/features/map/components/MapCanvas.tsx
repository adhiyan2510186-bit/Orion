'use client';

import { useState } from 'react';
import DeckGL from '@deck.gl/react';
import { OrbitView, type OrbitViewState } from '@deck.gl/core';
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

      {hovered && (
        <div className="absolute left-3 bottom-3 bg-[var(--color-raised)] rounded-[2px] px-2.5 py-2 pointer-events-none">
          <div className="data text-[11px] text-[var(--color-primary)] font-bold">
            {hovered.wmo_id} · cycle {hovered.cycle_number}
          </div>
          <div className="data text-[11px] text-[var(--color-onsurface)] mt-1 leading-relaxed">
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

      <div className="absolute right-3 bottom-3 data text-[11px] text-[var(--color-secondary)] pointer-events-none">
        {isLoading ? 'querying…' : `${points.toLocaleString()} points rendered`}
      </div>
    </div>
  );
}
