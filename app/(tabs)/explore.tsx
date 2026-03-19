import { useState, useCallback } from 'react';
import { Alert, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
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

const WAVEFORMS = ['sine', 'square', 'saw', 'triangle'] as const;
type Waveform = (typeof WAVEFORMS)[number];

const WAVEFORM_LABELS: Record<Waveform, string> = {
  sine: 'Sine',
  square: 'Square',
  saw: 'Saw',
  triangle: 'Tri',
};

const NOTE_PRESETS = [
  { label: 'A4', freq: 440 },
  { label: 'C4', freq: 261.63 },
  { label: 'E4', freq: 329.63 },
  { label: 'G4', freq: 392 },
] as const;

export default function ExploreScreen() {
  const [frequency, setFrequency] = useState(440);
  const [amplitude, setAmplitude] = useState(0.5);
  const [waveform, setWaveform] = useState<Waveform>('sine');
  const [isPlaying, setIsPlaying] = useState(false);

  const { width: screenWidth } = useWindowDimensions();
  const isTablet = screenWidth >= 768;

  // Card internal width accounting for Card padding (16 each side) and Screen padding (16 each side)
  const cardContentWidth = screenWidth - spacing.md * 4;
  const vizHeight = isTablet ? 200 : 140;

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    Alert.alert('Play', `${waveform} @ ${Math.round(frequency)} Hz`);
  }, [waveform, frequency]);

  const handleStop = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleReset = useCallback(() => {
    setFrequency(440);
    setAmplitude(0.5);
    setWaveform('sine');
    setIsPlaying(false);
  }, []);

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <SectionHeader title="Explore" subtitle="Tone generator & visualizations" />

        {/* Waveform Visualization */}
        <Card style={styles.vizCard} glowing={isPlaying}>
          <View style={styles.vizHeader}>
            <Text style={styles.vizTitle}>Waveform</Text>
            <Text style={styles.vizBadge}>
              {WAVEFORM_LABELS[waveform]} · {Math.round(frequency)} Hz
            </Text>
          </View>
          <View style={styles.vizContainer}>
            <WaveformView
              waveform={waveform}
              frequency={frequency}
              amplitude={amplitude}
              width={cardContentWidth}
              height={vizHeight}
            />
          </View>
        </Card>

        {/* Spectrum Visualization */}
        <Card style={styles.vizCard}>
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
            />
          </View>
        </Card>

        {/* Tone Controls */}
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

          {/* Quick note presets */}
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

        {/* Playback Controls */}
        <View style={styles.buttonRow}>
          <PrimaryButton
            title={isPlaying ? 'Playing...' : 'Play Tone'}
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
          <IconButton variant="ghost" onPress={() => Alert.alert('Info', 'Explore sound with different waveform shapes, frequencies, and amplitudes.')}>
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
