import Feather from '@expo/vector-icons/Feather';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Cabecera, Seccion } from '@/components/anden';
import { Segmented } from '@/components/button';
import { EntregaCard } from '@/components/entrega-card';
import { EventoRow } from '@/components/evento-row';
import { ClasesDelDia, HorarioView, lunesDe, numClases } from '@/components/horario-view';
import { MonthCalendar, useColorEstado } from '@/components/month-calendar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  ANCHO_TABLETA,
  anchoNavegacion,
  MARGEN,
  MaxContentWidth,
  Radii,
  Spacing,
} from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import type { Entrega, Estado } from '@/lib/data';
import { dayKey, fechaTitulo, MESES } from '@/lib/format';
import { type EventoGoogle, eventosPorDia, useGoogleCal } from '@/lib/google-cal';
import { useMoodle } from '@/lib/store';

const LEYENDA: { estado: Estado; label: string }[] = [
  { estado: 'vencida', label: 'Vencida' },
  { estado: 'pendiente', label: 'Pendiente' },
  { estado: 'borrador', label: 'Borrador' },
  { estado: 'entregada', label: 'Entregada' },
];

const DIA = 86400000;
type Vista = 'mes' | 'horario';
const PANEL = 300;

const deClave = (k: string) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const hoyDe = (ms: number) => new Date(new Date(ms).setHours(0, 0, 0, 0));
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/**
 * Mes (entregas + Google) y horario de clase. En el móvil se deslizan; en tableta y
 * escritorio, el mes ocupa la pantalla y el día elegido va en un panel al lado.
 */
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
  const [diaHorario, setDiaHorario] = useState(() => hoyDe(nowMs));

  // Eventos de Google: el mes visible (con margen) y la semana que se esté viendo en el horario
  const desde = new Date(month.getFullYear(), month.getMonth(), 1).getTime() - 7 * DIA;
  const hasta = new Date(month.getFullYear(), month.getMonth() + 1, 1).getTime() + 7 * DIA;
  const lunesHorario = lunesDe(diaHorario).getTime();
  useEffect(() => {
    Promise.resolve().then(() => cargarRango(desde, hasta));
  }, [cargarRango, desde, hasta]);
  useEffect(() => {
    Promise.resolve().then(() => cargarRango(lunesHorario, lunesHorario + 7 * DIA));
  }, [cargarRango, lunesHorario]);

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

  const ancho = width >= ANCHO_TABLETA;
  const pageWidth = Math.min(width, MaxContentWidth);

  const prefijoMes = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
  const entregasMes = [...porDia.entries()]
    .filter(([k]) => k.startsWith(prefijoMes))
    .reduce((n, [, v]) => n + v.length, 0);
  const clasesHorario = numClases(diaHorario);

  function irA(v: Vista) {
    setVista(v);
    pager.current?.scrollTo({ x: v === 'mes' ? 0 : pageWidth, animated: true });
  }
  function onPagerEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    setVista(e.nativeEvent.contentOffset.x > pageWidth / 2 ? 'horario' : 'mes');
  }
  function elegir(k: string) {
    setSelected(k);
    const d = deClave(k);
    if (d.getFullYear() !== month.getFullYear() || d.getMonth() !== month.getMonth())
      setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
  }
  const moverMes = (delta: number) =>
    setMonth((cur) => new Date(cur.getFullYear(), cur.getMonth() + delta, 1));
  function irAHoy() {
    const hoy = hoyDe(Date.now());
    setMonth(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
    setSelected(dayKey(hoy));
    setDiaHorario(hoy);
  }

  const refresco = (
    <RefreshControl
      refreshing={syncing || google.cargando}
      onRefresh={() => {
        refresh();
        cargarRango(desde, hasta);
      }}
      colors={[theme.brand]}
      tintColor={theme.brand}
    />
  );

  const conmutador = (
    <Segmented
      value={vista}
      onChange={ancho ? setVista : irA}
      options={[
        { value: 'mes', label: 'Mes' },
        { value: 'horario', label: 'Horario' },
      ]}
    />
  );
  const flechasMes = (
    <View style={styles.flechas}>
      <Flecha icono="chevron-left" etiqueta="Mes anterior" onPress={() => moverMes(-1)} />
      <Flecha icono="chevron-right" etiqueta="Mes siguiente" onPress={() => moverMes(1)} />
    </View>
  );
  const mesTexto = `${MESES[month.getMonth()]} ${month.getFullYear()}`.replace(/^\w/, (c) =>
    c.toUpperCase(),
  );
  const leyenda = <Leyenda conGoogle={!!google.url} />;
  const horario = (
    <HorarioView
      nowMs={nowMs}
      dia={diaHorario}
      onDia={setDiaHorario}
      entregasPorDia={porDia}
      googlePorDia={googlePorDia}
    />
  );

  // ——— Tableta y escritorio ———
  if (ancho) {
    const anchoPrincipal = width - anchoNavegacion(width) - (vista === 'mes' ? PANEL : 0);
    return (
      <ThemedView style={styles.flex}>
        <SafeAreaView style={[styles.flex, styles.fila]} edges={['top']}>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[
              styles.principal,
              vista === 'horario' && { maxWidth: 720, alignSelf: 'center', width: '100%' },
            ]}
            refreshControl={refresco}>
            <View style={styles.cabeceraAncha}>
              <View style={styles.tituloMes}>
                <ThemedText type="title" style={styles.flexShrink}>
                  {vista === 'mes' ? mesTexto : 'Horario'}
                </ThemedText>
                {vista === 'mes' ? flechasMes : null}
                <Pressable onPress={irAHoy} hitSlop={8}>
                  <ThemedText type="small" style={{ color: theme.brand, fontWeight: 600 }}>
                    Hoy
                  </ThemedText>
                </Pressable>
              </View>
              {conmutador}
            </View>
            {vista === 'mes' ? (
              <>
                <MonthCalendar
                  month={month}
                  selected={selected}
                  entregasPorDia={porDia}
                  googlePorDia={googlePorDia}
                  onSelect={elegir}
                  grande={anchoPrincipal >= 640}
                  clasesDe={numClases}
                />
                {leyenda}
              </>
            ) : (
              horario
            )}
          </ScrollView>
          {vista === 'mes' ? (
            <View style={[styles.panel, { borderLeftColor: theme.line, backgroundColor: theme.surface2 }]}>
              <ScrollView contentContainerStyle={styles.panelContenido}>
                <PanelDia
                  dia={deClave(selected)}
                  nowMs={nowMs}
                  entregas={porDia.get(selected) ?? []}
                  eventos={googlePorDia.get(selected) ?? []}
                  conGoogle={!!google.url}
                />
              </ScrollView>
            </View>
          ) : null}
        </SafeAreaView>
      </ThemedView>
    );
  }

  // ——— Móvil ———
  const delDia = porDia.get(selected) ?? [];
  const agenda = [...(googlePorDia.get(selected) ?? [])].sort(
    (a, b) => Number(b.todoElDia) - Number(a.todoElDia) || a.inicio - b.inicio,
  );

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <View style={[styles.header, { width: pageWidth }]}>
          {vista === 'mes' ? (
            <Cabecera
              etiqueta={mesTexto}
              titulo="Calendario"
              derecha={plural(entregasMes, 'entrega', 'entregas')}
            />
          ) : (
            <Cabecera
              etiqueta={fechaTitulo(diaHorario)}
              titulo="Horario"
              derecha={clasesHorario ? plural(clasesHorario, 'clase', 'clases') : 'sin clase'}
            />
          )}
          <View style={styles.controles}>
            {conmutador}
            {vista === 'mes' ? flechasMes : null}
          </View>
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
              onSelect={elegir}
            />
            {leyenda}

            <View>
              <Seccion
                titulo={fechaTitulo(deClave(selected))}
                derecha={plural(delDia.length, 'entrega', 'entregas')}
              />
              {delDia.length ? (
                delDia.map((e) => <EntregaCard key={e.key} entrega={e} nowMs={nowMs} />)
              ) : (
                <ThemedText type="small" themeColor="ink3" style={styles.nada}>
                  Nada que entregar este día.
                </ThemedText>
              )}
            </View>

            {google.url ? (
              <View>
                <Seccion titulo="Tu Google Calendar" derecha={String(agenda.length)} />
                {google.error ? (
                  <ThemedText type="small" style={[styles.nada, { color: theme.urgent }]}>
                    {google.error}
                  </ThemedText>
                ) : null}
                {agenda.length ? (
                  agenda.map((ev) => <EventoRow key={ev.id} evento={ev} />)
                ) : (
                  <ThemedText type="small" themeColor="ink3" style={styles.nada}>
                    {google.cargando ? 'Cargando…' : 'Nada en tu calendario este día.'}
                  </ThemedText>
                )}
              </View>
            ) : null}
          </ScrollView>

          {/* ---------- Horario ---------- */}
          <ScrollView
            style={{ width: pageWidth }}
            contentContainerStyle={styles.page}
            refreshControl={refresco}>
            {horario}
          </ScrollView>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

