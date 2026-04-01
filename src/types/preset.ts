import type { WaveformType, NoiseType, SourceMode, FrequencyScale, RoomPreset } from '@/src/audio';

export interface ExploreSettings {
  sourceMode: SourceMode;
  frequency: number;
  amplitude: number;
  waveform: WaveformType;
  noiseType: NoiseType;
  detune?: number;
  pan?: number;
  frequencyScale?: FrequencyScale;
  harmonics?: [number, number, number];
  attack?: number;
  release?: number;
  dualFreq?: boolean;
  frequency2?: number;
  waveform2?: WaveformType;
  damping?: number;
  sweepStart?: number;
  sweepEnd?: number;
  sweepSpeed?: string;
  sweepLoop?: boolean;
  roomEnabled?: boolean;
  roomPreset?: RoomPreset;
  roomWetDry?: number;
}

export interface AmbientLayerSettings {
  type: 'rain' | 'ocean' | 'wind' | 'forest' | 'fire';
  volume: number;
  enabled: boolean;
  pan?: number;           // -1 (L) to +1 (R), default 0
  filterCutoff?: number;  // Hz, user-controllable brightness
}

export type CarrierWaveform = 'sine' | 'triangle' | 'square';
export type EntrainmentMode = 'binaural' | 'isochronal';

export type BrainState = 'delta' | 'theta' | 'alpha' | 'beta';

export interface JourneySettings {
  enabled: boolean;
  startState: BrainState;
  endState: BrainState;
}

export interface ComposerSettings {
  baseFrequency: number;
  beatDifference: number;
  binauralVolume: number;
  carrierWaveform?: CarrierWaveform;
  stereoWidth?: number;
  entrainmentMode?: EntrainmentMode;
  layers: AmbientLayerSettings[];
  duration: number;
  fadeIn: number;
  fadeOut: number;
  journey?: JourneySettings;
}

export type PresetType = 'explore' | 'composer';

export interface Preset {
  id: string;
  name: string;
  type: PresetType;
  settings: ExploreSettings | ComposerSettings;
  createdAt: number;
  updatedAt: number;
}

export interface ExportRecord {
  id: string;
  name: string;
  fileName: string;
  /** URI or blob URL pointing to the exported WAV file */
  uri: string;
  durationSeconds: number;
  format: 'wav';
  sizeBytes: number;
  settings: ComposerSettings;
  createdAt: number;
}
