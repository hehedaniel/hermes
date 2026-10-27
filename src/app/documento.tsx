import Feather from '@expo/vector-icons/Feather';
import * as Clipboard from 'expo-clipboard';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Caja } from '@/components/anden';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getDocumentoActual } from '@/lib/ia/documento-actual';

/** Un documento de texto o código que ha generado la IA (los PDF van al visor). */
export default function DocumentoScreen() {
  const [doc] = useState(getDocumentoActual);
  const theme = useTheme();
  const [copiado, setCopiado] = useState(false);
  const contenido = doc?.contenido;

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen
        options={{
          title: doc?.nombre ?? 'Documento',
        }}
      />
      <ScrollView contentContainerStyle={styles.fuera}>
        {contenido ? (
          <>
            <View style={styles.encabezado}>
              <View style={[styles.icono, { backgroundColor: theme.brandWash }]}>
                <Feather name="file-text" size={18} color={theme.brand} />
              </View>
              <View style={styles.flex}>
                <ThemedText type="smallBold" numberOfLines={1}>
                  {doc?.nombre}
                </ThemedText>
                <ThemedText type="meta" themeColor="ink2">
                  Documento generado por Hermes · {contenido.length.toLocaleString('es-ES')} caracteres
                </ThemedText>
              </View>
              <Pressable
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={copiado ? 'Documento copiado' : 'Copiar documento'}
                onPress={async () => {
                  await Clipboard.setStringAsync(contenido);
                  setCopiado(true);
                }}
                style={[styles.copiar, { borderColor: theme.line, backgroundColor: theme.surface }]}>
                <Feather name={copiado ? 'check' : 'copy'} size={16} color={theme.ink2} />
              </Pressable>
            </View>
            <View
              style={[
                styles.contenido,
                { backgroundColor: theme.surface, borderColor: theme.line },
              ]}>
              <ThemedText style={styles.mono} selectable>
                {contenido}
              </ThemedText>
            </View>
          </>
        ) : (
          <Caja>
            <ThemedText type="small" themeColor="ink2">
              No hay ningún documento que mostrar. Vuelve a la conversación con la IA y genera uno
              para verlo aquí.
            </ThemedText>
          </Caja>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  fuera: {
    padding: Spacing.three,
    paddingBottom: Spacing.five,
    gap: Spacing.three,
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
  },
  encabezado: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icono: {
    width: 42,
    height: 42,
    borderRadius: Radii.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copiar: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: Radii.control,
  },
  contenido: {
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Radii.superficie,
    width: '100%',
  },
  mono: { fontFamily: Fonts.mono, fontSize: 12.5, lineHeight: 19, flexShrink: 1 },
});
