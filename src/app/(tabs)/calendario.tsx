import { useEffect, useMemo, useRef, useState } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Segmented } from '@/components/button';
import { EntregaCard } from '@/components/entrega-card';
import { EventoRow } from '@/components/evento-row';
import { HorarioView } from '@/components/horario-view';
import { MonthCalendar } from '@/components/month-calendar';
import { SectionTitle } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
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
type Vista = 'mes' | 'horario';

/** Dos vistas que se deslizan: el mes (entregas + Google) y el horario de clase día a día. */
export default function CalendarioScreen() {
  const { snapshot, refresh, syncing } = useMoodle();
  const google = useGoogleCal();
  const { cargarRango } = google;
  const theme = useTheme();
  const nowMs = useNow();
  const { width } = useWindowDimensions();
  const pager = useRef<ScrollView>(null);
  const [vista, setVista] = useState<Vista>('mes');

  const [month, setMonth] = useState(() => new Date());
  const [selected, setSelected] = useState(() => dayKey(new Date()));
  const [semanaHorario, setSemanaHorario] = useState<number | null>(null);

  // Eventos de Google: el mes visible (con margen) y la semana que se esté viendo en el horario
  const desde = new Date(month.getFullYear(), month.getMonth(), 1).getTime() - 7 * DIA;
  const hasta = new Date(month.getFullYear(), month.getMonth() + 1, 1).getTime() + 7 * DIA;
  useEffect(() => {
    Promise.resolve().then(() => cargarRango(desde, hasta));
  }, [cargarRango, desde, hasta]);
  useEffect(() => {
    if (semanaHorario !== null) {
      Promise.resolve().then(() => cargarRango(semanaHorario, semanaHorario + 7 * DIA));
    }
  }, [cargarRango, semanaHorario]);

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

  const pageWidth = Math.min(width, MaxContentWidth);

  function irA(v: Vista) {
    setVista(v);
    pager.current?.scrollTo({ x: v === 'mes' ? 0 : pageWidth, animated: true });
  }
  function onPagerEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    setVista(e.nativeEvent.contentOffset.x > pageWidth / 2 ? 'horario' : 'mes');
  }

  const refresco = (
    <RefreshControl
      refreshing={syncing || google.cargando}
      onRefresh={() => {
        refresh();
        cargarRango(desde, hasta);
      }}
      colors={[theme.accent]}
      tintColor={theme.accent}
    />
  );

  const delDia = porDia.get(selected) ?? [];
  const agenda = [...(googlePorDia.get(selected) ?? [])].sort(
    (a, b) => Number(b.todoElDia) - Number(a.todoElDia) || a.inicio - b.inicio,
  );
  const [y, m, d] = selected.split('-').map(Number);

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <View style={[styles.header, { width: pageWidth }]}>
          <ThemedText style={styles.title}>Calendario</ThemedText>
          <Segmented
            value={vista}
            onChange={irA}
            options={[
              { value: 'mes', label: 'Mes' },
              { value: 'horario', label: 'Horario' },
            ]}
          />
        </View>

        <ScrollView
          ref={pager}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onPagerEnd}
          style={styles.flex}
          contentContainerStyle={styles.pager}>
          {/* ---------- Mes ---------- */}
          <ScrollView
            style={{ width: pageWidth }}
            contentContainerStyle={styles.page}
            refreshControl={refresco}>
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
            <ThemedText type="small" themeColor="textSecondary" style={styles.pista}>
              Desliza a la izquierda para ver el horario →
            </ThemedText>

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
          </ScrollView>

          {/* ---------- Horario ---------- */}
          <ScrollView
            style={{ width: pageWidth }}
            contentContainerStyle={styles.page}
            refreshControl={refresco}>
            <HorarioView
              nowMs={nowMs}
              entregasPorDia={porDia}
              googlePorDia={googlePorDia}
              onSemana={(lunes) => setSemanaHorario(lunes.getTime())}
            />
          </ScrollView>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pager: { alignItems: 'stretch' },
  header: {
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    gap: Spacing.two,
  },
  title: { fontSize: 32, lineHeight: 40, fontWeight: 700 },
  page: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.one,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.two,
  },
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
  pista: { textAlign: 'center', fontSize: 12 },
  agenda: { borderRadius: 14, paddingHorizontal: Spacing.three, paddingVertical: Spacing.one },
});
