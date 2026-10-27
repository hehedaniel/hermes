import Feather from '@expo/vector-icons/Feather';
import * as Clipboard from 'expo-clipboard';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Campo } from '@/components/ajustes-ui';
import { EstadoChip, IconoIA, Marca, Seccion } from '@/components/anden';
import { Button } from '@/components/button';
import { DocumentoCard } from '@/components/documento-card';
import { esUrgente } from '@/components/entrega-card';
import { IASettings } from '@/components/ia-settings';
import { TextoMarkdown } from '@/components/texto-markdown';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Vacio } from '@/components/vacio';
import { ANCHO_ESCRITORIO, ANCHO_TABLETA, MARGEN, Radii, Spacing } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme, useThemePreference } from '@/hooks/use-theme';
import type { Archivo, Entrega } from '@/lib/data';
import { avisar, confirmar } from '@/lib/dialogo';
import { formatoTamano } from '@/lib/downloads';
import { diaMesHora, quedan } from '@/lib/format';
import { verDocumento } from '@/lib/ia/archivos-ia';
import type { MensajeChat } from '@/lib/ia/chats';
import { type DocumentoIA, extraerDocumentos } from '@/lib/ia/documentos';
import { adjuntoCompatible, PROVEEDORES } from '@/lib/ia/proveedores';
import { useChatIA } from '@/lib/ia/use-chat';
import { useEntregar } from '@/lib/ia/use-entregar';
import { useAsignaturas, useMoodle } from '@/lib/store';

const SUGERENCIAS = [
  'Explícame qué piden y cómo lo enfoco',
  'Hazme la tarea completa en un PDF listo para entregar',
  'Hazme un esquema de los puntos que tengo que tratar',
];

/** A partir de este ancho, el contexto de la tarea va en un panel a la derecha. */
const ANCHO_PANEL = 900;
/** Ancho de lectura de la conversación */
const ANCHO_CHAT = 760;

/** Conversación con la IA sobre una tarea: preguntar, adjuntar sus archivos, ver y entregar lo que genera. */
export default function ChatIAScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const { snapshot } = useMoodle();
  const e = snapshot?.entregas.find((x) => x.key === key);

  if (!e) {
    return (
      <ThemedView style={[styles.flex, { padding: MARGEN }]}>
        <Stack.Screen options={{ title: 'IA' }} />
        <Vacio
          icono="search"
          tono="neutro"
          titulo="No encontrada"
          texto="Esta tarea ya no aparece en Moodle."
        />
      </ThemedView>
    );
  }
  return <Chat e={e} />;
}

