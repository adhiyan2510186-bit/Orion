'use client';

import { useMemo } from 'react';
import { useQueryStore } from '@/lib/state/stores';
import type { AnomalySeverity, AnomalyTag } from '@/types/argo';

const RANK: Record<AnomalySeverity, number> = { critical: 0, warning: 1, info: 2 };

/** Groups anomaly tags by code and counts how many points carry each. */
export function useAnomalies() {
  const response = useQueryStore((s) => s.response);

  return useMemo(() => {
    const points = response?.points ?? [];
    const counts = new Map<string, number>();
    for (const point of points) {
      for (const tag of point.anomaly_tags) {
        counts.set(tag.code, (counts.get(tag.code) ?? 0) + 1);
      }
    }
    const tags: AnomalyTag[] = [...(response?.anomalies ?? [])].sort(
      (a, b) => RANK[a.severity] - RANK[b.severity],
    );
    return {
      tags,
      counts,
      flaggedPoints: points.filter((p) => p.anomaly_tags.length > 0).length,
      total: points.length,
    };
  }, [response]);
}
