import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { EntregaCard } from '@/components/entrega-card';
import { EventoRow } from '@/components/evento-row';
import { MonthCalendar } from '@/components/month-calendar';
import { Screen, SectionTitle } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import type { Entrega, Estado } from '@/lib/data';
import { dayKey, fechaLarga } from '@/lib/format';
import { eventosPorDia, useGoogleCal } from '@/lib/google-cal';
import { useMoodle } from '@/lib/store';

const LEYENDA: { estado: Estado; label: string }[] = [
  { estado: 'pendiente', label: 'Pendiente' },
  { estado: 'borrador', label: 'Borrador' },
  { estado: 'entregada', label: 'Entregada' },
  { estado: 'vencida', label: 'Vencida' },
];

const DIA = 86400000;

export default function CalendarioScreen() {
  const { snapshot, refresh, syncing } = useMoodle();
  const google = useGoogleCal();
  const theme = useTheme();
  const nowMs = useNow();
  const [month, setMonth] = useState(() => new Date());
  const [selected, setSelected] = useState(() => dayKey(new Date()));

  // Rango que cubre la cuadrícula del mes (con margen por delante y por detrás)
  const desde = new Date(month.getFullYear(), month.getMonth(), 1).getTime() - 7 * DIA;
  const hasta = new Date(month.getFullYear(), month.getMonth() + 1, 1).getTime() + 7 * DIA;
  const { cargarRango } = google;

  useEffect(() => {
    Promise.resolve().then(() => cargarRango(desde, hasta));
  }, [cargarRango, desde, hasta]);

  const porDia = useMemo(() => {
    const map = new Map<string, Entrega[]>();
    for (const e of snapshot?.entregas ?? []) {
      if (!e.fecha) continue;
      const k = dayKey(new Date(e.fecha * 1000));
      map.set(k, [...(map.get(k) ?? []), e]);
    }
    return map;
  }, [snapshot]);

  const googlePorDia = useMemo(() => eventosPorDia(google.eventos, dayKey), [google.eventos]);

  const delDia = porDia.get(selected) ?? [];
  const agenda = [...(googlePorDia.get(selected) ?? [])].sort(
    (a, b) => Number(b.todoElDia) - Number(a.todoElDia) || a.inicio - b.inicio,
  );
  const [y, m, d] = selected.split('-').map(Number);

  return (
    <Screen
      title="Calendario"
      refreshing={syncing || google.cargando}
      onRefresh={() => {
        refresh();
        cargarRango(desde, hasta);
      }}>
      <MonthCalendar
        month={month}
        selected={selected}
        entregasPorDia={porDia}
        googlePorDia={googlePorDia}
        onSelect={(k) => {
          setSelected(k);
          const [yy, mm] = k.split('-').map(Number);
          if (yy !== month.getFullYear() || mm - 1 !== month.getMonth())
            setMonth(new Date(yy, mm - 1, 1));
        }}
        onChangeMonth={(delta) =>
          setMonth((cur) => new Date(cur.getFullYear(), cur.getMonth() + delta, 1))
        }
      />
      <View style={styles.legend}>
        {LEYENDA.map((l) => (
          <View key={l.estado} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: theme[l.estado] }]} />
            <ThemedText type="small" themeColor="textSecondary">
              {l.label}
            </ThemedText>
          </View>
        ))}
        {google.url ? (
          <View style={styles.legendItem}>
            <View style={[styles.bar, { backgroundColor: theme.textSecondary }]} />
            <ThemedText type="small" themeColor="textSecondary">
              Google Calendar
            </ThemedText>
          </View>
        ) : null}
      </View>

      <SectionTitle>{fechaLarga(new Date(y, m - 1, d))}</SectionTitle>
      {delDia.length ? (
        delDia.map((e) => <EntregaCard key={e.key} entrega={e} nowMs={nowMs} />)
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          No hay entregas este día.
        </ThemedText>
      )}

      {google.url ? (
        <>
          <SectionTitle>Tu calendario</SectionTitle>
          {google.error ? (
            <ThemedText type="small" style={{ color: theme.vencida }}>
              {google.error}
            </ThemedText>
          ) : null}
          {agenda.length ? (
            <View style={[styles.agenda, { backgroundColor: theme.backgroundElement }]}>
              {agenda.map((ev) => (
                <EventoRow key={ev.id} evento={ev} />
              ))}
            </View>
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              {google.cargando ? 'Cargando…' : 'Nada en tu calendario este día.'}
            </ThemedText>
          )}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    rowGap: Spacing.one,
    justifyContent: 'center',
    marginTop: 4,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  bar: { width: 14, height: 3, borderRadius: 2, opacity: 0.6 },
  agenda: { borderRadius: 14, paddingHorizontal: Spacing.three, paddingVertical: Spacing.one },
});
