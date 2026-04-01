import { useState, useCallback, useEffect, useRef } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useAudioStore } from '@/src/state/useAudioStore';
import { usePresetStore } from '@/src/state/usePresetStore';
import { useResponsive } from '@/src/hooks/useResponsive';
import { getHapticEngine } from '@/src/audio';
import type { WaveformType } from '@/src/audio';
import type { ExploreSettings } from '@/src/types/preset';
import {
  Screen,
  Card,
  SectionHeader,
  PrimaryButton,
  IconButton,
  PrimarySlider,
  SegmentedControl,
  SandPlateView,
  SavePresetModal,
  PresetBar,
} from '@/src/components';
import type { QuickPreset } from '@/src/components';
import { colors, spacing, typography, radius } from '@/src/theme';

const PLATE_SHAPES = ['circle', 'square', 'hexagon'] as const;
type PlateShape = (typeof PLATE_SHAPES)[number];
const PLATE_SHAPE_LABELS: Record<PlateShape, string> = {
  circle: 'Circle',
  square: 'Square',
  hexagon: 'Hex',
};

const PARTICLE_STYLES = ['sand', 'salt', 'metal'] as const;
type ParticleStyle = (typeof PARTICLE_STYLES)[number];
const PARTICLE_STYLE_LABELS: Record<ParticleStyle, string> = {
  sand: 'Sand',
  salt: 'Salt',
  metal: 'Metal',
};

const WAVEFORMS: WaveformType[] = ['sine', 'square', 'saw', 'triangle'];
const WAVEFORM_LABELS: Record<WaveformType, string> = {
  sine: 'Sine',
  square: 'Square',
  saw: 'Saw',
  triangle: 'Tri',
};

const FREQ_PRESETS = [
  { label: '174', freq: 174 },
  { label: '285', freq: 285 },
  { label: '396', freq: 396 },
  { label: '528', freq: 528 },
  { label: '639', freq: 639 },
] as const;

/** Map our waveform names to Web Audio OscillatorType */
const OSC_TYPE: Record<WaveformType, OscillatorType> = {
  sine: 'sine',
  square: 'square',
  saw: 'sawtooth',
  triangle: 'triangle',
};

// ── Musical intervals ────────────────────────────────────────────────
const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'] as const;

/** Concert pitch frequencies for octave 3 (middle range, good for cymatics) */
function noteFrequency(noteIndex: number, octave: number = 3): number {
  // A4 = 440 Hz. noteIndex 9 = A, octave 4 => 440
  const semitonesFromA4 = (octave - 4) * 12 + (noteIndex - 9);
  return Math.round(440 * Math.pow(2, semitonesFromA4 / 12));
}

interface MusicalInterval {
  name: string;
  shortName: string;
  ratio: string;
  semitones: number;
  consonance: 'perfect' | 'consonant' | 'dissonant';
}

const INTERVALS: MusicalInterval[] = [
  { name: 'Unison',       shortName: 'P1',  ratio: '1:1',   semitones: 0,  consonance: 'perfect' },
  { name: 'Minor 2nd',    shortName: 'm2',  ratio: '16:15', semitones: 1,  consonance: 'dissonant' },
  { name: 'Major 2nd',    shortName: 'M2',  ratio: '9:8',   semitones: 2,  consonance: 'dissonant' },
  { name: 'Minor 3rd',    shortName: 'm3',  ratio: '6:5',   semitones: 3,  consonance: 'consonant' },
  { name: 'Major 3rd',    shortName: 'M3',  ratio: '5:4',   semitones: 4,  consonance: 'consonant' },
  { name: 'Perfect 4th',  shortName: 'P4',  ratio: '4:3',   semitones: 5,  consonance: 'perfect' },
  { name: 'Tritone',      shortName: 'TT',  ratio: '45:32', semitones: 6,  consonance: 'dissonant' },
  { name: 'Perfect 5th',  shortName: 'P5',  ratio: '3:2',   semitones: 7,  consonance: 'perfect' },
  { name: 'Minor 6th',    shortName: 'm6',  ratio: '8:5',   semitones: 8,  consonance: 'consonant' },
  { name: 'Major 6th',    shortName: 'M6',  ratio: '5:3',   semitones: 9,  consonance: 'consonant' },
  { name: 'Minor 7th',    shortName: 'm7',  ratio: '16:9',  semitones: 10, consonance: 'dissonant' },
  { name: 'Octave',       shortName: 'P8',  ratio: '2:1',   semitones: 12, consonance: 'perfect' },
];

