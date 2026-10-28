/**
 * Asignatura en el diseño Obsidiana: cabecera con profesor y recuento, unidades plegables y,
 * a la derecha, «Resumen» y «Asistente». Reproducido del HTML de Stitch.
 */
import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Image, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';

import type { IconoFeather } from '@/components/anden';
import { LateralObsidianaFuera } from '@/components/obs-lateral';
import { MarcoObsidiana } from '@/components/obs-marco';
import { Etiqueta, O, T, useMovil } from '@/components/obs';
import type { Archivo, Entrega } from '@/lib/data';
import { archivosDe, type Bloque, type Modulo } from '@/lib/contents';
import { avisar } from '@/lib/dialogo';
import { formatoTamano, useDownloads } from '@/lib/downloads';
import { diaMesHora } from '@/lib/format';
import { AULA, moduloDe } from '@/lib/horario';
import { claveArchivo } from '@/lib/novedades';
import { useProfesorMoodle } from '@/lib/profesor';
import { useAsignaturas, useMoodle } from '@/lib/store';
import { useCourseContents } from '@/lib/use-course-contents';

const ICONO: Record<string, IconoFeather> = {
  assign: 'clipboard',
  quiz: 'check-square',
  forum: 'message-square',
  url: 'link',
  page: 'file-text',
  scorm: 'play-circle',
  folder: 'folder',
  resource: 'file-text',
  book: 'book',
  lesson: 'book',
  choice: 'bar-chart-2',
  feedback: 'message-circle',
  h5pactivity: 'box',
  lti: 'external-link',
};
const TIPO: Record<string, string> = {
  assign: 'Tarea',
  quiz: 'Cuestionario',
  forum: 'Foro',
  url: 'Enlace',
  page: 'Página',
  scorm: 'Lección SCORM',
  folder: 'Carpeta',
  resource: 'Archivo',
  book: 'Libro',
  lesson: 'Lección',
  choice: 'Consulta',
  feedback: 'Encuesta',
  h5pactivity: 'Actividad H5P',
  lti: 'Herramienta externa',
};

const contar = (bloques: Bloque[], tipo: string) =>
  bloques.reduce((n, b) => n + b.modulos.filter((m) => m.tipo === tipo).length, 0);

