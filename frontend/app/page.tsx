'use client';

import { FloatInspector } from '@/features/inspector/components/FloatInspector';
import { MapCanvas } from '@/features/map/components/MapCanvas';
import { MapControls } from '@/features/map/components/MapControls';
import { SearchBar } from '@/features/search/components/SearchBar';
import { TimeScrubber } from '@/features/timeline/components/TimeScrubber';
import { useMeta } from '@/lib/hooks/useMeta';

/**
 * Composition root. Layout only - no logic, no data access.
 *
 * The frame is fixed and three-part: top bar, main stage (canvas + timeline), and a
 * fixed-width inspector. Nothing is centred; the layout is asymmetric throughout, and
 * the inspector does not resize with the viewport because a scientist comparing two
 * sessions needs the readout column to be the same width both times.
 */
export default function Page() {
  const { meta, error, isLoading } = useMeta();

  return (
    <main className="h-screen w-screen flex flex-col overflow-hidden bg-[var(--color-surface)]">
      <header className="px-3 py-2 border-b border-[var(--color-border)] bg-neutral">
        <div className="flex items-baseline gap-3 mb-2">
          <h1 className="text-[17px] font-bold tracking-[-0.01em] text-[var(--color-primary)]">
            FloatChat
          </h1>
          <span className="label-caps">ARGO 4D Explorer</span>
          <span className="data text-[11px] text-[var(--color-secondary)] ml-auto">
            {isLoading && 'connecting…'}
            {meta &&
              `${meta.provider.record_count.toLocaleString()} measurements · ${meta.provider.float_count} floats · ${meta.provider.provider_id}/${meta.parser}`}
          </span>
        </div>
        <SearchBar />
      </header>

      {error ? (
        <div className="flex-1 flex items-start p-8">
          <div className="max-w-[65ch]">
            <h2 className="text-[22px] font-bold text-[var(--color-error)] mb-2">
              Cannot reach the API
            </h2>
            <p className="text-[13px] text-[var(--color-onsurface)] mb-3">{error}</p>
            <p className="data text-[12px] text-[var(--color-secondary)]">
              Start the backend, then reload this page.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex min-h-0">
          <div className="flex-1 flex flex-col min-w-0">
            <MapControls />
            <div className="flex-1 min-h-0">
              <MapCanvas />
            </div>
            <TimeScrubber />
          </div>
          <FloatInspector />
        </div>
      )}
    </main>
  );
}
