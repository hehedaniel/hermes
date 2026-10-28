/**
 * Asistente de IA para una tarea, en la estética Obsidiana (esta pantalla no está en el diseño de
 * Stitch: se compone con las mismas piezas). Conversación a la izquierda; a la derecha, la tarea
 * y el contexto que ve la IA.
 */
import Feather from '@expo/vector-icons/Feather';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DocumentoCard } from '@/components/documento-card';
import { IASettings } from '@/components/ia-settings';
import { Etiqueta, O, Punto, T, useMovil, usePadX } from '@/components/obs';
import { MarcoObsidiana, PildoraObs } from '@/components/obs-marco';
import { TextoMarkdown } from '@/components/texto-markdown';
import { useNow } from '@/hooks/use-now';
import type { Archivo, Entrega } from '@/lib/data';
import { avisar, confirmar } from '@/lib/dialogo';
import { formatoTamano } from '@/lib/downloads';
import { diaMesHora, quedan } from '@/lib/format';
import { verDocumento } from '@/lib/ia/archivos-ia';
import type { MensajeChat } from '@/lib/ia/chats';
import { type DocumentoIA, extraerDocumentos } from '@/lib/ia/documentos';
import { adjuntoCompatible, PROVEEDORES } from '@/lib/ia/proveedores';
import { plantillaActiva } from '@/lib/ia/plantillas-datos';
import { usePlantillas } from '@/lib/ia/plantillas';
import { useChatIA } from '@/lib/ia/use-chat';
import { useEntregar } from '@/lib/ia/use-entregar';
import { useAsignaturas } from '@/lib/store';

const SUGERENCIAS = [
  'Explícame qué piden y cómo lo enfoco',
  'Hazme la tarea completa en un PDF listo para entregar',
  'Hazme un esquema de los puntos que tengo que tratar',
];

const TARJETA = {
  backgroundColor: '#121317',
  borderWidth: 1,
  borderColor: '#1D1F25',
  borderRadius: 12,
} as const;

