/**
 * Detalle de tarea en el diseño Obsidiana: sidebar, migas de pan con «Abrir en Moodle»,
 * enunciado, archivos de la tarea y tu entrega a la izquierda; fechas, «Hacer con IA»
 * y asignatura a la derecha. Reproducido del HTML de Stitch (detalle_de_tarea_cuaderno_04_hermes).
 */
import Feather from '@expo/vector-icons/Feather';
import { router, useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';

import { MarcoObsidiana } from '@/components/obs-marco';
import { Etiqueta, O, Punto, T, useMovil, usePadX } from '@/components/obs';
import type { Archivo, Entrega } from '@/lib/data';
import { avisar } from '@/lib/dialogo';
import { formatoTamano, useDownloads } from '@/lib/downloads';
import { diaMes, diaMesHora, hora, quedan } from '@/lib/format';
import { htmlATexto } from '@/lib/html-texto';
import { hayChat } from '@/lib/ia/chats';
import { useAsignaturas } from '@/lib/store';
import { EntregaPropia } from '@/components/entrega-propia';
import { useEsProfesor } from '@/lib/use-es-profesor';

const CHIP = {
  borrador: { bg: '#271F0C', fg: '#F59E0B', borde: '#3E3113', texto: 'Borrador' },
  pendiente: { bg: '#161619', fg: '#9393A2', borde: '#2B2B33', texto: 'Pendiente' },
  entregada: { bg: '#1B2311', fg: '#D6FF38', borde: '#43561B', texto: 'Entregada' },
  vencida: { bg: '#2A1414', fg: '#F87171', borde: '#4A2020', texto: 'Vencida' },
} as const;

const TARJETA = {
  backgroundColor: '#121317',
  borderWidth: 1,
  borderColor: '#1D1F25',
  borderRadius: 12,
} as const;

function tipoArchivo(nombre: string) {
  const ext = nombre.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return 'PDF';
  if (['csv', 'xls', 'xlsx', 'ods', 'tsv'].includes(ext)) return 'SHEET';
  if (['doc', 'docx', 'odt', 'rtf', 'txt', 'md'].includes(ext)) return 'DOC';
  if (['ipynb', 'py', 'js', 'ts', 'java', 'sql', 'json', 'sh', 'r'].includes(ext)) return 'CODE';
  if (['zip', 'rar', '7z', 'gz', 'tar'].includes(ext)) return 'ZIP';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return 'IMG';
  if (['ppt', 'pptx', 'odp'].includes(ext)) return 'SLIDES';
  return (ext || 'FILE').slice(0, 5).toUpperCase();
}

const pesoTotal = (archivos: Archivo[]) => archivos.reduce((s, a) => s + (a.size || 0), 0);

function partirNota(texto: string) {
  const limpia = (s: string) =>
    s
      .trim()
      .replace(/([,.]\d*?)0+$/, '$1')
      .replace(/[,.]$/, '');
  const [nota, sobre] = texto.split('/');
  return { nota: limpia(nota), sobre: sobre ? limpia(sobre) : undefined };
}

function FilaArchivo({ archivo }: { archivo: Archivo }) {
  const { abrir, descargar, estado } = useDownloads();
  const tag = tipoArchivo(archivo.nombre);
  const aviso = (titulo: string) => (e: unknown) => avisar(titulo, (e as Error).message);
  return (
    <Pressable
      onPress={() => abrir(archivo).catch(aviso('No se pudo abrir'))}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#14161B',
        borderWidth: 1,
        borderColor: '#1E2027',
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 4,
            backgroundColor: '#1C1E25',
            borderWidth: 1,
            borderColor: '#272A33',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <T k="mono" w={600} s={tag.length > 4 ? 8 : 9} c="#989DA9">
            {tag}
          </T>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T s={13} w={500} c="#E3E5ED" numberOfLines={1}>
            {archivo.nombre}
          </T>
          <T k="mono" s={10} c="#676B78">
            {formatoTamano(archivo.size)}
          </T>
        </View>
      </View>
      {estado(archivo) === 'si' ? (
        <Feather name="check" size={16} color="#84CC16" />
      ) : (
        <Pressable
          onPress={() => descargar(archivo).catch(aviso('No se pudo descargar'))}
          hitSlop={8}
          accessibilityLabel="Descargar">
          <Feather name="download" size={16} color="#5F6371" />
        </Pressable>
      )}
    </Pressable>
  );
}

function Titulo({
  children,
  derecha,
  colorDerecha = '#525663',
}: {
  children: string;
  derecha?: string;
  colorDerecha?: string;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
      }}>
      <Etiqueta s={9} ls={0.2} w={600} c="#676B77">
        {children}
      </Etiqueta>
      {derecha ? (
        <T k="mono" up s={10} ls={0.05} c={colorDerecha} w={500}>
          {derecha}
        </T>
      ) : null}
    </View>
  );
}

