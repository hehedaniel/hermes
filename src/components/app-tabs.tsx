import Feather from '@expo/vector-icons/Feather';
import { router, Tabs } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import {
  Pressable,
  type PressableStateCallbackType,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { IconoFeather } from '@/components/anden';
import { ThemedText } from '@/components/themed-text';
import { ANCHO_ESCRITORIO, ANCHO_TABLETA, Radii } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme, useThemePreference } from '@/hooks/use-theme';
import { haceCuanto, quedan } from '@/lib/format';
import { useMoodle } from '@/lib/store';

type Pestana = { name: string; titulo: string; icono: IconoFeather };

const PESTANAS: Pestana[] = [
  { name: 'index', titulo: 'Pendientes', icono: 'clipboard' },
  { name: 'novedades', titulo: 'Novedades', icono: 'bell' },
  { name: 'calendario', titulo: 'Calendario', icono: 'calendar' },
  { name: 'cursos', titulo: 'Asignaturas', icono: 'book-open' },
  { name: 'ajustes', titulo: 'Ajustes', icono: 'settings' },
];

/**
 * Navegación principal. La misma en móvil, tableta y web:
 *  - estrecho: barra inferior de 5 pestañas
 *  - tableta (≥ 768): rail de iconos a la izquierda
 *  - escritorio (≥ 1100): barra lateral con contadores y tu cuenta
 */
export default function AppTabs() {
  const { width } = useWindowDimensions();
  const lateral = width >= ANCHO_TABLETA;
  return (
    <Tabs
      tabBar={(props) => <BarraNavegacion {...props} />}
      screenOptions={{ headerShown: false, tabBarPosition: lateral ? 'left' : 'bottom' }}>
      {PESTANAS.map((p) => (
        <Tabs.Screen key={p.name} name={p.name} options={{ title: p.titulo }} />
      ))}
    </Tabs>
  );
}

function useContadores() {
  const { snapshot, noLeidas } = useMoodle();
  const now = useNow() / 1000;
  const abiertas = (snapshot?.entregas ?? []).filter(
    (e) => e.estado === 'pendiente' || e.estado === 'borrador' || e.estado === 'vencida',
  );
  return {
    index: abiertas.filter((e) =>
      e.estado === 'vencida' ? e.fecha > now - 30 * 86400 : !e.fecha || e.fecha - now < 7 * 86400,
    ).length,
    urgentes: abiertas.filter((e) => e.estado !== 'vencida' && e.fecha && e.fecha - now < 3 * 86400)
      .length,
    novedades: noLeidas,
  };
}

function BarraNavegacion({ state, navigation }: BottomTabBarProps) {
  const { width } = useWindowDimensions();
  const ir = (name: string, key: string, activa: boolean) => {
    const ev = navigation.emit({ type: 'tabPress', target: key, canPreventDefault: true });
    if (!activa && !ev.defaultPrevented) navigation.navigate(name);
  };
  const rutas = state.routes.map((r, i) => ({
    ...r,
    activa: state.index === i,
    info: PESTANAS.find((p) => p.name === r.name) ?? PESTANAS[0],
  }));
  if (width >= ANCHO_ESCRITORIO) return <Lateral rutas={rutas} ir={ir} />;
  if (width >= ANCHO_TABLETA) return <Rail rutas={rutas} ir={ir} />;
  return <Inferior rutas={rutas} ir={ir} />;
}

type Rutas = { key: string; name: string; activa: boolean; info: Pestana }[];
type Ir = (name: string, key: string, activa: boolean) => void;

