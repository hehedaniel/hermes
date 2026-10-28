import { Stack } from 'expo-router';

import { BuscarObsidiana } from '@/components/buscar-obsidiana';

/** Buscador de archivos y tareas (solo existe en el diseño Obsidiana). */
export default function BuscarScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <BuscarObsidiana />
    </>
  );
}
