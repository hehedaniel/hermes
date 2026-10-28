/**
 * Archivos de la IA en el móvil: leer los adjuntos de la tarea para pasárselos, crear los
 * documentos que genera (PDF incluido) y prepararlos para subirlos a Moodle.
 * La versión web está en archivos-ia.web.ts.
 */
import { Directory, File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';

import type { Archivo } from '../data';
import type { DownloadsCtx } from '../downloads';
import type { ArchivoParaSubir } from '../entregar';
import type { MoodleClient } from '../moodle';
import { mimeDe } from '../open-file';
import { setVisorActual } from '../visor-actual';
import { setDocumentoActual } from './documento-actual';
import { docxDeDocumento } from './docx-generar';
import { type DocumentoIA, esDocx, esPdf, htmlParaPdf, mimeDocumento } from './documentos';
import type { AdjuntoIA } from './proveedores';

/** En el móvil se pueden crear PDF; en la web no. */
export const CREA_PDF = true;

function carpeta() {
  const d = new Directory(Paths.cache, 'ia');
  d.create({ intermediates: true, idempotent: true });
  return d;
}

/** Escribe el documento en el móvil (los .pdf se maquetan desde su Markdown). */
export async function archivoDeDocumento(doc: DocumentoIA): Promise<File> {
  const destino = new File(carpeta(), doc.nombre);
  if (destino.exists) destino.delete();
  if (esDocx(doc)) {
    destino.create();
    destino.write(await docxDeDocumento(doc));
  } else if (esPdf(doc)) {
    const { uri } = await Print.printToFileAsync({ html: htmlParaPdf(doc) });
    await new File(uri).move(destino, { overwrite: true });
  } else {
    destino.create();
    destino.write(doc.contenido);
  }
  return new File(carpeta(), doc.nombre);
}

/** Abre el documento: los PDF en el visor de la app; el resto, como texto. */
export async function verDocumento(doc: DocumentoIA) {
  if (esDocx(doc)) {
    // Un Word no se ve dentro de la app: se abre con Word (o la app que tenga el móvil)
    const file = await archivoDeDocumento(doc);
    await Sharing.shareAsync(file.uri, { mimeType: mimeDocumento(doc) });
    return;
  }
  if (esPdf(doc)) {
    const file = await archivoDeDocumento(doc);
    setVisorActual({ file, nombre: doc.nombre, tipo: 'pdf', mime: 'application/pdf' });
    router.push('/visor');
    return;
  }
  setDocumentoActual(doc);
  router.push('/documento');
}

export async function archivoParaSubir(doc: DocumentoIA): Promise<ArchivoParaSubir> {
  const file = await archivoDeDocumento(doc);
  return {
    nombre: doc.nombre,
    tamano: file.size,
    // El fetch de Expo no admite { uri }: se manda el propio File, que sabe leerse (bytes)
    anadir: (form, campo) => form.append(campo, file as unknown as Blob, doc.nombre),
  };
}

/** Contenido de un archivo de la tarea para la IA (usa la copia del móvil si ya está descargado). */
export async function leerAdjunto(
  a: Archivo,
  descargas: DownloadsCtx,
  _client: MoodleClient,
): Promise<AdjuntoIA> {
  const local = descargas.estado(a) === 'si' ? descargas.archivoLocal(a) : undefined;
  const file = local ?? (await descargas.descargar(a));
  return { nombre: a.nombre, mime: mimeDe(a), base64: await file.base64() };
}
