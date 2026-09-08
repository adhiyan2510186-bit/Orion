'use client';

import { useCallback, useEffect, useRef } from 'react';
import { runQuery } from '@/lib/api/client';
import { useQueryStore, useTimeStore } from '@/lib/state/stores';

/**
 * Owns the natural-language query lifecycle: submit, abort the previous in-flight
 * request, store the result, and seed the time domain from what came back.
 *
 * The ONLY path from user text to the backend. No component calls the API directly.
 */
export function useArgoQuery() {
  const { text, response, isLoading, error, setText, setResponse, setLoading, setError, pushHistory } =
    useQueryStore();
  const setDomain = useTimeStore((s) => s.setDomain);
  const setTimeEnabled = useTimeStore((s) => s.setEnabled);
  const inFlight = useRef<AbortController | null>(null);

  const submit = useCallback(
    async (raw?: string) => {
      const query = (raw ?? text).trim();
      if (!query) return;

      // Abort the previous request so a slow earlier query cannot land after a newer
      // one and overwrite the results the user is actually looking at.
      inFlight.current?.abort();
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
      } catch (cause: unknown) {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : 'Query failed');
        setResponse(null);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [text, setLoading, setError, setResponse, pushHistory, setDomain, setTimeEnabled],
  );

  useEffect(() => () => inFlight.current?.abort(), []);

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
