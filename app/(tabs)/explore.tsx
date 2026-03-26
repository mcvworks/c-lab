import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
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
} from '@/src/components';
import { colors, spacing, typography, radius } from '@/src/theme';
import type { NoiseType, SourceMode, WaveformType } from '@/src/audio';

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

const NOTE_PRESETS = [
  { label: 'A4', freq: 440 },
  { label: 'C4', freq: 261.63 },
  { label: 'E4', freq: 329.63 },
  { label: 'G4', freq: 392 },
] as const;

export default function ExploreScreen() {
  const {
    sourceMode, frequency, amplitude, waveform, noiseType, isPlaying,
    setSourceMode, setFrequency, setAmplitude, setWaveform, setNoiseType,
    play, stop, reset,
  } = useAudioStore();

  const savePreset = usePresetStore((s) => s.savePreset);
  const [showSaveModal, setShowSaveModal] = useState(false);

  const handleSavePreset = useCallback(async (name: string) => {
    const settings: ExploreSettings = {
      sourceMode, frequency, amplitude, waveform, noiseType,
    };
    await savePreset(name, 'explore', settings);
    setShowSaveModal(false);
    Alert.alert('Saved', `Preset "${name || 'Explore Preset'}" saved to Library.`);
  }, [sourceMode, frequency, amplitude, waveform, noiseType, savePreset]);

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
      setPendingLoad(null);
    }
  }, [pendingLoad, setPendingLoad, setSourceMode, setFrequency, setAmplitude, setWaveform, setNoiseType]);

  const { contentWidth, vizHeight, isTablet } = useResponsive();
  const cardContentWidth = contentWidth - spacing.md * 2;

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

  const vizBadge = sourceMode === 'noise'
    ? `${NOISE_LABELS[noiseType]} noise`
    : `${WAVEFORM_LABELS[waveform]} · ${Math.round(frequency)} Hz`;

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <SectionHeader title="Explore" subtitle="Tone generator & visualizations" />

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
          <IconButton variant="filled" onPress={() => setShowSaveModal(true)}>
            <Text style={styles.iconFilledText}>♡</Text>
          </IconButton>
          <IconButton variant="ghost" onPress={() => Alert.alert('Info', 'Explore sound with different waveform shapes, frequencies, noise types, and amplitudes.')}>
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
  tabletRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  tabletHalf: {
    flex: 1,
  },
  bottomSpacer: {
    height: spacing.xxl,
  },
});
