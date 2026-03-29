export type WaveformType = 'sine' | 'square' | 'saw' | 'triangle';
export type NoiseType = 'white' | 'pink' | 'brown';
export type SourceMode = 'tone' | 'noise';

export type FrequencyScale = 'linear' | 'log';

export interface ToneParams {
  frequency: number;
  amplitude: number;
  waveform: WaveformType;
  detune: number; // cents (-100 to +100)
  pan: number; // -1 (left) to +1 (right)
  harmonics: [number, number, number]; // gain 0–1 for 2nd, 3rd, 4th overtones
}

export interface NoiseParams {
  amplitude: number;
  noiseType: NoiseType;
}

export interface NoiseExtraParams {
  pan: number;
}

export type AudioParams =
  | ({ mode: 'tone' } & ToneParams)
  | ({ mode: 'noise' } & NoiseParams & NoiseExtraParams);

export const SAMPLE_RATE = 44100;
export const DEFAULT_TONE: ToneParams = {
  frequency: 440,
  amplitude: 0.5,
  waveform: 'sine',
  detune: 0,
  pan: 0,
  harmonics: [0, 0, 0],
};
