import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Stack } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { abrirCon } from '@/lib/open-file';
import { PDF_VIEWER_HTML } from '@/lib/pdf-viewer-html';
import { getVisorActual } from '@/lib/visor-actual';

/**
 * Visor de PDF (pdf.js dentro de una WebView) e imágenes.
 * El archivo ya está en el móvil: se lee en base64 y se le pasa a la página.
 */
export default function VisorScreen() {
  const [visor] = useState(getVisorActual);
  const theme = useTheme();
  const ref = useRef<WebView>(null);
  const [estado, setEstado] = useState<{ cargando: boolean; error?: string }>(() =>
    visor ? { cargando: true } : { cargando: false, error: 'No hay ningún archivo que mostrar.' },
  );
  const [base64, setBase64] = useState<string | null>(null);

  useEffect(() => {
    if (!visor) return;
    visor.file
      .base64()
      .then(setBase64)
      .catch((e: Error) =>
        setEstado({ cargando: false, error: `No se pudo leer el archivo: ${e.message}` }),
      );
  }, [visor]);

  const html = useMemo(() => {
    if (visor?.tipo !== 'imagen' || !base64) return PDF_VIEWER_HTML(theme.background);
    return `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=6">
      <style>html,body{margin:0;background:${theme.background};}img{width:100%;height:auto;display:block}</style></head>
      <body><img src="data:${visor.mime};base64,${base64}"></body></html>`;
  }, [visor, base64, theme.background]);

  function onMessage(ev: WebViewMessageEvent) {
    const msg = JSON.parse(ev.nativeEvent.data);
    if (msg.type === 'ready' && base64) ref.current?.postMessage(base64);
    if (msg.type === 'loaded') setEstado({ cargando: false });
    if (msg.type === 'error') setEstado({ cargando: false, error: msg.message });
  }

  // Si pdf.js estaba listo antes de tener el base64, se lo mandamos en cuanto llega
  useEffect(() => {
    if (visor?.tipo === 'pdf' && base64) {
      ref.current?.injectJavaScript('window.__pedirPdf && window.__pedirPdf(); true;');
    }
  }, [base64, visor]);

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen
        options={{
          title: visor?.nombre ?? 'Visor',
          headerRight: visor
            ? () => (
                <Pressable hitSlop={12} onPress={() => abrirCon(visor.file, visor.mime)}>
                  <MaterialIcons name="open-in-new" size={22} color={theme.text} />
                </Pressable>
              )
            : undefined,
        }}
      />
      {visor && (visor.tipo === 'pdf' || base64) ? (
        <WebView
          ref={ref}
          source={{ html, baseUrl: 'https://cdnjs.cloudflare.com/' }}
          originWhitelist={['*']}
          onMessage={onMessage}
          onLoadEnd={() => visor.tipo === 'imagen' && setEstado({ cargando: false })}
          style={[styles.flex, { backgroundColor: theme.background }]}
          setBuiltInZoomControls
          setDisplayZoomControls={false}
          javaScriptEnabled
        />
      ) : null}
      {estado.cargando || estado.error ? (
        <View style={styles.overlay} pointerEvents="none">
          {estado.error ? (
            <ThemedText type="small" style={{ color: theme.vencida, textAlign: 'center' }}>
              {estado.error}
              {visor
                ? '\nPrueba con el botón de arriba a la derecha para abrirlo con otra app.'
                : ''}
            </ThemedText>
          ) : (
            <ActivityIndicator color={theme.accent} size="large" />
          )}
        </View>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
});
