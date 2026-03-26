import { useWindowDimensions } from 'react-native';
import { spacing } from '@/src/theme';

const TABLET_BREAKPOINT = 768;
const MAX_CONTENT_WIDTH = 720;

export function useResponsive() {
  const { width: screenWidth } = useWindowDimensions();
  const isTablet = screenWidth >= TABLET_BREAKPOINT;

  return {
    screenWidth,
    isTablet,
    /** Horizontal padding for Screen-level content */
    contentPadding: isTablet ? spacing.xl : spacing.md,
    /** Max width for content containers on tablet */
    maxContentWidth: isTablet ? MAX_CONTENT_WIDTH : undefined,
    /** Usable content width after padding */
    contentWidth: isTablet
      ? Math.min(screenWidth - spacing.xl * 2, MAX_CONTENT_WIDTH)
      : screenWidth - spacing.md * 2,
    /** Number of columns for grid layouts */
    gridColumns: isTablet ? 2 : 1,
    /** Visualization height */
    vizHeight: isTablet ? 200 : 140,
    /** Sand plate size */
    plateSize: Math.min(screenWidth - spacing.md * 4, isTablet ? 440 : 320),
  };
}
