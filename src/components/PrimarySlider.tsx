import React, { useCallback } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  withSpring,
} from 'react-native-reanimated';
import { colors, radius, spacing, typography } from '@/src/theme';

const TRACK_HEIGHT = 6;
const THUMB_SIZE = 22;
const SPRING_CONFIG = { damping: 20, stiffness: 300, mass: 0.5 };

interface PrimarySliderProps {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  formatValue?: (value: number) => string;
  style?: ViewStyle;
}

/**
 * Custom slider built with Reanimated + Gesture Handler.
 * Premium dark styling with accent track and glow thumb.
 */
export default function PrimarySlider({
  value,
  onValueChange,
  min = 0,
  max = 1,
  step = 0,
  label,
  formatValue,
  style,
}: PrimarySliderProps) {
  const trackWidth = useSharedValue(0);
  const thumbScale = useSharedValue(1);

  const fraction = Math.max(0, Math.min(1, (value - min) / (max - min)));

  const quantize = useCallback(
    (raw: number) => {
      if (step > 0) {
        return Math.round(raw / step) * step;
      }
      return raw;
    },
    [step],
  );

  const handleChange = useCallback(
    (x: number) => {
      const w = trackWidth.value;
      if (w <= 0) return;
      const clamped = Math.max(0, Math.min(x, w));
      const raw = min + (clamped / w) * (max - min);
      const quantized = quantize(raw);
      const final = Math.max(min, Math.min(max, quantized));
      onValueChange(final);
    },
    [min, max, quantize, onValueChange, trackWidth],
  );

  const pan = Gesture.Pan()
    .onBegin((e) => {
      thumbScale.value = withSpring(1.3, SPRING_CONFIG);
      runOnJS(handleChange)(e.x);
    })
    .onUpdate((e) => {
      runOnJS(handleChange)(e.x);
    })
    .onFinalize(() => {
      thumbScale.value = withSpring(1, SPRING_CONFIG);
    })
    .hitSlop({ top: 16, bottom: 16 });

  const tap = Gesture.Tap().onEnd((e) => {
    runOnJS(handleChange)(e.x);
  });

  const gesture = Gesture.Race(pan, tap);

  const thumbAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: thumbScale.value }],
  }));

  const displayValue = formatValue ? formatValue(value) : value.toFixed(step >= 1 ? 0 : 2);

  return (
    <View style={[styles.wrapper, style]}>
      {(label || formatValue) && (
        <View style={styles.labelRow}>
          {label ? <Text style={styles.label}>{label}</Text> : null}
          <Text style={styles.valueText}>{displayValue}</Text>
        </View>
      )}
      <GestureDetector gesture={gesture}>
        <View
          style={styles.trackContainer}
          onLayout={(e) => {
            trackWidth.value = e.nativeEvent.layout.width;
          }}
        >
          <View style={styles.trackBg} />
          <View style={[styles.trackFill, { width: `${fraction * 100}%` }]} />
          <Animated.View
            style={[
              styles.thumb,
              { left: `${fraction * 100}%` },
              thumbAnimatedStyle,
            ]}
          />
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {},
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: typography.sm,
    fontWeight: typography.medium,
    color: colors.textSecondary,
  },
  valueText: {
    fontSize: typography.sm,
    fontWeight: typography.medium,
    color: colors.accent,
    minWidth: 40,
    textAlign: 'right',
  },
  trackContainer: {
    height: THUMB_SIZE + 16,
    justifyContent: 'center',
  },
  trackBg: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: colors.surfaceElevated,
  },
  trackFill: {
    position: 'absolute',
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: colors.accent,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: colors.accent,
    marginLeft: -THUMB_SIZE / 2,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 2,
    borderColor: colors.background,
  },
});
