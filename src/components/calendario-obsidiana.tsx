/**
 * Calendario en el diseño Obsidiana (escritorio), reproducido del HTML de Stitch:
 * cabecera con título, mes en cuadrícula y, a la derecha, el panel del día seleccionado
 * con las clases, los eventos de Google Calendar y las entregas del día.
 */
import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Linking, Pressable, ScrollView, type StyleProp, View, type ViewStyle } from 'react-native';

import { fechaEditorial, O, Punto, T, useArriba, useMovil, usePadX } from '@/components/obs';
import { useNow } from '@/hooks/use-now';
import type { Entrega } from '@/lib/data';
import { dayKey, hora, MESES } from '@/lib/format';
import { eventosPorDia, useGoogleCal } from '@/lib/google-cal';
import {
  AULA,
  MODULOS,
  TIPOS_SIN_CLASE,
  claveDia,
  eventoSinClase,
  examenesDelDia,
  horarioDelDia,
  limitarMes,
  motivoSinClase,
  tipoSinClase,
} from '@/lib/horario';
import { useHorario } from '@/lib/use-horario';
import { useAsignaturas, useMoodle } from '@/lib/store';

const DIA = 86400000;
const ZINC = {
  z100: '#F4F4F5',
  z200: '#E4E4E7',
  z300: '#D4D4D8',
  z400: '#A1A1AA',
  z500: '#71717A',
  z600: '#52525B',
};

const deClave = (k: string) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** Semanas (lunes a domingo) que cubren el mes. */
/** Violeta: no se confunde con el rojo de los festivos, el ámbar de formación ni el lima de hoy. */
const COLOR_EXAMEN = '#A78BFA';

