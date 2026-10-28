/** Archivo de texto para subir a Moodle desde el móvil (la versión web está en sync-archivo.web.ts). */
import { Directory, File, Paths } from 'expo-file-system';

import type { ArchivoParaSubir } from './entregar';

export async function archivoJson(nombre: string, texto: string): Promise<ArchivoParaSubir> {
  const dir = new Directory(Paths.cache, 'sync');
  dir.create({ intermediates: true, idempotent: true });
  const file = new File(dir, nombre);
  if (file.exists) file.delete();
  file.create();
  file.write(texto);
  return {
    nombre,
    tamano: file.size,
    // El fetch de Expo no admite { uri }: se manda el propio File, que sabe leerse (bytes)
    anadir: (form, campo) => form.append(campo, file as unknown as Blob, nombre),
  };
}
