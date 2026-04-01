import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors } from '@/src/theme';

type NoiseType = 'white' | 'pink' | 'brown';

interface SpectrumViewProps {
  frequency: number;
  amplitude: number;
  width: number;
  height: number;
  isPlaying?: boolean;
  noiseType?: NoiseType | null;
  analyserNode?: AnalyserNode | null;
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

/** Generate spectrum for noise sources — characteristic shapes per noise type */
function generateNoiseSpectrum(
  noiseType: NoiseType,
  amplitude: number,
  jitterSeed: number,
): number[] {
  const bars: number[] = [];
  for (let i = 0; i < BAR_COUNT; i++) {
    const frac = i / BAR_COUNT; // 0→1 across frequency range
    let base: number;

    switch (noiseType) {
      case 'white':
        // Flat spectrum
        base = 0.5;
        break;
      case 'pink':
        // 1/f — more energy at low frequencies, rolls off
        base = 0.7 * Math.pow(1 - frac * 0.8, 0.6);
        break;
      case 'brown':
        // 1/f² — steep low-frequency emphasis
        base = 0.8 * Math.pow(1 - frac * 0.9, 1.5);
        break;
    }

    // Animated jitter
    const noise =
      0.08 *
      (0.5 + 0.5 * Math.sin(jitterSeed * 4.1 + i * 2.3)) *
      (0.6 + 0.4 * Math.sin(jitterSeed * 6.7 + i * 1.7));

    bars.push(Math.min(1, (base + noise) * amplitude));
  }
  return bars;
}

/** Generate spectrum bars from real analyser frequency data */
function generateAnalyserSpectrum(analyser: AnalyserNode): number[] {
  const freqData = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(freqData);
  const bars: number[] = [];
  const binCount = freqData.length;
  const binsPerBar = Math.floor(binCount / BAR_COUNT);
  for (let i = 0; i < BAR_COUNT; i++) {
    let sum = 0;
    const start = i * binsPerBar;
    for (let j = start; j < start + binsPerBar && j < binCount; j++) {
      sum += freqData[j];
    }
    bars.push((sum / binsPerBar) / 255);
  }
  return bars;
}

export default function SpectrumView({
  frequency,
  amplitude,
  width,
  height,
  isPlaying = false,
  noiseType = null,
  analyserNode = null,
  style,
}: SpectrumViewProps) {
  const barRefs = useRef<(Rect | null)[]>([]);
  const rafRef = useRef<number | null>(null);
  const seedRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);

  const propsRef = useRef({ frequency, amplitude, width, height, noiseType, analyserNode });
  propsRef.current = { frequency, amplitude, width, height, noiseType, analyserNode };

  const updateBars = useCallback((seed: number) => {
    const { frequency: f, amplitude: a, width: w, height: h, noiseType: nt, analyserNode: an } = propsRef.current;
    if (w <= 0 || h <= 0) return;

    const barWidth = Math.max(1, (w - BAR_GAP * (BAR_COUNT - 1)) / BAR_COUNT);
    const maxBarHeight = h - 4;
    let bars: number[];
    if (an) {
      bars = generateAnalyserSpectrum(an);
    } else if (nt) {
      bars = generateNoiseSpectrum(nt, a, seed);
    } else {
      bars = generateSpectrumData(f, a, seed);
    }

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
  const initialBars = noiseType
    ? generateNoiseSpectrum(noiseType, amplitude, seedRef.current)
    : generateSpectrumData(frequency, amplitude, seedRef.current);

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
