'use client';

import { colormapToCss, isColormapName } from '@/design/scales';
import { useViewStore } from '@/lib/state/stores';
import { useMeta } from '@/lib/hooks/useMeta';

/**
 * Variable picker, depth exaggeration, and the colour legend.
 *
 * The variable list is GENERATED from /meta descriptors, which is why a new backend
 * variable appears here with no frontend change. Nothing about temperature or salinity
 * is hardcoded.
 */
export function MapControls() {
  const { variables } = useMeta();
  const { colorBy, setColorBy, depthExaggeration, setDepthExaggeration, showTrajectories, showGraticule, toggle } =
    useViewStore();
  const descriptor = variables.find((v) => v.key === colorBy) ?? variables[0] ?? null;
  const colormap = descriptor && isColormapName(descriptor.colormap) ? descriptor.colormap : 'gray';

  return (
    <div className="flex items-center gap-4 px-3 py-2 bg-neutral border-b border-[var(--color-border)] overflow-x-auto">
      <label className="flex items-center gap-2 shrink-0">
        <span className="label-caps">Colour by</span>
        <select
          value={descriptor?.key ?? ''}
          onChange={(event) => setColorBy(event.target.value)}
          className="data text-[12px] h-6 bg-[var(--color-raised)] text-[var(--color-primary)] border-none rounded-[2px] px-1.5 outline-none"
        >
          {variables.map((variable) => (
            <option key={variable.key} value={variable.key}>
              {variable.display_name}
            </option>
          ))}
        </select>
      </label>

      {/* A colormap without a legend is unreadable data. */}
      {descriptor && (
        <div className="flex items-center gap-2 shrink-0">
          <span className="data text-[11px] text-[var(--color-secondary)]">
            {descriptor.min_value ?? 0}
          </span>
          <div
            className="h-2.5 w-40 rounded-[2px]"
            style={{ background: colormapToCss(colormap) }}
            role="img"
            aria-label={`${descriptor.display_name} colour scale`}
          />
          <span className="data text-[11px] text-[var(--color-secondary)]">
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
        <Toggle label="Tracks" on={showTrajectories} onClick={() => toggle('showTrajectories')} />
        <Toggle label="Grid" on={showGraticule} onClick={() => toggle('showGraticule')} />
      </div>
    </div>
  );
}

function Toggle({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={`label-caps px-2 h-6 rounded-[2px] ${
        on
          ? 'bg-[var(--color-raised)] text-[var(--color-primary)]'
          : 'bg-transparent text-[var(--color-secondary)]'
      }`}
    >
      {label}
    </button>
  );
}