const CONSONANCE_COLORS: Record<string, string> = {
  perfect: '#4CAF50',
  consonant: '#64B5F6',
  dissonant: '#FF8A65',
};

const INTERVAL_HINT =
  'Consonant intervals (green/blue) produce orderly, symmetric patterns — their frequencies share simple ratios. ' +
  'Dissonant intervals (orange) create complex, chaotic patterns because their frequency ratios are more complex.';

const SWEEP_SPEEDS = ['slow', 'medium', 'fast'] as const;
type SweepSpeed = (typeof SWEEP_SPEEDS)[number];
const SWEEP_SPEED_LABELS: Record<SweepSpeed, string> = { slow: 'Slow', medium: 'Med', fast: 'Fast' };
const SWEEP_HZ_PER_SEC: Record<SweepSpeed, number> = { slow: 20, medium: 60, fast: 150 };

// ── Quick presets ─────────────────────────────────────────────────────
interface CymaticsQuickPreset {
  frequency: number;
  amplitude: number;
  waveform: WaveformType;
  dualFreq?: boolean;
  frequency2?: number;
  waveform2?: WaveformType;
  damping?: number;
  plateShape: PlateShape;
  particleStyle: ParticleStyle;
}

const CYMATICS_PRESETS: QuickPreset<CymaticsQuickPreset>[] = [
  { label: 'Classic',      settings: { frequency: 440, amplitude: 0.6,  waveform: 'sine',     plateShape: 'circle',  particleStyle: 'sand'  } },
  { label: 'Crystal Star', settings: { frequency: 528, amplitude: 0.75, waveform: 'sine',     plateShape: 'hexagon', particleStyle: 'salt'  } },
  { label: 'Metal Grid',   settings: { frequency: 396, amplitude: 0.8,  waveform: 'square',   plateShape: 'square',  particleStyle: 'metal' } },
  { label: 'Interference', settings: { frequency: 440, amplitude: 0.65, waveform: 'sine', dualFreq: true, frequency2: 660, waveform2: 'sine', plateShape: 'circle', particleStyle: 'salt' } },
  { label: 'Drifty',       settings: { frequency: 285, amplitude: 0.6,  waveform: 'sine', damping: 0.96, plateShape: 'circle', particleStyle: 'sand' } },
  { label: 'Buzz Hex',     settings: { frequency: 285, amplitude: 0.7,  waveform: 'saw',      plateShape: 'hexagon', particleStyle: 'metal' } },
  { label: 'Perfect 5th', settings: { frequency: 262, amplitude: 0.65, waveform: 'sine', dualFreq: true, frequency2: 392, waveform2: 'sine', plateShape: 'circle', particleStyle: 'salt' } },
  { label: 'Tritone',     settings: { frequency: 262, amplitude: 0.65, waveform: 'sine', dualFreq: true, frequency2: 370, waveform2: 'sine', plateShape: 'circle', particleStyle: 'sand' } },
];

