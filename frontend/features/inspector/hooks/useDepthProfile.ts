'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchProfile } from '@/lib/api/client';
import { useQueryStore, useSelectionStore } from '@/lib/state/stores';
import type { DepthProfile } from '@/types/argo';

/**
 * Resolves the depth profile for the current selection.
 *
 * Two sources, in order. The query response already carries profiles for the first
 * handful of matched casts, so those render instantly with no round trip. But a result
 * set spans far more floats than that, and clicking any other point would otherwise
 * show an empty panel - so anything not already present is fetched on demand.
 *
 * NOTE: the store selector returns `s.response` and arrays are derived inside useMemo,
 * deliberately. A selector written as `s.response?.profiles ?? []` allocates a NEW array
 * on every call, so Zustand sees a changed snapshot every render and React loops until
 * it throws "Maximum update depth exceeded" - which crashes the page before the WebGL
 * canvas ever mounts. Selectors must return referentially stable values.
 */
export function useDepthProfile(): {
  profile: DepthProfile | null;
  available: number;
  isLoading: boolean;
  error: string | null;
} {
  const response = useQueryStore((s) => s.response);
  const { floatId, cycle } = useSelectionStore();
  const [fetched, setFetched] = useState<DepthProfile | null>(null);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const local = useMemo(() => {
    const profiles = response?.profiles ?? [];
    const forFloat = profiles.filter((p) => p.wmo_id === floatId);
    if (forFloat.length === 0) return { profile: null, available: 0 };
    const exact = forFloat.find((p) => p.cycle_number === cycle);
    if (exact) return { profile: exact, available: forFloat.length };
    const nearest = forFloat.reduce((best, current) =>
      Math.abs(current.cycle_number - (cycle ?? 0)) < Math.abs(best.cycle_number - (cycle ?? 0))
        ? current
        : best,
    );
    return { profile: nearest, available: forFloat.length };
  }, [response, floatId, cycle]);

  // Only reached when the response did not already contain this exact cast.
  const needsFetch =
    floatId !== null && cycle !== null && local.profile?.cycle_number !== cycle;

  useEffect(() => {
    if (!needsFetch || floatId === null || cycle === null) {
      setFetched(null);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetchProfile(floatId, cycle, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setFetched(value);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setFetched(null);
        setError(cause instanceof Error ? cause.message : 'Could not load that profile');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [needsFetch, floatId, cycle]);

  // Prefer the exact cast, whether it came from the response or the fetch.
  const profile = fetched?.cycle_number === cycle ? fetched : local.profile;
  return { profile, available: local.available, isLoading, error };
}
