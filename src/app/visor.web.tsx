import { Stack, useLocalSearchParams } from 'expo-router';

import { Screen } from '@/components/screen';
import { Vacio } from '@/components/vacio';

/** En la versión web no hay archivos descargados: el visor solo existe en el móvil. */
export default function VisorWeb() {
  const { nombre } = useLocalSearchParams<{ nombre?: string }>();
  return (
    <>
      <Stack.Screen options={{ title: nombre ?? 'Visor' }} />
      <Screen refreshable={false}>
        <Vacio
          titulo="Solo en el móvil"
          texto="El visor de documentos funciona en la app de Android."
        />
      </Screen>
    </>
  );
}
