/**
 * MicrophoneEngine — captures live audio from device mic and provides
 * an AnalyserNode for real-time visualization. No audio output by default
 * to avoid feedback loops.
 */
export class MicrophoneEngine {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private active = false;

  /** Request mic permission and start capturing. */
  async start(): Promise<void> {
    if (this.active) return;

    // Request microphone access
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });

    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;

    // Route mic → analyser only (no destination = no speaker output)
    source.connect(analyser);

    this.ctx = ctx;
    this.stream = stream;
    this.source = source;
    this.analyser = analyser;
    this.active = true;
  }

  stop(): void {
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
    this.analyser = null;
    this.active = false;
  }

  isActive(): boolean {
    return this.active;
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  /** Get time-domain waveform data (0–255, 128 = zero crossing). */
  getTimeDomainData(): Uint8Array | null {
    if (!this.analyser) return null;
    const data = new Uint8Array(this.analyser.fftSize);
    this.analyser.getByteTimeDomainData(data);
    return data;
  }

  /** Get frequency-domain data (0–255). */
  getFrequencyData(): Uint8Array | null {
    if (!this.analyser) return null;
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }

  /** Estimate dominant frequency via autocorrelation on time-domain data. */
  getDominantFrequency(): number | null {
    if (!this.analyser || !this.ctx) return null;

    const bufLen = this.analyser.fftSize;
    const buf = new Float32Array(bufLen);
    this.analyser.getFloatTimeDomainData(buf);

    // Check if there's enough signal
    let rms = 0;
    for (let i = 0; i < bufLen; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / bufLen);
    if (rms < 0.01) return null; // too quiet

    // Autocorrelation pitch detection
    const sampleRate = this.ctx.sampleRate;
    const minPeriod = Math.floor(sampleRate / 2000); // max freq ~2000 Hz
    const maxPeriod = Math.floor(sampleRate / 50);   // min freq ~50 Hz
    const halfLen = Math.floor(bufLen / 2);

    let bestCorr = -1;
    let bestPeriod = minPeriod;

    for (let period = minPeriod; period <= Math.min(maxPeriod, halfLen); period++) {
      let corr = 0;
      for (let i = 0; i < halfLen; i++) {
        corr += buf[i] * buf[i + period];
      }
      if (corr > bestCorr) {
        bestCorr = corr;
        bestPeriod = period;
      }
    }

    if (bestCorr < 0) return null;
    return sampleRate / bestPeriod;
  }

  dispose(): void {
    this.stop();
  }
}

// ── Note name helper ──────────────────────────────────────────────────
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** Convert frequency to nearest note name + octave + cents offset. */
export function freqToNote(freq: number): { name: string; octave: number; cents: number } | null {
  if (freq <= 0) return null;
  const semitones = 12 * Math.log2(freq / 440);
  const rounded = Math.round(semitones);
  const cents = Math.round((semitones - rounded) * 100);
  const midiNote = 69 + rounded;
  const octave = Math.floor(midiNote / 12) - 1;
  const noteIdx = ((midiNote % 12) + 12) % 12;
  return { name: NOTE_NAMES[noteIdx], octave, cents };
}
