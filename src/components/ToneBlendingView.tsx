import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Path, Text as SvgText, Line } from 'react-native-svg';
import { colors, spacing, typography } from '@/src/theme';
import type { BlendVoice, BlendWaveform } from '@/src/audio/ToneBlendingEngine';

interface ToneBlendingViewProps {
  voices: BlendVoice[];
  voiceAnalysers: (AnalyserNode | null)[];
  compositeAnalyser: AnalyserNode | null;
  width: number;
  height: number;
  isPlaying: boolean;
  style?: ViewStyle;
}

const VOICE_COLORS = [colors.accent, colors.highlight, '#f59e0b'];

/** Generate a waveform path from analyser time-domain data */
function analyserToPath(analyser: AnalyserNode, width: number, height: number, yOffset: number): string {
  const bufLen = analyser.fftSize;
  const data = new Uint8Array(bufLen);
  analyser.getByteTimeDomainData(data);

  const sliceWidth = width / bufLen;
  const parts: string[] = [];

  for (let i = 0; i < bufLen; i++) {
    const v = data[i] / 128.0; // normalized 0-2
    const y = yOffset + (height / 2) - ((v - 1) * height * 0.45);
    const x = i * sliceWidth;
    parts.push(i === 0 ? `M${x},${y}` : `L${x},${y}`);
  }

  return parts.join(' ');
}

/** Generate a static waveform preview path (when not playing) */
function staticWavePath(voice: BlendVoice, width: number, height: number, yOffset: number): string {
  const mid = yOffset + height / 2;
  const amp = height * 0.35 * voice.volume;
  const points = 200;
  const cycles = 3;
  const parts: string[] = [];

  for (let i = 0; i <= points; i++) {
    const x = (i / points) * width;
    const t = (i / points) * cycles * Math.PI * 2;
    let y = 0;

    switch (voice.waveform) {
      case 'sine':
        y = Math.sin(t);
        break;
      case 'square':
        y = Math.sin(t) >= 0 ? 1 : -1;
        break;
      case 'sawtooth': {
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

    const effectiveY = voice.muted ? 0 : y;
    parts.push(i === 0 ? `M${x},${mid - effectiveY * amp}` : `L${x},${mid - effectiveY * amp}`);
  }

  return parts.join(' ');
}

/** Generate a composite static waveform from all non-muted voices */
function staticCompositePath(voices: BlendVoice[], width: number, height: number, yOffset: number): string {
  const mid = yOffset + height / 2;
  const amp = height * 0.35;
  const points = 400;
  const parts: string[] = [];
  const hasSolo = voices.some((v) => v.solo);

  for (let i = 0; i <= points; i++) {
    const x = (i / points) * width;
    let sum = 0;

    for (const voice of voices) {
      if (voice.muted) continue;
      if (hasSolo && !voice.solo) continue;

      // Use frequency ratio to show beating/harmony
      const cycles = voice.frequency / 100;
      const t = (i / points) * cycles * Math.PI * 2;
      let y = 0;

      switch (voice.waveform) {
        case 'sine': y = Math.sin(t); break;
        case 'square': y = Math.sin(t) >= 0 ? 1 : -1; break;
        case 'sawtooth': {
          const p = (((t / (Math.PI * 2)) % 1) + 1) % 1;
          y = 2 * p - 1;
          break;
        }
        case 'triangle': {
          const p = (((t / (Math.PI * 2)) % 1) + 1) % 1;
          y = 4 * Math.abs(p - 0.5) - 1;
          break;
        }
      }

      sum += y * voice.volume;
    }

    // Normalize to avoid clipping
    const maxSum = voices.reduce((acc, v) => acc + v.volume, 0) || 1;
    const normalized = sum / Math.max(maxSum, 1);
    parts.push(i === 0 ? `M${x},${mid - normalized * amp}` : `L${x},${mid - normalized * amp}`);
  }

  return parts.join(' ');
}

export default function ToneBlendingView({
  voices,
  voiceAnalysers,
  compositeAnalyser,
  width,
  height,
  isPlaying,
  style,
}: ToneBlendingViewProps) {
  const svgRef = useRef<any>(null);
  const pathRefs = useRef<any[]>([null, null, null, null]); // 3 voices + composite
  const rafRef = useRef<number | null>(null);

  const voiceHeight = height * 0.18;
  const compositeHeight = height * 0.40;
  const gap = (height - voiceHeight * 3 - compositeHeight) / 4;

  // Live analyser animation
  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    const tick = () => {
      // Update voice paths
      for (let i = 0; i < 3; i++) {
        const analyser = voiceAnalysers[i];
        const pathEl = pathRefs.current[i];
        if (analyser && pathEl) {
          const yOff = i * (voiceHeight + gap);
          const d = analyserToPath(analyser, width, voiceHeight, yOff);
          try { pathEl.setNativeProps({ d }); } catch { /* svg fallback */ }
        }
      }

      // Update composite path
      if (compositeAnalyser && pathRefs.current[3]) {
        const yOff = 3 * (voiceHeight + gap);
        const d = analyserToPath(compositeAnalyser, width, compositeHeight, yOff);
        try { pathRefs.current[3].setNativeProps({ d }); } catch { /* */ }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isPlaying, voiceAnalysers, compositeAnalyser, width, voiceHeight, compositeHeight, gap]);

  // Static paths when not playing (or as fallback)
  const voicePaths = voices.map((v, i) => {
    const yOff = i * (voiceHeight + gap);
    return staticWavePath(v, width, voiceHeight, yOff);
  });

  const compositePath = staticCompositePath(voices, width, compositeHeight, 3 * (voiceHeight + gap));

  return (
    <View style={[{ width, height, backgroundColor: colors.background, borderRadius: 12 }, style]}>
      <Svg width={width} height={height} ref={svgRef}>
        {/* Divider between voices and composite */}
        <Line
          x1={0}
          y1={3 * (voiceHeight + gap) - gap / 2}
          x2={width}
          y2={3 * (voiceHeight + gap) - gap / 2}
          stroke={colors.border}
          strokeWidth={1}
          strokeDasharray="4,4"
        />

        {/* Voice labels */}
        {voices.map((v, i) => {
          const yOff = i * (voiceHeight + gap);
          return (
            <SvgText
              key={`label-${i}`}
              x={4}
              y={yOff + 12}
              fontSize={10}
              fill={v.muted ? colors.textMuted : VOICE_COLORS[i]}
              opacity={0.7}
            >
              {`V${i + 1}`}
            </SvgText>
          );
        })}

        <SvgText
          x={4}
          y={3 * (voiceHeight + gap) + 14}
          fontSize={10}
          fill={colors.textPrimary}
          opacity={0.7}
        >
          Mix
        </SvgText>

        {/* Voice waveforms */}
        {voices.map((v, i) => (
          <Path
            key={`voice-${i}`}
            ref={(r: any) => { pathRefs.current[i] = r; }}
            d={voicePaths[i]}
            fill="none"
            stroke={v.muted ? colors.textMuted : VOICE_COLORS[i]}
            strokeWidth={1.5}
            opacity={v.muted ? 0.3 : 0.8}
          />
        ))}

        {/* Composite waveform */}
        <Path
          ref={(r: any) => { pathRefs.current[3] = r; }}
          d={compositePath}
          fill="none"
          stroke={colors.textPrimary}
          strokeWidth={2}
          opacity={0.9}
        />
      </Svg>
    </View>
  );
}
