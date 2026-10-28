/**
 * Piezas básicas del diseño «Andén» que se repiten en todas las pantallas:
 * cabecera, resumen de cifras, cabecera de sección numerada, chip de estado, fila con raíl
 * de color e icono de tipo de archivo.
 */
import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps, ReactNode } from 'react';
import {
  Platform,
  Pressable,
  type StyleProp,
  StyleSheet,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ANCHO_ESCRITORIO, Radii, Spacing } from '@/constants/theme';
import { useTheme, useThemePreference } from '@/hooks/use-theme';
import type { Estado } from '@/lib/data';

export type IconoFeather = ComponentProps<typeof Feather>['name'];

/** El destello de la IA (no está en Feather). */
export function IconoIA({ size = 18, color }: { size?: number; color: string }) {
  return <MaterialCommunityIcons name="star-four-points-outline" size={size} color={color} />;
}

/** Cabecera de pantalla: etiqueta pequeña encima, título grande y un dato a la derecha. */
export function Cabecera({
  etiqueta,
  titulo,
  derecha,
  derechaColor,
}: {
  etiqueta?: string;
  titulo: string;
  derecha?: string;
  derechaColor?: string;
}) {
  const theme = useTheme();
  const { tema } = useThemePreference();
  return (
    <View style={[styles.cabecera, tema === 'cuaderno' && styles.cuadernoCabecera]}>
      {etiqueta ? (
        <ThemedText type="label" themeColor="ink2">
          {etiqueta}
        </ThemedText>
      ) : null}
      <View style={styles.cabeceraFila}>
        <ThemedText
          type="display"
          style={[styles.flex, tema === 'cuaderno' && styles.cuadernoTitulo]}
          numberOfLines={2}>
          {titulo}
        </ThemedText>
        {derecha ? (
          <ThemedText type="meta" style={{ color: derechaColor ?? theme.ink3 }}>
            {derecha}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

/** Franja de cifras bajo el título: «5 ENTREGAS | 1 VENCIDA | 1 URGENTE». */
export function Cifras({ items }: { items: { n: number | string; texto: string; alerta?: boolean }[] }) {
  const theme = useTheme();
  return (
    <View style={[styles.cifras, { borderColor: theme.line }]}>
      {items.map((it, i) => (
        <View
          key={it.texto}
          style={[
            styles.cifra,
            i > 0 && { borderLeftWidth: StyleSheet.hairlineWidth * 2, borderLeftColor: theme.line },
          ]}>
          <ThemedText
            style={[styles.cifraN, { color: it.alerta ? theme.urgent : theme.ink }]}>
            {it.n}
          </ThemedText>
          <ThemedText type="label" style={styles.cifraTexto} themeColor="ink2" numberOfLines={1}>
            {it.texto}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

/** Cabecera de sección: número, nombre en versalitas, dato a la derecha y una regla debajo. */
export function Seccion({
  numero,
  titulo,
  derecha,
  derechaColor,
  sinRegla,
  style,
  onPress,
  expanded,
}: {
  numero?: number;
  titulo: string;
  derecha?: string;
  derechaColor?: string;
  /** Sin la regla de debajo (cuando lo que sigue ya trae sus propias reglas o es una caja) */
  sinRegla?: boolean;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  expanded?: boolean;
}) {
  const theme = useTheme();
  const contenido = (
    <>
      {numero !== undefined ? (
        <ThemedText type="cifra" themeColor="ink3" style={styles.seccionNum}>
          {String(numero).padStart(2, '0')}
        </ThemedText>
      ) : null}
      <ThemedText type="label" style={[styles.flex, { letterSpacing: 1.4 }]}>
        {titulo}
      </ThemedText>
      {derecha ? (
        <ThemedText type="meta" style={{ color: derechaColor ?? theme.ink3 }}>
          {derecha}
        </ThemedText>
      ) : null}
      {onPress ? (
        <Feather
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={theme.ink2}
        />
      ) : null}
    </>
  );
  const base = [
    styles.seccion,
    { borderBottomColor: theme.line },
    sinRegla && { borderBottomWidth: 0, paddingBottom: 4 },
    style,
  ];
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ expanded: !!expanded }}
        style={({ pressed }) => [...base, pressed && { opacity: 0.7 }]}>
        {contenido}
      </Pressable>
    );
  }
  return (
    <View
      style={base}>
      {contenido}
    </View>
  );
}

const ESTADO: Record<Estado, { texto: string; icono: IconoFeather }> = {
  pendiente: { texto: 'Pendiente', icono: 'circle' },
  borrador: { texto: 'Borrador', icono: 'edit-2' },
  entregada: { texto: 'Entregada', icono: 'check' },
  vencida: { texto: 'Vencida', icono: 'alert-triangle' },
};

/** Chip de estado: color + icono + palabra (nunca solo color). */
export function EstadoChip({ estado }: { estado: Estado }) {
  const theme = useTheme();
  const c = {
    pendiente: [theme.stPend, theme.stPendW],
    borrador: [theme.stDraft, 'transparent'],
    entregada: [theme.stDone, theme.stDoneW],
    vencida: [theme.stLate, theme.stLateW],
  }[estado];
  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: c[1] },
        estado === 'borrador' && { borderWidth: 1, borderColor: theme.line2 },
      ]}>
      <Feather
        name={ESTADO[estado].icono}
        size={10}
        color={c[0]}
        style={estado === 'pendiente' ? { opacity: 0.9 } : undefined}
      />
      <ThemedText type="label" style={[styles.chipTexto, { color: c[0] }]}>
        {ESTADO[estado].texto}
      </ThemedText>
    </View>
  );
}

/** Etiqueta pequeña con fondo (APUNTE NUEVO, CAMBIO DE FECHA, AHORA…). */
export function Marca({
  texto,
  color,
  fondo,
  borde,
}: {
  texto: string;
  color?: string;
  fondo?: string;
  borde?: boolean;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: fondo ?? 'transparent' },
        borde && { borderWidth: 1, borderColor: theme.line2 },
      ]}>
      <ThemedText type="label" style={[styles.chipTexto, { color: color ?? theme.ink2 }]}>
        {texto}
      </ThemedText>
    </View>
  );
}

