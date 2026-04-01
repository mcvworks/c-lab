import { Platform } from 'react-native';

const RAMP_TIME = 0.03;

function smoothRamp(param: AudioParam, target: number, now: number): void {
  param.cancelScheduledValues(now);
  param.setValueAtTime(param.value, now);
  param.linearRampToValueAtTime(target, now + RAMP_TIME);
}

export type BlendWaveform = 'sine' | 'square' | 'sawtooth' | 'triangle';

export interface BlendVoice {
  frequency: number;
  waveform: BlendWaveform;
  volume: number;   // 0–1
  muted: boolean;
  solo: boolean;
}

const OSC_TYPE_MAP: Record<string, OscillatorType> = {
  sine: 'sine',
  square: 'square',
  sawtooth: 'sawtooth',
  triangle: 'triangle',
};

export const BLEND_WAVEFORMS: BlendWaveform[] = ['sine', 'square', 'sawtooth', 'triangle'];

export const BLEND_WAVEFORM_LABELS: Record<BlendWaveform, string> = {
  sine: 'Sin',
  square: 'Sq',
  sawtooth: 'Saw',
  triangle: 'Tri',
};

export interface BlendPreset {
  label: string;
  voices: Pick<BlendVoice, 'frequency' | 'waveform' | 'volume'>[];
}

export const BLEND_PRESETS: BlendPreset[] = [
  {
    label: 'Organ',
    voices: [
      { frequency: 220, waveform: 'sine', volume: 0.6 },
      { frequency: 440, waveform: 'sine', volume: 0.4 },
      { frequency: 660, waveform: 'sine', volume: 0.25 },
    ],
  },
  {
    label: 'Bell',
    voices: [
      { frequency: 340, waveform: 'sine', volume: 0.5 },
      { frequency: 540, waveform: 'sine', volume: 0.35 },
      { frequency: 890, waveform: 'sine', volume: 0.2 },
    ],
  },
  {
    label: 'Chord',
    voices: [
      { frequency: 261.63, waveform: 'sine', volume: 0.5 },  // C4
      { frequency: 329.63, waveform: 'sine', volume: 0.45 },  // E4 (major third)
      { frequency: 392,    waveform: 'sine', volume: 0.45 },  // G4 (fifth)
    ],
  },
  {
    label: 'Dissonance',
    voices: [
      { frequency: 440, waveform: 'sine', volume: 0.5 },
      { frequency: 445, waveform: 'sine', volume: 0.5 },
      { frequency: 450, waveform: 'sine', volume: 0.35 },
    ],
  },
];

/**
 * Plays up to 3 independent oscillator voices and mixes them.
 * Exposes per-voice analysers and a composite analyser for visualization.
 */
export class ToneBlendingEngine {
  private audioCtx: AudioContext | null = null;
  private oscs: (OscillatorNode | null)[] = [null, null, null];
  private gains: (GainNode | null)[] = [null, null, null];
  private voiceAnalysers: (AnalyserNode | null)[] = [null, null, null];
  private masterGain: GainNode | null = null;
  private compositeAnalyser: AnalyserNode | null = null;
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

  /** Start all voices */
  start(voices: BlendVoice[]): void {
    if (Platform.OS !== 'web') return;
    if (this.active) return;

    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    this.masterGain = ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.6, now);

    this.compositeAnalyser = ctx.createAnalyser();
    this.compositeAnalyser.fftSize = 2048;

    this.masterGain.connect(this.compositeAnalyser);
    this.compositeAnalyser.connect(ctx.destination);

    const hasSolo = voices.some((v) => v.solo);

    for (let i = 0; i < 3; i++) {
      const voice = voices[i];
      if (!voice) continue;

      const osc = ctx.createOscillator();
      osc.type = OSC_TYPE_MAP[voice.waveform] || 'sine';
      osc.frequency.setValueAtTime(voice.frequency, now);

      const gain = ctx.createGain();
      const effectiveVol = voice.muted ? 0 : (hasSolo && !voice.solo) ? 0 : voice.volume;
      gain.gain.setValueAtTime(effectiveVol, now);

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;

      osc.connect(gain);
      gain.connect(analyser);
      analyser.connect(this.masterGain);
      osc.start();

      this.oscs[i] = osc;
      this.gains[i] = gain;
      this.voiceAnalysers[i] = analyser;
    }

    this.active = true;
  }

  /** Update a single voice's parameters while playing */
  updateVoice(index: number, voice: BlendVoice, allVoices: BlendVoice[]): void {
    if (!this.active || !this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    const osc = this.oscs[index];
    const gain = this.gains[index];
    if (!osc || !gain) return;

    smoothRamp(osc.frequency, voice.frequency, now);

    if (osc.type !== OSC_TYPE_MAP[voice.waveform]) {
      osc.type = OSC_TYPE_MAP[voice.waveform] || 'sine';
    }

    const hasSolo = allVoices.some((v) => v.solo);
    const effectiveVol = voice.muted ? 0 : (hasSolo && !voice.solo) ? 0 : voice.volume;
    smoothRamp(gain.gain, effectiveVol, now);
  }

  /** Recalculate all gains (e.g. when solo/mute changes) */
  updateAllGains(voices: BlendVoice[]): void {
    if (!this.active || !this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    const hasSolo = voices.some((v) => v.solo);

    for (let i = 0; i < 3; i++) {
      const gain = this.gains[i];
      const voice = voices[i];
      if (!gain || !voice) continue;

      const effectiveVol = voice.muted ? 0 : (hasSolo && !voice.solo) ? 0 : voice.volume;
      smoothRamp(gain.gain, effectiveVol, now);
    }
  }

  /** Get per-voice analyser */
  getVoiceAnalyser(index: number): AnalyserNode | null {
    return this.voiceAnalysers[index];
  }

  /** Get composite analyser */
  getCompositeAnalyser(): AnalyserNode | null {
    return this.compositeAnalyser;
  }

  stop(): void {
    if (!this.active) return;

    const ctx = this.audioCtx;
    const now = ctx?.currentTime ?? 0;

    if (this.masterGain && ctx) {
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.linearRampToValueAtTime(0, now + 0.05);
    }

    setTimeout(() => {
      for (let i = 0; i < 3; i++) {
        try { this.oscs[i]?.stop(); } catch (_) {}
        this.oscs[i]?.disconnect();
        this.gains[i]?.disconnect();
        this.voiceAnalysers[i]?.disconnect();
        this.oscs[i] = null;
        this.gains[i] = null;
        this.voiceAnalysers[i] = null;
      }
      this.compositeAnalyser?.disconnect();
      this.masterGain?.disconnect();
      this.compositeAnalyser = null;
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
