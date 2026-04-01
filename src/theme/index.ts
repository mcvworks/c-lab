/**
 * Resonance Lab design tokens.
 * Dark skeumorphic — warm amber/orange accents, embossed surfaces,
 * tactile depth on dark brushed-metal backgrounds.
 *
 * Two theme modes: 'dark' (default brushed-metal) and 'oled' (true-black).
 */

import { useThemeStore } from '@/src/state/useThemeStore';

/** Shared accent/text/semantic colors (identical across themes) */
const shared = {
  // Text
  textPrimary: '#f5efe6',
  textSecondary: '#a0937e',
  textMuted: '#6b5f4e',

  // Accent — warm amber/orange
  accent: '#FA3C00',
  accentDim: '#b82d00',
  accentGlow: 'rgba(250, 60, 0, 0.18)',

  // Highlight — golden amber
  highlight: '#F08321',
  highlightDim: '#c06a18',

  // Danger/warning
  warning: '#D97706',
  danger: '#DC2626',

  // Tab bar
  tabActive: '#FA3C00',
  tabInactive: '#6b5f4e',
} as const;

/** Dark theme — warm brushed-metal surfaces */
const darkSurfaces = {
  background: '#1a1612',
  surface: '#231f1a',
  surfaceElevated: '#2e2820',
  border: '#3d3428',
} as const;

/** OLED theme — true-black with minimal dark-gray surfaces */
const oledSurfaces = {
  background: '#000000',
  surface: '#0A0A0A',
  surfaceElevated: '#111111',
  border: '#1a1a1a',
} as const;

/** Color palette shape — surface values vary by theme */
export interface AppColors {
  background: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentDim: string;
  accentGlow: string;
  highlight: string;
  highlightDim: string;
  warning: string;
  danger: string;
  tabActive: string;
  tabInactive: string;
}

const darkColors: AppColors = { ...shared, ...darkSurfaces };
const oledColors: AppColors = { ...shared, ...oledSurfaces };

/** Static default — used in module-level StyleSheet.create (dark theme values). */
export const colors = darkColors;

/**
 * Reactive color hook — returns the active palette based on theme mode.
 * Use this inside components to get OLED-aware colors.
 */
export function useColors(): AppColors {
  const mode = useThemeStore((s) => s.mode);
  return mode === 'oled' ? oledColors : darkColors;
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
} as const;

export const typography = {
  // Font sizes
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  display: 40,

  // Font weights
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
} as const;

export const shadow = {
  // Embossed outward shadow — raised panel feel
  glow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  // Inset-style bevel highlight (top-left light edge)
  bevelLight: {
    shadowColor: 'rgba(255, 240, 220, 0.08)',
    shadowOffset: { width: -1, height: -1 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 0,
  },
  // Pressed/inset feel
  inset: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 2,
  },
} as const;

const theme = { colors, spacing, radius, typography, shadow };
export default theme;
