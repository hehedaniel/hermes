/**
 * Pendientes en el diseño Obsidiana (escritorio), reproducido del HTML de Stitch:
 * cabecera con fecha, cuatro cifras, filtro por asignatura y, a la derecha, «Ahora mismo»,
 * «Sincronización» y «Carga por asignatura».
 */
import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Etiqueta, fechaEditorial, O, Punto, T, Tarjeta, useArriba, useMovil, usePadX } from '@/components/obs';
import { useNow } from '@/hooks/use-now';
import type { Entrega } from '@/lib/data';
import { haceCuanto, hora, MESES, quedan } from '@/lib/format';
import { MODULOS, horarioDelDia, minutos } from '@/lib/horario';
import { useAsignaturas, useMoodle } from '@/lib/store';

const DIA = 86400;

export const diaCorto = (ts: number) => {
  const d = new Date(ts * 1000);
  return `${String(d.getDate()).padStart(2, '0')} ${MESES[d.getMonth()].slice(0, 3)}`;
};
export const diaHora = (ts: number) => `${diaCorto(ts)} · ${hora(new Date(ts * 1000))}`;

export function PendientesObsidiana() {
  const movil = useMovil();
  const padX = usePadX();
  const arriba = useArriba();
  const { snapshot, syncing, refresh } = useMoodle();
  const info = useAsignaturas();
  const nowMs = useNow();
  const ahora = nowMs / 1000;
  const [filtro, setFiltro] = useState<number | 'todas'>('todas');

  const todas = useMemo(() => snapshot?.entregas ?? [], [snapshot?.entregas]);
  const filtradas = useMemo(
    () => (filtro === 'todas' ? todas : todas.filter((e) => e.cursoId === filtro)),
    [todas, filtro],
  );
  const vencidas = filtradas
    .filter((e) => e.estado === 'vencida')
    .sort((a, b) => b.fecha - a.fecha);
  const abiertas = filtradas
    .filter((e) => e.estado === 'pendiente' || e.estado === 'borrador')
    .sort((a, b) => (a.fecha || Infinity) - (b.fecha || Infinity));
  const cerradas = filtradas
    .filter((e) => e.estado === 'entregada')
    .sort((a, b) => (b.envio?.fecha ?? b.fecha) - (a.envio?.fecha ?? a.fecha));
  const urgentes = abiertas.filter((e) => e.fecha && e.fecha > ahora && e.fecha - ahora < 2 * DIA);

  const cursos = useMemo(
    () =>
      (snapshot?.courses ?? [])
        .filter((c) => !/punto de encuentro/i.test(c.fullname))
        .map((c) => ({
          id: c.id,
          a: info(c.id, c.fullname),
          n: todas.filter(
            (e) =>
              e.cursoId === c.id &&
              (e.estado === 'pendiente' || e.estado === 'borrador' || e.estado === 'vencida'),
          ).length,
        })),
    [snapshot?.courses, todas, info],
  );

  // Ahora mismo: la clase en curso o la siguiente de hoy
  const hoy = new Date(nowMs);
  const horario = horarioDelDia(hoy);
  const minAhora = hoy.getHours() * 60 + hoy.getMinutes();
  let ahoraMismo = { titulo: 'Sin clase en este momento.', sub: '' };
  if (horario.tipo === 'clases') {
    const enCurso = horario.clases.find(
      (c) => minAhora >= minutos(c.inicio) && minAhora < minutos(c.fin),
    );
    const siguiente = horario.clases.find((c) => minutos(c.inicio) > minAhora);
    if (enCurso) {
      ahoraMismo = { titulo: MODULOS[enCurso.modulo].nombre, sub: `Hasta las ${enCurso.fin}` };
    } else if (siguiente) {
      ahoraMismo.sub = `Siguiente: ${MODULOS[siguiente.modulo].corto} a las ${siguiente.inicio}`;
    }
  } else if (horario.tipo === 'sin-clase') {
    ahoraMismo.sub = horario.motivo;
  }

  const sincronizado = snapshot ? haceCuanto(snapshot.syncedAt, nowMs) : null;
  const abrir = (e: Entrega) => router.push({ pathname: '/tarea/[key]', params: { key: e.key } });
  const nCursos = cursos.length;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: O.bg }}
      contentContainerStyle={{ paddingHorizontal: padX, paddingTop: 32 + arriba, paddingBottom: 32 }}>
      <View style={{ width: '100%', maxWidth: 1240, alignSelf: 'center', gap: 28 }}>
        {/* Cabecera */}
        <View style={{ flexDirection: movil ? 'column' : 'row', alignItems: movil ? 'flex-start' : 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <View style={{ flex: movil ? undefined : 1 }}>
            <Etiqueta s={10.5} ls={0.25} c="#686875" style={{ marginBottom: 4 }}>
              {fechaEditorial(hoy)}
            </Etiqueta>
            <T k="serif" s={movil ? 36 : 42} lh={movil ? 44 : 52} c={O.white} ls={-0.025}>
              Pendientes
            </T>
            <T s={13} c="#7D7D8A" style={{ marginTop: 4, maxWidth: 576 }}>
              {nCursos === 1 ? 'Una asignatura sincronizada' : `${numero(nCursos)} asignaturas sincronizadas`} con
              el campus. Aquí tienes lo que hay que entregar, por orden de plazo.
            </T>
          </View>
          <Pressable
            onPress={() => refresh()}
            disabled={syncing}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: 99,
              borderWidth: 1,
              borderColor: '#232328',
              backgroundColor: '#121216',
            }}>
            <Feather name="refresh-cw" size={12} color="#7E7E8B" />
            <T k="mono" up s={10} ls={0.05} c="#7E7E8B">
              {syncing ? 'Sincronizando…' : sincronizado ? `Sincronizado ${sincronizado}` : 'Sin sincronizar'}
            </T>
          </Pressable>
        </View>

        {/* Cifras */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: movil ? 10 : 14 }}>
          <Cifra etiqueta="Por entregar" n={abiertas.length} unidad="abiertas" />
          <Cifra etiqueta="Urgentes" n={urgentes.length} unidad="< 48 h" color={urgentes.length ? O.lime : O.white} />
          <Cifra etiqueta="Vencidas" n={vencidas.length} unidad="sin entregar" />
          <Cifra etiqueta="Cerradas" n={cerradas.length} unidad="entregadas" />
        </View>

        {/* Filtros */}
        <ScrollView
          horizontal={movil}
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, marginHorizontal: movil ? -padX : 0 }}
          contentContainerStyle={{ flexDirection: 'row', flexWrap: movil ? 'nowrap' : 'wrap', alignItems: 'center', gap: 8, paddingTop: 4, paddingHorizontal: movil ? padX : 0, marginTop: movil ? 0 : -8 }}>
          <Pressable
            onPress={() => setFiltro('todas')}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: 99,
              borderWidth: 1,
              backgroundColor: filtro === 'todas' ? O.limeWash : '#121215',
              borderColor: filtro === 'todas' ? O.limeLine : '#212126',
            }}>
            <T k="mono" up s={11} w={600} ls={0.05} c={filtro === 'todas' ? O.lime : '#868694'}>
              Todas
            </T>
          </Pressable>
          {cursos.map((x) => {
            const activo = filtro === x.id;
            return (
              <Pressable
                key={x.id}
                onPress={() => setFiltro(activo ? 'todas' : x.id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: 99,
                  borderWidth: 1,
                  backgroundColor: activo ? '#1A1A20' : '#121215',
                  borderColor: activo ? '#3A3A44' : '#212126',
                }}>
                <Punto color={x.a.color} />
                <T k="mono" s={11} c={activo ? '#D3D3DD' : '#868694'}>
                  {x.a.corto.split(' ')[0]}
                </T>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Listas + columna derecha */}
        <View style={{ flexDirection: movil ? 'column' : 'row', gap: 28, alignItems: movil ? 'stretch' : 'flex-start', paddingTop: 8 }}>
          <View style={{ flex: movil ? undefined : 2, minWidth: 0, gap: 24 }}>
            {vencidas.length ? (
              <Lista titulo="Vencidas" n={vencidas.length}>
                {vencidas.map((e) => (
                  <Fila key={e.key} e={e} info={info} ahora={ahora} nowMs={nowMs} onPress={() => abrir(e)} />
                ))}
              </Lista>
            ) : null}
            <Lista titulo="Por entregar" n={abiertas.length}>
              {abiertas.length ? (
                abiertas.map((e) => (
                  <Fila key={e.key} e={e} info={info} ahora={ahora} nowMs={nowMs} onPress={() => abrir(e)} />
                ))
              ) : (
                <T s={12.5} c={O.t3}>
                  No tienes nada pendiente.
                </T>
              )}
            </Lista>
            {cerradas.length ? (
              <Lista titulo="Cerradas" n={cerradas.length}>
                {cerradas.slice(0, 6).map((e) => (
                  <Fila key={e.key} e={e} info={info} ahora={ahora} nowMs={nowMs} cerrada onPress={() => abrir(e)} />
                ))}
              </Lista>
            ) : null}
          </View>

          <View style={{ flex: movil ? undefined : 1, minWidth: movil ? 0 : 260, gap: 16 }}>
            <Tarjeta radius={12} borde={O.line} style={{ padding: 20 }}>
              <Etiqueta s={9.5} ls={0.2} c="#60606D" style={{ marginBottom: 8 }}>
                Ahora mismo
              </Etiqueta>
              <T s={14} w={600} c={O.white} style={{ marginBottom: ahoraMismo.sub ? 8 : 0 }}>
                {ahoraMismo.titulo}
              </T>
              {ahoraMismo.sub ? (
                <T s={12.5} c="#7E7E8D" lh={20}>
                  {ahoraMismo.sub}
                </T>
              ) : null}
            </Tarjeta>

            <Tarjeta radius={12} borde={O.line} style={{ padding: 20 }}>
              <Etiqueta s={9.5} ls={0.2} c="#60606D" style={{ marginBottom: 10 }}>
                Sincronización
              </Etiqueta>
              <T s={12.5} c="#7E7E8D" lh={20} style={{ marginBottom: 16 }}>
                {sincronizado
                  ? `Última sincronización con el campus ${sincronizado}.`
                  : 'Todavía no se ha sincronizado con el campus.'}
              </T>
              <Pressable
                onPress={() => refresh()}
                disabled={syncing}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#26262E',
                  backgroundColor: '#141418',
                }}>
                <Feather name="refresh-cw" size={14} color="#9E9EA8" />
                <T k="mono" up s={11} w={600} ls={0.05} c={O.white}>
                  {syncing ? 'Sincronizando…' : 'Sincronizar ahora'}
                </T>
              </Pressable>
            </Tarjeta>

            <Tarjeta radius={12} borde={O.line} style={{ padding: 20 }}>
              <Etiqueta s={9.5} ls={0.2} c="#60606D" style={{ marginBottom: 14 }}>
                Carga por asignatura
              </Etiqueta>
              <View style={{ gap: 12 }}>
                {cursos.map((x) => (
                  <View key={x.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                      <Punto color={x.a.color} />
                      <T s={12.5} c="#8E8E9C" numberOfLines={1} style={{ flex: 1 }}>
                        {x.a.nombre}
                      </T>
                    </View>
                    <T k="mono" s={11} w={500} c="#6B6B77" style={{ paddingLeft: 8 }}>
                      {x.n}
                    </T>
                  </View>
                ))}
              </View>
            </Tarjeta>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const NUMEROS = ['Cero', 'Una', 'Dos', 'Tres', 'Cuatro', 'Cinco', 'Seis', 'Siete', 'Ocho', 'Nueve'];
const numero = (n: number) => NUMEROS[n] ?? String(n);

function Cifra({ etiqueta, n, unidad, color = O.white }: { etiqueta: string; n: number; unidad: string; color?: string }) {
  const movil = useMovil();
  return (
    <Tarjeta radius={12} borde={O.line} style={movil ? { flexGrow: 1, flexBasis: '45%', paddingHorizontal: 16, paddingVertical: 14 } : { flex: 1, paddingHorizontal: 20, paddingVertical: 16 }}>
      <Etiqueta s={9.5} ls={0.2} c="#6B6B77" style={{ marginBottom: 8 }}>
        {etiqueta}
      </Etiqueta>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
        <T w={300} s={24} lh={32} c={color} ls={-0.025}>
          {n}
        </T>
        <T s={12} c="#71717E">
          {unidad}
        </T>
      </View>
    </Tarjeta>
  );
}

function Lista({ titulo, n, children }: { titulo: string; n: number; children: React.ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 4 }}>
        <Etiqueta s={10} ls={0.2} c="#61616C">
          {titulo}
        </Etiqueta>
        <T k="mono" s={10} c="#555560">
          {n} {n === 1 ? 'tarea' : 'tareas'}
        </T>
      </View>
      {children}
    </View>
  );
}

