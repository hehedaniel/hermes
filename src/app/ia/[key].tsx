import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Clipboard from 'expo-clipboard';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DocumentoCard } from '@/components/documento-card';
import { IASettings } from '@/components/ia-settings';
import { TextoMarkdown } from '@/components/texto-markdown';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Vacio } from '@/components/vacio';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Archivo, Entrega } from '@/lib/data';
import { avisar, confirmar } from '@/lib/dialogo';
import { verDocumento } from '@/lib/ia/archivos-ia';
import type { MensajeChat } from '@/lib/ia/chats';
import { type DocumentoIA, extraerDocumentos } from '@/lib/ia/documentos';
import { adjuntoCompatible, PROVEEDORES } from '@/lib/ia/proveedores';
import { useChatIA } from '@/lib/ia/use-chat';
import { useEntregar } from '@/lib/ia/use-entregar';
import { useMoodle } from '@/lib/store';

const SUGERENCIAS = [
  'Explícame qué piden y cómo lo enfoco',
  'Hazme la tarea completa en un PDF listo para entregar',
  'Hazme un esquema de los puntos que tengo que tratar',
];

/** Conversación con la IA sobre una tarea: preguntar, adjuntar sus archivos, ver y entregar lo que genera. */
export default function ChatIAScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const { snapshot } = useMoodle();
  const e = snapshot?.entregas.find((x) => x.key === key);

  if (!e) {
    return (
      <ThemedView style={[styles.flex, { padding: Spacing.three }]}>
        <Stack.Screen options={{ title: 'IA' }} />
        <Vacio titulo="No encontrada" texto="Esta tarea ya no aparece en Moodle." />
      </ThemedView>
    );
  }
  return <Chat e={e} />;
}

