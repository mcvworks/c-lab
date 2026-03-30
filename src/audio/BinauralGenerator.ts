import { Platform } from 'react-native';
import { generateBinauralSamples } from './generateBinauralSamples';
import { encodeWavStereoBase64 } from './encodeWavStereo';

/** Cancel any scheduled automation, anchor at the current value, then ramp. */
function smoothRamp(param: AudioParam, target: number, now: number, duration = 0.03): void {
  param.cancelScheduledValues(now);
  param.setValueAtTime(param.value, now);
  param.linearRampToValueAtTime(target, now + duration);
}

export type CarrierWaveform = 'sine' | 'triangle' | 'square';
export type EntrainmentMode = 'binaural' | 'isochronal';

export interface BinauralParams {
  leftFreq: number;
  rightFreq: number;
  amplitude: number;
  carrierWaveform?: CarrierWaveform;
  /** 0 = mono (no binaural separation), 1 = full stereo separation (default) */
  stereoWidth?: number;
  entrainmentMode?: EntrainmentMode;
}

/**
 * Generates and plays stereo binaural beat audio.
 *
 * On web: two OscillatorNodes merged into a stereo output via
 * ChannelMergerNode. Frequency and volume changes are applied with
 * short exponential ramps — no buffer regeneration, no clicks.
 *
 * On native: expo-av with stereo WAV temp files.
 */
export class BinauralGenerator {
  private currentParams: BinauralParams | null = null;
  private playing = false;

  // Web Audio API state (oscillator-based for click-free updates)
  private audioCtx: AudioContext | null = null;
  private leftOsc: OscillatorNode | null = null;
  private rightOsc: OscillatorNode | null = null;
  private leftGain: GainNode | null = null;
  private rightGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private merger: ChannelMergerNode | null = null;
  // Stereo width crossfade gains
  private leftToRight: GainNode | null = null;
  private rightToLeft: GainNode | null = null;
  // Isochronal mode nodes
  private isoOsc: OscillatorNode | null = null;
  private pulseGain: GainNode | null = null;
  private lfoOsc: OscillatorNode | null = null;
  private lfoGain: GainNode | null = null;
  private lfoOffset: ConstantSourceNode | null = null;
  private currentMode: EntrainmentMode = 'binaural';

  // Native state
  private nativeSound: any = null;
  private tempFile: any = null;

