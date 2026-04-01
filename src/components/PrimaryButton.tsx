import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle, TextStyle } from 'react-native';
import { colors, radius, spacing, typography } from '@/src/theme';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'filled' | 'outline' | 'ghost';
  disabled?: boolean;
  style?: ViewStyle;
}

export default function PrimaryButton({
  title,
  onPress,
  variant = 'filled',
  disabled = false,
  style,
}: PrimaryButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        variant === 'filled' && styles.filled,
        variant === 'outline' && styles.outline,
        variant === 'ghost' && styles.ghost,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          variant === 'filled' && styles.filledText,
          variant === 'outline' && styles.outlineText,
          variant === 'ghost' && styles.ghostText,
          disabled && styles.disabledText,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filled: {
    backgroundColor: colors.accent,
    // 3D raised button with top highlight
    borderTopWidth: 1,
    borderTopColor: '#ff6633',
    borderBottomWidth: 2,
    borderBottomColor: '#991f00',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 6,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  pressed: {
    opacity: 0.85,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
    borderBottomWidth: 1,
  },
  disabled: {
    opacity: 0.4,
  },
  text: {
    fontSize: typography.md,
    fontWeight: typography.semibold,
  },
  filledText: {
    color: '#fff',
  },
  outlineText: {
    color: colors.accent,
  },
  ghostText: {
    color: colors.accent,
  },
  disabledText: {
    color: colors.textMuted,
  },
});
