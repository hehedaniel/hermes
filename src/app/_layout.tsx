import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import { DownloadsProvider } from '@/lib/downloads';
import { GoogleCalProvider } from '@/lib/google-cal';
import { MoodleProvider } from '@/lib/store';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <MoodleProvider>
      <DownloadsProvider>
        <GoogleCalProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <StatusBar style="auto" />
            <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="curso/[id]" options={{ title: '' }} />
              <Stack.Screen name="tarea/[key]" options={{ title: 'Entrega' }} />
              <Stack.Screen name="visor" options={{ title: '' }} />
            </Stack>
          </ThemeProvider>
        </GoogleCalProvider>
      </DownloadsProvider>
    </MoodleProvider>
  );
}