export function CursoObsidiana({ cursoId, nombre }: { cursoId: number; nombre?: string }) {
  const { contenido, cargando, error } = useCourseContents(cursoId);
  const { snapshot, novedades, client } = useMoodle();
  const { guardaArchivos, estado, descargarVarios } = useDownloads();
  const a = useAsignaturas()(cursoId, nombre);
  const { width } = useWindowDimensions();
  const profe = useProfesorMoodle(client, cursoId, a.profesor);
  const [fotoRota, setFotoRota] = useState(false);
  const [progreso, setProgreso] = useState<{ hechos: number; total: number } | null>(null);

  const bloques = contenido?.bloques ?? [];
  const elementos = bloques.reduce((n, b) => n + b.modulos.length, 0);
  const entregas = (snapshot?.entregas ?? []).filter((e) => e.cursoId === cursoId);
  const pendientes = entregas.filter(
    (e) => e.estado === 'pendiente' || e.estado === 'borrador',
  ).length;
  const tareasConEntrega = bloques.flatMap((b) => b.modulos).filter((m) => m.entregaKey);
  const entregadas = tareasConEntrega.filter(
    (m) => snapshot?.entregas.find((e) => e.key === m.entregaKey)?.estado === 'entregada',
  ).length;
  const archivos = contenido ? archivosDe(contenido) : [];
  const faltan = archivos.filter((x) => estado(x) === 'no' || estado(x) === 'desactualizado');
  const esModulo = !!moduloDe(a.nombre);
  const foros = bloques.flatMap((b) => b.modulos).filter((m) => m.tipo === 'forum');
  const movil = useMovil();
  const padX = width < 500 ? 20 : width >= 1280 ? 40 : 28;
  const iniciales = (a.profesor ?? a.nombre)
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  async function descargarTodo() {
    setProgreso({ hechos: 0, total: faltan.length });
    const r = await descargarVarios(faltan, (hechos, total) => setProgreso({ hechos, total }));
    setProgreso(null);
    if (r.fallos)
      avisar(
        'Descarga terminada',
        `${r.ok} descargados, ${r.fallos} con error. Vuelve a intentarlo.`,
      );
  }

  const cuerpo = (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#0C0C0F' }}
      contentContainerStyle={{ flexGrow: 1 }}>
      <View
        style={{
          paddingHorizontal: padX,
          paddingTop: movil ? 24 : 40,
          paddingBottom: 24,
          borderBottomWidth: 1,
          borderBottomColor: '#17171D',
        }}>
        <View style={{ width: '100%', maxWidth: 1152, alignSelf: 'center' }}>
          <View
            style={{
              flexDirection: movil ? 'column' : 'row',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: movil ? 16 : 24,
            }}>
            <View style={{ flex: movil ? undefined : 1, gap: 6 }}>
              <T up s={10} w={500} ls={0.24} c="#7D7D8A">
                Asignatura
                {esModulo ? (
                  <T s={10} c="#40404A">
                    {' '}
                    ·{' '}
                  </T>
                ) : (
                  ''
                )}
                {esModulo ? `Aula ${AULA}` : ''}
              </T>
              <T k="serif" s={movil ? 34 : 42} lh={movil ? 40 : 52} c={O.white} ls={-0.025}>
                {a.nombre}
              </T>
              <T s={12} c="#82828F" style={{ paddingTop: 4 }}>
                Unidades, materiales y tareas de la asignatura tal y como están en el campus.
              </T>
            </View>
            {a.profesor ? (
              <View
                style={{
                  flexDirection: movil ? 'row-reverse' : 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingLeft: movil ? 0 : 16,
                  paddingVertical: 4,
                }}>
                <View style={{ alignItems: movil ? 'flex-start' : 'flex-end' }}>
                  <T s={12} w={600} c={O.white}>
                    {a.profesor}
                  </T>
                  {esModulo ? (
                    <T k="mono" up s={9} ls={0.05} c="#63636E" style={{ marginTop: 2 }}>
                      Aula {AULA}
                    </T>
                  ) : null}
                </View>
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 8,
                    backgroundColor: '#1A1A24',
                    borderWidth: 1,
                    borderColor: '#292934',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}>
                  {profe?.foto && !fotoRota ? (
                    <Image
                      source={{ uri: profe.foto }}
                      style={{ width: 64, height: 64 }}
                      onError={() => setFotoRota(true)}
                    />
                  ) : (
                    <T k="mono" s={12} w={500} c="#9393A2">
                      {iniciales}
                    </T>
                  )}
                </View>
              </View>
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingTop: 28 }}>
            <Etiqueta s={10} ls={0.14} w={400} c="#757582">
              {bloques.length} {bloques.length === 1 ? 'Unidad' : 'Unidades'}
            </Etiqueta>
            <Etiqueta s={10} ls={0.14} w={400} c="#757582">
              {elementos} {elementos === 1 ? 'Elemento' : 'Elementos'}
            </Etiqueta>
            {pendientes ? (
              <Etiqueta s={10} ls={0.14} w={500} c="#EAB308">
                {pendientes} {pendientes === 1 ? 'Pendiente' : 'Pendientes'}
              </Etiqueta>
            ) : null}
          </View>
        </View>
      </View>

      <View style={{ paddingHorizontal: padX, paddingVertical: 28 }}>
        <View
          style={{
            width: '100%',
            maxWidth: 1152,
            alignSelf: 'center',
            flexDirection: movil ? 'column' : 'row',
            gap: movil ? 24 : 32,
            alignItems: movil ? 'stretch' : 'flex-start',
          }}>
          <View style={{ flex: movil ? undefined : 2, minWidth: 0, gap: 16 }}>
            <View
              style={{
                borderWidth: 1,
                borderColor: '#1A1A22',
                borderRadius: 12,
                backgroundColor: 'rgba(14,14,18,0.7)',
                overflow: 'hidden',
              }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: '#191921',
                  backgroundColor: 'rgba(17,17,22,0.6)',
                }}>
                <Etiqueta s={10} ls={0.18} w={400} c="#696976">
                  Unidades
                </Etiqueta>
                {tareasConEntrega.length ? (
                  <T k="mono" s={11} c="#787886">
                    {entregadas}/{tareasConEntrega.length} tareas entregadas
                  </T>
                ) : null}
              </View>
              {cargando && !contenido ? (
                <T s={12.5} c="#6B6B77" style={{ padding: 20 }}>
                  Cargando la asignatura…
                </T>
              ) : error && !contenido ? (
                <T s={12.5} c="#F87171" style={{ padding: 20 }}>
                  {error}
                </T>
              ) : (
                bloques.map((b, i) => (
                  <BloqueFila
                    key={b.id}
                    bloque={b}
                    ultimo={i === bloques.length - 1}
                    novedades={novedades}
                    entregas={snapshot?.entregas ?? []}
                  />
                ))
              )}
            </View>
            {foros.map((f) => (
              <Pressable
                key={f.cmid}
                onPress={() => f.url && WebBrowser.openBrowserAsync(f.url)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#181820',
                  backgroundColor: 'rgba(14,14,18,0.4)',
                }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Feather name="message-square" size={14} color="#7A7A88" />
                  <T k="mono" up s={12} ls={0.1} c="#7A7A88">
                    {f.nombre}
                  </T>
                </View>
                <T k="mono" s={12} c="#5B5B67">
                  Abrir ↗
                </T>
              </Pressable>
            ))}
          </View>

          <View style={{ flex: movil ? undefined : 1, minWidth: movil ? 0 : 240, gap: 16 }}>
            <View
              style={{
                borderWidth: 1,
                borderColor: '#1A1A22',
                borderRadius: 12,
                backgroundColor: 'rgba(14,14,18,0.7)',
                padding: 20,
              }}>
              <Etiqueta s={10} ls={0.2} w={400} c="#696976" style={{ marginBottom: 16 }}>
                Resumen
              </Etiqueta>
              <View style={{ gap: 12 }}>
                {[
                  ['Archivos', archivos.length],
                  ['Tareas', contar(bloques, 'assign')],
                  ['Cuestionarios', contar(bloques, 'quiz')],
                  ['Lecciones SCORM', contar(bloques, 'scorm')],
                ].map(([k, v]) => (
                  <View
                    key={k as string}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 2,
                    }}>
                    <T s={12} c="#8E8E9C">
                      {k}
                    </T>
                    <T k="mono" s={12} c={O.white}>
                      {v}
                    </T>
                  </View>
                ))}
              </View>
              {guardaArchivos && faltan.length ? (
                <Pressable
                  onPress={descargarTodo}
                  disabled={!!progreso}
                  style={{
                    marginTop: 16,
                    paddingVertical: 8,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#26262E',
                    backgroundColor: '#141418',
                    alignItems: 'center',
                  }}>
                  <T k="mono" up s={10.5} w={600} ls={0.05} c={O.white}>
                    {progreso
                      ? `Descargando ${progreso.hechos}/${progreso.total}…`
                      : `Descargar ${faltan.length} (${formatoTamano(faltan.reduce((s, x) => s + (x.size || 0), 0))})`}
                  </T>
                </Pressable>
              ) : null}
            </View>
            <View
              style={{
                borderWidth: 1,
                borderColor: '#262E19',
                borderRadius: 12,
                backgroundColor: 'rgba(17,20,14,0.4)',
                padding: 20,
              }}>
              <Etiqueta s={10} ls={0.2} c="#B4D455" style={{ marginBottom: 12 }}>
                Asistente
              </Etiqueta>
              <T s={12} lh={19.5} c="#969A8F">
                Abre una tarea y pulsa «Hacer con IA» para que te ayude a preparar la entrega.
              </T>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  return movil ? (
    <MarcoObsidiana
      cursoActivo={cursoId}
      migas={[{ texto: 'Asignaturas' }, { texto: a.nombre, color: a.color }]}>
      {cuerpo}
    </MarcoObsidiana>
  ) : (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: O.bg }}>
      <LateralObsidianaFuera cursoActivo={cursoId} />
      {cuerpo}
    </View>
  );
}

