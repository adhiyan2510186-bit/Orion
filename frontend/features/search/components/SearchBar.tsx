'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useMeta } from '@/lib/hooks/useMeta';
import { useArgoQuery } from '../hooks/useArgoQuery';

/**
 * The query input, the parsed-spec chips, and the clarification chips.
 *
 * It sits on Chart table rather than a panel, so it reads as a slot cut into the page
 * rather than a control placed on it.
 */
export function SearchBar() {
  const { text, setText, submit, isLoading, error, spec, parse } = useArgoQuery();
  const { meta } = useMeta();
  const [seeded, setSeeded] = useState(false);

  // Seed with an example that is known to return results, so the first screen is never
  // empty. The examples come from /meta, so the backend decides what is answerable.
  useEffect(() => {
    if (seeded || !meta?.example_queries.length) return;
    setSeeded(true);
    const first = meta.example_queries[0];
    setText(first);
    void submit(first);
  }, [meta, seeded, setText, submit]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void submit();
          }}
          placeholder="Ask about the ocean — e.g. marine heatwaves near the equator in 2026"
          aria-label="Natural language query"
          className="flex-1 h-8 px-3 bg-[var(--color-surface)] border border-[var(--color-secondary)] rounded-[2px] text-[13px] text-[var(--color-onsurface)] placeholder:text-[var(--color-secondary)] focus:border-[var(--color-tertiary)] outline-none"
        />
        <Button variant="primary" onClick={() => void submit()} disabled={isLoading}>
          {isLoading ? 'Searching' : 'Run query'}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 min-h-[22px]">
        {spec && <SpecChips spec={spec} />}
        {parse?.unresolved.map((phrase) => (
          <span
            key={phrase}
            title="This phrase was not understood and did not affect the results"
            className="data text-[11px] px-2 py-0.5 rounded-[2px] bg-[var(--color-raised)] text-[var(--color-warning)] border border-[var(--color-warning)]/30"
          >
            ignored: {phrase}
          </span>
        ))}
        {parse && (
          <span className="data text-[11px] text-[var(--color-secondary)] ml-auto">
            {Math.round(parse.confidence * 100)}% confidence · {parse.parser_id}
          </span>
        )}
      </div>

      {error && (
        <div className="data text-[12px] text-[var(--color-error)]">
          {error}
        </div>
      )}
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="data text-[11px] px-2 py-0.5 rounded-[2px] bg-[var(--color-raised)] text-[var(--color-secondary)]">
      {children}
    </span>
  );
}

/** Renders the QuerySpec so the user can see exactly how their sentence was read. */
function SpecChips({ spec }: { spec: NonNullable<ReturnType<typeof useArgoQuery>['spec']> }) {
  const chips: string[] = [];
  if (spec.bbox) {
    const { min_lat, max_lat, min_lon, max_lon } = spec.bbox;
    const wrapped = min_lon > max_lon ? ' (wraps 180°)' : '';
    chips.push(`lat ${min_lat}..${max_lat}  lon ${min_lon}..${max_lon}${wrapped}`);
  }
  if (spec.depth_range_m) chips.push(`depth ${spec.depth_range_m.min_m}–${spec.depth_range_m.max_m} m`);
  if (spec.time_range) chips.push(`${spec.time_range.start.slice(0, 10)} → ${spec.time_range.end.slice(0, 10)}`);
  for (const filter of spec.variable_filters) {
    chips.push(`${filter.variable.replace(/_c$|_psu$/, '')} ${filter.op} ${filter.value}`);
  }
  if (spec.wmo_ids?.length) chips.push(`floats ${spec.wmo_ids.join(', ')}`);
  if (spec.anomaly_codes?.length) chips.push(`anomalies ${spec.anomaly_codes.join(', ')}`);
  return (
    <>
      {chips.map((chip) => (
        <Chip key={chip}>{chip}</Chip>
      ))}
    </>
  );
}
