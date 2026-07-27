/**
 * Design tokens for the "Bento Glass" visual system.
 *
 * IMPORTANT: this file introduces zero new brand colors. Every value here is
 * either a structural constant (radius, spacing, shadow shape) or a derived
 * transparency of a color that already exists in ThemeContext's `colors`
 * object (background / surface / border / text / primary / accent).
 *
 * Usage: const tokens = useTokens();  ->  tokens.radius.card, tokens.glass.card, ...
 */
import { useTheme } from './ThemeContext';

// Corner radii used across the new component library.
export const radius = {
  pill: 999,
  interactive: 12, // pills, chips, small buttons
  card: 16, // original app card shape
  sheet: 18, // original app sheets
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
};

// Converts a #RRGGBB hex color + 0-1 alpha into #RRGGBBAA (RN supports 8-digit hex).
export function withAlpha(hex, alpha) {
  if (!hex || hex[0] !== '#') return hex;
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex.slice(0, 7)}${a}`;
}

/**
 * Builds the glass/gradient/shadow tokens for the current theme's colors.
 * `mode` is 'dark' | 'light' and `colors` come straight from useTheme().
 */
export function buildTokens(colors, mode) {
  const isDark = mode === 'dark';

  return {
    radius,
    spacing,
    // Glassmorphic surface recipe for cards. `overlay` sits on top of a
    // BlurView (or plain surface color as a fallback where blur isn't used).
    glass: {
      card: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.card,
      },
      cardElevated: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.card,
      },
      sheet: {
        backgroundColor: colors.surfaceElevated,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.sheet,
      },
      blurTint: isDark ? 'dark' : 'light',
      blurIntensity: isDark ? 40 : 60,
    },
    // Two-stop gradients derived from a base accent color, for progress
    // rings, streak badges, and FAB glows. Pass any theme color (usually
    // colors.primary or a habit/challenge's own color) as `hex`.
    gradient: (hex) => [hex, hex],
    glow: () => ({}),
    shadow: {
      soft: {
        shadowColor: '#000000',
        shadowOpacity: 0,
        shadowRadius: 0,
        shadowOffset: { width: 0, height: 0 },
        elevation: 0,
      },
    },
    hairline: colors.border,
  };
}

export function useTokens() {
  const { colors, mode } = useTheme();
  return buildTokens(colors, mode);
}
