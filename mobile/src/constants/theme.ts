import '@/global.css';
import { Platform } from 'react-native';

export * from '@aurasutra/doctor-shared/constants/theme';

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const FONTS = {
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semiBold: 'DMSans_700Bold',
  serif: 'DMSans_700Bold',
  bold: 'DMSans_700Bold',
};

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
