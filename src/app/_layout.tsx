import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
  useFonts,
} from '@expo-google-fonts/space-grotesk';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_600SemiBold,
} from '@expo-google-fonts/jetbrains-mono';
import { Newsreader_400Regular, Newsreader_500Medium } from '@expo-google-fonts/newsreader';
import {
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useLayoutEffect, useMemo } from 'react';
import { Platform } from 'react-native';

import { FAMILIA } from '@/constants/theme';
import { AppUpdateProvider } from '@/hooks/app-updates';
import { useAbrirAviso } from '@/hooks/use-abrir-aviso';
import { ThemePreferenceProvider, useTheme, useThemePreference } from '@/hooks/use-theme';
import { DownloadsProvider } from '@/lib/downloads';
import { GoogleCalProvider } from '@/lib/google-cal';
import { ExtractorPdf } from '@/lib/ia/pdf-texto';
import { BusquedaProvider } from '@/lib/busqueda-estado';
import { MoodleProvider } from '@/lib/store';
import { HorarioRemoto } from '@/lib/use-horario';
import { DetectarRol } from '@/lib/use-es-profesor';
import { NovedadesModal } from '@/components/novedades-modal';
import { SyncDatosProvider } from '@/lib/use-sync-datos';

/**
 * Las pestañas siempre quedan debajo: si la app se abre directamente en una entrega
 * (desde un widget o un enlace), hay flecha y gesto de atrás para volver a Pendientes.
 */
export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <ThemePreferenceProvider>
      <RootLayoutContent />
    </ThemePreferenceProvider>
  );
}

function RootLayoutContent() {
  const { oscuro, listo, tema } = useThemePreference();
  const c = useTheme();
  useLayoutEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    document.documentElement.style.backgroundColor = c.paper;
    document.body.style.backgroundColor = c.paper;
    document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
      meta.setAttribute('content', c.paper);
    });
  }, [c.paper]);

  const comprobarActualizaciones =
    Platform.OS === 'android' &&
    Constants.executionEnvironment !== ExecutionEnvironment.StoreClient &&
    Constants.expoConfig?.android?.package === 'es.danihermoso.campus';
  const [fuentes] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    Newsreader_400Regular,
    Newsreader_500Medium,
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_600SemiBold,
  });
  useAbrirAviso();

  // Colores de la navegación con los del tema (sin destellos blancos entre pantallas)
  const temaNavegacion = useMemo(() => {
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

  if (!fuentes || !listo) return null;

  return (
    <MoodleProvider>
      <SyncDatosProvider>
        <HorarioRemoto />
        <DetectarRol />
        <BusquedaProvider>
          <DownloadsProvider>
            <GoogleCalProvider>
              <ThemeProvider value={temaNavegacion}>
                <AppUpdateProvider enabled={comprobarActualizaciones && fuentes && listo}>
                  <StatusBar style={oscuro ? 'light' : 'dark'} />
                  <ExtractorPdf />
                  <NovedadesModal />
                  <Stack
                    screenOptions={{
                      headerBackButtonDisplayMode: 'minimal',
                      headerShadowVisible: false,
                      headerStyle: { backgroundColor: c.paper },
                      headerTintColor: c.ink,
                      headerTitleStyle: {
                        fontFamily: tema === 'cuaderno' ? undefined : FAMILIA[600],
                        fontSize: 15,
                      },
                      contentStyle: { backgroundColor: c.paper },
                    }}>
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen name="curso/[id]" options={{ headerShown: false }} />
                    <Stack.Screen name="tarea/[key]" options={{ title: 'Detalle de la tarea' }} />
                    <Stack.Screen name="visor" options={{ title: '' }} />
                    <Stack.Screen name="ia/[key]" options={{ title: 'IA' }} />
                    <Stack.Screen name="documento" options={{ title: '' }} />
                    <Stack.Screen
                      name="ajustes-ia"
                      options={{ title: 'Inteligencia artificial' }}
                    />
                    <Stack.Screen name="buscar" options={{ headerShown: false }} />
                  </Stack>
                </AppUpdateProvider>
              </ThemeProvider>
            </GoogleCalProvider>
          </DownloadsProvider>
        </BusquedaProvider>
      </SyncDatosProvider>
    </MoodleProvider>
  );
}
