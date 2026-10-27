import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii } from '@/constants/theme';
import { useTheme, useThemePreference } from '@/hooks/use-theme';
import type { Entrega, Estado } from '@/lib/data';
import { DIAS_CORTOS, dayKey } from '@/lib/format';
import { useAsignaturas } from '@/lib/store';

const DIAS_LARGOS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

type Props = {
  month: Date; // cualquier día del mes a mostrar
  selected: string; // dayKey
  entregasPorDia: Map<string, Entrega[]>;
  /** Días con eventos de tu Google Calendar (rayita debajo / contador en la celda). */
  googlePorDia?: Map<string, unknown[]>;
  onSelect: (key: string) => void;
  /** Escritorio: celdas altas con el nombre de cada entrega dentro */
  grande?: boolean;
  /** Días que tienen clase (se marcan en la vista grande) */
  clasesDe?: (d: Date) => number;
};

export function semanasDelMes(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7; // 0 = lunes
  const cur = new Date(first);
  cur.setDate(1 - offset);
  const rows: Date[][] = [];
  for (let w = 0; w < 6; w++) {
    const row: Date[] = [];
    for (let d = 0; d < 7; d++) {
      row.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    rows.push(row);
    if (cur.getMonth() !== month.getMonth()) break;
  }
  return rows;
}

/** Color del punto según el estado de la entrega. */
export function useColorEstado() {
  const theme = useTheme();
  return (e: Estado) =>
    ({
      pendiente: theme.stPend,
      borrador: theme.stDraft,
      entregada: theme.stDone,
      vencida: theme.stLate,
    })[e];
}

/** Cuadrícula de mes (lunes primero). En el móvil, un punto por entrega; en grande, su nombre. */
export function MonthCalendar({
  month,
  selected,
  entregasPorDia,
  googlePorDia,
  onSelect,
  grande,
  clasesDe,
}: Props) {
  const theme = useTheme();
  const { tema } = useThemePreference();
  const colorEstado = useColorEstado();
  const info = useAsignaturas();
  const today = dayKey(new Date());
  const weeks = useMemo(() => semanasDelMes(month), [month]);

  if (grande) {
    return (
      <View>
        <View style={styles.row}>
          {DIAS_LARGOS.map((d) => (
            <ThemedText key={d} type="label" themeColor="ink3" style={styles.cabeceraGrande}>
              {d}
            </ThemedText>
          ))}
        </View>
        <View style={[styles.rejilla, { borderColor: theme.line }]}>
          {weeks.map((row, i) => (
            <View key={i} style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: theme.line }]}>
              {row.map((d, j) => {
                const key = dayKey(d);
                const inMonth = d.getMonth() === month.getMonth();
                const isSel = key === selected;
                const isToday = key === today;
                const items = entregasPorDia.get(key) ?? [];
                const nGoogle = googlePorDia?.get(key)?.length ?? 0;
                const nClases = clasesDe?.(d) ?? 0;
                return (
                  <Pressable
                    key={key}
                    onPress={() => onSelect(key)}
                    style={({ pressed }) => [
                      styles.celdaGrande,
                      j > 0 && { borderLeftWidth: 1, borderLeftColor: theme.line },
                      { backgroundColor: inMonth ? theme.surface2 : theme.paper2 },
                      isSel && { backgroundColor: theme.surface },
                      pressed && { backgroundColor: theme.paper2 },
                    ]}>
                    <View style={styles.numFila}>
                      <ThemedText
                        type="cifra"
                        style={[
                          { color: isToday ? theme.brand : inMonth ? theme.ink : theme.ink3 },
                          (isToday || isSel) && { fontWeight: 700 },
                        ]}>
                        {d.getDate()}
                      </ThemedText>
                      {isSel ? <View style={[styles.marcaSel, { backgroundColor: theme.ink }]} /> : null}
                    </View>
                    {isToday && nClases ? (
                      <Chip color={theme.brand} texto={`${nClases} clases · TI4`} />
                    ) : null}
                    {items.slice(0, 3).map((e) => {
                      const a = info(e.cursoId, e.curso);
                      return (
                        <Chip
                          key={e.key}
                          color={e.estado === 'vencida' ? theme.stLate : a.color}
                          texto={`${a.siglas} · ${e.nombre}`}
                          tachado={e.estado === 'entregada'}
                        />
                      );
                    })}
                    {items.length > 3 ? (
                      <ThemedText type="meta" themeColor="ink3">
                        +{items.length - 3} más
                      </ThemedText>
                    ) : null}
                    {nGoogle ? (
                      <Chip color={theme.ink3} texto={nGoogle === 1 ? '1 evento' : `${nGoogle} eventos`} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.row}>
        {DIAS_CORTOS.map((d) => (
          <ThemedText key={d} type="label" themeColor="ink3" style={styles.weekday}>
            {d}
          </ThemedText>
        ))}
      </View>

      {weeks.map((row, i) => (
        <View key={i} style={styles.row}>
          {row.map((d) => {
            const key = dayKey(d);
            const inMonth = d.getMonth() === month.getMonth();
            const isSel = key === selected;
            const isToday = key === today;
            const items = entregasPorDia.get(key) ?? [];
            const nGoogle = googlePorDia?.get(key)?.length ?? 0;
            return (
              <Pressable
                key={key}
                onPress={() => onSelect(key)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSel }}
                style={[
                  styles.cell,
                  isSel && { backgroundColor: tema === 'cuaderno' ? theme.brand : theme.ink },
                  !isSel && isToday && { borderWidth: 1.5, borderColor: theme.ink },
                ]}>
                <ThemedText
                  type="cifra"
                  style={[
                    styles.dayNum,
                    {
                      color: isSel
                        ? tema === 'cuaderno'
                          ? theme.brandInk
                          : theme.paper
                        : inMonth
                          ? theme.ink
                          : theme.ink3,
                    },
                    !inMonth && { opacity: 0.6 },
                    (isSel || isToday) && { fontWeight: 700 },
                  ]}>
                  {d.getDate()}
                </ThemedText>
                <View style={styles.dots}>
                  {items.slice(0, 4).map((e) => (
                    <View
                      key={e.key}
                      style={[
                        styles.dot,
                        { backgroundColor: isSel ? (tema === 'cuaderno' ? theme.brandInk : theme.paper) : colorEstado(e.estado) },
                      ]}
                    />
                  ))}
                </View>
                <View
                  style={[
                    styles.bar,
                    {
                      backgroundColor: isSel ? theme.paper : theme.ink3,
                      opacity: nGoogle ? 0.7 : 0,
                      width: Math.min(4 + nGoogle * 4, 18),
                    },
                  ]}
                />
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function Chip({ color, texto, tachado }: { color: string; texto: string; tachado?: boolean }) {
  const theme = useTheme();
  return (
    <View style={[styles.chip, { borderLeftColor: color, backgroundColor: theme.paper2 }]}>
      <ThemedText
        numberOfLines={2}
        style={[styles.chipTexto, tachado && { color: theme.ink3, textDecorationLine: 'line-through' }]}>
        {texto}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', paddingVertical: 8 },
  cell: {
    flex: 1,
    aspectRatio: 1,
    margin: 2,
    maxHeight: 54,
    borderRadius: Radii.control,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  dayNum: { fontSize: 14, lineHeight: 18 },
  dots: { flexDirection: 'row', gap: 3, height: 5 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  bar: { height: 2, borderRadius: 1 },
  cabeceraGrande: { flex: 1, paddingHorizontal: 8, paddingBottom: 8, fontSize: 9.5 },
  rejilla: { borderWidth: 1, borderRadius: Radii.control, overflow: 'hidden' },
  celdaGrande: { flex: 1, minHeight: 92, padding: 8, gap: 4 },
  numFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  marcaSel: { width: 6, height: 6, borderRadius: 3 },
  chip: { borderLeftWidth: 2, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 2 },
  chipTexto: { fontSize: 10.5, lineHeight: 14, fontWeight: 600 },
});
