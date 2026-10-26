import { StyleSheet, View } from 'react-native';

import { FilaRail } from '@/components/anden';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { hora } from '@/lib/format';
import type { EventoGoogle } from '@/lib/google-cal';

/** Un evento de tu Google Calendar: raíl con su color, calendario, título y hora. */
export function EventoRow({ evento, compacto }: { evento: EventoGoogle; compacto?: boolean }) {
  const theme = useTheme();
  const inicio = new Date(evento.inicio);
  const fin = new Date(evento.fin);
  const cuando = evento.todoElDia ? 'todo el día' : `${hora(inicio)}–${hora(fin)}`;
  return (
    <FilaRail color={evento.color || theme.ink3} style={compacto && styles.compacto}>
      <View style={styles.linea}>
        <ThemedText type="label" themeColor="ink3" numberOfLines={1} style={styles.flex}>
          {evento.calendario}
        </ThemedText>
        <ThemedText type="cifra" themeColor="ink2">
          {cuando}
        </ThemedText>
      </View>
      <ThemedText style={[styles.titulo, compacto && styles.tituloCompacto]} numberOfLines={2}>
        {evento.titulo || '(Sin título)'}
      </ThemedText>
      {evento.lugar ? (
        <ThemedText type="meta" themeColor="ink3" numberOfLines={1}>
          {evento.lugar}
        </ThemedText>
      ) : null}
    </FilaRail>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  compacto: { paddingVertical: 10 },
  linea: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titulo: { fontSize: 15, lineHeight: 20, fontWeight: 500 },
  tituloCompacto: { fontSize: 13.5, lineHeight: 18 },
});
