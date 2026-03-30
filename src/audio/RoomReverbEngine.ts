import { Platform } from 'react-native';

/** Room preset identifier */
export type RoomPreset = 'smallRoom' | 'cathedral' | 'cave' | 'openAir' | 'box';

/** Parameters that define a room's acoustic character */
interface RoomConfig {
  label: string;
  /** Comb filter delay times in seconds */
  combDelays: number[];
  /** Comb filter feedback gains (0–1) */
  combFeedbacks: number[];
  /** Allpass filter delay times in seconds */
  allpassDelays: number[];
  /** Allpass feedback gain */
  allpassFeedback: number;
  /** Lowpass filter cutoff in Hz (simulates air absorption) */
  lpfCutoff: number;
  /** Pre-delay in seconds */
  preDelay: number;
}

/** Room preset configurations */
export const ROOM_CONFIGS: Record<RoomPreset, RoomConfig> = {
  smallRoom: {
    label: 'Small Room',
    combDelays: [0.0297, 0.0371, 0.0411, 0.0437],
    combFeedbacks: [0.75, 0.73, 0.70, 0.68],
    allpassDelays: [0.005, 0.0017],
    allpassFeedback: 0.6,
    lpfCutoff: 8000,
    preDelay: 0.005,
  },
  cathedral: {
    label: 'Cathedral',
    combDelays: [0.0627, 0.0819, 0.0991, 0.1133],
    combFeedbacks: [0.88, 0.87, 0.86, 0.85],
    allpassDelays: [0.012, 0.004],
    allpassFeedback: 0.65,
    lpfCutoff: 4000,
    preDelay: 0.025,
  },
  cave: {
    label: 'Cave',
    combDelays: [0.0737, 0.0929, 0.1091, 0.1277],
    combFeedbacks: [0.92, 0.91, 0.90, 0.89],
    allpassDelays: [0.015, 0.006],
    allpassFeedback: 0.7,
    lpfCutoff: 2500,
    preDelay: 0.035,
  },
  openAir: {
    label: 'Open Air',
    combDelays: [0.0197, 0.0241, 0.0307, 0.0353],
    combFeedbacks: [0.55, 0.52, 0.50, 0.48],
    allpassDelays: [0.003, 0.001],
    allpassFeedback: 0.5,
    lpfCutoff: 12000,
    preDelay: 0.002,
  },
  box: {
    label: 'Box',
    combDelays: [0.0133, 0.0177, 0.0211, 0.0237],
    combFeedbacks: [0.82, 0.80, 0.78, 0.76],
    allpassDelays: [0.002, 0.0008],
    allpassFeedback: 0.55,
    lpfCutoff: 6000,
    preDelay: 0.001,
  },
};

export const ROOM_PRESETS: RoomPreset[] = ['smallRoom', 'cathedral', 'cave', 'openAir', 'box'];

export const ROOM_LABELS: Record<RoomPreset, string> = {
  smallRoom: 'Small Room',
  cathedral: 'Cathedral',
  cave: 'Cave',
  openAir: 'Open Air',
  box: 'Box',
};

// Smooth ramp duration for crossfade
const CROSSFADE_TIME = 0.15;

/**
 * Algorithmic reverb engine using Schroeder-style comb + allpass filters.
 *
 * Designed to be inserted into an existing Web Audio signal chain.
 * On native platforms this is a no-op (reverb only works on web).
 */
export class RoomReverbEngine {
  private audioCtx: AudioContext | null = null;

  // Signal routing
  private inputNode: GainNode | null = null;
  private dryGain: GainNode | null = null;
  private wetGain: GainNode | null = null;
  private outputNode: GainNode | null = null;
  private preDelayNode: DelayNode | null = null;

  // Current reverb network
  private combFilters: { delay: DelayNode; feedback: GainNode; lpf: BiquadFilterNode }[] = [];
  private allpassFilters: { delay: DelayNode; feedback: GainNode; feedforward: GainNode }[] = [];
  private combMerger: GainNode | null = null;

  // Crossfade support
  private oldWetGain: GainNode | null = null;
  private oldCombMerger: GainNode | null = null;
  private oldCombs: { delay: DelayNode; feedback: GainNode; lpf: BiquadFilterNode }[] = [];
  private oldAllpasses: { delay: DelayNode; feedback: GainNode; feedforward: GainNode }[] = [];
  private oldPreDelay: DelayNode | null = null;

  private currentPreset: RoomPreset | null = null;
  private currentWetDry = 0.3;

