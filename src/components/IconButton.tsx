import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius, spacing } from '@/src/theme';

interface IconButtonProps {
  children: React.ReactNode;
  onPress: () => void;
  variant?: 'filled' | 'outline' | 'ghost';
  size?: number;
  disabled?: boolean;
  style?: ViewStyle;
}

/**
 * Round icon button for toolbar-style actions.
 * Pass an icon element as children.
 */
export default function IconButton({
  children,
  onPress,
  variant = 'ghost',
  size = 44,
  disabled = false,
  style,
}: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        { width: size, height: size, borderRadius: size / 2 },
        variant === 'filled' && styles.filled,
        variant === 'outline' && styles.outline,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  filled: {
    backgroundColor: colors.accent,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.4,
  },
});
