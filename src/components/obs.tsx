/**
 * Piezas del diseño «Obsidiana» (Stitch). Los valores salen tal cual del HTML del diseño:
 * medidas en px, colores hex y familias tipográficas. El tema solo existe en oscuro.
 */
import { type ReactNode } from 'react';
import { Text, type TextProps, type TextStyle, useWindowDimensions, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ANCHO_ESCRITORIO, FAMILIA_OBSIDIANA } from '@/constants/theme';

export const O = {
  bg: '#0A0A0C',
  side: '#0C0C0E',
  card: '#111114',
  card2: '#15151A',
  line: '#1D1D22',
  line2: '#26262E',
  white: '#FFFFFF',
  text: '#E2E2E8',
  t2: '#9393A2',
  t3: '#6B6B77',
  t4: '#555560',
  lime: '#D6FF38',
  limeWash: '#1B2311',
  limeLine: '#43561B',
  amber: '#F59E0B',
  amberWash: '#201D14',
  amberLine: '#443818',
  pendWash: '#161619',
  pendLine: '#2B2B33',
  green: '#34D399',
  red: '#F87171',
} as const;

/** Móvil (< 1100 px) o escritorio: el diseño Obsidiana tiene dos composiciones. */
export function useMovil() {
  const { width } = useWindowDimensions();
  return width < ANCHO_ESCRITORIO;
}

/** Margen lateral de las pantallas según el ancho. */
export function usePadX(escritorio = 40) {
  const { width } = useWindowDimensions();
  return width < 500 ? 20 : width < ANCHO_ESCRITORIO ? 28 : escritorio;
}

/** Hueco de la barra de estado en móvil (en escritorio no hay). */
export function useArriba() {
  const { top } = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  return width < ANCHO_ESCRITORIO ? top : 0;
}

type Familia = 'serif' | 'sans' | 'mono';

type TProps = TextProps & {
  /** Familia: serif (Newsreader), sans (Inter) o mono (JetBrains Mono) */
  k?: Familia;
  /** Peso */
  w?: 300 | 400 | 500 | 600 | 700;
  /** Tamaño en px */
  s?: number;
  c?: string;
  /** Interlineado en px */
  lh?: number;
  /** Tracking en em (0.2 = tracking-[0.2em]) */
  ls?: number;
  up?: boolean;
  children?: ReactNode;
};

function familia(k: Familia, w: number) {
  if (k === 'serif') return w >= 500 ? FAMILIA_OBSIDIANA.serif[500] : FAMILIA_OBSIDIANA.serif[400];
  if (k === 'mono') {
    return w >= 600
      ? FAMILIA_OBSIDIANA.mono[600]
      : w >= 500
        ? FAMILIA_OBSIDIANA.mono[500]
        : FAMILIA_OBSIDIANA.mono[400];
  }
  if (w >= 700) return FAMILIA_OBSIDIANA.sans[700];
  if (w >= 600) return FAMILIA_OBSIDIANA.sans[600];
  if (w >= 500) return FAMILIA_OBSIDIANA.sans[500];
  if (w <= 300) return FAMILIA_OBSIDIANA.sans[300];
  return FAMILIA_OBSIDIANA.sans[400];
}

/** Texto con las medidas del diseño. */
export function T({ k = 'sans', w = 400, s = 13, c = O.text, lh, ls, up, style, ...rest }: TProps) {
  const estilo: TextStyle = {
    fontFamily: familia(k, w),
    fontSize: s,
    color: c,
    ...(lh ? { lineHeight: lh } : null),
    ...(ls ? { letterSpacing: ls * s } : null),
    ...(up ? { textTransform: 'uppercase' } : null),
  };
  return <Text {...rest} style={[estilo, style]} />;
}

/** Etiqueta mono en mayúsculas («POR ENTREGAR», «AHORA MISMO»…). */
export function Etiqueta({
  s = 10,
  c = O.t3,
  ls = 0.2,
  w = 600,
  ...rest
}: Omit<TProps, 'k' | 'up'>) {
  return <T k="mono" up s={s} c={c} ls={ls} w={w} {...rest} />;
}

export function Punto({ color, size = 6, style }: { color: string; size?: number; style?: ViewStyle }) {
  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style]} />
  );
}

/** Tarjeta con borde de 1 px. */
export function Tarjeta({
  radius = 12,
  bg = O.card,
  borde = O.line,
  style,
  children,
}: {
  radius?: number;
  bg?: string;
  borde?: string;
  style?: ViewStyle | ViewStyle[];
  children?: ReactNode;
}) {
  return (
    <View
      style={[
        { backgroundColor: bg, borderColor: borde, borderWidth: 1, borderRadius: radius },
        style as ViewStyle,
      ]}>
      {children}
    </View>
  );
}

/** Texto de fecha del diseño: «Miércoles, 28 de octubre» */
export function fechaEditorial(d: Date) {
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const meses = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ];
  return `${dias[d.getDay()]}, ${d.getDate()} de ${meses[d.getMonth()]}`;
}