export function ChatIAObsidiana({ e }: { e: Entrega }) {
  const { width } = useWindowDimensions();
  const movil = useMovil();
  const padX = usePadX(32);
  const { bottom } = useSafeAreaInsets();
  const info = useAsignaturas()(e.cursoId, e.curso);
  const nowMs = useNow();
  const chat = useChatIA(e);
  const plantillas = usePlantillas();
  const plantilla = plantillaActiva(plantillas.datos, chat.eleccion.plantillaId);
  const conEstilo =
    !!plantillas.datos.estilo && (chat.eleccion.usarEstilo ?? plantillas.datos.usarEstilo);
  const { entregar, entregando, puede } = useEntregar(e);
  const scrollRef = useRef<ScrollView>(null);
  const [texto, setTexto] = useState('');
  const [elegidos, setSeleccion] = useState<string[] | null>(null);
  const [viendo, setViendo] = useState<string | null>(null);

  const proveedorId = chat.ajustes?.config.proveedor ?? 'gemini';
  const adjuntables = useMemo(
    () => (e.adjuntos ?? []).filter((a) => adjuntoCompatible(a.nombre, a.mimetype, proveedorId)),
    [e.adjuntos, proveedorId],
  );
  const seleccion =
    elegidos ?? (chat.cargado && !chat.mensajes.length ? adjuntables.map((a) => a.fileurl) : []);
  const sinClave = chat.ajustes !== null && !chat.ajustes.clave;
  const proveedor = chat.ajustes ? PROVEEDORES[chat.ajustes.config.proveedor].nombre : '';
  const modelo = chat.ajustes?.modelo ?? '';
  const vacio = !chat.mensajes.length && chat.cargado;
  const puedeEnviar = !sinClave && (!!texto.trim() || !!seleccion.length);
  const panel = width >= 1100;
  const ultimo = chat.mensajes.at(-1);

  function onEnviar() {
    if (chat.pensando) return;
    const adjuntos = adjuntables.filter((a) => seleccion.includes(a.fileurl));
    if (!texto.trim() && !adjuntos.length) return;
    chat.enviar(texto.trim() || 'Te paso los archivos de la tarea.', adjuntos);
    setTexto('');
    setSeleccion([]);
  }

  async function onVer(doc: DocumentoIA) {
    setViendo(doc.nombre);
    try {
      await verDocumento(doc);
    } catch (err) {
      avisar('No se pudo abrir', (err as Error).message ?? String(err));
    } finally {
      setViendo(null);
    }
  }

  function onBorrar() {
    confirmar({
      titulo: 'Borrar conversación',
      texto: 'Se borra esta conversación con la IA. Lo que ya hayas entregado no cambia.',
      boton: 'Borrar',
      destructivo: true,
      onOk: () => {
        chat.borrar();
        setSeleccion(null);
      },
    });
  }

  const alternar = (a: Archivo) =>
    setSeleccion(
      seleccion.includes(a.fileurl)
        ? seleccion.filter((x) => x !== a.fileurl)
        : [...seleccion, a.fileurl],
    );

  const urgente = !!e.fecha && e.fecha * 1000 > nowMs && e.fecha * 1000 - nowMs < 48 * 3600_000;

  return (
    <MarcoObsidiana
      cursoActivo={e.cursoId}
      migas={[
        { texto: 'Pendientes', alPulsar: () => router.navigate('/') },
        {
          texto: e.nombre,
          color: info.color,
          alPulsar: () => router.push({ pathname: '/tarea/[key]', params: { key: e.key } }),
        },
        { texto: 'Asistente' },
      ]}
      derecha={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {proveedor && !movil ? (
            <T k="mono" up s={10} ls={0.1} c="#676B78" numberOfLines={1}>
              {proveedor}
              {modelo ? ` · ${modelo}` : ''}
            </T>
          ) : null}
          {chat.mensajes.length ? (
            <PildoraObs
              texto={movil ? 'Borrar' : 'Borrar conversación'}
              alPulsar={onBorrar}
              peligro
            />
          ) : null}
        </View>
      }>
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <KeyboardAvoidingView
          style={{ flex: 1, minWidth: 0 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingHorizontal: padX,
              paddingTop: movil ? 20 : 32,
              paddingBottom: 24,
              flexGrow: 1,
            }}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
            <View
              style={{ width: '100%', maxWidth: 760, alignSelf: 'center', gap: 20, flexGrow: 1 }}>
              {sinClave ? (
                <View style={{ gap: 20 }}>
                  <View style={{ gap: 8 }}>
                    <Etiqueta c={O.lime} s={10} ls={0.2}>
                      Asistente de Hermes
                    </Etiqueta>
                    <T k="serif" s={34} lh={40} c={O.white} ls={-0.02}>
                      Elige tu IA
                    </T>
                    <T s={13} lh={20} c="#9393A2">
                      Para hablar con la IA sobre esta tarea, elige un proveedor y pega tu clave.
                      Solo hay que hacerlo una vez.
                    </T>
                  </View>
                  <IASettings onCambio={chat.recargarAjustes} />
                </View>
              ) : vacio ? (
                <View style={{ gap: 14, paddingTop: movil ? 8 : 24 }}>
                  <View style={{ gap: 10, marginBottom: 10 }}>
                    <Etiqueta c={O.lime} s={10} ls={0.2}>
                      Asistente de Hermes
                    </Etiqueta>
                    <T k="serif" s={movil ? 34 : 42} lh={movil ? 40 : 48} c={O.white} ls={-0.02}>
                      Empecemos con tu tarea
                    </T>
                    <T s={13.5} lh={22} c="#9393A2" style={{ maxWidth: 560 }}>
                      Ya tengo el enunciado y la fecha de entrega. Marca abajo los archivos que
                      quieras pasarme. Si me pides el trabajo, te lo doy como documento para verlo y{' '}
                      {puede ? 'entregarlo desde aquí' : 'descargarlo'}.
                    </T>
                  </View>
                  <Etiqueta s={9} ls={0.2} c="#676B77">
                    Empieza con una idea
                  </Etiqueta>
                  {SUGERENCIAS.map((s) => (
                    <Pressable
                      key={s}
                      onPress={() => setTexto(s)}
                      accessibilityRole="button"
                      style={({ pressed }) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        padding: 16,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: pressed ? '#43561B' : '#1D1F25',
                        backgroundColor: pressed ? '#141A0C' : '#121317',
                      })}>
                      <Feather name="star" size={14} color={O.lime} />
                      <T s={13.5} w={500} c="#E3E5ED" style={{ flex: 1 }}>
                        {s}
                      </T>
                      <Feather name="arrow-up-right" size={14} color="#5F6371" />
                    </Pressable>
                  ))}
                  <T k="mono" s={10.5} c="#555963" style={{ paddingTop: 8 }}>
                    Cada mensaje gasta cuota del proveedor que elijas en Ajustes.
                  </T>
                </View>
              ) : null}

              {chat.mensajes.map((m) => (
                <Mensaje
                  key={m.id}
                  m={m}
                  esUltimo={m === ultimo}
                  onReintentar={chat.reintentar}
                  onVer={onVer}
                  onEntregar={puede ? entregar : undefined}
                  viendo={viendo}
                  entregando={entregando}
                />
              ))}

              {chat.pensando ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <ActivityIndicator size="small" color={O.lime} />
                  <T k="mono" s={11} c="#9393A2" style={{ flex: 1 }}>
                    {chat.pensando}
                  </T>
                </View>
              ) : null}
            </View>
          </ScrollView>

          <View
            style={{
              paddingHorizontal: padX,
              paddingTop: 12,
              paddingBottom: movil ? 12 + bottom : 20,
              borderTopWidth: 1,
              borderTopColor: '#18191F',
              backgroundColor: '#0D0E11',
            }}>
            <View style={{ width: '100%', maxWidth: 760, alignSelf: 'center', gap: 10 }}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, alignItems: 'center' }}
                keyboardShouldPersistTaps="handled">
                <T k="mono" up s={9.5} ls={0.14} c="#676B77">
                  Formato
                </T>
                {plantillas.datos.plantillas.length ? (
                  <>
                    <ChipFormato
                      texto="Sin plantilla"
                      activo={!plantilla}
                      alPulsar={() => chat.elegir({ plantillaId: null })}
                    />
                    {plantillas.datos.plantillas.map((p) => (
                      <ChipFormato
                        key={p.id}
                        texto={p.nombre}
                        icono="file-text"
                        activo={plantilla?.id === p.id}
                        alPulsar={() => chat.elegir({ plantillaId: p.id })}
                      />
                    ))}
                  </>
                ) : (
                  <ChipFormato
                    texto="Añadir plantilla"
                    icono="plus"
                    alPulsar={() => router.push('/ajustes-ia')}
                  />
                )}
                {plantillas.datos.estilo ? (
                  <ChipFormato
                    texto="Mi estilo"
                    icono="edit-3"
                    activo={conEstilo}
                    alPulsar={() => chat.elegir({ usarEstilo: !conEstilo })}
                  />
                ) : null}
              </ScrollView>
              {adjuntables.length ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8 }}
                  keyboardShouldPersistTaps="handled">
                  {adjuntables.map((a) => {
                    const on = seleccion.includes(a.fileurl);
                    return (
                      <Pressable
                        key={a.fileurl}
                        onPress={() => alternar(a)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: on }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          maxWidth: 260,
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 999,
                          borderWidth: 1,
                          backgroundColor: on ? '#1B2311' : '#121317',
                          borderColor: on ? '#43561B' : '#26262E',
                        }}>
                        <Feather
                          name={on ? 'check' : 'paperclip'}
                          size={12}
                          color={on ? O.lime : '#9393A2'}
                        />
                        <T
                          k="mono"
                          s={11}
                          c={on ? O.lime : '#C3C7D2'}
                          numberOfLines={1}
                          style={{ flexShrink: 1 }}>
                          {a.nombre}
                        </T>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              ) : null}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-end',
                  gap: 10,
                  padding: 8,
                  paddingLeft: 16,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: '#26262E',
                  backgroundColor: '#111114',
                }}>
                <TextInput
                  value={texto}
                  onChangeText={setTexto}
                  placeholder={sinClave ? 'Configura la IA arriba' : 'Pregunta o pide el trabajo…'}
                  placeholderTextColor="#555560"
                  editable={!sinClave}
                  multiline
                  onKeyPress={(ev) => {
                    const k = ev.nativeEvent as unknown as { key: string; shiftKey?: boolean };
                    if (Platform.OS === 'web' && k.key === 'Enter' && !k.shiftKey) {
                      ev.preventDefault();
                      onEnviar();
                    }
                  }}
                  style={[
                    {
                      flex: 1,
                      minHeight: 36,
                      maxHeight: 160,
                      paddingVertical: 8,
                      fontFamily: 'Inter_400Regular',
                      fontSize: 14,
                      lineHeight: 20,
                      color: O.white,
                    },
                    Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null,
                  ]}
                />
                {chat.pensando ? (
                  <Pressable
                    onPress={chat.detener}
                    accessibilityRole="button"
                    accessibilityLabel="Detener"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      borderWidth: 1,
                      borderColor: '#2B2B33',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Feather name="square" size={14} color={O.white} />
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={onEnviar}
                    disabled={!puedeEnviar}
                    accessibilityRole="button"
                    accessibilityLabel="Enviar"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: O.lime,
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: puedeEnviar ? 1 : 0.35,
                    }}>
                    <Feather name="arrow-up" size={18} color="#0A0A0C" />
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>

        {panel ? (
          <ScrollView
            style={{
              width: 340,
              borderLeftWidth: 1,
              borderLeftColor: '#18191F',
              backgroundColor: '#0B0C0E',
            }}
            contentContainerStyle={{ padding: 24, gap: 20 }}>
            <View style={{ ...TARJETA, padding: 20, gap: 12 }}>
              <Etiqueta s={9} ls={0.2} c="#676B77">
                Tarea
              </Etiqueta>
              <T s={14} w={500} lh={20} c="#F1F3F7">
                {e.nombre}
              </T>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Punto color={info.color} />
                <T s={12} c="#9393A2" numberOfLines={1} style={{ flex: 1 }}>
                  {info.nombre}
                </T>
              </View>
              {e.fecha ? (
                <View
                  style={{ paddingTop: 12, borderTopWidth: 1, borderTopColor: '#1A1C22', gap: 4 }}>
                  <T
                    k="mono"
                    s={11.5}
                    w={600}
                    c={urgente || e.estado === 'vencida' ? '#F59E0B' : O.white}>
                    {diaMesHora(e.fecha)}
                  </T>
                  {e.fecha * 1000 > nowMs ? (
                    <T k="mono" s={11} c="#7C808E">
                      {quedan(e.fecha, nowMs)}
                    </T>
                  ) : null}
                </View>
              ) : null}
            </View>
            <View style={{ ...TARJETA, padding: 20, gap: 10 }}>
              <Etiqueta s={9} ls={0.2} c="#676B77">
                Contexto para la IA
              </Etiqueta>
              <Contexto texto="Enunciado y fechas" />
              {plantilla ? <Contexto texto={`Plantilla: ${plantilla.nombre}`} /> : null}
              {conEstilo ? <Contexto texto="Tu estilo de escritura" /> : null}
              {adjuntables.map((a) => (
                <Contexto
                  key={a.fileurl}
                  texto={`${a.nombre} · ${formatoTamano(a.size)}`}
                  apagado={!seleccion.includes(a.fileurl)}
                />
              ))}
            </View>
            <Pressable
              onPress={() => router.push({ pathname: '/tarea/[key]', params: { key: e.key } })}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                paddingVertical: 10,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: '#24272F',
              }}>
              <T k="mono" up s={10} ls={0.14} c="#A4A9B6">
                Ver la tarea completa
              </T>
              <Feather name="arrow-right" size={12} color="#797E8D" />
            </Pressable>
          </ScrollView>
        ) : null}
      </View>
    </MarcoObsidiana>
  );
}

