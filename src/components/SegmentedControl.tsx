import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radius, spacing, typography, useColors } from '@/src/theme';

interface SegmentedControlProps<T extends string> {
  options: readonly T[];
  selected: T;
  onSelect: (value: T) => void;
  /** Optional display labels (defaults to option values) */
  labels?: Record<T, string>;
  style?: ViewStyle;
}

/**
 * Horizontal segmented toggle for selecting between a small set of options.
 */
export default function SegmentedControl<T extends string>({
  options,
  selected,
  onSelect,
  labels,
  style,
}: SegmentedControlProps<T>) {
  const c = useColors();
  const isOled = c.background === '#000000';
  return (
    <View style={[styles.container, { backgroundColor: c.background, borderColor: c.border, borderTopColor: isOled ? '#000000' : '#0f0d0a', borderBottomColor: isOled ? '#1a1a1a' : '#3d3428' }, style]}>
      {options.map((option) => {
        const isActive = option === selected;
        return (
          <Pressable
            key={option}
            onPress={() => onSelect(option)}
            style={[styles.segment, isActive && styles.segmentActive]}
          >
            <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>
              {labels ? labels[option] : option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopColor: '#0f0d0a',
    borderBottomColor: '#3d3428',
    padding: 3,
    // Recessed housing
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  segmentActive: {
    backgroundColor: colors.accent,
    // Raised tab
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 4,
    borderTopWidth: 1,
    borderTopColor: '#ff6633',
  },
  segmentText: {
    fontSize: typography.sm,
    fontWeight: typography.medium,
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: '#fff',
    fontWeight: typography.semibold,
  },
});
