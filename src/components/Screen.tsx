import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '@/src/theme';
import { useResponsive } from '@/src/hooks/useResponsive';

interface ScreenProps extends ViewProps {
  children: React.ReactNode;
  /** Use SafeAreaView (default true) */
  safe?: boolean;
  /** Horizontal padding override */
  padded?: boolean;
}

/**
 * Base screen wrapper that enforces dark background and safe-area insets.
 * On tablets, content is centered with increased padding and max-width.
 */
export default function Screen({ children, safe = true, padded = true, style, ...rest }: ScreenProps) {
  const { contentPadding, maxContentWidth } = useResponsive();

  const content = (
    <View
      style={[
        styles.inner,
        padded && { paddingHorizontal: contentPadding },
        maxContentWidth != null && { maxWidth: maxContentWidth + contentPadding * 2, alignSelf: 'center' as const, width: '100%' as const },
        style,
      ]}
      {...rest}
    >
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
});
