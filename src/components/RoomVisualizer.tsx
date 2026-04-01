import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Rect, Ellipse, Path, Circle, Line } from 'react-native-svg';
import { colors, useColors, spacing, radius } from '@/src/theme';
import type { RoomPreset } from '@/src/audio';

interface RoomVisualizerProps {
  preset: RoomPreset;
  wetDry: number; // 0–1
  isPlaying: boolean;
}

const VIZ_HEIGHT = 140;
const RIPPLE_COUNT = 5;

/** Room shape paths (centered in a 200×120 viewBox) */
const ROOM_SHAPES: Record<RoomPreset, { type: 'rect' | 'ellipse' | 'path'; d?: string; rx?: number; ry?: number; w?: number; h?: number }> = {
  smallRoom: { type: 'rect', w: 120, h: 80, rx: 6, ry: 6 },
  cathedral: { type: 'path', d: 'M60,10 L30,30 L30,100 L170,100 L170,30 L140,10 Q100,-5 60,10Z' },
  cave: { type: 'ellipse', rx: 85, ry: 55 },
  openAir: { type: 'path', d: 'M20,110 Q100,-20 180,110' },
  box: { type: 'rect', w: 90, h: 90, rx: 2, ry: 2 },
};

/** Color tint per room — warm skeumorphic tones */
const ROOM_COLORS: Record<RoomPreset, string> = {
  smallRoom: '#FA3C00',
  cathedral: '#F08321',
  cave: '#D97706',
  openAir: '#c06a18',
  box: '#b82d00',
};

export default function RoomVisualizer({ preset, wetDry, isPlaying }: RoomVisualizerProps) {
  const c = useColors();
  const { width: screenWidth } = useWindowDimensions();
  const contentWidth = screenWidth - spacing.md * 4 - 2;

  // Animation state
  const rippleRefs = useRef<(Circle | null)[]>([]);
  const lineRefs = useRef<(Line | null)[]>([]);
  const rafRef = useRef<number | null>(null);
  const phaseRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);

  const animate = useCallback((time: number) => {
    if (lastTimeRef.current === null) lastTimeRef.current = time;
    const dt = (time - lastTimeRef.current) / 1000;
    lastTimeRef.current = time;
    phaseRef.current += dt * 1.5;

    const phase = phaseRef.current;

    // Animate ripple circles expanding from center
    for (let i = 0; i < RIPPLE_COUNT; i++) {
      const circle = rippleRefs.current[i];
      if (!circle) continue;

      const offset = (phase + i * 0.6) % 3;
      const r = 5 + offset * 25 * (1 + wetDry * 0.5);
      const opacity = Math.max(0, (1 - offset / 3) * wetDry * 0.6);

      try {
        circle.setNativeProps({
          r: String(r),
          opacity: String(opacity),
        });
      } catch { /* web fallback */ }
    }

    // Animate reflection lines
    for (let i = 0; i < 4; i++) {
      const line = lineRefs.current[i];
      if (!line) continue;

      const angle = (i * Math.PI / 2) + phase * 0.8;
      const dist = 15 + Math.sin(phase * 2 + i) * 10 * wetDry;
      const x2 = 100 + Math.cos(angle) * dist;
      const y2 = 60 + Math.sin(angle) * dist * 0.7;
      const opacity = wetDry * 0.4 * (0.5 + 0.5 * Math.sin(phase * 3 + i * 1.5));

      try {
        line.setNativeProps({
          x2: String(x2),
          y2: String(y2),
          opacity: String(opacity),
        });
      } catch { /* web fallback */ }
    }

    rafRef.current = requestAnimationFrame(animate);
  }, [wetDry]);

  useEffect(() => {
    if (isPlaying && wetDry > 0) {
      lastTimeRef.current = null;
      rafRef.current = requestAnimationFrame(animate);
    } else {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      // Reset ripples to invisible
      for (let i = 0; i < RIPPLE_COUNT; i++) {
        try { rippleRefs.current[i]?.setNativeProps({ opacity: '0' }); } catch { /* */ }
      }
      for (let i = 0; i < 4; i++) {
        try { lineRefs.current[i]?.setNativeProps({ opacity: '0' }); } catch { /* */ }
      }
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, wetDry > 0, animate]);

  const roomColor = ROOM_COLORS[preset];
  const shape = ROOM_SHAPES[preset];

  return (
    <View style={[styles.container, { width: contentWidth, backgroundColor: c.background }]}>
      <Svg width={contentWidth} height={VIZ_HEIGHT} viewBox="0 0 200 120">
        {/* Room shape outline */}
        {shape.type === 'rect' && (
          <Rect
            x={100 - (shape.w! / 2)}
            y={60 - (shape.h! / 2)}
            width={shape.w!}
            height={shape.h!}
            rx={shape.rx}
            ry={shape.ry}
            fill="none"
            stroke={roomColor}
            strokeWidth={1.5}
            opacity={0.5}
          />
        )}
        {shape.type === 'ellipse' && (
          <Ellipse
            cx={100}
            cy={60}
            rx={shape.rx!}
            ry={shape.ry!}
            fill="none"
            stroke={roomColor}
            strokeWidth={1.5}
            opacity={0.5}
          />
        )}
        {shape.type === 'path' && (
          <Path
            d={shape.d!}
            fill="none"
            stroke={roomColor}
            strokeWidth={1.5}
            opacity={0.5}
          />
        )}

        {/* Source dot at center */}
        <Circle cx={100} cy={60} r={3} fill={roomColor} opacity={0.8} />

        {/* Expanding ripple circles */}
        {Array.from({ length: RIPPLE_COUNT }).map((_, i) => (
          <Circle
            key={`ripple-${i}`}
            ref={(el) => { rippleRefs.current[i] = el; }}
            cx={100}
            cy={60}
            r={5}
            fill="none"
            stroke={roomColor}
            strokeWidth={1}
            opacity={0}
          />
        ))}

        {/* Reflection lines from center outward */}
        {Array.from({ length: 4 }).map((_, i) => (
          <Line
            key={`ref-${i}`}
            ref={(el) => { lineRefs.current[i] = el; }}
            x1={100}
            y1={60}
            x2={100}
            y2={60}
            stroke={roomColor}
            strokeWidth={1.5}
            strokeLinecap="round"
            opacity={0}
          />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    overflow: 'hidden',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
});
