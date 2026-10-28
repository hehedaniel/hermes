import Feather from '@expo/vector-icons/Feather';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { PanelTarea, TareaDetalle } from '@/components/tarea-detalle';
import { TareaObsidiana } from '@/components/tarea-obsidiana';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Vacio } from '@/components/vacio';
import { ANCHO_ESCRITORIO, MARGEN } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme, useThemePreference } from '@/hooks/use-theme';
import { useAsignaturas, useMoodle } from '@/lib/store';

export default function TareaScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const { snapshot } = useMoodle();
  const nowMs = useNow();
  const theme = useTheme();
  const { tema } = useThemePreference();
  const { width } = useWindowDimensions();
  const cuadernoMovil = width < ANCHO_ESCRITORIO && tema === 'cuaderno';
  const nocturnoWeb =
    Platform.OS === 'web' &&
    width >= ANCHO_ESCRITORIO &&
    (tema === 'nocturno' || tema === 'cuaderno');
  const nocturnoMovil =
    width < ANCHO_ESCRITORIO && (tema === 'nocturno' || tema === 'cuaderno');
  const e = snapshot?.entregas.find((x) => x.key === key);
  const asignatura = useAsignaturas();
  const info = e ? asignatura(e.cursoId, e.curso) : null;

  if (!e) {
    return (
      <Screen refreshable={false}>
        <Vacio
          icono="search"
          tono="neutro"
          titulo="No encontrada"
          texto="Esta entrega ya no aparece en Moodle. Tira para actualizar en Pendientes."
        />
      </Screen>
    );
  }

  if (tema === 'obsidiana') {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <TareaObsidiana entrega={e} nowMs={nowMs} />
      </>
    );
  }

  if (nocturnoMovil) {
    return (
      <ThemedView style={styles.flex}>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.flex} edges={['top']}>
          <View style={[styles.nocturnoHeader, { borderBottomColor: theme.line }]}>
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Volver a Pendientes"
              style={[
                styles.nocturnoBack,
                cuadernoMovil && styles.cuadernoBack,
                { backgroundColor: theme.surface, borderColor: theme.line },
              ]}>
              <Feather name="arrow-left" size={16} color={theme.ink2} />
              {cuadernoMovil ? (
                <ThemedText type="meta" style={{ color: theme.ink2 }}>
                  Volver a pendientes
                </ThemedText>
              ) : null}
            </Pressable>
            {cuadernoMovil ? (
              <View style={[styles.cuadernoTag, { backgroundColor: theme.brandWash }]}>
                <ThemedText type="label" style={{ color: theme.brand }}>
                  {info?.siglas ?? 'Tarea'}
                </ThemedText>
              </View>
            ) : (
              <View style={styles.nocturnoHeaderTexto}>
                <ThemedText type="label" themeColor="ink2">
                  DETALLE DE TAREA
                </ThemedText>
                <ThemedText type="smallBold" numberOfLines={1}>
                  {e.nombre}
                </ThemedText>
              </View>
            )}
            <Pressable
              onPress={() => router.push(`/ia/${encodeURIComponent(e.key)}`)}
              accessibilityRole="button"
              accessibilityLabel="Hacer esta tarea con IA"
              style={[styles.nocturnoIA, { backgroundColor: theme.brandWash }]}>
              <Feather name="star" size={16} color={theme.brand} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.nocturnoDetalleMovil}>
            <TareaDetalle entrega={e} nowMs={nowMs} ancho={width - MARGEN * 2} />
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  // En escritorio, a sangre y con la columna lateral hasta abajo
  if (width >= ANCHO_ESCRITORIO) {
    return (
      <ThemedView style={styles.flex}>
        <Stack.Screen options={{ headerShown: !nocturnoWeb, title: 'Detalle de la tarea' }} />
        {nocturnoWeb ? (
          <View style={[styles.nocturnoHeader, { borderBottomColor: theme.line }]}>
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Volver a la página anterior"
              style={[
                styles.nocturnoBack,
                { backgroundColor: theme.surface, borderColor: theme.line },
              ]}>
              <Feather name="arrow-left" size={16} color={theme.ink2} />
            </Pressable>
            <View style={styles.nocturnoHeaderTexto}>
              <ThemedText type="label" themeColor="ink2">
                DETALLE DE TAREA
              </ThemedText>
              <ThemedText type="smallBold" numberOfLines={1}>
                {e.nombre}
              </ThemedText>
            </View>
            <Button
              title="Hacer con IA"
              icono="ia"
              compacto
              onPress={() => router.push(`/ia/${encodeURIComponent(e.key)}`)}
            />
          </View>
        ) : null}
        <PanelTarea entrega={e} nowMs={nowMs} ancho={Math.min(width, 1100)} />
      </ThemedView>
    );
  }

  return (
    <Screen refreshable={false}>
      <TareaDetalle entrega={e} nowMs={nowMs} ancho={width - MARGEN * 2} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  nocturnoHeader: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
  },
  nocturnoDetalleMovil: { padding: MARGEN, paddingBottom: 36 },
  nocturnoBack: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
  },
  cuadernoBack: {
    width: undefined,
    height: 40,
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  cuadernoTag: {
    minWidth: 42,
    minHeight: 30,
    paddingHorizontal: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  nocturnoHeaderTexto: { flex: 1, gap: 2 },
  nocturnoIA: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
