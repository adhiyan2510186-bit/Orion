'use client';

import { useTimeStore } from '@/lib/state/stores';
import { usePlayback } from '../hooks/usePlayback';

const DAY = 86_400_000;
const WINDOWS = [
  { label: '7d', ms: 7 * DAY },
  { label: '30d', ms: 30 * DAY },
  { label: '90d', ms: 90 * DAY },
  { label: '1y', ms: 365 * DAY },
];

function formatDate(ms: number): string {
  if (!Number.isFinite(ms)) return '—';
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * The fourth dimension. Scrubbing this is the only motion in the product: DESIGN.md
 * says the interface does not animate, the data does.
 */
export function TimeScrubber() {
  const { cursor, domain, isPlaying, speed, toggle, setSpeed, setCursor } = usePlayback();
  const { windowMs, setWindow, enabled } = useTimeStore();

  if (!enabled) {
    return (
      <div className="h-16 flex items-center px-3 bg-neutral border-t border-[var(--color-border)]">
        <span className="data text-[11px] text-[var(--color-secondary)]">
          Run a query to enable time scrubbing.
        </span>
      </div>
    );
  }

  return (
    <div className="h-16 flex flex-col justify-center gap-1.5 px-3 bg-neutral border-t border-[var(--color-border)]">
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className="label-caps w-14 h-6 rounded-[4px] bg-[var(--color-raised)] text-[var(--color-primary)] hover:bg-[var(--color-border)]"
          aria-label={isPlaying ? 'Pause playback' : 'Play through time'}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>

        <span className="data text-[11px] text-[var(--color-secondary)] w-[86px] shrink-0">
          {formatDate(domain[0])}
        </span>

        <input
          type="range"
          min={domain[0]}
          max={domain[1]}
          step={Math.max(1, (domain[1] - domain[0]) / 2000)}
          value={cursor}
          onChange={(event) => setCursor(Number(event.target.value))}
          className="flex-1"
          aria-label="Time cursor"
        />

        <span className="data text-[11px] text-[var(--color-secondary)] w-[86px] text-right shrink-0">
          {formatDate(domain[1])}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span className="data text-[12px] text-[var(--color-primary)] w-[100px]">
          {formatDate(cursor)}
        </span>

        <div className="flex items-center gap-1">
          <span className="label-caps">Speed</span>
          {[0.5, 1, 3].map((value) => (
            <button
              key={value}
              onClick={() => setSpeed(value)}
              aria-pressed={speed === value}
              className={`data text-[11px] px-1.5 h-5 rounded-[2px] ${
                speed === value
                  ? 'bg-[var(--color-tertiary)] text-[var(--color-surface)]'
                  : 'bg-[var(--color-raised)] text-[var(--color-secondary)]'
              }`}
            >
              {value}×
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 ml-auto">
          <span className="label-caps">Trail</span>
          {WINDOWS.map((option) => (
            <button
              key={option.label}
              onClick={() => setWindow(option.ms)}
              aria-pressed={windowMs === option.ms}
              className={`data text-[11px] px-1.5 h-5 rounded-[2px] ${
                windowMs === option.ms
                  ? 'bg-[var(--color-tertiary)] text-[var(--color-surface)]'
                  : 'bg-[var(--color-raised)] text-[var(--color-secondary)]'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
