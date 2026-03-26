import { Platform } from 'react-native';
import { AudioParams } from './types';
import { generateSamples } from './generateSamples';
import { generateNoiseSamples } from './generateNoiseSamples';
import { encodeWavBase64 } from './encodeWav';

// Duration of crossfade between old and new buffer sources (seconds)
const XFADE_TIME = 0.04;

/**
 * Manages tone/noise generation and playback.
 *
 * On web: uses Web Audio API with AudioBuffer. Parameter changes crossfade
 * between old and new buffer sources to prevent clicks/pops.
 * On native: uses expo-av with temp WAV files.
 */
export class ToneGenerator {
  private currentParams: AudioParams | null = null;
  private playing = false;

  // Web Audio API state
  private audioCtx: AudioContext | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;

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

  private async playWeb(params: AudioParams): Promise<void> {
    const ctx = this.getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const samples = params.mode === 'noise'
      ? generateNoiseSamples(params.amplitude, params.noiseType)
      : generateSamples(
          (params as any).frequency,
          params.amplitude,
          (params as any).waveform,
        );

    // Create AudioBuffer from samples
    const buffer = ctx.createBuffer(1, samples.length, 44100);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) {
      channelData[i] = samples[i];
    }

    const now = ctx.currentTime;
    const oldSource = this.sourceNode;
    const oldGain = this.gainNode;

    // Create new gain node for this source
    const newGain = ctx.createGain();
    newGain.connect(ctx.destination);

    // Create and start new source
    const newSource = ctx.createBufferSource();
    newSource.buffer = buffer;
    newSource.loop = true;
    newSource.connect(newGain);

    if (oldSource && oldGain) {
      // Crossfade: ramp old down, ramp new up
      newGain.gain.setValueAtTime(0, now);
      newGain.gain.linearRampToValueAtTime(params.amplitude, now + XFADE_TIME);
      newSource.start(now);

      oldGain.gain.linearRampToValueAtTime(0, now + XFADE_TIME);
      // Schedule cleanup of old source after crossfade completes
      setTimeout(() => {
        try {
          oldSource.stop();
          oldSource.disconnect();
          oldGain.disconnect();
        } catch { /* already stopped */ }
      }, XFADE_TIME * 1000 + 20);
    } else {
      // First play — no crossfade needed, just start cleanly
      newGain.gain.setValueAtTime(params.amplitude, now);
      newSource.start(now);
    }

    this.sourceNode = newSource;
    this.gainNode = newGain;
  }

  private async stopWeb(): Promise<void> {
    // Fade out quickly to avoid click
    if (this.gainNode && this.audioCtx) {
      const now = this.audioCtx.currentTime;
      this.gainNode.gain.linearRampToValueAtTime(0, now + 0.06);
      await new Promise((r) => setTimeout(r, 80));
    }
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      } catch { /* already stopped */ }
      this.sourceNode = null;
    }
    if (this.gainNode) {
      try { this.gainNode.disconnect(); } catch { /* */ }
      this.gainNode = null;
    }
  }

  // ── Native (expo-av) ──────────────────────────────────────────

  private async playNative(params: AudioParams): Promise<void> {
    // Dynamic imports to avoid web bundling issues
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
