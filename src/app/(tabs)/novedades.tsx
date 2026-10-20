import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen, SectionTitle } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Vacio } from '@/components/vacio';
import { Spacing } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { useDownloads } from '@/lib/downloads';
import { dayKey, fechaLarga, hora } from '@/lib/format';
import type { Novedad, TipoNovedad } from '@/lib/novedades';
import { abrirArchivo } from '@/lib/open-file';
import { useCourseColors, useMoodle } from '@/lib/store';

const ICONO: Record<TipoNovedad, keyof typeof MaterialIcons.glyphMap> = {
  archivo: 'note-add',
  'archivo-actualizado': 'sync',
  actividad: 'widgets',
  tarea: 'assignment',
  nota: 'grade',
  fecha: 'event',
};

const ETIQUETA: Record<TipoNovedad, string> = {
  archivo: 'Archivo nuevo',
  'archivo-actualizado': 'Archivo actualizado',
  actividad: 'Actividad nueva',
  tarea: 'Entrega nueva',
  nota: 'Nota publicada',
  fecha: 'Cambio de fecha',
};

export default function NovedadesScreen() {
  const { novedades, client, snapshot, marcarLeidas } = useMoodle();
  const ahora = useNow();

  // Al salir de la pestaña, todo lo que has visto queda como leído
  useFocusEffect(
    useCallback(() => {
      return () => marcarLeidas();
    }, [marcarLeidas]),
  );

  const grupos = useMemo(() => {
    const hoy = dayKey(new Date(ahora));
    const ayer = dayKey(new Date(ahora - 86400000));
    const map = new Map<string, Novedad[]>();
    for (const n of novedades) {
      const k = dayKey(new Date(n.fecha));
      map.set(k, [...(map.get(k) ?? []), n]);
    }
    return [...map.entries()].map(([k, items]) => {
      const [y, m, d] = k.split('-').map(Number);
      const titulo = k === hoy ? 'Hoy' : k === ayer ? 'Ayer' : fechaLarga(new Date(y, m - 1, d));
      return { titulo, items };
    });
  }, [novedades, ahora]);

  if (!client) {
    return (
      <Screen title="Novedades" refreshable={false}>
        <Vacio
          titulo="Conecta tu Moodle"
          texto="Pega tu token en Ajustes para ver lo que va cambiando."
        />
      </Screen>
    );
  }

  const hayNoLeidas = novedades.some((n) => !n.leida);

  return (
    <Screen title="Novedades">
      {novedades.length === 0 ? (
        <Vacio
          titulo="Todo al día"
          texto={
            snapshot
              ? 'Aquí aparecerá lo que cambie en tus asignaturas a partir de ahora: apuntes nuevos, entregas, notas y cambios de fecha.'
              : 'Sincronizando por primera vez…'
          }
        />
      ) : null}
      {hayNoLeidas ? (
        <Button title="Marcar todo como leído" variant="secondary" onPress={marcarLeidas} />
      ) : null}
      {grupos.map((g) => (
        <View key={g.titulo} style={styles.group}>
          <SectionTitle>{g.titulo}</SectionTitle>
          {g.items.map((n) => (
            <NovedadRow key={n.id} novedad={n} />
          ))}
        </View>
      ))}
    </Screen>
  );
}

function NovedadRow({ novedad: n }: { novedad: Novedad }) {
  const theme = useTheme();
  const colorOf = useCourseColors();
  const { archivoLocal, descargar } = useDownloads();

  async function abrir() {
    try {
      if (n.archivo) {
        const file = archivoLocal(n.archivo) ?? (await descargar(n.archivo));
        await abrirArchivo(n.archivo, file);
      } else if (n.entregaKey) {
        router.push({ pathname: '/tarea/[key]', params: { key: n.entregaKey } });
      } else {
        router.push({
          pathname: '/curso/[id]',
          params: { id: String(n.cursoId), nombre: n.curso },
        });
      }
    } catch (e) {
      Alert.alert('No se pudo abrir', (e as Error).message);
    }
  }

  return (
    <Pressable
      onPress={abrir}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.7 : 1 },
      ]}>
      <View style={[styles.icono, { backgroundColor: colorOf(n.cursoId) }]}>
        <MaterialIcons name={ICONO[n.tipo]} size={20} color="#fff" />
      </View>
      <View style={styles.body}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.meta} numberOfLines={1}>
          {ETIQUETA[n.tipo]} · {n.curso}
        </ThemedText>
        <ThemedText type="small" numberOfLines={2} style={{ fontWeight: n.leida ? 500 : 700 }}>
          {n.titulo}
        </ThemedText>
        {n.detalle ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={2} style={styles.meta}>
            {n.detalle}
          </ThemedText>
        ) : null}
      </View>
      <View style={styles.right}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.meta}>
          {hora(new Date(n.fecha))}
        </ThemedText>
        {!n.leida ? <View style={[styles.dot, { backgroundColor: theme.accent }]} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: { gap: Spacing.two },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    borderRadius: 14,
    padding: Spacing.three - 4,
  },
  icono: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 1 },
  meta: { fontSize: 12, lineHeight: 16 },
  right: { alignItems: 'flex-end', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
