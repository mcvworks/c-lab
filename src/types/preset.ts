import type { WaveformType, NoiseType, SourceMode } from '@/src/audio';

export interface ExploreSettings {
  sourceMode: SourceMode;
  frequency: number;
  amplitude: number;
  waveform: WaveformType;
  noiseType: NoiseType;
}

export interface AmbientLayerSettings {
  type: 'rain' | 'ocean' | 'wind' | 'forest' | 'fire';
  volume: number;
  enabled: boolean;
}

export interface ComposerSettings {
  baseFrequency: number;
  beatDifference: number;
  binauralVolume: number;
  layers: AmbientLayerSettings[];
  duration: number;
  fadeIn: number;
  fadeOut: number;
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
