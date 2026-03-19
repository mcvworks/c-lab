import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors } from '@/src/theme';

interface SpectrumViewProps {
  frequency: number;
  amplitude: number;
  width: number;
  height: number;
  isPlaying?: boolean;
  style?: ViewStyle;
}

const BAR_COUNT = 32;
const BAR_GAP = 3;

/** Generate spectrum bar heights (0–1) for given frequency/amplitude with optional jitter */
function generateSpectrumData(
  frequency: number,
  amplitude: number,
  jitterSeed: number,
): number[] {
  const bars: number[] = [];
  const peakBin = Math.round((frequency / 2000) * BAR_COUNT * 0.8);

  for (let i = 0; i < BAR_COUNT; i++) {
    // Main peak (gaussian-like)
    const dist = Math.abs(i - peakBin);
    const peak = Math.exp(-(dist * dist) / 8) * amplitude;

    // Harmonics — smaller peaks at 2x, 3x
    const harm2Bin = Math.min(BAR_COUNT - 1, peakBin * 2);
    const harm3Bin = Math.min(BAR_COUNT - 1, peakBin * 3);
    const h2 = Math.exp(-Math.pow(i - harm2Bin, 2) / 6) * amplitude * 0.4;
    const h3 = Math.exp(-Math.pow(i - harm3Bin, 2) / 5) * amplitude * 0.2;

    // Animated noise: use sin-based pseudo-random that varies with time seed
    const noise =
      (0.03 + 0.04 * amplitude) *
      (0.5 + 0.5 * Math.sin(jitterSeed * 3.7 + i * 2.1)) *
      (0.6 + 0.4 * Math.sin(jitterSeed * 5.3 + i * 1.3));

    bars.push(Math.min(1, peak + h2 + h3 + noise));
  }
  return bars;
}

export default function SpectrumView({
  frequency,
  amplitude,
  width,
  height,
  isPlaying = false,
  style,
}: SpectrumViewProps) {
  const barRefs = useRef<(Rect | null)[]>([]);
  const rafRef = useRef<number | null>(null);
  const seedRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);

  const propsRef = useRef({ frequency, amplitude, width, height });
  propsRef.current = { frequency, amplitude, width, height };

  const updateBars = useCallback((seed: number) => {
    const { frequency: f, amplitude: a, width: w, height: h } = propsRef.current;
    if (w <= 0 || h <= 0) return;

    const barWidth = Math.max(1, (w - BAR_GAP * (BAR_COUNT - 1)) / BAR_COUNT);
    const maxBarHeight = h - 4;
    const bars = generateSpectrumData(f, a, seed);

    for (let i = 0; i < BAR_COUNT; i++) {
      const ref = barRefs.current[i];
      if (!ref) continue;
      const barHeight = Math.max(2, bars[i] * maxBarHeight);
      const y = h - barHeight;
      ref.setNativeProps({
        y: String(y),
        height: String(barHeight),
      });
    }
  }, []);

  // Animation loop when playing
  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastTimeRef.current = null;
      updateBars(seedRef.current);
      return;
    }

    const tick = (time: number) => {
      if (lastTimeRef.current != null) {
        const dt = (time - lastTimeRef.current) / 1000;
        seedRef.current += dt * 8; // Controls jitter speed
        if (seedRef.current > 1000) seedRef.current -= 1000;
      }
      lastTimeRef.current = time;
      updateBars(seedRef.current);
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
  }, [isPlaying, updateBars]);

  // Update static display when props change while stopped
  useEffect(() => {
    if (!isPlaying) {
      updateBars(seedRef.current);
    }
  }, [frequency, amplitude, width, height, isPlaying, updateBars]);

  if (width <= 0 || height <= 0) return null;

  const barWidth = Math.max(1, (width - BAR_GAP * (BAR_COUNT - 1)) / BAR_COUNT);
  const maxBarHeight = height - 4;
  const initialBars = generateSpectrumData(frequency, amplitude, seedRef.current);

  return (
    <View style={[styles.container, style]}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.highlight} stopOpacity={1} />
            <Stop offset="0.5" stopColor={colors.accent} stopOpacity={0.9} />
            <Stop offset="1" stopColor={colors.accent} stopOpacity={0.3} />
          </LinearGradient>
        </Defs>
        {initialBars.map((value, i) => {
          const barHeight = Math.max(2, value * maxBarHeight);
          const x = i * (barWidth + BAR_GAP);
          const y = height - barHeight;
          return (
            <Rect
              ref={(el) => {
                barRefs.current[i] = el;
              }}
              key={i}
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={barWidth / 2}
              fill="url(#barGradient)"
            />
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});
