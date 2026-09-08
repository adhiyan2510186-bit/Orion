'use client';

import { useEffect, useRef } from 'react';
import { useTimeStore } from '@/lib/state/stores';

/**
 * requestAnimationFrame loop that advances the time cursor.
 *
 * This is the one animation in the product. DESIGN.md is explicit that the interface
 * does not animate and the data does - so this drives the 4D cloud and nothing else.
 */
export function usePlayback() {
  const { cursor, domain, isPlaying, speed, setCursor, setPlaying, setSpeed } = useTimeStore();
  const frame = useRef<number | null>(null);
  const last = useRef<number>(0);

  useEffect(() => {
    if (!isPlaying) {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
      return;
    }
    last.current = performance.now();

    const tick = (now: number) => {
      const deltaMs = now - last.current;
      last.current = now;
      const span = domain[1] - domain[0];
      // Traverse the whole domain in ~24s at 1x, so a multi-year record is watchable.
      const advance = (span / 24_000) * deltaMs * speed;
      const next = useTimeStore.getState().cursor + advance;
      if (next >= domain[1]) {
        setCursor(domain[0]);
      } else {
        setCursor(next);
      }
      frame.current = requestAnimationFrame(tick);
    };

    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [isPlaying, domain, speed, setCursor]);

  return {
    cursor,
    domain,
    isPlaying,
    speed,
    play: () => setPlaying(true),
    pause: () => setPlaying(false),
    toggle: () => setPlaying(!isPlaying),
    setSpeed,
    setCursor,
  };
}
