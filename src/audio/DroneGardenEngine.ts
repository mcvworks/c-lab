import { Platform } from 'react-native';

/**
 * DroneGardenEngine — manages multiple simultaneous sine-like oscillators,
 * each with independent frequency, pan, and gain.
 * Web Audio API only (the primary target).
 */

export interface Seed {
  id: string;
  frequency: number;
  pan: number;       // -1 to 1
  amplitude: number; // 0 to 1
  waveform: OscillatorType;
}

interface LiveSeed {
  id: string;
  osc: OscillatorNode;
  gain: GainNode;
  panner: StereoPannerNode;
}

const FADE_TIME = 0.4;
const MAX_SEEDS = 10;

// Gentle waveforms for drone sounds
const GENTLE_WAVEFORMS: OscillatorType[] = ['sine', 'triangle'];

export class DroneGardenEngine {
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private seeds: Map<string, LiveSeed> = new Map();

  private getCtx(): AudioContext {
    if (!this.audioCtx) {
      this.audioCtx = new AudioContext();
    }
    return this.audioCtx;
  }

  private ensureMaster(): GainNode {
    const ctx = this.getCtx();
    if (!this.masterGain) {
      this.masterGain = ctx.createGain();
      this.masterGain.gain.value = 0.6;
      this.masterGain.connect(ctx.destination);
    }
    return this.masterGain;
  }

  get seedCount(): number {
    return this.seeds.size;
  }

  get maxSeeds(): number {
    return MAX_SEEDS;
  }

  /** Pick a random gentle waveform */
  static randomWaveform(): OscillatorType {
    return GENTLE_WAVEFORMS[Math.floor(Math.random() * GENTLE_WAVEFORMS.length)];
  }

  /** Add a new seed with fade-in. Returns false if at max capacity. */
  async addSeed(seed: Seed): Promise<boolean> {
    if (Platform.OS !== 'web') return false;
    if (this.seeds.size >= MAX_SEEDS) return false;
    if (this.seeds.has(seed.id)) return false;

    const ctx = this.getCtx();
    if (ctx.state === 'suspended') await ctx.resume();
    const master = this.ensureMaster();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = seed.waveform;
    osc.frequency.setValueAtTime(seed.frequency, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(seed.amplitude, now + FADE_TIME);

    const panner = ctx.createStereoPanner();
    panner.pan.setValueAtTime(seed.pan, now);

    osc.connect(gain);
    gain.connect(panner);
    panner.connect(master);
    osc.start(now);

    this.seeds.set(seed.id, { id: seed.id, osc, gain, panner });
    return true;
  }

  /** Update a seed's frequency and pan smoothly */
  updateSeed(id: string, frequency: number, pan: number): void {
    const live = this.seeds.get(id);
    if (!live) return;
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    live.osc.frequency.cancelScheduledValues(now);
    live.osc.frequency.setValueAtTime(live.osc.frequency.value, now);
    live.osc.frequency.linearRampToValueAtTime(frequency, now + 0.05);
    live.panner.pan.cancelScheduledValues(now);
    live.panner.pan.setValueAtTime(live.panner.pan.value, now);
    live.panner.pan.linearRampToValueAtTime(pan, now + 0.05);
  }

  /** Remove a seed with fade-out */
  removeSeed(id: string): void {
    const live = this.seeds.get(id);
    if (!live) return;
    const ctx = this.getCtx();
    const now = ctx.currentTime;

    live.gain.gain.cancelScheduledValues(now);
    live.gain.gain.setValueAtTime(live.gain.gain.value, now);
    live.gain.gain.linearRampToValueAtTime(0, now + FADE_TIME);

    this.seeds.delete(id);

    setTimeout(() => {
      try {
        live.osc.stop();
        live.osc.disconnect();
        live.gain.disconnect();
        live.panner.disconnect();
      } catch { /* already cleaned up */ }
    }, FADE_TIME * 1000 + 50);
  }

  /** Set master volume (0–1) */
  setMasterVolume(v: number): void {
    if (!this.masterGain) return;
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(v, now + 0.05);
  }

  /** Remove all seeds and clean up */
  dispose(): void {
    for (const [id] of this.seeds) {
      this.removeSeed(id);
    }
    // Delay full cleanup until fade-outs finish
    setTimeout(() => {
      try {
        this.masterGain?.disconnect();
        this.audioCtx?.close();
      } catch { /* */ }
      this.masterGain = null;
      this.audioCtx = null;
    }, FADE_TIME * 1000 + 100);
  }
}
