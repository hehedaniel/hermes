import { Stack, useLocalSearchParams } from 'expo-router';
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

/** Convierte el HTML del enunciado en texto legible (párrafos y viñetas). */
function htmlATexto(html?: string) {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
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
});
