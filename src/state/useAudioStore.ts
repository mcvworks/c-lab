import { create } from 'zustand';
import { ToneGenerator } from '@/src/audio';
import type { WaveformType, NoiseType, SourceMode } from '@/src/audio';

interface AudioState {
  // Shared audio parameters
  frequency: number;
  amplitude: number;
  waveform: WaveformType;
  noiseType: NoiseType;
  sourceMode: SourceMode;
  isPlaying: boolean;

  // Actions
  setFrequency: (frequency: number) => void;
  setAmplitude: (amplitude: number) => void;
  setWaveform: (waveform: WaveformType) => void;
  setNoiseType: (noiseType: NoiseType) => void;
  setSourceMode: (mode: SourceMode) => void;
  play: () => Promise<void>;
  stop: () => Promise<void>;
  reset: () => void;
}

// Single shared ToneGenerator instance
let generator: ToneGenerator | null = null;

function getGenerator(): ToneGenerator {
  if (!generator) {
    generator = new ToneGenerator();
  }
  return generator;
}

export const useAudioStore = create<AudioState>((set, get) => ({
  frequency: 440,
  amplitude: 0.5,
  waveform: 'sine',
  noiseType: 'white',
  sourceMode: 'tone',
  isPlaying: false,

  setFrequency: (frequency) => {
    set({ frequency });
    const { isPlaying, sourceMode, amplitude, waveform } = get();
    if (isPlaying && sourceMode === 'tone') {
      getGenerator().updateParams({ mode: 'tone', frequency, amplitude, waveform });
    }
  },

  setAmplitude: (amplitude) => {
    set({ amplitude });
    const { isPlaying, sourceMode, frequency, waveform, noiseType } = get();
    if (!isPlaying) return;
    if (sourceMode === 'tone') {
      getGenerator().updateParams({ mode: 'tone', frequency, amplitude, waveform });
    } else {
      getGenerator().updateParams({ mode: 'noise', amplitude, noiseType });
    }
  },

  setWaveform: (waveform) => {
    set({ waveform });
    const { isPlaying, sourceMode, frequency, amplitude } = get();
    if (isPlaying && sourceMode === 'tone') {
      getGenerator().updateParams({ mode: 'tone', frequency, amplitude, waveform });
    }
  },

  setNoiseType: (noiseType) => {
    set({ noiseType });
    const { isPlaying, sourceMode, amplitude } = get();
    if (isPlaying && sourceMode === 'noise') {
      getGenerator().updateParams({ mode: 'noise', amplitude, noiseType });
    }
  },

  setSourceMode: async (sourceMode) => {
    const { isPlaying } = get();
    if (isPlaying) {
      await getGenerator().stop();
      set({ isPlaying: false });
    }
    set({ sourceMode });
  },

  play: async () => {
    const { sourceMode, frequency, amplitude, waveform, noiseType } = get();
    if (sourceMode === 'noise') {
      await getGenerator().play({ mode: 'noise', amplitude, noiseType });
    } else {
      await getGenerator().play({ mode: 'tone', frequency, amplitude, waveform });
    }
    set({ isPlaying: true });
  },

  stop: async () => {
    set({ isPlaying: false });
    await getGenerator().stop();
  },

  reset: () => {
    const { isPlaying } = get();
    if (isPlaying) {
      getGenerator().stop();
    }
    set({
      frequency: 440,
      amplitude: 0.5,
      waveform: 'sine',
      noiseType: 'white',
      sourceMode: 'tone',
      isPlaying: false,
    });
  },
}));
