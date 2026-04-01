import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors } from '@/src/theme';

type NoiseType = 'white' | 'pink' | 'brown';

interface WaveformViewProps {
  waveform: 'sine' | 'square' | 'saw' | 'triangle';
  frequency: number;
  amplitude: number;
  width: number;
  height: number;
  isPlaying?: boolean;
  noiseType?: NoiseType | null;
  analyserNode?: AnalyserNode | null;
  style?: ViewStyle;
}

/** Number of waveform cycles visible in the view */
function getCycleCount(frequency: number): number {
  return Math.max(2, Math.min(6, frequency / 150));
}

/** Generate the SVG stroke path for a waveform at a given phase offset */
function generateWaveformPath(
  waveform: string,
  frequency: number,
  amplitude: number,
  width: number,
  height: number,
  phaseOffset: number,
): string {
  const mid = height / 2;
  const amp = (height / 2 - 4) * amplitude;
  const cycles = getCycleCount(frequency);
  const points = Math.max(200, Math.round(width));

  const parts: string[] = [];

  for (let i = 0; i <= points; i++) {
    const x = (i / points) * width;
    const t = (i / points) * cycles * Math.PI * 2 + phaseOffset;
    let y = 0;

    switch (waveform) {
      case 'sine':
        y = Math.sin(t);
        break;
      case 'square':
        y = Math.sin(t) >= 0 ? 1 : -1;
        break;
      case 'saw': {
        const phase = (((t / (Math.PI * 2)) % 1) + 1) % 1;
        y = 2 * phase - 1;
        break;
      }
      case 'triangle': {
        const phase = (((t / (Math.PI * 2)) % 1) + 1) % 1;
        y = 4 * Math.abs(phase - 0.5) - 1;
        break;
      }
    }

    const py = mid - y * amp;
    parts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${py.toFixed(1)}`);
  }

  return parts.join(' ');
}

/** Generate a noise-like waveform path using sin-based pseudo-random */
function generateNoisePath(
  noiseType: NoiseType,
  amplitude: number,
  width: number,
  height: number,
  seed: number,
): string {
  const mid = height / 2;
  const amp = (height / 2 - 4) * amplitude;
  const points = Math.max(200, Math.round(width));
  const parts: string[] = [];

  // Smoothing factor: white = jagged, pink = medium, brown = smooth
  const smooth = noiseType === 'brown' ? 0.92 : noiseType === 'pink' ? 0.75 : 0.3;
  let value = 0;

  for (let i = 0; i <= points; i++) {
    const x = (i / points) * width;
    // Use multiple sin waves at different frequencies as pseudo-random source
    const raw =
      Math.sin(seed * 3.1 + i * 0.47) * 0.4 +
      Math.sin(seed * 7.3 + i * 1.13) * 0.3 +
      Math.sin(seed * 13.7 + i * 2.71) * 0.2 +
      Math.sin(seed * 23.1 + i * 5.03) * 0.1;

    value = value * smooth + raw * (1 - smooth);
    const py = mid - value * amp;
    parts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${py.toFixed(1)}`);
  }

  return parts.join(' ');
}

/** Generate SVG path from real analyser time-domain data */
function generateAnalyserPath(
  analyser: AnalyserNode,
  width: number,
  height: number,
): string {
  const bufLen = analyser.fftSize;
  const data = new Uint8Array(bufLen);
  analyser.getByteTimeDomainData(data);

  const mid = height / 2;
  const points = Math.min(bufLen, Math.max(200, Math.round(width)));
  const parts: string[] = [];
  const step = bufLen / points;

  for (let i = 0; i < points; i++) {
    const x = (i / points) * width;
    const idx = Math.floor(i * step);
    // data[idx] is 0–255 with 128 as center
    const y = mid - ((data[idx] - 128) / 128) * (height / 2 - 4);
    parts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return parts.join(' ');
}

function generateFillPath(
  waveform: string,
  frequency: number,
  amplitude: number,
  width: number,
  height: number,
  phaseOffset: number,
): string {
  const linePath = generateWaveformPath(waveform, frequency, amplitude, width, height, phaseOffset);
  return `${linePath} L${width},${height} L0,${height} Z`;
}

export default function WaveformView({
  waveform,
  frequency,
  amplitude,
  width,
  height,
  isPlaying = false,
  noiseType = null,
  analyserNode = null,
  style,
}: WaveformViewProps) {
  const linePathRef = useRef<Path | null>(null);
  const fillPathRef = useRef<Path | null>(null);
  const rafRef = useRef<number | null>(null);
  const phaseRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);

  // Refs for latest props so the animation loop always reads current values
  const propsRef = useRef({ waveform, frequency, amplitude, width, height, noiseType, analyserNode });
  propsRef.current = { waveform, frequency, amplitude, width, height, noiseType, analyserNode };

  const updatePaths = useCallback((phase: number) => {
    const { waveform: w, frequency: f, amplitude: a, width: cw, height: ch, noiseType: nt, analyserNode: an } = propsRef.current;
    if (cw <= 0 || ch <= 0) return;

    let line: string;
    if (an) {
      line = generateAnalyserPath(an, cw, ch);
    } else if (nt) {
      line = generateNoisePath(nt, a, cw, ch, phase);
    } else {
      line = generateWaveformPath(w, f, a, cw, ch, phase);
    }
    const fill = `${line} L${cw},${ch} L0,${ch} Z`;

    linePathRef.current?.setNativeProps({ d: line });
    fillPathRef.current?.setNativeProps({ d: fill });
  }, []);

  useEffect(() => {
    if (!isPlaying) {
      // When stopped, render static waveform at current phase and stop animating
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastTimeRef.current = null;
      updatePaths(phaseRef.current);
      return;
    }

    // Animation loop
    const tick = (time: number) => {
      if (lastTimeRef.current != null) {
        const dt = (time - lastTimeRef.current) / 1000; // seconds
        // Scroll speed: phase advances proportionally to frequency.
        // Scale down so the visual motion feels natural rather than a blur.
        const speed = propsRef.current.noiseType
          ? 6 // Steady animation speed for noise
          : propsRef.current.frequency * 0.3;
        phaseRef.current += speed * dt * Math.PI * 2 / getCycleCount(propsRef.current.frequency);
        // Keep phase bounded to avoid precision loss over long sessions
        if (phaseRef.current > Math.PI * 200) {
          phaseRef.current -= Math.PI * 200;
        }
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
  }, [waveform, frequency, amplitude, width, height, isPlaying, updatePaths]);

  if (width <= 0 || height <= 0) return null;

  // Initial paths for first render
  const initialLine = generateWaveformPath(waveform, frequency, amplitude, width, height, phaseRef.current);
  const initialFill = generateFillPath(waveform, frequency, amplitude, width, height, phaseRef.current);

  return (
    <View style={[styles.container, style]}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="waveGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.accent} stopOpacity={0.25} />
            <Stop offset="1" stopColor={colors.accent} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path ref={fillPathRef} d={initialFill} fill="url(#waveGradient)" />
        <Path
          ref={linePathRef}
          d={initialLine}
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
