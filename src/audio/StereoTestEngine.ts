import { Platform } from 'react-native';

export type StereoTestMode = 'left' | 'right' | 'both' | 'phase';

/**
 * Plays test tones through specific stereo channels for headphone verification.
 *
 * - left / right: 440 Hz sine in one ear only
 * - both: 440 Hz in both ears simultaneously
 * - phase: 440 Hz in both ears with right channel inverted (should feel
 *   "hollow" or cancel out in true stereo headphones — sounds normal in mono)
 */
export class StereoTestEngine {
  private audioCtx: AudioContext | null = null;
  private leftOsc: OscillatorNode | null = null;
  private rightOsc: OscillatorNode | null = null;
  private leftGain: GainNode | null = null;
  private rightGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private merger: ChannelMergerNode | null = null;
  private playing = false;
  private currentMode: StereoTestMode | null = null;

  private getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      this.audioCtx = new AudioContext();
    }
    return this.audioCtx;
  }

  async play(mode: StereoTestMode): Promise<void> {
    // Stop any current playback first
    if (this.playing) {
      await this.stop();
    }

    if (Platform.OS === 'web') {
      await this.playWeb(mode);
    }
    // Native: could reuse BinauralGenerator pattern with WAV files
    // For now, web-first implementation
    this.currentMode = mode;
    this.playing = true;
  }

  async stop(): Promise<void> {
    this.playing = false;
    this.currentMode = null;
    if (Platform.OS === 'web') {
      await this.stopWeb();
    }
  }

  isPlaying(): boolean {
    return this.playing;
  }

  getMode(): StereoTestMode | null {
    return this.currentMode;
  }

  async dispose(): Promise<void> {
    await this.stop();
    if (this.audioCtx) {
      await this.audioCtx.close();
      this.audioCtx = null;
    }
  }

  // ── Web Audio ──────────────────────────────────────────────

  private async playWeb(mode: StereoTestMode): Promise<void> {
    const ctx = this.getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    this.teardownWebGraph();

    const now = ctx.currentTime;
    const freq = 440;

    this.merger = ctx.createChannelMerger(2);

    this.masterGain = ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.35, now);
    this.merger.connect(this.masterGain);
    this.masterGain.connect(ctx.destination);

    // Left oscillator
    this.leftOsc = ctx.createOscillator();
    this.leftOsc.type = 'sine';
    this.leftOsc.frequency.setValueAtTime(freq, now);
    this.leftGain = ctx.createGain();
    this.leftOsc.connect(this.leftGain);
    this.leftGain.connect(this.merger, 0, 0);

    // Right oscillator
    this.rightOsc = ctx.createOscillator();
    this.rightOsc.type = 'sine';
    this.rightOsc.frequency.setValueAtTime(freq, now);
    this.rightGain = ctx.createGain();
    this.rightOsc.connect(this.rightGain);
    this.rightGain.connect(this.merger, 0, 1);

    // Set channel gains based on mode
    switch (mode) {
      case 'left':
        this.leftGain.gain.setValueAtTime(1.0, now);
        this.rightGain.gain.setValueAtTime(0.0, now);
        break;
      case 'right':
        this.leftGain.gain.setValueAtTime(0.0, now);
        this.rightGain.gain.setValueAtTime(1.0, now);
        break;
      case 'both':
        this.leftGain.gain.setValueAtTime(1.0, now);
        this.rightGain.gain.setValueAtTime(1.0, now);
        break;
      case 'phase':
        // Inverted right channel — true stereo headphones will perceive this
        // as a hollow / diffuse sound. Mono playback will cancel the signal.
        this.leftGain.gain.setValueAtTime(1.0, now);
        this.rightGain.gain.setValueAtTime(-1.0, now);
        break;
    }

    // Smooth fade-in over 30ms
    this.masterGain.gain.setValueAtTime(0, now);
    this.masterGain.gain.linearRampToValueAtTime(0.35, now + 0.03);

    this.leftOsc.start(now);
    this.rightOsc.start(now);
  }

  private async stopWeb(): Promise<void> {
    if (this.masterGain && this.audioCtx) {
      const now = this.audioCtx.currentTime;
      this.masterGain.gain.linearRampToValueAtTime(0, now + 0.06);
      await new Promise((r) => setTimeout(r, 80));
    }
    this.teardownWebGraph();
  }

  private teardownWebGraph(): void {
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
    if (this.merger) {
      try { this.merger.disconnect(); } catch { /* */ }
      this.merger = null;
    }
    if (this.masterGain) {
      try { this.masterGain.disconnect(); } catch { /* */ }
      this.masterGain = null;
    }
  }
}
