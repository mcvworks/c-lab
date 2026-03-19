export type WaveformType = 'sine' | 'square' | 'saw' | 'triangle';

export interface ToneParams {
  frequency: number;
  amplitude: number;
  waveform: WaveformType;
}

export const SAMPLE_RATE = 44100;
export const DEFAULT_TONE: ToneParams = {
  frequency: 440,
  amplitude: 0.5,
  waveform: 'sine',
};
