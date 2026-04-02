import React, { useEffect, useRef } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useColors, spacing, radius, typography } from '@/src/theme';
import { CATEGORY_ICONS } from '@/src/data/frequencyCatalog';
import { useDiscoveryToastStore } from '@/src/state/useDiscoveryToastStore';

const AUTO_DISMISS_MS = 3000;

export default function DiscoveryToast() {
  const c = useColors();
  const entry = useDiscoveryToastStore((s) => s.entry);
  const dismiss = useDiscoveryToastStore((s) => s.dismiss);
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Slide position (starts off-screen above)
  const translateY = useSharedValue(-120);
  // Glow pulse opacity
  const glowOpacity = useSharedValue(0);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    if (entry) {
      // Slide in
      translateY.value = withTiming(0, { duration: 350, easing: Easing.out(Easing.cubic) });

      // Subtle glow pulse
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 800 }),
          withTiming(0.3, { duration: 800 }),
        ),
        -1,
        false,
      );

      // Auto-dismiss
      clearTimer();
      timerRef.current = setTimeout(() => {
        slideOut();
      }, AUTO_DISMISS_MS);
    }

    return () => clearTimer();
  }, [entry]);

  const slideOut = () => {
    translateY.value = withTiming(-120, { duration: 300, easing: Easing.in(Easing.cubic) }, () => {
      runOnJS(dismiss)();
    });
    glowOpacity.value = withTiming(0, { duration: 300 });
  };

  const handlePress = () => {
    clearTimer();
    slideOut();
    // Navigate to Library tab (discoveries section)
    router.push('/(tabs)/library');
  };

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  if (!entry) return null;

  const icon = CATEGORY_ICONS[entry.category];

  return (
    <Animated.View style={[styles.wrapper, containerStyle]}>
      <Pressable onPress={handlePress}>
        <View style={[styles.container, { backgroundColor: c.surfaceElevated, borderColor: c.border }]}>
          {/* Glow overlay */}
          <Animated.View
            style={[
              styles.glowOverlay,
              { backgroundColor: c.accentGlow },
              glowStyle,
            ]}
          />

          {/* Content */}
          <Text style={styles.categoryIcon}>{icon}</Text>
          <View style={styles.textColumn}>
            <Text style={[styles.title, { color: c.accent }]}>
              Frequency Discovered!
            </Text>
            <Text style={[styles.name, { color: c.textPrimary }]}>
              {icon} {entry.name} — {entry.frequency} Hz
            </Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 54,
    left: spacing.md,
    right: spacing.md,
    zIndex: 9999,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    overflow: 'hidden',
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
  },
  glowOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.lg,
  },
  categoryIcon: {
    fontSize: 28,
    marginRight: spacing.sm + 2,
  },
  textColumn: {
    flex: 1,
  },
  title: {
    fontSize: typography.xs,
    fontWeight: typography.semibold,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  name: {
    fontSize: typography.md,
    fontWeight: typography.medium,
  },
});
