/**
 * Monta el .docx final de un documento de la IA sobre la plantilla Word del alumno
 * (la que lleva guardada en Ajustes → Inteligencia artificial).
 */
import { base64ABytes } from './base64';
import { rellenarPlantillaDocx, separarCabecera } from './docx-plantilla';
import type { DocumentoIA } from './documentos';
import { leerPlantillas } from './plantillas-almacen';
import type { PlantillaIA } from './plantillas-datos';

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** La plantilla Word a usar: la que nombra el documento, la de por defecto o la primera que haya. */
export function elegirPlantillaDocx(
  plantillas: PlantillaIA[],
  defecto: string | null,
  nombre?: string,
): PlantillaIA | undefined {
  const conDocx = plantillas.filter((p) => p.docx);
  return (
    (nombre ? conDocx.find((p) => norm(p.nombre) === norm(nombre)) : undefined) ??
    conDocx.find((p) => p.id === defecto) ??
    conDocx[0]
  );
}

export async function docxDeDocumento(doc: DocumentoIA): Promise<Uint8Array> {
  const datos = await leerPlantillas();
  const nombre = separarCabecera(doc.contenido).campos.plantilla;
  const p = elegirPlantillaDocx(datos.plantillas, datos.defecto, nombre);
  if (!p?.docx) {
    throw new Error(
      'Para crear un Word necesitas una plantilla .docx. Súbela en Ajustes → Inteligencia artificial.',
    );
  }
  return rellenarPlantillaDocx(base64ABytes(p.docx), doc.contenido);
}
