import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Line, Circle } from 'react-native-svg';
import { colors, spacing, typography, radius } from '@/src/theme';

interface StringData {
  note: string;
  freq: number;
}

interface SympatheticStringsViewProps {
  strings: readonly StringData[];
  /** Current resonance level (0–1) per string, matching the strings array order */
  resonance: number[];
  isPlaying: boolean;
}

const STRING_HEIGHT = 28;
const DOT_RADIUS = 4;
const LABEL_WIDTH = 32;
const RIGHT_PAD = 8;

export default function SympatheticStringsView({
  strings,
  resonance,
  isPlaying,
}: SympatheticStringsViewProps) {
  const { width: screenWidth } = useWindowDimensions();
  const contentWidth = screenWidth - spacing.md * 4 - 2; // Card + Screen padding
  const stringWidth = contentWidth - LABEL_WIDTH - RIGHT_PAD;

  // Animation: we use refs to update SVG nativeProps for performance
  const lineRefs = useRef<(Line | null)[]>([]);
  const dotRefs = useRef<(Circle | null)[]>([]);
  const rafRef = useRef<number | null>(null);
  const phaseRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);
  const resonanceRef = useRef(resonance);
  resonanceRef.current = resonance;

  const updateStrings = useCallback((phase: number) => {
    const res = resonanceRef.current;
    for (let i = 0; i < res.length; i++) {
      const r = res[i];
      const line = lineRefs.current[i];
      const dot = dotRefs.current[i];
      if (!line || !dot) continue;

      // Vibrating string: midpoint displacement proportional to resonance
      const displacement = r * 8 * Math.sin(phase * (3 + i * 0.7));
      const midY = STRING_HEIGHT / 2 + displacement;

      // Use a quadratic bezier approximation via y1/y2 for the line
      // SVG Line doesn't support curves, so we move the dot to show vibration
      const dotCx = LABEL_WIDTH + stringWidth / 2;

      dot.setNativeProps({ cy: midY.toFixed(1) });

      // Glow opacity based on resonance
      const opacity = Math.max(0.15, r);
      const strokeColor = r > 0.1
        ? `rgba(78, 205, 196, ${opacity.toFixed(2)})`
        : `rgba(74, 74, 96, 0.4)`;
      line.setNativeProps({ stroke: strokeColor });
      dot.setNativeProps({
        r: (DOT_RADIUS + r * 3).toFixed(1),
        fillOpacity: r > 0.05 ? (r * 0.9).toFixed(2) : '0',
      });
    }
  }, [stringWidth]);

  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastTimeRef.current = null;
      updateStrings(0);
      return;
    }

    const tick = (time: number) => {
      if (lastTimeRef.current != null) {
        const dt = (time - lastTimeRef.current) / 1000;
        phaseRef.current += dt * 12; // vibration speed
        if (phaseRef.current > 1000) phaseRef.current -= 1000;
      }
      lastTimeRef.current = time;
      updateStrings(phaseRef.current);
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
  }, [isPlaying, updateStrings]);

  // Update static display when resonance changes while not playing
  useEffect(() => {
    if (!isPlaying) updateStrings(0);
  }, [resonance, isPlaying, updateStrings]);

  if (contentWidth <= 0) return null;

  return (
    <View style={styles.container}>
      {strings.map((s, i) => {
        const r = resonance[i] ?? 0;
        return (
          <View key={s.note} style={styles.stringRow}>
            <Text style={[styles.noteLabel, r > 0.1 && styles.noteLabelActive]}>
              {s.note}
            </Text>
            <Svg
              width={stringWidth + RIGHT_PAD}
              height={STRING_HEIGHT}
              style={styles.stringSvg}
            >
              <Line
                ref={(el) => { lineRefs.current[i] = el; }}
                x1={0}
                y1={STRING_HEIGHT / 2}
                x2={stringWidth}
                y2={STRING_HEIGHT / 2}
                stroke={r > 0.1 ? colors.accent : colors.textMuted}
                strokeWidth={r > 0.3 ? 2 : 1}
                strokeOpacity={Math.max(0.3, r)}
              />
              <Circle
                ref={(el) => { dotRefs.current[i] = el; }}
                cx={LABEL_WIDTH + stringWidth / 2 - LABEL_WIDTH}
                cy={STRING_HEIGHT / 2}
                r={DOT_RADIUS + r * 3}
                fill={colors.accent}
                fillOpacity={r > 0.05 ? r * 0.9 : 0}
              />
            </Svg>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  stringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: STRING_HEIGHT,
  },
  noteLabel: {
    width: LABEL_WIDTH,
    fontSize: typography.xs,
    fontWeight: typography.semibold,
    color: colors.textMuted,
    textAlign: 'right',
    paddingRight: spacing.sm,
  },
  noteLabelActive: {
    color: colors.accent,
  },
  stringSvg: {
    flex: 1,
  },
});
