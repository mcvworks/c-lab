import React from 'react';
import { StyleSheet, Text, View, ViewProps } from 'react-native';
import { colors, spacing, typography } from '@/src/theme';

interface SectionHeaderProps extends ViewProps {
  title: string;
  subtitle?: string;
  /** Use uppercase label style (default false) */
  label?: boolean;
}

/**
 * Section header for grouping content areas.
 * Two modes: regular (large title + optional subtitle) or label (small uppercase).
 */
export default function SectionHeader({ title, subtitle, label = false, style, ...rest }: SectionHeaderProps) {
  if (label) {
    return (
      <View style={[styles.container, style]} {...rest}>
        <Text style={styles.labelText}>{title.toUpperCase()}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]} {...rest}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: typography.xxl,
    fontWeight: typography.bold,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  labelText: {
    fontSize: typography.xs,
    fontWeight: typography.semibold,
    color: colors.accent,
    letterSpacing: 1.5,
  },
});
