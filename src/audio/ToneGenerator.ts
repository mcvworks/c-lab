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

/** Cancel any scheduled automation, anchor at the current value, then ramp. */
function smoothRamp(param: AudioParam, target: number, now: number, duration = RAMP_TIME): void {
  param.cancelScheduledValues(now);
  param.setValueAtTime(param.value, now);
  param.linearRampToValueAtTime(target, now + duration);
}

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

  // Harmonic oscillators (2x, 3x, 4x fundamental)
  private harmonicOscs: (OscillatorNode | null)[] = [null, null, null];
  private harmonicGains: (GainNode | null)[] = [null, null, null];
  private static readonly HARMONIC_MULTIPLIERS = [2, 3, 4];

  // Web Audio — panning
  private panner: StereoPannerNode | null = null;

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
      this.panner = ctx.createStereoPanner();
      this.panner.pan.value = 0;
      this.masterGain.connect(this.panner);
      this.panner.connect(ctx.destination);
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

    // If switching from noise → tone, fade out noise first
    if (this.webMode === 'buf') {
      this.fadeOutNoiseBuf(now);
    }

    if (this.oscillator && this.webMode === 'osc') {
      // Already have an oscillator running — ramp parameters smoothly
      if (this.oscillator.type !== OSC_TYPE[params.waveform]) {
        // Waveform type can't be ramped — crossfade to a new oscillator
        const oldOsc = this.oscillator;
        const oldOscGain = ctx.createGain();
        oldOscGain.gain.setValueAtTime(1, now);
        oldOsc.disconnect();
        oldOsc.connect(oldOscGain);
        oldOscGain.connect(master);

        const newOsc = ctx.createOscillator();
        newOsc.type = OSC_TYPE[params.waveform];
        newOsc.frequency.setValueAtTime(params.frequency, now);
        newOsc.detune.setValueAtTime(params.detune, now);
        const newOscGain = ctx.createGain();
        newOscGain.gain.setValueAtTime(0, now);
        newOsc.connect(newOscGain);
        newOscGain.connect(master);
        newOsc.start(now);

        // Crossfade
        oldOscGain.gain.linearRampToValueAtTime(0, now + RAMP_TIME);
        newOscGain.gain.linearRampToValueAtTime(1, now + RAMP_TIME);

        // Clean up old oscillator after crossfade
        setTimeout(() => {
          try { oldOsc.stop(); oldOsc.disconnect(); oldOscGain.disconnect(); } catch { /* */ }
        }, RAMP_TIME * 1000 + 20);

        this.oscillator = newOsc;
      } else {
        smoothRamp(this.oscillator.frequency, params.frequency, now);
        smoothRamp(this.oscillator.detune, params.detune, now);
      }
      smoothRamp(master.gain, params.amplitude, now);
    } else {
      // Create fresh oscillator
      master.gain.setValueAtTime(params.amplitude, now);

      this.oscillator = ctx.createOscillator();
      this.oscillator.type = OSC_TYPE[params.waveform];
      this.oscillator.frequency.setValueAtTime(params.frequency, now);
      this.oscillator.detune.setValueAtTime(params.detune, now);
      this.oscillator.connect(master);
      this.oscillator.start(now);
    }

    // Smooth-ramp panner
    if (this.panner) {
      smoothRamp(this.panner.pan, params.pan, now);
    }

    // Harmonic oscillators (2x, 3x, 4x)
    this.updateHarmonics(params, ctx, master, now);

    this.webMode = 'osc';
  }

  /** Create or update harmonic oscillators to match the fundamental. */
  private updateHarmonics(
    params: AudioParams & { mode: 'tone' },
    ctx: AudioContext,
    master: GainNode,
    now: number,
  ): void {
    for (let i = 0; i < 3; i++) {
      const mult = ToneGenerator.HARMONIC_MULTIPLIERS[i];
      const targetGain = params.harmonics[i];
      const freq = params.frequency * mult;

      if (this.harmonicOscs[i]) {
        // Update existing harmonic oscillator
        smoothRamp(this.harmonicOscs[i]!.frequency, freq, now);
        smoothRamp(this.harmonicOscs[i]!.detune, params.detune, now);
        smoothRamp(this.harmonicGains[i]!.gain, targetGain, now);

        // Match waveform type
        if (this.harmonicOscs[i]!.type !== OSC_TYPE[params.waveform]) {
          this.harmonicOscs[i]!.type = OSC_TYPE[params.waveform];
        }
      } else {
        // Create new harmonic oscillator
        const osc = ctx.createOscillator();
        osc.type = OSC_TYPE[params.waveform];
        osc.frequency.setValueAtTime(freq, now);
        osc.detune.setValueAtTime(params.detune, now);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(targetGain, now);

        osc.connect(gain);
        gain.connect(master);
        osc.start(now);

        this.harmonicOscs[i] = osc;
        this.harmonicGains[i] = gain;
      }
    }
  }

  /** Tear down all harmonic oscillators. */
  private teardownHarmonics(): void {
    for (let i = 0; i < 3; i++) {
      if (this.harmonicOscs[i]) {
        try { this.harmonicOscs[i]!.stop(); this.harmonicOscs[i]!.disconnect(); } catch { /* */ }
        this.harmonicOscs[i] = null;
      }
      if (this.harmonicGains[i]) {
        try { this.harmonicGains[i]!.disconnect(); } catch { /* */ }
        this.harmonicGains[i] = null;
      }
    }
  }

  /** Noise mode: looped AudioBuffer with crossfade on switch. */
  private async playWebNoise(params: AudioParams & { mode: 'noise' }): Promise<void> {
    const ctx = this.getAudioContext();
    const master = this.ensureMasterGain();
    const now = ctx.currentTime;

    // If switching from tone → noise, fade out oscillator first
    if (this.webMode === 'osc') {
      this.fadeOutOsc(now);
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

    smoothRamp(master.gain, params.amplitude, now);
    if (this.panner) {
      smoothRamp(this.panner.pan, params.pan, now);
    }
    this.noiseSource = newSource;
    this.noiseGain = newGain;
    this.webMode = 'buf';
  }

  private teardownOsc(): void {
    if (this.oscillator) {
      try { this.oscillator.stop(); this.oscillator.disconnect(); } catch { /* */ }
      this.oscillator = null;
    }
    this.teardownHarmonics();
  }

  /** Fade out the current oscillator and harmonics over RAMP_TIME and tear down after. */
  private fadeOutOsc(now: number): void {
    const osc = this.oscillator;
    if (!osc || !this.masterGain) {
      this.teardownOsc();
      return;
    }
    // Route through a temporary gain to fade without affecting master
    const ctx = this.getAudioContext();
    const fadeGain = ctx.createGain();
    fadeGain.gain.setValueAtTime(1, now);
    fadeGain.gain.linearRampToValueAtTime(0, now + RAMP_TIME);
    osc.disconnect();
    osc.connect(fadeGain);
    fadeGain.connect(this.masterGain);
    this.oscillator = null;

    // Fade out harmonics too
    for (let i = 0; i < 3; i++) {
      if (this.harmonicGains[i]) {
        smoothRamp(this.harmonicGains[i]!.gain, 0, now);
      }
    }
    const hOscs = [...this.harmonicOscs];
    const hGains = [...this.harmonicGains];
    this.harmonicOscs = [null, null, null];
    this.harmonicGains = [null, null, null];

    setTimeout(() => {
      try { osc.stop(); osc.disconnect(); fadeGain.disconnect(); } catch { /* */ }
      for (let i = 0; i < 3; i++) {
        try { hOscs[i]?.stop(); hOscs[i]?.disconnect(); hGains[i]?.disconnect(); } catch { /* */ }
      }
    }, RAMP_TIME * 1000 + 20);
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

  /** Fade out the current noise buffer over RAMP_TIME and tear down after. */
  private fadeOutNoiseBuf(now: number): void {
    const src = this.noiseSource;
    const gain = this.noiseGain;
    if (!src || !gain) {
      this.teardownNoiseBuf();
      return;
    }
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + RAMP_TIME);
    this.noiseSource = null;
    this.noiseGain = null;
    setTimeout(() => {
      try { src.stop(); src.disconnect(); gain.disconnect(); } catch { /* */ }
    }, RAMP_TIME * 1000 + 20);
  }

  private async stopWeb(): Promise<void> {
    if (this.masterGain && this.audioCtx) {
      const now = this.audioCtx.currentTime;
      smoothRamp(this.masterGain.gain, 0, now, 0.06);
      await new Promise((r) => setTimeout(r, 80));
    }
    this.teardownOsc();
    this.teardownNoiseBuf();
    if (this.masterGain) {
      try { this.masterGain.disconnect(); } catch { /* */ }
      this.masterGain = null;
    }
    if (this.panner) {
      try { this.panner.disconnect(); } catch { /* */ }
      this.panner = null;
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
  if (Math.abs(a.pan - b.pan) >= 0.005) return false;
  if (a.mode === 'tone' && b.mode === 'tone') {
    return a.frequency === b.frequency && a.waveform === b.waveform && a.detune === b.detune
      && a.harmonics[0] === b.harmonics[0] && a.harmonics[1] === b.harmonics[1] && a.harmonics[2] === b.harmonics[2];
  }
  if (a.mode === 'noise' && b.mode === 'noise') {
    return a.noiseType === b.noiseType;
  }
  return false;
}
