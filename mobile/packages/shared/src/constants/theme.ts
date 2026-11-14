export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const MaxContentWidth = 800;

export const COLORS = {
  primary: '#5c85d9',       // Primary brand color
  secondary: '#eef3fb',     // Light tint of #5c85d9 for badges and highlights
  tertiary: '#fef08a',      // Soft yellow for notes & warnings
  primaryLight: '#eef3fb',  // Light tint of primary for badges
  badge: '#eef3fb',         // Light color based on #5c85d9 for badges
  badgeText: '#3b66c4',     // Harmonious primary text for badges
  text: '#334155',          // Slate text (Slate-700 / Slate-800)
  textMuted: '#64748b',     // Slate muted text (Slate-500)
  background: '#F8F9FA',    // Off-white for app background
  surface: '#FFFFFF',       // Clean white for cards & elevated surfaces
  error: '#EF4444',         // Red alert color
  danger: '#EF4444',        // Red alert color
  alert: '#EF4444',         // Red alert
  warning: '#EAB308',       // Yellow for notes / warnings
  notes: '#FEF9C3',         // Light yellow background for notes
  notesText: '#854D0E',     // Amber/yellow text for notes
  success: '#86EFAC',       // Light green for success
  successBg: '#DCFCE7',     // Soft light green background
  successText: '#166534',   // Dark green text for success
  completeBtnBg: '#5c85d9', // Unified with primary
  completeBtnBorder: '#5c85d9',
  completeBtnText: '#FFFFFF',
  white: '#FFFFFF',
  black: '#1E293B',
  gray: '#64748b',          // Slate-500
  lightGray: '#E2E8F0',     // Slate-200 border / divider
} as const;

export const SIZES = {
  base: 8,
  small: 12,
  font: 14,
  medium: 16,
  large: 18,
  extraLarge: 24,
  padding: 16,
  radius: 16,
  cardRadius: 24,
} as const;

export const SHADOWS = {
  light: {
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  medium: {
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 5,
  },
} as const;
