import { Platform } from 'react-native';
import { AudioParams } from './types';
import { generateSamples } from './generateSamples';
import { generateNoiseSamples } from './generateNoiseSamples';
import { encodeWavBase64 } from './encodeWav';

/**
 * Manages tone/noise generation and playback.
 *
 * On web: uses Web Audio API with AudioBuffer for proper looped playback.
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

    // Stop previous source
    this.stopWebSource();

    // Create gain node for volume control
    if (!this.gainNode) {
      this.gainNode = ctx.createGain();
      this.gainNode.connect(ctx.destination);
    }
    this.gainNode.gain.value = params.amplitude;

    // Create and start new source
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(this.gainNode);
    source.start();
    this.sourceNode = source;
  }

  private stopWebSource(): void {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      } catch { /* already stopped */ }
      this.sourceNode = null;
    }
  }

  private async stopWeb(): Promise<void> {
    // Fade out quickly to avoid click
    if (this.gainNode && this.audioCtx) {
      this.gainNode.gain.setTargetAtTime(0, this.audioCtx.currentTime, 0.02);
      await new Promise((r) => setTimeout(r, 50));
    }
    this.stopWebSource();
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
