import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { haceCuanto } from '@/lib/format';
import { useMoodle } from '@/lib/store';

/** Contenedor común: título grande, estado de sincronización y "tirar para actualizar". */
type Props = {
  /** Título grande (pantallas de pestaña). Sin título = pantalla con cabecera nativa (detalle). */
  title?: string;
  children: ReactNode;
  refreshable?: boolean;
  /** Acción al tirar para actualizar (por defecto, sincronizar con Moodle). */
  onRefresh?: () => void;
  refreshing?: boolean;
};

export function Screen({ title, children, refreshable = true, onRefresh, refreshing }: Props) {
  const { snapshot, syncing, error, refresh, client } = useMoodle();
  const theme = useTheme();

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={title ? ['top'] : []}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            refreshable && client ? (
              <RefreshControl
                refreshing={refreshing ?? syncing}
                onRefresh={onRefresh ?? refresh}
                colors={[theme.accent]}
                tintColor={theme.accent}
              />
            ) : undefined
          }>
          {title ? (
            <View style={styles.header}>
              <ThemedText style={styles.title}>{title}</ThemedText>
              {client ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {syncing
                    ? 'Sincronizando…'
                    : snapshot
                      ? `Actualizado ${haceCuanto(snapshot.syncedAt)}`
                      : 'Sin datos todavía'}
                </ThemedText>
              ) : null}
            </View>
          ) : (
            <View style={{ height: Spacing.two }} />
          )}
          {error && title ? (
            <View style={[styles.banner, { borderColor: theme.vencida }]}>
              <ThemedText type="small" style={{ color: theme.vencida }}>
                {error}
              </ThemedText>
            </View>
          ) : null}
          {children}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <ThemedText type="smallBold" themeColor="textSecondary" style={styles.section}>
      {children}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  header: { paddingTop: Spacing.three, paddingBottom: Spacing.two, gap: 2 },
  title: { fontSize: 32, lineHeight: 40, fontWeight: 700 },
  banner: { borderWidth: 1, borderRadius: 12, padding: Spacing.three - 4 },
  section: {
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontSize: 12,
    marginTop: Spacing.three,
  },
});
