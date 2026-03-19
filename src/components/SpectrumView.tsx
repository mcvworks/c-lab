import React, { useMemo } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors } from '@/src/theme';

interface SpectrumViewProps {
  frequency: number;
  amplitude: number;
  width: number;
  height: number;
  style?: ViewStyle;
}

const BAR_COUNT = 32;
const BAR_GAP = 3;

function generateSpectrumData(frequency: number, amplitude: number): number[] {
  const bars: number[] = [];
  // Create a realistic-looking spectrum with a peak around the fundamental frequency
  const peakBin = Math.round((frequency / 2000) * BAR_COUNT * 0.8);

  for (let i = 0; i < BAR_COUNT; i++) {
    // Distance from peak
    const dist = Math.abs(i - peakBin);
    // Main peak (gaussian-like)
    const peak = Math.exp(-(dist * dist) / 8) * amplitude;
    // Harmonics — smaller peaks at 2x, 3x
    const harm2Bin = Math.min(BAR_COUNT - 1, peakBin * 2);
    const harm3Bin = Math.min(BAR_COUNT - 1, peakBin * 3);
    const h2 = Math.exp(-Math.pow(i - harm2Bin, 2) / 6) * amplitude * 0.4;
    const h3 = Math.exp(-Math.pow(i - harm3Bin, 2) / 5) * amplitude * 0.2;
    // Noise floor
    const noise = 0.03 + Math.random() * 0.04 * amplitude;
    bars.push(Math.min(1, peak + h2 + h3 + noise));
  }
  return bars;
}

export default function SpectrumView({
  frequency,
  amplitude,
  width,
  height,
  style,
}: SpectrumViewProps) {
  const bars = useMemo(
    () => generateSpectrumData(frequency, amplitude),
    [frequency, amplitude],
  );

  if (width <= 0 || height <= 0) return null;

  const barWidth = Math.max(1, (width - BAR_GAP * (BAR_COUNT - 1)) / BAR_COUNT);
  const maxBarHeight = height - 4;

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
        {bars.map((value, i) => {
          const barHeight = Math.max(2, value * maxBarHeight);
          const x = i * (barWidth + BAR_GAP);
          const y = height - barHeight;
          return (
            <Rect
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
