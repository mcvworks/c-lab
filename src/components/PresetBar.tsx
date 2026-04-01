import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, spacing, typography, radius, useColors } from '@/src/theme';

export interface QuickPreset<T = unknown> {
  label: string;
  settings: T;
}

interface PresetBarProps<T> {
  presets: QuickPreset<T>[];
  onSelect: (settings: T) => void;
  activeIndex?: number | null;
}

export default function PresetBar<T>({ presets, onSelect, activeIndex }: PresetBarProps<T>) {
  const c = useColors();
  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {presets.map((preset, i) => {
          const active = activeIndex === i;
          return (
            <TouchableOpacity
              key={preset.label}
              onPress={() => onSelect(preset.settings)}
              style={[styles.pill, { backgroundColor: c.surfaceElevated, borderColor: c.border }, active && styles.pillActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>
                {preset.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  container: {
    paddingHorizontal: spacing.xs,
    gap: spacing.sm,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillActive: {
    backgroundColor: colors.accentDim + '40',
    borderColor: colors.accent,
  },
  pillText: {
    fontSize: typography.sm,
    fontWeight: typography.medium,
    color: colors.textSecondary,
  },
  pillTextActive: {
    color: colors.accent,
  },
});
