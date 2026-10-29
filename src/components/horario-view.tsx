import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Caja, Marca, Seccion } from '@/components/anden';
import { EntregaCard } from '@/components/entrega-card';
import { EventoRow } from '@/components/evento-row';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme, useThemePreference } from '@/hooks/use-theme';
import type { Entrega } from '@/lib/data';
import { DIAS_CORTOS, dayKey, fechaTitulo } from '@/lib/format';
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
import { useHorario } from '@/lib/use-horario';
import { useMoodle } from '@/lib/store';

const DIA = 86400000;

export function lunesDe(d: Date) {
  const l = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  l.setDate(l.getDate() - ((l.getDay() + 6) % 7));
  return l;
}

/** Cuántas clases hay ese día (0 si no hay). */
export function numClases(d: Date) {
  const h = horarioDelDia(d);
  return h.tipo === 'clases' ? h.clases.length : 0;
}

type Props = {
  nowMs: number;
  dia: Date;
  onDia: (d: Date) => void;
  entregasPorDia: Map<string, Entrega[]>;
  googlePorDia: Map<string, EventoGoogle[]>;
};

/** Horario del día con una tira de la semana para cambiar de día. */
export function HorarioView({ nowMs, dia, onDia, entregasPorDia, googlePorDia }: Props) {
  useHorario();
  const theme = useTheme();
  const lunes = lunesDe(dia);
  const semana = Array.from(
    { length: 7 },
    (_, i) => new Date(lunes.getTime() + i * DIA + 3600000),
  ).map((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()));
  const hoyKey = dayKey(new Date(nowMs));
  const esHoy = dayKey(dia) === hoyKey;

  function moverSemana(delta: number) {
    const d = new Date(dia);
    d.setDate(d.getDate() + delta * 7);
    onDia(d);
  }

  const entregas = entregasPorDia.get(dayKey(dia)) ?? [];
  // Eventos de Google de ese día que NO son clases (para no repetirlas)
  const otros = (googlePorDia.get(dayKey(dia)) ?? []).filter((e) => !moduloDe(e.titulo));

  return (
    <View style={styles.wrap}>
      <View style={styles.semanaFila}>
        <Flecha icono="chevron-left" onPress={() => moverSemana(-1)} etiqueta="Semana anterior" />
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
                onPress={() => onDia(d)}
                accessibilityRole="button"
                accessibilityState={{ selected: sel }}
                style={[
                  styles.dia,
                  sel && { backgroundColor: theme.ink },
                  !sel && hoy && { borderWidth: 1.5, borderColor: theme.ink },
                ]}>
                <ThemedText
                  type="label"
                  style={[styles.diaLetra, { color: sel ? theme.paper : theme.ink3 }]}>
                  {DIAS_CORTOS[i]}
                </ThemedText>
                <ThemedText
                  type="cifra"
                  style={[
                    styles.diaNum,
                    { color: sel ? theme.paper : finde || festivo ? theme.ink3 : theme.ink },
                    festivo && !sel && { textDecorationLine: 'line-through' },
                  ]}>
                  {d.getDate()}
                </ThemedText>
                <View
                  style={[
                    styles.diaDot,
                    {
                      backgroundColor: sel ? theme.paper : theme.urgent,
                      opacity: nEntregas ? 1 : 0,
                    },
                  ]}
                />
              </Pressable>
            );
          })}
        </View>
        <Flecha icono="chevron-right" onPress={() => moverSemana(1)} etiqueta="Semana siguiente" />
      </View>
      {!esHoy ? (
        <Pressable
          onPress={() => onDia(new Date(new Date(nowMs).setHours(0, 0, 0, 0)))}
          style={styles.volverHoy}
          hitSlop={8}>
          <Feather name="corner-up-left" size={12} color={theme.brand} />
          <ThemedText type="meta" style={{ color: theme.brand }}>
            Volver a hoy
          </ThemedText>
        </Pressable>
      ) : null}

      <ClasesDelDia dia={dia} nowMs={nowMs} />

      <View>
        <Seccion
          titulo={esHoy ? 'Entregas de hoy' : 'Entregas de este día'}
          derecha={String(entregas.length)}
        />
        {entregas.length ? (
          entregas.map((e) => <EntregaCard key={e.key} entrega={e} nowMs={nowMs} />)
        ) : (
          <ThemedText type="small" themeColor="ink3" style={styles.nada}>
            {esHoy ? 'Nada que entregar hoy.' : 'Nada que entregar este día.'}
          </ThemedText>
        )}
      </View>

      {otros.length ? (
        <View>
          <Seccion titulo="Tu Google Calendar" derecha={String(otros.length)} />
          {otros.map((ev) => (
            <EventoRow key={ev.id} evento={ev} />
          ))}
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
      hitSlop={8}
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

/** Las clases de un día con su descanso, o por qué no hay clase. */
export function ClasesDelDia({
  dia,
  nowMs,
  compacto,
}: {
  dia: Date;
  nowMs: number;
  compacto?: boolean;
}) {
  const theme = useTheme();
  useHorario();
  const horario = horarioDelDia(dia);

  if (horario.tipo !== 'clases') {
    return (
      <Caja style={[styles.sinClase, { borderLeftColor: theme.ink3 }]}>
        <ThemedText type="smallBold">
          {fechaTitulo(dia).split(',')[0]} {dia.getDate()} ·{' '}
          {horario.tipo === 'fin-de-semana' ? 'Fin de semana' : 'No hay clase'}
        </ThemedText>
        {'motivo' in horario ? (
          <ThemedText type="meta" themeColor="ink2">
            {horario.motivo}
          </ThemedText>
        ) : null}
      </Caja>
    );
  }

  return (
    <View style={!compacto && styles.lista}>
      {horario.clases.map((c, i) => {
        const siguiente = horario.clases[i + 1];
        const descanso =
          siguiente && horario.descanso && c.fin === horario.descanso.inicio
            ? horario.descanso
            : undefined;
        return (
          <View key={`${c.modulo}-${c.inicio}`}>
            <ClaseRow clase={c} dia={dia} nowMs={nowMs} compacto={compacto} />
            {descanso ? (
              <View style={styles.clase}>
                <ThemedText type="cifra" themeColor="ink3" style={styles.hora}>
                  {descanso.inicio}
                </ThemedText>
                <View style={[styles.barraDescanso, { borderColor: theme.line2 }]} />
                <ThemedText type="label" themeColor="ink3" style={styles.descansoTexto}>
                  Descanso · {minutos(descanso.fin) - minutos(descanso.inicio)} min
                </ThemedText>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function ClaseRow({
  clase,
  dia,
  nowMs,
  compacto,
}: {
  clase: Clase;
  dia: Date;
  nowMs: number;
  compacto?: boolean;
}) {
  const theme = useTheme();
  const { tema } = useThemePreference();
  const { snapshot } = useMoodle();
  const m = MODULOS[clase.modulo];
  const curso = snapshot?.courses.find((c) => moduloDe(c.fullname) === (clase.modulo as ModuloId));

  const ahora = new Date(nowMs);
  const mismoDia = dayKey(ahora) === dayKey(dia);
  const minAhora = ahora.getHours() * 60 + ahora.getMinutes();
  const enCurso = mismoDia && minAhora >= minutos(clase.inicio) && minAhora < minutos(clase.fin);
  const acabada = mismoDia && minAhora >= minutos(clase.fin);
  const nombrePila = m.profesor.split(' ')[0];

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
      style={({ pressed }) => [
        styles.clase,
        tema === 'cuaderno' && [
          styles.cuadernoClase,
          {
            backgroundColor: theme.surface,
            borderColor: theme.line,
            borderLeftColor: theme[clase.modulo],
          },
        ],
        { opacity: pressed ? 0.7 : acabada ? 0.5 : 1 },
      ]}>
      <ThemedText type="cifra" themeColor="ink3" style={styles.hora}>
        {clase.inicio}
      </ThemedText>
      {tema === 'cuaderno' ? null : (
        <View style={[styles.barra, { backgroundColor: theme[clase.modulo] }]} />
      )}
      <View style={styles.body}>
        <View style={styles.tituloFila}>
          <ThemedText type="smallBold" numberOfLines={1} style={styles.flexShrink}>
            {compacto ? clase.modulo : `${clase.modulo} · ${m.corto}`}
          </ThemedText>
          {enCurso ? <Marca texto="Ahora" color={theme.brandInk} fondo={theme.brand} /> : null}
        </View>
        <ThemedText type="meta" themeColor="ink2" numberOfLines={1}>
          {compacto
            ? `${nombrePila} · ${AULA}`
            : `${m.profesor} · aula ${AULA} · hasta ${clase.fin}`}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.three },
  semanaFila: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  flecha: {
    width: 30,
    height: 30,
    borderRadius: Radii.control,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dias: { flex: 1, flexDirection: 'row', gap: 3 },
  dia: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: Radii.control,
    gap: 2,
  },
  diaLetra: { fontSize: 9.5 },
  diaNum: { fontSize: 15, lineHeight: 19, fontWeight: 700 },
  diaDot: { width: 4, height: 4, borderRadius: 2 },
  volverHoy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'center',
    marginTop: -6,
  },
  lista: { gap: 2 },
  clase: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 },
  hora: { width: 40, fontSize: 12 },
  barra: { width: 3, alignSelf: 'stretch', borderRadius: 2 },
  barraDescanso: {
    width: 0,
    alignSelf: 'stretch',
    borderLeftWidth: 1.5,
    borderStyle: 'dashed',
    marginHorizontal: 0.75,
  },
  descansoTexto: { fontSize: 9.5, letterSpacing: 1 },
  body: { flex: 1, gap: 2 },
  tituloFila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flexShrink: { flexShrink: 1 },
  sinClase: { borderLeftWidth: 3, gap: 2 },
  cuadernoClase: {
    borderWidth: 1,
    borderLeftWidth: 3,
    borderRadius: 9,
    paddingHorizontal: 9,
    marginVertical: 4,
  },
  nada: { paddingVertical: 12 },
});