function semanasDe(mes: Date) {
  const primero = new Date(mes.getFullYear(), mes.getMonth(), 1);
  const lunes = new Date(primero);
  lunes.setDate(1 - ((primero.getDay() + 6) % 7));
  const ultimo = new Date(mes.getFullYear(), mes.getMonth() + 1, 0);
  const semanas: Date[][] = [];
  const d = new Date(lunes);
  while (d <= ultimo || semanas.length < 5) {
    const semana: Date[] = [];
    for (let i = 0; i < 7; i++) {
      semana.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    semanas.push(semana);
    if (semanas.length === 6) break;
  }
  return semanas;
}

export function CalendarioObsidiana() {
  useHorario();
  const movil = useMovil();
  const padX = usePadX(32);
  const arriba = useArriba();
  const { snapshot } = useMoodle();
  const info = useAsignaturas();
  const google = useGoogleCal();
  const { cargarRango } = google;
  const nowMs = useNow();
  const hoy = new Date(nowMs);
  const [mes, setMes] = useState(() => new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  const [elegido, setElegido] = useState(() => dayKey(new Date()));

  const semanas = useMemo(() => semanasDe(mes), [mes]);
  const desde = semanas[0][0].getTime();
  const hasta = semanas[semanas.length - 1][6].getTime() + DIA;
  useEffect(() => {
    Promise.resolve().then(() => cargarRango(desde, hasta));
  }, [cargarRango, desde, hasta]);

  const porDia = useMemo(() => {
    const m = new Map<string, Entrega[]>();
    for (const e of snapshot?.entregas ?? []) {
      if (!e.fecha) continue;
      const k = dayKey(new Date(e.fecha * 1000));
      m.set(k, [...(m.get(k) ?? []), e]);
    }
    return m;
  }, [snapshot]);
  const googlePorDia = useMemo(() => eventosPorDia(google.eventos, dayKey), [google.eventos]);

  const mover = (delta: number) =>
    setMes((c) => limitarMes(new Date(c.getFullYear(), c.getMonth() + delta, 1)));
  const enPrimerMes = limitarMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1)) >= mes;
  const tituloMes = `${MESES[mes.getMonth()]} de ${mes.getFullYear()}`.replace(/^\w/, (c) =>
    c.toUpperCase(),
  );
  const hoyKey = dayKey(hoy);

  return (
    <View style={{ flex: 1, backgroundColor: '#0C0C0E', minWidth: 0 }}>
      {/* Cabecera */}
      <View
        style={{
          paddingHorizontal: padX,
          paddingTop: 28 + arriba,
          paddingBottom: 20,
          borderBottomWidth: 1,
          borderBottomColor: '#18181D',
          flexDirection: movil ? 'column' : 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: movil ? 14 : 0,
        }}>
        <View style={{ flex: movil ? undefined : 1 }}>
          <T w={600} up s={10} ls={0.22} c={ZINC.z500} style={{ marginBottom: 4 }}>
            Horario y plazos
          </T>
          <T
            k="serif"
            w={500}
            s={movil ? 34 : 38}
            lh={movil ? 38 : 38}
            c={ZINC.z100}
            ls={-0.025}
            style={{ marginBottom: 8 }}>
            Calendario
          </T>
          <T s={13} lh={21} c={ZINC.z400} style={{ maxWidth: 672 }}>
            Entregas, clases del día y festivos del curso.
            {google.url ? ' Puedes superponer los eventos de tu calendario personal.' : ''}
          </T>
        </View>
        <Pressable
          onPress={() => (google.url ? undefined : router.push('/ajustes'))}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 14,
            paddingVertical: 6,
            borderRadius: 99,
            borderWidth: 1,
            marginTop: movil ? 0 : 8,
            borderColor: google.url ? '#2B2F21' : '#26262E',
            backgroundColor: google.url ? '#141710' : '#121216',
          }}>
          <Punto color={google.url ? '#84CC16' : ZINC.z600} />
          <T k="mono" up s={10.5} w={500} ls={0.05} c={google.url ? '#A9BA6B' : ZINC.z500}>
            {google.url ? 'Google Calendar' : 'Conectar Google Calendar'}
          </T>
        </Pressable>
      </View>

      <ScrollView
        scrollEnabled={movil}
        style={{ flex: 1 }}
        contentContainerStyle={movil ? { paddingBottom: 24 } : { flexGrow: 1 }}>
        <View
          style={{
            flex: movil ? undefined : 1,
            flexDirection: movil ? 'column' : 'row',
            minHeight: 0,
          }}>
          {/* Mes */}
          <Desliza
            movil={movil}
            style={movil ? { flexGrow: 0 } : { flex: 1 }}
            contentContainerStyle={{ padding: movil ? padX : 32 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 20,
              }}>
              <T k="serif" w={500} s={movil ? 24 : 27} lh={36} c={ZINC.z100} ls={-0.01}>
                {tituloMes}
              </T>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {([-1, 1] as const).map((d) => (
                  <Pressable
                    key={d}
                    onPress={() => mover(d)}
                    disabled={d < 0 && enPrimerMes}
                    accessibilityLabel={d < 0 ? 'Mes anterior' : 'Mes siguiente'}
                    style={{
                      opacity: d < 0 && enPrimerMes ? 0.3 : 1,
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: '#222228',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Feather
                      name={d < 0 ? 'chevron-left' : 'chevron-right'}
                      size={14}
                      color={ZINC.z400}
                    />
                  </Pressable>
                ))}
              </View>
            </View>

            <View
              style={{
                borderWidth: 1,
                borderColor: '#1F1F25',
                borderRadius: 12,
                overflow: 'hidden',
                backgroundColor: '#0D0D10',
                minHeight: movil ? 0 : 580,
              }}>
              <View
                style={{
                  flexDirection: 'row',
                  borderBottomWidth: 1,
                  borderBottomColor: '#1F1F25',
                }}>
                {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => (
                  <View key={d} style={{ flex: 1, paddingVertical: 10, alignItems: 'center' }}>
                    <T w={500} s={11} c={ZINC.z500}>
                      {d}
                    </T>
                  </View>
                ))}
              </View>
              {semanas.map((semana, si) => (
                <View key={si} style={{ flexDirection: 'row', flex: 1 }}>
                  {semana.map((d, di) => {
                    const k = dayKey(d);
                    const fuera = d.getMonth() !== mes.getMonth();
                    const finde = di >= 5;
                    const sel = k === elegido;
                    const festivo = !finde ? motivoSinClase(d) : null;
                    const tipoFestivo = festivo ? tipoSinClase(d) : null;
                    const colorFestivo =
                      tipoFestivo === 'formacion' ||
                      tipoFestivo === 'excursion' ||
                      tipoFestivo === 'otro'
                        ? '#E0A93C'
                        : '#E0564C';
                    const examenes = examenesDelDia(k);
                    const entregas = porDia.get(k) ?? [];
                    const eventos = (googlePorDia.get(k) ?? []).length;
                    const colorNum = fuera ? ZINC.z600 : finde ? ZINC.z400 : ZINC.z300;
                    return (
                      <Pressable
                        key={k}
                        onPress={() => {
                          setElegido(k);
                          if (fuera) setMes(limitarMes(new Date(d.getFullYear(), d.getMonth(), 1)));
                        }}
                        style={{
                          flex: 1,
                          minHeight: movil ? 54 : 92,
                          padding: movil ? 6 : 10,
                          justifyContent: 'space-between',
                          borderLeftWidth: di === 0 ? 0 : 1,
                          borderTopWidth: si === 0 ? 0 : 1,
                          borderColor: '#1F1F25',
                          backgroundColor: sel
                            ? '#1C1D22'
                            : finde
                              ? 'rgba(9,9,11,0.5)'
                              : 'transparent',
                          opacity: fuera ? 0.6 : 1,
                          ...(sel ? { borderWidth: 2, borderColor: '#2B2C34' } : null),
                        }}>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}>
                          {sel || (k === hoyKey && !fuera) ? (
                            <View
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: 10,
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: sel ? '#E2F17D' : 'transparent',
                                borderWidth: sel ? 0 : 1,
                                borderColor: '#E2F17D',
                              }}>
                              <T w={700} s={11} c={sel ? '#141708' : '#E2F17D'}>
                                {d.getDate()}
                              </T>
                            </View>
                          ) : (
                            <T k="mono" s={12} c={colorNum}>
                              {d.getDate()}
                            </T>
                          )}
                          {festivo ? <Punto color={colorFestivo} /> : null}
                        </View>
                        {movil ? (
                          <View
                            style={{
                              flexDirection: 'row',
                              flexWrap: 'wrap',
                              gap: 3,
                              minHeight: 6,
                            }}>
                            {entregas.slice(0, 3).map((e) => (
                              <Punto key={e.key} color={info(e.cursoId, e.curso).color} size={5} />
                            ))}
                            {eventos ? <Punto color={ZINC.z500} size={5} /> : null}
                            {examenes.length ? <Punto color={COLOR_EXAMEN} size={5} /> : null}
                          </View>
                        ) : (
                          <View style={{ gap: 2 }}>
                            {examenes.length ? (
                              <T k="mono" up s={9} ls={0.05} c={COLOR_EXAMEN}>
                                Examen
                              </T>
                            ) : null}
                            {festivo ? (
                              <T k="mono" up s={9} ls={0.05} c={colorFestivo}>
                                {TIPOS_SIN_CLASE[tipoFestivo ?? 'festivo']}
                              </T>
                            ) : null}
                            {finde && !entregas.length ? (
                              <T
                                k="mono"
                                up
                                s={8}
                                ls={0.05}
                                c={fuera ? '#3F3F46' : ZINC.z600}
                                lh={10}>
                                {'Fin de\nsemana'}
                              </T>
                            ) : null}
                            {entregas.slice(0, 2).map((e) => (
                              <View
                                key={e.key}
                                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Punto color={info(e.cursoId, e.curso).color} />
                                <T s={10.5} c={ZINC.z300} numberOfLines={1} style={{ flex: 1 }}>
                                  {e.nombre}
                                </T>
                              </View>
                            ))}
                            {entregas.length > 2 ? (
                              <T k="mono" s={9.5} c={ZINC.z500}>
                                +{entregas.length - 2} más
                              </T>
                            ) : null}
                            {eventos ? (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Feather name="calendar" size={9} color={ZINC.z500} />
                                <T k="mono" s={9.5} c={ZINC.z500}>
                                  {eventos}
                                </T>
                              </View>
                            ) : null}
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
          </Desliza>

          <PanelDia
            dia={deClave(elegido)}
            entregas={porDia.get(elegido) ?? []}
            eventos={googlePorDia.get(elegido) ?? []}
            movil={movil}
            padX={padX}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function PanelDia({
  dia,
  entregas,
  eventos,
  movil,
  padX,
}: {
  movil: boolean;
  padX: number;
  dia: Date;
  entregas: Entrega[];
  eventos: ReturnType<typeof eventosPorDia> extends Map<string, infer V> ? V : never;
}) {
  const info = useAsignaturas();
  const google = useGoogleCal();
  useHorario();
  const horario = horarioDelDia(dia);
  const examenes = examenesDelDia(claveDia(dia));
  const ev = eventoSinClase(dia);
  const agenda = [...eventos].sort(
    (a, b) => Number(b.todoElDia) - Number(a.todoElDia) || a.inicio - b.inicio,
  );

  return (
    <Desliza
      movil={movil}
      style={
        movil
          ? { flexGrow: 0 }
          : {
              width: 390,
              borderLeftWidth: 1,
              borderLeftColor: '#19191E',
              backgroundColor: '#0C0C0F',
              flexGrow: 0,
            }
      }
      contentContainerStyle={{ padding: movil ? padX : 24, paddingTop: movil ? 0 : 24, gap: 24 }}>
      <View
        style={{
          borderWidth: 1,
          borderColor: '#1F1F26',
          borderRadius: 16,
          padding: 20,
          backgroundColor: 'rgba(15,15,19,0.6)',
        }}>
        <T w={600} up s={9.5} ls={0.2} c={ZINC.z500} style={{ marginBottom: 4 }}>
          Día seleccionado
        </T>
        <T k="serif" w={500} s={26} lh={32} c={ZINC.z100} style={{ marginBottom: 20 }}>
          {fechaEditorial(dia)}
        </T>

        {examenes.map((x) => (
          <View
            key={x.titulo}
            style={{
              marginBottom: 14,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: COLOR_EXAMEN,
              backgroundColor: '#17141F',
              padding: 12,
              gap: 4,
            }}>
            <T k="mono" up s={9} ls={0.15} c={COLOR_EXAMEN}>
              Examen{x.hora ? ` · ${x.hora}` : ''}
            </T>
            <T w={500} s={13} lh={18} c={ZINC.z100}>
              {x.titulo}
            </T>
            <T k="mono" up s={9.5} ls={0.05} c={ZINC.z500}>
              {MODULOS[x.modulo].nombre}
            </T>
          </View>
        ))}

        {horario.tipo === 'clases' ? (
          <View style={{ gap: 10 }}>
            {horario.clases.map((c, i) => {
              const m = MODULOS[c.modulo];
              const color = info(0, m.nombre).color;
              const siguiente = horario.clases[i + 1];
              const descanso =
                horario.descanso && c.fin === horario.descanso.inicio && siguiente
                  ? horario.descanso
                  : null;
              return (
                <View key={c.inicio} style={{ gap: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'stretch', gap: 12 }}>
                    <View
                      style={{
                        width: 48,
                        paddingVertical: 10,
                        alignItems: 'flex-end',
                        justifyContent: 'space-between',
                      }}>
                      <T k="mono" w={600} s={10} lh={10} c={ZINC.z300}>
                        {c.inicio}
                      </T>
                      <T k="mono" s={10} lh={10} c={ZINC.z500}>
                        {c.fin}
                      </T>
                    </View>
                    <View
                      style={{
                        flex: 1,
                        backgroundColor: '#15151A',
                        borderWidth: 1,
                        borderColor: '#23232C',
                        borderLeftWidth: 3.5,
                        borderLeftColor: color,
                        borderRadius: 12,
                        padding: 12,
                      }}>
                      <T w={500} s={12.5} lh={17} c={ZINC.z100}>
                        {m.nombre}
                      </T>
                      <T k="mono" up s={9.5} ls={0.05} c={ZINC.z500} style={{ marginTop: 4 }}>
                        {m.profesor} · Aula {AULA}
                      </T>
                    </View>
                  </View>
                  {descanso ? (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        paddingVertical: 4,
                        paddingLeft: 60,
                      }}>
                      <T k="mono" s={9.5} c={ZINC.z500}>
                        {descanso.inicio} - {descanso.fin}
                      </T>
                      <View
                        style={{
                          flex: 1,
                          borderBottomWidth: 1,
                          borderBottomColor: '#24242E',
                          borderStyle: 'dashed',
                        }}
                      />
                      <T k="mono" up s={8.5} ls={0.1} c={ZINC.z500}>
                        Descanso
                      </T>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            <T s={12.5} lh={19} c={ZINC.z500}>
              {horario.tipo === 'fin-de-semana' ? 'Fin de semana: no hay clases.' : horario.motivo}
            </T>
            {ev ? (
              <View
                style={{
                  padding: 14,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: '#3A2F14',
                  backgroundColor: '#17130A',
                  gap: 6,
                }}>
                {ev.inicio ? (
                  <T k="mono" s={10.5} c="#F5B544">
                    {ev.inicio}
                    {ev.fin ? ` - ${ev.fin}` : ''}
                  </T>
                ) : null}
                {ev.descripcion ? (
                  <T s={13.5} lh={20}>
                    {ev.descripcion}
                  </T>
                ) : null}
                {ev.enlace ? (
                  <Pressable
                    accessibilityRole="link"
                    onPress={() => void Linking.openURL(ev.enlace as string)}>
                    <T k="mono" s={10.5} c={O.lime}>
                      Ver lugar en el mapa
                    </T>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
        )}

        {google.url ? (
          <View
            style={{ marginTop: 24, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#1A1A22' }}>
            <T w={600} up s={9} ls={0.2} c={ZINC.z500} style={{ marginBottom: 10 }}>
              Desde tu Google Calendar
            </T>
            {google.error ? (
              <T s={12.5} c={O.red}>
                {google.error}
              </T>
            ) : agenda.length ? (
              <View style={{ gap: 8 }}>
                {agenda.map((e) => (
                  <View
                    key={e.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 12,
                      borderRadius: 12,
                      backgroundColor: '#141418',
                      borderWidth: 1,
                      borderColor: '#212128',
                    }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                        flex: 1,
                        minWidth: 0,
                      }}>
                      <Feather name="calendar" size={14} color={ZINC.z400} />
                      <T s={12} c={ZINC.z200} numberOfLines={1} style={{ flex: 1 }}>
                        {e.titulo || '(Sin título)'}
                      </T>
                    </View>
                    <T k="mono" s={11} c={ZINC.z400} style={{ marginLeft: 8 }}>
                      {e.todoElDia ? 'Todo el día' : hora(new Date(e.inicio))}
                    </T>
                  </View>
                ))}
              </View>
            ) : (
              <T s={12.5} c={ZINC.z500}>
                {google.cargando ? 'Cargando…' : 'Nada en tu calendario este día.'}
              </T>
            )}
          </View>
        ) : null}
      </View>

      <View
        style={{
          borderWidth: 1,
          borderColor: '#1F1F26',
          borderRadius: 16,
          padding: 20,
          backgroundColor: 'rgba(15,15,19,0.4)',
        }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}>
          <T w={600} up s={9.5} ls={0.2} c={ZINC.z500}>
            Entregas del día
          </T>
          <T k="mono" s={11} c={ZINC.z500}>
            {entregas.length}
          </T>
        </View>
        {entregas.length ? (
          <View style={{ gap: 8, marginTop: 4 }}>
            {entregas.map((e) => {
              const a = info(e.cursoId, e.curso);
              return (
                <Pressable
                  key={e.key}
                  onPress={() => router.push({ pathname: '/tarea/[key]', params: { key: e.key } })}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: '#15151A',
                    borderWidth: 1,
                    borderColor: '#23232C',
                    borderLeftWidth: 3.5,
                    borderLeftColor: a.color,
                  }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <T w={500} s={12.5} c={ZINC.z100} numberOfLines={1}>
                      {e.nombre}
                    </T>
                    <T
                      k="mono"
                      up
                      s={9.5}
                      ls={0.05}
                      c={ZINC.z500}
                      numberOfLines={1}
                      style={{ marginTop: 4 }}>
                      {a.corto}
                    </T>
                  </View>
                  <T k="mono" s={11} c={ZINC.z300}>
                    {hora(new Date(e.fecha * 1000))}
                  </T>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <T s={12.5} lh={19} c={ZINC.z500}>
            Ningún plazo vence este día.
          </T>
        )}
      </View>
    </Desliza>
  );
}

/**
 * En móvil los bloques anidados no son ScrollView: un ScrollView con scroll desactivado se come
 * el gesto (en iPhone y en la web móvil) y no deja deslizar la pantalla entera.
 * Solo en escritorio, donde la columna del día tiene su propio scroll, se usa ScrollView.
 */
function Desliza({
  movil,
  style,
  contentContainerStyle,
  children,
}: {
  movil: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  if (movil) return <View style={[style, contentContainerStyle]}>{children}</View>;
  return (
    <ScrollView style={style} contentContainerStyle={contentContainerStyle} nestedScrollEnabled>
      {children}
    </ScrollView>
  );
}
