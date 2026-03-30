import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '@/src/theme';

interface LissajousViewProps {
  /** Frequency for X axis (Hz) */
  freqA: number;
  /** Frequency for Y axis (Hz) */
  freqB: number;
  /** Phase offset in radians (0–2π) */
  phase: number;
  /** Trail length: number of recent samples to display (100–2000) */
  trailLength: number;
  /** Accent color for the curve */
  color?: string;
  width: number;
  height: number;
  isPlaying: boolean;
  style?: ViewStyle;
}

// How many samples we compute per animation frame
const SAMPLES_PER_FRAME = 8;
// Time step per sample (determines how fast the figure draws)
const DT = 0.0005;

export default function LissajousView({
  freqA,
  freqB,
  phase,
  trailLength,
  color = colors.accent,
  width,
  height,
  isPlaying,
  style,
}: LissajousViewProps) {
  const pathRef = useRef<Path | null>(null);
  const dotRef = useRef<Circle | null>(null);
  const rafRef = useRef<number | null>(null);
  const tRef = useRef(0);
  const bufferRef = useRef<{ x: number; y: number }[]>([]);

  // Keep params in refs for animation loop access
  const paramsRef = useRef({ freqA, freqB, phase, trailLength, color });
  paramsRef.current = { freqA, freqB, phase, trailLength, color };

  const padX = 12;
  const padY = 12;
  const drawW = width - padX * 2;
  const drawH = height - padY * 2;
  const cx = width / 2;
  const cy = height / 2;

  const animate = useCallback(() => {
    const { freqA: a, freqB: b, phase: delta, trailLength: trail } = paramsRef.current;
    const buf = bufferRef.current;

    // Compute new samples
    const aRad = a * Math.PI * 2;
    const bRad = b * Math.PI * 2;

    for (let i = 0; i < SAMPLES_PER_FRAME; i++) {
      tRef.current += DT;
      const t = tRef.current;
      const x = Math.sin(aRad * t + delta);
      const y = Math.sin(bRad * t);
      buf.push({ x, y });
    }

    // Trim to trail length
    while (buf.length > trail) {
      buf.shift();
    }

    // Build SVG path
    if (buf.length > 1) {
      const parts: string[] = [];
      const len = buf.length;

      for (let i = 0; i < len; i++) {
        const px = cx + buf[i].x * (drawW / 2);
        const py = cy - buf[i].y * (drawH / 2);
        parts.push(i === 0 ? `M${px.toFixed(1)},${py.toFixed(1)}` : `L${px.toFixed(1)},${py.toFixed(1)}`);
      }

      try {
        pathRef.current?.setNativeProps({ d: parts.join('') });
      } catch { /* web fallback */ }

      // Move the dot to the latest point
      const last = buf[len - 1];
      const dotX = cx + last.x * (drawW / 2);
      const dotY = cy - last.y * (drawH / 2);
      try {
        dotRef.current?.setNativeProps({
          cx: String(dotX.toFixed(1)),
          cy: String(dotY.toFixed(1)),
        });
      } catch { /* web fallback */ }
    }

    rafRef.current = requestAnimationFrame(animate);
  }, [cx, cy, drawW, drawH]);

  useEffect(() => {
    if (isPlaying) {
      rafRef.current = requestAnimationFrame(animate);
    } else {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, animate]);

  // Reset buffer when frequencies change significantly (new figure)
  const prevFreqRef = useRef({ a: freqA, b: freqB });
  useEffect(() => {
    const prev = prevFreqRef.current;
    if (Math.abs(prev.a - freqA) > 5 || Math.abs(prev.b - freqB) > 5) {
      bufferRef.current = [];
      tRef.current = 0;
    }
    prevFreqRef.current = { a: freqA, b: freqB };
  }, [freqA, freqB]);

  return (
    <View style={[styles.container, { width, height }, style]}>
      <Svg width={width} height={height}>
        {/* Crosshair guides */}
        <Path
          d={`M${cx},${padY} L${cx},${height - padY} M${padX},${cy} L${width - padX},${cy}`}
          stroke={colors.border}
          strokeWidth={0.5}
          opacity={0.4}
        />

        {/* Lissajous trail */}
        <Path
          ref={pathRef}
          d=""
          fill="none"
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.85}
        />

        {/* Leading dot */}
        <Circle
          ref={dotRef}
          cx={cx}
          cy={cy}
          r={3.5}
          fill={color}
          opacity={0.95}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderRadius: 12,
    overflow: 'hidden',
  },
});
