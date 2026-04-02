import { useState, useCallback, useEffect, useRef } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Switch, Text, View, useWindowDimensions } from 'react-native';
import { useAudioStore } from '@/src/state/useAudioStore';
import { usePresetStore } from '@/src/state/usePresetStore';
import { getHapticEngine } from '@/src/audio';
import type { WaveformType } from '@/src/audio';
import type { ExploreSettings } from '@/src/types/preset';
import {
  Screen,
  Card,
  PrimaryButton,
  IconButton,
  PrimarySlider,
  SegmentedControl,
  SandPlateView,
  SavePresetModal,
  PresetBar,
} from '@/src/components';
import RotaryDial from '@/src/components/RotaryDial';
import ControlDrawer from '@/src/components/ControlDrawer';
import SnapshotButton from '@/src/components/SnapshotButton';
import { useFrequencyDiscovery } from '@/src/hooks/useFrequencyDiscovery';
import { useDiscoveryToastStore } from '@/src/state/useDiscoveryToastStore';
import type { QuickPreset } from '@/src/components';
import { colors, useColors, spacing, typography, radius } from '@/src/theme';

const PLATE_SHAPES = ['circle', 'square', 'hexagon'] as const;
type PlateShape = (typeof PLATE_SHAPES)[number];
const PLATE_SHAPE_LABELS: Record<PlateShape, string> = { circle: '○', square: '□', hexagon: '⬡' };

const PARTICLE_STYLES = ['sand', 'salt', 'metal'] as const;
type ParticleStyle = (typeof PARTICLE_STYLES)[number];
const PARTICLE_STYLE_LABELS: Record<ParticleStyle, string> = { sand: 'Sand', salt: 'Salt', metal: 'Metal' };

const WAVEFORMS: WaveformType[] = ['sine', 'square', 'saw', 'triangle'];
const WAVEFORM_LABELS: Record<WaveformType, string> = { sine: 'Sin', square: 'Sq', saw: 'Saw', triangle: 'Tri' };

const OSC_TYPE: Record<WaveformType, OscillatorType> = { sine: 'sine', square: 'square', saw: 'sawtooth', triangle: 'triangle' };

// ── Musical intervals ──
const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'] as const;
function noteFrequency(noteIndex: number, octave: number = 3): number {
  const semitonesFromA4 = (octave - 4) * 12 + (noteIndex - 9);
  return Math.round(440 * Math.pow(2, semitonesFromA4 / 12));
}

