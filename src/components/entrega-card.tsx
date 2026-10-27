import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { EstadoChip, FilaRail } from '@/components/anden';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import type { Entrega } from '@/lib/data';
import { cuandoVence, diaMes, diaMesHora, haceCuanto, quedan, relativo } from '@/lib/format';
import { useAsignaturas } from '@/lib/store';

export { EstadoChip } from '@/components/anden';

export const URGENTE_SEGUNDOS = 3 * 86400;

export const esUrgente = (e: Entrega, nowMs: number) =>
  (e.estado === 'pendiente' || e.estado === 'borrador') &&
  e.fecha > 0 &&
  e.fecha - nowMs / 1000 < URGENTE_SEGUNDOS;

/** Lo que se ve a la derecha de la fila: cuándo vence o cuándo se entregó. */
export function cuandoDe(e: Entrega, nowMs: number) {
  if (e.estado === 'entregada') {
    const f = e.envio?.fecha ?? e.fecha;
    return f ? `entregada el ${diaMes(f)}` : 'entregada';
  }
  if (!e.fecha) return 'sin fecha';
  if (e.estado === 'vencida') return `venció ${relativo(e.fecha, nowMs)}`;
  return cuandoVence(e.fecha, nowMs);
}

/** La línea pequeña junto al chip de estado. */
function detalleDe(e: Entrega, nowMs: number) {
  if (e.estado === 'entregada') {
    if (e.nota) return null; // la nota va aparte, en verde
    return e.envio?.pendienteDeCorregir ? 'Pendiente de corregir' : null;
  }
  if (e.estado === 'borrador')
    return e.envio?.fecha ? `Borrador guardado ${haceCuanto(e.envio.fecha * 1000, nowMs)}` : null;
  if (e.estado === 'vencida') return e.fecha ? diaMesHora(e.fecha) : null;
  return e.fecha ? quedan(e.fecha, nowMs) : null;
}

/**
 * Una entrega en el tablón: raíl con el color de la asignatura, siglas, cuándo vence,
 * nombre y estado. Si no se pasa onPress, abre el detalle.
 */
export function EntregaCard({
  entrega: e,
  nowMs,
  onPress,
  seleccionada,
}: {
  entrega: Entrega;
  nowMs: number;
  onPress?: () => void;
  seleccionada?: boolean;
}) {
  const theme = useTheme();
  const info = useAsignaturas()(e.cursoId, e.curso);
  const urgente = esUrgente(e, nowMs);
  const cerrada = e.estado === 'entregada';
  const detalle = detalleDe(e, nowMs);
  const colorCuando =
    urgente || e.estado === 'vencida' ? theme.urgent : cerrada ? theme.ink2 : theme.ink2;

  return (
    <FilaRail
      color={info.color}
      apagada={cerrada}
      seleccionada={seleccionada}
      onPress={
        onPress ?? (() => router.push({ pathname: '/tarea/[key]', params: { key: e.key } }))
      }>
      <View style={styles.linea}>
        <ThemedText type="label" style={{ color: info.color, letterSpacing: 1 }}>
          {info.siglas}
        </ThemedText>
        <ThemedText
          type="small"
          style={[styles.cuando, { color: colorCuando, fontWeight: urgente ? 600 : 500 }]}
          numberOfLines={1}>
          {cuandoDe(e, nowMs)}
        </ThemedText>
      </View>
      <ThemedText
        style={[styles.nombre, cerrada && { fontWeight: 400, color: theme.ink2 }]}
        numberOfLines={3}>
        {e.nombre}
      </ThemedText>
      <View style={styles.linea2}>
        <EstadoChip estado={e.estado} />
        {e.nota ? (
          <ThemedText type="small" style={{ color: theme.stDone, fontWeight: 700 }}>
            Nota {e.nota}
          </ThemedText>
        ) : detalle ? (
          <ThemedText type="meta" themeColor="ink3" numberOfLines={1} style={styles.flex}>
            {detalle}
          </ThemedText>
        ) : null}
      </View>
    </FilaRail>
  );
}

export { EntregaCard as EntregaFila };

const styles = StyleSheet.create({
  flex: { flex: 1 },
  linea: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cuando: { marginRight: 8 },
  nombre: { fontSize: 15.5, lineHeight: 21, fontWeight: 500 },
  linea2: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
});
