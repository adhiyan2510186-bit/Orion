'use client';

import { useEffect, useState } from 'react';
import { fetchMeta } from '@/lib/api/client';
import type { MetaResponse, VariableDescriptor } from '@/types/argo';

/**
 * Fetches /meta once. This is what makes the UI adaptive: variable pickers, legends
 * and axis bounds are all generated from the descriptors the backend reports, so a new
 * scientific variable appears in the interface with no frontend change.
 */
export function useMeta() {
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetchMeta(controller.signal)
      .then((value) => {
        setMeta(value);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : 'Failed to load dataset metadata');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const variables: VariableDescriptor[] = meta?.provider.variables ?? [];
  return { meta, variables, error, isLoading };
}