interface MusicalInterval {
  name: string; shortName: string; ratio: string; semitones: number;
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

const CONSONANCE_COLORS: Record<string, string> = { perfect: '#4CAF50', consonant: '#64B5F6', dissonant: '#FF8A65' };

const SWEEP_SPEEDS = ['slow', 'medium', 'fast'] as const;
type SweepSpeed = (typeof SWEEP_SPEEDS)[number];
const SWEEP_SPEED_LABELS: Record<SweepSpeed, string> = { slow: 'Slow', medium: 'Med', fast: 'Fast' };
const SWEEP_HZ_PER_SEC: Record<SweepSpeed, number> = { slow: 20, medium: 60, fast: 150 };

interface CymaticsQuickPreset {
  frequency: number; amplitude: number; waveform: WaveformType;
  dualFreq?: boolean; frequency2?: number; waveform2?: WaveformType;
  damping?: number; plateShape: PlateShape; particleStyle: ParticleStyle;
}

const CYMATICS_PRESETS: QuickPreset<CymaticsQuickPreset>[] = [
  { label: 'Classic',      settings: { frequency: 440, amplitude: 0.6,  waveform: 'sine',   plateShape: 'circle',  particleStyle: 'sand'  } },
  { label: 'Crystal',      settings: { frequency: 528, amplitude: 0.75, waveform: 'sine',   plateShape: 'hexagon', particleStyle: 'salt'  } },
  { label: 'Metal',        settings: { frequency: 396, amplitude: 0.8,  waveform: 'square', plateShape: 'square',  particleStyle: 'metal' } },
  { label: 'Interference', settings: { frequency: 440, amplitude: 0.65, waveform: 'sine', dualFreq: true, frequency2: 660, waveform2: 'sine', plateShape: 'circle', particleStyle: 'salt' } },
  { label: 'Drifty',       settings: { frequency: 285, amplitude: 0.6,  waveform: 'sine', damping: 0.96, plateShape: 'circle', particleStyle: 'sand' } },
  { label: '5th',           settings: { frequency: 262, amplitude: 0.65, waveform: 'sine', dualFreq: true, frequency2: 392, waveform2: 'sine', plateShape: 'circle', particleStyle: 'salt' } },
];

export default function CymaticsScreen() {
  const c = useColors();
  const [plateShape, setPlateShape] = useState<PlateShape>('circle');
  const [particleStyle, setParticleStyle] = useState<ParticleStyle>('sand');
  const [isFrozen, setIsFrozen] = useState(false);
  const [dualFreq, setDualFreq] = useState(false);
  const [frequency2, setFrequency2] = useState(660);
  const [waveform2, setWaveform2] = useState<WaveformType>('sine');
  const [intervalsMode, setIntervalsMode] = useState(false);
  const [rootNote, setRootNote] = useState(0);
  const [rootOctave, setRootOctave] = useState(3);
  const [selectedInterval, setSelectedInterval] = useState(7);
  const [damping, setDamping] = useState<number | null>(null);
  const [sweepEnabled, setSweepEnabled] = useState(false);
  const [sweepStart, setSweepStart] = useState(100);
  const [sweepEnd, setSweepEnd] = useState(800);
  const [sweepSpeed, setSweepSpeed] = useState<SweepSpeed>('medium');
  const [sweepLoop, setSweepLoop] = useState(true);
  const sweepRafRef = useRef<number | null>(null);
  const sweepLastTimeRef = useRef<number | null>(null);
  const sweepDirRef = useRef<1 | -1>(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);

  const osc2Ref = useRef<OscillatorNode | null>(null);
  const gain2Ref = useRef<GainNode | null>(null);
  const ctx2Ref = useRef<AudioContext | null>(null);

  const {
    frequency, amplitude, waveform, isPlaying, hapticEnabled,
    setFrequency, setAmplitude, setWaveform, setSourceMode, setActiveSource,
    play, stop,
  } = useAudioStore();

  // ── Frequency discovery ────────────────────────────────────
  const showDiscoveryToast = useDiscoveryToastStore((s) => s.show);
  useFrequencyDiscovery({ frequency, isPlaying, source: 'cymatics', onDiscovery: showDiscoveryToast });

  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const plateSize = Math.min(screenWidth - spacing.md * 4, screenHeight * 0.4);

  // Haptic pulse on frequency change
  const prevFreqRef = useRef(frequency);
  useEffect(() => {
    if (!isPlaying || !hapticEnabled) return;
    const delta = Math.abs(frequency - prevFreqRef.current);
    prevFreqRef.current = frequency;
    if (delta > 5) getHapticEngine().pulseCymatics(Math.min(0.6, delta / 200));
  }, [frequency, isPlaying, hapticEnabled]);

  // ── Second oscillator management ──
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
    osc.connect(gain); gain.connect(ctx.destination); osc.start();
    osc2Ref.current = osc; gain2Ref.current = gain;
  }, [frequency2, waveform2, amplitude]);

  const stopOsc2Internal = useCallback(() => {
    if (osc2Ref.current) { try { osc2Ref.current.stop(); osc2Ref.current.disconnect(); } catch {} osc2Ref.current = null; }
    if (gain2Ref.current) { try { gain2Ref.current.disconnect(); } catch {} gain2Ref.current = null; }
  }, []);

  const stopOsc2 = useCallback(() => {
    if (gain2Ref.current && ctx2Ref.current) {
      const now = ctx2Ref.current.currentTime;
      gain2Ref.current.gain.cancelScheduledValues(now);
      gain2Ref.current.gain.setValueAtTime(gain2Ref.current.gain.value, now);
      gain2Ref.current.gain.linearRampToValueAtTime(0, now + 0.06);
      const o = osc2Ref.current; const g = gain2Ref.current;
      osc2Ref.current = null; gain2Ref.current = null;
      setTimeout(() => { try { o?.stop(); o?.disconnect(); g?.disconnect(); } catch {} }, 80);
    } else { stopOsc2Internal(); }
  }, [stopOsc2Internal]);

  useEffect(() => {
    if (!osc2Ref.current || !gain2Ref.current || !ctx2Ref.current) return;
    const now = ctx2Ref.current.currentTime;
    osc2Ref.current.frequency.linearRampToValueAtTime(frequency2, now + 0.03);
    if (osc2Ref.current.type !== OSC_TYPE[waveform2]) osc2Ref.current.type = OSC_TYPE[waveform2];
    gain2Ref.current.gain.linearRampToValueAtTime(amplitude, now + 0.03);
  }, [frequency2, waveform2, amplitude]);

  useEffect(() => {
    if (isPlaying && dualFreq) startOsc2(); else stopOsc2();
  }, [isPlaying, dualFreq]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => {
    stopOsc2Internal();
    if (ctx2Ref.current) { try { ctx2Ref.current.close(); } catch {} ctx2Ref.current = null; }
  }, [stopOsc2Internal]);

  // ── Intervals mode sync ──
  useEffect(() => {
    if (!intervalsMode) return;
    const rootFreq = noteFrequency(rootNote, rootOctave);
    const interval = INTERVALS[selectedInterval];
    const secondFreq = Math.round(rootFreq * Math.pow(2, interval.semitones / 12));
    setFrequency(rootFreq); setDualFreq(true); setFrequency2(Math.min(secondFreq, 2000));
  }, [intervalsMode, rootNote, rootOctave, selectedInterval, setFrequency]);

  // ── Sweep animation ──
  useEffect(() => {
    if (!sweepEnabled || !isPlaying) {
      if (sweepRafRef.current != null) { cancelAnimationFrame(sweepRafRef.current); sweepRafRef.current = null; }
      sweepLastTimeRef.current = null; return;
    }
    sweepDirRef.current = 1; setFrequency(sweepStart);
    const tick = (time: number) => {
      if (sweepLastTimeRef.current != null) {
        const dt = Math.min(0.1, (time - sweepLastTimeRef.current) / 1000);
        const currentFreq = useAudioStore.getState().frequency;
        let next = currentFreq + SWEEP_HZ_PER_SEC[sweepSpeed] * dt * sweepDirRef.current;
        if (sweepDirRef.current === 1 && next >= sweepEnd) {
          next = sweepEnd; if (sweepLoop) sweepDirRef.current = -1; else { setSweepEnabled(false); return; }
        } else if (sweepDirRef.current === -1 && next <= sweepStart) {
          next = sweepStart; if (sweepLoop) sweepDirRef.current = 1; else { setSweepEnabled(false); return; }
        }
        setFrequency(Math.round(next));
      }
      sweepLastTimeRef.current = time;
      sweepRafRef.current = requestAnimationFrame(tick);
    };
    sweepRafRef.current = requestAnimationFrame(tick);
    return () => { if (sweepRafRef.current != null) { cancelAnimationFrame(sweepRafRef.current); sweepRafRef.current = null; } sweepLastTimeRef.current = null; };
  }, [sweepEnabled, isPlaying, sweepSpeed, sweepStart, sweepEnd, sweepLoop]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleQuickPreset = useCallback((p: CymaticsQuickPreset) => {
    setSweepEnabled(false); setIntervalsMode(false);
    setFrequency(p.frequency); setAmplitude(p.amplitude); setWaveform(p.waveform);
    setDualFreq(!!p.dualFreq); setFrequency2(p.frequency2 ?? Math.round(p.frequency * 1.5));
    setWaveform2(p.waveform2 ?? 'sine'); setDamping(p.damping ?? null);
    setPlateShape(p.plateShape); setParticleStyle(p.particleStyle);
  }, [setFrequency, setAmplitude, setWaveform]);

  const activePresetIndex = CYMATICS_PRESETS.findIndex((p) => {
    const s = p.settings;
    return s.frequency === frequency && s.amplitude === amplitude && s.waveform === waveform
      && (!!s.dualFreq) === dualFreq && s.plateShape === plateShape && s.particleStyle === particleStyle;
  });

  const handlePlay = useCallback(async () => {
    try { setSourceMode('tone'); await play(); setActiveSource('cymatics'); setIsFrozen(false); }
    catch { Alert.alert('Audio Error', 'Could not start playback.'); }
  }, [play, setSourceMode, setActiveSource]);

  const handleStop = useCallback(async () => { await stop(); }, [stop]);
  const handleFreeze = useCallback(() => setIsFrozen((p) => !p), []);

  // Preset save
  const savePreset = usePresetStore((s) => s.savePreset);
  const presetLoaded = usePresetStore((s) => s.loaded);
  const loadPresets = usePresetStore((s) => s.loadPresets);
  useEffect(() => { if (!presetLoaded) loadPresets(); }, [presetLoaded, loadPresets]);

  const handleSavePreset = useCallback(async (name: string) => {
    const settings: ExploreSettings = {
      sourceMode: 'tone', frequency, amplitude, waveform, noiseType: 'white',
      dualFreq: dualFreq || undefined, frequency2: dualFreq ? frequency2 : undefined,
      waveform2: dualFreq ? waveform2 : undefined, damping: damping ?? undefined,
    };
    await savePreset(name, 'explore', settings);
    setShowSaveModal(false);
    Alert.alert('Saved', `Preset "${name || 'Cymatics Preset'}" saved to Library.`);
  }, [frequency, amplitude, waveform, dualFreq, frequency2, waveform2, damping, savePreset]);

  return (
    <Screen>
      <View style={styles.root}>
        {/* Top bar: presets */}
        <PresetBar
          presets={CYMATICS_PRESETS}
          onSelect={handleQuickPreset}
          activeIndex={activePresetIndex >= 0 ? activePresetIndex : null}
        />

        {/* Controls row: shape + material + waveform */}
        <View style={styles.controlRow}>
          <SegmentedControl options={PLATE_SHAPES} selected={plateShape} onSelect={setPlateShape} labels={PLATE_SHAPE_LABELS} style={styles.segFlex} />
          <SegmentedControl options={PARTICLE_STYLES} selected={particleStyle} onSelect={setParticleStyle} labels={PARTICLE_STYLE_LABELS} style={styles.segFlex} />
          <SegmentedControl options={WAVEFORMS} selected={waveform} onSelect={setWaveform} labels={WAVEFORM_LABELS} style={styles.segFlex} />
        </View>

        {/* Sand Plate — fills center */}
        <View style={styles.plateContainer}>
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
          {isFrozen && (
            <View style={[styles.frozenBadge, { backgroundColor: c.surfaceElevated }]}>
              <Text style={styles.frozenText}>FROZEN</Text>
            </View>
          )}
          {/* Freq badge overlay */}
          <View style={styles.freqBadgeOverlay}>
            <Text style={styles.freqBadgeText}>{Math.round(frequency)} Hz{dualFreq ? ` + ${Math.round(frequency2)} Hz` : ''}</Text>
          </View>
        </View>

        {/* Bottom controls: dials + buttons */}
        <View style={styles.bottomBar}>
          <RotaryDial
            label="Freq"
            value={frequency}
            onValueChange={setFrequency}
            min={20} max={2000} step={1}
            formatValue={(v) => `${Math.round(v)}`}
          />
          <RotaryDial
            label="Intensity"
            value={amplitude}
            onValueChange={setAmplitude}
            min={0} max={1} step={0.01}
            formatValue={(v) => `${Math.round(v * 100)}%`}
          />
          <View style={styles.buttonGroup}>
            <PrimaryButton
              title={isPlaying ? '■' : '▶'}
              onPress={isPlaying ? handleStop : handlePlay}
              style={styles.playBtn}
            />
            <PrimaryButton
              title={isFrozen ? '❄' : '❅'}
              variant="outline"
              onPress={handleFreeze}
              disabled={!isPlaying}
              style={styles.freezeBtn}
            />
          </View>
          <View style={styles.actionGroup}>
            <SnapshotButton
              source="cymatics"
              disabled={!isPlaying}
              defaultName={`Cymatics ${Math.round(frequency)} Hz`}
              getSettings={() => ({
                sourceMode: 'tone' as const, frequency, amplitude, waveform, noiseType: 'white' as const,
                dualFreq: dualFreq || undefined, frequency2: dualFreq ? frequency2 : undefined,
                waveform2: dualFreq ? waveform2 : undefined, damping: damping ?? undefined,
              })}
            />
            <IconButton variant="filled" onPress={() => setShowSaveModal(true)}>
              <Text style={[styles.iconFilledText, { color: c.background }]}>♡</Text>
            </IconButton>
            <Pressable onPress={() => setDrawerOpen(true)} style={[styles.moreBtn, { backgroundColor: c.surfaceElevated }]}>
              <Text style={styles.moreBtnText}>More</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* ── Control Drawer: advanced features ── */}
      <ControlDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} title="Advanced Controls">
        {/* Dual Frequency */}
        <Card style={styles.drawerCard}>
          <View style={styles.toggleRow}>
            <Text style={styles.drawerLabel}>Dual Frequency</Text>
            <Switch value={dualFreq} onValueChange={setDualFreq} trackColor={{ false: c.border, true: colors.accent }} thumbColor={colors.textPrimary} />
          </View>
          {dualFreq && (
            <>
              <PrimarySlider label="Frequency 2" value={frequency2} onValueChange={setFrequency2} min={20} max={2000} step={1} formatValue={(v) => `${Math.round(v)} Hz`} />
              <Text style={styles.drawerLabel}>Waveform 2</Text>
              <SegmentedControl options={WAVEFORMS} selected={waveform2} onSelect={setWaveform2} labels={WAVEFORM_LABELS} />
            </>
          )}
        </Card>

        {/* Intervals */}
        <Card style={styles.drawerCard}>
          <View style={styles.toggleRow}>
            <Text style={styles.drawerLabel}>Interval Mode</Text>
            <Switch value={intervalsMode} onValueChange={setIntervalsMode} trackColor={{ false: c.border, true: colors.accent }} thumbColor={colors.textPrimary} />
          </View>
          {intervalsMode && (
            <>
              <Text style={styles.drawerLabel}>Root Note</Text>
              <View style={styles.noteGrid}>
                {NOTE_NAMES.map((name, idx) => (
                  <PrimaryButton key={name} title={name} variant={rootNote === idx ? 'filled' : 'ghost'} onPress={() => setRootNote(idx)} style={styles.noteButton} />
                ))}
              </View>
              <Text style={styles.drawerLabel}>Octave</Text>
              <SegmentedControl options={['2', '3', '4', '5']} selected={String(rootOctave)} onSelect={(v: string) => setRootOctave(Number(v))} labels={{ '2': '2', '3': '3', '4': '4', '5': '5' }} />
              <Text style={styles.drawerLabel}>Interval</Text>
              <View style={styles.noteGrid}>
                {INTERVALS.map((interval, idx) => (
                  <PrimaryButton key={interval.shortName} title={interval.shortName}
                    variant={selectedInterval === idx ? 'filled' : 'ghost'}
                    onPress={() => setSelectedInterval(idx)}
                    style={selectedInterval === idx ? { ...styles.noteButton, backgroundColor: CONSONANCE_COLORS[interval.consonance] } : styles.noteButton}
                  />
                ))}
              </View>
              <Text style={styles.intervalInfo}>{INTERVALS[selectedInterval].name} ({INTERVALS[selectedInterval].ratio})</Text>
            </>
          )}
        </Card>

        {/* Sweep */}
        <Card style={styles.drawerCard}>
          <View style={styles.toggleRow}>
            <Text style={styles.drawerLabel}>Frequency Sweep</Text>
            <Switch value={sweepEnabled} onValueChange={setSweepEnabled} trackColor={{ false: c.border, true: colors.accent }} thumbColor={colors.textPrimary} />
          </View>
          {sweepEnabled && (
            <>
              <PrimarySlider label="Start" value={sweepStart} onValueChange={(v) => setSweepStart(Math.round(v))} min={20} max={2000} step={1} formatValue={(v) => `${Math.round(v)} Hz`} />
              <PrimarySlider label="End" value={sweepEnd} onValueChange={(v) => setSweepEnd(Math.round(v))} min={20} max={2000} step={1} formatValue={(v) => `${Math.round(v)} Hz`} />
              <Text style={styles.drawerLabel}>Speed</Text>
              <SegmentedControl options={SWEEP_SPEEDS} selected={sweepSpeed} onSelect={setSweepSpeed} labels={SWEEP_SPEED_LABELS} />
              <View style={styles.toggleRow}>
                <Text style={styles.drawerLabel}>Loop</Text>
                <Switch value={sweepLoop} onValueChange={setSweepLoop} trackColor={{ false: c.border, true: colors.accent }} thumbColor={colors.textPrimary} />
              </View>
            </>
          )}
        </Card>

        {/* Damping */}
        <Card style={styles.drawerCard}>
          <PrimarySlider
            label="Damping"
            value={damping ?? 0.88}
            onValueChange={setDamping}
            min={0.7} max={0.98} step={0.01}
            formatValue={(v) => v <= 0.78 ? 'Snappy' : v <= 0.86 ? 'Responsive' : v <= 0.92 ? 'Normal' : 'Drifty'}
          />
          {damping != null && (
            <PrimaryButton title="Reset Default" variant="ghost" onPress={() => setDamping(null)} />
          )}
        </Card>
      </ControlDrawer>

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
  root: {
    flex: 1,
  },
  controlRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs,
  },
  segFlex: {
    flex: 1,
  },
  plateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  frozenBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.md,
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
  freqBadgeOverlay: {
    position: 'absolute',
    bottom: spacing.sm,
    backgroundColor: 'rgba(26, 22, 18, 0.8)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  freqBadgeText: {
    fontSize: typography.xs,
    fontWeight: typography.semibold,
    color: colors.accent,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  buttonGroup: {
    flexDirection: 'column',
    gap: spacing.xs,
    alignItems: 'center',
  },
  playBtn: {
    width: 52,
    paddingVertical: spacing.sm,
  },
  freezeBtn: {
    width: 52,
    paddingVertical: spacing.xs,
  },
  actionGroup: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  moreBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.sm,
  },
  moreBtnText: {
    fontSize: typography.xs,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
  },
  iconFilledText: {
    fontSize: 18,
    color: colors.background,
  },
  // Drawer styles
  drawerCard: {
    marginBottom: spacing.sm,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  drawerLabel: {
    fontSize: typography.sm,
    fontWeight: typography.medium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  noteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  noteButton: {
    minWidth: 40,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  intervalInfo: {
    fontSize: typography.sm,
    color: colors.accent,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontWeight: typography.medium,
  },
});