  /**
   * Initialize the engine with an existing AudioContext.
   * Returns the input and output nodes to splice into the signal chain.
   *
   * Chain: source → inputNode → [dryGain + reverbNetwork → wetGain] → outputNode → next
   */
  init(ctx: AudioContext): { input: GainNode; output: GainNode } {
    if (Platform.OS !== 'web') {
      // On native, passthrough
      const passthrough = ctx.createGain();
      this.inputNode = passthrough;
      this.outputNode = passthrough;
      return { input: passthrough, output: passthrough };
    }

    this.audioCtx = ctx;

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();
    this.dryGain = ctx.createGain();
    this.dryGain.gain.value = 1;
    this.wetGain = ctx.createGain();
    this.wetGain.gain.value = 0; // Start dry

    // Dry path: input → dryGain → output
    this.inputNode.connect(this.dryGain);
    this.dryGain.connect(this.outputNode);

    // Wet path will be built when a preset is selected
    this.wetGain.connect(this.outputNode);

    return { input: this.inputNode, output: this.outputNode };
  }

  /** Set the room preset, crossfading from the current reverb tail. */
  setPreset(preset: RoomPreset): void {
    if (!this.audioCtx || !this.inputNode || !this.outputNode) return;
    if (this.currentPreset === preset) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const config = ROOM_CONFIGS[preset];

    // Fade out old reverb network if exists
    this.fadeOutOldNetwork(now);

    // Move current network to "old" for crossfade
    if (this.wetGain && this.combMerger) {
      this.oldWetGain = this.wetGain;
      this.oldCombMerger = this.combMerger;
      this.oldCombs = this.combFilters;
      this.oldAllpasses = this.allpassFilters;
      this.oldPreDelay = this.preDelayNode;

      // Fade out the old wet
      this.oldWetGain.gain.cancelScheduledValues(now);
      this.oldWetGain.gain.setValueAtTime(this.oldWetGain.gain.value, now);
      this.oldWetGain.gain.linearRampToValueAtTime(0, now + CROSSFADE_TIME);

      // Schedule cleanup
      setTimeout(() => this.cleanupOldNetwork(), CROSSFADE_TIME * 1000 + 50);
    }

    // Build new reverb network
    this.wetGain = ctx.createGain();
    this.wetGain.gain.setValueAtTime(0, now);
    this.wetGain.gain.linearRampToValueAtTime(this.currentWetDry, now + CROSSFADE_TIME);
    this.wetGain.connect(this.outputNode);

    // Pre-delay
    this.preDelayNode = ctx.createDelay(0.1);
    this.preDelayNode.delayTime.value = config.preDelay;
    this.inputNode.connect(this.preDelayNode);

    // Comb merger: sums all parallel comb filter outputs
    this.combMerger = ctx.createGain();
    this.combMerger.gain.value = 1 / config.combDelays.length;

    // Build parallel comb filters
    this.combFilters = config.combDelays.map((delayTime, i) => {
      const delay = ctx.createDelay(0.2);
      delay.delayTime.value = delayTime;

      const feedback = ctx.createGain();
      feedback.gain.value = config.combFeedbacks[i];

      const lpf = ctx.createBiquadFilter();
      lpf.type = 'lowpass';
      lpf.frequency.value = config.lpfCutoff;

      // Comb: preDelay → delay → lpf → feedback → delay (loop)
      //                          lpf → combMerger
      this.preDelayNode!.connect(delay);
      delay.connect(lpf);
      lpf.connect(feedback);
      feedback.connect(delay); // feedback loop
      lpf.connect(this.combMerger!);

      return { delay, feedback, lpf };
    });

    // Build series allpass filters after comb merger
    let prevNode: AudioNode = this.combMerger;
    this.allpassFilters = config.allpassDelays.map((delayTime) => {
      const delay = ctx.createDelay(0.1);
      delay.delayTime.value = delayTime;

      const feedback = ctx.createGain();
      feedback.gain.value = config.allpassFeedback;

      const feedforward = ctx.createGain();
      feedforward.gain.value = -config.allpassFeedback;

      // Allpass: input → delay → output
      //          input → feedforward → output
      //          delay → feedback → delay (loop via input summing)
      const apInput = ctx.createGain();
      const apOutput = ctx.createGain();

      prevNode.connect(apInput);
      apInput.connect(delay);
      apInput.connect(feedforward);
      feedforward.connect(apOutput);
      delay.connect(apOutput);
      delay.connect(feedback);
      feedback.connect(apInput); // feedback loop

      prevNode = apOutput;
      return { delay, feedback, feedforward };
    });

    // Connect final allpass output to wet gain
    (prevNode as AudioNode).connect(this.wetGain);

    this.currentPreset = preset;
  }

