/**
 * Sincronización en segundo plano (Android: WorkManager, cada ~30 min como mínimo; el
 * sistema decide el momento exacto según batería y red). Comprueba Moodle con la app
 * cerrada, actualiza widgets y recordatorios y avisa de lo nuevo.
 *
 * La tarea se define al cargar este archivo, que se importa desde index.ts al arrancar.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundTask from 'expo-background-task';
import * as SecureStore from 'expo-secure-store';
import * as TaskManager from 'expo-task-manager';

import { actualizarWidgets } from '@/widgets/actualizar';

import { avisarNovedades, programarRecordatorios } from './avisos';
import { CLAVES } from './claves';
import { fetchSnapshot } from './data';
import { DEFAULT_MOODLE_URL, MoodleClient } from './moodle';
import { sincronizarNovedades } from './sync';

export const TAREA_SEGUNDO_PLANO = 'hermes-sincronizar';
const INTERVALO_MIN = 30;

/**
 * Lo que hace cada pasada en segundo plano. Exportada para poder probarla desde
 * Hermes Dev sin esperar a Android. Devuelve cuántas novedades ha encontrado (o null si
 * no había sesión).
 */
export async function pasadaSegundoPlano(): Promise<number | null> {
  const token = await SecureStore.getItemAsync(CLAVES.token);
  if (!token) return null;
  const url = (await AsyncStorage.getItem(CLAVES.url)) || DEFAULT_MOODLE_URL;
  const client = new MoodleClient(url, token);

  const snap = await fetchSnapshot(client);
  await AsyncStorage.setItem(CLAVES.snapshot, JSON.stringify(snap));
  actualizarWidgets(snap);
  await programarRecordatorios(snap);

  const r = await sincronizarNovedades(client, snap);
  if (r) await avisarNovedades(r.nuevas);
  return r?.nuevas.length ?? 0;
}

/** Registro de la última pasada real en segundo plano (para el diagnóstico de Hermes Dev). */
export type UltimaPasada = { fecha: number; ok: boolean; novedades?: number; error?: string };
const CLAVE_ULTIMA = 'segundo_plano_ultima';

TaskManager.defineTask(TAREA_SEGUNDO_PLANO, async () => {
  try {
    const n = await pasadaSegundoPlano();
    await guardarUltima({ fecha: Date.now(), ok: true, novedades: n ?? 0 });
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (e) {
    await guardarUltima({ fecha: Date.now(), ok: false, error: (e as Error).message });
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

const guardarUltima = (u: UltimaPasada) =>
  AsyncStorage.setItem(CLAVE_ULTIMA, JSON.stringify(u)).catch(() => {});

/** ¿Está la tarea registrada en Android y cuándo fue la última pasada real? */
export async function estadoSegundoPlano() {
  const [estado, registrada, raw] = await Promise.all([
    BackgroundTask.getStatusAsync().catch(() => null),
    TaskManager.isTaskRegisteredAsync(TAREA_SEGUNDO_PLANO).catch(() => false),
    AsyncStorage.getItem(CLAVE_ULTIMA).catch(() => null),
  ]);
  return {
    disponible: estado === BackgroundTask.BackgroundTaskStatus.Available,
    registrada,
    ultima: raw ? (JSON.parse(raw) as UltimaPasada) : null,
  };
}

/** Deja programada la tarea (si ya lo estaba, no pasa nada). */
export async function activarSegundoPlano() {
  try {
    const estado = await BackgroundTask.getStatusAsync();
    if (estado !== BackgroundTask.BackgroundTaskStatus.Available) return;
    if (await TaskManager.isTaskRegisteredAsync(TAREA_SEGUNDO_PLANO)) return;
    await BackgroundTask.registerTaskAsync(TAREA_SEGUNDO_PLANO, { minimumInterval: INTERVALO_MIN });
  } catch {
    // sin segundo plano la app sigue funcionando al abrirla
  }
}

export async function desactivarSegundoPlano() {
  try {
    if (await TaskManager.isTaskRegisteredAsync(TAREA_SEGUNDO_PLANO))
      await BackgroundTask.unregisterTaskAsync(TAREA_SEGUNDO_PLANO);
  } catch {
    // nada que hacer
  }
}
