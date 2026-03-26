import { Platform } from 'react-native';
import { AudioParams, WaveformType } from './types';
import { generateSamples } from './generateSamples';
import { generateNoiseSamples } from './generateNoiseSamples';
import { encodeWavBase64 } from './encodeWav';

/** Map our waveform names to Web Audio OscillatorNode type values. */
const OSC_TYPE: Record<WaveformType, OscillatorType> = {
  sine: 'sine',
  square: 'square',
  saw: 'sawtooth',
  triangle: 'triangle',
};

// Ramp duration for smooth parameter transitions (seconds)
const RAMP_TIME = 0.03;

/**
 * Manages tone/noise generation and playback.
 *
 * On web:
 *   Tone mode → OscillatorNode with smooth frequency/type ramps (no buffers).
 *   Noise mode → looped AudioBuffer with crossfade on change.
 * On native: expo-av with temp WAV files.
 */
export class ToneGenerator {
  private currentParams: AudioParams | null = null;
  private playing = false;

  // Web Audio shared state
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  // Web Audio — tone mode (oscillator-based)
  private oscillator: OscillatorNode | null = null;

  // Web Audio — noise mode (buffer-based)
  private noiseSource: AudioBufferSourceNode | null = null;
  private noiseGain: GainNode | null = null;

  // Track which web mode is active: 'osc' | 'buf' | null
  private webMode: 'osc' | 'buf' | null = null;

  // Native state
  private nativeSound: any = null; // expo-av Sound
  private tempFile: any = null;

  async play(params: AudioParams): Promise<void> {
    await this.loadAndPlay(params);
  }

  async stop(): Promise<void> {
    this.playing = false;
    if (Platform.OS === 'web') {
      await this.stopWeb();
    } else {
      await this.stopNative();
    }
    this.currentParams = null;
  }

  async updateParams(params: AudioParams): Promise<void> {
    if (!this.playing) return;
    if (this.currentParams && paramsEqual(this.currentParams, params)) return;
    await this.loadAndPlay(params);
  }

  isPlaying(): boolean {
    return this.playing;
  }

  async dispose(): Promise<void> {
    await this.stop();
    if (this.audioCtx) {
      await this.audioCtx.close();
      this.audioCtx = null;
    }
  }

  private async loadAndPlay(params: AudioParams): Promise<void> {
    if (Platform.OS === 'web') {
      await this.playWeb(params);
    } else {
      await this.playNative(params);
    }
    this.currentParams = { ...params };
    this.playing = true;
  }

  // ── Web Audio API ──────────────────────────────────────────────