function Chip({ texto, c, bg, b }: { texto: string; c: string; bg: string; b: string }) {
  return (
    <View
      style={{
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
        backgroundColor: bg,
        borderColor: b,
      }}>
      <T k="mono" up s={9} w={500} ls={0.05} c={c}>
        {texto}
      </T>
    </View>
  );
}

function BloqueFila({
  bloque,
  ultimo,
  novedades,
  entregas,
}: {
  bloque: Bloque;
  ultimo: boolean;
  novedades: ReturnType<typeof useMoodle>['novedades'];
  entregas: Entrega[];
}) {
  const movil = useMovil();
  const [abierto, setAbierto] = useState(false);
  const delBloque = bloque.modulos
    .map((m) => (m.entregaKey ? entregas.find((e) => e.key === m.entregaKey) : undefined))
    .filter((e): e is Entrega => !!e);
  const pend = delBloque.filter((e) => e.estado === 'pendiente' || e.estado === 'borrador').length;
  const urls = new Set(
    bloque.modulos.flatMap((m) => m.archivos.map((x) => claveArchivo(x.fileurl))),
  );
  const nuevo = novedades.some(
    (n) => !n.leida && n.archivo && urls.has(claveArchivo(n.archivo.fileurl)),
  );
  const n = bloque.modulos.length;

  return (
    <View style={{ borderBottomWidth: ultimo ? 0 : 1, borderBottomColor: '#1B1B22' }}>
      <Pressable
        onPress={() => setAbierto((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: abierto }}
        style={{
          flexDirection: 'row',
          flexWrap: movil ? 'wrap' : 'nowrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingVertical: 16,
          gap: movil ? 10 : 12,
        }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            flex: movil ? undefined : 1,
            flexBasis: movil ? '100%' : undefined,
            minWidth: 0,
          }}>
          <T k="mono" up s={10} ls={0.05} c="#63636E">
            {bloque.numero > 0 ? `UD ${bloque.numero}` : 'General'}
          </T>
          <T w={600} s={14} c={O.white} numberOfLines={2} style={{ flexShrink: 1 }}>
            {bloque.nombre.replace(/^(unidad|tema|ud)\s*\d+\s*[:.\-–]?\s*/i, '') || bloque.nombre}
          </T>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {nuevo ? <Chip texto="Nuevo" c="#B4D455" bg="#222915" b="#353F1F" /> : null}
          {pend ? <Chip texto={`${pend} Pend.`} c="#F59E0B" bg="#2E2311" b="#483718" /> : null}
          <T k="mono" up s={10} ls={0.05} c="#63636E">
            {n} {n === 1 ? 'Elemento' : 'Elementos'}
          </T>
          <Feather name={abierto ? 'chevron-up' : 'chevron-down'} size={14} color="#63636E" />
        </View>
      </Pressable>
      {abierto ? (
        <View style={{ paddingHorizontal: 20, paddingBottom: 20, paddingTop: 4, gap: 10 }}>
          {n ? (
            bloque.modulos.map((m) => <ModuloFila key={m.cmid} modulo={m} entregas={entregas} />)
          ) : (
            <T s={12} c="#6B6B77">
              Este apartado no tiene nada todavía.
            </T>
          )}
        </View>
      ) : null}
    </View>
  );
}

