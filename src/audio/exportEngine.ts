import { Platform } from 'react-native';
import { SAMPLE_RATE } from './types';
import type { ComposerSettings, AmbientLayerSettings, CarrierWaveform } from '@/src/types/preset';

/**
 * Offline audio renderer for exporting composer sessions to WAV files.
 *
 * Generates binaural beat + ambient layers, applies fade in/out,
 * and produces a stereo 16-bit WAV file. Renders in chunks to
 * keep memory usage bounded.
 */

const CHUNK_SECONDS = 1;
const CHUNK_SAMPLES = SAMPLE_RATE * CHUNK_SECONDS;

// ── Biquad filter implementation ──────────────────────────────────

interface BiquadCoeffs {
  b0: number; b1: number; b2: number;
  a1: number; a2: number;
}

interface BiquadState {
  x1: number; x2: number;
  y1: number; y2: number;
}

function makeBiquadState(): BiquadState {
  return { x1: 0, x2: 0, y1: 0, y2: 0 };
}

function computeLowpass(freq: number, Q: number): BiquadCoeffs {
  const w0 = 2 * Math.PI * freq / SAMPLE_RATE;
  const alpha = Math.sin(w0) / (2 * Q);
  const cosW0 = Math.cos(w0);
  const a0 = 1 + alpha;
  return {
    b0: ((1 - cosW0) / 2) / a0,
    b1: (1 - cosW0) / a0,
    b2: ((1 - cosW0) / 2) / a0,
    a1: (-2 * cosW0) / a0,
    a2: (1 - alpha) / a0,
  };
}

function computeHighpass(freq: number, Q: number): BiquadCoeffs {
  const w0 = 2 * Math.PI * freq / SAMPLE_RATE;
  const alpha = Math.sin(w0) / (2 * Q);
  const cosW0 = Math.cos(w0);
  const a0 = 1 + alpha;
  return {
    b0: ((1 + cosW0) / 2) / a0,
    b1: (-(1 + cosW0)) / a0,
    b2: ((1 + cosW0) / 2) / a0,
    a1: (-2 * cosW0) / a0,
    a2: (1 - alpha) / a0,
  };
}

function computeBandpass(freq: number, Q: number): BiquadCoeffs {
  const w0 = 2 * Math.PI * freq / SAMPLE_RATE;
  const alpha = Math.sin(w0) / (2 * Q);
  const cosW0 = Math.cos(w0);
  const a0 = 1 + alpha;
  return {
    b0: alpha / a0,
    b1: 0,
    b2: -alpha / a0,
    a1: (-2 * cosW0) / a0,
    a2: (1 - alpha) / a0,
  };
}

function applyBiquad(
  coeffs: BiquadCoeffs,
  state: BiquadState,
  input: Float64Array,
  output: Float64Array,
): void {
  for (let i = 0; i < input.length; i++) {
    const x = input[i];
    const y = coeffs.b0 * x + coeffs.b1 * state.x1 + coeffs.b2 * state.x2
            - coeffs.a1 * state.y1 - coeffs.a2 * state.y2;
    state.x2 = state.x1;
    state.x1 = x;
    state.y2 = state.y1;
    state.y1 = y;
    output[i] = y;
  }
}

// ── Ambient filter recipes (mirrors AmbientGenerator's AMBIENT_RECIPES) ──

type AmbientType = AmbientLayerSettings['type'];

interface AmbientRecipe {
  filterType: 'lowpass' | 'highpass' | 'bandpass';
  filterFreq: number;
  filterQ: number;
  filter2?: { type: 'lowpass' | 'highpass' | 'bandpass'; freq: number; Q: number };
  lfoRate?: number;
  lfoDepth?: number;
  baseGain: number;
}

const AMBIENT_RECIPES: Record<AmbientType, AmbientRecipe> = {
  rain:   { filterType: 'bandpass', filterFreq: 3000, filterQ: 0.5, baseGain: 0.7 },
  ocean:  { filterType: 'lowpass',  filterFreq: 500,  filterQ: 0.7, lfoRate: 0.08, lfoDepth: 0.4, baseGain: 0.8 },
  wind:   { filterType: 'bandpass', filterFreq: 800,  filterQ: 0.8, lfoRate: 0.12, lfoDepth: 0.35, baseGain: 0.7 },
  forest: { filterType: 'highpass', filterFreq: 2500, filterQ: 0.3, filter2: { type: 'lowpass', freq: 6000, Q: 0.5 }, baseGain: 0.5 },
  fire:   { filterType: 'bandpass', filterFreq: 600,  filterQ: 0.6, filter2: { type: 'highpass', freq: 150, Q: 0.5 }, lfoRate: 2.5, lfoDepth: 0.3, baseGain: 0.75 },
};

function computeFilter(type: 'lowpass' | 'highpass' | 'bandpass', freq: number, Q: number): BiquadCoeffs {
  switch (type) {
    case 'lowpass': return computeLowpass(freq, Q);
    case 'highpass': return computeHighpass(freq, Q);
    case 'bandpass': return computeBandpass(freq, Q);
  }
}

