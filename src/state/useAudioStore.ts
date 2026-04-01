import { create } from 'zustand';
import { ToneGenerator, getHapticEngine } from '@/src/audio';
import type { WaveformType, NoiseType, SourceMode, FrequencyScale, RoomPreset } from '@/src/audio';

interface AudioState {
  // Shared audio parameters
  frequency: number;
  amplitude: number;
  waveform: WaveformType;
  noiseType: NoiseType;
  sourceMode: SourceMode;
  detune: number;
  pan: number;
  frequencyScale: FrequencyScale;
  harmonics: [number, number, number]; // gain 0–1 for 2nd, 3rd, 4th overtones
  attack: number; // envelope attack in seconds (0–2)
  release: number; // envelope release in seconds (0–2)
  isPlaying: boolean;

  // Room reverb
  roomEnabled: boolean;
  roomPreset: RoomPreset;
  roomWetDry: number; // 0 = dry, 1 = fully wet

  // Haptic feedback
  hapticEnabled: boolean;

  // Actions
  setFrequency: (frequency: number) => void;
  setAmplitude: (amplitude: number) => void;
  setWaveform: (waveform: WaveformType) => void;
  setNoiseType: (noiseType: NoiseType) => void;
  setSourceMode: (mode: SourceMode) => void;
  setDetune: (detune: number) => void;
  setPan: (pan: number) => void;
  setFrequencyScale: (scale: FrequencyScale) => void;
  setHarmonic: (index: number, value: number) => void;
  setAttack: (attack: number) => void;
  setRelease: (release: number) => void;
  setRoomEnabled: (enabled: boolean) => void;
  setRoomPreset: (preset: RoomPreset) => void;
  setRoomWetDry: (value: number) => void;
  setHapticEnabled: (enabled: boolean) => void;
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

/** Build AudioParams from current store state */
function buildParams(s: AudioState) {
  if (s.sourceMode === 'noise') {
    return { mode: 'noise' as const, amplitude: s.amplitude, noiseType: s.noiseType, pan: s.pan, attack: s.attack, release: s.release };
  }
  return { mode: 'tone' as const, frequency: s.frequency, amplitude: s.amplitude, waveform: s.waveform, detune: s.detune, pan: s.pan, harmonics: s.harmonics, attack: s.attack, release: s.release };
}

export const useAudioStore = create<AudioState>((set, get) => ({
  frequency: 440,
  amplitude: 0.5,
  waveform: 'sine',
  noiseType: 'white',
  sourceMode: 'tone',
  detune: 0,
  pan: 0,
  frequencyScale: 'linear',
  harmonics: [0, 0, 0] as [number, number, number],
  attack: 0.05,
  release: 0.1,
  isPlaying: false,
  roomEnabled: false,
  roomPreset: 'cathedral' as RoomPreset,
  roomWetDry: 0.3,
  hapticEnabled: false,

  setFrequency: (frequency) => {
    set({ frequency });
    const s = get();
    if (s.isPlaying && s.sourceMode === 'tone') {
      getGenerator().updateParams(buildParams(s));
      // Update haptic bass rumble when frequency changes during playback
      if (s.hapticEnabled) {
        getHapticEngine().updateBassRumble(frequency, s.amplitude);
      }
    }
  },

  setAmplitude: (amplitude) => {
    set({ amplitude });
    const s = get();
    if (!s.isPlaying) return;
    getGenerator().updateParams(buildParams(s));
    // Update haptic intensity when amplitude changes
    if (s.hapticEnabled && s.sourceMode === 'tone') {
      getHapticEngine().updateBassRumble(s.frequency, amplitude);
    }
  },

  setWaveform: (waveform) => {
    set({ waveform });
    const s = get();
    if (s.isPlaying && s.sourceMode === 'tone') {
      getGenerator().updateParams(buildParams(s));
    }
  },

  setNoiseType: (noiseType) => {
    set({ noiseType });
    const s = get();
    if (s.isPlaying && s.sourceMode === 'noise') {
      getGenerator().updateParams(buildParams(s));
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

  setDetune: (detune) => {
    set({ detune });
    const s = get();
    if (s.isPlaying && s.sourceMode === 'tone') {
      getGenerator().updateParams(buildParams(s));
    }
  },

  setPan: (pan) => {
    set({ pan });
    const s = get();
    if (!s.isPlaying) return;
    getGenerator().updateParams(buildParams(s));
  },

  setFrequencyScale: (frequencyScale) => {
    set({ frequencyScale });
  },

  setHarmonic: (index, value) => {
    const harmonics = [...get().harmonics] as [number, number, number];
    harmonics[index] = value;
    set({ harmonics });
    const s = get();
    if (s.isPlaying && s.sourceMode === 'tone') {
      getGenerator().updateParams(buildParams(s));
    }
  },

  setAttack: (attack) => {
    set({ attack });
  },

  setRelease: (release) => {
    set({ release });
  },

  setRoomEnabled: (enabled) => {
    set({ roomEnabled: enabled });
    const s = get();
    const gen = getGenerator();
    if (enabled) {
      gen.setRoomPreset(s.roomPreset);
      gen.setRoomWetDry(s.roomWetDry);
    } else {
      gen.bypassRoom();
    }
  },

  setRoomPreset: (preset) => {
    set({ roomPreset: preset });
    const s = get();
    if (s.roomEnabled) {
      getGenerator().setRoomPreset(preset);
    }
  },

  setRoomWetDry: (value) => {
    set({ roomWetDry: value });
    const s = get();
    if (s.roomEnabled) {
      getGenerator().setRoomWetDry(value);
    }
  },

  setHapticEnabled: (enabled) => {
    set({ hapticEnabled: enabled });
    const engine = getHapticEngine();
    engine.setEnabled(enabled);
    // If currently playing, start/stop haptics immediately
    const s = get();
    if (enabled && s.isPlaying && s.sourceMode === 'tone') {
      engine.startBassRumble(s.frequency, s.amplitude);
    } else if (!enabled) {
      engine.stopAll();
    }
  },

  play: async () => {
    const s = get();
    if (s.sourceMode === 'mic') {
      // Mic mode is managed externally; just set isPlaying flag
      set({ isPlaying: true });
      return;
    }
    const gen = getGenerator();
    await gen.play(buildParams(s));
    // Apply room reverb after play ensures AudioContext is initialized
    if (s.roomEnabled) {
      gen.setRoomPreset(s.roomPreset);
      gen.setRoomWetDry(s.roomWetDry);
    }
    // Start bass haptic rumble if enabled and playing a low tone
    if (s.hapticEnabled && s.sourceMode === 'tone') {
      getHapticEngine().startBassRumble(s.frequency, s.amplitude);
    }
    set({ isPlaying: true });
  },

  stop: async () => {
    const s = get();
    set({ isPlaying: false });
    if (s.sourceMode !== 'mic') {
      await getGenerator().stop();
    }
    // Stop all haptic feedback on stop
    getHapticEngine().stopAll();
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
      detune: 0,
      pan: 0,
      frequencyScale: 'linear',
      harmonics: [0, 0, 0] as [number, number, number],
      attack: 0.05,
      release: 0.1,
      isPlaying: false,
      roomEnabled: false,
      roomPreset: 'cathedral' as RoomPreset,
      roomWetDry: 0.3,
      hapticEnabled: false,
    });
    getHapticEngine().stopAll();
  },
}));
