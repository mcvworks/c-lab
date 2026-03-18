import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '@/src/theme';

interface ScreenProps extends ViewProps {
  children: React.ReactNode;
  /** Use SafeAreaView (default true) */
  safe?: boolean;
  /** Horizontal padding override */
  padded?: boolean;
}

/**
 * Base screen wrapper that enforces dark background and safe-area insets.
 * Wrap every top-level screen with this component.
 */
export default function Screen({ children, safe = true, padded = true, style, ...rest }: ScreenProps) {
  const content = (
    <View style={[styles.inner, padded && styles.padded, style]} {...rest}>
      {children}
    </View>
  );

  if (safe) {
    return <SafeAreaView style={styles.root}>{content}</SafeAreaView>;
  }

  return <View style={styles.root}>{content}</View>;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  inner: {
    flex: 1,
    backgroundColor: colors.background,
  },
  padded: {
    paddingHorizontal: spacing.md,
  },
});
