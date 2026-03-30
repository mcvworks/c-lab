import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, GestureResponderEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen, SectionHeader, PrimarySlider } from '@/src/components';
import { DroneGardenEngine } from '@/src/audio/DroneGardenEngine';
import { useResponsive } from '@/src/hooks/useResponsive';
import { colors, spacing, typography, radius } from '@/src/theme';

// ── Frequency mapping: bottom = 60 Hz, top = 800 Hz (log scale) ──
const FREQ_LO = 60;
const FREQ_HI = 800;
const LOG_LO = Math.log(FREQ_LO);
const LOG_HI = Math.log(FREQ_HI);

function yToFreq(yFrac: number): number {
  // yFrac 0 = top = high, 1 = bottom = low
  const t = 1 - yFrac;
  return Math.round(Math.exp(LOG_LO + t * (LOG_HI - LOG_LO)));
}

function xToPan(xFrac: number): number {
  return Math.max(-1, Math.min(1, (xFrac - 0.5) * 2));
}

// ── Visual seed colors based on frequency ──
function seedColor(freq: number): string {
  const t = (Math.log(freq) - LOG_LO) / (LOG_HI - LOG_LO);
  // Low = warm amber, mid = cyan, high = violet
  if (t < 0.33) return colors.warning;
  if (t < 0.66) return colors.accent;
  return colors.highlight;
}

function seedGlow(freq: number): string {
  const t = (Math.log(freq) - LOG_LO) / (LOG_HI - LOG_LO);
  if (t < 0.33) return 'rgba(245, 158, 11, 0.3)';
  if (t < 0.66) return 'rgba(78, 205, 196, 0.3)';
  return 'rgba(167, 139, 250, 0.3)';
}

interface SeedState {
  id: string;
  x: number; // 0–1 fraction
  y: number; // 0–1 fraction
  frequency: number;
  pan: number;
}

let nextId = 1;

