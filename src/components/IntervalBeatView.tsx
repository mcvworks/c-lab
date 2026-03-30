import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { colors } from '@/src/theme';

interface IntervalBeatViewProps {
  freq1: number;
  freq2: number;
  width: number;
  height: number;
  isPlaying: boolean;
  style?: ViewStyle;
}

/**
 * Visualizes two sine waves and their combined interference pattern.
 * Shows the beat frequency envelope when frequencies are close together.
 *
 * Top third: individual waves (tone 1 cyan, tone 2 violet)
 * Bottom two-thirds: combined waveform with beating envelope
 */
export default function IntervalBeatView({
  freq1,
  freq2,
  width,
  height,
  isPlaying,
  style,
}: IntervalBeatViewProps) {
  const combinedPathRef = useRef<Path | null>(null);
  const envelopePathRef = useRef<Path | null>(null);
  const wave1PathRef = useRef<Path | null>(null);
  const wave2PathRef = useRef<Path | null>(null);
  const rafRef = useRef<number | null>(null);
  const tRef = useRef(0);

  const paramsRef = useRef({ freq1, freq2 });
  paramsRef.current = { freq1, freq2 };

  const pad = 8;
  const drawW = width - pad * 2;
  // Split view: top 30% for individual waves, bottom 70% for combined
  const splitY = height * 0.3;
  const topH = splitY - pad;
  const botH = height - splitY - pad;
  const topMid = pad + topH / 2;
  const botMid = splitY + botH / 2;

  const animate = useCallback(() => {
    const { freq1: f1, freq2: f2 } = paramsRef.current;
    const dt = 1 / 60; // ~60fps
    tRef.current += dt;
    const t = tRef.current;

    const samples = Math.min(drawW, 400);
    const beatFreq = Math.abs(f1 - f2);

    // Choose time window to show 2–4 beat cycles or ~4 tone cycles
    let timeSpan: number;
    if (beatFreq > 0.5 && beatFreq < 40) {
      // Show enough time to see 2–4 beat cycles
      timeSpan = Math.min(4 / beatFreq, 2);
    } else {
      // Show ~4 cycles of the lower frequency
      timeSpan = 4 / Math.min(f1, f2);
    }

    const w1Parts: string[] = [];
    const w2Parts: string[] = [];
    const combinedParts: string[] = [];
    const envTopParts: string[] = [];
    const envBotParts: string[] = [];

    for (let i = 0; i <= samples; i++) {
      const frac = i / samples;
      const x = pad + frac * drawW;
      const sampleT = t + frac * timeSpan;

      const v1 = Math.sin(2 * Math.PI * f1 * sampleT);
      const v2 = Math.sin(2 * Math.PI * f2 * sampleT);
      const combined = (v1 + v2) / 2;

      // Individual waves (small amplitude in top section)
      const topAmp = topH * 0.35;
      const y1 = topMid - v1 * topAmp;
      const y2 = topMid - v2 * topAmp;
      w1Parts.push(i === 0 ? `M${x.toFixed(1)},${y1.toFixed(1)}` : `L${x.toFixed(1)},${y1.toFixed(1)}`);
      w2Parts.push(i === 0 ? `M${x.toFixed(1)},${y2.toFixed(1)}` : `L${x.toFixed(1)},${y2.toFixed(1)}`);

      // Combined wave in bottom section
      const botAmp = botH * 0.4;
      const yc = botMid - combined * botAmp;
      combinedParts.push(i === 0 ? `M${x.toFixed(1)},${yc.toFixed(1)}` : `L${x.toFixed(1)},${yc.toFixed(1)}`);

      // Beat envelope: cos of half the beat frequency
      if (beatFreq > 0.3) {
        const env = Math.abs(Math.cos(Math.PI * beatFreq * sampleT));
        const envTop = botMid - env * botAmp;
        const envBot = botMid + env * botAmp;
        envTopParts.push(i === 0 ? `M${x.toFixed(1)},${envTop.toFixed(1)}` : `L${x.toFixed(1)},${envTop.toFixed(1)}`);
        envBotParts.push(i === 0 ? `M${x.toFixed(1)},${envBot.toFixed(1)}` : `L${x.toFixed(1)},${envBot.toFixed(1)}`);
      }
    }

    try {
      wave1PathRef.current?.setNativeProps({ d: w1Parts.join('') });
      wave2PathRef.current?.setNativeProps({ d: w2Parts.join('') });
      combinedPathRef.current?.setNativeProps({ d: combinedParts.join('') });
      if (beatFreq > 0.3) {
        envelopePathRef.current?.setNativeProps({
          d: envTopParts.join('') + ' ' + envBotParts.join(''),
        });
      } else {
        envelopePathRef.current?.setNativeProps({ d: '' });
      }
    } catch { /* web fallback */ }

    rafRef.current = requestAnimationFrame(animate);
  }, [drawW, topMid, topH, botMid, botH, pad]);

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

  return (
    <View style={[styles.container, { width, height }, style]}>
      <Svg width={width} height={height}>
        {/* Divider line between top/bottom sections */}
        <Path
          d={`M${pad},${splitY} L${width - pad},${splitY}`}
          stroke={colors.border}
          strokeWidth={0.5}
          opacity={0.5}
        />

        {/* Center lines */}
        <Path
          d={`M${pad},${topMid} L${width - pad},${topMid}`}
          stroke={colors.border}
          strokeWidth={0.5}
          opacity={0.3}
        />
        <Path
          d={`M${pad},${botMid} L${width - pad},${botMid}`}
          stroke={colors.border}
          strokeWidth={0.5}
          opacity={0.3}
        />

        {/* Individual wave 1 (cyan) */}
        <Path
          ref={wave1PathRef}
          d=""
          fill="none"
          stroke={colors.accent}
          strokeWidth={1.2}
          opacity={0.7}
        />

        {/* Individual wave 2 (violet) */}
        <Path
          ref={wave2PathRef}
          d=""
          fill="none"
          stroke={colors.highlight}
          strokeWidth={1.2}
          opacity={0.7}
        />

        {/* Beat envelope */}
        <Path
          ref={envelopePathRef}
          d=""
          fill="none"
          stroke={colors.warning}
          strokeWidth={1}
          strokeDasharray="4,3"
          opacity={0.5}
        />

        {/* Combined waveform */}
        <Path
          ref={combinedPathRef}
          d=""
          fill="none"
          stroke={colors.textPrimary}
          strokeWidth={1.8}
          strokeLinecap="round"
          opacity={0.9}
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
