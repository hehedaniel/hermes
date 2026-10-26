import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Clipboard from 'expo-clipboard';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getDocumentoActual } from '@/lib/ia/documento-actual';

/** Un documento de texto o código que ha generado la IA (los PDF van al visor). */
export default function DocumentoScreen() {
  const [doc] = useState(getDocumentoActual);
  const theme = useTheme();
  const [copiado, setCopiado] = useState(false);

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen
        options={{
          title: doc?.nombre ?? 'Documento',
          headerRight: doc
            ? () => (
                <Pressable
                  hitSlop={12}
                  onPress={async () => {
                    await Clipboard.setStringAsync(doc.contenido);
                    setCopiado(true);
                  }}>
                  <MaterialIcons
                    name={copiado ? 'check' : 'content-copy'}
                    size={21}
                    color={theme.text}
                  />
                </Pressable>
              )
            : undefined,
        }}
      />
      <ScrollView contentContainerStyle={styles.contenido}>
        <ScrollView horizontal>
          <ThemedText style={styles.mono} selectable>
            {doc?.contenido ?? 'No hay ningún documento que mostrar.'}
          </ThemedText>
        </ScrollView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  contenido: { padding: Spacing.three },
  mono: { fontFamily: Fonts.mono, fontSize: 12.5, lineHeight: 18 },
});
