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

const PARTICLE_COLORS: Record<ParticleStyle, string> = {
  sand: '#d4a574',
  salt: '#e8e8f0',
  metal: '#8899aa',
};

const SHAPE_SIDES: Record<PlateShape, number> = {
  circle: 64,
  square: 4,
  hexagon: 6,
};

const FREQ_PRESETS = [
  { label: '174', freq: 174 },
  { label: '285', freq: 285 },
  { label: '396', freq: 396 },
  { label: '528', freq: 528 },
  { label: '639', freq: 639 },
] as const;

export default function CymaticsScreen() {
  const [frequency, setFrequency] = useState(440);
  const [amplitude, setAmplitude] = useState(0.6);
  const [plateShape, setPlateShape] = useState<PlateShape>('circle');
  const [particleStyle, setParticleStyle] = useState<ParticleStyle>('sand');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);

  const tone = useToneGenerator();
  const isPlayingRef = useRef(false);

  const { width: screenWidth } = useWindowDimensions();
  const isTablet = screenWidth >= 768;
  const plateSize = Math.min(screenWidth - spacing.md * 4, isTablet ? 400 : 320);

  const handlePlay = useCallback(async () => {
    try {
      await tone.play(frequency, amplitude, 'sine');
      setIsPlaying(true);
      setIsFrozen(false);
      isPlayingRef.current = true;
    } catch {
      Alert.alert('Audio Error', 'Could not start playback.');
    }
  }, [tone, frequency, amplitude]);

  const handleStop = useCallback(async () => {
    setIsPlaying(false);
    isPlayingRef.current = false;
    await tone.stop();
  }, [tone]);

  const handleFreeze = useCallback(() => {
    setIsFrozen((prev) => !prev);
  }, []);

  const handleReset = useCallback(async () => {
    setIsPlaying(false);
    setIsFrozen(false);
    isPlayingRef.current = false;
    await tone.stop();
    setFrequency(440);
    setAmplitude(0.6);
    setPlateShape('circle');
    setParticleStyle('sand');
  }, [tone]);

  // Update audio params live while playing
  useEffect(() => {
    if (!isPlayingRef.current) return;
    tone.updateParams(frequency, amplitude, 'sine');
  }, [frequency, amplitude, tone]);

  // Generate simple nodal pattern positions for the placeholder visualization
  const renderPlateVisualization = () => {
    const cx = plateSize / 2;
    const cy = plateSize / 2;
    const r = plateSize / 2 - 8;
    const particleColor = PARTICLE_COLORS[particleStyle];
    const sides = SHAPE_SIDES[plateShape];

    // Generate plate outline points
    const outlinePoints: { x: number; y: number }[] = [];
    for (let i = 0; i <= sides; i++) {
      const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
      outlinePoints.push({
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
      });
    }

    // Generate nodal pattern dots based on frequency
    const dots: { x: number; y: number; size: number; opacity: number }[] = [];
    const nodeCount = Math.floor(frequency / 60);
    const rings = Math.max(2, Math.min(8, Math.floor(nodeCount / 3)));
    const dotsPerRing = Math.max(6, Math.min(24, nodeCount));

    for (let ring = 1; ring <= rings; ring++) {
      const ringR = (r * ring) / (rings + 1);
      const ringDots = dotsPerRing + ring * 2;
      for (let d = 0; d < ringDots; d++) {
        const angle = (d / ringDots) * Math.PI * 2 + ring * 0.3;
        const wobble = isPlaying && !isFrozen ? Math.sin(d * 1.5 + ring) * 3 * amplitude : 0;
        const x = cx + (ringR + wobble) * Math.cos(angle);
        const y = cy + (ringR + wobble) * Math.sin(angle);

        // Check if point is inside the plate shape
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > r - 4) continue;

        dots.push({
          x,
          y,
          size: 1.5 + amplitude * 2,
          opacity: 0.3 + amplitude * 0.5 + (isPlaying && !isFrozen ? 0.2 : 0),
        });
      }
    }

    return (
      <View style={[styles.plateContainer, { width: plateSize, height: plateSize }]}>
        {/* Plate outline */}
        <View
          style={[
            styles.plateOutline,
            {
              width: plateSize - 4,
              height: plateSize - 4,
              borderRadius: plateShape === 'circle' ? plateSize / 2 : plateShape === 'hexagon' ? plateSize / 4 : radius.lg,
              borderColor: isPlaying ? colors.accent : colors.border,
            },
          ]}
        />

        {/* Particle dots */}
        {dots.map((dot, i) => (
          <View
            key={i}
            style={[
              styles.particleDot,
              {
                left: dot.x - dot.size / 2,
                top: dot.y - dot.size / 2,
                width: dot.size,
                height: dot.size,
                borderRadius: dot.size / 2,
                backgroundColor: particleColor,
                opacity: dot.opacity,
              },
            ]}
          />
        ))}

        {/* Center glow when playing */}
        {isPlaying && (
          <View style={[styles.centerGlow, { left: cx - 30, top: cy - 30 }]} />
        )}

        {/* Frozen indicator */}
        {isFrozen && (
          <View style={styles.frozenBadge}>
            <Text style={styles.frozenText}>FROZEN</Text>
          </View>
        )}
      </View>
    );
  };

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
            {renderPlateVisualization()}
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

        {/* Frequency Controls */}
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

        {/* Plate & Material */}
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

        {/* Utility Icons */}
        <View style={styles.iconRow}>
          <IconButton variant="outline" onPress={handleReset}>
            <Text style={styles.iconText}>↺</Text>
          </IconButton>
          <IconButton
            variant="filled"
            onPress={() => Alert.alert('Save', 'Preset save coming soon')}
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
  },
  plateContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plateOutline: {
    position: 'absolute',
    borderWidth: 1.5,
    top: 2,
    left: 2,
  },
  particleDot: {
    position: 'absolute',
  },
  centerGlow: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.accentGlow,
  },
  frozenBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
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
  bottomSpacer: {
    height: spacing.xxl,
  },
});
