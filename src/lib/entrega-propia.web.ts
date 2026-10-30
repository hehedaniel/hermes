/** Elegir archivos del ordenador para entregarlos en una tarea (versión web). */
import type { ArchivoParaSubir } from './entregar';

export async function elegirArchivosParaEntregar(): Promise<ArchivoParaSubir[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = () =>
      resolve(
        Array.from(input.files ?? []).map((f) => ({
          nombre: f.name,
          tamano: f.size,
          anadir: (form, campo) => form.append(campo, f, f.name),
        })),
      );
    input.oncancel = () => resolve([]);
    input.click();
  });
}