  private getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      this.audioCtx = new AudioContext();
    }
    return this.audioCtx;
  }

  private ensureMasterGain(): GainNode {
    const ctx = this.getAudioContext();
    if (!this.masterGain) {
      this.masterGain = ctx.createGain();
      this.masterGain.connect(ctx.destination);
    }
    return this.masterGain;
  }

  private async playWeb(params: AudioParams): Promise<void> {
    const ctx = this.getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    if (params.mode === 'tone') {
      await this.playWebTone(params);
    } else {
      await this.playWebNoise(params);
    }
  }

  /** Tone mode: use OscillatorNode for click-free parameter changes. */
  private async playWebTone(params: AudioParams & { mode: 'tone' }): Promise<void> {
    const ctx = this.getAudioContext();
    const master = this.ensureMasterGain();
    const now = ctx.currentTime;

    // If switching from noise → tone, tear down noise first
    if (this.webMode === 'buf') {
      this.teardownNoiseBuf();
    }

    if (this.oscillator && this.webMode === 'osc') {
      // Already have an oscillator running — just ramp parameters
      this.oscillator.frequency.linearRampToValueAtTime(params.frequency, now + RAMP_TIME);
      if (this.oscillator.type !== OSC_TYPE[params.waveform]) {
        this.oscillator.type = OSC_TYPE[params.waveform];
      }
      master.gain.linearRampToValueAtTime(params.amplitude, now + RAMP_TIME);
    } else {
      // Create fresh oscillator
      master.gain.setValueAtTime(params.amplitude, now);

      this.oscillator = ctx.createOscillator();
      this.oscillator.type = OSC_TYPE[params.waveform];
      this.oscillator.frequency.setValueAtTime(params.frequency, now);
      this.oscillator.connect(master);
      this.oscillator.start(now);
    }

    this.webMode = 'osc';
  }

  /** Noise mode: looped AudioBuffer with crossfade on switch. */
  private async playWebNoise(params: AudioParams & { mode: 'noise' }): Promise<void> {
    const ctx = this.getAudioContext();
    const master = this.ensureMasterGain();
    const now = ctx.currentTime;

    // If switching from tone → noise, tear down oscillator first
    if (this.webMode === 'osc') {
      this.teardownOsc();
    }

    const samples = generateNoiseSamples(params.amplitude, params.noiseType);
    const buffer = ctx.createBuffer(1, samples.length, 44100);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) {
      channelData[i] = samples[i];
    }

    const newGain = ctx.createGain();
    const newSource = ctx.createBufferSource();
    newSource.buffer = buffer;
    newSource.loop = true;
    newSource.connect(newGain);
    newGain.connect(master);

    const oldSource = this.noiseSource;
    const oldGain = this.noiseGain;

    if (oldSource && oldGain) {
      // Crossfade
      newGain.gain.setValueAtTime(0, now);
      newGain.gain.linearRampToValueAtTime(1, now + RAMP_TIME);
      newSource.start(now);

      oldGain.gain.linearRampToValueAtTime(0, now + RAMP_TIME);
      setTimeout(() => {
        try { oldSource.stop(); oldSource.disconnect(); oldGain.disconnect(); } catch { /* */ }
      }, RAMP_TIME * 1000 + 20);
    } else {
      newGain.gain.setValueAtTime(1, now);
      newSource.start(now);
    }

    master.gain.setValueAtTime(params.amplitude, now);
    this.noiseSource = newSource;
    this.noiseGain = newGain;
    this.webMode = 'buf';
  }

  private teardownOsc(): void {
    if (this.oscillator) {
      try { this.oscillator.stop(); this.oscillator.disconnect(); } catch { /* */ }
      this.oscillator = null;
    }
  }

  private teardownNoiseBuf(): void {
    if (this.noiseSource) {
      try { this.noiseSource.stop(); this.noiseSource.disconnect(); } catch { /* */ }
      this.noiseSource = null;
    }
    if (this.noiseGain) {
      try { this.noiseGain.disconnect(); } catch { /* */ }
      this.noiseGain = null;
    }
  }

  private async stopWeb(): Promise<void> {
    if (this.masterGain && this.audioCtx) {
      const now = this.audioCtx.currentTime;
      this.masterGain.gain.linearRampToValueAtTime(0, now + 0.06);
      await new Promise((r) => setTimeout(r, 80));
    }
    this.teardownOsc();
    this.teardownNoiseBuf();
    if (this.masterGain) {
      try { this.masterGain.disconnect(); } catch { /* */ }
      this.masterGain = null;
    }
    this.webMode = null;
  }

  // ── Native (expo-av) ──────────────────────────────────────────

  private async playNative(params: AudioParams): Promise<void> {
    const { Audio } = await import('expo-av');
    const { File, Paths } = await import('expo-file-system');

    const samples = params.mode === 'noise'
      ? generateNoiseSamples(params.amplitude, params.noiseType)
      : generateSamples(
          (params as any).frequency,
          params.amplitude,
          (params as any).waveform,
        );

    const base64 = encodeWavBase64(samples);
    const newTempFile = new File(Paths.cache, `tone_${Date.now()}.wav`);
    newTempFile.write(base64, { encoding: 'base64' });

    const prevSound = this.nativeSound;
    const prevTempFile = this.tempFile;

    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: newTempFile.uri },
        { isLooping: true, volume: params.amplitude, shouldPlay: true },
      );

      this.nativeSound = newSound;
      this.tempFile = newTempFile;

      if (prevSound) {
        try {
          await prevSound.setVolumeAsync(0);
          await prevSound.stopAsync();
          await prevSound.unloadAsync();
        } catch { /* ignore */ }
      }
      if (prevTempFile) {
        try { prevTempFile.delete(); } catch { /* ignore */ }
      }
    } catch (error) {
      try { newTempFile.delete(); } catch { /* ignore */ }
      throw error;
    }
  }

  private async stopNative(): Promise<void> {
    if (this.nativeSound) {
      try {
        await this.nativeSound.setVolumeAsync(0);
        await this.nativeSound.stopAsync();
        await this.nativeSound.unloadAsync();
      } catch { /* ignore */ }
      this.nativeSound = null;
    }
    if (this.tempFile) {
      try { this.tempFile.delete(); } catch { /* ignore */ }
      this.tempFile = null;
    }
  }
}

function paramsEqual(a: AudioParams, b: AudioParams): boolean {
  if (a.mode !== b.mode) return false;
  if (Math.abs(a.amplitude - b.amplitude) >= 0.005) return false;
  if (a.mode === 'tone' && b.mode === 'tone') {
    return a.frequency === b.frequency && a.waveform === b.waveform;
  }
  if (a.mode === 'noise' && b.mode === 'noise') {
    return a.noiseType === b.noiseType;
  }
  return false;
}