  async play(params: BinauralParams): Promise<void> {
    if (Platform.OS === 'web') {
      await this.playWeb(params);
    } else {
      await this.playNative(params);
    }
    this.currentParams = { ...params };
    this.playing = true;
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

  async updateParams(params: BinauralParams): Promise<void> {
    if (!this.playing) return;
    if (this.currentParams && paramsEqual(this.currentParams, params)) return;

    if (Platform.OS === 'web') {
      this.updateWebParams(params);
    } else {
      // Native must regenerate the WAV buffer
      await this.playNative(params);
    }
    this.currentParams = { ...params };
  }

  isPlaying(): boolean {
    return this.playing;
  }

  /** Gradually fade master gain to 0 over the given duration (seconds). */
  fadeOut(durationSec: number): void {
    if (Platform.OS === 'web' && this.masterGain && this.audioCtx) {
      const now = this.audioCtx.currentTime;
      smoothRamp(this.masterGain.gain, 0, now, durationSec);
    }
  }

  async dispose(): Promise<void> {
    await this.stop();
    if (this.audioCtx) {
      await this.audioCtx.close();
      this.audioCtx = null;
    }
  }

  // ── Web Audio API (OscillatorNode-based) ───────────────────────

  private getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      this.audioCtx = new AudioContext();
    }
    return this.audioCtx;
  }

  private async playWeb(params: BinauralParams): Promise<void> {
    const ctx = this.getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    // Tear down any existing oscillator graph
    this.teardownWebGraph();

    const now = ctx.currentTime;
    const mode = params.entrainmentMode ?? 'binaural';
    this.currentMode = mode;
    const waveform = params.carrierWaveform ?? 'sine';
    const oscType = waveform === 'square' ? 'square' : waveform;

    // Master gain for overall volume and fade-out
    this.masterGain = ctx.createGain();
    this.masterGain.gain.setValueAtTime(params.amplitude, now);
    this.masterGain.connect(ctx.destination);

    if (mode === 'isochronal') {
      // Isochronal: single mono tone pulsed on/off at beat frequency
      // Graph: isoOsc → pulseGain → masterGain → destination
      // pulseGain.gain is modulated by: lfoOsc(square @ beatFreq) → lfoGain(0.5) + lfoOffset(0.5)
      // This maps the square wave from [-1,1] to [0,1]

      this.isoOsc = ctx.createOscillator();
      this.isoOsc.type = oscType;
      this.isoOsc.frequency.setValueAtTime(params.leftFreq, now);

      this.pulseGain = ctx.createGain();
      this.pulseGain.gain.setValueAtTime(0, now); // controlled by LFO

      this.isoOsc.connect(this.pulseGain);
      this.pulseGain.connect(this.masterGain);

      // LFO: square wave at beat frequency, scaled to [0, 1]
      // Square wave output [-1, 1] × lfoGain(0.5) = [-0.5, 0.5]
      // Plus constant offset 0.5 = [0, 1]
      this.lfoOsc = ctx.createOscillator();
      this.lfoOsc.type = 'sine'; // use sine for smooth pulse envelope
      this.lfoOsc.frequency.setValueAtTime(params.rightFreq - params.leftFreq, now);

      this.lfoGain = ctx.createGain();
      this.lfoGain.gain.setValueAtTime(0.5, now);

      this.lfoOffset = ctx.createConstantSource();
      this.lfoOffset.offset.setValueAtTime(0.5, now);

      // Connect LFO chain to pulseGain's gain param
      this.lfoOsc.connect(this.lfoGain);
      this.lfoGain.connect(this.pulseGain.gain);
      this.lfoOffset.connect(this.pulseGain.gain);

      this.isoOsc.start(now);
      this.lfoOsc.start(now);
      this.lfoOffset.start(now);
    } else {
      // Binaural: stereo L/R with separate frequencies
      const width = params.stereoWidth ?? 1;
      const crossGain = 1 - width;

      this.merger = ctx.createChannelMerger(2);
      this.merger.connect(this.masterGain);

      // Left oscillator → left channel (direct) + right channel (cross)
      this.leftOsc = ctx.createOscillator();
      this.leftOsc.type = oscType;
      this.leftOsc.frequency.setValueAtTime(params.leftFreq, now);
      this.leftGain = ctx.createGain();
      this.leftGain.gain.setValueAtTime(1.0, now);
      this.leftOsc.connect(this.leftGain);
      this.leftGain.connect(this.merger, 0, 0);

      this.leftToRight = ctx.createGain();
      this.leftToRight.gain.setValueAtTime(crossGain, now);
      this.leftOsc.connect(this.leftToRight);
      this.leftToRight.connect(this.merger, 0, 1);

      // Right oscillator → right channel (direct) + left channel (cross)
      this.rightOsc = ctx.createOscillator();
      this.rightOsc.type = oscType;
      this.rightOsc.frequency.setValueAtTime(params.rightFreq, now);
      this.rightGain = ctx.createGain();
      this.rightGain.gain.setValueAtTime(1.0, now);
      this.rightOsc.connect(this.rightGain);
      this.rightGain.connect(this.merger, 0, 1);

      this.rightToLeft = ctx.createGain();
      this.rightToLeft.gain.setValueAtTime(crossGain, now);
      this.rightOsc.connect(this.rightToLeft);
      this.rightToLeft.connect(this.merger, 0, 0);

      this.leftOsc.start(now);
      this.rightOsc.start(now);
    }
  }

  private updateWebParams(params: BinauralParams): void {
    if (!this.audioCtx || !this.masterGain) return;

    const newMode = params.entrainmentMode ?? 'binaural';
    // If mode changed, rebuild the graph
    if (newMode !== this.currentMode) {
      this.playWeb(params);
      return;
    }

    const now = this.audioCtx.currentTime;
    const rampTime = 0.03; // 30ms ramp prevents clicks

    smoothRamp(this.masterGain.gain, params.amplitude, now, rampTime);

    const waveform = params.carrierWaveform ?? 'sine';
    const oscType = waveform === 'square' ? 'square' : waveform;

    if (this.currentMode === 'isochronal') {
      if (this.isoOsc) {
        smoothRamp(this.isoOsc.frequency, params.leftFreq, now, rampTime);
        if (this.isoOsc.type !== oscType) this.isoOsc.type = oscType;
      }
      if (this.lfoOsc) {
        const beatFreq = Math.abs(params.rightFreq - params.leftFreq);
        smoothRamp(this.lfoOsc.frequency, beatFreq, now, rampTime);
      }
    } else {
      if (this.leftOsc && this.rightOsc) {
        smoothRamp(this.leftOsc.frequency, params.leftFreq, now, rampTime);
        smoothRamp(this.rightOsc.frequency, params.rightFreq, now, rampTime);
        if (this.leftOsc.type !== oscType) {
          this.leftOsc.type = oscType;
          this.rightOsc.type = oscType;
        }
      }
      const crossGain = 1 - (params.stereoWidth ?? 1);
      if (this.leftToRight) smoothRamp(this.leftToRight.gain, crossGain, now, rampTime);
      if (this.rightToLeft) smoothRamp(this.rightToLeft.gain, crossGain, now, rampTime);
    }
  }

  private teardownWebGraph(): void {
    // Binaural nodes
    if (this.leftOsc) {
      try { this.leftOsc.stop(); this.leftOsc.disconnect(); } catch { /* */ }
      this.leftOsc = null;
    }
    if (this.rightOsc) {
      try { this.rightOsc.stop(); this.rightOsc.disconnect(); } catch { /* */ }
      this.rightOsc = null;
    }
    if (this.leftGain) {
      try { this.leftGain.disconnect(); } catch { /* */ }
      this.leftGain = null;
    }
    if (this.rightGain) {
      try { this.rightGain.disconnect(); } catch { /* */ }
      this.rightGain = null;
    }
    if (this.leftToRight) {
      try { this.leftToRight.disconnect(); } catch { /* */ }
      this.leftToRight = null;
    }
    if (this.rightToLeft) {
      try { this.rightToLeft.disconnect(); } catch { /* */ }
      this.rightToLeft = null;
    }
    // Isochronal nodes
    if (this.isoOsc) {
      try { this.isoOsc.stop(); this.isoOsc.disconnect(); } catch { /* */ }
      this.isoOsc = null;
    }
    if (this.pulseGain) {
      try { this.pulseGain.disconnect(); } catch { /* */ }
      this.pulseGain = null;
    }
    if (this.lfoOsc) {
      try { this.lfoOsc.stop(); this.lfoOsc.disconnect(); } catch { /* */ }
      this.lfoOsc = null;
    }
    if (this.lfoGain) {
      try { this.lfoGain.disconnect(); } catch { /* */ }
      this.lfoGain = null;
    }
    if (this.lfoOffset) {
      try { this.lfoOffset.stop(); this.lfoOffset.disconnect(); } catch { /* */ }
      this.lfoOffset = null;
    }
    // Shared nodes
    if (this.merger) {
      try { this.merger.disconnect(); } catch { /* */ }
      this.merger = null;
    }
    if (this.masterGain) {
      try { this.masterGain.disconnect(); } catch { /* */ }
      this.masterGain = null;
    }
  }

  private async stopWeb(): Promise<void> {
    // Fade out over ~60ms to avoid click
    if (this.masterGain && this.audioCtx) {
      const now = this.audioCtx.currentTime;
      smoothRamp(this.masterGain.gain, 0, now, 0.06);
      await new Promise((r) => setTimeout(r, 80));
    }
    this.teardownWebGraph();
  }

  // ── Native (expo-av) ──────────────────────────────────────────

  private async playNative(params: BinauralParams): Promise<void> {
    const { Audio } = await import('expo-av');
    const { File, Paths } = await import('expo-file-system');

    const { left, right } = generateBinauralSamples(
      params.leftFreq,
      params.rightFreq,
      params.amplitude,
    );

    const base64 = encodeWavStereoBase64(left, right);
    const newTempFile = new File(Paths.cache, `binaural_${Date.now()}.wav`);
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
        { isLooping: true, volume: 1.0, shouldPlay: true },
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

function paramsEqual(a: BinauralParams, b: BinauralParams): boolean {
  return (
    a.leftFreq === b.leftFreq &&
    a.rightFreq === b.rightFreq &&
    Math.abs(a.amplitude - b.amplitude) < 0.005 &&
    (a.carrierWaveform ?? 'sine') === (b.carrierWaveform ?? 'sine') &&
    Math.abs((a.stereoWidth ?? 1) - (b.stereoWidth ?? 1)) < 0.005 &&
    (a.entrainmentMode ?? 'binaural') === (b.entrainmentMode ?? 'binaural')
  );
}
