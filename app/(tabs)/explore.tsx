import { useState, useCallback, useRef, useEffect } from 'react';
import { Alert, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useToneGenerator } from '@/src/hooks/useToneGenerator';
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
} from '@/src/components';
import { colors, spacing, typography, radius } from '@/src/theme';
import type { NoiseType } from '@/src/audio';

const WAVEFORMS = ['sine', 'square', 'saw', 'triangle'] as const;
type Waveform = (typeof WAVEFORMS)[number];

const WAVEFORM_LABELS: Record<Waveform, string> = {
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
type SourceMode = (typeof SOURCE_MODES)[number];
const SOURCE_MODE_LABELS: Record<SourceMode, string> = {
  tone: 'Tone',
  noise: 'Noise',
};

const NOTE_PRESETS = [
  { label: 'A4', freq: 440 },
  { label: 'C4', freq: 261.63 },
  { label: 'E4', freq: 329.63 },
  { label: 'G4', freq: 392 },
] as const;

export default function ExploreScreen() {
  const [sourceMode, setSourceMode] = useState<SourceMode>('tone');
  const [frequency, setFrequency] = useState(440);
  const [amplitude, setAmplitude] = useState(0.5);
  const [waveform, setWaveform] = useState<Waveform>('sine');
  const [noiseType, setNoiseType] = useState<NoiseType>('white');
  const [isPlaying, setIsPlaying] = useState(false);

  const tone = useToneGenerator();
  const isPlayingRef = useRef(false);

  const { width: screenWidth } = useWindowDimensions();
  const isTablet = screenWidth >= 768;

  const cardContentWidth = screenWidth - spacing.md * 4;
  const vizHeight = isTablet ? 200 : 140;

  const handlePlay = useCallback(async () => {
    try {
      if (sourceMode === 'noise') {
        await tone.playNoise(amplitude, noiseType);
      } else {
        await tone.play(frequency, amplitude, waveform);
      }
      setIsPlaying(true);
      isPlayingRef.current = true;
    } catch (e) {
      Alert.alert('Audio Error', 'Could not start playback.');
    }
  }, [tone, sourceMode, waveform, frequency, amplitude, noiseType]);

  const handleStop = useCallback(async () => {
    setIsPlaying(false);
    isPlayingRef.current = false;
    await tone.stop();
  }, [tone]);

  const handleReset = useCallback(async () => {
    setIsPlaying(false);
    isPlayingRef.current = false;
    await tone.stop();
    setFrequency(440);
    setAmplitude(0.5);
    setWaveform('sine');
    setNoiseType('white');
  }, [tone]);

  // Switch source mode — stop current playback for clean transition
  const handleSourceModeChange = useCallback(async (mode: SourceMode) => {
    if (isPlayingRef.current) {
      await tone.stop();
      setIsPlaying(false);
      isPlayingRef.current = false;
    }
    setSourceMode(mode);
  }, [tone]);

  // Update audio params live while playing
  useEffect(() => {
    if (!isPlayingRef.current) return;
    if (sourceMode === 'noise') {
      tone.updateNoiseParams(amplitude, noiseType);
    } else {
      tone.updateParams(frequency, amplitude, waveform);
    }
  }, [frequency, amplitude, waveform, noiseType, sourceMode, tone]);

  const vizBadge = sourceMode === 'noise'
    ? `${NOISE_LABELS[noiseType]} noise`
    : `${WAVEFORM_LABELS[waveform]} · ${Math.round(frequency)} Hz`;

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <SectionHeader title="Explore" subtitle="Tone generator & visualizations" />

        {/* Waveform Visualization */}
        <Card style={styles.vizCard} glowing={isPlaying}>
          <View style={styles.vizHeader}>
            <Text style={styles.vizTitle}>Waveform</Text>
            <Text style={styles.vizBadge}>{vizBadge}</Text>
          </View>
          <View style={styles.vizContainer}>
            <WaveformView
              waveform={waveform}
              frequency={frequency}
              amplitude={amplitude}
              width={cardContentWidth}
              height={vizHeight}
              isPlaying={isPlaying}
              noiseType={sourceMode === 'noise' ? noiseType : null}
            />
          </View>
        </Card>

        {/* Spectrum Visualization */}
        <Card style={styles.vizCard} glowing={isPlaying}>
          <View style={styles.vizHeader}>
            <Text style={styles.vizTitle}>Spectrum</Text>
            <Text style={styles.vizBadge}>{Math.round(amplitude * 100)}% level</Text>
          </View>
          <View style={styles.vizContainer}>
            <SpectrumView
              frequency={frequency}
              amplitude={amplitude}
              width={cardContentWidth}
              height={vizHeight}
              isPlaying={isPlaying}
              noiseType={sourceMode === 'noise' ? noiseType : null}
            />
          </View>
        </Card>

        {/* Source Mode Toggle */}
        <SectionHeader title="SOURCE" label />
        <Card style={styles.card}>
          <SegmentedControl
            options={SOURCE_MODES}
            selected={sourceMode}
            onSelect={handleSourceModeChange}
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

              <PrimarySlider
                label="Frequency"
                value={frequency}
                onValueChange={setFrequency}
                min={20}
                max={2000}
                step={1}
                formatValue={(v) => `${Math.round(v)} Hz`}
                style={styles.slider}
              />

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
          <IconButton variant="filled" onPress={() => Alert.alert('Save', 'Preset save coming soon')}>
            <Text style={styles.iconFilledText}>♡</Text>
          </IconButton>
          <IconButton variant="ghost" onPress={() => Alert.alert('Info', 'Explore sound with different waveform shapes, frequencies, noise types, and amplitudes.')}>
            <Text style={styles.iconText}>ⓘ</Text>
          </IconButton>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
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
  noiseHint: {
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
  bottomSpacer: {
    height: spacing.xxl,
  },
});
