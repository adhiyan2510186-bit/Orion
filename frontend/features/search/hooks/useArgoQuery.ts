'use client';

import { useCallback, useEffect, useRef } from 'react';
import { runQuery } from '@/lib/api/client';
import { useQueryStore, useTimeStore } from '@/lib/state/stores';
import type { ArgoFloatPoint, QuerySpec } from '@/types/argo';

/**
 * Owns the natural-language query lifecycle: submit, abort the previous in-flight
 * request, store the result, seed the time domain, and fetch the context cloud.
 *
 * The ONLY path from user text to the backend. No component calls the API directly,
 * and the context query lives here rather than in features/map for that reason - the
 * map reads `contextPoints` off the store like any other state.
 */
export function useArgoQuery() {
  const {
    text,
    response,
    isLoading,
    error,
    setText,
    setResponse,
    setContextPoints,
    setLoading,
    setError,
    pushHistory,
  } = useQueryStore();
  const setDomain = useTimeStore((s) => s.setDomain);
  const setTimeEnabled = useTimeStore((s) => s.setEnabled);
  const inFlight = useRef<AbortController | null>(null);
  const contextInFlight = useRef<AbortController | null>(null);

  const submit = useCallback(
    async (raw?: string) => {
      const query = (raw ?? text).trim();
      if (!query) return;

      // Abort the previous request so a slow earlier query cannot land after a newer
      // one and overwrite the results the user is actually looking at.
      inFlight.current?.abort();
      contextInFlight.current?.abort();
      const controller = new AbortController();
      inFlight.current = controller;

      setLoading(true);
      setError(null);
      try {
        const result = await runQuery(
          { query, limit: 60_000, includeProfiles: true, includeTrajectories: true },
          controller.signal,
        );
        if (controller.signal.aborted) return;
        setResponse(result);
        pushHistory(query);

        const span = result.summary.time_range;
        if (span) {
          const start = Date.parse(span.start);
          const end = Date.parse(span.end);
          if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
            setDomain([start, end]);
            setTimeEnabled(true);
          } else {
            setTimeEnabled(false);
          }
        } else {
          setTimeEnabled(false);
        }

        /*
         * Deliberately NOT awaited. The context cloud is scenery - the answer, the
         * inspector and the time domain must not wait on it, and a failure to fetch it
         * must never surface as a query error.
         *
         * Skipped entirely when the RESULT ITSELF is truncated. In that case the query
         * already filled the engine's 60,000-point limit, so relaxing it returns the
         * same prefix, the set difference is empty, and the only thing achieved is a
         * second 21 MB request that renders nothing. It is also the honest outcome:
         * when the matched set is capped, "what was excluded" is not knowable within
         * the limit, and drawing a guess at it would be worse than drawing nothing.
         */
        if (!result.meta.truncated) {
          void loadContext(result.spec, result.points, setContextPoints, contextInFlight);
        } else {
          setContextPoints([]);
        }
      } catch (cause: unknown) {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : 'Query failed');
        setResponse(null);
        setContextPoints([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [
      text,
      setLoading,
      setError,
      setResponse,
      setContextPoints,
      pushHistory,
      setDomain,
      setTimeEnabled,
    ],
  );

  useEffect(
    () => () => {
      inFlight.current?.abort();
      contextInFlight.current?.abort();
    },
    [],
  );

  return {
    text,
    setText,
    submit,
    response,
    isLoading,
    error,
    spec: response?.spec ?? null,
    parse: response?.parse ?? null,
    unresolved: response?.parse.unresolved ?? [],
  };
}

/**
 * How deep the context cloud reaches, in metres.
 *
 * This is a bound, not a preference, and the reason is truncation. Dropping the depth
 * range entirely was the first implementation: it asks for every level of every profile
 * in the region and period, the engine hits its 60,000-point limit and returns
 * `out[:limit]`, and what comes back is the first 4 of 12 floats across a fifth of the
 * longitude span. A context cloud built from that does not show what was excluded - it
 * shows an arbitrary prefix of it while looking authoritative. That is a worse failure
 * than not drawing the layer at all.
 *
 * Measured on the demo fixture, region-wide and for the whole of 2026:
 *
 *     all depths     60,000 points   TRUNCATED    4 floats    lon -149..-128
 *     0-300 m        41,903 points   complete    12 floats    lon -170..-128
 *     0-10 m (as queried)   993 points   complete    12 floats    lon -170..-128
 *
 * 300 m is chosen against the science rather than the frame: the mixed layer and the
 * thermocline both sit well inside the top 200 m in the equatorial Pacific, and the
 * inspector's own derived readouts are computed there. A surface question is about that
 * layer, so the context that surrounds it should cover it with margin and stop.
 */
const CONTEXT_DEPTH_CEILING_M = 300;

/**
 * Relax the spec into the scene the question was asked about.
 *
 * The distinction being drawn: `bbox`, `time_range` and `wmo_ids` describe WHERE and
 * WHEN the user looked, and the context must stay inside them or it stops being
 * context and becomes a different query. `variable_filters` and `anomaly_codes` are the
 * question's own predicates - the things a measurement can fail - and those are exactly
 * what the context layer exists to show being applied.
 *
 * `depth_range_m` is widened rather than dropped, for the truncation reason above. A
 * query that already reaches deeper than the ceiling keeps its own depth, since
 * narrowing it would hide the very measurements it was about.
 */
function relaxSpec(spec: QuerySpec): QuerySpec {
  const queriedMax = spec.depth_range_m?.max_m ?? 0;
  return {
    ...spec,
    variable_filters: [],
    anomaly_codes: null,
    depth_range_m: { min_m: 0, max_m: Math.max(CONTEXT_DEPTH_CEILING_M, queriedMax) },
    limit: 60_000,
  };
}

async function loadContext(
  spec: QuerySpec,
  matched: ArgoFloatPoint[],
  setContextPoints: (points: ArgoFloatPoint[]) => void,
  slot: { current: AbortController | null },
): Promise<void> {
  const controller = new AbortController();
  slot.current = controller;
  try {
    const fetchScene = (filters: QuerySpec) =>
      runQuery(
        {
          // The text is carried for the server log only. `filters` bypasses the parser
          // entirely (see the /query route), so the supplied spec is what actually runs
          // - the sentence is never re-parsed and cannot drift from it.
          query: 'context',
          filters,
          limit: 60_000,
          includeProfiles: false,
          includeTrajectories: false,
        },
        controller.signal,
      );

    let scene = await fetchScene(relaxSpec(spec));
    if (controller.signal.aborted) return;

    /*
     * A truncated context is a misleading one - it draws an arbitrary prefix of the
     * excluded set with the same authority as the whole of it. If the widened depth
     * range overflowed the engine's limit, fall back to the depth band the user
     * actually asked about, which is by construction no larger and is complete.
     */
    if (scene.meta.truncated && spec.depth_range_m) {
      scene = await fetchScene({ ...relaxSpec(spec), depth_range_m: spec.depth_range_m });
      if (controller.signal.aborted) return;
    }

    // Set difference on point_id, which the contract guarantees is stable and unique
    // ({wmo_id}:{cycle_number}:{level_index}). Overdrawing the matched points instead
    // would put two primitives at identical coordinates and let the depth test decide
    // which wins, which is a flicker waiting to happen.
    const matchedIds = new Set(matched.map((p) => p.point_id));
    setContextPoints(scene.points.filter((p) => !matchedIds.has(p.point_id)));
  } catch {
    // Scenery. If it fails, the map simply shows what matched, exactly as before.
    if (!controller.signal.aborted) setContextPoints([]);
  }
}
