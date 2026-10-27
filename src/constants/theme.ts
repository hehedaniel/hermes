/**
 * Sistema de diseño «Andén»: colores (colors.ts), tipografía, espacios y radios.
 */
import { Platform } from 'react-native';

import { Colors } from './colors';

export { Colors, COURSE_PALETTE, TEMAS } from './colors';
export type { ColoresTema, Paleta } from './colors';

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** Space Grotesk: una sola familia para todo. Cada peso es su propio archivo de fuente. */
export const FAMILIA = {
  400: 'SpaceGrotesk_400Regular',
  500: 'SpaceGrotesk_500Medium',
  600: 'SpaceGrotesk_600SemiBold',
  700: 'SpaceGrotesk_700Bold',
} as const;

/** Familia para un peso (los pesos sin archivo propio van al más cercano). */
export function familia(peso?: string | number) {
  const n = Number(peso === 'bold' ? 700 : peso === 'normal' || peso == null ? 400 : peso);
  if (n >= 700) return FAMILIA[700];
  if (n >= 600) return FAMILIA[600];
  if (n >= 500) return FAMILIA[500];
  return FAMILIA[400];
}

export const Fonts = Platform.select({
  ios: { sans: FAMILIA[400], mono: 'ui-monospace' },
  web: { sans: FAMILIA[400], mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' },
  default: { sans: FAMILIA[400], mono: 'monospace' },
});

/** Ritmo de 4 px. */
export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/** Márgenes laterales del móvil. */
export const MARGEN = 20;

export const Radii = { chip: 4, control: 8, superficie: 12, hoja: 20, pastilla: 999 } as const;
export const TEMA_PREFERENCIA_KEY = 'hermes.tema';
export const MODO_COLOR_PREFERENCIA_KEY = 'hermes.modo-color';

/** Ancho a partir del cual hay rail lateral (tableta) y barra lateral completa (escritorio). */
export const ANCHO_TABLETA = 768;
export const ANCHO_ESCRITORIO = 1100;
/** Ancho de la navegación según la ventana: nada (barra abajo), raíl de 72 o barra de 240. */
export const anchoNavegacion = (w: number) =>
  w >= ANCHO_ESCRITORIO ? 240 : w >= ANCHO_TABLETA ? 72 : 0;

export const BottomTabInset = 0;
export const MaxContentWidth = 760;
