import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, GestureResponderEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen, SectionHeader } from '@/src/components';
import RotaryDial from '@/src/components/RotaryDial';
import { DroneGardenEngine } from '@/src/audio/DroneGardenEngine';
import { useAudioStore } from '@/src/state/useAudioStore';
import { colors, useColors, spacing, typography, radius } from '@/src/theme';

// ── Frequency mapping: bottom = 60 Hz, top = 800 Hz (log scale) ──
const FREQ_LO = 60;
const FREQ_HI = 800;
const LOG_LO = Math.log(FREQ_LO);
const LOG_HI = Math.log(FREQ_HI);

function yToFreq(yFrac: number): number {
  const t = 1 - yFrac;
  return Math.round(Math.exp(LOG_LO + t * (LOG_HI - LOG_LO)));
}

function xToPan(xFrac: number): number {
  return Math.max(-1, Math.min(1, (xFrac - 0.5) * 2));
}

// ── Visual seed colors based on frequency (warm skeumorphic palette) ──
function seedColor(freq: number): string {
  const t = (Math.log(freq) - LOG_LO) / (LOG_HI - LOG_LO);
  if (t < 0.33) return colors.warning;
  if (t < 0.66) return colors.accent;
  return colors.highlight;
}

function seedGlow(freq: number): string {
  const t = (Math.log(freq) - LOG_LO) / (LOG_HI - LOG_LO);
  if (t < 0.33) return 'rgba(217, 119, 6, 0.3)';
  if (t < 0.66) return 'rgba(250, 60, 0, 0.3)';
  return 'rgba(240, 131, 33, 0.3)';
}

interface SeedState {
  id: string;
  x: number;
  y: number;
  frequency: number;
  pan: number;
}

let nextId = 1;

export default function DroneGardenScreen() {
  const c = useColors();
  const engineRef = useRef<DroneGardenEngine | null>(null);
  const [seeds, setSeeds] = useState<SeedState[]>([]);
  const [masterVol, setMasterVol] = useState(0.6);
  const [canvasLayout, setCanvasLayout] = useState({ width: 0, height: 0 });
  const canvasRef = useRef<View>(null);
  const setGardenPlaying = useAudioStore((s) => s.setGardenPlaying);

  const getEngine = useCallback(() => {
    if (!engineRef.current) {
      engineRef.current = new DroneGardenEngine();
    }
    return engineRef.current;
  }, []);

  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    getEngine().setMasterVolume(masterVol);
  }, [masterVol, getEngine]);

  // Update garden playing state for tab bar indicator
  useEffect(() => {
    setGardenPlaying(seeds.length > 0);
  }, [seeds.length, setGardenPlaying]);

  const handleCanvasTap = useCallback(async (e: GestureResponderEvent) => {
    const { width, height } = canvasLayout;
    if (width <= 0 || height <= 0) return;

    let lx: number | undefined;
    let ly: number | undefined;
    const rawEvt = (e as any)._dispatchInstances ? undefined : (e.nativeEvent as any);

    if (canvasRef.current) {
      try {
        const domNode = (canvasRef.current as any) as HTMLElement;
        if (domNode && typeof domNode.getBoundingClientRect === 'function') {
          const rect = domNode.getBoundingClientRect();
          const cx = rawEvt?.clientX ?? rawEvt?.pageX;
          const cy = rawEvt?.clientY ?? rawEvt?.pageY;
          if (cx != null && cy != null && isFinite(cx) && isFinite(cy)) {
            lx = cx - rect.left;
            ly = cy - rect.top;
          }
        }
      } catch { /* not on web */ }
    }

    if (lx == null || ly == null || !isFinite(lx) || !isFinite(ly)) {
      lx = e.nativeEvent.locationX ?? 0;
      ly = e.nativeEvent.locationY ?? 0;
    }

    const xFrac = Math.max(0, Math.min(1, lx / width));
    const yFrac = Math.max(0, Math.min(1, ly / height));
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
    getEngine().removeSeed(id);
    setSeeds((prev) => prev.filter((s) => s.id !== id));
  }, [getEngine]);

  const handleClearAll = useCallback(() => {
    seeds.forEach((s) => getEngine().removeSeed(s.id));
    setSeeds([]);
  }, [seeds, getEngine]);

  return (
    <Screen>
      <View style={styles.root}>
        {/* Header row */}
        <View style={styles.headerRow}>
          <SectionHeader title="Drone Garden" subtitle="Tap to plant tone seeds" />
        </View>

        {/* Canvas — fills available space */}
        <View
          ref={canvasRef}
          style={[styles.canvas, { backgroundColor: c.background, borderColor: c.border }]}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            setCanvasLayout({ width, height });
          }}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={handleCanvasTap} />

          {/* Frequency guide lines */}
          {canvasLayout.height > 0 && (
            <>
              <View style={[styles.guideLine, { top: '25%', backgroundColor: c.border }]} pointerEvents="none">
                <Text style={styles.guideLabel}>~{yToFreq(0.25)} Hz</Text>
              </View>
              <View style={[styles.guideLine, { top: '50%', backgroundColor: c.border }]} pointerEvents="none">
                <Text style={styles.guideLabel}>~{yToFreq(0.5)} Hz</Text>
              </View>
              <View style={[styles.guideLine, { top: '75%', backgroundColor: c.border }]} pointerEvents="none">
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
                  { left, top, backgroundColor: glow, borderColor: col, shadowColor: col },
                ]}
              >
                <View style={[styles.seedCore, { backgroundColor: col }]} />
                <Text style={styles.seedFreq}>{seed.frequency}</Text>
              </Pressable>
            );
          })}

          {/* Empty state */}
          {seeds.length === 0 && (
            <View style={styles.emptyHint} pointerEvents="none">
              <Text style={styles.emptyText}>Tap anywhere to plant a tone</Text>
              <Text style={styles.emptySubtext}>Y = pitch · X = stereo pan</Text>
            </View>
          )}

          {/* Overlay: info bar top-right */}
          <View style={styles.overlayInfo} pointerEvents="box-none">
            <View style={styles.infoPill}>
              <Text style={styles.infoText}>
                {seeds.length} / {getEngine().maxSeeds}
              </Text>
            </View>
            {seeds.length > 0 && (
              <Pressable onPress={handleClearAll} style={styles.clearPill}>
                <Text style={styles.clearText}>Clear</Text>
              </Pressable>
            )}
          </View>

          {/* Overlay: volume dial bottom-right */}
          <View style={styles.overlayDial} pointerEvents="box-none">
            <RotaryDial
              label="Vol"
              value={masterVol}
              onValueChange={setMasterVol}
              min={0}
              max={1}
              step={0.01}
              size={48}
              formatValue={(v) => `${Math.round(v * 100)}%`}
            />
          </View>
        </View>

        {/* Hint */}
        <Text style={styles.hint}>Long-press a seed to remove it</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerRow: {
    paddingHorizontal: spacing.xs,
  },
  canvas: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: spacing.sm,
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
  overlayInfo: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  infoPill: {
    backgroundColor: 'rgba(26, 22, 18, 0.8)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  infoText: {
    fontSize: typography.xs,
    color: colors.textSecondary,
  },
  clearPill: {
    backgroundColor: 'rgba(26, 22, 18, 0.8)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  clearText: {
    fontSize: typography.xs,
    color: colors.danger,
    fontWeight: typography.semibold,
  },
  overlayDial: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(26, 22, 18, 0.85)',
    borderRadius: radius.lg,
    padding: spacing.xs,
  },
  hint: {
    fontSize: typography.xs,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.xs,
  },
});
