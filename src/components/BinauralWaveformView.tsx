import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors, useColors, spacing, typography, radius } from '@/src/theme';

interface BinauralWaveformViewProps {
  leftFreq: number;
  rightFreq: number;
  amplitude: number;
  isPlaying?: boolean;
}

const VIZ_HEIGHT = 120;
const POINTS = 300;

/** Generate a sine wave path for a given frequency over a time window */
function generateSinePath(
  freq: number,
  timeWindow: number,
  amplitude: number,
  width: number,
  height: number,
  phase: number,
): string {
  const mid = height / 2;
  const amp = (height / 2 - 6) * amplitude * 0.7; // leave room for envelope
  const parts: string[] = [];

  for (let i = 0; i <= POINTS; i++) {
    const x = (i / POINTS) * width;
    const t = (i / POINTS) * timeWindow + phase;
    const y = Math.sin(2 * Math.PI * freq * t);
    const py = mid - y * amp;
    parts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${py.toFixed(1)}`);
  }

  return parts.join(' ');
}

/** Generate the beat envelope (amplitude modulation) path */
function generateEnvelopePath(
  leftFreq: number,
  rightFreq: number,
  timeWindow: number,
  amplitude: number,
  width: number,
  height: number,
  phase: number,
): string {
  const mid = height / 2;
  const amp = (height / 2 - 6) * amplitude * 0.7;
  const beatFreq = Math.abs(rightFreq - leftFreq);
  const avgFreq = (leftFreq + rightFreq) / 2;
  const upperParts: string[] = [];
  const lowerParts: string[] = [];

  for (let i = 0; i <= POINTS; i++) {
    const x = (i / POINTS) * width;
    const t = (i / POINTS) * timeWindow + phase;
    // The beat envelope is |cos(pi * beatFreq * t)|
    const envelope = Math.abs(Math.cos(Math.PI * beatFreq * t));
    const upperY = mid - envelope * amp;
    const lowerY = mid + envelope * amp;
    upperParts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${upperY.toFixed(1)}`);
    lowerParts.push(`${x.toFixed(1)},${lowerY.toFixed(1)}`);
  }

  // Close the envelope shape: upper line forward, lower line backward
  const lower = lowerParts.reverse().join(' L');
  return `${upperParts.join(' ')} L${lower} Z`;
}

export default function BinauralWaveformView({
  leftFreq,
  rightFreq,
  amplitude,
  isPlaying = false,
}: BinauralWaveformViewProps) {
  const c = useColors();
  const { width: screenWidth } = useWindowDimensions();
  const vizWidth = screenWidth - spacing.md * 4 - 2; // account for Card + Screen padding + border

  const leftPathRef = useRef<Path | null>(null);
  const rightPathRef = useRef<Path | null>(null);
  const envelopePathRef = useRef<Path | null>(null);
  const rafRef = useRef<number | null>(null);
  const phaseRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);

  const propsRef = useRef({ leftFreq, rightFreq, amplitude, vizWidth });
  propsRef.current = { leftFreq, rightFreq, amplitude, vizWidth };

  // Time window to show ~2.5 beat cycles (makes the beating clearly visible)
  const getTimeWindow = useCallback(() => {
    const beatFreq = Math.abs(propsRef.current.rightFreq - propsRef.current.leftFreq);
    if (beatFreq < 0.5) return 1; // fallback for very small differences
    const desiredBeatCycles = 2.5;
    return desiredBeatCycles / beatFreq;
  }, []);

  const updatePaths = useCallback((phase: number) => {
    const { leftFreq: lf, rightFreq: rf, amplitude: a, vizWidth: w } = propsRef.current;
    if (w <= 0) return;

    const tw = getTimeWindow();
    const leftD = generateSinePath(lf, tw, a, w, VIZ_HEIGHT, phase);
    const rightD = generateSinePath(rf, tw, a, w, VIZ_HEIGHT, phase);
    const envD = generateEnvelopePath(lf, rf, tw, a, w, VIZ_HEIGHT, phase);

    leftPathRef.current?.setNativeProps({ d: leftD });
    rightPathRef.current?.setNativeProps({ d: rightD });
    envelopePathRef.current?.setNativeProps({ d: envD });
  }, [getTimeWindow]);

  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastTimeRef.current = null;
      updatePaths(phaseRef.current);
      return;
    }

    const tick = (time: number) => {
      if (lastTimeRef.current != null) {
        const dt = (time - lastTimeRef.current) / 1000;
        // Advance phase in seconds — the wave functions use real frequency
        phaseRef.current += dt;
        if (phaseRef.current > 100) phaseRef.current -= 100;
      }
      lastTimeRef.current = time;
      updatePaths(phaseRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastTimeRef.current = null;
    };
  }, [isPlaying, updatePaths]);

  // Update static display when props change while not playing
  useEffect(() => {
    if (!isPlaying) {
      updatePaths(phaseRef.current);
    }
  }, [leftFreq, rightFreq, amplitude, vizWidth, isPlaying, updatePaths]);

  if (vizWidth <= 0) return null;

  const tw = getTimeWindow();
  const initialLeft = generateSinePath(leftFreq, tw, amplitude, vizWidth, VIZ_HEIGHT, phaseRef.current);
  const initialRight = generateSinePath(rightFreq, tw, amplitude, vizWidth, VIZ_HEIGHT, phaseRef.current);
  const initialEnvelope = generateEnvelopePath(leftFreq, rightFreq, tw, amplitude, vizWidth, VIZ_HEIGHT, phaseRef.current);

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={styles.svgWrap}>
        <Svg width={vizWidth} height={VIZ_HEIGHT}>
          <Defs>
            <LinearGradient id="envGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.textPrimary} stopOpacity={0.06} />
              <Stop offset="0.5" stopColor={colors.textPrimary} stopOpacity={0.02} />
              <Stop offset="1" stopColor={colors.textPrimary} stopOpacity={0.06} />
            </LinearGradient>
          </Defs>

          {/* Beat envelope fill */}
          <Path
            ref={envelopePathRef}
            d={initialEnvelope}
            fill="url(#envGrad)"
          />

          {/* Left frequency wave */}
          <Path
            ref={leftPathRef}
            d={initialLeft}
            fill="none"
            stroke={colors.accent}
            strokeWidth={1.5}
            strokeOpacity={0.8}
          />

          {/* Right frequency wave */}
          <Path
            ref={rightPathRef}
            d={initialRight}
            fill="none"
            stroke={colors.highlight}
            strokeWidth={1.5}
            strokeOpacity={0.8}
          />
        </Svg>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
          <Text style={styles.legendText}>L {Math.round(leftFreq)} Hz</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.highlight }]} />
          <Text style={styles.legendText}>R {Math.round(rightFreq)} Hz</Text>
        </View>
        <Text style={styles.legendBeat}>
          {Math.abs(rightFreq - leftFreq).toFixed(1)} Hz beat
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  svgWrap: {
    overflow: 'hidden',
    borderRadius: radius.sm,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: typography.xs,
    color: colors.textMuted,
    fontWeight: typography.medium,
  },
  legendBeat: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    fontWeight: typography.medium,
    fontStyle: 'italic',
  },
});