export function TareaObsidiana({ entrega: e, nowMs }: { entrega: Entrega; nowMs: number }) {
  const { width } = useWindowDimensions();
  const movil = useMovil();
  const info = useAsignaturas()(e.cursoId, e.curso);
  const [chat, setChat] = useState<{ key: string; hay: boolean }>();
  useFocusEffect(
    useCallback(() => {
      let vivo = true;
      hayChat(e.key).then((hay) => vivo && setChat({ key: e.key, hay }));
      return () => {
        vivo = false;
      };
    }, [e.key]),
  );
  const conChat = chat?.key === e.key && chat.hay;
  const esProfesor = useEsProfesor();

  const ancho = width >= 1100;
  const padX = usePadX(32);
  const chip = CHIP[e.estado];
  const abierta = e.estado === 'pendiente' || e.estado === 'borrador';
  const texto = htmlATexto(e.enunciado);
  const corte = e.corte && e.corte !== e.fecha ? e.corte : undefined;
  const abrirMoodle = e.url ? () => WebBrowser.openBrowserAsync(e.url!) : undefined;
  const irIA = () => router.push(`/ia/${encodeURIComponent(e.key)}`);
  const fechaTxt = (ts: number) => `${diaMes(ts)} · ${hora(new Date(ts * 1000))}`;

  const vence = e.fecha ? fechaTxt(e.fecha) : undefined;
  const restante =
    e.fecha && e.fecha * 1000 > nowMs
      ? quedan(e.fecha, nowMs)
      : e.estado === 'vencida' && corte && corte * 1000 > nowMs
        ? `Entrega con retraso hasta ${fechaTxt(corte)}`
        : undefined;
  const urgente = e.fecha
    ? e.fecha * 1000 - nowMs < 48 * 3600_000 && e.fecha * 1000 > nowMs
    : false;

  const principal = (
    <View style={{ flex: 1, minWidth: 0, gap: 24 }}>
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <View style={{ width: 20, height: 2, backgroundColor: info.color }} />
          <Etiqueta s={10} ls={0.16} w={400} c="#A0A5B2">
            {info.nombre}
          </Etiqueta>
          {info.profesor ? (
            <>
              <T k="mono" s={10} c="#444751">
                ·
              </T>
              <Etiqueta s={10} ls={0.16} w={400} c="#727785">
                {info.profesor}
              </Etiqueta>
            </>
          ) : null}
        </View>
        <T k="serif" s={movil ? 32 : 42} lh={movil ? 36 : 45} c="#F4F5F7" ls={-0.015}>
          {e.nombre}
        </T>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingTop: 4,
            flexWrap: 'wrap',
          }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 10,
              paddingVertical: 2,
              borderRadius: 999,
              backgroundColor: chip.bg,
              borderWidth: 1,
              borderColor: chip.borde,
            }}>
            <Punto color={chip.fg} size={4} />
            <T k="mono" up s={9.5} w={600} ls={0.05} c={chip.fg}>
              {chip.texto}
            </T>
          </View>
          {vence ? (
            <T k="mono" up s={10.5} ls={0.05} c="#696E7B">
              Entrega {vence}
            </T>
          ) : null}
        </View>
      </View>

      {texto ? (
        <View style={{ ...TARJETA, padding: movil ? 20 : 24 }}>
          <Titulo>ENUNCIADO</Titulo>
          <T s={13.5} lh={22} c="#C3C7D2" selectable>
            {texto}
          </T>
        </View>
      ) : null}

      {e.adjuntos?.length ? (
        <View style={{ ...TARJETA, padding: movil ? 20 : 24 }}>
          <Titulo derecha={String(e.adjuntos.length)}>ARCHIVOS DE LA TAREA</Titulo>
          <View style={{ gap: 10 }}>
            {e.adjuntos.map((a) => (
              <FilaArchivo key={a.fileurl} archivo={a} />
            ))}
          </View>
        </View>
      ) : null}

      <View style={{ ...TARJETA, padding: movil ? 20 : 24 }}>
        <Titulo
          colorDerecha={
            e.estado === 'borrador' ? '#D97706' : e.estado === 'entregada' ? '#84CC16' : '#525663'
          }
          derecha={
            e.envio
              ? `${e.estado === 'borrador' ? 'Borrador' : 'Entregada'}${e.envio.fecha ? ` · ${diaMesHora(e.envio.fecha)}` : ''}`
              : undefined
          }>
          TU ENTREGA
        </Titulo>
        {e.envio?.archivos.length ? (
          <View style={{ gap: 10, marginBottom: abierta ? 16 : 0 }}>
            {e.envio.archivos.map((a) => (
              <FilaArchivo key={a.fileurl} archivo={a} />
            ))}
          </View>
        ) : !abierta && !e.envio ? (
          <T s={12.5} c="#7C808E">
            No enviaste nada a esta tarea.
          </T>
        ) : null}
        {e.envio?.texto ? (
          <T s={13} lh={20} c="#C3C7D2" selectable style={{ marginBottom: 12 }}>
            {htmlATexto(e.envio.texto)}
          </T>
        ) : null}
        {e.envio ? (
          <T k="mono" s={10.5} c="#676B78" style={{ marginBottom: abierta ? 16 : 0 }}>
            {[
              e.envio.archivos.length
                ? `${e.envio.archivos.length} ${e.envio.archivos.length === 1 ? 'archivo' : 'archivos'} · ${formatoTamano(pesoTotal(e.envio.archivos))}`
                : null,
              e.envio.pendienteDeCorregir ? 'Pendiente de corregir' : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </T>
        ) : abierta ? (
          <T s={12.5} c="#7C808E" style={{ marginBottom: 16 }}>
            Todavía no has enviado tu trabajo.
          </T>
        ) : null}
        {abierta && !esProfesor && e.tipo === 'assign' && e.entregable && !e.entregable.prueba ? (
          <EntregaPropia entrega={e} />
        ) : null}
        {abierta && abrirMoodle ? (
          <Pressable
            onPress={abrirMoodle}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              paddingVertical: 10,
              borderRadius: 8,
              borderWidth: 1,
              borderStyle: 'dashed',
              borderColor: '#292C36',
            }}>
            <Feather name="external-link" size={14} color="#6C707F" />
            <T k="mono" up s={12} ls={0.05} c="#8E93A2">
              {e.estado === 'borrador' ? 'Terminar la entrega en Moodle' : 'Entregar en Moodle'}
            </T>
          </Pressable>
        ) : null}
      </View>

      {e.correccion ? (
        <View style={{ ...TARJETA, padding: movil ? 20 : 24 }}>
          <Titulo derecha={e.correccion.fecha ? diaMes(e.correccion.fecha) : undefined}>
            CORRECCIÓN DEL PROFESOR
          </Titulo>
          {e.correccion.nota ? (
            <View
              style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
              <T k="serif" s={44} c={O.white} ls={-0.02}>
                {partirNota(e.correccion.nota).nota}
              </T>
              {partirNota(e.correccion.nota).sobre ? (
                <T k="mono" s={12} c="#676B78">
                  sobre {partirNota(e.correccion.nota).sobre}
                </T>
              ) : null}
            </View>
          ) : null}
          {e.correccion.comentario ? (
            <T s={13.5} lh={22} c="#C3C7D2" selectable>
              «{htmlATexto(e.correccion.comentario)}»
            </T>
          ) : null}
          {e.correccion.archivos.length ? (
            <View style={{ gap: 10, marginTop: 16 }}>
              {e.correccion.archivos.map((a) => (
                <FilaArchivo key={a.fileurl} archivo={a} />
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );

  const fila = (a: string, b: string, opts?: { fuerte?: boolean }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <T s={12} w={opts?.fuerte ? 500 : 400} c={opts?.fuerte ? '#9FA3B2' : '#7C808E'}>
        {a}
      </T>
      <T k="mono" s={11.5} w={opts?.fuerte ? 600 : 400} c={opts?.fuerte ? O.white : '#ABB0BF'}>
        {b}
      </T>
    </View>
  );

  const lateral = (
    <View style={{ width: ancho ? 360 : '100%', gap: 20 }}>
      <View style={{ ...TARJETA, padding: 20 }}>
        <Titulo>FECHAS</Titulo>
        <View style={{ gap: 14 }}>
          {e.apertura ? fila('Apertura', fechaTxt(e.apertura)) : null}
          {e.fecha ? fila('Vencimiento', fechaTxt(e.fecha), { fuerte: true }) : null}
          {corte ? fila('Cierre', fechaTxt(corte)) : null}
          {restante ? (
            <View
              style={{
                paddingTop: 12,
                borderTopWidth: 1,
                borderTopColor: '#1A1C22',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}>
              <T s={12} c="#7C808E">
                Tiempo restante
              </T>
              <T
                k="mono"
                s={11.5}
                w={500}
                c={urgente || e.estado === 'vencida' ? '#F59E0B' : '#ABB0BF'}
                style={{ flexShrink: 1, textAlign: 'right' }}>
                {restante}
              </T>
            </View>
          ) : null}
        </View>
      </View>

      {!esProfesor ? (
        <View
          style={{
            backgroundColor: '#121418',
            borderWidth: 1,
            borderColor: '#2B3917',
            borderRadius: 12,
            padding: 20,
            overflow: 'hidden',
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <Feather name="star" size={14} color={O.lime} />
            <T k="mono" up s={9.5} w={700} ls={0.18} c={O.lime}>
              {conChat ? 'Seguir con la IA' : 'Hacer con IA'}
            </T>
          </View>
          <T s={12.5} lh={20} c="#B4B8C5" style={{ marginBottom: 20 }}>
            Trabaja sobre el enunciado y los archivos de la tarea. También puede explicarte la
            corrección del profesor punto por punto.
          </T>
          <Pressable
            onPress={irIA}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 999,
              backgroundColor: O.lime,
            }}>
            <T k="mono" up s={10} w={700} ls={0.05} c="#000">
              Abrir asistente
            </T>
            <Feather name="arrow-up-right" size={12} color="#000" />
          </Pressable>
        </View>
      ) : null}

      <View style={{ ...TARJETA, padding: 20 }}>
        <Titulo>ASIGNATURA</Titulo>
        <View style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Punto color={info.color} />
            <T s={13} w={500} c="#F1F3F7">
              {info.nombre}
            </T>
          </View>
          {info.profesor ? (
            <T s={11.5} c="#717684" style={{ paddingLeft: 14 }}>
              {info.profesor}
            </T>
          ) : null}
        </View>
      </View>
    </View>
  );

  return (
    <MarcoObsidiana
      cursoActivo={e.cursoId}
      migas={[
        { texto: 'Pendientes', alPulsar: () => router.navigate('/') },
        { texto: info.nombre, color: info.color },
      ]}
      derecha={
        abrirMoodle ? (
          <Pressable
            onPress={abrirMoodle}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: '#24272F',
            }}>
            <T k="mono" up s={10} ls={0.14} c="#A4A9B6">
              {ancho ? 'Abrir en Moodle' : 'Moodle'}
            </T>
            <Feather name="external-link" size={12} color="#797E8D" />
          </Pressable>
        ) : undefined
      }>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: padX, paddingVertical: movil ? 20 : 28 }}>
        <View
          style={{
            width: '100%',
            maxWidth: 1240,
            alignSelf: 'center',
            flexDirection: ancho ? 'row' : 'column',
            gap: movil ? 24 : 32,
            alignItems: ancho ? 'flex-start' : 'stretch',
          }}>
          {principal}
          {lateral}
        </View>
      </ScrollView>
    </MarcoObsidiana>
  );
}
