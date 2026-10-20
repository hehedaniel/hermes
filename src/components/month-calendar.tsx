import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import type { Entrega } from '@/lib/data';
import { DIAS_CORTOS, dayKey, MESES } from '@/lib/format';

type Props = {
  month: Date; // cualquier día del mes a mostrar
  selected: string; // dayKey
  entregasPorDia: Map<string, Entrega[]>;
  /** Días con eventos de tu Google Calendar (se marcan con una rayita debajo). */
  googlePorDia?: Map<string, unknown[]>;
  onSelect: (key: string) => void;
  onChangeMonth: (delta: number) => void;
};

/** Cuadrícula de mes (lunes primero) con un punto por entrega, coloreado según su estado. */
export function MonthCalendar({
  month,
  selected,
  entregasPorDia,
  googlePorDia,
  onSelect,
  onChangeMonth,
}: Props) {
  const theme = useTheme();
  const today = dayKey(new Date());

  const weeks = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7; // 0 = lunes
    const start = new Date(first);
    start.setDate(1 - offset);
    const rows: Date[][] = [];
    const cur = new Date(start);
    for (let w = 0; w < 6; w++) {
      const row: Date[] = [];
      for (let d = 0; d < 7; d++) {
        row.push(new Date(cur));
        cur.setDate(cur.getDate() + 1);
      }
      rows.push(row);
      if (cur.getMonth() !== month.getMonth() && w >= 4) break;
    }
    return rows;
  }, [month]);

  return (
    <View style={[styles.box, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.header}>
        <Pressable hitSlop={12} onPress={() => onChangeMonth(-1)} style={styles.nav}>
          <ThemedText style={styles.navText}>‹</ThemedText>
        </Pressable>
        <ThemedText type="smallBold" style={styles.monthLabel}>
          {MESES[month.getMonth()]} {month.getFullYear()}
        </ThemedText>
        <Pressable hitSlop={12} onPress={() => onChangeMonth(1)} style={styles.nav}>
          <ThemedText style={styles.navText}>›</ThemedText>
        </Pressable>
      </View>

      <View style={styles.row}>
        {DIAS_CORTOS.map((d) => (
          <ThemedText key={d} type="small" themeColor="textSecondary" style={styles.weekday}>
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
                style={[
                  styles.cell,
                  isSel && { backgroundColor: theme.accent },
                  !isSel && isToday && { borderWidth: 1.5, borderColor: theme.accent },
                ]}>
                <ThemedText
                  type="small"
                  style={[
                    styles.dayNum,
                    {
                      color: isSel ? theme.onAccent : inMonth ? theme.text : theme.textSecondary,
                    },
                    !inMonth && { opacity: 0.45 },
                  ]}>
                  {d.getDate()}
                </ThemedText>
                <View style={styles.dots}>
                  {items.slice(0, 4).map((e) => (
                    <View
                      key={e.key}
                      style={[
                        styles.dot,
                        {
                          backgroundColor: isSel ? theme.onAccent : theme[e.estado],
                        },
                      ]}
                    />
                  ))}
                </View>
                <View
                  style={[
                    styles.bar,
                    {
                      backgroundColor: isSel ? theme.onAccent : theme.textSecondary,
                      opacity: nGoogle ? (isSel ? 0.9 : 0.45) : 0,
                      width: Math.min(6 + nGoogle * 4, 22),
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

const styles = StyleSheet.create({
  box: { borderRadius: 16, padding: 10, gap: 2 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  nav: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: { fontSize: 26, lineHeight: 30, fontWeight: 600 },
  monthLabel: { fontSize: 17, textTransform: 'capitalize' },
  row: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', fontWeight: 600 },
  cell: {
    flex: 1,
    aspectRatio: 1,
    margin: 2,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  dayNum: { fontWeight: 600 },
  dots: { flexDirection: 'row', gap: 3, height: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  bar: { height: 3, borderRadius: 2 },
});
