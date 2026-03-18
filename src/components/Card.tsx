import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { colors, radius, spacing } from '@/src/theme';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  /** Apply a soft accent glow border */
  glowing?: boolean;
}

/**
 * Elevated surface card for grouping related controls or content.
 * Sits on top of the dark background with subtle border and depth.
 */
export default function Card({ children, glowing = false, style, ...rest }: CardProps) {
  return (
    <View style={[styles.card, glowing && styles.glowing, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  glowing: {
    borderColor: colors.accentDim,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
});
