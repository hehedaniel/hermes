import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { Entrega, Estado } from '@/lib/data';
import { fechaCorta, relativo } from '@/lib/format';
import { useCourseColors } from '@/lib/store';
import { useTheme } from '@/hooks/use-theme';

const ETIQUETA: Record<Estado, string> = {
  entregada: 'Entregada',
  borrador: 'Borrador',
  pendiente: 'Pendiente',
  vencida: 'Vencida',
};

const TIPO: Record<string, string> = {
  assign: 'Tarea',
  quiz: 'Cuestionario',
  scorm: 'Lección SCORM',
  forum: 'Foro',
  lesson: 'Lección',
  workshop: 'Taller',
};

export const URGENTE_SEGUNDOS = 3 * 86400;

export function EstadoChip({ estado }: { estado: Estado }) {
  const theme = useTheme();
  const color = theme[estado];
  return (
    <View style={[styles.chip, { borderColor: color }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <ThemedText style={[styles.chipText, { color }]}>{ETIQUETA[estado]}</ThemedText>
    </View>
  );
}

export function EntregaCard({ entrega, nowMs }: { entrega: Entrega; nowMs: number }) {
  const theme = useTheme();
  const colorOf = useCourseColors();
  const abierta = entrega.estado === 'pendiente' || entrega.estado === 'borrador';
  const urgente = abierta && entrega.fecha > 0 && entrega.fecha - nowMs / 1000 < URGENTE_SEGUNDOS;

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/tarea/[key]', params: { key: entrega.key } })}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.backgroundElement,
          opacity: pressed ? 0.7 : 1,
        },
      ]}>
      <View style={[styles.bar, { backgroundColor: colorOf(entrega.cursoId) }]} />
      <View style={styles.body}>
        <ThemedText type="smallBold" numberOfLines={3}>
          {entrega.nombre}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {entrega.curso} · {TIPO[entrega.tipo] ?? entrega.tipo}
        </ThemedText>
        <View style={styles.row}>
          <ThemedText
            type="small"
            style={urgente ? { color: theme.urgente, fontWeight: 700 } : undefined}
            themeColor={urgente ? undefined : 'textSecondary'}>
            {entrega.fecha
              ? `${fechaCorta(entrega.fecha)} · ${relativo(entrega.fecha, nowMs)}`
              : 'Sin fecha límite'}
          </ThemedText>
          <EstadoChip estado={entrega.estado} />
        </View>
        {entrega.nota ? (
          <ThemedText type="small">
            Nota: <ThemedText type="smallBold">{entrega.nota}</ThemedText>
          </ThemedText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 14,
    overflow: 'hidden',
  },
  bar: { width: 5 },
  body: {
    flex: 1,
    paddingVertical: Spacing.three - 4,
    paddingHorizontal: Spacing.three,
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    marginTop: Spacing.one,
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 1,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  chipText: { fontSize: 12, lineHeight: 18, fontWeight: 600 },
});
