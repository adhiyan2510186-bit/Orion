'use client';

import { Skeleton } from '@/components/ui/Skeleton';
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
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-headline-lg text-[var(--color-primary)]">FloatChat</h1>
          <span className="label-caps">ARGO 4D Explorer</span>
          <DatasetStrip meta={meta} isLoading={isLoading} />
        </div>
        <SearchBar />
      </header>

      {error ? (
        <div className="flex-1 flex items-start p-8">
          <div className="max-w-[65ch]">
            <h2 className="text-headline-lg text-[var(--color-error)] mb-2">Cannot reach the API</h2>
            <p className="text-body-md text-[var(--color-onsurface)] mb-3">{error}</p>
            <p className="data text-body-sm text-[var(--color-secondary)]">
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

/**
 * The scale of the dataset, set as a figure rather than a footnote.
 *
 * "1,038,872 measurements" is the single most impressive fact the product has, and it
 * was 11px grey text right-aligned in the corner - a sentence a viewer will never read
 * in the first three seconds of a shot. Setting the numerals at the display data size
 * with their units as labels turns it into something legible at a glance, without
 * giving it more colour or a box it does not need.
 */
function DatasetStrip({
  meta,
  isLoading,
}: {
  meta: ReturnType<typeof useMeta>['meta'];
  isLoading: boolean;
}) {
  if (isLoading || !meta) {
    return (
      <div className="ml-auto flex items-center gap-5">
        <Skeleton className="w-28" />
        <Skeleton className="w-16" />
      </div>
    );
  }

  return (
    <div className="ml-auto flex items-baseline gap-5">
      <Stat value={meta.provider.record_count.toLocaleString()} label="measurements" />
      <Stat value={String(meta.provider.float_count)} label="floats" />
      {/* Provenance, not a claim. It was briefly set as a figure alongside the counts
          and immediately competed with them - "parquet/rule" is a configuration, and a
          configuration set at the display size reads as though it were the result. */}
      <span className="data text-data-sm text-[var(--color-secondary)]">
        {meta.provider.provider_id} / {meta.parser}
      </span>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="data text-data-lg text-[var(--color-primary)]">{value}</span>
      <span className="label-caps">{label}</span>
    </div>
  );
}
