import React, { useEffect } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { colors, radius, spacing, typography, useColors } from '@/src/theme';

interface ControlDrawerProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

const SPRING_CONFIG = { damping: 24, stiffness: 200, mass: 0.8 };

/**
 * Bottom-sheet control drawer for secondary controls.
 * Slides up from the bottom with a semi-transparent backdrop.
 */
export default function ControlDrawer({
  visible,
  onClose,
  title,
  children,
}: ControlDrawerProps) {
  const c = useColors();
  const { height: screenHeight } = useWindowDimensions();
  const maxHeight = screenHeight * 0.55;
  const translateY = useSharedValue(maxHeight);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, SPRING_CONFIG);
      backdropOpacity.value = withTiming(1, { duration: 250 });
    } else {
      translateY.value = withSpring(maxHeight, SPRING_CONFIG);
      backdropOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible, maxHeight, translateY, backdropOpacity]);

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Panel */}
      <Animated.View style={[styles.panel, { maxHeight, backgroundColor: c.surface }, panelStyle]}>
        {/* Grab handle */}
        <View style={styles.handleRow}>
          <View style={[styles.handle, { backgroundColor: c.border }]} />
        </View>

        {/* Header */}
        {title && (
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.closeText}>Done</Text>
            </Pressable>
          </View>
        )}

        {/* Content */}
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {children}
          <View style={{ height: spacing.lg }} />
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    // Embossed panel edge
    borderTopWidth: 1,
    borderTopColor: '#3d3428',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 16,
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  closeText: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    color: colors.accent,
  },
  content: {
    paddingHorizontal: spacing.md,
  },
});