export default function DroneGardenScreen() {
  const engineRef = useRef<DroneGardenEngine | null>(null);
  const [seeds, setSeeds] = useState<SeedState[]>([]);
  const [masterVol, setMasterVol] = useState(0.6);
  const [canvasLayout, setCanvasLayout] = useState({ width: 0, height: 0 });
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { contentWidth } = useResponsive();

  const getEngine = useCallback(() => {
    if (!engineRef.current) {
      engineRef.current = new DroneGardenEngine();
    }
    return engineRef.current;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
    };
  }, []);

  // Update master volume
  useEffect(() => {
    getEngine().setMasterVolume(masterVol);
  }, [masterVol, getEngine]);

  const handleCanvasTap = useCallback(async (e: GestureResponderEvent) => {
    const { locationX, locationY } = e.nativeEvent;
    const { width, height } = canvasLayout;
    if (width <= 0 || height <= 0) return;

    const xFrac = locationX / width;
    const yFrac = locationY / height;
    const freq = yToFreq(yFrac);
    const pan = xToPan(xFrac);
    const engine = getEngine();

    if (engine.seedCount >= engine.maxSeeds) {
      Alert.alert('Garden Full', `Maximum ${engine.maxSeeds} seeds. Long-press a seed to remove it.`);
      return;
    }

    const id = `seed-${nextId++}`;
    const ok = await engine.addSeed({
      id,
      frequency: freq,
      pan,
      amplitude: 0.25,
      waveform: DroneGardenEngine.randomWaveform(),
    });

    if (ok) {
      setSeeds((prev) => [...prev, { id, x: xFrac, y: yFrac, frequency: freq, pan }]);
    }
  }, [canvasLayout, getEngine]);

  const handleSeedLongPress = useCallback((id: string) => {
    const engine = getEngine();
    engine.removeSeed(id);
    setSeeds((prev) => prev.filter((s) => s.id !== id));
  }, [getEngine]);

  const handleClearAll = useCallback(() => {
    const engine = getEngine();
    seeds.forEach((s) => engine.removeSeed(s.id));
    setSeeds([]);
  }, [seeds, getEngine]);

  const canvasHeight = Math.max(300, canvasLayout.width * 0.75);

  return (
    <Screen>
      <SectionHeader title="Drone Garden" subtitle="Tap to plant tone seeds" />

      {/* Canvas */}
      <View
        style={[styles.canvas, { height: canvasHeight }]}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setCanvasLayout({ width, height });
        }}
      >
        {/* Tap area */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleCanvasTap}
        />

        {/* Frequency guide lines */}
        {canvasLayout.height > 0 && (
          <>
            <View style={[styles.guideLine, { top: '25%' }]} pointerEvents="none">
              <Text style={styles.guideLabel}>~{yToFreq(0.25)} Hz</Text>
            </View>
            <View style={[styles.guideLine, { top: '50%' }]} pointerEvents="none">
              <Text style={styles.guideLabel}>~{yToFreq(0.5)} Hz</Text>
            </View>
            <View style={[styles.guideLine, { top: '75%' }]} pointerEvents="none">
              <Text style={styles.guideLabel}>~{yToFreq(0.75)} Hz</Text>
            </View>
          </>
        )}

        {/* Pan labels */}
        <View style={styles.panLabels} pointerEvents="none">
          <Text style={styles.panLabel}>L</Text>
          <Text style={styles.panLabel}>R</Text>
        </View>

        {/* Seeds */}
        {seeds.map((seed) => {
          const left = seed.x * canvasLayout.width - 20;
          const top = seed.y * canvasLayout.height - 20;
          const col = seedColor(seed.frequency);
          const glow = seedGlow(seed.frequency);
          return (
            <Pressable
              key={seed.id}
              onLongPress={() => handleSeedLongPress(seed.id)}
              delayLongPress={500}
              style={[
                styles.seed,
                {
                  left,
                  top,
                  backgroundColor: glow,
                  borderColor: col,
                  shadowColor: col,
                },
              ]}
            >
              <View style={[styles.seedCore, { backgroundColor: col }]} />
              <Text style={styles.seedFreq}>{seed.frequency}</Text>
            </Pressable>
          );
        })}

        {/* Empty state hint */}
        {seeds.length === 0 && (
          <View style={styles.emptyHint} pointerEvents="none">
            <Text style={styles.emptyText}>Tap anywhere to plant a tone</Text>
            <Text style={styles.emptySubtext}>
              Y = pitch · X = stereo pan
            </Text>
          </View>
        )}
      </View>

      {/* Info bar */}
      <View style={styles.infoRow}>
        <Text style={styles.infoText}>
          {seeds.length} / {getEngine().maxSeeds} seeds
        </Text>
        {seeds.length > 0 && (
          <Pressable onPress={handleClearAll}>
            <Text style={styles.clearText}>Clear All</Text>
          </Pressable>
        )}
      </View>

      {/* Master volume */}
      <View style={styles.controls}>
        <PrimarySlider
          label="Master Volume"
          value={masterVol}
          onValueChange={setMasterVol}
          min={0}
          max={1}
          step={0.01}
          formatValue={(v) => `${Math.round(v * 100)}%`}
        />
      </View>

      <Text style={styles.hint}>
        Long-press a seed to remove it. Each seed plays a continuous tone — higher on the canvas means higher pitch, left/right controls stereo panning.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  canvas: {
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
    position: 'relative',
  },
  guideLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  guideLabel: {
    fontSize: typography.xs,
    color: colors.textMuted,
    position: 'absolute',
    right: spacing.sm,
    top: 2,
  },
  panLabels: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  panLabel: {
    fontSize: typography.xs,
    fontWeight: typography.semibold,
    color: colors.textMuted,
  },
  seed: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 6,
  },
  seedCore: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  seedFreq: {
    fontSize: 8,
    color: colors.textSecondary,
    marginTop: 1,
  },
  emptyHint: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: typography.md,
    color: colors.textMuted,
    fontWeight: typography.medium,
  },
  emptySubtext: {
    fontSize: typography.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  infoText: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  clearText: {
    fontSize: typography.sm,
    color: colors.danger,
    fontWeight: typography.semibold,
  },
  controls: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  hint: {
    fontSize: typography.xs,
    color: colors.textMuted,
    marginHorizontal: spacing.md,
    lineHeight: 18,
    marginBottom: spacing.xxl,
  },
});