function Chat({ e }: { e: Entrega }) {
  const theme = useTheme();
  const chat = useChatIA(e);
  const { entregar, entregando, puede } = useEntregar(e);
  const headerHeight = useHeaderHeight();
  const { bottom } = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [texto, setTexto] = useState('');
  const [elegidos, setSeleccion] = useState<string[] | null>(null);
  const [viendo, setViendo] = useState<string | null>(null);

  const adjuntables = useMemo(
    () => (e.adjuntos ?? []).filter((a) => adjuntoCompatible(a.nombre, a.mimetype)),
    [e.adjuntos],
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

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen
        options={{
          title: proveedor ? `IA · ${proveedor}` : 'IA',
          headerRight: chat.mensajes.length
            ? () => (
                <Pressable hitSlop={12} onPress={onBorrar} accessibilityLabel="Borrar conversación">
                  <MaterialIcons name="delete-outline" size={23} color={theme.text} />
                </Pressable>
              )
            : undefined,
        }}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
        keyboardVerticalOffset={headerHeight}>
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.contenido}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
            {e.curso} · {e.nombre}
          </ThemedText>

          {sinClave ? (
            <IASettings onCambio={chat.recargarAjustes} />
          ) : !chat.mensajes.length && chat.cargado ? (
            <View style={[styles.intro, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="smallBold">¿En qué te ayudo con esta tarea?</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                La IA ya conoce el enunciado y la fecha. Marca abajo los archivos de la tarea que
                quieras pasarle. Si le pides el trabajo, te lo da como documento para verlo y
                {puede ? ' entregarlo desde aquí.' : ' descargarlo.'}
              </ThemedText>
              {SUGERENCIAS.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setTexto(s)}
                  style={({ pressed }) => [
                    styles.sugerencia,
                    { borderColor: theme.border, opacity: pressed ? 0.6 : 1 },
                  ]}>
                  <ThemedText type="small">{s}</ThemedText>
                </Pressable>
              ))}
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
              <ActivityIndicator color={theme.accent} />
              <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
                {chat.pensando}
              </ThemedText>
            </View>
          ) : null}
        </ScrollView>

        <View
          style={[
            styles.barra,
            {
              borderTopColor: theme.border,
              backgroundColor: theme.background,
              paddingBottom: Math.max(bottom, Spacing.two),
            },
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
                    style={[
                      styles.chip,
                      {
                        backgroundColor: on ? theme.accent : theme.backgroundElement,
                      },
                    ]}>
                    <MaterialIcons
                      name={on ? 'check' : 'attach-file'}
                      size={15}
                      color={on ? theme.onAccent : theme.textSecondary}
                    />
                    <ThemedText
                      type="small"
                      numberOfLines={1}
                      style={[styles.chipTexto, { color: on ? theme.onAccent : theme.text }]}>
                      {a.nombre}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}
          <View style={styles.entrada}>
            <TextInput
              value={texto}
              onChangeText={setTexto}
              placeholder={sinClave ? 'Configura la IA arriba' : 'Escribe a la IA…'}
              placeholderTextColor={theme.textSecondary}
              editable={!sinClave}
              multiline
              style={[
                styles.input,
                { color: theme.text, backgroundColor: theme.backgroundElement },
              ]}
            />
            {chat.pensando ? (
              <Pressable
                accessibilityLabel="Detener"
                onPress={chat.detener}
                hitSlop={8}
                style={[styles.enviar, { backgroundColor: theme.backgroundElement }]}>
                <MaterialIcons name="stop" size={22} color={theme.text} />
              </Pressable>
            ) : (
              <Pressable
                accessibilityLabel="Enviar"
                onPress={onEnviar}
                hitSlop={8}
                disabled={sinClave || (!texto.trim() && !seleccion.length)}
                style={[
                  styles.enviar,
                  {
                    backgroundColor: theme.accent,
                    opacity: sinClave || (!texto.trim() && !seleccion.length) ? 0.4 : 1,
                  },
                ]}>
                <MaterialIcons name="send" size={20} color={theme.onAccent} />
              </Pressable>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
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
      <View style={[styles.burbuja, styles.mia, { backgroundColor: theme.accent }]}>
        {m.texto ? (
          <ThemedText type="small" style={{ color: theme.onAccent }} selectable>
            {m.texto}
          </ThemedText>
        ) : null}
        {m.adjuntos?.map((a) => (
          <ThemedText
            key={a.fileurl}
            type="small"
            numberOfLines={1}
            style={{ color: theme.onAccent, opacity: 0.85 }}>
            📎 {a.nombre}
          </ThemedText>
        ))}
      </View>
    );
  }

  if (m.rol === 'error') {
    return (
      <View style={[styles.burbuja, styles.suya, { borderColor: theme.vencida, borderWidth: 1 }]}>
        <ThemedText type="small" style={{ color: theme.vencida }}>
          {m.texto}
        </ThemedText>
        {esUltimo ? (
          <ThemedText type="smallBold" style={{ color: theme.accent }} onPress={onReintentar}>
            Reintentar
          </ThemedText>
        ) : null}
      </View>
    );
  }

  const partes = extraerDocumentos(m.texto);
  return (
    <View style={[styles.burbuja, styles.suya, { backgroundColor: theme.backgroundElement }]}>
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
      <View style={styles.pie}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.modelo} numberOfLines={1}>
          {m.modelo}
        </ThemedText>
        <Pressable
          hitSlop={10}
          onPress={async () => {
            await Clipboard.setStringAsync(m.texto);
          }}>
          <MaterialIcons name="content-copy" size={16} color={theme.textSecondary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  contenido: {
    padding: Spacing.three,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  intro: { borderRadius: 14, padding: Spacing.three, gap: Spacing.two },
  sugerencia: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  burbuja: { borderRadius: 16, padding: Spacing.three - 4, gap: Spacing.two },
  mia: { alignSelf: 'flex-end', maxWidth: '85%', borderBottomRightRadius: 4 },
  suya: { alignSelf: 'stretch', borderBottomLeftRadius: 4 },
  pie: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  modelo: { flex: 1, fontSize: 11, lineHeight: 14 },
  pensando: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  barra: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.two,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  chips: { gap: Spacing.two },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: 240,
  },
  chipTexto: { fontSize: 13, lineHeight: 18, flexShrink: 1 },
  entrada: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    maxHeight: 140,
  },
  enviar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
