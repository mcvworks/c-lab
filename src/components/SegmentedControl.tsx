import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radius, spacing, typography } from '@/src/theme';

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
  return (
    <View style={[styles.container, style]}>
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
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
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
  },
  segmentText: {
    fontSize: typography.sm,
    fontWeight: typography.medium,
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: colors.background,
    fontWeight: typography.semibold,
  },
});
