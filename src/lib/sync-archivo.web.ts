/** Archivo de texto para subir a Moodle desde el navegador. */
import type { ArchivoParaSubir } from './entregar';

export async function archivoJson(nombre: string, texto: string): Promise<ArchivoParaSubir> {
  const blob = new Blob([texto], { type: 'application/json' });
  return {
    nombre,
    tamano: blob.size,
    anadir: (form, campo) => form.append(campo, blob, nombre),
  };
}
