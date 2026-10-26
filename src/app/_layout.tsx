import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import { useAbrirAviso } from '@/hooks/use-abrir-aviso';
import { DownloadsProvider } from '@/lib/downloads';
import { ExtractorPdf } from '@/lib/ia/pdf-texto';
import { GoogleCalProvider } from '@/lib/google-cal';
import { MoodleProvider } from '@/lib/store';

/**
 * Las pestañas siempre quedan debajo: si la app se abre directamente en una entrega
 * (desde un widget o un enlace), hay flecha y gesto de atrás para volver a Pendientes.
 */
export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  useAbrirAviso();
  return (
    <MoodleProvider>
      <DownloadsProvider>
        <GoogleCalProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <StatusBar style="auto" />
            <ExtractorPdf />
            <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="curso/[id]" options={{ title: '' }} />
              <Stack.Screen name="tarea/[key]" options={{ title: 'Entrega' }} />
              <Stack.Screen name="visor" options={{ title: '' }} />
              <Stack.Screen name="ia/[key]" options={{ title: 'IA' }} />
              <Stack.Screen name="documento" options={{ title: '' }} />
            </Stack>
          </ThemeProvider>
        </GoogleCalProvider>
      </DownloadsProvider>
    </MoodleProvider>
  );
}
