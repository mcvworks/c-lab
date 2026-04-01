import { useState, useCallback, useEffect, useRef } from 'react';
import { Alert, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BinauralGenerator, AmbientGenerator, renderSession, getHapticEngine } from '@/src/audio';
import type { AmbientLayerConfig, ExportProgress, CarrierWaveform, EntrainmentMode } from '@/src/audio';
import { usePresetStore } from '@/src/state/usePresetStore';
import { useExportStore } from '@/src/state/useExportStore';
import { useAudioStore } from '@/src/state/useAudioStore';
import { useResponsive } from '@/src/hooks/useResponsive';
import type { ComposerSettings, ExportRecord, BrainState } from '@/src/types/preset';
import {
  Screen,
  Card,
  SectionHeader,
  PrimaryButton,
  IconButton,
  PrimarySlider,
  SegmentedControl,
  SavePresetModal,
  PresetBar,
  BinauralWaveformView,
  JourneyPanel,
  interpolateBeat,
  beatForState,
} from '@/src/components';
import type { QuickPreset, JourneyTemplate } from '@/src/components';
import RotaryDial from '@/src/components/RotaryDial';
import ControlDrawer from '@/src/components/ControlDrawer';
import SnapshotButton from '@/src/components/SnapshotButton';
import { useSnapshotStore } from '@/src/state/useSnapshotStore';
import { colors, useColors, spacing, typography, radius } from '@/src/theme';

// ── Entrainment mode options ──────────────────────────────────────
const ENTRAINMENT_MODES: EntrainmentMode[] = ['binaural', 'isochronal'];
const ENTRAINMENT_LABELS: Record<EntrainmentMode, string> = {
  binaural: 'Binaural',
  isochronal: 'Isochronal',
};

// ── Carrier waveform options ──────────────────────────────────────
const CARRIER_WAVEFORMS: CarrierWaveform[] = ['sine', 'triangle', 'square'];
const CARRIER_LABELS: Record<CarrierWaveform, string> = {
  sine: 'Sine',
  triangle: 'Triangle',
  square: 'Square',
};

// ── Binaural brainwave presets ──────────────────────────────────────

const BRAINWAVE_PRESETS = ['delta', 'theta', 'alpha', 'beta'] as const;
type BrainwavePreset = (typeof BRAINWAVE_PRESETS)[number];

const BRAINWAVE_LABELS: Record<BrainwavePreset, string> = {
  delta: 'Delta',
  theta: 'Theta',
  alpha: 'Alpha',
  beta: 'Beta',
};

const BRAINWAVE_RANGES: Record<BrainwavePreset, { diff: number; desc: string }> = {
  delta: { diff: 2, desc: 'Deep sleep · 0.5-4 Hz' },
  theta: { diff: 6, desc: 'Meditation · 4-8 Hz' },
  alpha: { diff: 10, desc: 'Relaxation · 8-13 Hz' },
  beta: { diff: 20, desc: 'Focus · 13-30 Hz' },
};

// ── Ambient layer types ─────────────────────────────────────────────

const AMBIENT_TYPES = ['rain', 'ocean', 'wind', 'forest', 'fire'] as const;
type AmbientType = (typeof AMBIENT_TYPES)[number];

const AMBIENT_LABELS: Record<AmbientType, string> = {
  rain: '🌧 Rain',
  ocean: '🌊 Ocean',
  wind: '💨 Wind',
  forest: '🌿 Forest',
  fire: '🔥 Fire',
};

// ── Fade preset options ─────────────────────────────────────────────

const FADE_OPTIONS = [0, 5, 10, 30] as const;
const DURATION_PRESETS = [5, 10, 15, 30, 60] as const;

// ── Layer interface ─────────────────────────────────────────────────

interface AmbientLayer {
  id: number;
  type: AmbientType;
  volume: number;
  enabled: boolean;
  pan: number;           // -1..+1
  filterCutoff: number;  // Hz
}

/** Default filter cutoff per ambient type (brightness). */
const DEFAULT_CUTOFF: Record<AmbientType, number> = {
  rain: 3000,
  ocean: 500,
  wind: 800,
  forest: 6000,
  fire: 600,
};

// ── Quick presets (mood-based) ─────────────────────────────────────────
interface ComposerQuickPreset {
  baseFrequency: number;
  beatDifference: number;
  binauralVolume: number;
  carrierWaveform?: CarrierWaveform;
  stereoWidth?: number;
  entrainmentMode?: EntrainmentMode;
  layers: { type: AmbientType; volume: number; enabled: boolean }[];
  duration: number;
  fadeIn: number;
  fadeOut: number;
}

const COMPOSER_PRESETS: QuickPreset<ComposerQuickPreset>[] = [
  {
    label: 'Deep Sleep',
    settings: {
      baseFrequency: 100, beatDifference: 2, binauralVolume: 0.45,
      layers: [{ type: 'rain', volume: 0.4, enabled: true }],
      duration: 30, fadeIn: 10, fadeOut: 10,
    },
  },
  {
    label: 'Meditation',
    settings: {
      baseFrequency: 150, beatDifference: 6, binauralVolume: 0.5,
      layers: [
        { type: 'ocean', volume: 0.35, enabled: true },
        { type: 'forest', volume: 0.25, enabled: true },
      ],
      duration: 15, fadeIn: 5, fadeOut: 5,
    },
  },
  {
    label: 'Focus',
    settings: {
      baseFrequency: 200, beatDifference: 20, binauralVolume: 0.4,
      layers: [{ type: 'rain', volume: 0.2, enabled: true }],
      duration: 30, fadeIn: 5, fadeOut: 5,
    },
  },
  {
    label: 'Calm',
    settings: {
      baseFrequency: 180, beatDifference: 10, binauralVolume: 0.5,
      layers: [{ type: 'wind', volume: 0.3, enabled: true }],
      duration: 15, fadeIn: 5, fadeOut: 5,
    },
  },
  {
    label: 'Fireside',
    settings: {
      baseFrequency: 120, beatDifference: 6, binauralVolume: 0.45,
      layers: [
        { type: 'fire', volume: 0.4, enabled: true },
        { type: 'rain', volume: 0.2, enabled: true },
      ],
      duration: 30, fadeIn: 10, fadeOut: 10,
    },
  },
  {
    label: 'Ocean Drift',
    settings: {
      baseFrequency: 140, beatDifference: 4, binauralVolume: 0.5,
      layers: [{ type: 'ocean', volume: 0.5, enabled: true }],
      duration: 60, fadeIn: 10, fadeOut: 30,
    },
  },
];

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

