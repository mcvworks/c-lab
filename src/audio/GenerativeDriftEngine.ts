/**
 * GenerativeDriftEngine
 *
 * Smoothly wanders audio parameters within user-defined bounds using
 * layered sine oscillators (multi-frequency random walk). Each parameter
 * uses 3–4 incommensurate frequencies so the result feels organic rather
 * than obviously periodic.
 *
 * The engine does NOT own any audio nodes — it simply computes target
 * values and calls the provided setter callbacks on each animation frame.
 */

// ── Types ────────────────────────────────────────────────────────────

export interface DriftBounds {
  freqMin: number;
  freqMax: number;
  ampMin: number;
  ampMax: number;
  panMin: number;
  panMax: number;
}

export type DriftSpeed = 'slow' | 'medium' | 'fast';

export interface DriftCallbacks {
  setFrequency: (v: number) => void;
  setAmplitude: (v: number) => void;
  setPan: (v: number) => void;
}

const SPEED_MULTIPLIER: Record<DriftSpeed, number> = {
  slow: 0.15,
  medium: 0.4,
  fast: 1.0,
};

// ── Multi-sine random walk ──────────────────────────────────────────

/** A single wandering dimension driven by layered sines. */
class WanderChannel {
  /** Incommensurate angular frequencies (rad/s) and amplitudes */
  private layers: { omega: number; amp: number; phase: number }[];

  constructor(baseRate: number) {
    // 4 layers with irrational frequency ratios for organic feel
    const ratios = [1, Math.SQRT2, Math.PI / 2, Math.E / 2];
    this.layers = ratios.map((r) => ({
      omega: baseRate * r,
      amp: 1 / (ratios.indexOf(r) + 1), // decreasing amplitude per layer
      phase: Math.random() * Math.PI * 2,
    }));
  }

  /** Returns value in [-1, 1] for the given elapsed time. */
  sample(t: number): number {
    let sum = 0;
    let normMax = 0;
    for (const l of this.layers) {
      sum += l.amp * Math.sin(l.omega * t + l.phase);
      normMax += l.amp;
    }
    return sum / normMax; // normalized to [-1, 1]
  }
}

// ── Breathing amplitude modulator ───────────────────────────────────

class BreathingModulator {
  /** Slow sine-wave amplitude modulation. Returns 0–1. */
  sample(t: number, speed: number): number {
    // ~4–12 second period depending on speed
    const period = 8 / Math.max(0.1, speed);
    return 0.5 + 0.5 * Math.sin((2 * Math.PI * t) / period);
  }
}

// ── Engine ───────────────────────────────────────────────────────────

export class GenerativeDriftEngine {
  private running = false;
  private rafId: number | null = null;
  private startTime = 0;

  private bounds: DriftBounds = {
    freqMin: 200,
    freqMax: 400,
    ampMin: 0.3,
    ampMax: 0.6,
    panMin: -0.5,
    panMax: 0.5,
  };

  private speed: DriftSpeed = 'medium';
  private breathing = false;
  private callbacks: DriftCallbacks | null = null;

  // Wander channels
  private freqWander = new WanderChannel(0.3);
  private ampWander = new WanderChannel(0.25);
  private panWander = new WanderChannel(0.2);
  private breathMod = new BreathingModulator();

  // Frame throttle: update params every N frames (~10–15 Hz is enough)
  private frameCount = 0;
  private static readonly UPDATE_EVERY = 4;

  start(bounds: DriftBounds, speed: DriftSpeed, breathing: boolean, callbacks: DriftCallbacks): void {
    this.bounds = bounds;
    this.speed = speed;
    this.breathing = breathing;
    this.callbacks = callbacks;
    this.running = true;
    this.startTime = performance.now() / 1000;
    this.frameCount = 0;

    // Randomize wander channels on each start for variety
    this.freqWander = new WanderChannel(0.3);
    this.ampWander = new WanderChannel(0.25);
    this.panWander = new WanderChannel(0.2);

    this.tick();
  }

  stop(): void {
    this.running = false;
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  updateBounds(bounds: DriftBounds): void {
    this.bounds = bounds;
  }

  updateSpeed(speed: DriftSpeed): void {
    this.speed = speed;
  }

  updateBreathing(breathing: boolean): void {
    this.breathing = breathing;
  }

  isActive(): boolean {
    return this.running;
  }

  dispose(): void {
    this.stop();
  }

  // ── Internal ────────────────────────────────────────────────────

  private tick = (): void => {
    if (!this.running || !this.callbacks) return;

    this.frameCount++;
    if (this.frameCount % GenerativeDriftEngine.UPDATE_EVERY === 0) {
      const elapsed = performance.now() / 1000 - this.startTime;
      const sm = SPEED_MULTIPLIER[this.speed];
      const t = elapsed * sm;

      const { freqMin, freqMax, ampMin, ampMax, panMin, panMax } = this.bounds;

      // Map [-1,1] wander to parameter range
      const freqNorm = (this.freqWander.sample(t) + 1) / 2; // 0–1
      const freq = freqMin + freqNorm * (freqMax - freqMin);

      let ampNorm = (this.ampWander.sample(t) + 1) / 2;
      if (this.breathing) {
        ampNorm *= this.breathMod.sample(elapsed, sm);
      }
      const amp = ampMin + ampNorm * (ampMax - ampMin);

      const panNorm = (this.panWander.sample(t) + 1) / 2;
      const pan = panMin + panNorm * (panMax - panMin);

      this.callbacks.setFrequency(Math.round(freq));
      this.callbacks.setAmplitude(Math.round(amp * 100) / 100);
      this.callbacks.setPan(Math.round(pan * 100) / 100);
    }

    this.rafId = requestAnimationFrame(this.tick);
  };
}