const ESTADO = {
  borrador: { t: 'Borrador', c: O.amber, bg: O.amberWash, b: O.amberLine },
  pendiente: { t: 'Pendiente', c: '#9393A2', bg: O.pendWash, b: O.pendLine },
  vencida: { t: 'Vencida', c: O.red, bg: '#2A1818', b: '#4A2424' },
  entregada: { t: 'Entregada', c: '#84CC16', bg: '#171D18', b: '#212F22' },
} as const;

function Fila({
  e,
  info,
  ahora,
  nowMs,
  cerrada,
  onPress,
}: {
  e: Entrega;
  info: ReturnType<typeof useAsignaturas>;
  ahora: number;
  nowMs: number;
  cerrada?: boolean;
  onPress: () => void;
}) {
  const a = info(e.cursoId, e.curso);
  const restante = e.fecha ? e.fecha - ahora : 0;
  const colorRestante =
    e.estado === 'vencida'
      ? O.red
      : restante < 2 * DIA
        ? O.amber
        : restante < 7 * DIA
          ? O.lime
          : '#737380';
  const est = ESTADO[e.estado];
  const movil = useMovil();
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: cerrada ? 'rgba(16,16,19,0.7)' : O.card,
        borderWidth: 1,
        borderColor: cerrada ? '#1A1A20' : '#1F1F25',
        borderRadius: 12,
        padding: 16,
        paddingLeft: 20,
        flexDirection: movil ? 'column' : 'row',
        alignItems: movil ? 'stretch' : 'center',
        justifyContent: 'space-between',
        gap: movil ? 12 : 0,
        opacity: cerrada ? 0.8 : 1,
      }}>
      <View
        style={{
          position: 'absolute',
          left: 12,
          top: 14,
          bottom: 14,
          width: 3,
          borderRadius: 99,
          backgroundColor: cerrada ? O.green : a.color,
        }}
      />
      <View style={{ paddingLeft: 14, flex: movil ? undefined : 1, minWidth: 0, maxWidth: movil ? undefined : 340 }}>
        <T s={13.5} w={cerrada ? 500 : 600} c={cerrada ? '#8F8F9E' : O.white} numberOfLines={1}>
          {e.nombre}
        </T>
        {!cerrada ? (
          <Etiqueta s={9} ls={0.16} c="#6B6B77" w={400} numberOfLines={1} style={{ marginTop: 4 }}>
            {a.nombre}
            {a.profesor ? ` · ${a.profesor}` : ''}
          </Etiqueta>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: movil ? 'space-between' : undefined, gap: 20, paddingLeft: movil ? 14 : 0 }}>
        <View style={{ alignItems: movil ? 'flex-start' : 'flex-end' }}>
          {e.fecha ? (
            <T k="mono" s={11} w={cerrada ? 400 : 500} c={cerrada ? '#686873' : '#E0E0E8'}>
              {diaHora(e.fecha)}
            </T>
          ) : null}
          {!cerrada && e.fecha ? (
            <T k="mono" s={10} w={500} c={colorRestante}>
              {e.estado === 'vencida' ? 'Plazo cerrado' : quedan(e.fecha, nowMs)}
            </T>
          ) : null}
        </View>
        {!cerrada ? (
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 99,
              borderWidth: 1,
              backgroundColor: est.bg,
              borderColor: est.b,
            }}>
            <T k="mono" up s={9.5} w={600} ls={0.05} c={est.c}>
              • {est.t}
            </T>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}
