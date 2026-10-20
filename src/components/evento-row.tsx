import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { hora } from '@/lib/format';
import type { EventoGoogle } from '@/lib/google-cal';

/** Un evento de tu Google Calendar en la agenda del día. */
export function EventoRow({ evento }: { evento: EventoGoogle }) {
  const inicio = new Date(evento.inicio);
  const fin = new Date(evento.fin);
  const cuando = evento.todoElDia ? 'Todo el día' : `${hora(inicio)}–${hora(fin)}`;
  return (
    <View style={styles.row}>
      <View style={[styles.bar, { backgroundColor: evento.color || '#888' }]} />
      <ThemedText type="small" themeColor="textSecondary" style={styles.time}>
        {cuando}
      </ThemedText>
      <View style={styles.body}>
        <ThemedText type="small" numberOfLines={2} style={styles.title}>
          {evento.titulo || '(Sin título)'}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.meta}>
          {evento.calendario}
          {evento.lugar ? ` · ${evento.lugar}` : ''}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: 8 },
  bar: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  time: { width: 88, fontSize: 13 },
  body: { flex: 1 },
  title: { fontWeight: 600 },
  meta: { fontSize: 12, lineHeight: 16 },
});
