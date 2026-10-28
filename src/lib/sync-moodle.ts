/**
 * Guarda y lee los datos de Hermes en tus «Archivos privados» de Moodle (hermes-datos.json),
 * así que cualquier dispositivo con tu sesión los ve. Usa solo las funciones que el Moodle
 * del instituto permite con tu token.
 *
 *  - Leer: el archivo se pide por su dirección (webservice/pluginfile.php) con el token.
 *  - Guardar: se prepara un borrador con tus archivos privados, se borra la copia vieja, se sube
 *    la nueva y se vuelve a guardar en privados (Moodle no deja sobrescribir de otra forma).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { CLAVES } from './claves';
import { MoodleError } from './moodle';
import type { Registro } from './sync-datos';
import { aTexto, leerRemotoJSON } from './sync-datos';
import { archivoJson } from './sync-archivo';

export const ARCHIVO_DATOS = 'hermes-datos.json';
const ARCHIVO_PING = 'hermes-ping.txt';
const TIEMPO_MS = 60_000;

type Cliente = {
  base: string;
  token: string;
  call: <T = any>(wsfunction: string, params?: Record<string, unknown>) => Promise<T>;
};

/** Sube un archivo a un borrador y devuelve lo que contesta Moodle (con el contextid de tu usuario). */
async function subirADraft(client: Cliente, draft: number, nombre: string, texto: string) {
  const archivo = await archivoJson(nombre, texto);
  const form = new FormData();
  form.append('token', client.token);
  form.append('filearea', 'draft');
  form.append('itemid', String(draft));
  form.append('filepath', '/');
  archivo.anadir(form, 'file_1');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIEMPO_MS);
  let data: any;
  try {
    const res = await fetch(`${client.base}/webservice/upload.php`, {
      method: 'POST',
      body: form,
      signal: ctrl.signal,
    });
    const texto = await res.text();
    try {
      data = JSON.parse(texto);
    } catch {
      throw new MoodleError(
        'upload',
        `Moodle contestó algo raro al guardar tus datos (${res.status}): ${texto.slice(0, 80)}`,
      );
    }
  } catch (e) {
    if (e instanceof MoodleError) throw e;
    throw new MoodleError(
      'network',
      `No se pudo hablar con Moodle para guardar tus datos (${ctrl.signal.aborted ? 'tardó demasiado' : (e as Error)?.message || 'sin detalle'}).`,
    );
  } finally {
    clearTimeout(timer);
  }
  const r = Array.isArray(data) ? data[0] : data;
  if (!r || r.error || !r.itemid)
    throw new MoodleError(
      r?.errortype ?? 'upload',
      `Moodle no aceptó guardar tus datos${r?.error ? `: ${r.error}` : '.'}`,
    );
  return r as { contextid: number; itemid: number };
}

const prepararBorrador = async (client: Cliente) =>
  Number(
    (await client.call<{ draftitemid: number }>('core_user_prepare_private_files_for_edition'))
      .draftitemid,
  );

/** El contexto de tu usuario en Moodle (no cambia): se pregunta una vez y se recuerda. */
async function contexto(client: Cliente): Promise<number> {
  const guardado = Number(await AsyncStorage.getItem(CLAVES.syncCtx).catch(() => null));
  if (guardado > 0) return guardado;
  const draft = await prepararBorrador(client);
  const r = await subirADraft(client, draft, ARCHIVO_PING, 'ping'); // el borrador no se guarda
  await AsyncStorage.setItem(CLAVES.syncCtx, String(r.contextid)).catch(() => {});
  return r.contextid;
}

/** Lo que hay guardado en Moodle, o null si todavía no hay nada. */
export async function leerRemoto(client: Cliente): Promise<Registro | null> {
  const ctx = await contexto(client);
  const url = `${client.base}/webservice/pluginfile.php/${ctx}/user/private/${ARCHIVO_DATOS}?token=${encodeURIComponent(client.token)}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIEMPO_MS);
  let res: Response;
  try {
    res = await fetch(url, { signal: ctrl.signal });
  } catch {
    throw new MoodleError(
      'network',
      'No se pudieron leer tus datos de Moodle (¿sin conexión o bloqueado por el navegador?).',
    );
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 404) return null;
  if (!res.ok)
    throw new MoodleError(`http${res.status}`, `Moodle respondió ${res.status} al leer tus datos.`);
  const reg = leerRemotoJSON(await res.text());
  if (!reg)
    throw new MoodleError('formato', 'Los datos de Moodle no se entienden: no se han tocado.');
  return reg;
}

/** Guarda el registro completo en Moodle, sustituyendo lo anterior. */
export async function guardarRemoto(client: Cliente, reg: Registro) {
  const draft = await prepararBorrador(client);
  try {
    await client.call('core_files_delete_draft_files', {
      draftitemid: draft,
      files: [{ filepath: '/', filename: ARCHIVO_DATOS }],
    });
  } catch {
    // si no había copia vieja no pasa nada
  }
  const r = await subirADraft(client, draft, ARCHIVO_DATOS, aTexto(reg));
  await AsyncStorage.setItem(CLAVES.syncCtx, String(r.contextid)).catch(() => {});
  await client.call('core_user_add_user_private_files', { draftid: draft });
}