/**
 * Fila del tablón: raíl de color de la asignatura a la izquierda y regla debajo.
 * Si se pasa onPress, se puede tocar.
 */
export function FilaRail({
  color,
  children,
  onPress,
  apagada,
  seleccionada,
  style,
}: {
  color: string;
  children: ReactNode;
  onPress?: () => void;
  apagada?: boolean;
  seleccionada?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const { tema } = useThemePreference();
  const { width } = useWindowDimensions();
  const nocturnoWeb = Platform.OS === 'web' && width >= ANCHO_ESCRITORIO && tema === 'nocturno';
  const nocturnoMovil = width < ANCHO_ESCRITORIO && tema === 'nocturno';
  const nocturno = nocturnoWeb || nocturnoMovil;
  const contenido = (
    <>
      <View
        style={[
          styles.rail,
          tema === 'cuaderno' && styles.cuadernoRail,
          nocturno && styles.nocturnoRail,
          { backgroundColor: color, opacity: apagada ? 0.55 : 1 },
        ]}
      />
      <View style={[styles.filaCuerpo, nocturno && styles.nocturnoFilaCuerpo]}>
        {children}
      </View>
    </>
  );
  const base = [
    styles.fila,
    nocturno && [
      styles.nocturnoFila,
      {
        backgroundColor: seleccionada ? theme.surface2 : theme.surface,
        borderColor: theme.line,
      },
    ],
    tema === 'cuaderno' && [
      styles.cuadernoFila,
      {
        backgroundColor: seleccionada ? theme.brandWash : theme.surface,
        borderColor: theme.line,
        borderLeftColor: color,
      },
    ],
    { borderBottomColor: theme.line },
    seleccionada && { backgroundColor: theme.surface },
    style,
  ];
  if (!onPress) return <View style={base}>{contenido}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        ...base,
        pressed && { backgroundColor: nocturno ? theme.surface2 : theme.paper2 },
      ]}>
      {contenido}
    </Pressable>
  );
}

