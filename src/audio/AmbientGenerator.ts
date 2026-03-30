import { Platform } from 'react-native';

export type AmbientType = 'rain' | 'ocean' | 'wind' | 'forest' | 'fire';

export interface AmbientLayerConfig {
  id: number;
  type: AmbientType;
  volume: number;
  enabled: boolean;
  pan?: number;           // -1 (L) to +1 (R), default 0
  filterCutoff?: number;  // Hz, user-controllable brightness
}

interface WebLayerNodes {
  type: AmbientType;
  source: AudioBufferSourceNode;
  filter: BiquadFilterNode;
  filter2?: BiquadFilterNode;
  gain: GainNode;
  panner: StereoPannerNode;
  lfo?: OscillatorNode;
  lfoGain?: GainNode;
}

/**
 * Filter/modulation recipes per ambient type.
 * Each produces a distinct character from a white noise source.
 */
const AMBIENT_RECIPES: Record<AmbientType, {
  filterType: BiquadFilterType;
  filterFreq: number;
  filterQ: number;
  filter2?: { type: BiquadFilterType; freq: number; Q: number };
  lfoRate?: number;
  lfoDepth?: number;
  baseGain: number;
}> = {
  rain: {
    filterType: 'bandpass',
    filterFreq: 3000,
    filterQ: 0.5,
    baseGain: 0.7,
  },
  ocean: {
    filterType: 'lowpass',
    filterFreq: 500,
    filterQ: 0.7,
    lfoRate: 0.08,
    lfoDepth: 0.4,
    baseGain: 0.8,
  },
  wind: {
    filterType: 'bandpass',
    filterFreq: 800,
    filterQ: 0.8,
    lfoRate: 0.12,
    lfoDepth: 0.35,
    baseGain: 0.7,
  },
  forest: {
    filterType: 'highpass',
    filterFreq: 2500,
    filterQ: 0.3,
    filter2: { type: 'lowpass', freq: 6000, Q: 0.5 },
    baseGain: 0.5,
  },
  fire: {
    filterType: 'bandpass',
    filterFreq: 600,
    filterQ: 0.6,
    filter2: { type: 'highpass', freq: 150, Q: 0.5 },
    lfoRate: 2.5,
    lfoDepth: 0.3,
    baseGain: 0.75,
  },
};

/** Default filter cutoff per ambient type (used when no user override). */
const DEFAULT_CUTOFF: Record<AmbientType, number> = {
  rain: 3000,
  ocean: 500,
  wind: 800,
  forest: 6000,
  fire: 600,
};

const NOISE_BUFFER_DURATION = 4; // seconds
const RAMP_TIME = 0.05; // 50ms for smooth transitions

/** Cancel any scheduled automation, anchor at the current value, then ramp. */
function smoothRamp(param: AudioParam, target: number, now: number, duration = RAMP_TIME): void {
  param.cancelScheduledValues(now);
  param.setValueAtTime(param.value, now);
  param.linearRampToValueAtTime(target, now + duration);
}

/**
 * Manages multiple ambient noise layers with distinct sonic textures.
 *
 * On web: white noise AudioBuffer shaped by BiquadFilters and optional
 * LFO amplitude modulation per layer. Each layer is independent with
 * its own gain control.
 *
 * On native: generates filtered noise samples via expo-av (same pattern
 * as BinauralGenerator).
 */
export class AmbientGenerator {
  private playing = false;

  // Web Audio API state
  private audioCtx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private webLayers: Map<number, WebLayerNodes> = new Map();
  private masterGain: GainNode | null = null;

  // Native state
  private nativeSounds: Map<number, any> = new Map();
  private nativeTempFiles: Map<number, any> = new Map();

  async start(configs: AmbientLayerConfig[]): Promise<void> {
    this.playing = true;
    if (Platform.OS === 'web') {
      await this.startWeb(configs);
    } else {
      await this.startNative(configs);
    }
  }

  async stop(): Promise<void> {
    this.playing = false;
    if (Platform.OS === 'web') {
      await this.stopWeb();
    } else {
      await this.stopNative();
    }
  }

