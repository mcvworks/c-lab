export type WaveformType = 'sine' | 'square' | 'saw' | 'triangle';
export type NoiseType = 'white' | 'pink' | 'brown';
export type SourceMode = 'tone' | 'noise';

export interface ToneParams {
  frequency: number;
  amplitude: number;
  waveform: WaveformType;
}

export interface NoiseParams {
  amplitude: number;
  noiseType: NoiseType;
}

export type AudioParams =
  | ({ mode: 'tone' } & ToneParams)
  | ({ mode: 'noise' } & NoiseParams);

export const SAMPLE_RATE = 44100;
export const DEFAULT_TONE: ToneParams = {
  frequency: 440,
  amplitude: 0.5,
  waveform: 'sine',
};
