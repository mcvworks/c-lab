import { Platform } from 'react-native';

/** Standard string tunings — two octaves of the chromatic scale from C3 to B4 */
const STRING_NOTES = [
  { note: 'C3',  freq: 130.81 },
  { note: 'E3',  freq: 164.81 },
  { note: 'G3',  freq: 196.00 },
  { note: 'A3',  freq: 220.00 },
  { note: 'C4',  freq: 261.63 },
  { note: 'D4',  freq: 293.66 },
  { note: 'E4',  freq: 329.63 },
  { note: 'F4',  freq: 349.23 },
  { note: 'G4',  freq: 392.00 },
  { note: 'A4',  freq: 440.00 },
  { note: 'B4',  freq: 493.88 },
  { note: 'C5',  freq: 523.25 },
] as const;

export interface StringState {
  note: string;
  freq: number;
  resonance: number; // 0–1 resonance intensity
}

// Ramp time for smooth transitions
const RAMP_TIME = 0.05;

function smoothRamp(param: AudioParam, target: number, now: number): void {
  param.cancelScheduledValues(now);
  param.setValueAtTime(param.value, now);
  param.linearRampToValueAtTime(target, now + RAMP_TIME);
}

/**
 * Compute resonance intensity between a played frequency (and its harmonics)
 * and a string's resonant frequency. Returns 0–1.
 *
 * Resonance is based on how close the played frequency (or any of its first
 * 6 harmonics) is to the string frequency, using a Gaussian-like falloff.
 */
function computeResonance(playedFreq: number, stringFreq: number): number {
  // Check fundamental and first 6 harmonics of the played tone
  let maxResonance = 0;
  for (let h = 1; h <= 6; h++) {
    const harmonic = playedFreq * h;
    // How many semitones apart?
    const semitoneDist = Math.abs(12 * Math.log2(harmonic / stringFreq));
    // Gaussian falloff — tight resonance within ~1 semitone
    const r = Math.exp(-(semitoneDist * semitoneDist) / 0.5);
    if (r > maxResonance) maxResonance = r;
  }
  return maxResonance;
}

/**
 * Manages sympathetic string resonance audio.
 * Creates one sine oscillator per string, with gain controlled by resonance.
 */
export class SympatheticStringsEngine {
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private oscillators: OscillatorNode[] = [];
  private gains: GainNode[] = [];
  private active = false;
  private volume = 0.15; // subtle by default

  /** Current resonance state for each string (for visualization) */
  private resonanceState: number[] = STRING_NOTES.map(() => 0);

  getStrings(): typeof STRING_NOTES {
    return STRING_NOTES;
  }

  getResonanceState(): number[] {
    return [...this.resonanceState];
  }

  private ensureContext(): AudioContext {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /** Start all string oscillators (silent — gain starts at 0) */
  start(): void {
    if (Platform.OS !== 'web') return; // web-only for now
    if (this.active) return;

    const ctx = this.ensureContext();
    this.masterGain = ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.volume, ctx.currentTime);
    this.masterGain.connect(ctx.destination);

    this.oscillators = [];
    this.gains = [];

    for (const s of STRING_NOTES) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(s.freq, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();

      this.oscillators.push(osc);
      this.gains.push(gain);
    }

    this.active = true;
  }

  /** Stop all oscillators and clean up */
  stop(): void {
    if (!this.active) return;

    for (const osc of this.oscillators) {
      try { osc.stop(); } catch (_) { /* already stopped */ }
      osc.disconnect();
    }
    for (const g of this.gains) {
      g.disconnect();
    }
    this.masterGain?.disconnect();

    this.oscillators = [];
    this.gains = [];
    this.masterGain = null;
    this.active = false;
    this.resonanceState = STRING_NOTES.map(() => 0);
  }

  /** Update resonance based on the currently played frequency */
  updateFrequency(playedFreq: number): void {
    if (!this.active || !this.audioCtx) return;

    const now = this.audioCtx.currentTime;

    for (let i = 0; i < STRING_NOTES.length; i++) {
      const resonance = computeResonance(playedFreq, STRING_NOTES[i].freq);
      this.resonanceState[i] = resonance;

      // Scale gain: resonance^2 for a more natural falloff
      const targetGain = resonance * resonance;
      if (this.gains[i]) {
        smoothRamp(this.gains[i].gain, targetGain, now);
      }
    }
  }

  /** Set master volume (0–1) */
  setVolume(v: number): void {
    this.volume = v;
    if (this.active && this.masterGain && this.audioCtx) {
      smoothRamp(this.masterGain.gain, v, this.audioCtx.currentTime);
    }
  }

  /** Silence all strings (e.g., when noise mode or stopped) */
  silence(): void {
    if (!this.active || !this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    for (let i = 0; i < this.gains.length; i++) {
      smoothRamp(this.gains[i].gain, 0, now);
      this.resonanceState[i] = 0;
    }
  }

  isActive(): boolean {
    return this.active;
  }

  dispose(): void {
    this.stop();
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
  }
}