function Chat({ e }: { e: Entrega }) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { tema } = useThemePreference();
  const info = useAsignaturas()(e.cursoId, e.curso);
  const nowMs = useNow();
  const chat = useChatIA(e);
  const { entregar, entregando, puede } = useEntregar(e);
  const headerHeight = useHeaderHeight();
  const { bottom, top } = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [texto, setTexto] = useState('');
  const [elegidos, setSeleccion] = useState<string[] | null>(null);
  const [viendo, setViendo] = useState<string | null>(null);

  const proveedorId = chat.ajustes?.config.proveedor ?? 'gemini';
  const adjuntables = useMemo(
    () => (e.adjuntos ?? []).filter((a) => adjuntoCompatible(a.nombre, a.mimetype, proveedorId)),
    [e.adjuntos, proveedorId],
  );

  // Hasta que se toquen, en una conversación nueva van marcados todos los archivos de la tarea
  const seleccion =
    elegidos ?? (chat.cargado && !chat.mensajes.length ? adjuntables.map((a) => a.fileurl) : []);

  const sinClave = chat.ajustes !== null && !chat.ajustes.clave;
  const proveedor = chat.ajustes ? PROVEEDORES[chat.ajustes.config.proveedor].nombre : '';

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

  const ultimo = chat.mensajes.at(-1);
  const modelo = chat.ajustes?.modelo ?? '';
  const conPanel = width >= ANCHO_PANEL;
  const nocturnoWeb =
    Platform.OS === 'web' &&
    width >= ANCHO_ESCRITORIO &&
    conPanel &&
    (tema === 'nocturno' || tema === 'cuaderno');
  const nocturnoMovil =
    width < ANCHO_TABLETA && (tema === 'nocturno' || tema === 'cuaderno');
  const nocturnoDesign = nocturnoWeb || nocturnoMovil;
  const vacio = !chat.mensajes.length && chat.cargado;
  const puedeEnviar = !sinClave && (!!texto.trim() || !!seleccion.length);

  const cabecera = () => (
    <View style={[styles.cabecera, { maxWidth: Math.min(560, width - (conPanel ? 420 : 170)) }]}>
      <ThemedText style={styles.cabeceraTitulo} numberOfLines={1}>
        {e.nombre}
      </ThemedText>
      <ThemedText type="meta" themeColor="ink3" numberOfLines={1}>
        {proveedor ? `IA · ${proveedor}${modelo ? ` · ${modelo}` : ''}` : 'IA'}
      </ThemedText>
    </View>
  );

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen
        options={{
          headerShown: !nocturnoDesign,
          headerTitle: cabecera,
          headerTitleAlign: 'left',
          headerRight: () => (
            <View style={styles.cabeceraDerecha}>
              <View style={[styles.marcaIA, { backgroundColor: theme.paper2 }]}>
                <IconoIA size={11} color={theme.ink2} />
                <ThemedText type="label" themeColor="ink2" style={styles.marcaTexto}>
                  {info.siglas}
                </ThemedText>
              </View>
              {chat.mensajes.length ? (
                <Pressable
                  hitSlop={12}
                  onPress={onBorrar}
                  accessibilityRole="button"
                  accessibilityLabel="Borrar conversación">
                  <Feather name="trash-2" size={18} color={theme.ink2} />
                </Pressable>
              ) : null}
            </View>
          ),
        }}
      />
      {nocturnoWeb ? (
        <View style={[styles.nocturnoChatHeader, { borderBottomColor: theme.line }]}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Volver"
            style={[
              styles.nocturnoBack,
              { borderColor: theme.line, backgroundColor: theme.surface },
            ]}>
            <Feather name="arrow-left" size={16} color={theme.ink2} />
          </Pressable>
          <View style={styles.nocturnoChatMark}>
            <View style={[styles.nocturnoChatIcon, { backgroundColor: theme.brand }]}>
              <IconoIA size={17} color={theme.brandInk} />
            </View>
            <View style={styles.flex}>
              <ThemedText type="label" themeColor="ink2">
                ASISTENTE DE HERMES
              </ThemedText>
              <ThemedText type="smallBold" numberOfLines={1}>
                Hacer con IA
              </ThemedText>
            </View>
          </View>
          <View style={[styles.nocturnoTaskBadge, { backgroundColor: theme.surface2 }]}>
            <ThemedText type="label" style={{ color: info.color }}>
              {info.siglas}
            </ThemedText>
            <ThemedText type="meta" themeColor="ink2" numberOfLines={1}>
              {e.nombre}
            </ThemedText>
          </View>
          {chat.mensajes.length ? (
            <Pressable
              hitSlop={12}
              onPress={onBorrar}
              accessibilityRole="button"
              accessibilityLabel="Borrar conversación"
              style={styles.nocturnoDelete}>
              <Feather name="trash-2" size={17} color={theme.ink2} />
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {nocturnoMovil ? (
        <View
          style={[
            styles.nocturnoMobileChatHeader,
            { borderBottomColor: theme.line, paddingTop: top + 8 },
          ]}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Volver a la tarea"
            style={[
              styles.nocturnoBack,
              { borderColor: theme.line, backgroundColor: theme.surface },
            ]}>
            <Feather name="arrow-left" size={16} color={theme.ink2} />
          </Pressable>
          <View style={[styles.nocturnoChatIcon, { backgroundColor: theme.brand }]}>
            <IconoIA size={16} color={theme.brandInk} />
          </View>
          <View style={styles.flex}>
            <ThemedText type="smallBold">Hacer con IA</ThemedText>
            <ThemedText type="meta" themeColor="ink2" numberOfLines={1}>
              {info.nombre} · {e.nombre}
            </ThemedText>
          </View>
          {chat.mensajes.length ? (
            <Pressable
              onPress={onBorrar}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Borrar conversación">
              <Feather name="trash-2" size={17} color={theme.ink2} />
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <View style={[styles.flex, styles.fila, nocturnoWeb && styles.nocturnoFila]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior="padding"
          keyboardVerticalOffset={nocturnoDesign ? 0 : headerHeight}>
          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            contentContainerStyle={[
              styles.contenido,
              nocturnoWeb && styles.nocturnoContenido,
              nocturnoMovil && styles.nocturnoMobileContent,
              vacio && !sinClave && styles.contenidoVacio,
            ]}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
            {sinClave ? (
              <>
                <Vacio
                  icono="ia"
                  titulo="Elige tu IA"
                  texto="Para hablar con la IA sobre esta tarea, elige un proveedor y pega tu clave. Solo hay que hacerlo una vez."
                />
                <IASettings onCambio={chat.recargarAjustes} />
              </>
            ) : vacio ? (
              <View
                style={[
                  styles.intro,
                  nocturnoWeb && styles.nocturnoIntro,
                  nocturnoMovil && styles.nocturnoMobileIntro,
                ]}>
                {nocturnoDesign ? (
                  <View
                    style={[
                      styles.nocturnoWelcome,
                      { backgroundColor: theme.surface, borderColor: theme.line },
                    ]}>
                    <View
                      style={[
                        styles.nocturnoWelcomeIcon,
                        { backgroundColor: theme.brandWash },
                      ]}>
                      <IconoIA size={22} color={theme.brand} />
                    </View>
                    <ThemedText type="heading" style={styles.nocturnoWelcomeTitle}>
                      Empecemos con tu tarea
                    </ThemedText>
                    <ThemedText type="small" themeColor="ink2" style={styles.nocturnoWelcomeText}>
                      Ya tengo el enunciado y las fechas de entrega. Puedes pedirme que te explique
                      el ejercicio, que prepare un esquema o que revise tus ideas.
                    </ThemedText>
                  </View>
                ) : (
                  <Vacio
                    icono="ia"
                    titulo="Pregúntale lo que quieras"
                    texto={`La IA ya conoce el enunciado y la fecha. Marca abajo los archivos que quieras pasarle. Si le pides el trabajo, te lo da como documento para verlo y ${puede ? 'entregarlo desde aquí' : 'descargarlo'}.`}
                  />
                )}
                {nocturnoDesign ? (
                  <ThemedText type="label" themeColor="ink2">
                    EMPIEZA CON UNA IDEA
                  </ThemedText>
                ) : null}
                {SUGERENCIAS.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => setTexto(s)}
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.sugerencia,
                      nocturnoDesign && styles.nocturnoSugerencia,
                      {
                        borderColor: theme.line2,
                        backgroundColor: pressed ? theme.paper2 : theme.surface,
                      },
                    ]}>
                    <IconoIA size={15} color={theme.brand} />
                    <ThemedText type="small" style={[styles.flex, { fontWeight: 500 }]}>
                      {s}
                    </ThemedText>
                  </Pressable>
                ))}
                <ThemedText type="meta" themeColor="ink3" style={styles.nota}>
                  {nocturnoDesign
                    ? `La tarea y sus archivos se usarán como contexto · ${proveedor || 'Configura tu proveedor en Perfil'}${modelo ? ` · ${modelo}` : ''}`
                    : 'Cada mensaje gasta cuota del proveedor que elijas en Ajustes.'}
                </ThemedText>
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
              <View style={styles.pensando}>
                <ActivityIndicator size="small" color={theme.brand} />
                <ThemedText type="meta" themeColor="ink2" style={styles.flex}>
                  {chat.pensando}
                </ThemedText>
              </View>
            ) : null}
          </ScrollView>

          <View
            style={[
              styles.barra,
              nocturnoWeb && styles.nocturnoBarra,
              nocturnoMovil && styles.nocturnoMobileBarra,
              {
                borderTopColor: theme.line,
                backgroundColor: theme.paper,
                paddingBottom: Math.max(bottom, Spacing.two + 2),
              },
            ]}>
            <View
              style={[
                styles.barraDentro,
                nocturnoWeb && styles.nocturnoBarraDentro,
                nocturnoMovil && styles.nocturnoMobileBarraDentro,
              ]}>
              {adjuntables.length ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chips}
                  keyboardShouldPersistTaps="handled">
                  {adjuntables.map((a) => {
                    const on = seleccion.includes(a.fileurl);
                    return (
                      <Pressable
                        key={a.fileurl}
                        onPress={() => alternar(a)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: on }}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: on ? theme.brandWash : theme.surface,
                            borderColor: on ? theme.brand : theme.line2,
                          },
                        ]}>
                        <Feather
                          name={on ? 'check' : 'paperclip'}
                          size={12}
                          color={on ? theme.brand : theme.ink2}
                        />
                        <ThemedText
                          numberOfLines={1}
                          style={[styles.chipTexto, { color: on ? theme.brand : theme.ink }]}>
                          {a.nombre}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              ) : null}
              <View
                style={[
                  styles.entrada,
                  nocturnoDesign && [
                    styles.nocturnoEntrada,
                    { backgroundColor: theme.surface, borderColor: theme.line2 },
                  ],
                ]}>
                <Campo
                  value={texto}
                  onChangeText={setTexto}
                  placeholder={sinClave ? 'Configura la IA arriba' : 'Pregunta o pide el trabajo…'}
                  editable={!sinClave}
                  multiline
                  style={[styles.input, nocturnoDesign && styles.nocturnoInput]}
                />
                {chat.pensando ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Detener"
                    onPress={chat.detener}
                    hitSlop={6}
                    style={[
                      styles.enviar,
                      nocturnoWeb && styles.nocturnoEnviar,
                      nocturnoMovil && styles.nocturnoEnviar,
                      { backgroundColor: theme.surface, borderColor: theme.line2, borderWidth: 1 },
                    ]}>
                    <Feather name="square" size={16} color={theme.ink} />
                  </Pressable>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Enviar"
                    onPress={onEnviar}
                    hitSlop={6}
                    disabled={!puedeEnviar}
                    style={[
                      styles.enviar,
                      nocturnoWeb && styles.nocturnoEnviar,
                      nocturnoMovil && styles.nocturnoEnviar,
                      { backgroundColor: theme.brand, opacity: puedeEnviar ? 1 : 0.4 },
                    ]}>
                    <Feather name="send" size={18} color={theme.brandInk} />
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>

        {conPanel ? (
          <View
            style={[
              styles.panel,
              nocturnoWeb && styles.nocturnoPanel,
              { borderLeftColor: theme.line, backgroundColor: nocturnoWeb ? theme.paper2 : theme.surface2 },
            ]}>
            <ScrollView contentContainerStyle={styles.panelContenido}>
              <View style={styles.panelBloque}>
                <Seccion titulo="Tarea" sinRegla />
                <ThemedText type="smallBold" style={styles.panelTitulo}>
                  {e.nombre}
                </ThemedText>
                <View style={styles.filaChips}>
                  <EstadoChip estado={e.estado} />
                  {esUrgente(e, nowMs) ? (
                    <Marca texto={quedan(e.fecha, nowMs).replace('Quedan ', '')} color={theme.urgent} fondo={theme.urgentWash} />
                  ) : null}
                </View>
              </View>
              {e.fecha ? (
                <View style={styles.panelBloque}>
                  <Seccion titulo="Entrega" sinRegla />
                  <ThemedText
                    type="cifra"
                    style={{ color: esUrgente(e, nowMs) || e.estado === 'vencida' ? theme.urgent : theme.ink }}>
                    {diaMesHora(e.fecha)}
                  </ThemedText>
                </View>
              ) : null}
              <View style={styles.panelBloque}>
                <Seccion titulo="Contexto para la IA" sinRegla />
                <ContextoFila texto="Enunciado y fechas" />
                {adjuntables.map((a) => (
                  <ContextoFila
                    key={a.fileurl}
                    texto={`${a.nombre} · ${formatoTamano(a.size)}`}
                    apagado={!seleccion.includes(a.fileurl)}
                  />
                ))}
              </View>
              <Button
                title="Ver la tarea completa"
                variant="secondary"
                icono="arrow-right"
                compacto
                onPress={() => router.push({ pathname: '/tarea/[key]', params: { key: e.key } })}
              />
            </ScrollView>
          </View>
        ) : null}
      </View>
    </ThemedView>
  );
}

function ContextoFila({ texto, apagado }: { texto: string; apagado?: boolean }) {
  const theme = useTheme();
  return (
    <View style={[styles.contexto, apagado && { opacity: 0.45 }]}>
      <Feather name={apagado ? 'circle' : 'check'} size={12} color={apagado ? theme.ink3 : theme.stDone} />
      <ThemedText type="meta" themeColor="ink2" numberOfLines={1} style={styles.flex}>
        {texto}
      </ThemedText>
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
  const theme = useTheme();

  if (m.rol === 'usuario') {
    return (
      <View style={[styles.burbuja, styles.mia, { backgroundColor: theme.brand }]}>
        {m.texto ? (
          <ThemedText style={[styles.textoMio, { color: theme.brandInk }]} selectable>
            {m.texto}
          </ThemedText>
        ) : null}
        {m.adjuntos?.map((a) => (
          <View key={a.fileurl} style={styles.adjunto}>
            <Feather name="paperclip" size={11} color={theme.brandInk} />
            <ThemedText
              type="meta"
              numberOfLines={1}
              style={[styles.flexShrink, { color: theme.brandInk, opacity: 0.9 }]}>
              {a.nombre}
            </ThemedText>
          </View>
        ))}
      </View>
    );
  }

  if (m.rol === 'error') {
    return (
      <View
        style={[
          styles.burbuja,
          styles.suya,
          { backgroundColor: theme.urgentWash, borderColor: theme.urgent, borderWidth: 1 },
        ]}>
        <ThemedText type="small" style={{ color: theme.urgent }}>
          {m.texto}
        </ThemedText>
        {esUltimo ? (
          <View style={styles.reintentar}>
            <Button title="Reintentar" variant="secondary" icono="refresh-cw" compacto onPress={onReintentar} />
          </View>
        ) : null}
      </View>
    );
  }

  const partes = extraerDocumentos(m.texto);
  return (
    <View
      style={[
        styles.burbuja,
        styles.suya,
        { backgroundColor: theme.surface, borderColor: theme.line, borderWidth: 1 },
      ]}>
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
      <View style={[styles.pie, { borderTopColor: theme.line }]}>
        <ThemedText type="meta" themeColor="ink3" style={styles.flex} numberOfLines={1}>
          {m.modelo}
        </ThemedText>
        <Pressable
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Copiar respuesta"
          onPress={async () => {
            await Clipboard.setStringAsync(m.texto);
          }}>
          <Feather name="copy" size={14} color={theme.ink3} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexShrink: { flexShrink: 1 },
  fila: { flexDirection: 'row' },
  cabecera: {},
  cabeceraTitulo: { fontSize: 14.5, lineHeight: 19, fontWeight: 600 },
  cabeceraDerecha: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingRight: 4 },
  nocturnoChatHeader: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
  },
  nocturnoMobileChatHeader: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: MARGEN,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  nocturnoBack: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: Radii.control,
  },
  nocturnoChatMark: { flexDirection: 'row', alignItems: 'center', gap: 10, width: 205 },
  nocturnoChatIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nocturnoTaskBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: Radii.control,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  nocturnoDelete: { width: 34, alignItems: 'center' },
  nocturnoFila: { minHeight: 0 },
  marcaIA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: Radii.chip,
  },
  marcaTexto: { fontSize: 9.5 },
  contenido: {
    padding: MARGEN,
    gap: Spacing.three,
    width: '100%',
    maxWidth: ANCHO_CHAT,
    alignSelf: 'center',
  },
  nocturnoContenido: { maxWidth: 900, paddingHorizontal: 32, paddingVertical: 28 },
  nocturnoMobileContent: {
    paddingHorizontal: MARGEN,
    paddingVertical: Spacing.three,
    paddingBottom: Spacing.four,
  },
  contenidoVacio: { flexGrow: 1, justifyContent: 'center' },
  intro: { gap: 10, maxWidth: 440, width: '100%', alignSelf: 'center' },
  nocturnoIntro: { maxWidth: 620, gap: 14 },
  nocturnoMobileIntro: { maxWidth: 520, gap: 12, paddingVertical: 8 },
  nocturnoWelcome: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 28,
    paddingVertical: 24,
    marginBottom: 8,
  },
  nocturnoWelcomeIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  nocturnoWelcomeTitle: { fontSize: 20, textAlign: 'center' },
  nocturnoWelcomeText: { maxWidth: 430, textAlign: 'center', marginTop: 6 },
  sugerencia: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: Radii.control,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  nocturnoSugerencia: { borderRadius: Radii.pastilla, paddingVertical: 10 },
  nota: { textAlign: 'center', marginTop: 4 },
  burbuja: { borderRadius: Radii.superficie, paddingHorizontal: 13, paddingVertical: 11, gap: 8 },
  mia: { alignSelf: 'flex-end', maxWidth: '86%', borderBottomRightRadius: 4 },
  suya: { alignSelf: 'flex-start', maxWidth: '94%', borderBottomLeftRadius: 4 },
  textoMio: { fontSize: 14.5, lineHeight: 21 },
  adjunto: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  reintentar: { alignSelf: 'flex-start' },
  pie: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderTopWidth: 1,
    paddingTop: 7,
  },
  pensando: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  barra: { borderTopWidth: 1, paddingTop: 10, paddingHorizontal: MARGEN },
  nocturnoBarra: { paddingTop: 12, paddingBottom: 12, paddingHorizontal: 24 },
  nocturnoMobileBarra: { paddingTop: 10, paddingHorizontal: MARGEN },
  barraDentro: { gap: 8, width: '100%', maxWidth: ANCHO_CHAT, alignSelf: 'center' },
  nocturnoBarraDentro: { maxWidth: 900, gap: 10 },
  nocturnoMobileBarraDentro: { maxWidth: 560, gap: 8 },
  chips: { gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: Radii.pastilla,
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: 220,
  },
  chipTexto: { fontSize: 12, lineHeight: 16, fontWeight: 500, flexShrink: 1 },
  entrada: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  nocturnoEntrada: {
    alignItems: 'flex-end',
    borderWidth: 1,
    borderRadius: 14,
    gap: 8,
    padding: 6,
  },
  input: { flex: 1, maxHeight: 140, minHeight: 46 },
  nocturnoInput: { borderWidth: 0, backgroundColor: 'transparent', paddingVertical: 10 },
  enviar: {
    width: 46,
    height: 46,
    borderRadius: Radii.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nocturnoEnviar: { width: 40, height: 40, borderRadius: 12 },
  panel: { width: 300, borderLeftWidth: 1 },
  nocturnoPanel: { width: 340 },
  panelContenido: { padding: 22, gap: Spacing.four },
  panelBloque: { gap: 6 },
  panelTitulo: { fontSize: 15, lineHeight: 20 },
  filaChips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  contexto: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 },
});
