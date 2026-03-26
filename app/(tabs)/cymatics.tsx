import { useState, useCallback, useEffect } from 'react';
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
  SandPlateView,
  SavePresetModal,
} from '@/src/components';
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

const FREQ_PRESETS = [
  { label: '174', freq: 174 },
  { label: '285', freq: 285 },
  { label: '396', freq: 396 },
  { label: '528', freq: 528 },
  { label: '639', freq: 639 },
] as const;

export default function CymaticsScreen() {
  // Cymatics-specific visual state (not shared)
  const [plateShape, setPlateShape] = useState<PlateShape>('circle');
  const [particleStyle, setParticleStyle] = useState<ParticleStyle>('sand');
  const [isFrozen, setIsFrozen] = useState(false);

  // Shared audio state
  const {
    frequency, amplitude, isPlaying,
    setFrequency, setAmplitude, setWaveform, setSourceMode,
    play, stop,
  } = useAudioStore();

  const { plateSize, isTablet } = useResponsive();

  // Preset save
  const savePreset = usePresetStore((s) => s.savePreset);
  const [showSaveModal, setShowSaveModal] = useState(false);

  const handleSavePreset = useCallback(async (name: string) => {
    const settings: ExploreSettings = {
      sourceMode: 'tone',
      frequency,
      amplitude,
      waveform: 'sine',
      noiseType: 'white',
    };
    await savePreset(name, 'explore', settings);
    setShowSaveModal(false);
    Alert.alert('Saved', `Preset "${name || 'Cymatics Preset'}" saved to Library.`);
  }, [frequency, amplitude, savePreset]);

  // Ensure presets are loaded
  const presetLoaded = usePresetStore((s) => s.loaded);
  const loadPresets = usePresetStore((s) => s.loadPresets);
  useEffect(() => {
    if (!presetLoaded) loadPresets();
  }, [presetLoaded, loadPresets]);

  const handlePlay = useCallback(async () => {
    try {
      // Cymatics always uses sine tone mode
      setSourceMode('tone');
      setWaveform('sine');
      await play();
      setIsFrozen(false);
    } catch {
      Alert.alert('Audio Error', 'Could not start playback.');
    }
  }, [play, setSourceMode, setWaveform]);

  const handleStop = useCallback(async () => {
    await stop();
  }, [stop]);

  const handleFreeze = useCallback(() => {
    setIsFrozen((prev) => !prev);
  }, []);

  const handleReset = useCallback(async () => {
    await stop();
    setIsFrozen(false);
    setFrequency(440);
    setAmplitude(0.6);
    setPlateShape('circle');
    setParticleStyle('sand');
  }, [stop, setFrequency, setAmplitude]);

  const freqBadge = `${Math.round(frequency)} Hz · ${PLATE_SHAPE_LABELS[plateShape]}`;

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <SectionHeader title="Cymatics" subtitle="Digital sand plate simulation" />

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
            </Card>
          </View>

          {/* Plate & Material */}
          <View style={isTablet ? styles.tabletHalf : undefined}>
            <SectionHeader title="PLATE & MATERIAL" label />
            <Card style={styles.card}>
              <Text style={styles.controlLabel}>Plate Shape</Text>
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
  bottomSpacer: {
    height: spacing.xxl,
  },
});
