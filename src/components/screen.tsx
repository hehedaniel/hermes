import Feather from '@expo/vector-icons/Feather';
import type { ReactNode } from 'react';
import {
  RefreshControl,
  ScrollView,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Cabecera, Seccion } from '@/components/anden';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MARGEN, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
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
  maxWidth = MaxContentWidth,
  contentStyle,
}: Props) {
  const { snapshot, syncing, error, refresh, client } = useMoodle();
  const theme = useTheme();
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
          contentContainerStyle={[styles.content, { maxWidth }, contentStyle]}
          keyboardShouldPersistTaps="handled"
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
          {title ? (
            <Cabecera
              etiqueta={etiqueta}
              titulo={title}
              derecha={derecha ?? sync}
              derechaColor={derecha ? derechaColor : error ? theme.urgent : undefined}
            />
          ) : (
            <View style={{ height: Spacing.two }} />
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
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
});