  /** Set wet/dry mix (0 = fully dry, 1 = fully wet). */
  setWetDry(value: number): void {
    this.currentWetDry = value;
    if (!this.audioCtx || !this.wetGain || !this.dryGain) return;
    const now = this.audioCtx.currentTime;

    this.wetGain.gain.cancelScheduledValues(now);
    this.wetGain.gain.setValueAtTime(this.wetGain.gain.value, now);
    this.wetGain.gain.linearRampToValueAtTime(value, now + 0.03);

    this.dryGain.gain.cancelScheduledValues(now);
    this.dryGain.gain.setValueAtTime(this.dryGain.gain.value, now);
    this.dryGain.gain.linearRampToValueAtTime(1 - value * 0.5, now + 0.03);
  }

  /** Update the lowpass cutoff to simulate room size/brightness changes. */
  setDecay(value: number): void {
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;

    // value 0–1: 0 = tight/short, 1 = long/expansive
    // Scale feedback gains
    for (const comb of this.combFilters) {
      const baseFeedback = comb.feedback.gain.value;
      // Adjust within ±10% of current value
      const target = Math.min(0.95, baseFeedback * (0.9 + value * 0.2));
      comb.feedback.gain.cancelScheduledValues(now);
      comb.feedback.gain.setValueAtTime(comb.feedback.gain.value, now);
      comb.feedback.gain.linearRampToValueAtTime(target, now + 0.05);
    }
  }

  /** Get current preset */
  getPreset(): RoomPreset | null {
    return this.currentPreset;
  }

  /** Check if reverb is active */
  isActive(): boolean {
    return this.currentPreset !== null;
  }

  /** Disconnect and clean up everything */
  dispose(): void {
    this.cleanupOldNetwork();
    this.disconnectCurrentNetwork();
    this.inputNode = null;
    this.outputNode = null;
    this.dryGain = null;
    this.wetGain = null;
    this.audioCtx = null;
    this.currentPreset = null;
  }

  /** Bypass reverb (go fully dry) */
  bypass(): void {
    if (!this.audioCtx || !this.wetGain || !this.dryGain) return;
    const now = this.audioCtx.currentTime;
    this.wetGain.gain.cancelScheduledValues(now);
    this.wetGain.gain.setValueAtTime(this.wetGain.gain.value, now);
    this.wetGain.gain.linearRampToValueAtTime(0, now + CROSSFADE_TIME);
    this.dryGain.gain.cancelScheduledValues(now);
    this.dryGain.gain.setValueAtTime(this.dryGain.gain.value, now);
    this.dryGain.gain.linearRampToValueAtTime(1, now + CROSSFADE_TIME);
  }

  private fadeOutOldNetwork(now: number): void {
    if (this.oldWetGain) {
      try {
        this.oldWetGain.gain.cancelScheduledValues(now);
        this.oldWetGain.gain.setValueAtTime(this.oldWetGain.gain.value, now);
        this.oldWetGain.gain.linearRampToValueAtTime(0, now + 0.02);
      } catch { /* already disconnected */ }
    }
    // Immediate cleanup of any lingering old network
    setTimeout(() => this.cleanupOldNetwork(), 50);
  }

  private cleanupOldNetwork(): void {
    if (this.oldPreDelay) {
      try { this.oldPreDelay.disconnect(); } catch { /* */ }
      this.oldPreDelay = null;
    }
    for (const comb of this.oldCombs) {
      try { comb.delay.disconnect(); comb.feedback.disconnect(); comb.lpf.disconnect(); } catch { /* */ }
    }
    this.oldCombs = [];
    for (const ap of this.oldAllpasses) {
      try { ap.delay.disconnect(); ap.feedback.disconnect(); ap.feedforward.disconnect(); } catch { /* */ }
    }
    this.oldAllpasses = [];
    if (this.oldCombMerger) {
      try { this.oldCombMerger.disconnect(); } catch { /* */ }
      this.oldCombMerger = null;
    }
    if (this.oldWetGain) {
      try { this.oldWetGain.disconnect(); } catch { /* */ }
      this.oldWetGain = null;
    }
  }

  private disconnectCurrentNetwork(): void {
    if (this.preDelayNode) {
      try { this.preDelayNode.disconnect(); } catch { /* */ }
      this.preDelayNode = null;
    }
    for (const comb of this.combFilters) {
      try { comb.delay.disconnect(); comb.feedback.disconnect(); comb.lpf.disconnect(); } catch { /* */ }
    }
    this.combFilters = [];
    for (const ap of this.allpassFilters) {
      try { ap.delay.disconnect(); ap.feedback.disconnect(); ap.feedforward.disconnect(); } catch { /* */ }
    }
    this.allpassFilters = [];
    if (this.combMerger) {
      try { this.combMerger.disconnect(); } catch { /* */ }
      this.combMerger = null;
    }
    if (this.wetGain) {
      try { this.wetGain.disconnect(); } catch { /* */ }
      this.wetGain = null;
    }
  }
}
