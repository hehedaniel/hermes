import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { EntregaCard } from '@/components/entrega-card';
import { EventoRow } from '@/components/evento-row';
import { SectionTitle } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Entrega } from '@/lib/data';
import { DIAS_CORTOS, dayKey, fechaLarga, MESES } from '@/lib/format';
import type { EventoGoogle } from '@/lib/google-cal';
import {
  AULA,
  type Clase,
  horarioDelDia,
  minutos,
  MODULOS,
  type ModuloId,
  moduloDe,
  motivoSinClase,
} from '@/lib/horario';
import { useCourseColors, useMoodle } from '@/lib/store';

type Props = {
  nowMs: number;
  entregasPorDia: Map<string, Entrega[]>;
  googlePorDia: Map<string, EventoGoogle[]>;
  /** Avisa del lunes de la semana visible (para cargar sus eventos de Google). */
  onSemana?: (lunes: Date) => void;
};

const DIA = 86400000;

function lunesDe(d: Date) {
  const l = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  l.setDate(l.getDate() - ((l.getDay() + 6) % 7));
  return l;
}

/** Horario del día con una tira de la semana para cambiar de día. */
export function HorarioView({ nowMs, entregasPorDia, googlePorDia, onSemana }: Props) {
  const theme = useTheme();
  const [dia, setDia] = useState(() => {
    const hoy = new Date(nowMs);
    return new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  });
  const lunes = lunesDe(dia);
  const semana = Array.from(
    { length: 7 },
    (_, i) => new Date(lunes.getTime() + i * DIA + 3600000),
  ).map((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()));
  const hoyKey = dayKey(new Date(nowMs));
  const esHoy = dayKey(dia) === hoyKey;

  function cambiarDia(d: Date) {
    const nuevoLunes = lunesDe(d);
    if (nuevoLunes.getTime() !== lunes.getTime()) onSemana?.(nuevoLunes);
    setDia(d);
  }
  function moverSemana(delta: number) {
    const d = new Date(dia);
    d.setDate(d.getDate() + delta * 7);
    cambiarDia(d);
  }

  const horario = horarioDelDia(dia);
  const entregas = entregasPorDia.get(dayKey(dia)) ?? [];
  // Eventos de Google de ese día que NO son clases (para no repetirlas)
  const otros = (googlePorDia.get(dayKey(dia)) ?? []).filter((e) => !moduloDe(e.titulo));

  const mesTexto =
    semana[0].getMonth() === semana[6].getMonth()
      ? `${MESES[semana[0].getMonth()]} ${semana[0].getFullYear()}`
      : `${MESES[semana[0].getMonth()].slice(0, 3)} – ${MESES[semana[6].getMonth()].slice(0, 3)} ${semana[6].getFullYear()}`;

  return (
    <View style={styles.wrap}>
      {/* Tira de la semana */}
      <View style={[styles.semana, { backgroundColor: theme.backgroundElement }]}>
        <View style={styles.semanaHeader}>
          <Pressable hitSlop={12} onPress={() => moverSemana(-1)} style={styles.nav}>
            <MaterialIcons name="chevron-left" size={26} color={theme.text} />
          </Pressable>
          <Pressable onPress={() => cambiarDia(new Date(new Date(nowMs).setHours(0, 0, 0, 0)))}>
            <ThemedText type="smallBold" style={styles.mes}>
              {mesTexto}
              {!esHoy ? (
                <ThemedText type="small" style={{ color: theme.accent }}>
                  {'  · Hoy'}
                </ThemedText>
              ) : null}
            </ThemedText>
          </Pressable>
          <Pressable hitSlop={12} onPress={() => moverSemana(1)} style={styles.nav}>
            <MaterialIcons name="chevron-right" size={26} color={theme.text} />
          </Pressable>
        </View>
        <View style={styles.dias}>
          {semana.map((d, i) => {
            const sel = dayKey(d) === dayKey(dia);
            const hoy = dayKey(d) === hoyKey;
            const finde = i >= 5;
            const festivo = !finde && !!motivoSinClase(d);
            const nEntregas = entregasPorDia.get(dayKey(d))?.length ?? 0;
            return (
              <Pressable
                key={i}
                onPress={() => cambiarDia(d)}
                style={[
                  styles.dia,
                  sel && { backgroundColor: theme.accent },
                  !sel && hoy && { borderWidth: 1.5, borderColor: theme.accent },
                ]}>
                <ThemedText
                  type="small"
                  style={[styles.diaLetra, { color: sel ? theme.onAccent : theme.textSecondary }]}>
                  {DIAS_CORTOS[i]}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.diaNum,
                    {
                      color: sel
                        ? theme.onAccent
                        : finde || festivo
                          ? theme.textSecondary
                          : theme.text,
                    },
                    festivo && !sel && { textDecorationLine: 'line-through' },
                  ]}>
                  {d.getDate()}
                </ThemedText>
                <View
                  style={[
                    styles.diaDot,
                    {
                      backgroundColor: sel ? theme.onAccent : theme.urgente,
                      opacity: nEntregas ? 1 : 0,
                    },
                  ]}
                />
              </Pressable>
            );
          })}
        </View>
      </View>

      <SectionTitle>
        {esHoy ? 'Hoy · ' : ''}
        {fechaLarga(dia)}
      </SectionTitle>

      {horario.tipo === 'clases' ? (
        <View style={[styles.lista, { backgroundColor: theme.backgroundElement }]}>
          {horario.clases.map((c, i) => {
            const siguiente = horario.clases[i + 1];
            const hayDescanso = siguiente && horario.descanso && c.fin === horario.descanso.inicio;
            return (
              <View key={`${c.modulo}-${c.inicio}`}>
                <ClaseRow clase={c} dia={dia} nowMs={nowMs} />
                {hayDescanso ? (
                  <View style={styles.descanso}>
                    <MaterialIcons name="local-cafe" size={16} color={theme.textSecondary} />
                    <ThemedText type="small" themeColor="textSecondary" style={styles.meta}>
                      Descanso · {horario.descanso!.inicio}–{horario.descanso!.fin}
                    </ThemedText>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : (
        <View style={[styles.sinClase, { backgroundColor: theme.backgroundElement }]}>
          <MaterialIcons
            name={
              horario.tipo === 'sin-clase'
                ? 'celebration'
                : horario.tipo === 'fin-de-semana'
                  ? 'weekend'
                  : 'beach-access'
            }
            size={30}
            color={horario.tipo === 'sin-clase' ? theme.entregada : theme.textSecondary}
          />
          <ThemedText type="smallBold" style={{ fontSize: 17 }}>
            {horario.tipo === 'fin-de-semana' ? 'Fin de semana' : 'No hay clase'}
          </ThemedText>
          {'motivo' in horario ? (
            <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
              {horario.motivo}
            </ThemedText>
          ) : null}
        </View>
      )}

      {entregas.length ? (
        <>
          <SectionTitle>Entregas de este día</SectionTitle>
          {entregas.map((e) => (
            <EntregaCard key={e.key} entrega={e} nowMs={nowMs} />
          ))}
        </>
      ) : null}

      {otros.length ? (
        <>
          <SectionTitle>Otros eventos</SectionTitle>
          <View style={[styles.lista, { backgroundColor: theme.backgroundElement }]}>
            {otros.map((ev) => (
              <EventoRow key={ev.id} evento={ev} />
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

function ClaseRow({ clase, dia, nowMs }: { clase: Clase; dia: Date; nowMs: number }) {
  const theme = useTheme();
  const { snapshot } = useMoodle();
  const colorOf = useCourseColors();
  const m = MODULOS[clase.modulo];

  // Curso de Moodle de este módulo (para su color y para abrirlo al tocar)
  const curso = useMemo(
    () => snapshot?.courses.find((c) => moduloDe(c.fullname) === (clase.modulo as ModuloId)),
    [snapshot, clase.modulo],
  );

  const ahora = new Date(nowMs);
  const mismoDia = dayKey(ahora) === dayKey(dia);
  const minAhora = ahora.getHours() * 60 + ahora.getMinutes();
  const enCurso = mismoDia && minAhora >= minutos(clase.inicio) && minAhora < minutos(clase.fin);
  const acabada = mismoDia && minAhora >= minutos(clase.fin);

  return (
    <Pressable
      disabled={!curso}
      onPress={() =>
        curso &&
        router.push({
          pathname: '/curso/[id]',
          params: { id: String(curso.id), nombre: curso.fullname },
        })
      }
      style={({ pressed }) => [styles.clase, { opacity: pressed ? 0.7 : acabada ? 0.55 : 1 }]}>
      <View style={styles.horas}>
        <ThemedText type="smallBold">{clase.inicio}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.meta}>
          {clase.fin}
        </ThemedText>
      </View>
      <View style={[styles.barra, { backgroundColor: curso ? colorOf(curso.id) : theme.accent }]} />
      <View style={styles.body}>
        <ThemedText type="smallBold" numberOfLines={2}>
          {m.nombre}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.meta}>
          {m.profesor}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.meta}>
          Aula {AULA}
        </ThemedText>
      </View>
      {enCurso ? (
        <View style={[styles.ahora, { backgroundColor: theme.accent }]}>
          <ThemedText style={[styles.ahoraText, { color: theme.onAccent }]}>AHORA</ThemedText>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two },
  semana: { borderRadius: 16, padding: 10, gap: 6 },
  semanaHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nav: { width: 36, height: 32, alignItems: 'center', justifyContent: 'center' },
  mes: { fontSize: 16, textTransform: 'capitalize' },
  dias: { flexDirection: 'row', gap: 4 },
  dia: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 12, gap: 1 },
  diaLetra: { fontSize: 12, lineHeight: 16, fontWeight: 600 },
  diaNum: { fontSize: 17, lineHeight: 22, fontWeight: 700 },
  diaDot: { width: 5, height: 5, borderRadius: 3, marginTop: 2 },
  lista: { borderRadius: 14, paddingHorizontal: Spacing.three, paddingVertical: Spacing.one },
  clase: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    paddingVertical: 10,
  },
  horas: { width: 46, alignItems: 'flex-start' },
  barra: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  body: { flex: 1, gap: 1 },
  meta: { fontSize: 12, lineHeight: 16 },
  ahora: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  ahoraText: { fontSize: 11, lineHeight: 16, fontWeight: 800 },
  descanso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingLeft: 58,
  },
  sinClase: { borderRadius: 14, padding: Spacing.four, alignItems: 'center', gap: Spacing.two },
});
