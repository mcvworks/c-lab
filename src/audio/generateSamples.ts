import { WaveformType, SAMPLE_RATE } from './types';

/**
 * Generate PCM samples for one seamless loop of the given waveform.
 * Returns Float32-range samples in [-1, 1].
 *
 * The buffer length is chosen as an exact multiple of the waveform period
 * so the loop point is phase-aligned (no click at the seam).
 */
export function generateSamples(
  frequency: number,
  amplitude: number,
  waveform: WaveformType,
): Float64Array {
  // Compute an exact number of complete cycles for ~0.5 seconds
  const targetDuration = 0.5;
  const numCycles = Math.max(1, Math.round(targetDuration * frequency));
  const totalSamples = Math.round((numCycles * SAMPLE_RATE) / frequency);

  const samples = new Float64Array(totalSamples);
  const gen = GENERATORS[waveform];

  // Buffer is an exact integer number of cycles, so the loop seam is
  // already phase-aligned — no fade envelope needed. Play/stop fading
  // is handled by the ToneGenerator's gain ramps.
  for (let i = 0; i < totalSamples; i++) {
    const phase = (i / totalSamples) * numCycles; // 0 → numCycles
    const t = phase - Math.floor(phase); // normalized 0→1 within one cycle
    samples[i] = gen(t) * amplitude;
  }

  return samples;
}

/** Waveform generator functions. Input t is normalized phase [0, 1). */
const GENERATORS: Record<WaveformType, (t: number) => number> = {
  sine: (t) => Math.sin(2 * Math.PI * t),

  square: (t) => (t < 0.5 ? 1 : -1),

  saw: (t) => 2 * t - 1,

  triangle: (t) => (t < 0.5 ? 4 * t - 1 : 3 - 4 * t),
};
