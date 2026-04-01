import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAudioStore } from '@/src/state/useAudioStore';
import { usePresetStore } from '@/src/state/usePresetStore';
import { useResponsive } from '@/src/hooks/useResponsive';
import type { ExploreSettings } from '@/src/types/preset';
import {
  Screen,
  Card,
  SectionHeader,
  PrimaryButton,
  IconButton,
  PrimarySlider,
  SegmentedControl,
  WaveformView,
  SpectrumView,
  SavePresetModal,
  PresetBar,
  SympatheticStringsView,
  RoomVisualizer,
  LissajousView,
  SpectrogramView,
  IntervalBeatView,
  ToneBlendingView,
} from '@/src/components';
import type { QuickPreset } from '@/src/components';
import RotaryDial from '@/src/components/RotaryDial';
import ControlDrawer from '@/src/components/ControlDrawer';
import SnapshotButton from '@/src/components/SnapshotButton';
import { useSnapshotStore } from '@/src/state/useSnapshotStore';
import { useFrequencyDiscovery } from '@/src/hooks/useFrequencyDiscovery';
import { colors, useColors, spacing, typography, radius } from '@/src/theme';
import type { NoiseType, SourceMode, WaveformType, FrequencyScale, RoomPreset } from '@/src/audio';
import { SympatheticStringsEngine, ROOM_PRESETS, ROOM_LABELS, IntervalExplorerEngine, INTERVALS, detectInterval, MicrophoneEngine, freqToNote, GenerativeDriftEngine, ToneBlendingEngine, BLEND_PRESETS, BLEND_WAVEFORMS, BLEND_WAVEFORM_LABELS } from '@/src/audio';
import type { DriftBounds, DriftSpeed, BlendVoice, BlendWaveform } from '@/src/audio';

const WAVEFORMS = ['sine', 'square', 'saw', 'triangle'] as const;

const WAVEFORM_LABELS: Record<WaveformType, string> = {
  sine: 'Sine',
  square: 'Square',
  saw: 'Saw',
  triangle: 'Tri',
};

const NOISE_TYPES = ['white', 'pink', 'brown'] as const;
const NOISE_LABELS: Record<NoiseType, string> = {
  white: 'White',
  pink: 'Pink',
  brown: 'Brown',
};

const SOURCE_MODES = ['tone', 'noise', 'mic'] as const;
const SOURCE_MODE_LABELS: Record<SourceMode, string> = {
  tone: 'Tone',
  noise: 'Noise',
  mic: 'Mic',
};

const FREQ_SCALE_OPTIONS = ['linear', 'log'] as const;
const FREQ_SCALE_LABELS: Record<FrequencyScale, string> = {
  linear: 'Linear',
  log: 'Log',
};

const NOTE_PRESETS = [
  { label: 'A4', freq: 440 },
  { label: 'C4', freq: 261.63 },
  { label: 'E4', freq: 329.63 },
  { label: 'G4', freq: 392 },
] as const;

// ── Drift speed options ──────────────────────────────────────────────
const DRIFT_SPEEDS = ['slow', 'medium', 'fast'] as const;
const DRIFT_SPEED_LABELS: Record<DriftSpeed, string> = {
  slow: 'Slow',
  medium: 'Med',
  fast: 'Fast',
};

// ── Logarithmic frequency mapping ──────────────────────────────────
const LOG_MIN = Math.log(20);
const LOG_MAX = Math.log(2000);

/** Convert linear slider 0–1 to log frequency 20–2000 */
function logToFreq(t: number): number {
  return Math.round(Math.exp(LOG_MIN + t * (LOG_MAX - LOG_MIN)));
}

/** Convert frequency 20–2000 to linear slider 0–1 */
function freqToLog(f: number): number {
  return (Math.log(Math.max(20, f)) - LOG_MIN) / (LOG_MAX - LOG_MIN);
}

// ── Quick presets ─────────────────────────────────────────────────────
interface ExploreQuickPreset {
  sourceMode: SourceMode;
  waveform: WaveformType;
  noiseType: NoiseType;
  frequency: number;
  amplitude: number;
}

const EXPLORE_PRESETS: QuickPreset<ExploreQuickPreset>[] = [
  { label: 'Pure Sine',    settings: { sourceMode: 'tone',  waveform: 'sine',     noiseType: 'white', frequency: 440,  amplitude: 0.5  } },
  { label: 'Deep Bass',    settings: { sourceMode: 'tone',  waveform: 'sine',     noiseType: 'white', frequency: 80,   amplitude: 0.7  } },
  { label: 'Bright Square', settings: { sourceMode: 'tone', waveform: 'square',   noiseType: 'white', frequency: 800,  amplitude: 0.4  } },
  { label: 'Warm Saw',     settings: { sourceMode: 'tone',  waveform: 'saw',      noiseType: 'white', frequency: 220,  amplitude: 0.55 } },
  { label: 'Soft Triangle', settings: { sourceMode: 'tone', waveform: 'triangle', noiseType: 'white', frequency: 330,  amplitude: 0.5  } },
  { label: 'Pink Noise',   settings: { sourceMode: 'noise', waveform: 'sine',     noiseType: 'pink',  frequency: 440,  amplitude: 0.6  } },
  { label: 'Brown Noise',  settings: { sourceMode: 'noise', waveform: 'sine',     noiseType: 'brown', frequency: 440,  amplitude: 0.5  } },
];

// ── Lissajous ratio presets ──────────────────────────────────────
const LISSAJOUS_RATIOS = [
  { label: '1:1', a: 1, b: 1 },
  { label: '2:1', a: 2, b: 1 },
  { label: '3:2', a: 3, b: 2 },
  { label: '4:3', a: 4, b: 3 },
  { label: '5:4', a: 5, b: 4 },
  { label: '3:1', a: 3, b: 1 },
] as const;

// ── Interval Explorer presets ───────────────────────────────────
const INTERVAL_PRESETS = [
  { label: 'Unison',  ratio: 1      },
  { label: 'Oct',     ratio: 2      },
  { label: 'P5',      ratio: 3 / 2  },
  { label: 'P4',      ratio: 4 / 3  },
  { label: 'Maj3',    ratio: 5 / 4  },
  { label: 'Min3',    ratio: 6 / 5  },
  { label: 'Tri',     ratio: 45/32  },
  { label: 'Beat',    ratio: 1.005  }, // near-unison for audible beating
] as const;

/** Color tint based on frequency ratio complexity */
function lissajousColor(a: number, b: number): string {
  const ratio = a / b;
  // Simple ratios -> accent, complex -> highlight
  const simplicity = 1 / (Math.abs(ratio - Math.round(ratio)) + 0.1);
  if (simplicity > 5) return colors.accent;
  if (simplicity > 2) return '#60a5fa'; // blue
  return colors.highlight;
}

// ── Viz tabs ─────────────────────────────────────────────────────────
type ActiveViz = 'waveform' | 'spectrum' | 'spectrogram';
const VIZ_OPTIONS: ActiveViz[] = ['waveform', 'spectrum', 'spectrogram'];
const VIZ_LABELS: Record<ActiveViz, string> = {
  waveform: 'Wave',
  spectrum: 'Spectrum',
  spectrogram: 'Spectrogram',
};

