import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
  useFonts,
} from '@expo-google-fonts/space-grotesk';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { Colors, FAMILIA } from '@/constants/theme';
import { useAbrirAviso } from '@/hooks/use-abrir-aviso';
import { DownloadsProvider } from '@/lib/downloads';
import { GoogleCalProvider } from '@/lib/google-cal';
import { ExtractorPdf } from '@/lib/ia/pdf-texto';
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
  const oscuro = colorScheme === 'dark';
  const c = Colors[oscuro ? 'dark' : 'light'];
  const [fuentes] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });
  useAbrirAviso();

  // Colores de la navegación con los del tema (sin destellos blancos entre pantallas)
  const tema = useMemo(() => {
    const base = oscuro ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: c.paper,
        card: c.paper,
        text: c.ink,
        border: c.line,
        primary: c.brand,
      },
    };
  }, [oscuro, c]);

  if (!fuentes) return null;

  return (
    <MoodleProvider>
      <DownloadsProvider>
        <GoogleCalProvider>
          <ThemeProvider value={tema}>
            <StatusBar style="auto" />
            <ExtractorPdf />
            <Stack
              screenOptions={{
                headerBackButtonDisplayMode: 'minimal',
                headerShadowVisible: false,
                headerStyle: { backgroundColor: c.paper },
                headerTintColor: c.ink,
                headerTitleStyle: { fontFamily: FAMILIA[600], fontSize: 15 },
                contentStyle: { backgroundColor: c.paper },
              }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="curso/[id]" options={{ headerShown: false }} />
              <Stack.Screen name="tarea/[key]" options={{ title: 'Detalle de la tarea' }} />
              <Stack.Screen name="visor" options={{ title: '' }} />
              <Stack.Screen name="ia/[key]" options={{ title: 'IA' }} />
              <Stack.Screen name="documento" options={{ title: '' }} />
              <Stack.Screen name="ajustes-ia" options={{ title: 'Inteligencia artificial' }} />
            </Stack>
          </ThemeProvider>
        </GoogleCalProvider>
      </DownloadsProvider>
    </MoodleProvider>
  );
}
