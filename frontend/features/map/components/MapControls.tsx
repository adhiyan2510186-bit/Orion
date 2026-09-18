'use client';

import { colormapToCss, isColormapName } from '@/design/scales';
import { type BasemapMode, useViewStore } from '@/lib/state/stores';
import { useMeta } from '@/lib/hooks/useMeta';

/**
 * Variable picker, depth exaggeration, and the colour legend.
 *
 * The variable list is GENERATED from /meta descriptors, which is why a new backend
 * variable appears here with no frontend change. Nothing about temperature or salinity
 * is hardcoded.
 *
 * This bar sits directly above the viewport and is part of the instrument, so it stays
 * opaque. It also no longer scrolls horizontally: `overflow-x-auto` silently hid the
 * Tracks and Grid toggles below ~1280px, which on a recording means a control vanishes
 * mid-shot with no indication it was ever there. It wraps instead, so nothing is lost.
 */
export function MapControls() {
  const { variables } = useMeta();
  const {
    colorBy,
    setColorBy,
    depthExaggeration,
    setDepthExaggeration,
    showTrajectories,
    showGraticule,
    showContext,
    basemap,
    setBasemap,
    toggle,
  } = useViewStore();
  const descriptor = variables.find((v) => v.key === colorBy) ?? variables[0] ?? null;
  const colormap = descriptor && isColormapName(descriptor.colormap) ? descriptor.colormap : 'gray';

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-3 py-2 bg-neutral border-b border-[var(--color-border)]">
      <label className="flex items-center gap-2 shrink-0">
        <span className="label-caps">Colour by</span>
        <select
          value={descriptor?.key ?? ''}
          onChange={(event) => setColorBy(event.target.value)}
          className="data text-data-md h-7 pl-2 pr-6 bg-[var(--color-raised)] text-[var(--color-primary)] border-none rounded-sm outline-none"
        >
          {variables.map((variable) => (
            <option key={variable.key} value={variable.key}>
              {variable.display_name}
            </option>
          ))}
        </select>
      </label>

      {/* A colormap without a legend is unreadable data. The bar is wider and taller
          than it was because at 160x10 it is a detail on a 1920px frame; the numbers
          are the same size, since they are a scale, not a claim. */}
      {descriptor && (
        <div className="flex items-center gap-2 shrink-0">
          <span className="data text-data-sm text-[var(--color-secondary)]">
            {descriptor.min_value ?? 0}
          </span>
          <div
            className="h-3.5 w-52 rounded-sm"
            style={{ background: colormapToCss(colormap) }}
            role="img"
            aria-label={`${descriptor.display_name} colour scale`}
          />
          <span className="data text-data-sm text-[var(--color-secondary)]">
            {descriptor.max_value ?? 1} {descriptor.unit}
          </span>
        </div>
      )}

      <label className="flex items-center gap-2 shrink-0">
        <span className="label-caps">Depth ×{depthExaggeration}</span>
        <input
          type="range"
          min={1}
          max={12}
          step={1}
          value={depthExaggeration}
          onChange={(event) => setDepthExaggeration(Number(event.target.value))}
          className="w-24"
          aria-label="Depth exaggeration"
        />
      </label>

      <div className="flex items-center gap-3 shrink-0 ml-auto">
        {/*
          Basemap style. A segmented control rather than three toggles because the
          modes are mutually exclusive - one piece of state, one control.
        */}
        <div
          className="flex items-center gap-px bg-[var(--color-surface)] rounded-sm p-px"
          role="group"
          aria-label="Basemap style"
        >
          {BASEMAP_MODES.map((mode) => (
            <Toggle
              key={mode.value}
              label={mode.label}
              on={basemap === mode.value}
              onClick={() => setBasemap(mode.value)}
            />
          ))}
        </div>

        {/* Context is the non-matching measurements drawn dim beneath the results.
            Default on - see the store, and ADR 0006 for why it is not opt-in. */}
        <Toggle label="Context" on={showContext} onClick={() => toggle('showContext')} />
        <Toggle label="Tracks" on={showTrajectories} onClick={() => toggle('showTrajectories')} />
        <Toggle label="Grid" on={showGraticule} onClick={() => toggle('showGraticule')} />
      </div>
    </div>
  );
}

const BASEMAP_MODES: { value: BasemapMode; label: string }[] = [
  { value: 'ocean', label: 'Ocean' },
  { value: 'satellite', label: 'Satellite' },
  { value: 'graticule', label: 'Bare' },
];

/**
 * An off toggle and a disabled control used to be indistinguishable - both were
 * Graphite caps text on nothing. The off state now carries a hairline, so the control
 * reads as a control whichever way it is set.
 */
function Toggle({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={`label-caps px-2 h-7 rounded-sm border ${
        on
          ? 'bg-[var(--color-raised)] border-[var(--color-raised)] text-[var(--color-primary)]'
          : 'bg-transparent border-[var(--color-border)]'
      }`}
    >
      {label}
    </button>
  );
}
