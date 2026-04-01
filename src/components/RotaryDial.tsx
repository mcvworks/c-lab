import React, { useCallback } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  withSpring,
} from 'react-native-reanimated';
import { colors, spacing, typography } from '@/src/theme';

const KNOB_SIZE = 56;
const DOT_SIZE = 8;
const MIN_ANGLE = -135; // degrees (7 o'clock)
const MAX_ANGLE = 135;  // degrees (5 o'clock)
const SWEEP = MAX_ANGLE - MIN_ANGLE; // 270 degrees
const DRAG_RANGE = 200; // px of vertical drag for full range
const SPRING_CONFIG = { damping: 20, stiffness: 300, mass: 0.5 };

// Tick positions (every 27 degrees across the 270-degree sweep)
const TICK_COUNT = 10;
const TICKS = Array.from({ length: TICK_COUNT + 1 }, (_, i) =>
  MIN_ANGLE + (i / TICK_COUNT) * SWEEP,
);

interface RotaryDialProps {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  formatValue?: (value: number) => string;
  size?: number;
  style?: ViewStyle;
  disabled?: boolean;
}

/**
 * Skeumorphic rotary knob control.
 * Drag up to increase, drag down to decrease.
 * 270-degree sweep with a bottom dead zone.
 */
export default function RotaryDial({
  value,
  onValueChange,
  min = 0,
  max = 1,
  step = 0,
  label,
  formatValue,
  size = KNOB_SIZE,
  style,
  disabled,
}: RotaryDialProps) {
  const knobScale = useSharedValue(1);
  const startValue = useSharedValue(0);

  const fraction = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const angleDeg = MIN_ANGLE + fraction * SWEEP;
  const angleRad = (angleDeg * Math.PI) / 180;

  const quantize = useCallback(
    (raw: number) => (step > 0 ? Math.round(raw / step) * step : raw),
    [step],
  );

  const handleChange = useCallback(
    (newValue: number) => {
      if (disabled) return;
      const clamped = Math.max(min, Math.min(max, quantize(newValue)));
      onValueChange(clamped);
    },
    [min, max, quantize, onValueChange, disabled],
  );

  const pan = Gesture.Pan()
    .onBegin(() => {
      startValue.value = value;
      knobScale.value = withSpring(1.12, SPRING_CONFIG);
    })
    .onUpdate((e) => {
      const delta = -e.translationY / DRAG_RANGE;
      runOnJS(handleChange)(startValue.value + delta * (max - min));
    })
    .onFinalize(() => {
      knobScale.value = withSpring(1, SPRING_CONFIG);
    })
    .hitSlop({ top: 16, bottom: 16, left: 16, right: 16 });

  const knobAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: knobScale.value }],
  }));

  const displayValue = formatValue
    ? formatValue(value)
    : value.toFixed(step >= 1 ? 0 : 2);

  const outerSize = size + 16;
  const center = outerSize / 2;
  const dotRadius = size / 2 - 8; // indicator dot orbit radius (inside knob edge)

  // Indicator dot position (sin for x, -cos for y since 0° = top)
  const dotX = center + Math.sin(angleRad) * dotRadius - DOT_SIZE / 2;
  const dotY = center - Math.cos(angleRad) * dotRadius - DOT_SIZE / 2;

  return (
    <View style={[styles.wrapper, { width: outerSize + 8 }, style, disabled && styles.disabled]}>
      {label && <Text style={styles.label} numberOfLines={1}>{label}</Text>}
      <GestureDetector gesture={pan}>
        <Animated.View style={[{ width: outerSize, height: outerSize }, knobAnimatedStyle]}>
          {/* Tick marks ring */}
          {TICKS.map((tickAngle, i) => {
            const rad = (tickAngle * Math.PI) / 180;
            const isMajor = i === 0 || i === TICK_COUNT || i === TICK_COUNT / 2;
            const r = size / 2 + 5;
            const tx = center + Math.sin(rad) * r;
            const ty = center - Math.cos(rad) * r;
            return (
              <View
                key={i}
                style={{
                  position: 'absolute',
                  left: tx - (isMajor ? 1.5 : 1),
                  top: ty - (isMajor ? 1.5 : 1),
                  width: isMajor ? 3 : 2,
                  height: isMajor ? 3 : 2,
                  borderRadius: isMajor ? 1.5 : 1,
                  backgroundColor: isMajor ? colors.textSecondary : colors.textMuted,
                }}
              />
            );
          })}

          {/* Knob body */}
          <View
            style={[
              styles.knobBody,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                top: (outerSize - size) / 2,
                left: (outerSize - size) / 2,
              },
            ]}
          >
            {/* Highlight reflection */}
            <View
              style={[
                styles.highlight,
                {
                  width: size * 0.35,
                  height: size * 0.35,
                  borderRadius: size * 0.175,
                },
              ]}
            />
          </View>

          {/* Indicator dot — orbits inside the knob edge */}
          <View
            style={[
              styles.indicatorDot,
              {
                left: dotX,
                top: dotY,
                width: DOT_SIZE,
                height: DOT_SIZE,
                borderRadius: DOT_SIZE / 2,
              },
            ]}
          />
        </Animated.View>
      </GestureDetector>
      <Text style={styles.valueText} numberOfLines={1}>{displayValue}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.4,
  },
  label: {
    fontSize: typography.xs,
    fontWeight: typography.medium,
    color: colors.textSecondary,
    marginBottom: 2,
    textAlign: 'center',
  },
  valueText: {
    fontSize: typography.xs,
    fontWeight: typography.semibold,
    color: colors.accent,
    marginTop: 2,
    textAlign: 'center',
  },
  knobBody: {
    position: 'absolute',
    backgroundColor: '#3d3428',
    borderWidth: 2,
    borderColor: '#4a4035',
    borderTopColor: '#5a5040',
    borderBottomColor: '#2a2418',
    // 3D raised shadow
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
    elevation: 10,
    overflow: 'hidden',
  },
  highlight: {
    position: 'absolute',
    top: 4,
    left: 6,
    backgroundColor: 'rgba(255, 240, 220, 0.07)',
  },
  indicatorDot: {
    position: 'absolute',
    backgroundColor: colors.accent,
    // Glow
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 12,
  },
});