/** Cuadrado con la extensión del archivo (PDF, ZIP, DOCX…). */
export function TipoArchivo({ ext }: { ext: string }) {
  const theme = useTheme();
  const pdf = ext === 'pdf';
  return (
    <View
      style={[
        styles.tipo,
        {
          borderColor: theme.line2,
          backgroundColor: pdf ? theme.urgentWash : theme.surface,
        },
      ]}>
      <ThemedText style={[styles.tipoTexto, { color: pdf ? theme.urgent : theme.ink2 }]}>
        {(ext || '?').slice(0, 4).toUpperCase()}
      </ThemedText>
    </View>
  );
}

/** Barra de progreso fina (descargas). */
export function Progreso({ valor, ancho }: { valor: number; ancho?: boolean }) {
  const theme = useTheme();
  return (
    <View style={[styles.progreso, { backgroundColor: theme.line }, ancho && { width: '100%' }]}>
      <View
        style={[
          styles.progresoLleno,
          { backgroundColor: theme.brand, width: `${Math.round(Math.min(1, valor) * 100)}%` },
        ]}
      />
    </View>
  );
}

/** Caja de texto de apoyo sobre papel 2 (enunciados, comentarios). */
export function Caja({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const { tema } = useThemePreference();
  return (
    <View
      style={[
        styles.caja,
        {
          backgroundColor: tema === 'cuaderno' ? theme.surface : theme.paper2,
          borderColor: theme.line,
        },
        tema === 'cuaderno' && styles.cuadernoCaja,
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  cabecera: { gap: 2, paddingTop: Spacing.three, paddingBottom: Spacing.three },
  cuadernoCabecera: { paddingTop: 4, paddingBottom: 8 },
  cuadernoTitulo: { fontSize: 26, lineHeight: 32, letterSpacing: -0.8 },
  cabeceraFila: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.three },
  cifras: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: Spacing.two,
  },
  cifra: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
    paddingVertical: 10,
    paddingLeft: 10,
  },
  cifraN: { fontSize: 16, lineHeight: 20, fontWeight: 700, fontVariant: ['tabular-nums'] },
  cifraTexto: { fontSize: 9.5, letterSpacing: 0.9 },
  seccion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: Spacing.four,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  seccionNum: { fontSize: 11, minWidth: 16 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.chip,
  },
  chipTexto: { fontSize: 10, lineHeight: 13, letterSpacing: 0.9 },
  fila: {
    flexDirection: 'row',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  nocturnoFila: {
    minHeight: 72,
    paddingVertical: 0,
    paddingRight: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderBottomWidth: 1,
    borderRadius: Radii.superficie,
    overflow: 'hidden',
  },
  cuadernoFila: {
    minHeight: 76,
    marginVertical: 4,
    paddingVertical: 10,
    paddingRight: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderRadius: 13,
  },
  rail: { width: 3, borderRadius: 2, marginRight: 12 },
  cuadernoRail: { width: 0, marginRight: 0 },
  nocturnoRail: { width: 3, borderRadius: 0, marginRight: 12 },
  filaCuerpo: { flex: 1, gap: 4 },
  nocturnoFilaCuerpo: { paddingVertical: 12 },
  tipo: {
    width: 32,
    height: 34,
    borderRadius: Radii.chip,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipoTexto: { fontSize: 8.5, lineHeight: 11, fontWeight: 700, letterSpacing: 0.4 },
  progreso: { height: 3, borderRadius: 2, overflow: 'hidden', width: 76 },
  progresoLleno: { height: 3, borderRadius: 2 },
  caja: { borderRadius: Radii.control, borderWidth: 1, padding: 12, gap: 6 },
  cuadernoCaja: { borderRadius: 14, padding: 14 },
});
