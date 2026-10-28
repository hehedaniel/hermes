/**
 * Versión web de archivos-ia.ts: el navegador no puede crear PDF sin librerías pesadas, así que
 * los .pdf se abren como página (desde ahí se pueden imprimir o guardar como PDF) y solo se
 * pueden entregar desde la web los documentos de texto.
 */
import { router } from 'expo-router';

import type { Archivo } from '../data';
import type { DownloadsCtx } from '../downloads';
import type { ArchivoParaSubir } from '../entregar';
import type { MoodleClient } from '../moodle';
import { mimeDe } from '../open-file';
import { setDocumentoActual } from './documento-actual';
import { docxDeDocumento } from './docx-generar';
import { type DocumentoIA, esDocx, esPdf, htmlParaPdf, mimeDocumento } from './documentos';
import { type AdjuntoIA, IAError } from './proveedores';

export const CREA_PDF = false;

function descargar(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export async function verDocumento(doc: DocumentoIA) {
  if (esDocx(doc)) {
    // Un Word no se ve en el navegador: se descarga para abrirlo con Word
    const bytes = await docxDeDocumento(doc);
    descargar(new Blob([bytes as BlobPart], { type: mimeDocumento(doc) }), doc.nombre);
    return;
  }
  if (esPdf(doc)) {
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(htmlParaPdf(doc));
      w.document.close();
      return;
    }
  }
  setDocumentoActual(doc);
  router.push('/documento');
}

export async function archivoParaSubir(doc: DocumentoIA): Promise<ArchivoParaSubir> {
  if (esPdf(doc)) {
    throw new IAError(
      'web',
      'Desde la web no se pueden crear PDF. Entrégalo desde la app de Android, o ábrelo, guárdalo como PDF y súbelo en Moodle.',
    );
  }
  const blob = esDocx(doc)
    ? new Blob([(await docxDeDocumento(doc)) as BlobPart], { type: mimeDocumento(doc) })
    : new Blob([doc.contenido], { type: mimeDocumento(doc) });
  return {
    nombre: doc.nombre,
    tamano: blob.size,
    anadir: (form, campo) => form.append(campo, blob, doc.nombre),
  };
}

export async function leerAdjunto(
  a: Archivo,
  _descargas: DownloadsCtx,
  client: MoodleClient,
): Promise<AdjuntoIA> {
  let res: Response;
  try {
    res = await fetch(client.fileUrl(a.fileurl));
  } catch {
    throw new IAError('red', `No se pudo leer «${a.nombre}» desde el navegador.`);
  }
  if (!res.ok) throw new IAError('red', `Moodle no dejó leer «${a.nombre}» (${res.status}).`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return { nombre: a.nombre, mime: mimeDe(a), base64: btoa(bin) };
}
