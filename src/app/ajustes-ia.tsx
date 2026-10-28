import { router, Stack } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { IASettings } from '@/components/ia-settings';
import { Etiqueta, O, T, useMovil, usePadX } from '@/components/obs';
import { MarcoObsidiana } from '@/components/obs-marco';
import { Screen } from '@/components/screen';
import { useThemePreference } from '@/hooks/use-theme';

/** Ajustes > Inteligencia artificial: proveedor, lo que puede, clave y modelo. */
export default function AjustesIAScreen() {
  const { tema } = useThemePreference();
  const movil = useMovil();
  const padX = usePadX(32);

  if (tema === 'obsidiana') {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <MarcoObsidiana
          migas={[
            { texto: 'Ajustes', alPulsar: () => router.navigate('/ajustes') },
            { texto: 'Inteligencia artificial' },
          ]}>
          <ScrollView contentContainerStyle={{ paddingHorizontal: padX, paddingVertical: movil ? 24 : 40 }}>
            <View style={{ width: '100%', maxWidth: 720, alignSelf: 'center', gap: 28 }}>
              <View style={{ gap: 10 }}>
                <Etiqueta c={O.lime} s={10} ls={0.2}>
                  Ajustes
                </Etiqueta>
                <T k="serif" s={movil ? 34 : 42} lh={movil ? 40 : 48} c={O.white} ls={-0.02}>
                  Inteligencia artificial
                </T>
                <T s={13.5} lh={22} c="#9393A2">
                  Elige el proveedor, pega tu clave y escoge el modelo. La clave se guarda solo en este dispositivo.
                </T>
              </View>
              <IASettings />
            </View>
          </ScrollView>
        </MarcoObsidiana>
      </>
    );
  }

  return (
    <Screen refreshable={false} maxWidth={720}>
      <IASettings />
    </Screen>
  );
}
