import { NoiseType, SAMPLE_RATE } from './types';

/**
 * Generate PCM noise samples for ~0.5 seconds.
 * Returns Float64Array in [-1, 1].
 *
 * White: uniform random
 * Pink: Voss-McCartney algorithm (1/f spectrum)
 * Brown: integrated white noise (1/f² spectrum)
 */
export function generateNoiseSamples(
  amplitude: number,
  noiseType: NoiseType,
): Float64Array {
  // Generate extra samples for the crossfade overlap region
  const xfadeLen = 256;
  const totalSamples = Math.round(SAMPLE_RATE * 0.5);
  const rawLen = totalSamples + xfadeLen;
  const raw = new Float64Array(rawLen);
  const gen = NOISE_GENERATORS[noiseType];

  gen(raw, amplitude);

  // Crossfade: blend the tail of the buffer into the head so the loop
  // seam is seamless. The last xfadeLen samples fade out while the
  // first xfadeLen samples of the "next loop" (= raw[totalSamples..])
  // fade in and get mixed into samples[0..xfadeLen].
  const samples = new Float64Array(totalSamples);
  for (let i = 0; i < totalSamples; i++) {
    samples[i] = raw[i];
  }
  for (let i = 0; i < xfadeLen; i++) {
    const t = i / xfadeLen; // 0→1
    samples[i] = samples[i] * t + raw[totalSamples + i] * (1 - t);
  }

  return samples;
}

type NoiseGen = (out: Float64Array, amplitude: number) => void;

const NOISE_GENERATORS: Record<NoiseType, NoiseGen> = {
  white(out, amplitude) {
    for (let i = 0; i < out.length; i++) {
      out[i] = (Math.random() * 2 - 1) * amplitude;
    }
  },

  pink(out, amplitude) {
    // Voss-McCartney with 8 octave rows
    const rows = 8;
    const rowValues = new Float64Array(rows);
    let runningSum = 0;

    for (let r = 0; r < rows; r++) {
      rowValues[r] = Math.random() * 2 - 1;
      runningSum += rowValues[r];
    }

    for (let i = 0; i < out.length; i++) {
      // Determine which rows to update based on trailing zeros of i
      let k = i;
      let j = 0;
      while (j < rows && (k & 1) === 0 && k > 0) {
        runningSum -= rowValues[j];
        rowValues[j] = Math.random() * 2 - 1;
        runningSum += rowValues[j];
        k >>= 1;
        j++;
      }

      // Add white noise component for high-frequency content
      const white = Math.random() * 2 - 1;
      const value = (runningSum + white) / (rows + 1);
      out[i] = value * amplitude;
    }
  },

  brown(out, amplitude) {
    let value = 0;
    const leak = 0.998; // Slight leak to prevent DC drift

    for (let i = 0; i < out.length; i++) {
      const white = Math.random() * 2 - 1;
      value = value * leak + white * 0.1;
      // Clamp to prevent rare excursions
      value = Math.max(-1, Math.min(1, value));
      out[i] = value * amplitude * 3.5; // Scale up since brown noise is quiet
    }
  },
};
