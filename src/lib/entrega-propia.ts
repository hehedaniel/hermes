/**
 * Elegir archivos del móvil para entregarlos en una tarea. La versión web está en
 * entrega-propia.web.ts. Devuelve archivos listos para subir a Moodle.
 */
import { File } from 'expo-file-system';

import type { ArchivoParaSubir } from './entregar';

type Selector = {
  getDocumentAsync: (o: {
    type?: string | string[];
    multiple?: boolean;
    copyToCacheDirectory?: boolean;
  }) => Promise<{
    canceled: boolean;
    assets: { uri: string; name: string; size?: number }[] | null;
  }>;
};

function cargarSelector(): Selector {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-document-picker') as Selector;
  } catch {
    throw new Error(
      'Esta versión de la app todavía no puede abrir archivos. Actualiza Hermes a la última versión.',
    );
  }
}

export async function elegirArchivosParaEntregar(): Promise<ArchivoParaSubir[]> {
  const r = await cargarSelector().getDocumentAsync({
    type: '*/*',
    multiple: true,
    copyToCacheDirectory: true,
  });
  if (r.canceled || !r.assets) return [];
  return r.assets.map((a) => {
    const file = new File(a.uri);
    return {
      nombre: a.name,
      tamano: a.size ?? file.size,
      // El fetch de Expo no admite { uri }: se manda el propio File, que sabe leerse
      anadir: (form, campo) => form.append(campo, file as unknown as Blob, a.name),
    };
  });
}