  isPlaying(): boolean {
    return this.playing;
  }

  /**
   * Sync the running layer set with an updated config array.
   * Adds new layers, removes stale ones, and updates volume/enabled.
   */
  async syncLayers(configs: AmbientLayerConfig[]): Promise<void> {
    if (!this.playing) return;

    if (Platform.OS === 'web') {
      this.syncWebLayers(configs);
    } else {
      await this.syncNativeLayers(configs);
    }
  }

  /** Update a single layer's volume smoothly. */
  setLayerVolume(id: number, volume: number): void {
    if (Platform.OS === 'web') {
      const layer = this.webLayers.get(id);
      if (!layer || !this.audioCtx) return;
      const now = this.audioCtx.currentTime;
      smoothRamp(layer.gain.gain, volume, now);
    }
    // Native volume updates happen via syncLayers
  }

  /** Enable or disable a single layer smoothly. */
  setLayerEnabled(id: number, enabled: boolean): void {
    if (Platform.OS === 'web') {
      const layer = this.webLayers.get(id);
      if (!layer || !this.audioCtx) return;
      const now = this.audioCtx.currentTime;
      // Mute/unmute by ramping gain; the layer's volume is stored in the config
      // so we ramp to 0 for disabled. The next syncLayers or setLayerVolume
      // call will restore the correct volume when re-enabled.
      const recipe = AMBIENT_RECIPES[layer.type];
      const targetVol = enabled ? (recipe.baseGain * 0.5) : 0; // conservative restore; syncLayers will set exact volume
      smoothRamp(layer.gain.gain, targetVol, now);
    }
  }

  /** Update a single layer's stereo pan smoothly. */
  setLayerPan(id: number, pan: number): void {
    if (Platform.OS === 'web') {
      const layer = this.webLayers.get(id);
      if (!layer || !this.audioCtx) return;
      smoothRamp(layer.panner.pan, pan, this.audioCtx.currentTime);
    }
  }

  /** Update a single layer's filter cutoff (brightness) smoothly. */
  setLayerFilterCutoff(id: number, cutoff: number): void {
    if (Platform.OS === 'web') {
      const layer = this.webLayers.get(id);
      if (!layer || !this.audioCtx) return;
      smoothRamp(layer.filter.frequency, cutoff, this.audioCtx.currentTime);
    }
  }

  async dispose(): Promise<void> {
    await this.stop();
    if (this.audioCtx) {
      await this.audioCtx.close();
      this.audioCtx = null;
    }
    this.noiseBuffer = null;
  }

  // ── Web Audio API ─────────────────────────────────────────────

