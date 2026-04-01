import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { colors, radius, spacing, useColors } from '@/src/theme';

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
  const c = useColors();
  const isOled = c.background === '#000000';
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: c.surface,
          borderColor: c.border,
          borderTopColor: isOled ? '#1a1a1a' : '#3d3428',
          borderBottomColor: isOled ? '#050505' : '#1a1510',
        },
        glowing && styles.glowing,
        style,
      ]}
      {...rest}
    >
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
    borderTopColor: '#3d3428',
    borderBottomColor: '#1a1510',
    padding: spacing.md,
    // Embossed raised-panel shadow
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 6,
  },
  glowing: {
    borderColor: colors.accentDim,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
});