function Fila({
  icono,
  nombre,
  sub,
  acciones,
  onPress,
  indent,
}: {
  icono: IconoFeather;
  nombre: string;
  sub: string;
  acciones?: React.ReactNode;
  onPress?: () => void;
  indent?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        marginLeft: indent ? 32 : 0,
        borderRadius: 8,
        backgroundColor: 'rgba(20,20,26,0.6)',
        borderWidth: 1,
        borderColor: '#1E1E28',
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: '#1A1A24',
            borderWidth: 1,
            borderColor: '#232330',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Feather name={icono} size={14} color="#7E7E8D" />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T s={12} w={500} c={O.white} numberOfLines={1}>
            {nombre}
          </T>
          <T k="mono" up s={10} ls={0.05} c="#63636E" numberOfLines={1} style={{ marginTop: 2 }}>
            {sub}
          </T>
        </View>
      </View>
      {acciones ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 8 }}>
          {acciones}
        </View>
      ) : null}
    </Pressable>
  );
}

function ModuloFila({ modulo, entregas }: { modulo: Modulo; entregas: Entrega[] }) {
  const { abrir, descargar, estado } = useDownloads();
  const entrega = modulo.entregaKey ? entregas.find((e) => e.key === modulo.entregaKey) : undefined;

  async function abrirArchivo(f: Archivo) {
    try {
      await abrir(f);
    } catch (e) {
      avisar('No se pudo abrir', (e as Error).message);
    }
  }
  const accionesArchivo = (f: Archivo) => (
    <>
      <Pressable onPress={() => abrirArchivo(f)} hitSlop={6} accessibilityLabel="Abrir">
        <Feather name="eye" size={14} color="#656573" />
      </Pressable>
      {estado(f) !== 'si' ? (
        <Pressable
          onPress={() =>
            descargar(f).catch((e) => avisar('No se pudo descargar', (e as Error).message))
          }
          hitSlop={6}
          accessibilityLabel="Descargar">
          <Feather name="download" size={14} color="#656573" />
        </Pressable>
      ) : (
        <Feather name="check" size={14} color="#84CC16" />
      )}
    </>
  );

  // Un recurso con un solo archivo: la fila es el archivo
  if (modulo.tipo === 'resource' && modulo.archivos.length === 1) {
    const f = modulo.archivos[0];
    return (
      <Fila
        icono="file-text"
        nombre={f.nombre}
        sub={`Archivo · ${formatoTamano(f.size)}`}
        onPress={() => abrirArchivo(f)}
        acciones={accionesArchivo(f)}
      />
    );
  }

  const onPress = () => {
    if (modulo.entregaKey)
      router.push({ pathname: '/tarea/[key]', params: { key: modulo.entregaKey } });
    else if (modulo.enlace) WebBrowser.openBrowserAsync(modulo.enlace);
    else if (modulo.url) WebBrowser.openBrowserAsync(modulo.url);
  };

  let sub = TIPO[modulo.tipo] ?? 'Actividad';
  let hecho = false;
  let estadoTxt: { t: string; c: string } | null = null;
  if (entrega) {
    if (entrega.nota) sub += ` · ${entrega.nota}`;
    else if (entrega.fecha) sub += ` · Entrega ${diaMesHora(entrega.fecha)}`;
    hecho = entrega.estado === 'entregada';
    if (entrega.estado === 'pendiente') estadoTxt = { t: 'Pendiente', c: '#9393A2' };
    if (entrega.estado === 'borrador') estadoTxt = { t: 'Borrador', c: '#F59E0B' };
    if (entrega.estado === 'vencida') estadoTxt = { t: 'Vencida', c: '#F87171' };
  } else if (modulo.archivos.length > 1) {
    sub += ` · ${modulo.archivos.length} archivos`;
  }

  return (
    <View style={{ gap: 8 }}>
      <Fila
        icono={ICONO[modulo.tipo] ?? 'box'}
        nombre={modulo.nombre}
        sub={sub}
        onPress={onPress}
        acciones={
          <>
            {estadoTxt ? (
              <T k="mono" up s={10} w={500} ls={0.05} c={estadoTxt.c}>
                {estadoTxt.t}
              </T>
            ) : null}
            {hecho ? <Feather name="check-circle" size={16} color="#84CC16" /> : null}
          </>
        }
      />
      {modulo.archivos.map((f) => (
        <Fila
          key={f.fileurl}
          indent
          icono="file-text"
          nombre={f.nombre}
          sub={`Archivo · ${formatoTamano(f.size)}`}
          onPress={() => abrirArchivo(f)}
          acciones={accionesArchivo(f)}
        />
      ))}
    </View>
  );
}
