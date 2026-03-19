import React, { useMemo } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors } from '@/src/theme';

interface WaveformViewProps {
  waveform: 'sine' | 'square' | 'saw' | 'triangle';
  frequency: number;
  amplitude: number;
  width: number;
  height: number;
  style?: ViewStyle;
}

function generateWaveformPath(
  waveform: string,
  frequency: number,
  amplitude: number,
  width: number,
  height: number,
): string {
  const mid = height / 2;
  const amp = (height / 2 - 4) * amplitude;
  // Show 2-4 cycles depending on frequency
  const cycles = Math.max(2, Math.min(6, frequency / 150));
  const points = Math.max(200, Math.round(width));

  const parts: string[] = [];

  for (let i = 0; i <= points; i++) {
    const x = (i / points) * width;
    const t = (i / points) * cycles * Math.PI * 2;
    let y = 0;

    switch (waveform) {
      case 'sine':
        y = Math.sin(t);
        break;
      case 'square':
        y = Math.sin(t) >= 0 ? 1 : -1;
        break;
      case 'saw': {
        const phase = ((t / (Math.PI * 2)) % 1);
        y = 2 * phase - 1;
        break;
      }
      case 'triangle': {
        const phase = ((t / (Math.PI * 2)) % 1);
        y = 4 * Math.abs(phase - 0.5) - 1;
        break;
      }
    }

    const py = mid - y * amp;
    parts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${py.toFixed(1)}`);
  }

  return parts.join(' ');
}

function generateFillPath(
  waveform: string,
  frequency: number,
  amplitude: number,
  width: number,
  height: number,
): string {
  const linePath = generateWaveformPath(waveform, frequency, amplitude, width, height);
  return `${linePath} L${width},${height} L0,${height} Z`;
}

export default function WaveformView({
  waveform,
  frequency,
  amplitude,
  width,
  height,
  style,
}: WaveformViewProps) {
  const linePath = useMemo(
    () => generateWaveformPath(waveform, frequency, amplitude, width, height),
    [waveform, frequency, amplitude, width, height],
  );

  const fillPath = useMemo(
    () => generateFillPath(waveform, frequency, amplitude, width, height),
    [waveform, frequency, amplitude, width, height],
  );

  if (width <= 0 || height <= 0) return null;

  return (
    <View style={[styles.container, style]}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="waveGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.accent} stopOpacity={0.25} />
            <Stop offset="1" stopColor={colors.accent} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path d={fillPath} fill="url(#waveGradient)" />
        <Path
          d={linePath}
          fill="none"
          stroke={colors.accent}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});
