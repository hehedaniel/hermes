import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Cifras, FilaRail } from '@/components/anden';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Vacio } from '@/components/vacio';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import type { Entrega } from '@/lib/data';
import { useDownloads } from '@/lib/downloads';
import { useAsignaturas, useMoodle } from '@/lib/store';

/** Lo que se ve a la derecha de cada asignatura: lo más urgente que tiene. */
function resumenDe(entregas: Entrega[]) {
  const vencidas = entregas.filter((e) => e.estado === 'vencida').length;
  const pendientes = entregas.filter((e) => e.estado === 'pendiente').length;
  const borradores = entregas.filter((e) => e.estado === 'borrador').length;
  if (vencidas) return { texto: `${vencidas} ${vencidas === 1 ? 'vencida' : 'vencidas'}`, alerta: true };
  if (pendientes) return { texto: `${pendientes} ${pendientes === 1 ? 'entrega' : 'entregas'}`, alerta: false };
  if (borradores) return { texto: `${borradores} ${borradores === 1 ? 'borrador' : 'borradores'}`, alerta: false };
  return { texto: 'Sin pendientes', alerta: false };
}

export default function CursosScreen() {
  const { snapshot, client } = useMoodle();
  const { resumen, guardaArchivos } = useDownloads();
  const theme = useTheme();
  const info = useAsignaturas();
  const nowMs = useNow();

  if (!client) {
    return (
      <Screen title="Asignaturas" refreshable={false}>
        <Vacio
          icono="book-open"
          tono="neutro"
          titulo="Conecta tu Moodle"
          texto="Inicia sesión en Ajustes para ver tus asignaturas, sus apuntes y sus entregas."
          accion={
            <Button
              title="Ir a Ajustes"
              variant="secondary"
              compacto
              icono="arrow-right"
              onPress={() => router.navigate('/ajustes')}
            />
          }
        />
      </Screen>
    );
  }

  const cursos = [...(snapshot?.courses ?? [])]
    .map((c) => ({ c, a: info(c.id, c.fullname) }))
    .sort((x, y) => x.a.siglas.localeCompare(y.a.siglas, 'es'));
  const entregas = snapshot?.entregas ?? [];
  const vencidasRecientes = entregas.filter(
    (e) => e.estado === 'vencida' && e.fecha > nowMs / 1000 - 30 * 86400,
  ).length;

  return (
    <Screen
      title="Asignaturas"
      etiqueta="FP IA y Big Data · curso 26-27"
      derecha={`${cursos.length} activas`}>
      <Cifras
        items={[
          { n: cursos.length, texto: 'Asignaturas' },
          {
            n: vencidasRecientes,
            texto: vencidasRecientes === 1 ? 'Vencida' : 'Vencidas',
            alerta: vencidasRecientes > 0,
          },
          ...(guardaArchivos ? [{ n: resumen.archivos, texto: 'Archivos' }] : []),
        ]}
      />
      <View>
        {cursos.map(({ c, a }) => {
          const r = resumenDe(entregas.filter((e) => e.cursoId === c.id));
          return (
            <FilaRail
              key={c.id}
              color={a.color}
              onPress={() =>
                router.push({
                  pathname: '/curso/[id]',
                  params: { id: String(c.id), nombre: c.fullname },
                })
              }>
              <View style={styles.linea}>
                <ThemedText type="label" style={{ color: a.color, letterSpacing: 1 }}>
                  {a.siglas}
                </ThemedText>
                <ThemedText
                  type="small"
                  style={{ color: r.alerta ? theme.urgent : theme.ink2, fontWeight: r.alerta ? 600 : 500 }}>
                  {r.texto}
                </ThemedText>
              </View>
              <ThemedText style={styles.nombre} numberOfLines={2}>
                {a.nombre}
              </ThemedText>
              {a.profesor ? (
                <ThemedText type="meta" themeColor="ink2">
                  {a.profesor}
                </ThemedText>
              ) : null}
            </FilaRail>
          );
        })}
      </View>
      <ThemedText type="meta" themeColor="ink3" style={styles.pie}>
        Cada asignatura conserva su color en toda la app: es su «línea» del tablón.
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  linea: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  nombre: { fontSize: 16, lineHeight: 21, fontWeight: 500 },
  pie: { paddingTop: 8 },
});
