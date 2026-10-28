import Feather from '@expo/vector-icons/Feather';
import * as Clipboard from 'expo-clipboard';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Caja } from '@/components/anden';
import { Etiqueta, O, T, useMovil, usePadX } from '@/components/obs';
import { MarcoObsidiana } from '@/components/obs-marco';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, Radii, Spacing } from '@/constants/theme';
import { useTheme, useThemePreference } from '@/hooks/use-theme';
import { getDocumentoActual } from '@/lib/ia/documento-actual';

/** Un documento de texto o código que ha generado la IA (los PDF van al visor). */
export default function DocumentoScreen() {
  const [doc] = useState(getDocumentoActual);
  const theme = useTheme();
  const [copiado, setCopiado] = useState(false);
  const contenido = doc?.contenido;
  const { tema } = useThemePreference();
  const movil = useMovil();
  const padX = usePadX(32);

  if (tema === 'obsidiana') {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <MarcoObsidiana
          migas={[{ texto: 'Asistente', alPulsar: () => router.back() }, { texto: doc?.nombre ?? 'Documento' }]}
          derecha={
            contenido ? (
              <Pressable
                onPress={async () => {
                  await Clipboard.setStringAsync(contenido);
                  setCopiado(true);
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: '#24272F' }}>
                <Feather name={copiado ? 'check' : 'copy'} size={12} color="#797E8D" />
                <T k="mono" up s={10} ls={0.14} c="#A4A9B6">
                  {copiado ? 'Copiado' : 'Copiar'}
                </T>
              </Pressable>
            ) : undefined
          }>
          <ScrollView contentContainerStyle={{ paddingHorizontal: padX, paddingVertical: movil ? 24 : 40 }}>
            <View style={{ width: '100%', maxWidth: 960, alignSelf: 'center', gap: 24 }}>
              <View style={{ gap: 10 }}>
                <Etiqueta c={O.lime} s={10} ls={0.2}>
                  Documento generado por Hermes
                </Etiqueta>
                <T k="serif" s={movil ? 30 : 38} lh={movil ? 36 : 44} c={O.white} ls={-0.02}>
                  {doc?.nombre ?? 'Documento'}
                </T>
                {contenido ? (
                  <T k="mono" s={11} c="#676B78">
                    {contenido.length.toLocaleString('es-ES')} caracteres
                  </T>
                ) : null}
              </View>
              <View style={{ backgroundColor: '#121317', borderWidth: 1, borderColor: '#1D1F25', borderRadius: 12, padding: 24 }}>
                <T k="mono" s={12.5} lh={20} c="#C3C7D2" selectable>
                  {contenido ?? 'No hay ningún documento que mostrar. Vuelve al asistente y genera uno para verlo aquí.'}
                </T>
              </View>
            </View>
          </ScrollView>
        </MarcoObsidiana>
      </>
    );
  }

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
