import Feather from '@expo/vector-icons/Feather';
import type { ReactNode } from 'react';
import {
  RefreshControl,
  ScrollView,
  Platform,
  type StyleProp,
  StyleSheet,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Cabecera, Seccion } from '@/components/anden';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  ANCHO_ESCRITORIO,
  MARGEN,
  MaxContentWidth,
  Spacing,
} from '@/constants/theme';
import { useTheme, useThemePreference } from '@/hooks/use-theme';
import { haceCuanto } from '@/lib/format';
import { useMoodle } from '@/lib/store';

/** Contenedor común: cabecera grande, estado de sincronización y "tirar para actualizar". */
type Props = {
  /** Título grande (pantallas de pestaña). Sin título = pantalla con cabecera nativa (detalle). */
  title?: string;
  /** Etiqueta pequeña sobre el título («FP IA Y BIG DATA · 2.º CURSO») */
  etiqueta?: string;
  /** Dato a la derecha del título; por defecto, cuándo se sincronizó */
  derecha?: string;
  derechaColor?: string;
  children: ReactNode;
  refreshable?: boolean;
  /** Acción al tirar para actualizar (por defecto, sincronizar con Moodle). */
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Ancho máximo del contenido (por defecto, el de lectura) */
  maxWidth?: number;
  contentStyle?: StyleProp<ViewStyle>;
  showVerticalScrollIndicator?: boolean;
  sinEspacioInicial?: boolean;
};

export function Screen({
  title,
  etiqueta,
  derecha,
  derechaColor,
  children,
  refreshable = true,
  onRefresh,
  refreshing,
  maxWidth,
  contentStyle,
  showVerticalScrollIndicator = true,
  sinEspacioInicial = false,
}: Props) {
  const { snapshot, syncing, error, refresh, client } = useMoodle();
  const theme = useTheme();
  const { tema } = useThemePreference();
  const { width } = useWindowDimensions();
  const nocturnoWeb = Platform.OS === 'web' && width >= ANCHO_ESCRITORIO && tema === 'nocturno';
  const nocturnoMovil = width < ANCHO_ESCRITORIO && tema === 'nocturno';
  const nocturno = nocturnoWeb || nocturnoMovil;
  const cuadernoMovil = width < ANCHO_ESCRITORIO && tema === 'cuaderno';
  const cuaderno = tema === 'cuaderno';
  const contentWidth = maxWidth ?? (nocturnoWeb || (cuaderno && width >= ANCHO_ESCRITORIO) ? 960 : MaxContentWidth);
  const sync = !client
    ? undefined
    : syncing
      ? 'sincronizando…'
      : error
        ? 'sin conexión'
        : snapshot
          ? `sync ${haceCuanto(snapshot.syncedAt).replace(/^hace /, '')}`
          : undefined;

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={title ? ['top'] : []}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            nocturno && styles.nocturnoContent,
            nocturnoMovil && styles.nocturnoMobileContent,
            cuadernoMovil && styles.cuadernoMobileContent,
            cuaderno && styles.cuadernoContent,
            { maxWidth: contentWidth },
            contentStyle,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={showVerticalScrollIndicator}
          refreshControl={
            refreshable && client ? (
              <RefreshControl
                refreshing={refreshing ?? syncing}
                onRefresh={onRefresh ?? refresh}
                colors={[theme.brand]}
                tintColor={theme.brand}
              />
            ) : undefined
          }>
          {title && cuadernoMovil ? (
            <View style={styles.cuadernoMarca}>
              <View style={styles.cuadernoMarcaTexto}>
                <ThemedText style={styles.cuadernoWordmark}>
                  Hermes
                  <ThemedText style={{ color: theme.brand }}>.</ThemedText>
                </ThemedText>
                <ThemedText type="meta" themeColor="ink2">
                  {new Intl.DateTimeFormat('es-ES', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  }).format(new Date())}
                </ThemedText>
              </View>
              <View style={[styles.cuadernoAvatar, { backgroundColor: theme.brandWash }]}>
                <ThemedText type="smallBold" style={{ color: theme.brand }}>
                  {(snapshot?.site.fullname ?? 'H').trim().slice(0, 1).toUpperCase()}
                </ThemedText>
              </View>
            </View>
          ) : null}
          {title && nocturno ? (
            <View style={styles.nocturnoHeading}>
              {etiqueta ? (
                <ThemedText type="meta" themeColor="ink2">
                  {etiqueta}
                </ThemedText>
              ) : null}
              <View style={styles.nocturnoHeadingLine}>
                <ThemedText type="display" style={styles.nocturnoTitle} numberOfLines={2}>
                  {title}
                </ThemedText>
                {derecha ?? sync ? (
                  <ThemedText
                    type="meta"
                    style={{ color: derecha ? derechaColor ?? theme.ink3 : error ? theme.urgent : theme.ink3 }}>
                    {derecha ?? sync}
                  </ThemedText>
                ) : null}
              </View>
            </View>
          ) : title ? (
            <Cabecera
              etiqueta={etiqueta}
              titulo={title}
              derecha={derecha ?? sync}
              derechaColor={derecha ? derechaColor : error ? theme.urgent : undefined}
            />
          ) : (
            !sinEspacioInicial && <View style={{ height: Spacing.two }} />
          )}
          {error && title ? (
            <View style={[styles.banner, { backgroundColor: theme.urgentWash }]}>
              <Feather name="wifi-off" size={14} color={theme.urgent} />
              <ThemedText type="small" style={[styles.flex, { color: theme.urgent }]}>
                {snapshot ? `${error} Mostrando lo guardado.` : error}
              </ThemedText>
            </View>
          ) : null}
          {children}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

/** Título de sección (versión sencilla de Seccion, sin número). */
export function SectionTitle({ children, derecha }: { children: ReactNode; derecha?: string }) {
  return <Seccion titulo={String(children)} derecha={derecha} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    paddingHorizontal: MARGEN,
    paddingBottom: Spacing.five,
    gap: Spacing.two,
    width: '100%',
    alignSelf: 'center',
  },
  nocturnoContent: { paddingTop: 24, gap: Spacing.three },
  nocturnoMobileContent: { paddingTop: Spacing.two, paddingBottom: 92, gap: Spacing.three },
  cuadernoContent: { gap: Spacing.three },
  cuadernoMobileContent: { paddingTop: 16, paddingBottom: 96, gap: 12 },
  cuadernoMarca: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cuadernoMarcaTexto: { gap: 1 },
  cuadernoWordmark: { fontSize: 22, lineHeight: 26, fontWeight: 700, letterSpacing: -0.8 },
  cuadernoAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nocturnoHeading: { gap: 3, marginBottom: 8 },
  nocturnoHeadingLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  nocturnoTitle: { fontSize: 28, lineHeight: 34, flex: 1 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
});
