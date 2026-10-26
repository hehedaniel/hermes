import { StyleSheet, View } from 'react-native';

import { TipoArchivo } from '@/components/anden';
import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type DocumentoIA, esPdf } from '@/lib/ia/documentos';

type Props = {
  doc: DocumentoIA;
  onVer: () => void;
  /** Sin esto no se muestra el botón (la tarea no se puede entregar desde la app) */
  onEntregar?: () => void;
  entregando?: boolean;
  viendo?: boolean;
};

/** Un documento que ha generado la IA, dentro del chat: verlo y entregarlo. */
export function DocumentoCard({ doc, onVer, onEntregar, entregando, viendo }: Props) {
  const theme = useTheme();
  const pdf = esPdf(doc);
  const palabras = doc.contenido.split(/\s+/).filter(Boolean).length;
  const paginas = Math.max(1, Math.round(palabras / 450));
  const lineas = doc.contenido.split('\n').length;
  const ext = pdf ? 'pdf' : (doc.nombre.split('.').pop() ?? 'txt').toLowerCase();
  const detalle = pdf
    ? paginas === 1
      ? 'PDF · 1 página'
      : `PDF · unas ${paginas} páginas`
    : `${lineas} ${lineas === 1 ? 'línea' : 'líneas'}`;
  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line2 }]}>
      <View style={styles.cabecera}>
        <TipoArchivo ext={ext} />
        <View style={styles.flex}>
          <ThemedText type="smallBold" numberOfLines={2}>
            {doc.nombre}
          </ThemedText>
          <ThemedText type="meta" themeColor="ink2">
            {detalle}
            {doc.completo ? '' : ' · incompleto'}
          </ThemedText>
        </View>
      </View>
      <View style={styles.botones}>
        <View style={styles.boton}>
          <Button title="Ver" icono="eye" variant="secondary" compacto onPress={onVer} loading={viendo} />
        </View>
        {onEntregar ? (
          <View style={styles.boton}>
            <Button title="Entregar" icono="send" compacto onPress={onEntregar} loading={entregando} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: Radii.control, padding: 10, gap: 10 },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flex: { flex: 1 },
  botones: { flexDirection: 'row', gap: 8 },
  boton: { flex: 1 },
});