function Inferior({ rutas, ir }: { rutas: Rutas; ir: Ir }) {
  const theme = useTheme();
  const { tema } = useThemePreference();
  const { width } = useWindowDimensions();
  const nocturnoMovil = width < ANCHO_TABLETA && tema === 'nocturno';
  const cuadernoMovil = width < ANCHO_TABLETA && tema === 'cuaderno';
  const { bottom } = useSafeAreaInsets();
  const cont = useContadores();
  return (
    <View
      style={[
        styles.inferior,
        cuadernoMovil && styles.cuadernoInferior,
        { backgroundColor: theme.paper, borderTopColor: theme.line, paddingBottom: 6 + bottom },
      ]}>
      {rutas.map((r) => {
        const titulo =
          nocturnoMovil && r.name === 'calendario'
            ? 'Horario'
            : nocturnoMovil && r.name === 'ajustes'
              ? 'Perfil'
              : r.info.titulo;
        const color = r.activa
          ? nocturnoMovil || cuadernoMovil
            ? theme.brand
            : theme.ink
          : theme.ink3;
        const globo =
          r.name === 'index' ? cont.urgentes : r.name === 'novedades' ? cont.novedades : 0;
        return (
          <Pressable
            key={r.key}
            onPress={() => ir(r.name, r.key, r.activa)}
            accessibilityRole="tab"
            accessibilityState={{ selected: r.activa }}
            accessibilityLabel={r.info.titulo}
            style={[styles.inferiorItem, cuadernoMovil && styles.cuadernoInferiorItem]}>
            <View
              style={[
                styles.indicador,
                { backgroundColor: r.activa ? theme.brand : 'transparent' },
              ]}
            />
            <View
              style={[
                cuadernoMovil && r.activa && styles.cuadernoActiveIcon,
                cuadernoMovil && r.activa && { backgroundColor: theme.brandWash },
              ]}>
              <Feather name={r.info.icono} size={21} color={color} />
              {globo ? (
                <View
                  style={[
                    styles.globo,
                    {
                      backgroundColor: r.name === 'index' ? theme.urgent : theme.brand,
                      borderColor: theme.paper,
                    },
                  ]}>
                  <ThemedText
                    style={[
                      styles.globoTexto,
                      { color: r.name === 'index' ? theme.surface : theme.brandInk },
                    ]}>
                    {globo > 9 ? '9+' : globo}
                  </ThemedText>
                </View>
              ) : null}
            </View>
            <ThemedText
              style={[
                styles.inferiorTexto,
                nocturnoMovil && styles.nocturnoInferiorTexto,
                { color, fontWeight: r.activa ? 600 : 500 },
              ]}
              numberOfLines={1}>
              {titulo}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

function Logo({ grande, nocturno }: { grande?: boolean; nocturno?: boolean }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.logo,
        grande && styles.logoGrande,
        { backgroundColor: nocturno ? theme.brand : theme.ink },
      ]}>
      <ThemedText
        style={[styles.logoTexto, { color: nocturno ? theme.brandInk : theme.paper }]}>
        H
      </ThemedText>
    </View>
  );
}

function Rail({ rutas, ir }: { rutas: Rutas; ir: Ir }) {
  const theme = useTheme();
  const { top } = useSafeAreaInsets();
  const principales = rutas.filter((r) => r.name !== 'ajustes');
  const ajustes = rutas.find((r) => r.name === 'ajustes');
  const boton = (r: Rutas[number]) => (
    <Pressable
      key={r.key}
      onPress={() => ir(r.name, r.key, r.activa)}
      accessibilityRole="tab"
      accessibilityState={{ selected: r.activa }}
      accessibilityLabel={r.info.titulo}
      style={[styles.railItem, r.activa && [styles.sombra1, { backgroundColor: theme.surface }]]}>
      <Feather name={r.info.icono} size={20} color={r.activa ? theme.ink : theme.ink3} />
    </Pressable>
  );
  return (
    <View
      style={[
        styles.rail,
        { backgroundColor: theme.paper2, borderRightColor: theme.line, paddingTop: 16 + top },
      ]}>
      <Logo />
      <View style={styles.railGrupo}>{principales.map(boton)}</View>
      <View style={styles.flex} />
      {ajustes ? boton(ajustes) : null}
    </View>
  );
}

function Lateral({ rutas, ir }: { rutas: Rutas; ir: Ir }) {
  const theme = useTheme();
  const { tema } = useThemePreference();
  const { snapshot } = useMoodle();
  const nowMs = useNow();
  const nocturnoWeb = Platform.OS === 'web' && tema === 'nocturno';
  const cont = useContadores();
  const principales = rutas.filter((r) => r.name !== 'ajustes');
  const ajustes = rutas.find((r) => r.name === 'ajustes');
  const nombre = snapshot?.site.fullname ?? 'Sin cuenta';
  const iniciales = nombre
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
  const proxima = (snapshot?.entregas ?? [])
    .filter((e) => e.estado !== 'entregada')
    .sort((a, b) => (a.fecha || Infinity) - (b.fecha || Infinity))[0];

  const item = (r: Rutas[number]) => {
    const n = r.name === 'index' ? cont.index : r.name === 'novedades' ? cont.novedades : 0;
    const titulo =
      nocturnoWeb && r.name === 'calendario'
        ? 'Horario'
        : nocturnoWeb && r.name === 'ajustes'
          ? 'Perfil'
          : r.info.titulo;
    return (
      <Pressable
        key={r.key}
        onPress={() => ir(r.name, r.key, r.activa)}
        accessibilityRole="tab"
        accessibilityLabel={titulo}
        accessibilityState={{ selected: r.activa }}
        style={(estado) => {
          // «hovered» solo existe en la web (ratón); en el móvil no viene
          const { hovered } = estado as PressableStateCallbackType & { hovered?: boolean };
          return [
            styles.lateralItem,
            r.activa && [styles.sombra1, { backgroundColor: theme.surface }],
              !r.activa && hovered && { backgroundColor: nocturnoWeb ? theme.surface : theme.paper },
          ];
        }}>
        <Feather name={r.info.icono} size={16} color={r.activa ? theme.ink : theme.ink2} />
        <ThemedText
          type="small"
          style={[styles.flex, { fontWeight: r.activa ? 600 : 500, fontSize: 14 }]}
          themeColor={r.activa ? 'ink' : 'ink2'}>
          {titulo}
        </ThemedText>
        {n ? (
          <ThemedText
            type="cifra"
            style={{ color: r.name === 'index' ? theme.urgent : theme.ink2 }}>
            {n}
          </ThemedText>
        ) : null}
      </Pressable>
    );
  };

  return (
    <View
      style={[
        styles.lateral,
        { backgroundColor: nocturnoWeb ? theme.paper : theme.paper2, borderRightColor: theme.line },
      ]}>
      <View style={styles.marca}>
        <Logo grande nocturno={nocturnoWeb} />
        <View>
          <ThemedText type="heading" style={{ fontSize: 15 }}>
            Hermes
          </ThemedText>
          <ThemedText type="label" themeColor="ink3" style={{ fontSize: 9 }}>
            FP IA y Big Data
          </ThemedText>
        </View>
      </View>
      <View style={styles.lateralGrupo}>{principales.map(item)}</View>
      <ThemedText type="label" themeColor="ink3" style={styles.lateralEtiqueta}>
        Preferencias
      </ThemedText>
      <View style={styles.lateralGrupo}>{ajustes ? item(ajustes) : null}</View>
      {nocturnoWeb && snapshot ? (
        <View style={styles.sidebarAcciones}>
          <Pressable
            disabled={!proxima}
            accessibilityRole="button"
            accessibilityLabel={proxima ? `Abrir ${proxima.nombre}` : 'No hay próximas entregas'}
            onPress={() =>
              proxima &&
              router.push({ pathname: '/tarea/[key]', params: { key: proxima.key } })
            }
            style={[
              styles.proxima,
              { backgroundColor: theme.surface, borderColor: theme.line },
            ]}>
            <ThemedText type="label" themeColor="ink2">
              PRÓXIMA ENTREGA
            </ThemedText>
            <ThemedText type="smallBold" numberOfLines={2} style={styles.proximaTitulo}>
              {proxima?.nombre ?? 'No hay entregas pendientes'}
            </ThemedText>
            {proxima?.fecha ? (
              <ThemedText type="meta" style={{ color: theme.stDraft }}>
                {quedan(proxima.fecha, nowMs)}
              </ThemedText>
            ) : null}
          </Pressable>
          <Pressable
            disabled={!proxima}
            onPress={() =>
              proxima &&
              router.push({ pathname: '/ia/[key]', params: { key: proxima.key } })
            }
            style={[
              styles.preguntar,
              { backgroundColor: theme.brandWash, borderColor: theme.line2 },
              !proxima && styles.deshabilitado,
            ]}>
            <Feather name="star" size={14} color={theme.brand} />
            <ThemedText type="smallBold" style={{ color: theme.brand }}>
              Preguntar a Hermes
            </ThemedText>
          </Pressable>
        </View>
      ) : null}
      <View style={styles.flex} />
      <View style={[styles.usuario, { borderTopColor: theme.line }]}>
        <View style={[styles.avatar, { backgroundColor: theme.brandWash }]}>
          <ThemedText type="smallBold" style={{ color: theme.brand, fontSize: 12 }}>
            {iniciales || 'H'}
          </ThemedText>
        </View>
        <View style={styles.flex}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {nombre}
          </ThemedText>
          <ThemedText type="meta" themeColor="ink3">
            {snapshot ? `Sincronizado ${haceCuanto(snapshot.syncedAt)}` : 'Conecta tu Moodle'}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  sombra1: {
    shadowColor: '#15181A',
    shadowOpacity: 0.07,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  inferior: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 0 },
  cuadernoInferior: { minHeight: 62, paddingTop: 5 },
  inferiorItem: { flex: 1, alignItems: 'center', gap: 3, paddingTop: 0, minHeight: 52 },
  cuadernoInferiorItem: { minHeight: 56, gap: 2 },
  cuadernoActiveIcon: {
    width: 36,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicador: { width: 18, height: 2.5, borderRadius: 2, marginBottom: 6 },
  inferiorTexto: { fontSize: 10.5, lineHeight: 13 },
  nocturnoInferiorTexto: { fontSize: 9.5 },
  globo: {
    position: 'absolute',
    top: -5,
    right: -9,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  globoTexto: { fontSize: 9, lineHeight: 11, fontWeight: 700 },
  logo: { width: 28, height: 28, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  logoGrande: { width: 30, height: 30 },
  logoTexto: { fontSize: 14, lineHeight: 18, fontWeight: 700 },
  rail: {
    width: 72,
    alignItems: 'center',
    gap: 20,
    paddingBottom: 20,
    borderRightWidth: 1,
  },
  railGrupo: { gap: 8, alignItems: 'center' },
  railItem: {
    width: 44,
    height: 44,
    borderRadius: Radii.superficie,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lateral: { width: 240, paddingHorizontal: 12, paddingTop: 20, borderRightWidth: 1 },
  marca: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
    marginBottom: 20,
  },
  lateralGrupo: { gap: 2 },
  sidebarAcciones: { gap: 8, marginTop: 'auto' },
  proxima: { gap: 5, borderWidth: 1, borderRadius: Radii.superficie, padding: 12 },
  proximaTitulo: { lineHeight: 19 },
  preguntar: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: Radii.control,
    paddingHorizontal: 8,
  },
  deshabilitado: { opacity: 0.5 },
  lateralItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 40,
    paddingHorizontal: 10,
    borderRadius: Radii.control,
  },
  lateralEtiqueta: { fontSize: 9, paddingHorizontal: 10, marginTop: 22, marginBottom: 8 },
  usuario: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
