import { SAMPLE_RATE } from './types';

/**
 * Encode left/right Float64Array PCM samples as a 16-bit stereo WAV file.
 * Returns a base64-encoded string suitable for expo-av data URI playback.
 *
 * Both arrays must have the same length.
 */
export function encodeWavStereoBase64(
  left: Float64Array,
  right: Float64Array,
): string {
  const numSamples = left.length;
  const numChannels = 2;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = numSamples * blockAlign;
  const headerSize = 44;
  const fileSize = headerSize + dataSize;

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, fileSize - 8, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // sub-chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true); // stereo
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * blockAlign, true); // byte rate
  view.setUint16(32, blockAlign, true); // block align
  view.setUint16(34, bitsPerSample, true);

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Write interleaved stereo PCM samples (L, R, L, R, ...)
  for (let i = 0; i < numSamples; i++) {
    const lClamped = Math.max(-1, Math.min(1, left[i]));
    const rClamped = Math.max(-1, Math.min(1, right[i]));
    const lInt16 = lClamped < 0 ? lClamped * 0x8000 : lClamped * 0x7fff;
    const rInt16 = rClamped < 0 ? rClamped * 0x8000 : rClamped * 0x7fff;
    const offset = headerSize + i * blockAlign;
    view.setInt16(offset, lInt16, true);
    view.setInt16(offset + bytesPerSample, rInt16, true);
  }

  return arrayBufferToBase64(buffer);
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