function Contexto({ texto, apagado }: { texto: string; apagado?: boolean }) {
  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, opacity: apagado ? 0.4 : 1 }}>
      <Feather
        name={apagado ? 'circle' : 'check'}
        size={12}
        color={apagado ? '#6B6B77' : '#84CC16'}
      />
      <T k="mono" s={11} c="#9393A2" numberOfLines={1} style={{ flex: 1 }}>
        {texto}
      </T>
    </View>
  );
}

function Mensaje({
  m,
  esUltimo,
  onReintentar,
  onVer,
  onEntregar,
  viendo,
  entregando,
}: {
  m: MensajeChat;
  esUltimo: boolean;
  onReintentar: () => void;
  onVer: (d: DocumentoIA) => void;
  onEntregar?: (d: DocumentoIA) => void;
  viendo: string | null;
  entregando: string | null;
}) {
  const movil = useMovil();
  if (m.rol === 'usuario') {
    return (
      <View
        style={{
          alignSelf: 'flex-end',
          maxWidth: movil ? '90%' : '80%',
          gap: 8,
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderRadius: 12,
          backgroundColor: '#1B2311',
          borderWidth: 1,
          borderColor: '#43561B',
        }}>
        {m.texto ? (
          <T s={13.5} lh={21} c={O.white} selectable>
            {m.texto}
          </T>
        ) : null}
        {m.adjuntos?.map((a) => (
          <View key={a.fileurl} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Feather name="paperclip" size={11} color={O.lime} />
            <T k="mono" s={10.5} c={O.lime} numberOfLines={1} style={{ flexShrink: 1 }}>
              {a.nombre}
            </T>
          </View>
        ))}
      </View>
    );
  }

  if (m.rol === 'error') {
    return (
      <View
        style={{
          gap: 10,
          padding: 16,
          borderRadius: 12,
          backgroundColor: '#2A1414',
          borderWidth: 1,
          borderColor: '#4A2020',
        }}>
        <T s={13} lh={20} c="#F87171">
          {m.texto}
        </T>
        {esUltimo ? (
          <Pressable
            onPress={onReintentar}
            style={{
              alignSelf: 'flex-start',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: '#4A2020',
            }}>
            <Feather name="refresh-cw" size={12} color="#F87171" />
            <T k="mono" up s={10} ls={0.14} c="#F87171">
              Reintentar
            </T>
          </Pressable>
        ) : null}
      </View>
    );
  }

  const partes = extraerDocumentos(m.texto);
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Feather name="star" size={12} color={O.lime} />
        <T k="mono" up s={9.5} w={700} ls={0.18} c={O.lime}>
          Hermes
        </T>
        <T k="mono" s={10} c="#555963" numberOfLines={1} style={{ flex: 1 }}>
          {m.modelo}
        </T>
        <Pressable
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Copiar respuesta"
          onPress={async () => {
            await Clipboard.setStringAsync(m.texto);
          }}>
          <Feather name="copy" size={13} color="#5F6371" />
        </Pressable>
      </View>
      <View style={{ ...TARJETA, padding: 20, gap: 12 }}>
        {partes.map((p, i) =>
          p.tipo === 'texto' ? (
            <TextoMarkdown key={i} texto={p.texto} />
          ) : (
            <DocumentoCard
              key={i}
              doc={p.doc}
              onVer={() => onVer(p.doc)}
              onEntregar={onEntregar ? () => onEntregar(p.doc) : undefined}
              viendo={viendo === p.doc.nombre}
              entregando={entregando === p.doc.nombre}
            />
          ),
        )}
      </View>
    </View>
  );
}

function ChipFormato({
  texto,
  icono,
  activo,
  alPulsar,
}: {
  texto: string;
  icono?: React.ComponentProps<typeof Feather>['name'];
  activo?: boolean;
  alPulsar: () => void;
}) {
  return (
    <Pressable
      onPress={alPulsar}
      accessibilityRole="button"
      accessibilityState={{ selected: !!activo }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        maxWidth: 220,
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 999,
        borderWidth: 1,
        backgroundColor: activo ? '#1B2311' : '#121317',
        borderColor: activo ? '#43561B' : '#26262E',
      }}>
      {icono ? <Feather name={icono} size={12} color={activo ? O.lime : '#9393A2'} /> : null}
      <T
        k="mono"
        s={11}
        c={activo ? O.lime : '#C3C7D2'}
        numberOfLines={1}
        style={{ flexShrink: 1 }}>
        {texto}
      </T>
    </Pressable>
  );
}