/** El día elegido, en el panel lateral: clases, entregas y tu calendario. */
function PanelDia({
  dia,
  nowMs,
  entregas,
  eventos,
  conGoogle,
}: {
  dia: Date;
  nowMs: number;
  entregas: Entrega[];
  eventos: EventoGoogle[];
  conGoogle: boolean;
}) {
  const [diaSemana, resto] = fechaTitulo(dia).split(', ');
  return (
    <View style={styles.panelDia}>
      <View>
        <ThemedText type="label" themeColor="ink2">
          {diaSemana}
        </ThemedText>
        <ThemedText type="subtitle" style={styles.panelTitulo}>
          {resto}
        </ThemedText>
      </View>
      <ClasesDelDia dia={dia} nowMs={nowMs} compacto />
      <View>
        <Seccion titulo="Entregas" derecha={String(entregas.length)} sinRegla />
        {entregas.length ? (
          entregas.map((e) => <EntregaCard key={e.key} entrega={e} nowMs={nowMs} />)
        ) : (
          <ThemedText type="meta" themeColor="ink3">
            Ninguna este día.
          </ThemedText>
        )}
      </View>
      {conGoogle ? (
        <View>
          <Seccion titulo="Google Calendar" derecha={String(eventos.length)} sinRegla />
          {eventos.length ? (
            eventos.map((ev) => <EventoRow key={ev.id} evento={ev} compacto />)
          ) : (
            <ThemedText type="meta" themeColor="ink3">
              Nada en tu calendario.
            </ThemedText>
          )}
        </View>
      ) : null}
    </View>
  );
}

