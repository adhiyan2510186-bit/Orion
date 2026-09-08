'use client';

import { Panel, Readout } from '@/components/ui/Panel';
import { AnomalyBadge } from '@/features/anomalies/components/AnomalyBadge';
import { useAnomalies } from '@/features/anomalies/hooks/useAnomalies';
import { useQueryStore, useSelectionStore } from '@/lib/state/stores';
import { DepthProfileChart } from './DepthProfileChart';
import { useDepthProfile } from '../hooks/useDepthProfile';

const nf = (value: number | null | undefined, digits = 2) =>
  value === null || value === undefined ? '—' : value.toFixed(digits);

export function FloatInspector() {
  const response = useQueryStore((s) => s.response);
  const { floatId, cycle } = useSelectionStore();
  const { profile, available } = useDepthProfile();
  const { tags, counts, flaggedPoints, total } = useAnomalies();
  const summary = response?.summary;

  return (
    <aside className="w-[380px] shrink-0 h-full overflow-y-auto bg-neutral border-l border-[var(--color-border)]">
      <Panel title="Result">
        {summary ? (
          <>
            <p className="px-3 py-2 text-[13px] leading-relaxed text-[var(--color-onsurface)] max-w-[65ch]">
              {summary.answer}
            </p>
            <div className="grid grid-cols-2 border-t border-[var(--color-border)]">
              <Readout label="Floats" value={summary.matched_floats.toLocaleString()} />
              <Readout label="Profiles" value={summary.matched_cycles.toLocaleString()} />
              <Readout label="Measurements" value={summary.matched_points.toLocaleString()} />
              <Readout
                label="Depth"
                unit="m"
                value={
                  summary.depth_range_m
                    ? `${nf(summary.depth_range_m.min_m, 0)}–${nf(summary.depth_range_m.max_m, 0)}`
                    : '—'
                }
              />
            </div>
            <div className="border-t border-[var(--color-border)]">
              {summary.variable_stats.map((stat) => (
                <div key={stat.variable} className="flex items-baseline gap-2 px-3 py-1.5">
                  <span className="label-caps w-[76px]">
                    {stat.variable.replace(/_c$/, '').replace(/_psu$/, '').replace(/_/g, ' ')}
                  </span>
                  <span className="data text-[12px] text-[var(--color-onsurface)]">
                    {nf(stat.min)} … {nf(stat.max)}
                  </span>
                  <span className="data text-[11px] text-[var(--color-secondary)] ml-auto">
                    mean {nf(stat.mean)}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="px-3 py-3 data text-[11px] text-[var(--color-secondary)]">
            No query has been run yet.
          </p>
        )}
      </Panel>

      {tags.length > 0 && (
        <Panel title={`Anomalies · ${flaggedPoints.toLocaleString()} of ${total.toLocaleString()}`}>
          <div className="flex flex-col gap-1.5 p-2">
            {tags.map((tag) => (
              <AnomalyBadge key={tag.code} tag={tag} count={counts.get(tag.code)} />
            ))}
          </div>
        </Panel>
      )}

      <Panel title={floatId ? `Float ${floatId}` : 'Depth profile'}>
        {!floatId && (
          <p className="px-3 py-3 data text-[11px] text-[var(--color-secondary)]">
            Click a measurement on the map to inspect its water column.
          </p>
        )}
        {floatId && !profile && (
          <p className="px-3 py-3 data text-[11px] text-[var(--color-secondary)]">
            No profile was returned for this float in the current result set.
          </p>
        )}
        {profile && (
          <>
            <div className="grid grid-cols-2 border-b border-[var(--color-border)]">
              <Readout label="Cycle" value={profile.cycle_number} />
              <Readout label="Date" value={profile.timestamp.slice(0, 10)} />
              <Readout label="Latitude" unit="°" value={nf(profile.latitude, 3)} />
              <Readout label="Longitude" unit="°" value={nf(profile.longitude, 3)} />
              <Readout
                label="Thermocline"
                unit="m"
                value={nf(profile.derived.thermocline_depth_m, 1)}
              />
              <Readout
                label="Mixed layer"
                unit="m"
                value={nf(profile.derived.mixed_layer_depth_m, 1)}
              />
              <Readout
                label="Surface temp"
                unit="°C"
                value={nf(profile.derived.surface_temperature_c)}
              />
              <Readout label="Mode" value={profile.data_mode.replace('_', ' ')} />
            </div>
            <DepthProfileChart profile={profile} />
            <p className="data text-[10px] text-[var(--color-secondary)] px-3 pb-2">
              {profile.levels.length} levels · cycle {cycle ?? profile.cycle_number} of {available}{' '}
              returned
            </p>
          </>
        )}
      </Panel>
    </aside>
  );
}