export default function CymaticsScreen() {
  // Cymatics-specific visual state (not shared)
  const [plateShape, setPlateShape] = useState<PlateShape>('circle');
  const [particleStyle, setParticleStyle] = useState<ParticleStyle>('sand');
  const [isFrozen, setIsFrozen] = useState(false);

  // Dual-frequency state
  const [dualFreq, setDualFreq] = useState(false);
  const [frequency2, setFrequency2] = useState(660);
  const [waveform2, setWaveform2] = useState<WaveformType>('sine');

  // Intervals mode state
  const [intervalsMode, setIntervalsMode] = useState(false);
  const [rootNote, setRootNote] = useState(0); // index into NOTE_NAMES (0=C)
  const [rootOctave, setRootOctave] = useState(3);
  const [selectedInterval, setSelectedInterval] = useState(7); // index into INTERVALS (7=P5)

  // Damping override (null = use material default)
  const [damping, setDamping] = useState<number | null>(null);

  // Sweep state
  const [sweepEnabled, setSweepEnabled] = useState(false);
  const [sweepStart, setSweepStart] = useState(100);
  const [sweepEnd, setSweepEnd] = useState(800);
  const [sweepSpeed, setSweepSpeed] = useState<SweepSpeed>('medium');
  const [sweepLoop, setSweepLoop] = useState(true);
  const sweepRafRef = useRef<number | null>(null);
  const sweepLastTimeRef = useRef<number | null>(null);
  const sweepDirRef = useRef<1 | -1>(1); // 1 = forward, -1 = reverse

  // Second oscillator refs (Web Audio)
  const osc2Ref = useRef<OscillatorNode | null>(null);
  const gain2Ref = useRef<GainNode | null>(null);
  const ctx2Ref = useRef<AudioContext | null>(null);

  // Shared audio state
  const {
    frequency, amplitude, waveform, isPlaying, hapticEnabled,
    setFrequency, setAmplitude, setWaveform, setSourceMode,
    play, stop,
  } = useAudioStore();

  // Gentle haptic pulse when cymatics frequency changes
  const prevFreqRef = useRef(frequency);
  useEffect(() => {
    if (!isPlaying || !hapticEnabled) return;
    const delta = Math.abs(frequency - prevFreqRef.current);
    prevFreqRef.current = frequency;
    if (delta > 5) {
      const intensity = Math.min(0.6, delta / 200);
      getHapticEngine().pulseCymatics(intensity);
    }
  }, [frequency, isPlaying, hapticEnabled]);

  // ── Second oscillator management ──────────────────────────────────
  const startOsc2 = useCallback(() => {
    if (Platform.OS !== 'web') return;
    stopOsc2Internal();
    const ctx = ctx2Ref.current ?? new AudioContext();
    ctx2Ref.current = ctx;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    osc.type = OSC_TYPE[waveform2];
    osc.frequency.setValueAtTime(frequency2, ctx.currentTime);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(amplitude, ctx.currentTime);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc2Ref.current = osc;
    gain2Ref.current = gain;
  }, [frequency2, waveform2, amplitude]);

  const stopOsc2Internal = useCallback(() => {
    if (osc2Ref.current) {
      try { osc2Ref.current.stop(); osc2Ref.current.disconnect(); } catch { /* */ }
      osc2Ref.current = null;
    }
    if (gain2Ref.current) {
      try { gain2Ref.current.disconnect(); } catch { /* */ }
      gain2Ref.current = null;
    }
  }, []);

  const stopOsc2 = useCallback(() => {
    if (gain2Ref.current && ctx2Ref.current) {
      const now = ctx2Ref.current.currentTime;
      gain2Ref.current.gain.cancelScheduledValues(now);
      gain2Ref.current.gain.setValueAtTime(gain2Ref.current.gain.value, now);
      gain2Ref.current.gain.linearRampToValueAtTime(0, now + 0.06);
      const oscRef = osc2Ref.current;
      const gainRef = gain2Ref.current;
      osc2Ref.current = null;
      gain2Ref.current = null;
      setTimeout(() => {
        try { oscRef?.stop(); oscRef?.disconnect(); gainRef?.disconnect(); } catch { /* */ }
      }, 80);
    } else {
      stopOsc2Internal();
    }
  }, [stopOsc2Internal]);

  // Update second oscillator parameters in real time
  useEffect(() => {
    if (!osc2Ref.current || !gain2Ref.current || !ctx2Ref.current) return;
    const now = ctx2Ref.current.currentTime;
    osc2Ref.current.frequency.linearRampToValueAtTime(frequency2, now + 0.03);
    if (osc2Ref.current.type !== OSC_TYPE[waveform2]) {
      osc2Ref.current.type = OSC_TYPE[waveform2];
    }
    gain2Ref.current.gain.linearRampToValueAtTime(amplitude, now + 0.03);
  }, [frequency2, waveform2, amplitude]);

  // Start/stop second osc when dual mode or playback changes
  useEffect(() => {
    if (isPlaying && dualFreq) {
      startOsc2();
    } else {
      stopOsc2();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, dualFreq]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopOsc2Internal();
      if (ctx2Ref.current) {
        try { ctx2Ref.current.close(); } catch { /* */ }
        ctx2Ref.current = null;
      }
    };
  }, [stopOsc2Internal]);

  // ── Intervals mode sync ────────────────────────────────────────────
  useEffect(() => {
    if (!intervalsMode) return;
    const rootFreq = noteFrequency(rootNote, rootOctave);
    const interval = INTERVALS[selectedInterval];
    const secondFreq = Math.round(rootFreq * Math.pow(2, interval.semitones / 12));
    setFrequency(rootFreq);
    setDualFreq(true);
    setFrequency2(Math.min(secondFreq, 2000));
  }, [intervalsMode, rootNote, rootOctave, selectedInterval, setFrequency]);

  const handleIntervalToggle = useCallback((enabled: boolean) => {
    setIntervalsMode(enabled);
    if (!enabled) {
      // Keep dual freq on but let user control manually
    }
  }, []);

  const handleRootNoteChange = useCallback((noteIdx: number) => {
    setRootNote(noteIdx);
  }, []);

  // ── Sweep animation loop ──────────────────────────────────────────
  useEffect(() => {
    if (!sweepEnabled || !isPlaying) {
      if (sweepRafRef.current != null) {
        cancelAnimationFrame(sweepRafRef.current);
        sweepRafRef.current = null;
      }
      sweepLastTimeRef.current = null;
      return;
    }

    // Initialize sweep at start frequency
    sweepDirRef.current = 1;
    setFrequency(sweepStart);

    const tick = (time: number) => {
      if (sweepLastTimeRef.current != null) {
        const dt = Math.min(0.1, (time - sweepLastTimeRef.current) / 1000);
        const hzPerSec = SWEEP_HZ_PER_SEC[sweepSpeed];
        const currentFreq = useAudioStore.getState().frequency;
        let next = currentFreq + hzPerSec * dt * sweepDirRef.current;

        if (sweepDirRef.current === 1 && next >= sweepEnd) {
          next = sweepEnd;
          if (sweepLoop) {
            sweepDirRef.current = -1;
          } else {
            setSweepEnabled(false);
            return;
          }
        } else if (sweepDirRef.current === -1 && next <= sweepStart) {
          next = sweepStart;
          if (sweepLoop) {
            sweepDirRef.current = 1;
          } else {
            setSweepEnabled(false);
            return;
          }
        }

        setFrequency(Math.round(next));
      }
      sweepLastTimeRef.current = time;
      sweepRafRef.current = requestAnimationFrame(tick);
    };

    sweepRafRef.current = requestAnimationFrame(tick);
    return () => {
      if (sweepRafRef.current != null) {
        cancelAnimationFrame(sweepRafRef.current);
        sweepRafRef.current = null;
      }
      sweepLastTimeRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sweepEnabled, isPlaying, sweepSpeed, sweepStart, sweepEnd, sweepLoop]);

  const handleQuickPreset = useCallback((p: CymaticsQuickPreset) => {
    setSweepEnabled(false);
    setIntervalsMode(false);
    setFrequency(p.frequency);
    setAmplitude(p.amplitude);
    setWaveform(p.waveform);
    setDualFreq(!!p.dualFreq);
    setFrequency2(p.frequency2 ?? Math.round(p.frequency * 1.5));
    setWaveform2(p.waveform2 ?? 'sine');
    setDamping(p.damping ?? null);
    setPlateShape(p.plateShape);
    setParticleStyle(p.particleStyle);
  }, [setFrequency, setAmplitude, setWaveform]);

  const activePresetIndex = CYMATICS_PRESETS.findIndex((p) => {
    const s = p.settings;
    return s.frequency === frequency
      && s.amplitude === amplitude
      && s.waveform === waveform
      && (!!s.dualFreq) === dualFreq
      && s.plateShape === plateShape
      && s.particleStyle === particleStyle;
  });

  const { plateSize, isTablet } = useResponsive();

  // Preset save
  const savePreset = usePresetStore((s) => s.savePreset);
  const [showSaveModal, setShowSaveModal] = useState(false);

  const handleSavePreset = useCallback(async (name: string) => {
    const settings: ExploreSettings = {
      sourceMode: 'tone',
      frequency,
      amplitude,
      waveform,
      noiseType: 'white',
      dualFreq: dualFreq || undefined,
      frequency2: dualFreq ? frequency2 : undefined,
      waveform2: dualFreq ? waveform2 : undefined,
      damping: damping ?? undefined,
      sweepStart: sweepEnabled ? sweepStart : undefined,
      sweepEnd: sweepEnabled ? sweepEnd : undefined,
      sweepSpeed: sweepEnabled ? sweepSpeed : undefined,
      sweepLoop: sweepEnabled ? sweepLoop : undefined,
    };
    await savePreset(name, 'explore', settings);
    setShowSaveModal(false);
    Alert.alert('Saved', `Preset "${name || 'Cymatics Preset'}" saved to Library.`);
  }, [frequency, amplitude, waveform, dualFreq, frequency2, waveform2, damping, sweepEnabled, sweepStart, sweepEnd, sweepSpeed, sweepLoop, savePreset]);

  // Ensure presets are loaded
  const presetLoaded = usePresetStore((s) => s.loaded);
  const loadPresets = usePresetStore((s) => s.loadPresets);
  useEffect(() => {
    if (!presetLoaded) loadPresets();
  }, [presetLoaded, loadPresets]);

  const handlePlay = useCallback(async () => {
    try {
      setSourceMode('tone');
      await play();
      setIsFrozen(false);
    } catch {
      Alert.alert('Audio Error', 'Could not start playback.');
    }
  }, [play, setSourceMode]);

  const handleStop = useCallback(async () => {
    await stop();
  }, [stop]);

  const handleFreeze = useCallback(() => {
    setIsFrozen((prev) => !prev);
  }, []);

  const handleReset = useCallback(async () => {
    await stop();
    setSweepEnabled(false);
    setIntervalsMode(false);
    setIsFrozen(false);
    setDualFreq(false);
    setFrequency2(660);
    setWaveform2('sine');
    setDamping(null);
    setSweepStart(100);
    setSweepEnd(800);
    setSweepSpeed('medium');
    setSweepLoop(true);
    setFrequency(440);
    setAmplitude(0.6);
    setWaveform('sine');
    setPlateShape('circle');
    setParticleStyle('sand');
  }, [stop, setFrequency, setAmplitude, setWaveform]);

  const freqBadge = intervalsMode
    ? `${NOTE_NAMES[rootNote]}${rootOctave} ${INTERVALS[selectedInterval].name} (${INTERVALS[selectedInterval].ratio})`
    : dualFreq
      ? `${Math.round(frequency)} + ${Math.round(frequency2)} Hz · ${WAVEFORM_LABELS[waveform]} · ${PLATE_SHAPE_LABELS[plateShape]}`
      : `${Math.round(frequency)} Hz · ${WAVEFORM_LABELS[waveform]} · ${PLATE_SHAPE_LABELS[plateShape]}`;

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <SectionHeader title="Cymatics" subtitle="Digital sand plate simulation" />

        <PresetBar
          presets={CYMATICS_PRESETS}
          onSelect={handleQuickPreset}
          activeIndex={activePresetIndex >= 0 ? activePresetIndex : null}
        />

        {/* Sand Plate Visualization */}
        <Card style={styles.vizCard} glowing={isPlaying}>
          <View style={styles.vizHeader}>
            <Text style={styles.vizTitle}>Sand Plate</Text>
            <Text style={styles.vizBadge}>{freqBadge}</Text>
          </View>
          <View style={styles.plateWrapper}>
            <SandPlateView
              width={plateSize}
              height={plateSize}
              frequency={frequency}
              amplitude={amplitude}
              plateShape={plateShape}
              particleStyle={particleStyle}
              waveform={waveform}
              frequency2={dualFreq ? frequency2 : undefined}
              waveform2={dualFreq ? waveform2 : undefined}
              dampingOverride={damping ?? undefined}
              isPlaying={isPlaying}
              isFrozen={isFrozen}
            />
            {/* Frozen indicator overlay */}
            {isFrozen && (
              <View style={styles.frozenBadge}>
                <Text style={styles.frozenText}>FROZEN</Text>
              </View>
            )}
          </View>
        </Card>

        {/* Playback Controls */}
        <View style={styles.buttonRow}>
          <PrimaryButton
            title={isPlaying ? 'Playing...' : 'Vibrate'}
            onPress={handlePlay}
            style={styles.buttonFlex}
          />
          <PrimaryButton
            title={isFrozen ? 'Unfreeze' : 'Freeze'}
            variant="outline"
            onPress={handleFreeze}
            disabled={!isPlaying}
            style={styles.buttonFlex}
          />
          <PrimaryButton
            title="Stop"
            variant="outline"
            onPress={handleStop}
            disabled={!isPlaying}
            style={styles.buttonFlex}
          />
        </View>

        {/* Frequency & Plate controls — side by side on tablet */}
        <View style={isTablet ? styles.tabletRow : undefined}>
          <View style={isTablet ? styles.tabletHalf : undefined}>
            <SectionHeader title="FREQUENCY" label />
            <Card style={styles.card}>
              <PrimarySlider
                label="Frequency"
                value={frequency}
                onValueChange={setFrequency}
                min={20}
                max={2000}
                step={1}
                formatValue={(v) => `${Math.round(v)} Hz`}
              />

              <View style={styles.presetRow}>
                {FREQ_PRESETS.map((p) => (
                  <PrimaryButton
                    key={p.label}
                    title={`${p.label} Hz`}
                    variant={Math.abs(frequency - p.freq) < 1 ? 'filled' : 'ghost'}
                    onPress={() => setFrequency(p.freq)}
                    style={styles.presetButton}
                  />
                ))}
              </View>

              <PrimarySlider
                label="Intensity"
                value={amplitude}
                onValueChange={setAmplitude}
                min={0}
                max={1}
                step={0.01}
                formatValue={(v) => `${Math.round(v * 100)}%`}
                style={styles.slider}
              />

              {/* Dual Frequency toggle */}
              <View style={styles.dualToggleRow}>
                <Text style={styles.controlLabel}>Dual Frequency</Text>
                <Switch
                  value={dualFreq}
                  onValueChange={setDualFreq}
                  trackColor={{ false: colors.border, true: colors.accent }}
                  thumbColor={colors.textPrimary}
                />
              </View>

              {dualFreq && (
                <>
                  <PrimarySlider
                    label="Frequency 2"
                    value={frequency2}
                    onValueChange={setFrequency2}
                    min={20}
                    max={2000}
                    step={1}
                    formatValue={(v) => `${Math.round(v)} Hz`}
                  />
                  <Text style={styles.controlLabel}>Waveform 2</Text>
                  <SegmentedControl
                    options={WAVEFORMS}
                    selected={waveform2}
                    onSelect={setWaveform2}
                    labels={WAVEFORM_LABELS}
                  />
                  <Text style={styles.hint}>
                    Two frequencies create interference — particles settle at the intersection of both nodal line sets.
                  </Text>
                </>
              )}
            </Card>
          </View>

          {/* Waveform & Plate */}
          <View style={isTablet ? styles.tabletHalf : undefined}>
            <SectionHeader title="WAVEFORM & PLATE" label />
            <Card style={styles.card}>
              <Text style={styles.controlLabel}>Waveform</Text>
              <SegmentedControl
                options={WAVEFORMS}
                selected={waveform}
                onSelect={setWaveform}
                labels={WAVEFORM_LABELS}
              />

              <Text style={[styles.controlLabel, styles.labelSpacing]}>Plate Shape</Text>
              <SegmentedControl
                options={PLATE_SHAPES}
                selected={plateShape}
                onSelect={setPlateShape}
                labels={PLATE_SHAPE_LABELS}
              />

              <Text style={[styles.controlLabel, styles.labelSpacing]}>Particle Material</Text>
              <SegmentedControl
                options={PARTICLE_STYLES}
                selected={particleStyle}
                onSelect={setParticleStyle}
                labels={PARTICLE_STYLE_LABELS}
              />

              <Text style={styles.hint}>
                {particleStyle === 'sand' && 'Fine warm sand — classic Chladni plate aesthetic.'}
                {particleStyle === 'salt' && 'Fine white salt — bright and high contrast.'}
                {particleStyle === 'metal' && 'Iron filings — cool metallic shimmer.'}
              </Text>
            </Card>
          </View>
        </View>

        {/* Intervals Mode */}
        <SectionHeader title="INTERVALS" label />
        <Card style={styles.card}>
          <View style={styles.dualToggleRow}>
            <Text style={styles.controlLabel}>Interval Mode</Text>
            <Switch
              value={intervalsMode}
              onValueChange={handleIntervalToggle}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={colors.textPrimary}
            />
          </View>

          {intervalsMode && (
            <>
              {/* Root note selector */}
              <Text style={[styles.controlLabel, styles.labelSpacing]}>Root Note</Text>
              <View style={styles.noteGrid}>
                {NOTE_NAMES.map((name, idx) => (
                  <PrimaryButton
                    key={name}
                    title={name}
                    variant={rootNote === idx ? 'filled' : 'ghost'}
                    onPress={() => handleRootNoteChange(idx)}
                    style={styles.noteButton}
                  />
                ))}
              </View>

              {/* Octave selector */}
              <Text style={[styles.controlLabel, styles.labelSpacing]}>Octave</Text>
              <SegmentedControl
                options={['2', '3', '4', '5']}
                selected={String(rootOctave)}
                onSelect={(v: string) => setRootOctave(Number(v))}
                labels={{ '2': '2', '3': '3', '4': '4', '5': '5' }}
              />

              <Text style={styles.rootFreqLabel}>
                Root: {NOTE_NAMES[rootNote]}{rootOctave} = {noteFrequency(rootNote, rootOctave)} Hz
              </Text>

              {/* Interval buttons */}
              <Text style={[styles.controlLabel, styles.labelSpacing]}>Interval</Text>
              <View style={styles.intervalGrid}>
                {INTERVALS.map((interval, idx) => (
                  <PrimaryButton
                    key={interval.shortName}
                    title={interval.shortName}
                    variant={selectedInterval === idx ? 'filled' : 'ghost'}
                    onPress={() => setSelectedInterval(idx)}
                    style={selectedInterval === idx
                      ? { ...styles.intervalButton, backgroundColor: CONSONANCE_COLORS[interval.consonance] }
                      : styles.intervalButton
                    }
                  />
                ))}
              </View>

              {/* Active interval info */}
              <View style={styles.intervalInfo}>
                <Text style={styles.intervalName}>
                  {INTERVALS[selectedInterval].name}
                </Text>
                <Text style={[
                  styles.intervalRatio,
                  { color: CONSONANCE_COLORS[INTERVALS[selectedInterval].consonance] },
                ]}>
                  {INTERVALS[selectedInterval].ratio}
                </Text>
              </View>

              <Text style={styles.intervalFreqs}>
                {noteFrequency(rootNote, rootOctave)} Hz + {Math.min(Math.round(noteFrequency(rootNote, rootOctave) * Math.pow(2, INTERVALS[selectedInterval].semitones / 12)), 2000)} Hz
              </Text>

              {/* Educational hint */}
              <Text style={styles.hint}>{INTERVAL_HINT}</Text>

              {/* Consonance legend */}
              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: CONSONANCE_COLORS.perfect }]} />
                  <Text style={styles.legendLabel}>Perfect</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: CONSONANCE_COLORS.consonant }]} />
                  <Text style={styles.legendLabel}>Consonant</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: CONSONANCE_COLORS.dissonant }]} />
                  <Text style={styles.legendLabel}>Dissonant</Text>
                </View>
              </View>
            </>
          )}
        </Card>

        {/* Sweep & Damping — side by side on tablet */}
        <View style={isTablet ? styles.tabletRow : undefined}>
          <View style={isTablet ? styles.tabletHalf : undefined}>
            <SectionHeader title="FREQUENCY SWEEP" label />
            <Card style={styles.card}>
              <View style={styles.dualToggleRow}>
                <Text style={styles.controlLabel}>Auto-Sweep</Text>
                <Switch
                  value={sweepEnabled}
                  onValueChange={setSweepEnabled}
                  trackColor={{ false: colors.border, true: colors.accent }}
                  thumbColor={colors.textPrimary}
                />
              </View>

              {sweepEnabled && (
                <>
                  <PrimarySlider
                    label="Start"
                    value={sweepStart}
                    onValueChange={(v) => setSweepStart(Math.round(v))}
                    min={20}
                    max={2000}
                    step={1}
                    formatValue={(v) => `${Math.round(v)} Hz`}
                  />
                  <PrimarySlider
                    label="End"
                    value={sweepEnd}
                    onValueChange={(v) => setSweepEnd(Math.round(v))}
                    min={20}
                    max={2000}
                    step={1}
                    formatValue={(v) => `${Math.round(v)} Hz`}
                    style={styles.slider}
                  />
                  <Text style={[styles.controlLabel, styles.labelSpacing]}>Speed</Text>
                  <SegmentedControl
                    options={SWEEP_SPEEDS}
                    selected={sweepSpeed}
                    onSelect={setSweepSpeed}
                    labels={SWEEP_SPEED_LABELS}
                  />
                  <View style={styles.dualToggleRow}>
                    <Text style={styles.controlLabel}>Loop</Text>
                    <Switch
                      value={sweepLoop}
                      onValueChange={setSweepLoop}
                      trackColor={{ false: colors.border, true: colors.accent }}
                      thumbColor={colors.textPrimary}
                    />
                  </View>
                  <Text style={styles.hint}>
                    Sweeps the frequency between start and end values. {sweepLoop ? 'Bounces back and forth continuously.' : 'Stops at end.'}
                  </Text>
                </>
              )}
            </Card>
          </View>

          <View style={isTablet ? styles.tabletHalf : undefined}>
            <SectionHeader title="PHYSICS" label />
            <Card style={styles.card}>
              <PrimarySlider
                label="Damping"
                value={damping ?? 0.88}
                onValueChange={(v) => setDamping(v)}
                min={0.7}
                max={0.98}
                step={0.01}
                formatValue={(v) => {
                  if (v <= 0.78) return 'Snappy';
                  if (v <= 0.86) return 'Responsive';
                  if (v <= 0.92) return 'Normal';
                  return 'Drifty';
                }}
              />
              <Text style={styles.hint}>
                Controls how quickly particles settle. Low = snappy response, high = slow gliding momentum.
                {damping == null ? ' Currently using material default.' : ''}
              </Text>
              {damping != null && (
                <PrimaryButton
                  title="Reset to Material Default"
                  variant="ghost"
                  onPress={() => setDamping(null)}
                  style={styles.resetDampingButton}
                />
              )}
            </Card>
          </View>
        </View>

        {/* Utility Icons */}
        <View style={styles.iconRow}>
          <IconButton variant="outline" onPress={handleReset}>
            <Text style={styles.iconText}>↺</Text>
          </IconButton>
          <IconButton
            variant="filled"
            onPress={() => setShowSaveModal(true)}
          >
            <Text style={styles.iconFilledText}>♡</Text>
          </IconButton>
          <IconButton
            variant="ghost"
            onPress={() =>
              Alert.alert(
                'Cymatics',
                'Cymatics is the study of visible sound vibration patterns. Adjust the frequency and watch the nodal patterns shift on the plate. Different frequencies create different geometric patterns.',
              )
            }
          >
            <Text style={styles.iconText}>ⓘ</Text>
          </IconButton>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <SavePresetModal
        visible={showSaveModal}
        defaultName={`Cymatics ${Math.round(frequency)} Hz`}
        onSave={handleSavePreset}
        onCancel={() => setShowSaveModal(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  vizCard: {
    marginBottom: spacing.md,
  },
  vizHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  vizTitle: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  vizBadge: {
    fontSize: typography.xs,
    fontWeight: typography.medium,
    color: colors.accent,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  plateWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    overflow: 'hidden',
    paddingVertical: spacing.md,
    position: 'relative',
  },
  frozenBadge: {
    position: 'absolute',
    bottom: spacing.md + 8,
    right: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.highlight,
  },
  frozenText: {
    fontSize: typography.xs,
    fontWeight: typography.semibold,
    color: colors.highlight,
    letterSpacing: 1,
  },
  card: {
    marginBottom: spacing.md,
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
  dualToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  presetRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
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
    marginTop: spacing.md,
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  buttonFlex: {
    flex: 1,
  },
  iconRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  iconText: {
    fontSize: 18,
    color: colors.accent,
  },
  iconFilledText: {
    fontSize: 18,
    color: colors.background,
  },
  tabletRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  tabletHalf: {
    flex: 1,
  },
  resetDampingButton: {
    marginTop: spacing.sm,
  },
  noteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  noteButton: {
    minWidth: 40,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  rootFreqLabel: {
    fontSize: typography.sm,
    color: colors.accent,
    marginTop: spacing.md,
    textAlign: 'center',
    fontWeight: typography.medium,
  },
  intervalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  intervalButton: {
    minWidth: 44,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  intervalInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  intervalName: {
    fontSize: typography.md,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
  intervalRatio: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
  },
  intervalFreqs: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: typography.xs,
    color: colors.textMuted,
  },
  bottomSpacer: {
    height: spacing.xxl,
  },
});
