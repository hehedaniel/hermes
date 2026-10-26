import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { StyleSheet, View } from 'react-native';

import { ArchivoRow } from '@/components/archivo-row';
import { Button } from '@/components/button';
import { EstadoChip } from '@/components/entrega-card';
import { Screen, SectionTitle } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Vacio } from '@/components/vacio';
import { Spacing } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { fechaCorta, relativo } from '@/lib/format';
import { htmlATexto } from '@/lib/html-texto';
import { hayChat } from '@/lib/ia/chats';
import { useCourseColors, useMoodle } from '@/lib/store';

const TIPO: Record<string, string> = {
  assign: 'Tarea',
  quiz: 'Cuestionario',
  scorm: 'Lección SCORM',
  forum: 'Foro',
  lesson: 'Lección',
  workshop: 'Taller',
};

export default function TareaScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const { snapshot } = useMoodle();
  const theme = useTheme();
  const nowMs = useNow();
  const colorOf = useCourseColors();
  const e = snapshot?.entregas.find((x) => x.key === key);
  const [conChat, setConChat] = useState(false);
  useFocusEffect(
    useCallback(() => {
      if (key) hayChat(key).then(setConChat);
    }, [key]),
  );

  if (!e) {
    return (
      <Screen refreshable={false}>
        <Vacio
          titulo="No encontrada"
          texto="Esta entrega ya no aparece en Moodle. Tira para actualizar en Pendientes."
        />
      </Screen>
    );
  }

  const texto = htmlATexto(e.enunciado);
  const fechas = [
    e.apertura ? { label: 'Abre', ts: e.apertura } : null,
    e.fecha ? { label: 'Fecha de entrega', ts: e.fecha } : null,
    e.corte && e.corte !== e.fecha ? { label: 'Cierre definitivo', ts: e.corte } : null,
  ].filter(Boolean) as { label: string; ts: number }[];

  return (
    <>
      <Stack.Screen options={{ title: TIPO[e.tipo] ?? 'Entrega' }} />
      <Screen refreshable={false}>
        <View style={[styles.cursoTag, { backgroundColor: colorOf(e.cursoId) }]}>
          <ThemedText style={styles.cursoTagText} numberOfLines={1}>
            {e.curso}
          </ThemedText>
        </View>
        <ThemedText style={styles.titulo}>{e.nombre}</ThemedText>
        <View style={styles.row}>
          <EstadoChip estado={e.estado} />
          {e.nota ? (
            <ThemedText type="smallBold" style={{ color: theme.entregada }}>
              Nota: {e.nota}
            </ThemedText>
          ) : null}
        </View>

        <Button
          title={conChat ? '✨ Seguir con la IA' : '✨ Hacer con IA'}
          onPress={() => router.push(`/ia/${encodeURIComponent(e.key)}`)}
        />

        {fechas.length ? (
          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            {fechas.map((f) => (
              <View key={f.label} style={styles.fechaRow}>
                <ThemedText type="small" themeColor="textSecondary">
                  {f.label}
                </ThemedText>
                <ThemedText type="smallBold" style={styles.fechaValor}>
                  {fechaCorta(f.ts)}
                  <ThemedText type="small" themeColor="textSecondary">
                    {'  '}
                    {relativo(f.ts, nowMs)}
                  </ThemedText>
                </ThemedText>
              </View>
            ))}
          </View>
        ) : null}

        {e.correccion ? (
          <>
            <SectionTitle>Corrección</SectionTitle>
            <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
              {e.correccion.nota ? (
                <View style={styles.notaRow}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Nota
                  </ThemedText>
                  <ThemedText style={[styles.nota, { color: theme.entregada }]}>
                    {e.correccion.nota}
                  </ThemedText>
                </View>
              ) : null}
              {e.correccion.fecha ? (
                <ThemedText type="small" themeColor="textSecondary">
                  Corregida el {fechaCorta(e.correccion.fecha)} ·{' '}
                  {relativo(e.correccion.fecha, nowMs)}
                </ThemedText>
              ) : null}
              {e.correccion.comentario ? (
                <View style={[styles.comentario, { borderLeftColor: theme.accent }]}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Comentario del profesor
                  </ThemedText>
                  <ThemedText type="small" style={styles.enunciado} selectable>
                    {htmlATexto(e.correccion.comentario)}
                  </ThemedText>
                </View>
              ) : null}
              {e.correccion.archivos.map((a) => (
                <ArchivoRow key={a.fileurl} archivo={a} />
              ))}
            </View>
          </>
        ) : null}

        {e.envio ? (
          <>
            <SectionTitle>Tu entrega</SectionTitle>
            <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="small">
                {e.estado === 'borrador' ? 'Borrador guardado' : 'Enviada'}
                {e.envio.fecha ? ` el ${fechaCorta(e.envio.fecha)}` : ''}
                {e.envio.fecha && e.fecha && e.envio.fecha > e.fecha ? (
                  <ThemedText type="small" style={{ color: theme.vencida }}>
                    {'  '}con retraso
                  </ThemedText>
                ) : null}
              </ThemedText>
              {e.envio.pendienteDeCorregir ? (
                <ThemedText type="small" themeColor="textSecondary">
                  Pendiente de corregir. Te avisaremos cuando salga la nota.
                </ThemedText>
              ) : null}
              {e.envio.texto ? (
                <ThemedText type="small" style={styles.enunciado} selectable>
                  {htmlATexto(e.envio.texto)}
                </ThemedText>
              ) : null}
              {e.envio.archivos.map((a) => (
                <ArchivoRow key={a.fileurl} archivo={a} />
              ))}
            </View>
          </>
        ) : null}

        {e.adjuntos?.length ? (
          <>
            <SectionTitle>Archivos de la tarea</SectionTitle>
            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.backgroundElement,
                  paddingVertical: Spacing.one,
                },
              ]}>
              {e.adjuntos.map((a) => (
                <ArchivoRow key={a.fileurl} archivo={a} />
              ))}
            </View>
          </>
        ) : null}

        {texto ? (
          <>
            <SectionTitle>Enunciado</SectionTitle>
            <ThemedText type="small" style={styles.enunciado} selectable>
              {texto}
            </ThemedText>
          </>
        ) : null}

        {e.url ? (
          <View style={{ marginTop: Spacing.three }}>
            <Button
              title="Abrir en Moodle"
              variant="secondary"
              onPress={() => WebBrowser.openBrowserAsync(e.url!)}
            />
          </View>
        ) : null}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  cursoTag: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 2,
    maxWidth: '100%',
  },
  cursoTagText: {
    color: '#fff',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: 700,
  },
  titulo: { fontSize: 22, lineHeight: 28, fontWeight: 700 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    flexWrap: 'wrap',
  },
  card: {
    borderRadius: 14,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three - 4,
    gap: Spacing.two,
  },
  fechaRow: { gap: 0 },
  fechaValor: { fontSize: 15 },
  enunciado: { lineHeight: 22 },
  notaRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  nota: { fontSize: 28, lineHeight: 34, fontWeight: 800 },
  comentario: { borderLeftWidth: 3, paddingLeft: Spacing.two, gap: 2 },
});