function Leyenda({ conGoogle }: { conGoogle: boolean }) {
  const theme = useTheme();
  const color = useColorEstado();
  return (
    <View style={styles.legend}>
      {LEYENDA.map((l) => (
        <View key={l.estado} style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: color(l.estado) }]} />
          <ThemedText type="meta" themeColor="ink2">
            {l.label}
          </ThemedText>
        </View>
      ))}
      {conGoogle ? (
        <View style={styles.legendItem}>
          <View style={[styles.bar, { backgroundColor: theme.ink3 }]} />
          <ThemedText type="meta" themeColor="ink2">
            Google
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

function Flecha({
  icono,
  onPress,
  etiqueta,
}: {
  icono: 'chevron-left' | 'chevron-right';
  onPress: () => void;
  etiqueta: string;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      style={({ pressed }) => [
        styles.flecha,
        { borderColor: theme.line2, backgroundColor: pressed ? theme.paper2 : theme.surface },
      ]}>
      <Feather name={icono} size={16} color={theme.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexShrink: { flexShrink: 1 },
  fila: { flexDirection: 'row' },
  pager: { alignItems: 'stretch' },
  header: { alignSelf: 'center', paddingHorizontal: MARGEN, gap: 4, paddingBottom: Spacing.two },
  controles: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  flechas: { flexDirection: 'row', gap: 6 },
  flecha: {
    width: 32,
    height: 32,
    borderRadius: Radii.control,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  page: {
    paddingHorizontal: MARGEN,
    paddingTop: Spacing.one,
    paddingBottom: Spacing.five,
    gap: Spacing.three,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    rowGap: Spacing.one,
    marginTop: 4,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  bar: { width: 12, height: 2, borderRadius: 1 },
  nada: { paddingVertical: 12 },
  principal: { padding: 28, paddingTop: 32, gap: Spacing.three },
  cabeceraAncha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    flexWrap: 'wrap',
  },
  tituloMes: { flexDirection: 'row', alignItems: 'center', gap: 14, flexShrink: 1 },
  panel: { width: PANEL, borderLeftWidth: 1 },
  panelContenido: { padding: 22, paddingTop: 32 },
  panelDia: { gap: Spacing.four },
  panelTitulo: { fontSize: 24, lineHeight: 30, letterSpacing: -0.6 },
});
