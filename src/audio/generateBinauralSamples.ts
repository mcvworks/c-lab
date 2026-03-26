import { SAMPLE_RATE } from './types';

/**
 * Generate stereo PCM samples for a binaural beat.
 *
 * Left channel: pure sine at `leftFreq` Hz
 * Right channel: pure sine at `rightFreq` Hz
 *
 * The perceived binaural beat = |rightFreq - leftFreq|.
 *
 * Returns { left, right } Float64Arrays with values in [-1, 1].
 * Buffer length is an exact multiple of the beat-difference period
 * so the stereo loop point is seamless.
 */
export function generateBinauralSamples(
  leftFreq: number,
  rightFreq: number,
  amplitude: number,
): { left: Float64Array; right: Float64Array } {
  // Choose loop length as an exact integer number of cycles for BOTH
  // frequencies so the loop seam is click-free. We find the number of
  // samples that gives a near-integer cycle count for each tone.
  //
  // Target ~0.5 s of audio. We use the beat frequency to ensure the
  // loop contains at least one full beat cycle for smoothness.
  const beatFreq = Math.abs(rightFreq - leftFreq);
  const targetDuration = beatFreq > 0 ? Math.max(0.5, 1 / beatFreq) : 0.5;
  // Cap at 2 seconds to keep buffer reasonable
  const cappedDuration = Math.min(targetDuration, 2.0);

  // For each frequency, compute cycles that fit in cappedDuration
  const leftCycles = Math.max(1, Math.round(cappedDuration * leftFreq));
  const rightCycles = Math.max(1, Math.round(cappedDuration * rightFreq));

  // Use the longer of the two to determine buffer length, ensuring
  // both channels loop cleanly
  const samplesFromLeft = Math.round((leftCycles * SAMPLE_RATE) / leftFreq);
  const samplesFromRight = Math.round((rightCycles * SAMPLE_RATE) / rightFreq);
  const totalSamples = Math.max(samplesFromLeft, samplesFromRight);

  const left = new Float64Array(totalSamples);
  const right = new Float64Array(totalSamples);

  // Both channels are phase-aligned sine waves with integer cycle counts,
  // so the loop seam is seamless — no fade envelope needed. Play/stop
  // fading is handled by the BinauralGenerator's gain ramps.
  for (let i = 0; i < totalSamples; i++) {
    const t = i / SAMPLE_RATE;
    left[i] = Math.sin(2 * Math.PI * leftFreq * t) * amplitude;
    right[i] = Math.sin(2 * Math.PI * rightFreq * t) * amplitude;
  }

  return { left, right };
}
