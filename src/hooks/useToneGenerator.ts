import { useRef, useEffect, useCallback } from 'react';
import { ToneGenerator } from '@/src/audio';
import type { WaveformType } from '@/src/audio';

interface UseToneGeneratorReturn {
  play: (frequency: number, amplitude: number, waveform: WaveformType) => Promise<void>;
  stop: () => Promise<void>;
  updateParams: (frequency: number, amplitude: number, waveform: WaveformType) => Promise<void>;
}

/**
 * React hook wrapping ToneGenerator for use in components.
 * Handles lifecycle cleanup on unmount.
 */
export function useToneGenerator(): UseToneGeneratorReturn {
  const generatorRef = useRef<ToneGenerator | null>(null);

  // Lazy init
  const getGenerator = useCallback(() => {
    if (!generatorRef.current) {
      generatorRef.current = new ToneGenerator();
    }
    return generatorRef.current;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      generatorRef.current?.dispose();
      generatorRef.current = null;
    };
  }, []);

  const play = useCallback(
    async (frequency: number, amplitude: number, waveform: WaveformType) => {
      await getGenerator().play({ frequency, amplitude, waveform });
    },
    [getGenerator],
  );

  const stop = useCallback(async () => {
    await getGenerator().stop();
  }, [getGenerator]);

  const updateParams = useCallback(
    async (frequency: number, amplitude: number, waveform: WaveformType) => {
      await getGenerator().updateParams({ frequency, amplitude, waveform });
    },
    [getGenerator],
  );

  return { play, stop, updateParams };
}
