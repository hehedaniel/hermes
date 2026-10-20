import type { File } from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import type { Archivo } from './data';
import { setVisorActual } from './visor-actual';

const MIME: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  zip: 'application/zip',
  txt: 'text/plain',
  csv: 'text/csv',
  ipynb: 'application/json',
  mp4: 'video/mp4',
};

export const extension = (nombre: string) =>
  nombre.includes('.') ? nombre.split('.').pop()!.toLowerCase() : '';

export function mimeDe(a: Pick<Archivo, 'nombre' | 'mimetype'>) {
  return a.mimetype || MIME[extension(a.nombre)] || 'application/octet-stream';
}

export type TipoVisor = 'pdf' | 'imagen' | null;

export function tipoVisor(a: Pick<Archivo, 'nombre' | 'mimetype'>): TipoVisor {
  const m = mimeDe(a);
  if (m === 'application/pdf') return 'pdf';
  if (m.startsWith('image/')) return 'imagen';
  return null;
}

/** PDF e imágenes se ven dentro de la app; el resto se abre con la app que tenga el móvil. */
export async function abrirArchivo(a: Archivo, file: File) {
  const visor = tipoVisor(a);
  if (visor) {
    setVisorActual({ file, nombre: a.nombre, tipo: visor, mime: mimeDe(a) });
    router.push('/visor');
    return;
  }
  await abrirCon(file, mimeDe(a));
}

export async function abrirCon(file: File, mime: string) {
  if (Platform.OS === 'android') {
    try {
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: file.contentUri,
        type: mime,
        flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
      });
      return;
    } catch {
      // No hay ninguna app para ese tipo: pasamos al menú de compartir
    }
  }
  await Sharing.shareAsync(file.uri, { mimeType: mime });
}
