import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  Screen,
  Card,
  SectionHeader,
  PrimaryButton,
  IconButton,
  PrimarySlider,
  SegmentedControl,
} from '@/src/components';
import { colors, spacing, typography } from '@/src/theme';

const WAVEFORMS = ['sine', 'square', 'saw', 'triangle'] as const;
type Waveform = (typeof WAVEFORMS)[number];

export default function ExploreScreen() {
  const [frequency, setFrequency] = useState(440);
  const [amplitude, setAmplitude] = useState(0.5);
  const [waveform, setWaveform] = useState<Waveform>('sine');

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <SectionHeader title="Explore" subtitle="Tone generator & visualizations" />

        <Card style={styles.card}>
          <Text style={styles.placeholder}>Waveform visualization coming soon</Text>
        </Card>

        <SectionHeader title="TONE CONTROLS" label />

        <Card style={styles.card}>
          <SegmentedControl
            options={WAVEFORMS}
            selected={waveform}
            onSelect={setWaveform}
            labels={{ sine: 'Sine', square: 'Square', saw: 'Saw', triangle: 'Tri' }}
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

        <View style={styles.buttonRow}>
          <PrimaryButton
            title="Play Tone"
            onPress={() => Alert.alert('Play', `${waveform} @ ${Math.round(frequency)} Hz`)}
            style={styles.buttonFlex}
          />
          <PrimaryButton
            title="Stop"
            variant="outline"
            onPress={() => Alert.alert('Stop')}
            style={styles.buttonFlex}
          />
        </View>

        <View style={styles.iconRow}>
          <IconButton variant="outline" onPress={() => Alert.alert('Reset')}>
            <Text style={styles.iconText}>↺</Text>
          </IconButton>
          <IconButton variant="filled" onPress={() => Alert.alert('Save')}>
            <Text style={styles.iconFilledText}>♡</Text>
          </IconButton>
          <IconButton variant="ghost" onPress={() => Alert.alert('Info')}>
            <Text style={styles.iconText}>ⓘ</Text>
          </IconButton>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  placeholder: {
    fontSize: typography.sm,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  slider: {
    marginTop: spacing.md,
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
