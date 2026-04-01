import { Platform } from 'react-native';

/**
 * HapticEngine — Provides haptic feedback synced to audio parameters.
 *
 * Three haptic patterns:
 * 1. Bass rumble: steady vibration for low-frequency tones (<200 Hz)
 * 2. Beat pulse: rhythmic taps synced to binaural beat frequency
 * 3. Frequency change: gentle pulse when cymatics frequency shifts
 *
 * Rate-limited and intensity-scaled. Gracefully disabled on web/unsupported devices.
 */

// Lazy import expo-haptics to avoid crash on web
let Haptics: typeof import('expo-haptics') | null = null;

async function loadHaptics() {
  if (Haptics) return Haptics;
  if (Platform.OS === 'web') return null;
  try {
    Haptics = await import('expo-haptics');
    return Haptics;
  } catch {
    return null;
  }
}

export type HapticContext = 'bass' | 'beat' | 'cymatics';

/** Minimum ms between haptic triggers per context to save battery/motor */
const RATE_LIMITS: Record<HapticContext, number> = {
  bass: 120,    // ~8 Hz max rumble rate
  beat: 80,     // allow up to ~12 Hz beat pulses
  cymatics: 300, // gentle, infrequent
};

export class HapticEngine {
  private enabled = false;
  private supported = false;
  private lastTrigger: Record<HapticContext, number> = { bass: 0, beat: 0, cymatics: 0 };
  private bassInterval: ReturnType<typeof setInterval> | null = null;
  private beatInterval: ReturnType<typeof setInterval> | null = null;

  async init(): Promise<void> {
    if (Platform.OS === 'web') {
      this.supported = false;
      return;
    }
    const h = await loadHaptics();
    this.supported = h !== null;
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (!on) this.stopAll();
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  isSupported(): boolean {
    return this.supported;
  }

  /** Trigger a single haptic pulse scaled by intensity (0–1). */
  private async trigger(context: HapticContext, intensity: number): Promise<void> {
    if (!this.enabled || !this.supported || intensity <= 0) return;
    const now = Date.now();
    if (now - this.lastTrigger[context] < RATE_LIMITS[context]) return;
    this.lastTrigger[context] = now;

    const h = await loadHaptics();
    if (!h) return;

    if (intensity > 0.7) {
      await h.impactAsync(h.ImpactFeedbackStyle.Heavy);
    } else if (intensity > 0.35) {
      await h.impactAsync(h.ImpactFeedbackStyle.Medium);
    } else {
      await h.impactAsync(h.ImpactFeedbackStyle.Light);
    }
  }

  // ── Bass rumble ──────────────────────────────────────────────

  /**
   * Start a repeating bass rumble. Intensity derived from frequency and amplitude.
   * Lower frequency = stronger haptic. Higher amplitude = stronger haptic.
   */
  startBassRumble(frequency: number, amplitude: number): void {
    this.stopBassRumble();
    if (!this.enabled || !this.supported) return;
    if (frequency > 200) return; // only haptics for bass

    const bassIntensity = this.calcBassIntensity(frequency, amplitude);
    if (bassIntensity <= 0.05) return;

    // Pulse rate: lower freq → faster/more intense pulses
    const intervalMs = Math.max(RATE_LIMITS.bass, 200 - frequency * 0.5);
    this.bassInterval = setInterval(() => {
      this.trigger('bass', bassIntensity);
    }, intervalMs);
    // Fire immediately
    this.trigger('bass', bassIntensity);
  }

  /** Update rumble params without restarting if frequency stays in bass range. */
  updateBassRumble(frequency: number, amplitude: number): void {
    if (frequency > 200) {
      this.stopBassRumble();
      return;
    }
    // Restart with new params
    this.startBassRumble(frequency, amplitude);
  }

  stopBassRumble(): void {
    if (this.bassInterval) {
      clearInterval(this.bassInterval);
      this.bassInterval = null;
    }
  }

  private calcBassIntensity(frequency: number, amplitude: number): number {
    // Lower freq → higher intensity (0–200 Hz mapped to 1–0)
    const freqFactor = Math.max(0, 1 - frequency / 200);
    return Math.min(1, freqFactor * amplitude * 1.5);
  }

  // ── Beat pulse (binaural) ────────────────────────────────────

  /**
   * Start rhythmic haptic pulses synced to a binaural beat frequency.
   * @param beatFreqHz The difference frequency in Hz (e.g., 10 Hz for alpha)
   * @param amplitude Overall amplitude (scales intensity)
   */
  startBeatPulse(beatFreqHz: number, amplitude: number): void {
    this.stopBeatPulse();
    if (!this.enabled || !this.supported) return;
    if (beatFreqHz <= 0 || beatFreqHz > 40) return; // only useful for 0.5–40 Hz

    const intervalMs = Math.max(RATE_LIMITS.beat, 1000 / beatFreqHz);
    const intensity = Math.min(1, amplitude * 0.8);
    if (intensity <= 0.05) return;

    this.beatInterval = setInterval(() => {
      this.trigger('beat', intensity);
    }, intervalMs);
    this.trigger('beat', intensity);
  }

  updateBeatPulse(beatFreqHz: number, amplitude: number): void {
    this.startBeatPulse(beatFreqHz, amplitude);
  }

  stopBeatPulse(): void {
    if (this.beatInterval) {
      clearInterval(this.beatInterval);
      this.beatInterval = null;
    }
  }

  // ── Cymatics pulse ───────────────────────────────────────────

  /** Single gentle pulse when a cymatics frequency changes significantly. */
  async pulseCymatics(intensity = 0.4): Promise<void> {
    await this.trigger('cymatics', intensity);
  }

  // ── Lifecycle ────────────────────────────────────────────────

  stopAll(): void {
    this.stopBassRumble();
    this.stopBeatPulse();
  }

  dispose(): void {
    this.stopAll();
    this.enabled = false;
  }
}

/** Shared singleton instance */
let _instance: HapticEngine | null = null;

export function getHapticEngine(): HapticEngine {
  if (!_instance) {
    _instance = new HapticEngine();
    _instance.init();
  }
  return _instance;
}
