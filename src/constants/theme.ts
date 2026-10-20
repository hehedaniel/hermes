/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://unistyl.es/), etc.
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
    border: '#E0E1E6',
    accent: '#1F6FEB',
    onAccent: '#ffffff',
    entregada: '#1A7F37',
    pendiente: '#1F6FEB',
    borrador: '#9A6700',
    vencida: '#CF222E',
    urgente: '#BC4C00',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
    border: '#2E3135',
    accent: '#4C9AFF',
    onAccent: '#0B1220',
    entregada: '#3FB950',
    pendiente: '#58A6FF',
    borrador: '#D29922',
    vencida: '#F85149',
    urgente: '#F0883E',
  },
} as const;

/** Paleta para distinguir asignaturas de un vistazo (se asigna por orden de id, sin repetir). */
export const COURSE_PALETTE = [
  '#1F6FEB',
  '#8250DF',
  '#1A7F37',
  '#BF3989',
  '#BC4C00',
  '#0E8A82',
  '#9A6700',
  '#6E7781',
];

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
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

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