export default function ExploreScreen() {
  const c = useColors();
  const {
    sourceMode, frequency, amplitude, waveform, noiseType, detune, pan, frequencyScale, harmonics, attack, release, isPlaying,
    roomEnabled, roomPreset, roomWetDry,
    setSourceMode, setFrequency, setAmplitude, setWaveform, setNoiseType,
    setDetune, setPan, setFrequencyScale, setHarmonic, setAttack, setRelease,
    setRoomEnabled, setRoomPreset, setRoomWetDry,
    setActiveSource,
    play, stop, reset,
  } = useAudioStore();

  const savePreset = usePresetStore((s) => s.savePreset);
  const [showSaveModal, setShowSaveModal] = useState(false);

  // ── Frequency discovery ────────────────────────────────────
  useFrequencyDiscovery({ frequency, isPlaying, source: 'explore' });

  // ── Layout: single-page, no-scroll ─────────────────────────────────
  const [activeViz, setActiveViz] = useState<ActiveViz>('waveform');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [vizWidth, setVizWidth] = useState(300);
  const [vizHeight, setVizHeight] = useState(200);

  const onVizLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setVizWidth(Math.floor(width));
    setVizHeight(Math.floor(height));
  }, []);

  // ── Lissajous state ──────────────────────────────────────────────
  const [lissajousEnabled, setLissajousEnabled] = useState(false);
  const [lissFreqA, setLissFreqA] = useState(300);
  const [lissFreqB, setLissFreqB] = useState(200);
  const [lissPhase, setLissPhase] = useState(Math.PI / 2);
  const [lissTrail, setLissTrail] = useState(800);
  const [lissSyncTone, setLissSyncTone] = useState(false);

  const handleSavePreset = useCallback(async (name: string) => {
    const settings: ExploreSettings = {
      sourceMode, frequency, amplitude, waveform, noiseType,
      detune, pan, frequencyScale, harmonics, attack, release,
      roomEnabled, roomPreset, roomWetDry,
    };
    await savePreset(name, 'explore', settings);
    setShowSaveModal(false);
    Alert.alert('Saved', `Preset "${name || 'Explore Preset'}" saved to Library.`);
  }, [sourceMode, frequency, amplitude, waveform, noiseType, detune, pan, frequencyScale, harmonics, attack, release, roomEnabled, roomPreset, roomWetDry, savePreset]);

  // Ensure presets are loaded
  const presetLoaded = usePresetStore((s) => s.loaded);
  const loadPresets = usePresetStore((s) => s.loadPresets);
  useEffect(() => {
    if (!presetLoaded) loadPresets();
  }, [presetLoaded, loadPresets]);

  // Load preset from Library
  const pendingLoad = usePresetStore((s) => s.pendingLoad);
  const setPendingLoad = usePresetStore((s) => s.setPendingLoad);
  useEffect(() => {
    if (pendingLoad && pendingLoad.type === 'explore') {
      const s = pendingLoad.settings as ExploreSettings;
      setSourceMode(s.sourceMode);
      setFrequency(s.frequency);
      setAmplitude(s.amplitude);
      setWaveform(s.waveform);
      setNoiseType(s.noiseType);
      if (s.detune != null) setDetune(s.detune);
      if (s.pan != null) setPan(s.pan);
      if (s.frequencyScale != null) setFrequencyScale(s.frequencyScale);
      if (s.harmonics != null) {
        s.harmonics.forEach((v, i) => setHarmonic(i, v));
      } else {
        for (let i = 0; i < 3; i++) setHarmonic(i, 0);
      }
      setAttack(s.attack ?? 0.05);
      setRelease(s.release ?? 0.1);
      setRoomEnabled(s.roomEnabled ?? false);
      if (s.roomPreset) setRoomPreset(s.roomPreset);
      if (s.roomWetDry != null) setRoomWetDry(s.roomWetDry);
      setPendingLoad(null);
    }
  }, [pendingLoad, setPendingLoad, setSourceMode, setFrequency, setAmplitude, setWaveform, setNoiseType, setDetune, setPan, setFrequencyScale, setHarmonic, setAttack, setRelease, setRoomEnabled, setRoomPreset, setRoomWetDry]);

  // Restore snapshot from Library
  const pendingRestore = useSnapshotStore((s) => s.pendingRestore);
  const setPendingRestore = useSnapshotStore((s) => s.setPendingRestore);
  useEffect(() => {
    if (pendingRestore && (pendingRestore.source === 'explore' || pendingRestore.source === 'cymatics')) {
      const s = pendingRestore.settings as ExploreSettings;
      setSourceMode(s.sourceMode);
      setFrequency(s.frequency);
      setAmplitude(s.amplitude);
      setWaveform(s.waveform);
      setNoiseType(s.noiseType);
      if (s.detune != null) setDetune(s.detune);
      if (s.pan != null) setPan(s.pan);
      if (s.frequencyScale) setFrequencyScale(s.frequencyScale);
      if (s.harmonics) { for (let i = 0; i < 3; i++) setHarmonic(i, s.harmonics[i]); }
      if (s.attack != null) setAttack(s.attack);
      if (s.release != null) setRelease(s.release);
      setRoomEnabled(s.roomEnabled ?? false);
      if (s.roomPreset) setRoomPreset(s.roomPreset);
      if (s.roomWetDry != null) setRoomWetDry(s.roomWetDry);
      setPendingRestore(null);
    }
  }, [pendingRestore, setPendingRestore, setSourceMode, setFrequency, setAmplitude, setWaveform, setNoiseType, setDetune, setPan, setFrequencyScale, setHarmonic, setAttack, setRelease, setRoomEnabled, setRoomPreset, setRoomWetDry]);

  const handleQuickPreset = useCallback((p: ExploreQuickPreset) => {
    setSourceMode(p.sourceMode);
    setWaveform(p.waveform);
    setNoiseType(p.noiseType);
    setFrequency(p.frequency);
    setAmplitude(p.amplitude);
    // Reset detune, pan, harmonics, and envelope for quick presets
    setDetune(0);
    setPan(0);
    for (let i = 0; i < 3; i++) setHarmonic(i, 0);
    setAttack(0.05);
    setRelease(0.1);
    setRoomEnabled(false);
  }, [setSourceMode, setWaveform, setNoiseType, setFrequency, setAmplitude, setDetune, setPan, setHarmonic, setAttack, setRelease, setRoomEnabled]);

  // Determine active quick preset index
  const activePresetIndex = EXPLORE_PRESETS.findIndex((p) => {
    const s = p.settings;
    return s.sourceMode === sourceMode
      && s.frequency === frequency
      && s.amplitude === amplitude
      && s.waveform === waveform
      && s.noiseType === noiseType
      && detune === 0
      && pan === 0
      && harmonics[0] === 0 && harmonics[1] === 0 && harmonics[2] === 0
      && attack === 0.05 && release === 0.1
      && !roomEnabled;
  });

  const { contentWidth } = useResponsive();

  // ── Lissajous: sync Freq A to tone generator ────────────────────
  useEffect(() => {
    if (lissSyncTone && sourceMode === 'tone') {
      setLissFreqA(frequency);
    }
  }, [lissSyncTone, sourceMode, frequency]);

  const lissColor = useMemo(() => lissajousColor(lissFreqA, lissFreqB), [lissFreqA, lissFreqB]);

  const handleLissajousRatio = useCallback((a: number, b: number) => {
    const baseFreq = lissSyncTone && sourceMode === 'tone' ? frequency : lissFreqA;
    setLissFreqA(Math.round(baseFreq));
    setLissFreqB(Math.round(baseFreq * b / a));
  }, [lissSyncTone, sourceMode, frequency, lissFreqA]);

  // ── Interval Explorer ───────────────────────────────────────────
  const [intervalEnabled, setIntervalEnabled] = useState(false);
  const [intervalFreq1, setIntervalFreq1] = useState(440);
  const [intervalFreq2, setIntervalFreq2] = useState(442);
  const [intervalVolume, setIntervalVol] = useState(0.35);
  const intervalEngineRef = useRef<IntervalExplorerEngine | null>(null);

  const getIntervalEngine = useCallback(() => {
    if (!intervalEngineRef.current) {
      intervalEngineRef.current = new IntervalExplorerEngine();
    }
    return intervalEngineRef.current;
  }, []);

  const intervalPlaying = intervalEnabled && isPlaying;

  // Start / stop interval engine with playback
  useEffect(() => {
    const engine = getIntervalEngine();
    if (intervalPlaying) {
      if (!engine.isActive()) {
        engine.start(intervalFreq1, intervalFreq2, intervalVolume);
      }
    } else {
      engine.stop();
    }
  }, [intervalPlaying, getIntervalEngine]);

  // Update frequencies live
  useEffect(() => {
    const engine = getIntervalEngine();
    if (engine.isActive()) {
      engine.setFreq1(intervalFreq1);
    }
  }, [intervalFreq1, getIntervalEngine]);

  useEffect(() => {
    const engine = getIntervalEngine();
    if (engine.isActive()) {
      engine.setFreq2(intervalFreq2);
    }
  }, [intervalFreq2, getIntervalEngine]);

  // Update volume live
  useEffect(() => {
    const engine = getIntervalEngine();
    if (engine.isActive()) {
      engine.setVolume(intervalVolume);
    }
  }, [intervalVolume, getIntervalEngine]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      intervalEngineRef.current?.dispose();
    };
  }, []);

  // ── Microphone Input ─────────────────────────────────────────────
  const micEngineRef = useRef<MicrophoneEngine | null>(null);
  const [micAnalyser, setMicAnalyser] = useState<AnalyserNode | null>(null);
  const [micFreq, setMicFreq] = useState<number | null>(null);
  const [micNote, setMicNote] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const micPitchRafRef = useRef<number | null>(null);

  const getMicEngine = useCallback(() => {
    if (!micEngineRef.current) {
      micEngineRef.current = new MicrophoneEngine();
    }
    return micEngineRef.current;
  }, []);

  // Start/stop mic based on playback + source mode
  useEffect(() => {
    const engine = getMicEngine();
    if (isPlaying && sourceMode === 'mic') {
      if (!engine.isActive()) {
        setMicError(null);
        engine.start().then(() => {
          setMicAnalyser(engine.getAnalyser());
        }).catch((err) => {
          setMicError(err?.message || 'Microphone access denied');
          setMicAnalyser(null);
        });
      }
    } else {
      if (engine.isActive()) {
        engine.stop();
        setMicAnalyser(null);
        setMicFreq(null);
        setMicNote(null);
      }
    }
  }, [isPlaying, sourceMode, getMicEngine]);

  // Pitch detection loop while mic is active
  useEffect(() => {
    if (!micAnalyser) {
      if (micPitchRafRef.current != null) {
        cancelAnimationFrame(micPitchRafRef.current);
        micPitchRafRef.current = null;
      }
      return;
    }

    const engine = getMicEngine();
    let frameCount = 0;

    const tick = () => {
      frameCount++;
      // Detect pitch every ~6 frames (~10 Hz) to avoid excessive computation
      if (frameCount % 6 === 0) {
        const freq = engine.getDominantFrequency();
        setMicFreq(freq);
        if (freq) {
          const note = freqToNote(freq);
          setMicNote(note ? `${note.name}${note.octave} ${note.cents >= 0 ? '+' : ''}${note.cents}¢` : null);
        } else {
          setMicNote(null);
        }
      }
      micPitchRafRef.current = requestAnimationFrame(tick);
    };

    micPitchRafRef.current = requestAnimationFrame(tick);

    return () => {
      if (micPitchRafRef.current != null) {
        cancelAnimationFrame(micPitchRafRef.current);
        micPitchRafRef.current = null;
      }
    };
  }, [micAnalyser, getMicEngine]);

  // Cleanup mic on unmount
  useEffect(() => {
    return () => {
      micEngineRef.current?.dispose();
    };
  }, []);

  const beatFreq = Math.abs(intervalFreq1 - intervalFreq2);
  const intervalName = useMemo(() => detectInterval(intervalFreq1, intervalFreq2), [intervalFreq1, intervalFreq2]);

  const handleIntervalPreset = useCallback((ratio: number) => {
    setIntervalFreq2(Math.round(intervalFreq1 * ratio));
  }, [intervalFreq1]);

  // ── Sympathetic Strings ─────────────────────────────────────────
  const [stringsEnabled, setStringsEnabled] = useState(false);
  const [stringsVolume, setStringsVolume] = useState(0.15);
  const [stringsResonance, setStringsResonance] = useState<number[]>([]);
  const stringsEngineRef = useRef<SympatheticStringsEngine | null>(null);

  const getStringsEngine = useCallback(() => {
    if (!stringsEngineRef.current) {
      stringsEngineRef.current = new SympatheticStringsEngine();
    }
    return stringsEngineRef.current;
  }, []);

  const stringNotes = useMemo(() => {
    const engine = getStringsEngine();
    return engine.getStrings();
  }, [getStringsEngine]);

  // Start/stop strings engine with playback
  useEffect(() => {
    const engine = getStringsEngine();
    if (isPlaying && stringsEnabled && sourceMode === 'tone') {
      engine.start();
      engine.setVolume(stringsVolume);
      engine.updateFrequency(frequency);
      setStringsResonance(engine.getResonanceState());
    } else {
      engine.silence();
      // Small delay before stopping to let the silence ramp complete
      const t = setTimeout(() => {
        if (!isPlaying || !stringsEnabled || sourceMode !== 'tone') {
          engine.stop();
          setStringsResonance(stringNotes.map(() => 0));
        }
      }, 100);
      return () => clearTimeout(t);
    }
  }, [isPlaying, stringsEnabled, sourceMode, getStringsEngine, stringNotes]);

  // Update resonance when frequency changes during playback
  useEffect(() => {
    const engine = getStringsEngine();
    if (isPlaying && stringsEnabled && sourceMode === 'tone' && engine.isActive()) {
      engine.updateFrequency(frequency);
      setStringsResonance(engine.getResonanceState());
    }
  }, [frequency, isPlaying, stringsEnabled, sourceMode, getStringsEngine]);

  // Update volume live
  useEffect(() => {
    const engine = getStringsEngine();
    if (engine.isActive()) {
      engine.setVolume(stringsVolume);
    }
  }, [stringsVolume, getStringsEngine]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stringsEngineRef.current?.dispose();
    };
  }, []);

  // ── Generative Drift ─────────────────────────────────────────────
  const [driftEnabled, setDriftEnabled] = useState(false);
  const [driftSpeed, setDriftSpeed] = useState<DriftSpeed>('medium');
  const [driftBreathing, setDriftBreathing] = useState(false);
  const [driftFreqMin, setDriftFreqMin] = useState(200);
  const [driftFreqMax, setDriftFreqMax] = useState(400);
  const [driftAmpMin, setDriftAmpMin] = useState(0.3);
  const [driftAmpMax, setDriftAmpMax] = useState(0.6);
  const [driftPanMin, setDriftPanMin] = useState(-0.5);
  const [driftPanMax, setDriftPanMax] = useState(0.5);
  const driftEngineRef = useRef<GenerativeDriftEngine | null>(null);

  const getDriftEngine = useCallback(() => {
    if (!driftEngineRef.current) {
      driftEngineRef.current = new GenerativeDriftEngine();
    }
    return driftEngineRef.current;
  }, []);

  const driftBounds: DriftBounds = useMemo(() => ({
    freqMin: driftFreqMin,
    freqMax: driftFreqMax,
    ampMin: driftAmpMin,
    ampMax: driftAmpMax,
    panMin: driftPanMin,
    panMax: driftPanMax,
  }), [driftFreqMin, driftFreqMax, driftAmpMin, driftAmpMax, driftPanMin, driftPanMax]);

  // Start/stop drift with playback
  useEffect(() => {
    const engine = getDriftEngine();
    if (isPlaying && driftEnabled && sourceMode === 'tone') {
      engine.start(driftBounds, driftSpeed, driftBreathing, {
        setFrequency,
        setAmplitude,
        setPan,
      });
    } else {
      engine.stop();
    }
  }, [isPlaying, driftEnabled, sourceMode, getDriftEngine, driftBounds, driftSpeed, driftBreathing, setFrequency, setAmplitude, setPan]);

  // Live-update bounds, speed, and breathing while running
  useEffect(() => {
    const engine = getDriftEngine();
    if (engine.isActive()) {
      engine.updateBounds(driftBounds);
    }
  }, [driftBounds, getDriftEngine]);

  useEffect(() => {
    const engine = getDriftEngine();
    if (engine.isActive()) {
      engine.updateSpeed(driftSpeed);
    }
  }, [driftSpeed, getDriftEngine]);

  useEffect(() => {
    const engine = getDriftEngine();
    if (engine.isActive()) {
      engine.updateBreathing(driftBreathing);
    }
  }, [driftBreathing, getDriftEngine]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      driftEngineRef.current?.dispose();
    };
  }, []);

  // ── Tone Blending ────────────────────────────────────────────────
  const DEFAULT_BLEND_VOICES: BlendVoice[] = [
    { frequency: 261.63, waveform: 'sine', volume: 0.5, muted: false, solo: false },
    { frequency: 329.63, waveform: 'sine', volume: 0.45, muted: false, solo: false },
    { frequency: 392,    waveform: 'sine', volume: 0.45, muted: false, solo: false },
  ];
  const [blendEnabled, setBlendEnabled] = useState(false);
  const [blendVoices, setBlendVoices] = useState<BlendVoice[]>(DEFAULT_BLEND_VOICES);
  const [blendAnalysers, setBlendAnalysers] = useState<(AnalyserNode | null)[]>([null, null, null]);
  const [blendCompositeAnalyser, setBlendCompositeAnalyser] = useState<AnalyserNode | null>(null);
  const blendEngineRef = useRef<ToneBlendingEngine | null>(null);

  const getBlendEngine = useCallback(() => {
    if (!blendEngineRef.current) {
      blendEngineRef.current = new ToneBlendingEngine();
    }
    return blendEngineRef.current;
  }, []);

  const blendPlaying = blendEnabled && isPlaying;

  // Start/stop blend engine with playback
  useEffect(() => {
    const engine = getBlendEngine();
    if (blendPlaying) {
      if (!engine.isActive()) {
        engine.start(blendVoices);
        setBlendAnalysers([
          engine.getVoiceAnalyser(0),
          engine.getVoiceAnalyser(1),
          engine.getVoiceAnalyser(2),
        ]);
        setBlendCompositeAnalyser(engine.getCompositeAnalyser());
      }
    } else {
      engine.stop();
      setBlendAnalysers([null, null, null]);
      setBlendCompositeAnalyser(null);
    }
  }, [blendPlaying, getBlendEngine]);

  // Update voices live
  useEffect(() => {
    const engine = getBlendEngine();
    if (engine.isActive()) {
      for (let i = 0; i < blendVoices.length; i++) {
        engine.updateVoice(i, blendVoices[i], blendVoices);
      }
    }
  }, [blendVoices, getBlendEngine]);

  const updateBlendVoice = useCallback((index: number, updates: Partial<BlendVoice>) => {
    setBlendVoices((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  }, []);

  const toggleBlendMute = useCallback((index: number) => {
    setBlendVoices((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], muted: !next[index].muted };
      return next;
    });
  }, []);

  const toggleBlendSolo = useCallback((index: number) => {
    setBlendVoices((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], solo: !next[index].solo };
      return next;
    });
  }, []);

  const applyBlendPreset = useCallback((preset: typeof BLEND_PRESETS[number]) => {
    setBlendVoices(preset.voices.map((v) => ({
      ...v,
      muted: false,
      solo: false,
    })));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      blendEngineRef.current?.dispose();
    };
  }, []);

  const handlePlay = useCallback(async () => {
    try {
      setActiveSource('explore');
      await play();
    } catch (e) {
      Alert.alert('Audio Error', 'Could not start playback.');
    }
  }, [play, setActiveSource]);

  const handleStop = useCallback(async () => {
    await stop();
  }, [stop]);

  const handleReset = useCallback(() => {
    reset();
  }, [reset]);

  // Log frequency slider handlers
  const logSliderValue = useMemo(() => freqToLog(frequency), [frequency]);
  const handleLogFrequency = useCallback((t: number) => {
    setFrequency(logToFreq(t));
  }, [setFrequency]);

  const vizBadge = sourceMode === 'mic'
    ? (micFreq ? `${Math.round(micFreq)} Hz` : 'Listening...')
    : sourceMode === 'noise'
    ? `${NOISE_LABELS[noiseType]} noise`
    : `${WAVEFORM_LABELS[waveform]} · ${Math.round(frequency)} Hz`;

  // Pan label helper
  const panLabel = pan === 0 ? 'Center' : pan < 0 ? `${Math.round(Math.abs(pan) * 100)}% L` : `${Math.round(pan * 100)}% R`;

  // ── Determine if an optional viz mode is replacing the main viz ──
  const hasOverrideViz = lissajousEnabled || blendEnabled || stringsEnabled || intervalEnabled;

  // ── Render the active visualization ──────────────────────────────
  const renderActiveViz = () => {
    if (vizWidth < 10 || vizHeight < 10) return null;

    // Optional viz modes override the main viz area
    if (lissajousEnabled) {
      return (
        <LissajousView
          freqA={lissFreqA}
          freqB={lissFreqB}
          phase={lissPhase}
          trailLength={lissTrail}
          color={lissColor}
          width={vizWidth}
          height={vizHeight}
          isPlaying={lissajousEnabled}
        />
      );
    }

    if (blendEnabled) {
      return (
        <ToneBlendingView
          voices={blendVoices}
          voiceAnalysers={blendAnalysers}
          compositeAnalyser={blendCompositeAnalyser}
          width={vizWidth}
          height={vizHeight}
          isPlaying={blendPlaying}
        />
      );
    }

    if (stringsEnabled && sourceMode === 'tone') {
      return (
        <SympatheticStringsView
          strings={stringNotes}
          resonance={stringsResonance}
          isPlaying={isPlaying}
        />
      );
    }

    if (intervalEnabled) {
      return (
        <IntervalBeatView
          freq1={intervalFreq1}
          freq2={intervalFreq2}
          width={vizWidth}
          height={vizHeight}
          isPlaying={intervalPlaying}
        />
      );
    }

    if (roomEnabled && isPlaying) {
      return (
        <RoomVisualizer
          preset={roomPreset}
          wetDry={roomWetDry}
          isPlaying={isPlaying}
        />
      );
    }

    // Default: one of the three standard visualizations
    switch (activeViz) {
      case 'waveform':
        return (
          <WaveformView
            waveform={waveform}
            frequency={frequency}
            amplitude={amplitude}
            width={vizWidth}
            height={vizHeight}
            isPlaying={isPlaying}
            noiseType={sourceMode === 'noise' ? noiseType : null}
            analyserNode={sourceMode === 'mic' ? micAnalyser : null}
          />
        );
      case 'spectrum':
        return (
          <SpectrumView
            frequency={frequency}
            amplitude={amplitude}
            width={vizWidth}
            height={vizHeight}
            isPlaying={isPlaying}
            noiseType={sourceMode === 'noise' ? noiseType : null}
            analyserNode={sourceMode === 'mic' ? micAnalyser : null}
          />
        );
      case 'spectrogram':
        return (
          <SpectrogramView
            frequency={frequency}
            amplitude={amplitude}
            width={vizWidth}
            height={vizHeight}
            isPlaying={isPlaying}
            noiseType={sourceMode === 'noise' ? noiseType : null}
            analyserNode={sourceMode === 'mic' ? micAnalyser : null}
          />
        );
    }
  };

  // ── Viz label for the badge ──────────────────────────────────────
  const vizOverrideLabel = lissajousEnabled
    ? 'Lissajous'
    : blendEnabled
    ? 'Tone Blending'
    : stringsEnabled && sourceMode === 'tone'
    ? 'Sympathetic Strings'
    : intervalEnabled
    ? 'Interval Explorer'
    : roomEnabled && isPlaying
    ? 'Room Reverb'
    : null;

  return (
    <Screen>
      <View style={styles.root}>
        {/* ── Row 1: PresetBar ────────────────────────────────── ~40pt */}
        <PresetBar
          presets={EXPLORE_PRESETS}
          onSelect={handleQuickPreset}
          activeIndex={activePresetIndex >= 0 ? activePresetIndex : null}
        />

        {/* ── Row 2: Source mode + Waveform selector ─────────── ~36pt */}
        <View style={styles.topControlsRow}>
          <SegmentedControl
            options={SOURCE_MODES}
            selected={sourceMode}
            onSelect={setSourceMode}
            labels={SOURCE_MODE_LABELS}
          />
          {sourceMode === 'tone' && (
            <SegmentedControl
              options={WAVEFORMS}
              selected={waveform}
              onSelect={setWaveform}
              labels={WAVEFORM_LABELS}
            />
          )}
          {sourceMode === 'noise' && (
            <SegmentedControl
              options={NOISE_TYPES}
              selected={noiseType}
              onSelect={setNoiseType}
              labels={NOISE_LABELS}
            />
          )}
          {sourceMode === 'mic' && micError && (
            <Text style={styles.micErrorInline} numberOfLines={1}>{micError}</Text>
          )}
          {sourceMode === 'mic' && isPlaying && micAnalyser && (
            <View style={styles.micActiveRowInline}>
              <View style={styles.micDot} />
              <Text style={styles.micActiveLabel}>{micNote || 'Listening...'}</Text>
            </View>
          )}
        </View>

        {/* ── Row 3: Active Visualization (flex: 1) ──────────────── */}
        <View style={[styles.vizArea, { backgroundColor: c.background }]} onLayout={onVizLayout}>
          <View style={styles.vizBadgeRow}>
            <Text style={[styles.vizBadgeText, { backgroundColor: c.surfaceElevated }]}>
              {vizOverrideLabel || vizBadge}
            </Text>
          </View>
          <View style={styles.vizContent}>
            {renderActiveViz()}
          </View>
        </View>

        {/* ── Row 4: Viz tabs ─────────────────────────────────── ~32pt */}
        {!hasOverrideViz && (
          <View style={styles.vizTabBar}>
            {VIZ_OPTIONS.map((opt) => (
              <Pressable
                key={opt}
                style={[styles.vizTab, activeViz === opt && styles.vizTabActive, activeViz === opt && { backgroundColor: c.surfaceElevated }]}
                onPress={() => setActiveViz(opt)}
              >
                <Text style={[styles.vizTabText, activeViz === opt && styles.vizTabTextActive]}>
                  {VIZ_LABELS[opt]}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
        {hasOverrideViz && (
          <View style={styles.vizTabBar}>
            <Text style={styles.vizTabOverrideHint}>
              {vizOverrideLabel} active
            </Text>
          </View>
        )}

        {/* ── Row 5: Dials + Play/Stop ────────────────────────── ~100pt */}
        <View style={styles.controlDials}>
          <RotaryDial
            label="Freq"
            value={frequency}
            onValueChange={setFrequency}
            min={20}
            max={2000}
            step={1}
            formatValue={(v) => `${Math.round(v)} Hz`}
            disabled={sourceMode !== 'tone'}
          />
          <RotaryDial
            label="Amp"
            value={amplitude}
            onValueChange={setAmplitude}
            min={0}
            max={1}
            step={0.01}
            formatValue={(v) => `${Math.round(v * 100)}%`}
            disabled={sourceMode === 'mic'}
          />
          <Pressable
            style={[styles.playStopButton, { backgroundColor: c.surfaceElevated }, isPlaying && styles.playStopButtonActive]}
            onPress={isPlaying ? handleStop : handlePlay}
          >
            <Text style={[styles.playStopText, isPlaying && styles.playStopTextActive, isPlaying && { color: c.background }]}>
              {isPlaying ? 'STOP' : 'PLAY'}
            </Text>
          </Pressable>
          <RotaryDial
            label="Pan"
            value={pan}
            onValueChange={setPan}
            min={-1}
            max={1}
            step={0.01}
            formatValue={() => panLabel}
            disabled={sourceMode === 'mic'}
          />
          <View style={styles.actionIcons}>
            <IconButton variant="outline" onPress={handleReset}>
              <Text style={styles.iconText}>↺</Text>
            </IconButton>
            <SnapshotButton
              source="explore"
              disabled={!isPlaying}
              defaultName={sourceMode === 'noise' ? `${noiseType} noise` : `${waveform} ${Math.round(frequency)} Hz`}
              getSettings={() => ({
                sourceMode, frequency, amplitude, waveform, noiseType,
                detune, pan, frequencyScale, harmonics, attack, release,
                roomEnabled, roomPreset, roomWetDry,
              })}
            />
            <IconButton variant="filled" onPress={() => setShowSaveModal(true)}>
              <Text style={[styles.iconFilledText, { color: c.background }]}>♡</Text>
            </IconButton>
          </View>
        </View>

        {/* ── Row 6: Modules button ───────────────────────────── ~36pt */}
        <Pressable
          style={[styles.modulesButton, { backgroundColor: c.surfaceElevated }]}
          onPress={() => setDrawerOpen(true)}
        >
          <Text style={styles.modulesButtonText}>Modules</Text>
          <Text style={styles.modulesChevron}>▴</Text>
        </Pressable>
      </View>

      {/* ── Control Drawer ───────────────────────────────────────── */}
      <ControlDrawer
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Modules"
      >
        {/* Harmonics — tone mode only */}
        {sourceMode === 'tone' && (
          <Card style={styles.drawerCard}>
            <SectionHeader title="HARMONICS" label />
            <PrimarySlider
              label="2nd (2x)"
              value={harmonics[0]}
              onValueChange={(v) => setHarmonic(0, v)}
              min={0}
              max={1}
              step={0.01}
              formatValue={(v) => `${Math.round(v * 100)}%`}
            />
            <PrimarySlider
              label="3rd (3x)"
              value={harmonics[1]}
              onValueChange={(v) => setHarmonic(1, v)}
              min={0}
              max={1}
              step={0.01}
              formatValue={(v) => `${Math.round(v * 100)}%`}
              style={styles.drawerSlider}
            />
            <PrimarySlider
              label="4th (4x)"
              value={harmonics[2]}
              onValueChange={(v) => setHarmonic(2, v)}
              min={0}
              max={1}
              step={0.01}
              formatValue={(v) => `${Math.round(v * 100)}%`}
              style={styles.drawerSlider}
            />
          </Card>
        )}

        {/* Envelope */}
        {sourceMode !== 'mic' && (
          <Card style={styles.drawerCard}>
            <SectionHeader title="ENVELOPE" label />
            <PrimarySlider
              label="Attack"
              value={attack}
              onValueChange={setAttack}
              min={0}
              max={2}
              step={0.01}
              formatValue={(v) => v < 0.01 ? '0 s' : `${v.toFixed(2)} s`}
            />
            <PrimarySlider
              label="Release"
              value={release}
              onValueChange={setRelease}
              min={0}
              max={2}
              step={0.01}
              formatValue={(v) => v < 0.01 ? '0 s' : `${v.toFixed(2)} s`}
              style={styles.drawerSlider}
            />
          </Card>
        )}

        {/* Detune — tone mode only */}
        {sourceMode === 'tone' && (
          <Card style={styles.drawerCard}>
            <SectionHeader title="DETUNE" label />
            <PrimarySlider
              label="Detune"
              value={detune}
              onValueChange={setDetune}
              min={-100}
              max={100}
              step={1}
              formatValue={(v) => `${v > 0 ? '+' : ''}${Math.round(v)} cents`}
            />
          </Card>
        )}

        {/* Room Reverb */}
        {sourceMode !== 'mic' && (
          <Card style={styles.drawerCard}>
            <View style={styles.drawerToggleRow}>
              <Text style={styles.controlLabel}>Room Reverb</Text>
              <PrimaryButton
                title={roomEnabled ? 'ON' : 'OFF'}
                variant={roomEnabled ? 'filled' : 'ghost'}
                onPress={() => setRoomEnabled(!roomEnabled)}
                style={styles.moduleToggle}
              />
            </View>
            {roomEnabled && (
              <>
                <SegmentedControl
                  options={ROOM_PRESETS}
                  selected={roomPreset}
                  onSelect={setRoomPreset}
                  labels={ROOM_LABELS}
                />
                <PrimarySlider
                  label="Wet / Dry"
                  value={roomWetDry}
                  onValueChange={setRoomWetDry}
                  min={0}
                  max={1}
                  step={0.01}
                  formatValue={(v) => `${Math.round(v * 100)}%`}
                  style={styles.drawerSlider}
                />
              </>
            )}
          </Card>
        )}

        {/* ── Modules toggles ─────────────────────────────────── */}
        <Card style={styles.drawerCard}>
          <SectionHeader title="MODULES" label />

          {/* Lissajous */}
          <View style={styles.drawerToggleRow}>
            <Text style={styles.controlLabel}>Lissajous</Text>
            <PrimaryButton
              title={lissajousEnabled ? 'ON' : 'OFF'}
              variant={lissajousEnabled ? 'filled' : 'ghost'}
              onPress={() => setLissajousEnabled((v) => !v)}
              style={styles.moduleToggle}
            />
          </View>
          {lissajousEnabled && (
            <View style={styles.moduleExpandedBlock}>
              {/* Ratio presets */}
              <View style={styles.presetRow}>
                {LISSAJOUS_RATIOS.map((r) => (
                  <PrimaryButton
                    key={r.label}
                    title={r.label}
                    variant={
                      Math.abs(lissFreqA / lissFreqB - r.a / r.b) < 0.02
                        ? 'filled'
                        : 'ghost'
                    }
                    onPress={() => handleLissajousRatio(r.a, r.b)}
                    style={styles.presetButton}
                  />
                ))}
              </View>
              {sourceMode === 'tone' && (
                <View style={styles.drawerToggleRow}>
                  <Text style={styles.controlLabel}>Sync A to Tone</Text>
                  <PrimaryButton
                    title={lissSyncTone ? 'ON' : 'OFF'}
                    variant={lissSyncTone ? 'filled' : 'ghost'}
                    onPress={() => setLissSyncTone((v) => !v)}
                    style={styles.moduleToggle}
                  />
                </View>
              )}
              <PrimarySlider
                label="Freq A (X)"
                value={lissFreqA}
                onValueChange={(v) => { if (!lissSyncTone) setLissFreqA(Math.round(v)); }}
                min={20}
                max={1000}
                step={1}
                formatValue={(v) => `${Math.round(v)} Hz`}
              />
              <PrimarySlider
                label="Freq B (Y)"
                value={lissFreqB}
                onValueChange={(v) => setLissFreqB(Math.round(v))}
                min={20}
                max={1000}
                step={1}
                formatValue={(v) => `${Math.round(v)} Hz`}
                style={styles.drawerSlider}
              />
              <PrimarySlider
                label="Phase"
                value={lissPhase}
                onValueChange={setLissPhase}
                min={0}
                max={Math.PI * 2}
                step={0.01}
                formatValue={(v) => `${Math.round((v / Math.PI) * 180)}°`}
                style={styles.drawerSlider}
              />
              <PrimarySlider
                label="Trail"
                value={lissTrail}
                onValueChange={(v) => setLissTrail(Math.round(v))}
                min={100}
                max={2000}
                step={10}
                formatValue={(v) => `${Math.round(v)}`}
                style={styles.drawerSlider}
              />
            </View>
          )}

          {/* Sympathetic Strings — tone mode only */}
          {sourceMode === 'tone' && (
            <>
              <View style={styles.drawerToggleRow}>
                <Text style={styles.controlLabel}>Sympathetic Strings</Text>
                <PrimaryButton
                  title={stringsEnabled ? 'ON' : 'OFF'}
                  variant={stringsEnabled ? 'filled' : 'ghost'}
                  onPress={() => setStringsEnabled((v) => !v)}
                  style={styles.moduleToggle}
                />
              </View>
              {stringsEnabled && (
                <View style={styles.moduleExpandedBlock}>
                  <PrimarySlider
                    label="Sympathetic Volume"
                    value={stringsVolume}
                    onValueChange={setStringsVolume}
                    min={0}
                    max={0.5}
                    step={0.01}
                    formatValue={(v) => `${Math.round(v * 100)}%`}
                  />
                </View>
              )}
            </>
          )}

          {/* Interval Explorer */}
          <View style={styles.drawerToggleRow}>
            <Text style={styles.controlLabel}>Interval Explorer</Text>
            <PrimaryButton
              title={intervalEnabled ? 'ON' : 'OFF'}
              variant={intervalEnabled ? 'filled' : 'ghost'}
              onPress={() => setIntervalEnabled((v) => !v)}
              style={styles.moduleToggle}
            />
          </View>
          {intervalEnabled && (
            <View style={styles.moduleExpandedBlock}>
              {/* Beat info display */}
              <View style={styles.intervalInfoRow}>
                <View style={styles.intervalInfoBlock}>
                  <Text style={styles.intervalInfoLabel}>Beat Frequency</Text>
                  <Text style={styles.intervalInfoValue}>
                    {beatFreq < 0.1 ? '0' : beatFreq.toFixed(1)} Hz
                  </Text>
                </View>
                <View style={styles.intervalInfoBlock}>
                  <Text style={styles.intervalInfoLabel}>Interval</Text>
                  <Text style={[styles.intervalInfoValue, { color: intervalName ? colors.accent : colors.textMuted }]}>
                    {intervalName ?? '---'}
                  </Text>
                </View>
              </View>
              <View style={styles.intervalPresetWrap}>
                {INTERVAL_PRESETS.map((p) => {
                  const targetF2 = Math.round(intervalFreq1 * p.ratio);
                  const isActive = Math.abs(intervalFreq2 - targetF2) < 2;
                  return (
                    <PrimaryButton
                      key={p.label}
                      title={p.label}
                      variant={isActive ? 'filled' : 'ghost'}
                      onPress={() => handleIntervalPreset(p.ratio)}
                      style={styles.intervalPresetBtn}
                    />
                  );
                })}
              </View>
              <PrimarySlider
                label="Tone 1"
                value={intervalFreq1}
                onValueChange={(v) => setIntervalFreq1(Math.round(v))}
                min={80}
                max={1000}
                step={1}
                formatValue={(v) => `${Math.round(v)} Hz`}
                style={styles.drawerSlider}
              />
              <PrimarySlider
                label="Tone 2"
                value={intervalFreq2}
                onValueChange={(v) => setIntervalFreq2(Math.round(v))}
                min={80}
                max={1000}
                step={1}
                formatValue={(v) => `${Math.round(v)} Hz`}
                style={styles.drawerSlider}
              />
              <PrimarySlider
                label="Volume"
                value={intervalVolume}
                onValueChange={setIntervalVol}
                min={0}
                max={0.8}
                step={0.01}
                formatValue={(v) => `${Math.round(v * 100)}%`}
                style={styles.drawerSlider}
              />
            </View>
          )}

          {/* Tone Blending */}
          <View style={styles.drawerToggleRow}>
            <Text style={styles.controlLabel}>Tone Blending</Text>
            <PrimaryButton
              title={blendEnabled ? 'ON' : 'OFF'}
              variant={blendEnabled ? 'filled' : 'ghost'}
              onPress={() => setBlendEnabled((v) => !v)}
              style={styles.moduleToggle}
            />
          </View>
          {blendEnabled && (
            <View style={styles.moduleExpandedBlock}>
              {/* Preset combinations */}
              <View style={styles.presetRow}>
                {BLEND_PRESETS.map((p) => (
                  <PrimaryButton
                    key={p.label}
                    title={p.label}
                    variant="ghost"
                    onPress={() => applyBlendPreset(p)}
                    style={styles.presetButton}
                  />
                ))}
              </View>
              {/* Per-voice controls */}
              {blendVoices.map((voice, i) => (
                <View key={i} style={[styles.blendVoiceBlock, { borderTopColor: c.border }]}>
                  <View style={styles.blendVoiceHeader}>
                    <Text style={[styles.controlLabel, { color: ['#4ecdc4', '#a78bfa', '#f59e0b'][i], marginBottom: 0 }]}>
                      Voice {i + 1}
                    </Text>
                    <View style={styles.blendMuteSoloRow}>
                      <PrimaryButton
                        title="M"
                        variant={voice.muted ? 'filled' : 'ghost'}
                        onPress={() => toggleBlendMute(i)}
                        style={styles.blendMuteBtn}
                      />
                      <PrimaryButton
                        title="S"
                        variant={voice.solo ? 'filled' : 'ghost'}
                        onPress={() => toggleBlendSolo(i)}
                        style={styles.blendMuteBtn}
                      />
                    </View>
                  </View>
                  <View style={styles.blendWaveformRow}>
                    {BLEND_WAVEFORMS.map((w) => (
                      <PrimaryButton
                        key={w}
                        title={BLEND_WAVEFORM_LABELS[w]}
                        variant={voice.waveform === w ? 'filled' : 'ghost'}
                        onPress={() => updateBlendVoice(i, { waveform: w })}
                        style={styles.blendWaveBtn}
                      />
                    ))}
                  </View>
                  <PrimarySlider
                    label="Freq"
                    value={voice.frequency}
                    onValueChange={(v) => updateBlendVoice(i, { frequency: Math.round(v) })}
                    min={20}
                    max={2000}
                    step={1}
                    formatValue={(v) => `${Math.round(v)} Hz`}
                  />
                  <PrimarySlider
                    label="Volume"
                    value={voice.volume}
                    onValueChange={(v) => updateBlendVoice(i, { volume: v })}
                    min={0}
                    max={1}
                    step={0.01}
                    formatValue={(v) => `${Math.round(v * 100)}%`}
                    style={styles.drawerSlider}
                  />
                </View>
              ))}
            </View>
          )}

          {/* Generative Drift — tone mode only */}
          {sourceMode === 'tone' && (
            <>
              <View style={styles.drawerToggleRow}>
                <Text style={styles.controlLabel}>Generative Drift</Text>
                <PrimaryButton
                  title={driftEnabled ? 'ON' : 'OFF'}
                  variant={driftEnabled ? 'filled' : 'ghost'}
                  onPress={() => setDriftEnabled((v) => !v)}
                  style={styles.moduleToggle}
                />
              </View>
              {driftEnabled && (
                <View style={styles.moduleExpandedBlock}>
                  <Text style={[styles.controlLabel, { marginTop: spacing.sm }]}>Speed</Text>
                  <SegmentedControl
                    options={DRIFT_SPEEDS}
                    selected={driftSpeed}
                    onSelect={setDriftSpeed}
                    labels={DRIFT_SPEED_LABELS}
                  />
                  <View style={[styles.drawerToggleRow, { marginTop: spacing.md }]}>
                    <Text style={styles.controlLabel}>Breathing</Text>
                    <PrimaryButton
                      title={driftBreathing ? 'ON' : 'OFF'}
                      variant={driftBreathing ? 'filled' : 'ghost'}
                      onPress={() => setDriftBreathing((v) => !v)}
                      style={styles.moduleToggle}
                    />
                  </View>
                  <PrimarySlider
                    label="Freq Min"
                    value={driftFreqMin}
                    onValueChange={(v) => setDriftFreqMin(Math.round(v))}
                    min={20}
                    max={2000}
                    step={1}
                    formatValue={(v) => `${Math.round(v)} Hz`}
                    style={styles.drawerSlider}
                  />
                  <PrimarySlider
                    label="Freq Max"
                    value={driftFreqMax}
                    onValueChange={(v) => setDriftFreqMax(Math.round(v))}
                    min={20}
                    max={2000}
                    step={1}
                    formatValue={(v) => `${Math.round(v)} Hz`}
                    style={styles.drawerSlider}
                  />
                  <PrimarySlider
                    label="Amp Min"
                    value={driftAmpMin}
                    onValueChange={setDriftAmpMin}
                    min={0}
                    max={1}
                    step={0.01}
                    formatValue={(v) => `${Math.round(v * 100)}%`}
                    style={styles.drawerSlider}
                  />
                  <PrimarySlider
                    label="Amp Max"
                    value={driftAmpMax}
                    onValueChange={setDriftAmpMax}
                    min={0}
                    max={1}
                    step={0.01}
                    formatValue={(v) => `${Math.round(v * 100)}%`}
                    style={styles.drawerSlider}
                  />
                  <PrimarySlider
                    label="Pan Min"
                    value={driftPanMin}
                    onValueChange={setDriftPanMin}
                    min={-1}
                    max={1}
                    step={0.01}
                    formatValue={(v) => v === 0 ? 'Center' : v < 0 ? `${Math.round(Math.abs(v) * 100)}% L` : `${Math.round(v * 100)}% R`}
                    style={styles.drawerSlider}
                  />
                  <PrimarySlider
                    label="Pan Max"
                    value={driftPanMax}
                    onValueChange={setDriftPanMax}
                    min={-1}
                    max={1}
                    step={0.01}
                    formatValue={(v) => v === 0 ? 'Center' : v < 0 ? `${Math.round(Math.abs(v) * 100)}% L` : `${Math.round(v * 100)}% R`}
                    style={styles.drawerSlider}
                  />
                </View>
              )}
            </>
          )}
        </Card>

        {/* Noise-specific controls when sourceMode === 'noise' */}
        {sourceMode === 'noise' && (
          <Card style={styles.drawerCard}>
            <SectionHeader title="NOISE" label />
            <Text style={styles.controlLabel}>Noise Type</Text>
            <SegmentedControl
              options={NOISE_TYPES}
              selected={noiseType}
              onSelect={setNoiseType}
              labels={NOISE_LABELS}
            />
            <Text style={styles.noiseHint}>
              {noiseType === 'white' && 'Equal energy across all frequencies.'}
              {noiseType === 'pink' && 'More bass, softer highs — natural and balanced.'}
              {noiseType === 'brown' && 'Deep, rumbling low frequencies.'}
            </Text>
          </Card>
        )}

        {/* Mic-specific controls when sourceMode === 'mic' */}
        {sourceMode === 'mic' && (
          <Card style={styles.drawerCard}>
            <SectionHeader title="MICROPHONE" label />
            {isPlaying && micAnalyser && (
              <View style={styles.micActiveRow}>
                <View style={styles.micDot} />
                <Text style={styles.micActiveLabel}>Microphone active</Text>
              </View>
            )}
            {micError && (
              <Text style={[styles.noiseHint, { color: '#f87171' }]}>
                {micError}
              </Text>
            )}
            {isPlaying && micAnalyser && micFreq != null && (
              <View style={styles.micPitchRow}>
                <Text style={styles.micPitchFreq}>{Math.round(micFreq)} Hz</Text>
                {micNote && <Text style={styles.micPitchNote}>{micNote}</Text>}
              </View>
            )}
            <Text style={styles.noiseHint}>
              Microphone mode captures live audio and feeds it into the visualizations. No audio is played back.
            </Text>
          </Card>
        )}
      </ControlDrawer>

      <SavePresetModal
        visible={showSaveModal}
        defaultName={sourceMode === 'noise' ? `${noiseType} noise` : `${waveform} ${Math.round(frequency)} Hz`}
        onSave={handleSavePreset}
        onCancel={() => setShowSaveModal(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  // ── Row 2: Source + Waveform ───────────────────────────────────
  topControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  // ── Row 3: Viz area ───────────────────────────────────────────
  vizArea: {
    flex: 1,
    marginHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  vizBadgeRow: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.sm,
    zIndex: 1,
  },
  vizBadgeText: {
    fontSize: typography.xs,
    fontWeight: typography.medium,
    color: colors.accent,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  vizContent: {
    flex: 1,
  },
  // ── Row 4: Viz tab bar ────────────────────────────────────────
  vizTabBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  vizTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  vizTabActive: {
    backgroundColor: colors.surfaceElevated,
  },
  vizTabText: {
    fontSize: typography.xs,
    fontWeight: typography.medium,
    color: colors.textMuted,
  },
  vizTabTextActive: {
    color: colors.accent,
    fontWeight: typography.semibold,
  },
  vizTabOverrideHint: {
    fontSize: typography.xs,
    fontWeight: typography.medium,
    color: colors.accent,
  },
  // ── Row 5: Dials + Play/Stop ──────────────────────────────────
  controlDials: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  playStopButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playStopButtonActive: {
    backgroundColor: colors.accent,
  },
  playStopText: {
    fontSize: typography.xs,
    fontWeight: typography.bold,
    color: colors.accent,
    letterSpacing: 1,
  },
  playStopTextActive: {
    color: colors.background,
  },
  actionIcons: {
    gap: spacing.xs,
    alignItems: 'center',
  },
  // ── Row 6: Modules button ────────────────────────────────────
  modulesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    marginHorizontal: spacing.sm,
  },
  modulesButtonText: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  modulesChevron: {
    fontSize: typography.sm,
    color: colors.accent,
  },
  // ── Drawer internals ─────────────────────────────────────────
  drawerCard: {
    marginBottom: spacing.md,
  },
  drawerSlider: {
    marginTop: spacing.md,
  },
  drawerToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  moduleToggle: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    minWidth: 52,
  },
  moduleExpandedBlock: {
    paddingLeft: spacing.xs,
    marginBottom: spacing.md,
  },
  controlLabel: {
    fontSize: typography.sm,
    fontWeight: typography.medium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  noiseHint: {
    fontSize: typography.xs,
    color: colors.textMuted,
    marginTop: spacing.md,
    lineHeight: 18,
  },
  presetRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  presetButton: {
    flex: 1,
    paddingVertical: spacing.xs,
  },
  iconText: {
    fontSize: 18,
    color: colors.accent,
  },
  iconFilledText: {
    fontSize: 18,
    color: colors.background,
  },
  // ── Interval Explorer (drawer) ────────────────────────────────
  intervalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  intervalInfoBlock: {
    alignItems: 'center',
  },
  intervalInfoLabel: {
    fontSize: typography.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  intervalInfoValue: {
    fontSize: typography.lg,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
  intervalPresetWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  intervalPresetBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minWidth: 48,
  },
  // ── Tone Blending (drawer) ────────────────────────────────────
  blendVoiceBlock: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  blendVoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  blendMuteSoloRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  blendMuteBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minWidth: 36,
  },
  blendWaveformRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  blendWaveBtn: {
    flex: 1,
    paddingVertical: spacing.xs,
  },
  // ── Mic inline indicators ─────────────────────────────────────
  micErrorInline: {
    fontSize: typography.xs,
    color: '#f87171',
    flex: 1,
  },
  micActiveRowInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  micActiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  micDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
  },
  micActiveLabel: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    color: '#ef4444',
  },
  micPitchRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  micPitchFreq: {
    fontSize: 28,
    fontWeight: typography.bold,
    color: colors.accent,
  },
  micPitchNote: {
    fontSize: typography.lg,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
  },
});