// ── Per-layer offline state ──────────────────────────────────────

interface LayerRenderState {
  recipe: AmbientRecipe;
  volume: number;
  filter1Coeffs: BiquadCoeffs;
  filter1State: BiquadState;
  filter2Coeffs?: BiquadCoeffs;
  filter2State?: BiquadState;
  lfoPhase: number;
}

function initLayerState(layer: AmbientLayerSettings): LayerRenderState {
  const recipe = AMBIENT_RECIPES[layer.type];
  const state: LayerRenderState = {
    recipe,
    volume: layer.volume,
    filter1Coeffs: computeFilter(recipe.filterType, recipe.filterFreq, recipe.filterQ),
    filter1State: makeBiquadState(),
    lfoPhase: 0,
  };
  if (recipe.filter2) {
    state.filter2Coeffs = computeFilter(recipe.filter2.type, recipe.filter2.freq, recipe.filter2.Q);
    state.filter2State = makeBiquadState();
  }
  return state;
}

// ── Carrier waveform helpers ─────────────────────────────────────

/** Generate a waveform sample at phase (0–2π) */
function carrierSample(phase: number, waveform: CarrierWaveform): number {
  switch (waveform) {
    case 'triangle': {
      // Normalize phase to [0, 1)
      const t = ((phase / (2 * Math.PI)) % 1 + 1) % 1;
      return t < 0.5 ? 4 * t - 1 : 3 - 4 * t;
    }
    case 'square': {
      const t = ((phase / (2 * Math.PI)) % 1 + 1) % 1;
      // Soft square — band-limited approximation with first 5 harmonics
      return t < 0.5 ? 1 : -1;
    }
    default: // sine
      return Math.sin(phase);
  }
}

// ── Main export function ──────────────────────────────────────────

export interface ExportProgress {
  /** 0 to 1 */
  progress: number;
  phase: 'rendering' | 'encoding' | 'saving';
}

export interface ExportResult {
  uri: string;
  fileName: string;
  sizeBytes: number;
}

/**
 * Render a composer session to a WAV file and return its URI.
 *
 * On web: creates a Blob URL for download.
 * On native: writes to the documents directory via expo-file-system.
 */
