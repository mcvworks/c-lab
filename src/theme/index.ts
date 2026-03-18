/**
 * Resonance Lab design tokens.
 * Dark-first. Restrained neon/spectral accents on near-black backgrounds.
 */

export const colors = {
  // Backgrounds
  background: '#0d0d0f',
  surface: '#16161a',
  surfaceElevated: '#1e1e24',
  border: '#2a2a35',

  // Text
  textPrimary: '#f0f0f5',
  textSecondary: '#8888a0',
  textMuted: '#4a4a60',

  // Accent — soft cyan/teal glow
  accent: '#4ecdc4',
  accentDim: '#2a8a85',
  accentGlow: 'rgba(78, 205, 196, 0.15)',

  // Highlight — soft violet
  highlight: '#a78bfa',
  highlightDim: '#6d4fc7',

  // Danger/warning
  warning: '#f59e0b',
  danger: '#ef4444',

  // Tab bar
  tabActive: '#4ecdc4',
  tabInactive: '#4a4a60',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const typography = {
  // Font sizes
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 26,
  display: 34,

  // Font weights
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
} as const;

export const shadow = {
  glow: {
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;

const theme = { colors, spacing, radius, typography, shadow };
export default theme;
