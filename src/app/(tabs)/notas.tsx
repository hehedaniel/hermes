import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { NotasObsidiana } from '@/components/notas-obsidiana';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Vacio } from '@/components/vacio';
import { useTheme, useThemePreference } from '@/hooks/use-theme';
import type { Entrega } from '@/lib/data';
import { fechaCorta } from '@/lib/format';
import { useAsignaturas, useMoodle } from '@/lib/store';

/** «9,00 / 10,00» -> { nota: 9, max: 10 }. Devuelve null si no hay nota numérica. */
function leerNota(texto?: string): { nota: number; max: number } | null {
  if (!texto) return null;
  const m = texto.match(/(-?\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)/);
  if (!m) return null;
  const nota = Number(m[1].replace(',', '.'));
  const max = Number(m[2].replace(',', '.'));
  if (!Number.isFinite(nota) || !Number.isFinite(max) || max <= 0) return null;
  return { nota, max };
}

const formato = (n: number) => n.toFixed(2).replace('.', ',');

function NotasClasico() {
  const { snapshot } = useMoodle();
  const info = useAsignaturas();
  const theme = useTheme();

  const grupos = useMemo(() => {
    const porCurso = new Map<number, Entrega[]>();
    for (const e of snapshot?.entregas ?? []) {
      const lista = porCurso.get(e.cursoId) ?? [];
      lista.push(e);
      porCurso.set(e.cursoId, lista);
    }
    return [...porCurso.entries()]
      .map(([cursoId, entregas]) => {
        const actividades = [...entregas].sort((a, b) => (a.fecha || 0) - (b.fecha || 0));
        const corregidas = actividades
          .map((e) => ({ e, n: leerNota(e.nota) }))
          .filter((x): x is { e: Entrega; n: { nota: number; max: number } } => x.n !== null);
        // Media simple sobre 10: sin pesos (la app no los recibe), así que es una estimación
        const media = corregidas.length
          ? (corregidas.reduce((acc, x) => acc + x.n.nota / x.n.max, 0) / corregidas.length) * 10
          : null;
        return { cursoId, actividades, corregidas, media, asignatura: info(cursoId) };
      })
      .sort((a, b) => a.asignatura.nombre.localeCompare(b.asignatura.nombre));
  }, [snapshot?.entregas, info]);

  const conNota = grupos.filter((g) => g.media !== null).length;

  return (
    <Screen
      title="Notas"
      etiqueta="Evaluación"
      derecha={grupos.length ? `${conNota} de ${grupos.length} con nota` : undefined}>
      <ThemedText type="small" themeColor="ink2" style={styles.intro}>
        Las notas son las que ya tienen corrección en el campus. La media es una estimación: Moodle
        calcula la nota final con pesos que la app no recibe.
      </ThemedText>

      {grupos.length === 0 ? (
        <Vacio titulo="Todavía no hay notas" texto="Aparecerán aquí cuando el campus tenga actividades corregidas." />
      ) : (
        grupos.map((g) => (
          <View key={g.cursoId} style={[styles.tarjeta, { borderColor: theme.line, backgroundColor: theme.surface }]}>
            <View style={[styles.raya, { backgroundColor: g.asignatura.color }]} />
            <View style={styles.cabecera}>
              <View style={styles.flex}>
                <ThemedText type="subtitle" numberOfLines={2}>
                  {g.asignatura.nombre}
                </ThemedText>
                {g.asignatura.profesor ? (
                  <ThemedText type="label" themeColor="ink3">
                    {g.asignatura.profesor}
                  </ThemedText>
                ) : null}
              </View>
              {g.media !== null ? (
                <View style={styles.derecha}>
                  <View style={styles.numeroFila}>
                    <ThemedText type="display" style={{ fontSize: 36, lineHeight: 40 }}>
                      {formato(g.media)}
                    </ThemedText>
                    <ThemedText type="meta" themeColor="ink3">
                      {' '}/ 10
                    </ThemedText>
                  </View>
                  <View style={[styles.chip, { borderColor: theme.line2 }]}>
                    <ThemedText type="label" themeColor="ink2">
                      ESTIMACIÓN
                    </ThemedText>
                  </View>
                </View>
              ) : (
                <ThemedText type="meta" themeColor="ink3">
                  Sin notas todavía
                </ThemedText>
              )}
            </View>

            {g.actividades.length ? (
              <View style={[styles.tabla, { borderTopColor: theme.line }]}>
                {g.actividades.map((e) => {
                  const n = leerNota(e.nota);
                  return (
                    <View key={e.key} style={[styles.fila, { borderBottomColor: theme.line }]}>
                      <ThemedText
                        style={[styles.flex, { color: n ? theme.ink : theme.ink3 }]}
                        numberOfLines={1}>
                        {e.nombre}
                      </ThemedText>
                      <ThemedText type="cifra" themeColor="ink3" style={styles.fecha}>
                        {e.fecha ? fechaCorta(e.fecha) : '—'}
                      </ThemedText>
                      <ThemedText type="cifra" themeColor={n ? 'ink' : 'ink3'} style={styles.nota}>
                        {n ? `${formato(n.nota)} / ${formato(n.max)}` : 'pendiente'}
                      </ThemedText>
                    </View>
                  );
                })}
              </View>
            ) : null}
          </View>
        ))
      )}
    </Screen>
  );
}

export default function NotasScreen() {
  const { tema } = useThemePreference();
  if (tema === 'obsidiana') return <NotasObsidiana />;
  return <NotasClasico />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  intro: { marginBottom: 18, maxWidth: 620 },
  tarjeta: { borderWidth: 1, borderRadius: 12, marginBottom: 16, overflow: 'hidden' },
  raya: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  cabecera: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, padding: 18, paddingLeft: 22 },
  derecha: { alignItems: 'flex-end', gap: 6 },
  numeroFila: { flexDirection: 'row', alignItems: 'baseline' },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  tabla: { borderTopWidth: 1 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 22, borderBottomWidth: 1 },
  fecha: { width: 72, textAlign: 'right' },
  nota: { width: 110, textAlign: 'right' },
});
