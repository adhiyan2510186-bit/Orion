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
 * The fourth dimension.
 *
 * This bar is a full-width instrument row below the viewport, not a HUD floating over
 * it, so it stays opaque Chart Room - nothing shows through it, and glass is a
 * boundary material only. What it did need was weight: the control carrying the whole
 * 4D claim was rendered on a 2px hairline, making it visually the thinnest element on
 * screen. The track is 4px now (globals.css) and the cursor date is set as a figure
 * rather than a caption.
 *
 * The cursor readout updates every frame during playback, which is exactly why it is
 * `.data` - tabular figures stop the row reflowing as the digits change.
 */
export function TimeScrubber() {
  const { cursor, domain, isPlaying, speed, toggle, setSpeed, setCursor } = usePlayback();
  const { windowMs, setWindow, enabled } = useTimeStore();

  if (!enabled) {
    return (
      <div className="h-timeline flex items-center px-3 bg-neutral border-t border-[var(--color-border)]">
        <span className="data text-data-sm text-[var(--color-secondary)]">
          Run a query to enable time scrubbing.
        </span>
      </div>
    );
  }

  return (
    <div className="h-timeline flex flex-col justify-center gap-2 px-3 bg-neutral border-t border-[var(--color-border)]">
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className="label-caps w-14 h-6 rounded-md bg-[var(--color-raised)] text-[var(--color-primary)] hover:bg-[var(--color-border)]"
          aria-label={isPlaying ? 'Pause playback' : 'Play through time'}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>

        <span className="data text-data-sm text-[var(--color-secondary)] w-22 shrink-0">
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

        <span className="data text-data-sm text-[var(--color-secondary)] w-22 text-right shrink-0">
          {formatDate(domain[1])}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span className="data text-data-lg text-[var(--color-primary)] w-32">
          {formatDate(cursor)}
        </span>

        <div className="flex items-center gap-1">
          <span className="label-caps">Speed</span>
          {[0.5, 1, 3].map((value) => (
            <SegmentButton
              key={value}
              on={speed === value}
              onClick={() => setSpeed(value)}
              label={`${value}×`}
            />
          ))}
        </div>

        <div className="flex items-center gap-1 ml-auto">
          {/* "Trail" is the length of the comet tail behind the cursor - how much
              history stays lit as time advances. The units on the buttons carry it. */}
          <span className="label-caps">Trail</span>
          {WINDOWS.map((option) => (
            <SegmentButton
              key={option.label}
              on={windowMs === option.ms}
              onClick={() => setWindow(option.ms)}
              label={option.label}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function SegmentButton({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={`data text-data-sm px-1.5 h-5 rounded-sm ${
        on
          ? 'bg-[var(--color-tertiary)] text-[var(--color-surface)]'
          : 'bg-[var(--color-raised)] text-[var(--color-secondary)]'
      }`}
    >
      {label}
    </button>
  );
}