  private getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      this.audioCtx = new AudioContext();
    }
    return this.audioCtx;
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer) return this.noiseBuffer;

    const length = ctx.sampleRate * NOISE_BUFFER_DURATION;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  private async startWeb(configs: AmbientLayerConfig[]): Promise<void> {
    const ctx = this.getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    // Master gain for fade-out on stop
    this.masterGain = ctx.createGain();
    this.masterGain.gain.setValueAtTime(1, ctx.currentTime);
    this.masterGain.connect(ctx.destination);

    for (const config of configs) {
      if (config.enabled) {
        this.createWebLayer(config);
      }
    }
  }

  private createWebLayer(config: AmbientLayerConfig): void {
    const ctx = this.getAudioContext();
    const noiseBuffer = this.getNoiseBuffer(ctx);
    const recipe = AMBIENT_RECIPES[config.type];
    const now = ctx.currentTime;

    // Noise source (looping)
    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;

    // Primary filter — use user filterCutoff if provided
    const filter = ctx.createBiquadFilter();
    filter.type = recipe.filterType;
    filter.frequency.setValueAtTime(config.filterCutoff ?? recipe.filterFreq, now);
    filter.Q.setValueAtTime(recipe.filterQ, now);

    // Layer gain
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(config.volume * recipe.baseGain, now);

    // Stereo panner
    const panner = ctx.createStereoPanner();
    panner.pan.setValueAtTime(config.pan ?? 0, now);

    // Chain: source → filter → [filter2] → gain → panner → master
    source.connect(filter);

    let lastNode: AudioNode = filter;

    // Optional second filter
    let filter2: BiquadFilterNode | undefined;
    if (recipe.filter2) {
      filter2 = ctx.createBiquadFilter();
      filter2.type = recipe.filter2.type;
      filter2.frequency.setValueAtTime(recipe.filter2.freq, now);
      filter2.Q.setValueAtTime(recipe.filter2.Q, now);
      filter.connect(filter2);
      lastNode = filter2;
    }

    // Optional LFO for amplitude modulation
    let lfo: OscillatorNode | undefined;
    let lfoGain: GainNode | undefined;
    if (recipe.lfoRate && recipe.lfoDepth) {
      lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(recipe.lfoRate, now);

      lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(recipe.lfoDepth * config.volume * recipe.baseGain, now);

      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      lfo.start(now);
    }

    lastNode.connect(gain);
    gain.connect(panner);
    panner.connect(this.masterGain!);
    source.start(now);

    this.webLayers.set(config.id, { type: config.type, source, filter, filter2, gain, panner, lfo, lfoGain });
  }

  private removeWebLayer(id: number): void {
    const layer = this.webLayers.get(id);
    if (!layer) return;
    try { layer.source.stop(); layer.source.disconnect(); } catch { /* */ }
    try { layer.filter.disconnect(); } catch { /* */ }
    if (layer.filter2) try { layer.filter2.disconnect(); } catch { /* */ }
    try { layer.gain.disconnect(); } catch { /* */ }
    try { layer.panner.disconnect(); } catch { /* */ }
    if (layer.lfo) try { layer.lfo.stop(); layer.lfo.disconnect(); } catch { /* */ }
    if (layer.lfoGain) try { layer.lfoGain.disconnect(); } catch { /* */ }
    this.webLayers.delete(id);
  }

  /** Fade out a web layer over RAMP_TIME then disconnect. */
  private fadeOutWebLayer(id: number, now: number): void {
    const layer = this.webLayers.get(id);
    if (!layer) return;
    this.webLayers.delete(id);
    layer.gain.gain.cancelScheduledValues(now);
    layer.gain.gain.setValueAtTime(layer.gain.gain.value, now);
    layer.gain.gain.linearRampToValueAtTime(0, now + RAMP_TIME);
    setTimeout(() => {
      try { layer.source.stop(); layer.source.disconnect(); } catch { /* */ }
      try { layer.filter.disconnect(); } catch { /* */ }
      if (layer.filter2) try { layer.filter2.disconnect(); } catch { /* */ }
      try { layer.gain.disconnect(); } catch { /* */ }
      try { layer.panner.disconnect(); } catch { /* */ }
      if (layer.lfo) try { layer.lfo.stop(); layer.lfo.disconnect(); } catch { /* */ }
      if (layer.lfoGain) try { layer.lfoGain.disconnect(); } catch { /* */ }
    }, RAMP_TIME * 1000 + 20);
  }

  private syncWebLayers(configs: AmbientLayerConfig[]): void {
    const ctx = this.audioCtx;
    if (!ctx) return;
    const now = ctx.currentTime;

    const activeIds = new Set(configs.filter((c) => c.enabled).map((c) => c.id));
    const configMap = new Map(configs.map((c) => [c.id, c]));

    // Remove layers that are no longer present or disabled — fade out first
    for (const id of this.webLayers.keys()) {
      if (!activeIds.has(id)) {
        this.fadeOutWebLayer(id, now);
      }
    }

    // Add or update layers
    for (const config of configs) {
      if (!config.enabled) continue;

      const existing = this.webLayers.get(config.id);
      if (existing) {
        // Type changed — fade out old, create new
        if (existing.type !== config.type) {
          this.fadeOutWebLayer(config.id, now);
          this.createWebLayer(config);
          continue;
        }
        const recipe = AMBIENT_RECIPES[config.type];
        smoothRamp(existing.gain.gain, config.volume * recipe.baseGain, now);
        smoothRamp(existing.panner.pan, config.pan ?? 0, now);
        smoothRamp(existing.filter.frequency, config.filterCutoff ?? recipe.filterFreq, now);
        if (existing.lfoGain && recipe.lfoDepth) {
          smoothRamp(
            existing.lfoGain.gain,
            recipe.lfoDepth * config.volume * recipe.baseGain,
            now,
          );
        }
      } else {
        this.createWebLayer(config);
      }
    }
  }

  private async stopWeb(): Promise<void> {
    if (this.masterGain && this.audioCtx) {
      const now = this.audioCtx.currentTime;
      smoothRamp(this.masterGain.gain, 0, now, 0.06);
      await new Promise((r) => setTimeout(r, 80));
    }

    for (const id of [...this.webLayers.keys()]) {
      this.removeWebLayer(id);
    }

    if (this.masterGain) {
      try { this.masterGain.disconnect(); } catch { /* */ }
      this.masterGain = null;
    }
  }

  // ── Native (expo-av) ──────────────────────────────────────────

  private async startNative(configs: AmbientLayerConfig[]): Promise<void> {
    for (const config of configs) {
      if (config.enabled) {
        await this.createNativeLayer(config);
      }
    }
  }

  private async createNativeLayer(config: AmbientLayerConfig): Promise<void> {
    const { Audio } = await import('expo-av');
    const { File, Paths } = await import('expo-file-system');
    const { generateNoiseSamples } = await import('./generateNoiseSamples');
    const { encodeWavBase64 } = await import('./encodeWav');

    // Map ambient types to noise types for native
    const noiseType = config.type === 'ocean' || config.type === 'fire' ? 'brown'
      : config.type === 'wind' || config.type === 'forest' ? 'pink'
      : 'white';

    const samples = generateNoiseSamples(config.volume, noiseType);
    const base64 = encodeWavBase64(samples);
    const tempFile = new File(Paths.cache, `ambient_${config.id}_${Date.now()}.wav`);
    tempFile.write(base64, { encoding: 'base64' });

    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });

    const { sound } = await Audio.Sound.createAsync(
      { uri: tempFile.uri },
      { isLooping: true, volume: config.volume, shouldPlay: true },
    );

    // Clean up previous if exists
    await this.removeNativeLayer(config.id);

    this.nativeSounds.set(config.id, sound);
    this.nativeTempFiles.set(config.id, tempFile);
  }

  private async removeNativeLayer(id: number): Promise<void> {
    const sound = this.nativeSounds.get(id);
    if (sound) {
      try {
        await sound.setVolumeAsync(0);
        await sound.stopAsync();
        await sound.unloadAsync();
      } catch { /* ignore */ }
      this.nativeSounds.delete(id);
    }
    const tempFile = this.nativeTempFiles.get(id);
    if (tempFile) {
      try { tempFile.delete(); } catch { /* ignore */ }
      this.nativeTempFiles.delete(id);
    }
  }

  private async syncNativeLayers(configs: AmbientLayerConfig[]): Promise<void> {
    const activeIds = new Set(configs.filter((c) => c.enabled).map((c) => c.id));

    // Remove stale layers
    for (const id of [...this.nativeSounds.keys()]) {
      if (!activeIds.has(id)) {
        await this.removeNativeLayer(id);
      }
    }

    // Add or update
    for (const config of configs) {
      if (!config.enabled) {
        await this.removeNativeLayer(config.id);
        continue;
      }
      const existing = this.nativeSounds.get(config.id);
      if (existing) {
        try { await existing.setVolumeAsync(config.volume); } catch { /* */ }
      } else {
        await this.createNativeLayer(config);
      }
    }
  }

  private async stopNative(): Promise<void> {
    for (const id of [...this.nativeSounds.keys()]) {
      await this.removeNativeLayer(id);
    }
  }
}
