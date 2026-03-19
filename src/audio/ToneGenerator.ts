import { Audio } from 'expo-av';
import { File, Paths } from 'expo-file-system';

import { ToneParams } from './types';
import { generateSamples } from './generateSamples';
import { encodeWavBase64 } from './encodeWav';

/**
 * Manages tone generation and playback via expo-av.
 *
 * Workflow:
 * 1. Generate PCM samples for the requested waveform/frequency/amplitude
 * 2. Encode as WAV, write to a temp file
 * 3. Load into expo-av Sound and play looped
 *
 * On parameter changes while playing, generates a new buffer and swaps
 * playback to avoid clicks. Architecture is extensible for later composer work.
 */
export class ToneGenerator {
  private sound: Audio.Sound | null = null;
  private currentParams: ToneParams | null = null;
  private playing = false;
  private tempFile: File | null = null;

  /** Start playing a tone with the given parameters. */
  async play(params: ToneParams): Promise<void> {
    await this.loadAndPlay(params);
  }

  /** Stop playback and release resources. */
  async stop(): Promise<void> {
    this.playing = false;
    if (this.sound) {
      try {
        // Fade out by setting volume to 0 before stopping
        await this.sound.setVolumeAsync(0);
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
      } catch {
        // Sound may already be unloaded
      }
      this.sound = null;
    }
    this.currentParams = null;
    this.cleanupTempFile();
  }

  /** Update parameters while playing. No-op if not currently playing. */
  async updateParams(params: ToneParams): Promise<void> {
    if (!this.playing) return;

    // Skip if params haven't meaningfully changed
    if (this.currentParams && paramsEqual(this.currentParams, params)) return;

    await this.loadAndPlay(params);
  }

  /** Whether the generator is currently playing. */
  isPlaying(): boolean {
    return this.playing;
  }

  /** Release all resources. Call when unmounting. */
  async dispose(): Promise<void> {
    await this.stop();
  }

  private async loadAndPlay(params: ToneParams): Promise<void> {
    // Generate audio data
    const samples = generateSamples(params.frequency, params.amplitude, params.waveform);
    const base64 = encodeWavBase64(samples);

    // Write to temp file (expo-av needs a file URI)
    const newTempFile = new File(Paths.cache, `tone_${Date.now()}.wav`);
    newTempFile.write(base64, { encoding: 'base64' });

    // Unload previous sound
    const prevSound = this.sound;
    const prevTempFile = this.tempFile;

    try {
      // Configure audio mode for playback
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      // Load new sound
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: newTempFile.uri },
        {
          isLooping: true,
          volume: params.amplitude,
          shouldPlay: true,
        },
      );

      this.sound = newSound;
      this.tempFile = newTempFile;
      this.currentParams = { ...params };
      this.playing = true;

      // Clean up previous sound after new one starts
      if (prevSound) {
        try {
          await prevSound.setVolumeAsync(0);
          await prevSound.stopAsync();
          await prevSound.unloadAsync();
        } catch {
          // Ignore cleanup errors
        }
      }
      if (prevTempFile) {
        try { prevTempFile.delete(); } catch { /* ignore */ }
      }
    } catch (error) {
      // Clean up on failure
      try { newTempFile.delete(); } catch { /* ignore */ }
      throw error;
    }
  }

  private cleanupTempFile(): void {
    if (this.tempFile) {
      try {
        this.tempFile.delete();
      } catch {
        // Ignore
      }
      this.tempFile = null;
    }
  }
}

function paramsEqual(a: ToneParams, b: ToneParams): boolean {
  return (
    a.frequency === b.frequency &&
    a.waveform === b.waveform &&
    Math.abs(a.amplitude - b.amplitude) < 0.005
  );
}
