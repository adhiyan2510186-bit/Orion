'use client';

import { useMemo } from 'react';
import { useQueryStore, useSelectionStore } from '@/lib/state/stores';
import type { DepthProfile } from '@/types/argo';

/**
 * Resolves the profile for the current selection out of the query response.
 *
 * The backend already returned profiles with the query, so selecting a float is
 * instant and needs no round trip. If the exact cycle is not present we fall back to
 * the nearest one that is, rather than showing an empty chart.
 */
export function useDepthProfile(): { profile: DepthProfile | null; available: number } {
  const profiles = useQueryStore((s) => s.response?.profiles ?? []);
  const { floatId, cycle } = useSelectionStore();

  return useMemo(() => {
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
  }, [profiles, floatId, cycle]);
}
