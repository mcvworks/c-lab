import { Platform } from 'react-native';

const RAMP_TIME = 0.03;

function smoothRamp(param: AudioParam, target: number, now: number): void {
  param.cancelScheduledValues(now);
  param.setValueAtTime(param.value, now);
  param.linearRampToValueAtTime(target, now + RAMP_TIME);
}

/**
 * Musical intervals as frequency ratios.
 * Each entry: [name, ratio numerator, ratio denominator].
 */
export const INTERVALS = [
  { name: 'Unison',      ratio: 1 / 1,   semitones: 0  },
  { name: 'Minor 2nd',   ratio: 16 / 15, semitones: 1  },
  { name: 'Major 2nd',   ratio: 9 / 8,   semitones: 2  },
  { name: 'Minor 3rd',   ratio: 6 / 5,   semitones: 3  },
  { name: 'Major 3rd',   ratio: 5 / 4,   semitones: 4  },
  { name: 'Perfect 4th', ratio: 4 / 3,   semitones: 5  },
  { name: 'Tritone',     ratio: 45 / 32, semitones: 6  },
  { name: 'Perfect 5th', ratio: 3 / 2,   semitones: 7  },
  { name: 'Minor 6th',   ratio: 8 / 5,   semitones: 8  },
  { name: 'Major 6th',   ratio: 5 / 3,   semitones: 9  },
  { name: 'Minor 7th',   ratio: 9 / 5,   semitones: 10 },
  { name: 'Major 7th',   ratio: 15 / 8,  semitones: 11 },
  { name: 'Octave',      ratio: 2 / 1,   semitones: 12 },
] as const;

/** Detect the interval name from two frequencies, if they approximate a known ratio */
export function detectInterval(f1: number, f2: number): string | null {
  if (f1 <= 0 || f2 <= 0) return null;
  const ratio = Math.max(f1, f2) / Math.min(f1, f2);

  for (const interval of INTERVALS) {
    // Allow ~15 cent tolerance (≈0.87% frequency difference)
    const tolerance = interval.ratio * 0.009;
    if (Math.abs(ratio - interval.ratio) < tolerance) {
      return interval.name;
    }
  }
  return null;
}

/**
 * Plays two independent sine oscillators for interval / beat frequency exploration.
 * Exposes an analyser node for the combined waveform visualization.
 */
export class IntervalExplorerEngine {
  private audioCtx: AudioContext | null = null;
  private osc1: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  private gain1: GainNode | null = null;
  private gain2: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private active = false;

  private ensureContext(): AudioContext {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /** Start both oscillators at the given frequencies */
  start(freq1: number, freq2: number, volume = 0.35): void {
    if (Platform.OS !== 'web') return;
    if (this.active) return;

    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    this.masterGain = ctx.createGain();
    this.masterGain.gain.setValueAtTime(volume, now);

    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;

    this.masterGain.connect(this.analyser);
    this.analyser.connect(ctx.destination);

    // Oscillator 1
    this.osc1 = ctx.createOscillator();
    this.osc1.type = 'sine';
    this.osc1.frequency.setValueAtTime(freq1, now);
    this.gain1 = ctx.createGain();
    this.gain1.gain.setValueAtTime(0.5, now);
    this.osc1.connect(this.gain1);
    this.gain1.connect(this.masterGain);
    this.osc1.start();

    // Oscillator 2
    this.osc2 = ctx.createOscillator();
    this.osc2.type = 'sine';
    this.osc2.frequency.setValueAtTime(freq2, now);
    this.gain2 = ctx.createGain();
    this.gain2.gain.setValueAtTime(0.5, now);
    this.osc2.connect(this.gain2);
    this.gain2.connect(this.masterGain);
    this.osc2.start();

    this.active = true;
  }

  /** Update frequency of oscillator 1 */
  setFreq1(freq: number): void {
    if (!this.active || !this.audioCtx || !this.osc1) return;
    smoothRamp(this.osc1.frequency, freq, this.audioCtx.currentTime);
  }

  /** Update frequency of oscillator 2 */
  setFreq2(freq: number): void {
    if (!this.active || !this.audioCtx || !this.osc2) return;
    smoothRamp(this.osc2.frequency, freq, this.audioCtx.currentTime);
  }

  /** Set master volume (0–1) */
  setVolume(v: number): void {
    if (!this.active || !this.audioCtx || !this.masterGain) return;
    smoothRamp(this.masterGain.gain, v, this.audioCtx.currentTime);
  }

  /** Get the analyser node for visualization */
  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  /** Stop both oscillators */
  stop(): void {
    if (!this.active) return;

    const ctx = this.audioCtx;
    const now = ctx?.currentTime ?? 0;

    // Fade out to avoid click
    if (this.masterGain && ctx) {
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.linearRampToValueAtTime(0, now + 0.05);
    }

    setTimeout(() => {
      try { this.osc1?.stop(); } catch (_) {}
      try { this.osc2?.stop(); } catch (_) {}
      this.osc1?.disconnect();
      this.osc2?.disconnect();
      this.gain1?.disconnect();
      this.gain2?.disconnect();
      this.analyser?.disconnect();
      this.masterGain?.disconnect();

      this.osc1 = null;
      this.osc2 = null;
      this.gain1 = null;
      this.gain2 = null;
      this.analyser = null;
      this.masterGain = null;
      this.active = false;
    }, 80);
  }

  isActive(): boolean {
    return this.active;
  }

  dispose(): void {
    this.stop();
    setTimeout(() => {
      if (this.audioCtx) {
        this.audioCtx.close();
        this.audioCtx = null;
      }
    }, 100);
  }
}
