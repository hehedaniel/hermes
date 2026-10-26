import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
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
  const detalle = pdf
    ? paginas === 1
      ? 'PDF · 1 página'
      : `PDF · unas ${paginas} páginas`
    : `${lineas} ${lineas === 1 ? 'línea' : 'líneas'}`;
  return (
    <View style={[styles.card, { backgroundColor: theme.background, borderColor: theme.border }]}>
      <Pressable style={styles.cabecera} onPress={onVer}>
        <MaterialIcons
          name={pdf ? 'picture-as-pdf' : 'description'}
          size={30}
          color={pdf ? theme.vencida : theme.accent}
        />
        <View style={styles.flex}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {doc.nombre}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {detalle}
            {doc.completo ? '' : ' · incompleto'}
          </ThemedText>
        </View>
      </Pressable>
      <View style={styles.botones}>
        <Boton icono="visibility" texto="Ver" onPress={onVer} cargando={viendo} />
        {onEntregar ? (
          <Boton
            icono="cloud-upload"
            texto="Entregar"
            onPress={onEntregar}
            cargando={entregando}
            principal
          />
        ) : null}
      </View>
    </View>
  );
}

function Boton({
  icono,
  texto,
  onPress,
  cargando,
  principal,
}: {
  icono: keyof typeof MaterialIcons.glyphMap;
  texto: string;
  onPress: () => void;
  cargando?: boolean;
  principal?: boolean;
}) {
  const theme = useTheme();
  const color = principal ? theme.onAccent : theme.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={cargando}
      style={({ pressed }) => [
        styles.boton,
        {
          backgroundColor: principal ? theme.accent : theme.backgroundElement,
          opacity: pressed ? 0.75 : 1,
        },
      ]}>
      {cargando ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <MaterialIcons name={icono} size={18} color={color} />
      )}
      <ThemedText type="smallBold" style={{ color }}>
        {texto}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 12, padding: Spacing.two + 2, gap: Spacing.two },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  flex: { flex: 1 },
  botones: { flexDirection: 'row', gap: Spacing.two },
  boton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 38,
    borderRadius: 10,
  },
});