let nextLayerId = 1;

export default function ComposerScreen() {
  const c = useColors();
  // Binaural generator (singleton per component mount)
  const generatorRef = useRef<BinauralGenerator | null>(null);
  const getGenerator = useCallback(() => {
    if (!generatorRef.current) {
      generatorRef.current = new BinauralGenerator();
    }
    return generatorRef.current;
  }, []);

  // Ambient generator (singleton per component mount)
  const ambientRef = useRef<AmbientGenerator | null>(null);
  const getAmbient = useCallback(() => {
    if (!ambientRef.current) {
      ambientRef.current = new AmbientGenerator();
    }
    return ambientRef.current;
  }, []);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);

  // Binaural state
  const [baseFrequency, setBaseFrequency] = useState(200);
  const [beatDifference, setBeatDifference] = useState(10);
  const [binauralVolume, setBinauralVolume] = useState(0.5);
  const [carrierWaveform, setCarrierWaveform] = useState<CarrierWaveform>('sine');
  const [stereoWidth, setStereoWidth] = useState(1);
  const [entrainmentMode, setEntrainmentMode] = useState<EntrainmentMode>('binaural');

  const isBinaural = entrainmentMode === 'binaural';

  // Ambient layers
  const [layers, setLayers] = useState<AmbientLayer[]>([
    { id: nextLayerId++, type: 'rain', volume: 0.4, enabled: true, pan: 0, filterCutoff: DEFAULT_CUTOFF.rain },
  ]);

  // Session settings
  const [duration, setDuration] = useState(15);
  const [fadeIn, setFadeIn] = useState(5);
  const [fadeOut, setFadeOut] = useState(5);

  // Journey mode
  const [journeyEnabled, setJourneyEnabled] = useState(false);
  const [journeyStart, setJourneyStart] = useState<BrainState>('beta');
  const [journeyEnd, setJourneyEnd] = useState<BrainState>('alpha');

  // Session timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeStartedRef = useRef(false);

  // Control drawer
  const [drawerVisible, setDrawerVisible] = useState(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setElapsedSeconds(0);
    fadeStartedRef.current = false;
  }, []);

  // Save modal
  const savePreset = usePresetStore((s) => s.savePreset);
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Export state
  const addExport = useExportStore((s) => s.addExport);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const handleExport = useCallback(async () => {
    const settings: ComposerSettings = {
      baseFrequency,
      beatDifference,
      binauralVolume,
      carrierWaveform,
      stereoWidth,
      entrainmentMode,
      layers: layers.map(({ type, volume, enabled, pan, filterCutoff }) => ({ type, volume, enabled, pan, filterCutoff })),
      duration,
      fadeIn,
      fadeOut,
      journey: journeyEnabled ? { enabled: true, startState: journeyStart, endState: journeyEnd } : undefined,
    };

    setExporting(true);
    setExportProgress(0);

    try {
      const exportName = `${beatDifference.toFixed(0)}Hz binaural ${duration}m`;
      const result = await renderSession(settings, exportName, (p: ExportProgress) => {
        setExportProgress(p.progress);
      });

      const record: ExportRecord = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        name: exportName,
        fileName: result.fileName,
        uri: result.uri,
        durationSeconds: duration * 60,
        format: 'wav',
        sizeBytes: result.sizeBytes,
        settings,
        createdAt: Date.now(),
      };

      await addExport(record);
      setExporting(false);

      if (Platform.OS === 'web') {
        // Trigger download on web
        const a = document.createElement('a');
        a.href = result.uri;
        a.download = result.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      Alert.alert('Export Complete', `"${result.fileName}" saved successfully.`);
    } catch (error) {
      setExporting(false);
      Alert.alert('Export Failed', error instanceof Error ? error.message : 'Unknown error');
    }
  }, [baseFrequency, beatDifference, binauralVolume, carrierWaveform, stereoWidth, entrainmentMode, layers, duration, fadeIn, fadeOut, addExport]);

  const handleSavePreset = useCallback(async (name: string) => {
    const settings: ComposerSettings = {
      baseFrequency,
      beatDifference,
      binauralVolume,
      carrierWaveform,
      stereoWidth,
      entrainmentMode,
      layers: layers.map(({ type, volume, enabled, pan, filterCutoff }) => ({ type, volume, enabled, pan, filterCutoff })),
      duration,
      fadeIn,
      fadeOut,
      journey: journeyEnabled ? { enabled: true, startState: journeyStart, endState: journeyEnd } : undefined,
    };
    await savePreset(name, 'composer', settings);
    setShowSaveModal(false);
    Alert.alert('Saved', `Preset "${name || 'Composer Preset'}" saved to Library.`);
  }, [baseFrequency, beatDifference, binauralVolume, carrierWaveform, stereoWidth, entrainmentMode, layers, duration, fadeIn, fadeOut, journeyEnabled, journeyStart, journeyEnd, savePreset]);

  // Load preset from Library
  const pendingLoad = usePresetStore((s) => s.pendingLoad);
  const setPendingLoad = usePresetStore((s) => s.setPendingLoad);
  useEffect(() => {
    if (pendingLoad && pendingLoad.type === 'composer') {
      const s = pendingLoad.settings as ComposerSettings;
      setBaseFrequency(s.baseFrequency);
      setBeatDifference(s.beatDifference);
      setBinauralVolume(s.binauralVolume);
      setCarrierWaveform(s.carrierWaveform ?? 'sine');
      setStereoWidth(s.stereoWidth ?? 1);
      setEntrainmentMode(s.entrainmentMode ?? 'binaural');
      setLayers(s.layers.map((l) => ({ ...l, id: nextLayerId++, pan: l.pan ?? 0, filterCutoff: l.filterCutoff ?? DEFAULT_CUTOFF[l.type] })));
      setDuration(s.duration);
      setFadeIn(s.fadeIn);
      setFadeOut(s.fadeOut);
      if (s.journey?.enabled) {
        setJourneyEnabled(true);
        setJourneyStart(s.journey.startState);
        setJourneyEnd(s.journey.endState);
      } else {
        setJourneyEnabled(false);
      }
      setPendingLoad(null);
    }
  }, [pendingLoad, setPendingLoad]);

  // Restore snapshot from Library
  const pendingRestore = useSnapshotStore((s) => s.pendingRestore);
  const setPendingRestore = useSnapshotStore((s) => s.setPendingRestore);
  useEffect(() => {
    if (pendingRestore && pendingRestore.source === 'composer') {
      const s = pendingRestore.settings as ComposerSettings;
      setBaseFrequency(s.baseFrequency);
      setBeatDifference(s.beatDifference);
      setBinauralVolume(s.binauralVolume);
      setCarrierWaveform(s.carrierWaveform ?? 'sine');
      setStereoWidth(s.stereoWidth ?? 1);
      setEntrainmentMode(s.entrainmentMode ?? 'binaural');
      setLayers(s.layers.map((l) => ({ ...l, id: nextLayerId++, pan: l.pan ?? 0, filterCutoff: l.filterCutoff ?? DEFAULT_CUTOFF[l.type] })));
      setDuration(s.duration);
      setFadeIn(s.fadeIn);
      setFadeOut(s.fadeOut);
      if (s.journey?.enabled) {
        setJourneyEnabled(true);
        setJourneyStart(s.journey.startState);
        setJourneyEnd(s.journey.endState);
      } else {
        setJourneyEnabled(false);
      }
      setPendingRestore(null);
    }
  }, [pendingRestore, setPendingRestore]);

  const leftFreq = baseFrequency;
  const rightFreq = baseFrequency + beatDifference;

  // Determine which preset is active (if any)
  const activeBrainwave = BRAINWAVE_PRESETS.find(
    (p) => Math.abs(beatDifference - BRAINWAVE_RANGES[p].diff) < 0.5,
  ) ?? null;

  // Layer management
  const addLayer = useCallback(() => {
    if (layers.length >= 5) {
      Alert.alert('Limit Reached', 'Maximum 5 ambient layers.');
      return;
    }
    const usedTypes = new Set(layers.map((l) => l.type));
    const available = AMBIENT_TYPES.find((t) => !usedTypes.has(t)) ?? 'rain';
    setLayers((prev) => {
      const updated = [...prev, { id: nextLayerId++, type: available, volume: 0.4, enabled: true, pan: 0, filterCutoff: DEFAULT_CUTOFF[available] }];
      if (ambientRef.current?.isPlaying()) {
        ambientRef.current.syncLayers(updated as AmbientLayerConfig[]);
      }
      return updated;
    });
  }, [layers]);

  const removeLayer = useCallback((id: number) => {
    setLayers((prev) => {
      const updated = prev.filter((l) => l.id !== id);
      if (ambientRef.current?.isPlaying()) {
        ambientRef.current.syncLayers(updated as AmbientLayerConfig[]);
      }
      return updated;
    });
  }, []);

  const updateLayerVolume = useCallback((id: number, volume: number) => {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, volume } : l)));
    if (ambientRef.current?.isPlaying()) {
      ambientRef.current.setLayerVolume(id, volume);
    }
  }, []);

  const updateLayerType = useCallback((id: number, type: AmbientType) => {
    setLayers((prev) => {
      const updated = prev.map((l) => (l.id === id ? { ...l, type, filterCutoff: DEFAULT_CUTOFF[type] } : l));
      // Type change requires full layer re-sync (different filter chain)
      if (ambientRef.current?.isPlaying()) {
        ambientRef.current.syncLayers(updated as AmbientLayerConfig[]);
      }
      return updated;
    });
  }, []);

  const updateLayerPan = useCallback((id: number, pan: number) => {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, pan } : l)));
    if (ambientRef.current?.isPlaying()) {
      ambientRef.current.setLayerPan(id, pan);
    }
  }, []);

  const updateLayerFilterCutoff = useCallback((id: number, filterCutoff: number) => {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, filterCutoff } : l)));
    if (ambientRef.current?.isPlaying()) {
      ambientRef.current.setLayerFilterCutoff(id, filterCutoff);
    }
  }, []);

  const toggleLayer = useCallback((id: number) => {
    setLayers((prev) => {
      const updated = prev.map((l) => (l.id === id ? { ...l, enabled: !l.enabled } : l));
      if (ambientRef.current?.isPlaying()) {
        ambientRef.current.syncLayers(updated as AmbientLayerConfig[]);
      }
      return updated;
    });
  }, []);

  const { isTablet } = useResponsive();

  // Beat difference badge
  const beatBadge = activeBrainwave
    ? `${BRAINWAVE_LABELS[activeBrainwave]} · ${beatDifference.toFixed(1)} Hz`
    : `${beatDifference.toFixed(1)} Hz beat`;

  // Live-update binaural params while playing
  const updateBinauralIfPlaying = useCallback(
    (base: number, diff: number, vol: number, opts?: { waveform?: CarrierWaveform; width?: number; mode?: EntrainmentMode }) => {
      if (!generatorRef.current?.isPlaying()) return;
      generatorRef.current.updateParams({
        leftFreq: base,
        rightFreq: base + diff,
        amplitude: vol,
        carrierWaveform: opts?.waveform ?? carrierWaveform,
        stereoWidth: opts?.width ?? stereoWidth,
        entrainmentMode: opts?.mode ?? entrainmentMode,
      });
    },
    [carrierWaveform, stereoWidth, entrainmentMode],
  );

  const handleQuickPreset = useCallback((p: ComposerQuickPreset) => {
    setBaseFrequency(p.baseFrequency);
    setBeatDifference(p.beatDifference);
    setBinauralVolume(p.binauralVolume);
    setCarrierWaveform(p.carrierWaveform ?? 'sine');
    setStereoWidth(p.stereoWidth ?? 1);
    setEntrainmentMode(p.entrainmentMode ?? 'binaural');
    setLayers(p.layers.map((l) => ({ ...l, id: nextLayerId++, pan: 0, filterCutoff: DEFAULT_CUTOFF[l.type] })));
    setDuration(p.duration);
    setFadeIn(p.fadeIn);
    setFadeOut(p.fadeOut);
    updateBinauralIfPlaying(p.baseFrequency, p.beatDifference, p.binauralVolume, {
      waveform: p.carrierWaveform ?? 'sine',
      width: p.stereoWidth ?? 1,
      mode: p.entrainmentMode ?? 'binaural',
    });
    if (ambientRef.current?.isPlaying()) {
      ambientRef.current.syncLayers(
        p.layers.map((l, i) => ({ ...l, id: i })) as AmbientLayerConfig[],
      );
    }
  }, [updateBinauralIfPlaying]);

  const handleBaseFrequency = useCallback(
    (v: number) => {
      setBaseFrequency(v);
      updateBinauralIfPlaying(v, beatDifference, binauralVolume);
    },
    [beatDifference, binauralVolume, updateBinauralIfPlaying],
  );

  const handleBeatDifference = useCallback(
    (v: number) => {
      setBeatDifference(v);
      updateBinauralIfPlaying(baseFrequency, v, binauralVolume);
      if (isPlaying && useAudioStore.getState().hapticEnabled) {
        getHapticEngine().updateBeatPulse(v, binauralVolume);
      }
    },
    [isPlaying, baseFrequency, binauralVolume, updateBinauralIfPlaying],
  );

  const handleBinauralVolume = useCallback(
    (v: number) => {
      setBinauralVolume(v);
      updateBinauralIfPlaying(baseFrequency, beatDifference, v);
    },
    [baseFrequency, beatDifference, updateBinauralIfPlaying],
  );

  const handleCarrierWaveform = useCallback(
    (wf: CarrierWaveform) => {
      setCarrierWaveform(wf);
      updateBinauralIfPlaying(baseFrequency, beatDifference, binauralVolume, { waveform: wf });
    },
    [baseFrequency, beatDifference, binauralVolume, updateBinauralIfPlaying],
  );

  const handleStereoWidth = useCallback(
    (v: number) => {
      setStereoWidth(v);
      updateBinauralIfPlaying(baseFrequency, beatDifference, binauralVolume, { width: v });
    },
    [baseFrequency, beatDifference, binauralVolume, updateBinauralIfPlaying],
  );

  const handleEntrainmentMode = useCallback(
    (mode: EntrainmentMode) => {
      setEntrainmentMode(mode);
      updateBinauralIfPlaying(baseFrequency, beatDifference, binauralVolume, { mode });
    },
    [baseFrequency, beatDifference, binauralVolume, updateBinauralIfPlaying],
  );

  const handleBrainwavePreset = useCallback(
    (preset: BrainwavePreset) => {
      const diff = BRAINWAVE_RANGES[preset].diff;
      setBeatDifference(diff);
      updateBinauralIfPlaying(baseFrequency, diff, binauralVolume);
    },
    [baseFrequency, binauralVolume, updateBinauralIfPlaying],
  );

  // Journey mode handlers
  const handleJourneyToggle = useCallback(() => {
    const next = !journeyEnabled;
    setJourneyEnabled(next);
    if (next) {
      // Set initial beat difference to the start state
      const startBeat = beatForState(journeyStart);
      setBeatDifference(startBeat);
      updateBinauralIfPlaying(baseFrequency, startBeat, binauralVolume);
    }
  }, [journeyEnabled, journeyStart, baseFrequency, binauralVolume, updateBinauralIfPlaying]);

  const handleJourneyTemplate = useCallback((t: JourneyTemplate) => {
    setJourneyStart(t.startState);
    setJourneyEnd(t.endState);
    setDuration(t.duration);
    const startBeat = beatForState(t.startState);
    setBeatDifference(startBeat);
    updateBinauralIfPlaying(baseFrequency, startBeat, binauralVolume);
  }, [baseFrequency, binauralVolume, updateBinauralIfPlaying]);

  const handleJourneyStartChange = useCallback((s: BrainState) => {
    setJourneyStart(s);
    const startBeat = beatForState(s);
    setBeatDifference(startBeat);
    updateBinauralIfPlaying(baseFrequency, startBeat, binauralVolume);
  }, [baseFrequency, binauralVolume, updateBinauralIfPlaying]);

  const handleJourneyEndChange = useCallback((s: BrainState) => {
    setJourneyEnd(s);
  }, []);

  // Start / stop session
  const stopSession = useCallback(async () => {
    clearTimer();
    const gen = getGenerator();
    const ambient = getAmbient();
    await Promise.all([gen.stop(), ambient.stop()]);
    getHapticEngine().stopBeatPulse();
    setIsPlaying(false);
    useAudioStore.getState().setComposerPlaying(false);
  }, [clearTimer, getGenerator, getAmbient]);

  const toggleSession = useCallback(async () => {
    const gen = getGenerator();
    const ambient = getAmbient();
    if (isPlaying) {
      await stopSession();
    } else {
      // When journey mode is on, start at the journey start-state beat
      const initialBeat = journeyEnabled ? beatForState(journeyStart) : beatDifference;
      if (journeyEnabled) setBeatDifference(initialBeat);

      await Promise.all([
        gen.play({
          leftFreq: baseFrequency,
          rightFreq: baseFrequency + initialBeat,
          amplitude: binauralVolume,
          carrierWaveform,
          stereoWidth,
          entrainmentMode,
        }),
        ambient.start(layers as AmbientLayerConfig[]),
      ]);
      setIsPlaying(true);
      useAudioStore.getState().setComposerPlaying(true);
      setElapsedSeconds(0);
      fadeStartedRef.current = false;

      // Start haptic beat pulse if enabled
      if (useAudioStore.getState().hapticEnabled) {
        getHapticEngine().startBeatPulse(initialBeat, binauralVolume);
      }

      // Start countdown timer
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setElapsedSeconds(elapsed);
      }, 1000);
    }
  }, [isPlaying, baseFrequency, beatDifference, binauralVolume, carrierWaveform, stereoWidth, entrainmentMode, layers, getGenerator, getAmbient, stopSession, journeyEnabled, journeyStart]);

  // Auto-stop and fade-out effect
  useEffect(() => {
    if (!isPlaying) return;
    const totalSeconds = duration * 60;
    const remaining = totalSeconds - elapsedSeconds;

    // Begin fade-out when remaining time equals fadeOut duration
    if (fadeOut > 0 && remaining <= fadeOut && remaining > 0 && !fadeStartedRef.current) {
      fadeStartedRef.current = true;
      generatorRef.current?.fadeOut(remaining);
      ambientRef.current?.fadeOut(remaining);
    }

    // Auto-stop when time is up
    if (remaining <= 0) {
      stopSession();
    }
  }, [isPlaying, elapsedSeconds, duration, fadeOut, stopSession]);

  // Journey mode: smoothly interpolate beat frequency each tick
  useEffect(() => {
    if (!isPlaying || !journeyEnabled) return;
    const totalSeconds = duration * 60;
    const progress = totalSeconds > 0 ? Math.min(1, elapsedSeconds / totalSeconds) : 0;
    const targetBeat = interpolateBeat(journeyStart, journeyEnd, progress);
    setBeatDifference(targetBeat);
    updateBinauralIfPlaying(baseFrequency, targetBeat, binauralVolume);
    // Update haptic beat pulse to match new beat frequency
    if (useAudioStore.getState().hapticEnabled) {
      getHapticEngine().updateBeatPulse(targetBeat, binauralVolume);
    }
  }, [isPlaying, journeyEnabled, elapsedSeconds, duration, journeyStart, journeyEnd, baseFrequency, binauralVolume, updateBinauralIfPlaying]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Timer progress fraction
  const totalSeconds = duration * 60;
  const progressFraction = totalSeconds > 0 ? Math.min(1, elapsedSeconds / totalSeconds) : 0;

  return (
    <Screen>
      <View style={styles.root}>
        {/* ── Row 1: PresetBar ──────────────────────────────── */}
        <PresetBar
          presets={COMPOSER_PRESETS}
          onSelect={handleQuickPreset}
        />

        {/* ── Row 2: Mode toggle + brain state badge ───────── */}
        <View style={styles.topRow}>
          <SegmentedControl
            options={ENTRAINMENT_MODES}
            selected={entrainmentMode}
            onSelect={handleEntrainmentMode}
            labels={ENTRAINMENT_LABELS}
            style={styles.modeToggleCompact}
          />
          <View style={styles.badgeContainer}>
            <Text style={[styles.badge, { backgroundColor: c.surfaceElevated }]}>{beatBadge}</Text>
          </View>
        </View>

        {/* ── Row 3: BinauralWaveformView (flex center) ─────── */}
        <View style={[styles.vizContainer, { backgroundColor: c.background }]}>
          {isBinaural ? (
            <BinauralWaveformView
              leftFreq={leftFreq}
              rightFreq={rightFreq}
              amplitude={binauralVolume}
              isPlaying={isPlaying}
            />
          ) : (
            <View style={styles.isoPlaceholder}>
              <Text style={styles.isoLabel}>ISOCHRONAL</Text>
              <Text style={styles.isoFreq}>{Math.round(leftFreq)} Hz @ {beatDifference.toFixed(1)} Hz pulse</Text>
            </View>
          )}
        </View>

        {/* ── Row 4: Ear frequency readouts ────────────────── */}
        <View style={[styles.earReadoutCompact, { backgroundColor: c.background }]}>
          {isBinaural ? (
            <>
              <View style={styles.earBoxCompact}>
                <Text style={styles.earLabelCompact}>L</Text>
                <Text style={styles.earFreqCompact}>{Math.round(leftFreq)} Hz</Text>
              </View>
              <View style={[styles.earDividerCompact, { backgroundColor: c.surfaceElevated }]} />
              <View style={styles.earBoxCompact}>
                <Text style={styles.earLabelCompact}>R</Text>
                <Text style={styles.earFreqCompact}>{Math.round(rightFreq)} Hz</Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.earBoxCompact}>
                <Text style={styles.earLabelCompact}>CARRIER</Text>
                <Text style={styles.earFreqCompact}>{Math.round(leftFreq)} Hz</Text>
              </View>
              <View style={[styles.earDividerCompact, { backgroundColor: c.surfaceElevated }]} />
              <View style={styles.earBoxCompact}>
                <Text style={styles.earLabelCompact}>PULSE</Text>
                <Text style={styles.earFreqCompact}>{beatDifference.toFixed(1)} Hz</Text>
              </View>
            </>
          )}
        </View>

        {/* ── Row 5: Rotary dials ──────────────────────────── */}
        <View style={styles.dialRow}>
          <RotaryDial
            label="Base Freq"
            value={baseFrequency}
            onValueChange={handleBaseFrequency}
            min={80}
            max={500}
            step={1}
            formatValue={(v) => `${Math.round(v)} Hz`}
          />
          <RotaryDial
            label="Beat Diff"
            value={beatDifference}
            onValueChange={handleBeatDifference}
            min={0.5}
            max={40}
            step={0.5}
            formatValue={(v) => `${v.toFixed(1)} Hz`}
            disabled={journeyEnabled}
          />
          <RotaryDial
            label="Volume"
            value={binauralVolume}
            onValueChange={handleBinauralVolume}
            min={0}
            max={1}
            step={0.01}
            formatValue={(v) => `${Math.round(v * 100)}%`}
          />
        </View>

        {/* ── Row 6: Brainwave preset buttons ──────────────── */}
        {!journeyEnabled ? (
          <View style={styles.brainwaveRow}>
            {BRAINWAVE_PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset}
                style={[
                  styles.brainwaveButton,
                  { borderColor: c.border },
                  activeBrainwave === preset && styles.brainwaveButtonActive,
                ]}
                onPress={() => handleBrainwavePreset(preset)}
              >
                <Text style={[
                  styles.brainwaveButtonText,
                  activeBrainwave === preset && styles.brainwaveButtonTextActive,
                  activeBrainwave === preset && { color: c.background },
                ]}>
                  {BRAINWAVE_LABELS[preset]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.brainwaveRow}>
            <Text style={styles.journeyHint}>Journey: {journeyStart} → {journeyEnd}</Text>
          </View>
        )}

        {/* ── Row 7: Start/Stop + compact timer ────────────── */}
        <View style={styles.playbackRow}>
          <TouchableOpacity
            style={[styles.sessionButton, isPlaying && styles.sessionButtonStop]}
            onPress={toggleSession}
          >
            <Text style={[styles.sessionButtonText, { color: c.background }, isPlaying && styles.sessionButtonTextStop]}>
              {isPlaying ? 'Stop' : 'Start Session'}
            </Text>
          </TouchableOpacity>
          {isPlaying && (
            <View style={styles.compactTimer}>
              <Text style={styles.compactTimerText}>
                {formatTime(elapsedSeconds)} / {formatTime(totalSeconds)}
              </Text>
              <View style={[styles.compactTimerBarBg, { backgroundColor: c.surfaceElevated }]}>
                <View style={[styles.compactTimerBarFill, { width: `${Math.round(progressFraction * 100)}%` }]} />
              </View>
            </View>
          )}
          <View style={styles.compactActions}>
            <SnapshotButton
              source="composer"
              disabled={!isPlaying}
              defaultName={journeyEnabled ? `Journey ${journeyStart} → ${journeyEnd}` : `${beatDifference.toFixed(0)} Hz binaural`}
              getSettings={() => ({
                baseFrequency, beatDifference, binauralVolume,
                carrierWaveform, stereoWidth, entrainmentMode,
                layers: layers.map(({ type, volume, enabled, pan, filterCutoff }) => ({ type, volume, enabled, pan, filterCutoff })),
                duration, fadeIn, fadeOut,
                journey: journeyEnabled ? { enabled: true, startState: journeyStart, endState: journeyEnd } : undefined,
              })}
            />
            {!isPlaying && (
              <IconButton
                variant="filled"
                onPress={() => setShowSaveModal(true)}
              >
                <Text style={[styles.iconFilledText, { color: c.background }]}>♡</Text>
              </IconButton>
            )}
          </View>
        </View>

        {/* ── Row 8: Drawer toggle bar ─────────────────────── */}
        <View style={styles.drawerToggleRow}>
          <TouchableOpacity
            style={[styles.drawerToggleButton, { backgroundColor: c.surfaceElevated }]}
            onPress={() => setDrawerVisible(true)}
          >
            <Text style={styles.drawerToggleText}>Layers</Text>
            <Text style={styles.drawerToggleDot}>·</Text>
            <Text style={styles.drawerToggleText}>Journey</Text>
            <Text style={styles.drawerToggleDot}>·</Text>
            <Text style={styles.drawerToggleText}>Session</Text>
            <Text style={styles.drawerToggleChevron}>▲</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Control Drawer ─────────────────────────────────── */}
      <ControlDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        title="Controls"
      >
        {/* ── Ambient Layers ───────────────────────────────── */}
        <SectionHeader title="AMBIENT LAYERS" label />

        {layers.map((layer) => (
          <Card key={layer.id} style={styles.drawerCard}>
            <View style={styles.layerHeader}>
              <PrimaryButton
                title={layer.enabled ? 'ON' : 'OFF'}
                variant={layer.enabled ? 'filled' : 'ghost'}
                onPress={() => toggleLayer(layer.id)}
                style={styles.toggleButton}
              />
              <View style={styles.layerTypeRow}>
                {AMBIENT_TYPES.map((type) => (
                  <PrimaryButton
                    key={type}
                    title={AMBIENT_LABELS[type]}
                    variant={layer.type === type ? 'filled' : 'ghost'}
                    onPress={() => updateLayerType(layer.id, type)}
                    style={styles.layerTypeButton}
                  />
                ))}
              </View>
              <IconButton variant="ghost" onPress={() => removeLayer(layer.id)}>
                <Text style={styles.removeText}>✕</Text>
              </IconButton>
            </View>
            <PrimarySlider
              label="Volume"
              value={layer.volume}
              onValueChange={(v) => updateLayerVolume(layer.id, v)}
              min={0}
              max={1}
              step={0.01}
              formatValue={(v) => `${Math.round(v * 100)}%`}
              style={styles.layerSlider}
            />
            <PrimarySlider
              label="Pan"
              value={layer.pan}
              onValueChange={(v) => updateLayerPan(layer.id, v)}
              min={-1}
              max={1}
              step={0.01}
              formatValue={(v) => v < -0.01 ? `L ${Math.round(Math.abs(v) * 100)}%` : v > 0.01 ? `R ${Math.round(v * 100)}%` : 'Center'}
              style={styles.layerSlider}
            />
            <PrimarySlider
              label="Brightness"
              value={layer.filterCutoff}
              onValueChange={(v) => updateLayerFilterCutoff(layer.id, v)}
              min={200}
              max={8000}
              step={10}
              formatValue={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k Hz` : `${Math.round(v)} Hz`}
              style={styles.layerSlider}
            />
          </Card>
        ))}

        <PrimaryButton
          title={`+ Add Layer${layers.length >= 5 ? ' (max)' : ''}`}
          variant="outline"
          onPress={addLayer}
          style={styles.addLayerButton}
        />

        {/* ── Journey Mode ─────────────────────────────────── */}
        <SectionHeader title="JOURNEY MODE" label />
        <Card style={styles.drawerCard}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionLabel}>Journey Mode</Text>
            <PrimaryButton
              title={journeyEnabled ? 'ON' : 'OFF'}
              variant={journeyEnabled ? 'filled' : 'ghost'}
              onPress={handleJourneyToggle}
              style={styles.toggleButton}
              disabled={isPlaying}
            />
          </View>
          <Text style={styles.hint}>
            Gradually transition between brain wave states over the session duration.
          </Text>
          {journeyEnabled && (
            <View style={styles.journeyContent}>
              <JourneyPanel
                startState={journeyStart}
                endState={journeyEnd}
                duration={duration}
                isPlaying={isPlaying}
                elapsedSeconds={elapsedSeconds}
                onStartStateChange={handleJourneyStartChange}
                onEndStateChange={handleJourneyEndChange}
                onDurationChange={setDuration}
                onApplyTemplate={handleJourneyTemplate}
              />
            </View>
          )}
        </Card>

        {/* ── Session Settings ─────────────────────────────── */}
        <SectionHeader title="SESSION" label />
        <Card style={styles.drawerCard}>
          <Text style={styles.controlLabel}>Duration</Text>
          <View style={styles.presetRow}>
            {DURATION_PRESETS.map((d) => (
              <PrimaryButton
                key={d}
                title={`${d}m`}
                variant={duration === d ? 'filled' : 'ghost'}
                onPress={() => setDuration(d)}
                style={styles.presetButton}
              />
            ))}
          </View>

          <PrimarySlider
            label="Duration"
            value={duration}
            onValueChange={(v) => setDuration(Math.round(v))}
            min={1}
            max={120}
            step={1}
            formatValue={(v) => `${Math.round(v)} min`}
            style={styles.slider}
          />

          <Text style={[styles.controlLabel, styles.labelSpacing]}>Fade In</Text>
          <View style={styles.presetRow}>
            {FADE_OPTIONS.map((f) => (
              <PrimaryButton
                key={`in-${f}`}
                title={f === 0 ? 'None' : `${f}s`}
                variant={fadeIn === f ? 'filled' : 'ghost'}
                onPress={() => setFadeIn(f)}
                style={styles.presetButton}
              />
            ))}
          </View>

          <Text style={[styles.controlLabel, styles.labelSpacing]}>Fade Out</Text>
          <View style={styles.presetRow}>
            {FADE_OPTIONS.map((f) => (
              <PrimaryButton
                key={`out-${f}`}
                title={f === 0 ? 'None' : `${f}s`}
                variant={fadeOut === f ? 'filled' : 'ghost'}
                onPress={() => setFadeOut(f)}
                style={styles.presetButton}
              />
            ))}
          </View>
        </Card>

        {/* ── Carrier Waveform ─────────────────────────────── */}
        <SectionHeader title="CARRIER WAVEFORM" label />
        <Card style={styles.drawerCard}>
          <SegmentedControl
            options={CARRIER_WAVEFORMS}
            selected={carrierWaveform}
            onSelect={handleCarrierWaveform}
            labels={CARRIER_LABELS}
          />
        </Card>

        {/* ── Stereo Width (binaural only) ─────────────────── */}
        {isBinaural && (
          <>
            <SectionHeader title="STEREO WIDTH" label />
            <Card style={styles.drawerCard}>
              <PrimarySlider
                label="Stereo Width"
                value={stereoWidth}
                onValueChange={handleStereoWidth}
                min={0}
                max={1}
                step={0.01}
                formatValue={(v) => `${Math.round(v * 100)}%`}
              />
              <Text style={styles.hint}>
                {stereoWidth < 0.1 ? 'Mono -- no binaural separation' : stereoWidth > 0.9 ? 'Full stereo -- maximum binaural effect' : 'Partial stereo separation'}
              </Text>
            </Card>
          </>
        )}

        {/* ── Export ───────────────────────────────────────── */}
        <View style={styles.drawerExportRow}>
          <PrimaryButton
            title={exporting ? 'Exporting...' : 'Export WAV'}
            variant="outline"
            onPress={handleExport}
            style={styles.buttonFlex}
            disabled={exporting}
          />
        </View>

        {/* ── Safety Notice ────────────────────────────────── */}
        <View style={[styles.safetyNotice, { backgroundColor: c.surfaceElevated }]}>
          <Text style={styles.safetyText}>
            {isBinaural
              ? '🎧 Binaural beats require stereo headphones for the intended effect.'
              : '🔊 Isochronal tones work with speakers or headphones.'}
          </Text>
        </View>

        {/* Info button */}
        <View style={styles.drawerInfoRow}>
          <IconButton
            variant="ghost"
            onPress={() =>
              Alert.alert(
                'Composer',
                'Build binaural beat sessions with ambient layers.\n\nBinaural beats work by playing slightly different frequencies in each ear -- the perceived beat frequency is the difference between them.\n\nUse headphones for the full effect.',
              )
            }
          >
            <Text style={styles.iconText}>ⓘ</Text>
          </IconButton>
        </View>
      </ControlDrawer>

      {/* Export progress overlay */}
      <Modal visible={exporting} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.progressCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={styles.progressTitle}>Exporting Audio...</Text>
            <View style={[styles.progressBarBg, { backgroundColor: c.surfaceElevated }]}>
              <View style={[styles.progressBarFill, { width: `${Math.round(exportProgress * 100)}%` }]} />
            </View>
            <Text style={styles.progressText}>{Math.round(exportProgress * 100)}%</Text>
          </View>
        </View>
      </Modal>

      <SavePresetModal
        visible={showSaveModal}
        defaultName={journeyEnabled ? `Journey ${journeyStart} \u2192 ${journeyEnd} ${duration}m` : `${beatDifference.toFixed(0)} Hz binaural`}
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
  // ── Top row: mode toggle + badge ─────────────────────
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  modeToggleCompact: {
    flex: 1,
  },
  badgeContainer: {
    flexShrink: 0,
  },
  badge: {
    fontSize: typography.xs,
    fontWeight: typography.medium,
    color: colors.accent,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  // ── Visualization ────────────────────────────────────
  vizContainer: {
    flex: 1,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.background,
    minHeight: 80,
  },
  isoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  isoLabel: {
    fontSize: typography.xs,
    fontWeight: typography.semibold,
    color: colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
  },
  isoFreq: {
    fontSize: typography.md,
    fontWeight: typography.bold,
    color: colors.textPrimary,
  },
  // ── Ear readouts (compact) ───────────────────────────
  earReadoutCompact: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
  },
  earBoxCompact: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  earDividerCompact: {
    width: 1,
    backgroundColor: colors.surfaceElevated,
    marginHorizontal: spacing.sm,
  },
  earLabelCompact: {
    fontSize: typography.xs,
    fontWeight: typography.semibold,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  earFreqCompact: {
    fontSize: typography.sm,
    fontWeight: typography.bold,
    color: colors.textPrimary,
  },
  // ── Rotary dials ─────────────────────────────────────
  dialRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.sm,
    marginVertical: spacing.xs,
  },
  // ── Brainwave presets ────────────────────────────────
  brainwaveRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginVertical: spacing.xs,
  },
  brainwaveButton: {
    flex: 1,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  brainwaveButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  brainwaveButtonText: {
    fontSize: typography.xs,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
  },
  brainwaveButtonTextActive: {
    color: colors.background,
  },
  journeyHint: {
    fontSize: typography.xs,
    color: colors.accent,
    fontWeight: typography.medium,
  },
  // ── Playback row ─────────────────────────────────────
  playbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginVertical: spacing.xs,
    gap: spacing.sm,
  },
  sessionButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    minWidth: 120,
    alignItems: 'center',
  },
  sessionButtonStop: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.danger,
  },
  sessionButtonText: {
    fontSize: typography.sm,
    fontWeight: typography.bold,
    color: colors.background,
  },
  sessionButtonTextStop: {
    color: colors.danger,
  },
  compactTimer: {
    flex: 1,
    gap: 2,
  },
  compactTimerText: {
    fontSize: typography.xs,
    fontWeight: typography.medium,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  compactTimerBarBg: {
    width: '100%',
    height: 3,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  compactTimerBarFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: radius.full,
  },
  compactActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  // ── Drawer toggle bar ────────────────────────────────
  drawerToggleRow: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    paddingTop: spacing.xs,
  },
  drawerToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  drawerToggleText: {
    fontSize: typography.xs,
    fontWeight: typography.medium,
    color: colors.textSecondary,
  },
  drawerToggleDot: {
    fontSize: typography.xs,
    color: colors.textMuted,
  },
  drawerToggleChevron: {
    fontSize: 10,
    color: colors.accent,
    marginLeft: spacing.xs,
  },
  // ── Drawer content styles ────────────────────────────
  drawerCard: {
    marginBottom: spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  controlLabel: {
    fontSize: typography.sm,
    fontWeight: typography.medium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  labelSpacing: {
    marginTop: spacing.lg,
  },
  slider: {
    marginTop: spacing.lg,
  },
  presetRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  presetButton: {
    flex: 1,
    minWidth: 56,
    paddingVertical: spacing.xs,
  },
  hint: {
    fontSize: typography.xs,
    color: colors.textMuted,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  journeyContent: {
    marginTop: spacing.md,
  },
  // Ambient layer styles
  layerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  toggleButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minWidth: 44,
  },
  layerTypeRow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  layerTypeButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  layerSlider: {
    marginTop: spacing.sm,
  },
  removeText: {
    fontSize: 14,
    color: colors.danger,
  },
  addLayerButton: {
    marginBottom: spacing.md,
  },
  drawerExportRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  buttonFlex: {
    flex: 1,
  },
  iconText: {
    fontSize: 18,
    color: colors.accent,
  },
  iconFilledText: {
    fontSize: 18,
    color: colors.background,
  },
  safetyNotice: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.highlight + '33',
  },
  safetyText: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  drawerInfoRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  // Export progress modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  progressCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  progressTitle: {
    fontSize: typography.lg,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  progressBarBg: {
    width: '100%',
    height: 6,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.full,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: radius.full,
  },
  progressText: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    fontWeight: typography.medium,
  },
});
