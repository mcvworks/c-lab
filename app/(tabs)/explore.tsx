import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
} from '@/src/components';
import type { QuickPreset } from '@/src/components';
import { colors, spacing, typography, radius } from '@/src/theme';
import type { NoiseType, SourceMode, WaveformType, FrequencyScale, RoomPreset } from '@/src/audio';
import { SympatheticStringsEngine, ROOM_PRESETS, ROOM_LABELS } from '@/src/audio';

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

const SOURCE_MODES = ['tone', 'noise'] as const;
const SOURCE_MODE_LABELS: Record<SourceMode, string> = {
  tone: 'Tone',
  noise: 'Noise',
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

export default function ExploreScreen() {
  const {
    sourceMode, frequency, amplitude, waveform, noiseType, detune, pan, frequencyScale, harmonics, attack, release, isPlaying,
    roomEnabled, roomPreset, roomWetDry,
    setSourceMode, setFrequency, setAmplitude, setWaveform, setNoiseType,
    setDetune, setPan, setFrequencyScale, setHarmonic, setAttack, setRelease,
    setRoomEnabled, setRoomPreset, setRoomWetDry,
    play, stop, reset,
  } = useAudioStore();

  const savePreset = usePresetStore((s) => s.savePreset);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [harmonicsExpanded, setHarmonicsExpanded] = useState(false);

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

  const { contentWidth, vizHeight, isTablet } = useResponsive();
  const cardContentWidth = contentWidth - spacing.md * 2;

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

  const handlePlay = useCallback(async () => {
    try {
      await play();
    } catch (e) {
      Alert.alert('Audio Error', 'Could not start playback.');
    }
  }, [play]);

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

  const vizBadge = sourceMode === 'noise'
    ? `${NOISE_LABELS[noiseType]} noise`
    : `${WAVEFORM_LABELS[waveform]} · ${Math.round(frequency)} Hz`;

  // Pan label helper
  const panLabel = pan === 0 ? 'Center' : pan < 0 ? `${Math.round(Math.abs(pan) * 100)}% L` : `${Math.round(pan * 100)}% R`;

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <SectionHeader title="Explore" subtitle="Tone generator & visualizations" />

        <PresetBar
          presets={EXPLORE_PRESETS}
          onSelect={handleQuickPreset}
          activeIndex={activePresetIndex >= 0 ? activePresetIndex : null}
        />

        {/* Visualizations — side by side on tablet */}
        <View style={isTablet ? styles.tabletRow : undefined}>
          <Card style={[styles.vizCard, isTablet && styles.tabletHalf]} glowing={isPlaying}>
            <View style={styles.vizHeader}>
              <Text style={styles.vizTitle}>Waveform</Text>
              <Text style={styles.vizBadge}>{vizBadge}</Text>
            </View>
            <View style={styles.vizContainer}>
              <WaveformView
                waveform={waveform}
                frequency={frequency}
                amplitude={amplitude}
                width={isTablet ? (cardContentWidth - spacing.md) / 2 : cardContentWidth}
                height={vizHeight}
                isPlaying={isPlaying}
                noiseType={sourceMode === 'noise' ? noiseType : null}
              />
            </View>
          </Card>

          <Card style={[styles.vizCard, isTablet && styles.tabletHalf]} glowing={isPlaying}>
            <View style={styles.vizHeader}>
              <Text style={styles.vizTitle}>Spectrum</Text>
              <Text style={styles.vizBadge}>{Math.round(amplitude * 100)}% level</Text>
            </View>
            <View style={styles.vizContainer}>
              <SpectrumView
                frequency={frequency}
                amplitude={amplitude}
                width={isTablet ? (cardContentWidth - spacing.md) / 2 : cardContentWidth}
                height={vizHeight}
                isPlaying={isPlaying}
                noiseType={sourceMode === 'noise' ? noiseType : null}
              />
            </View>
          </Card>
        </View>

        {/* Source Mode Toggle */}
        <SectionHeader title="SOURCE" label />
        <Card style={styles.card}>
          <SegmentedControl
            options={SOURCE_MODES}
            selected={sourceMode}
            onSelect={setSourceMode}
            labels={SOURCE_MODE_LABELS}
          />
        </Card>

        {/* Controls — conditional on source mode */}
        {sourceMode === 'tone' ? (
          <>
            <SectionHeader title="TONE CONTROLS" label />
            <Card style={styles.card}>
              <Text style={styles.controlLabel}>Waveform Shape</Text>
              <SegmentedControl
                options={WAVEFORMS}
                selected={waveform}
                onSelect={setWaveform}
                labels={WAVEFORM_LABELS}
              />

              {/* Frequency scale toggle */}
              <View style={styles.freqScaleRow}>
                <Text style={[styles.controlLabel, { marginBottom: 0 }]}>Frequency</Text>
                <SegmentedControl
                  options={FREQ_SCALE_OPTIONS}
                  selected={frequencyScale}
                  onSelect={setFrequencyScale}
                  labels={FREQ_SCALE_LABELS}
                />
              </View>

              {frequencyScale === 'linear' ? (
                <PrimarySlider
                  label="Frequency"
                  value={frequency}
                  onValueChange={setFrequency}
                  min={20}
                  max={2000}
                  step={1}
                  formatValue={(v) => `${Math.round(v)} Hz`}
                />
              ) : (
                <PrimarySlider
                  label="Frequency"
                  value={logSliderValue}
                  onValueChange={handleLogFrequency}
                  min={0}
                  max={1}
                  step={0.001}
                  formatValue={() => `${Math.round(frequency)} Hz`}
                />
              )}

              <View style={styles.presetRow}>
                {NOTE_PRESETS.map((note) => (
                  <PrimaryButton
                    key={note.label}
                    title={note.label}
                    variant={Math.abs(frequency - note.freq) < 1 ? 'filled' : 'ghost'}
                    onPress={() => setFrequency(note.freq)}
                    style={styles.presetButton}
                  />
                ))}
              </View>

              <PrimarySlider
                label="Amplitude"
                value={amplitude}
                onValueChange={setAmplitude}
                min={0}
                max={1}
                step={0.01}
                formatValue={(v) => `${Math.round(v * 100)}%`}
                style={styles.slider}
              />

              <PrimarySlider
                label="Detune"
                value={detune}
                onValueChange={setDetune}
                min={-100}
                max={100}
                step={1}
                formatValue={(v) => `${v > 0 ? '+' : ''}${Math.round(v)} cents`}
                style={styles.slider}
              />
            </Card>

            {/* Harmonics — collapsible */}
            <Card style={styles.card}>
              <Pressable
                style={styles.harmonicsHeader}
                onPress={() => setHarmonicsExpanded((v) => !v)}
              >
                <Text style={styles.controlLabel}>Harmonics</Text>
                <Text style={styles.harmonicsToggle}>{harmonicsExpanded ? '▾' : '▸'}</Text>
              </Pressable>
              {harmonicsExpanded && (
                <View>
                  <PrimarySlider
                    label="2nd (2×)"
                    value={harmonics[0]}
                    onValueChange={(v) => setHarmonic(0, v)}
                    min={0}
                    max={1}
                    step={0.01}
                    formatValue={(v) => `${Math.round(v * 100)}%`}
                  />
                  <PrimarySlider
                    label="3rd (3×)"
                    value={harmonics[1]}
                    onValueChange={(v) => setHarmonic(1, v)}
                    min={0}
                    max={1}
                    step={0.01}
                    formatValue={(v) => `${Math.round(v * 100)}%`}
                    style={styles.slider}
                  />
                  <PrimarySlider
                    label="4th (4×)"
                    value={harmonics[2]}
                    onValueChange={(v) => setHarmonic(2, v)}
                    min={0}
                    max={1}
                    step={0.01}
                    formatValue={(v) => `${Math.round(v * 100)}%`}
                    style={styles.slider}
                  />
                  <Text style={styles.noiseHint}>
                    Blend in overtones to shape the timbre. Each harmonic is a multiple of the base frequency.
                  </Text>
                </View>
              )}
            </Card>
          </>
        ) : (
          <>
            <SectionHeader title="NOISE CONTROLS" label />
            <Card style={styles.card}>
              <Text style={styles.controlLabel}>Noise Type</Text>
              <SegmentedControl
                options={NOISE_TYPES}
                selected={noiseType}
                onSelect={setNoiseType}
                labels={NOISE_LABELS}
              />

              <PrimarySlider
                label="Amplitude"
                value={amplitude}
                onValueChange={setAmplitude}
                min={0}
                max={1}
                step={0.01}
                formatValue={(v) => `${Math.round(v * 100)}%`}
                style={styles.slider}
              />

              <Text style={styles.noiseHint}>
                {noiseType === 'white' && 'Equal energy across all frequencies — like static or rushing air.'}
                {noiseType === 'pink' && 'More bass, softer highs — natural and balanced, like a waterfall.'}
                {noiseType === 'brown' && 'Deep, rumbling low frequencies — like thunder or ocean waves.'}
              </Text>
            </Card>
          </>
        )}

        {/* Stereo Pan — shared by tone and noise */}
        <SectionHeader title="STEREO" label />
        <Card style={styles.card}>
          <PrimarySlider
            label="Pan"
            value={pan}
            onValueChange={setPan}
            min={-1}
            max={1}
            step={0.01}
            formatValue={() => panLabel}
          />
          <View style={styles.panLabels}>
            <Text style={styles.panEndLabel}>L</Text>
            <Text style={styles.panEndLabel}>R</Text>
          </View>
        </Card>

        {/* Envelope */}
        <SectionHeader title="ENVELOPE" label />
        <Card style={styles.card}>
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
            style={styles.slider}
          />
          <Text style={styles.noiseHint}>
            Attack fades in on play. Release fades out on stop. Small values feel snappy; larger values create smooth transitions.
          </Text>
        </Card>

        {/* Room / Space Reverb */}
        <SectionHeader title="SPACE" label />
        <Card style={styles.card}>
          <View style={styles.stringsHeaderRow}>
            <Text style={styles.controlLabel}>Room Reverb</Text>
            <PrimaryButton
              title={roomEnabled ? 'ON' : 'OFF'}
              variant={roomEnabled ? 'filled' : 'ghost'}
              onPress={() => setRoomEnabled(!roomEnabled)}
              style={styles.stringsToggle}
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

              <RoomVisualizer
                preset={roomPreset}
                wetDry={roomWetDry}
                isPlaying={isPlaying}
              />

              <PrimarySlider
                label="Wet / Dry"
                value={roomWetDry}
                onValueChange={setRoomWetDry}
                min={0}
                max={1}
                step={0.01}
                formatValue={(v) => `${Math.round(v * 100)}%`}
                style={styles.slider}
              />

              <Text style={styles.noiseHint}>
                {roomPreset === 'smallRoom' && 'Tight, warm reflections — like a bedroom or studio booth.'}
                {roomPreset === 'cathedral' && 'Long, ethereal decay with rich harmonics — vast and immersive.'}
                {roomPreset === 'cave' && 'Deep, dark reverberations with slow absorption — subterranean warmth.'}
                {roomPreset === 'openAir' && 'Subtle early reflections with minimal decay — like an open field.'}
                {roomPreset === 'box' && 'Bright, metallic resonance in a tight container — crisp and present.'}
              </Text>
            </>
          )}
        </Card>

        {/* Sympathetic Strings — tone mode only */}
        {sourceMode === 'tone' && (
          <>
            <SectionHeader title="SYMPATHETIC STRINGS" label />
            <Card style={styles.card}>
              <View style={styles.stringsHeaderRow}>
                <Text style={styles.controlLabel}>Resonance</Text>
                <PrimaryButton
                  title={stringsEnabled ? 'ON' : 'OFF'}
                  variant={stringsEnabled ? 'filled' : 'ghost'}
                  onPress={() => setStringsEnabled((v) => !v)}
                  style={styles.stringsToggle}
                />
              </View>

              {stringsEnabled && (
                <>
                  <SympatheticStringsView
                    strings={stringNotes}
                    resonance={stringsResonance}
                    isPlaying={isPlaying}
                  />
                  <PrimarySlider
                    label="Sympathetic Volume"
                    value={stringsVolume}
                    onValueChange={setStringsVolume}
                    min={0}
                    max={0.5}
                    step={0.01}
                    formatValue={(v) => `${Math.round(v * 100)}%`}
                    style={styles.slider}
                  />
                  <Text style={styles.noiseHint}>
                    Virtual strings resonate when your tone matches their tuning. Harmonics of the played frequency also excite nearby strings.
                  </Text>
                </>
              )}
            </Card>
          </>
        )}

        {/* Playback Controls */}
        <View style={styles.buttonRow}>
          <PrimaryButton
            title={isPlaying ? 'Playing...' : sourceMode === 'noise' ? 'Play Noise' : 'Play Tone'}
            onPress={handlePlay}
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

        <View style={styles.iconRow}>
          <IconButton variant="outline" onPress={handleReset}>
            <Text style={styles.iconText}>↺</Text>
          </IconButton>
          <IconButton variant="filled" onPress={() => setShowSaveModal(true)}>
            <Text style={styles.iconFilledText}>♡</Text>
          </IconButton>
          <IconButton variant="ghost" onPress={() => Alert.alert('Info', 'Explore sound with different waveform shapes, frequencies, noise types, and amplitudes.\n\nDetune shifts pitch in small increments (cents).\nPan positions the sound in the stereo field.\nLog scale makes the frequency slider more musical.')}>
            <Text style={styles.iconText}>ⓘ</Text>
          </IconButton>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

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
  vizContainer: {
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.background,
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
  freqScaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  slider: {
    marginTop: spacing.lg,
  },
  presetRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  presetButton: {
    flex: 1,
    paddingVertical: spacing.xs,
  },
  harmonicsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  harmonicsToggle: {
    fontSize: typography.sm,
    color: colors.textMuted,
  },
  noiseHint: {
    fontSize: typography.xs,
    color: colors.textMuted,
    marginTop: spacing.md,
    lineHeight: 18,
  },
  panLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
    marginTop: -spacing.xs,
  },
  panEndLabel: {
    fontSize: typography.xs,
    fontWeight: typography.semibold,
    color: colors.textMuted,
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
  stringsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  stringsToggle: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    minWidth: 52,
  },
  bottomSpacer: {
    height: spacing.xxl,
  },
});
