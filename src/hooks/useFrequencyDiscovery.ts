import { useEffect, useRef, useCallback } from 'react';
import { FREQUENCY_CATALOG, type CatalogEntry } from '@/src/data/frequencyCatalog';
import { useDiscoveryStore } from '@/src/state/useDiscoveryStore';
import type { FrequencyDiscovery } from '@/src/types/discovery';

const TOLERANCE_HZ = 2;
const DWELL_MS = 1500;

type DiscoverySource = FrequencyDiscovery['source'];

interface UseFrequencyDiscoveryOptions {
  /** Current playback frequency */
  frequency: number;
  /** Whether audio is currently playing */
  isPlaying: boolean;
  /** Which tab this is being called from */
  source: DiscoverySource;
  /** Called when a new frequency is discovered */
  onDiscovery?: (entry: CatalogEntry) => void;
}

/**
 * Monitors the active frequency and auto-discovers cataloged frequencies
 * when the user dwells within ±2 Hz for at least 1.5 seconds.
 */
export function useFrequencyDiscovery({
  frequency,
  isPlaying,
  source,
  onDiscovery,
}: UseFrequencyDiscoveryOptions) {
  const addDiscovery = useDiscoveryStore((s) => s.addDiscovery);
  const isDiscovered = useDiscoveryStore((s) => s.isDiscovered);

  // Track the matched catalog entry and when the dwell started
  const dwellRef = useRef<{ slug: string; startedAt: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onDiscoveryRef = useRef(onDiscovery);
  onDiscoveryRef.current = onDiscovery;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isPlaying) {
      dwellRef.current = null;
      clearTimer();
      return;
    }

    // Find the closest catalog entry within tolerance
    const match = findMatch(frequency);

    if (!match) {
      // No catalog match — reset dwell
      dwellRef.current = null;
      clearTimer();
      return;
    }

    // Already discovered — skip
    if (isDiscovered(match.slug)) {
      dwellRef.current = null;
      clearTimer();
      return;
    }

    // Same entry as current dwell — let the existing timer run
    if (dwellRef.current?.slug === match.slug) {
      return;
    }

    // New match — start a fresh dwell timer
    clearTimer();
    dwellRef.current = { slug: match.slug, startedAt: Date.now() };

    timerRef.current = setTimeout(() => {
      // Double-check it hasn't been discovered in the meantime
      if (!isDiscovered(match.slug)) {
        addDiscovery(match.slug, source);
        onDiscoveryRef.current?.(match);
      }
      dwellRef.current = null;
      timerRef.current = null;
    }, DWELL_MS);

    return () => clearTimer();
  }, [frequency, isPlaying, source, addDiscovery, isDiscovered, clearTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);
}

/** Find the catalog entry closest to `freq` if within ±TOLERANCE_HZ */
function findMatch(freq: number): CatalogEntry | null {
  let best: CatalogEntry | null = null;
  let bestDist = Infinity;

  for (const entry of FREQUENCY_CATALOG) {
    const dist = Math.abs(entry.frequency - freq);
    if (dist <= TOLERANCE_HZ && dist < bestDist) {
      best = entry;
      bestDist = dist;
    }
  }

  return best;
}
