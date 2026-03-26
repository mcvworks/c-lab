import { useRef, useEffect, useCallback } from 'react';
import { ToneGenerator } from '@/src/audio';
import type { AudioParams, WaveformType, NoiseType } from '@/src/audio';

interface UseToneGeneratorReturn {
  play: (frequency: number, amplitude: number, waveform: WaveformType) => Promise<void>;
  playNoise: (amplitude: number, noiseType: NoiseType) => Promise<void>;
  stop: () => Promise<void>;
  updateParams: (frequency: number, amplitude: number, waveform: WaveformType) => Promise<void>;
  updateNoiseParams: (amplitude: number, noiseType: NoiseType) => Promise<void>;
}

/**
 * React hook wrapping ToneGenerator for use in components.
 * Supports both tone and noise playback modes.
 */
export function useToneGenerator(): UseToneGeneratorReturn {
  const generatorRef = useRef<ToneGenerator | null>(null);

  const getGenerator = useCallback(() => {
    if (!generatorRef.current) {
      generatorRef.current = new ToneGenerator();
    }
    return generatorRef.current;
  }, []);

  useEffect(() => {
    return () => {
      generatorRef.current?.dispose();
      generatorRef.current = null;
    };
  }, []);

  const play = useCallback(
    async (frequency: number, amplitude: number, waveform: WaveformType) => {
      await getGenerator().play({ mode: 'tone', frequency, amplitude, waveform });
    },
    [getGenerator],
  );

  const playNoise = useCallback(
    async (amplitude: number, noiseType: NoiseType) => {
      await getGenerator().play({ mode: 'noise', amplitude, noiseType });
    },
    [getGenerator],
  );

  const stop = useCallback(async () => {
    await getGenerator().stop();
  }, [getGenerator]);

  const updateParams = useCallback(
    async (frequency: number, amplitude: number, waveform: WaveformType) => {
      await getGenerator().updateParams({ mode: 'tone', frequency, amplitude, waveform });
    },
    [getGenerator],
  );

  const updateNoiseParams = useCallback(
    async (amplitude: number, noiseType: NoiseType) => {
      await getGenerator().updateParams({ mode: 'noise', amplitude, noiseType });
    },
    [getGenerator],
  );

  return { play, playNoise, stop, updateParams, updateNoiseParams };
}