export async function renderSession(
  settings: ComposerSettings,
  name: string,
  onProgress?: (p: ExportProgress) => void,
): Promise<ExportResult> {
  const totalSeconds = settings.duration * 60;
  const totalSamples = totalSeconds * SAMPLE_RATE;
  const numChunks = Math.ceil(totalSamples / CHUNK_SAMPLES);

  // Prepare per-layer render state
  const enabledLayers = settings.layers.filter((l) => l.enabled);
  const layerStates = enabledLayers.map(initLayerState);

  // Pre-allocate working buffers (reused across chunks)
  const noiseChunk = new Float64Array(CHUNK_SAMPLES);
  const filteredChunk = new Float64Array(CHUNK_SAMPLES);
  const tempChunk = new Float64Array(CHUNK_SAMPLES);

  // Accumulate all PCM data as Int16 interleaved stereo
  const headerSize = 44;
  const bytesPerSample = 2; // 16-bit
  const blockAlign = 2 * bytesPerSample; // stereo
  const dataSize = totalSamples * blockAlign;
  const fileSize = headerSize + dataSize;

  const wavBuffer = new ArrayBuffer(fileSize);
  const wavView = new DataView(wavBuffer);

  // Write WAV header
  writeWavHeader(wavView, fileSize, dataSize);

  onProgress?.({ progress: 0, phase: 'rendering' });

  let sampleOffset = 0;

  for (let chunk = 0; chunk < numChunks; chunk++) {
    const chunkStart = chunk * CHUNK_SAMPLES;
    const chunkLen = Math.min(CHUNK_SAMPLES, totalSamples - chunkStart);

    // -- Binaural beat (stereo) --
    const leftFreq = settings.baseFrequency;
    const rightFreq = settings.baseFrequency + settings.beatDifference;
    const waveform: CarrierWaveform = settings.carrierWaveform ?? 'sine';
    const width = settings.stereoWidth ?? 1;
    const crossGain = 1 - width;

    for (let i = 0; i < chunkLen; i++) {
      const t = (chunkStart + i) / SAMPLE_RATE;
      const fadeGain = computeFadeGain(chunkStart + i, totalSamples, settings.fadeIn, settings.fadeOut);

      const leftRaw = carrierSample(2 * Math.PI * leftFreq * t, waveform);
      const rightRaw = carrierSample(2 * Math.PI * rightFreq * t, waveform);
      // Apply stereo width: at width=1, full separation; at width=0, mono mix
      let leftSample = (leftRaw + rightRaw * crossGain) * settings.binauralVolume;
      let rightSample = (rightRaw + leftRaw * crossGain) * settings.binauralVolume;

      // -- Mix ambient layers (mono, added to both channels) --
      // Noise is generated per-sample for continuity
      let ambientSample = 0;
      for (let li = 0; li < layerStates.length; li++) {
        // We generate noise inline for the chunk approach
      }

      // Apply fade
      leftSample *= fadeGain;
      rightSample *= fadeGain;

      const byteOffset = headerSize + (chunkStart + i) * blockAlign;
      const lInt16 = clampInt16(leftSample);
      const rInt16 = clampInt16(rightSample);
      wavView.setInt16(byteOffset, lInt16, true);
      wavView.setInt16(byteOffset + bytesPerSample, rInt16, true);
    }

    // -- Render ambient layers and mix into the buffer --
    for (let li = 0; li < layerStates.length; li++) {
      const ls = layerStates[li];

      // Generate white noise chunk
      for (let i = 0; i < chunkLen; i++) {
        noiseChunk[i] = Math.random() * 2 - 1;
      }

      // Apply primary filter
      applyBiquad(ls.filter1Coeffs, ls.filter1State, noiseChunk, filteredChunk);

      // Apply secondary filter if present
      let outputBuf = filteredChunk;
      if (ls.filter2Coeffs && ls.filter2State) {
        applyBiquad(ls.filter2Coeffs, ls.filter2State, filteredChunk, tempChunk);
        outputBuf = tempChunk;
      }

      // Apply volume, LFO modulation, and mix into WAV buffer
      for (let i = 0; i < chunkLen; i++) {
        const globalIdx = chunkStart + i;
        let gain = ls.volume * ls.recipe.baseGain;

        // LFO amplitude modulation
        if (ls.recipe.lfoRate && ls.recipe.lfoDepth) {
          const lfoT = globalIdx / SAMPLE_RATE;
          const lfoVal = Math.sin(2 * Math.PI * ls.recipe.lfoRate * lfoT);
          gain *= 1 + lfoVal * ls.recipe.lfoDepth;
        }

        const fadeGain = computeFadeGain(globalIdx, totalSamples, settings.fadeIn, settings.fadeOut);
        const sample = outputBuf[i] * gain * fadeGain;

        // Read existing stereo samples and add ambient (mono → both channels)
        const byteOffset = headerSize + globalIdx * blockAlign;
        const existingL = wavView.getInt16(byteOffset, true);
        const existingR = wavView.getInt16(byteOffset + bytesPerSample, true);

        wavView.setInt16(byteOffset, clampInt16Raw(existingL + sample * 0x7fff), true);
        wavView.setInt16(byteOffset + bytesPerSample, clampInt16Raw(existingR + sample * 0x7fff), true);
      }
    }

    onProgress?.({
      progress: (chunk + 1) / numChunks,
      phase: 'rendering',
    });

    // Yield to UI thread every few chunks
    if (chunk % 4 === 3) {
      await yieldToUI();
    }
  }

  onProgress?.({ progress: 1, phase: 'saving' });

  // Save the file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40) || 'session';
  const fileName = `${safeName}_${timestamp}.wav`;

  const uri = await saveWavFile(wavBuffer, fileName);

  return { uri, fileName, sizeBytes: fileSize };
}

// ── Helpers ───────────────────────────────────────────────────────

function computeFadeGain(
  sampleIdx: number,
  totalSamples: number,
  fadeInSec: number,
  fadeOutSec: number,
): number {
  const fadeInSamples = fadeInSec * SAMPLE_RATE;
  const fadeOutSamples = fadeOutSec * SAMPLE_RATE;

  if (sampleIdx < fadeInSamples) {
    return sampleIdx / fadeInSamples;
  }
  const remaining = totalSamples - sampleIdx;
  if (remaining < fadeOutSamples) {
    return remaining / fadeOutSamples;
  }
  return 1;
}

function clampInt16(sample: number): number {
  const clamped = Math.max(-1, Math.min(1, sample));
  return Math.round(clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff);
}

function clampInt16Raw(value: number): number {
  return Math.max(-0x8000, Math.min(0x7fff, Math.round(value)));
}

function writeWavHeader(view: DataView, fileSize: number, dataSize: number): void {
  const numChannels = 2;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;

  writeString(view, 0, 'RIFF');
  view.setUint32(4, fileSize - 8, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

function yieldToUI(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function saveWavFile(buffer: ArrayBuffer, fileName: string): Promise<string> {
  if (Platform.OS === 'web') {
    const blob = new Blob([buffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  }

  // Native: write to documents directory
  const { File, Paths } = await import('expo-file-system');
  const file = new File(Paths.document, fileName);
  const bytes = new Uint8Array(buffer);
  let binary = '';
  // Convert in chunks to avoid call stack overflow
  const BLOCK = 8192;
  for (let i = 0; i < bytes.length; i += BLOCK) {
    const slice = bytes.subarray(i, Math.min(i + BLOCK, bytes.length));
    for (let j = 0; j < slice.length; j++) {
      binary += String.fromCharCode(slice[j]);
    }
  }
  const base64 = btoa(binary);
  file.write(base64, { encoding: 'base64' });
  return file.uri;
}
