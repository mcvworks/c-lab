import { Platform } from 'react-native';
import { generateBinauralSamples } from './generateBinauralSamples';
import { encodeWavStereoBase64 } from './encodeWavStereo';

export interface BinauralParams {
  leftFreq: number;
  rightFreq: number;
  amplitude: number;
}

/**
 * Generates and plays stereo binaural beat audio.
 *
 * On web: Web Audio API with a stereo AudioBuffer.
 * On native: expo-av with stereo WAV temp files.
 *
 * Separate from ToneGenerator because binaural beats require
 * independent left/right channel frequencies.
 */
export class BinauralGenerator {
  private currentParams: BinauralParams | null = null;
  private playing = false;

  // Web Audio API state
  private audioCtx: AudioContext | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;

  // Native state
  private nativeSound: any = null;
  private tempFile: any = null;

  async play(params: BinauralParams): Promise<void> {
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

  async updateParams(params: BinauralParams): Promise<void> {
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

  private async loadAndPlay(params: BinauralParams): Promise<void> {
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

  private async playWeb(params: BinauralParams): Promise<void> {
    const ctx = this.getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const { left, right } = generateBinauralSamples(
      params.leftFreq,
      params.rightFreq,
      1.0, // amplitude applied via gain node
    );

    // Create stereo AudioBuffer
    const buffer = ctx.createBuffer(2, left.length, 44100);
    const leftChannel = buffer.getChannelData(0);
    const rightChannel = buffer.getChannelData(1);
    for (let i = 0; i < left.length; i++) {
      leftChannel[i] = left[i];
      rightChannel[i] = right[i];
    }

    // Stop previous source
    this.stopWebSource();

    // Create gain node for volume control
    if (!this.gainNode) {
      this.gainNode = ctx.createGain();
      this.gainNode.connect(ctx.destination);
    }
    this.gainNode.gain.setValueAtTime(params.amplitude, ctx.currentTime);

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
    Math.abs(a.amplitude - b.amplitude) < 0.005
  );
}
