/**
 * Herramientas para probar las notificaciones en Hermes Dev (no salen en la app normal).
 * Alteran la "foto anterior" de las novedades para que la siguiente sincronización
 * detecte cambios reales de tu Moodle.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundTask from 'expo-background-task';

import { CLAVES } from './claves';
import { simularEnBase } from './simular-novedades';

/** Prepara la foto para que la siguiente sincronización encuentre novedades. */
export async function simularNovedades(): Promise<string> {
  const [rawBase, rawSnap] = await Promise.all([
    AsyncStorage.getItem(CLAVES.base),
    AsyncStorage.getItem(CLAVES.snapshot),
  ]);
  if (!rawBase)
    return 'Todavía no hay una sincronización completa. Sincroniza una vez y vuelve a probar.';
  const r = simularEnBase(JSON.parse(rawBase), rawSnap ? JSON.parse(rawSnap) : null);
  if (!r.hechos.length) return 'No he encontrado nada que simular.';
  await AsyncStorage.setItem(CLAVES.base, JSON.stringify(r.base));
  return `Listo: la próxima sincronización encontrará ${r.hechos.join(' y ')}.`;
}

/** Lanza ya la sincronización en segundo plano (solo funciona en compilaciones de desarrollo). */
export async function ejecutarSegundoPlanoYa(): Promise<string> {
  try {
    const ok = await BackgroundTask.triggerTaskWorkerForTestingAsync();
    return ok
      ? 'Lanzada. Si había novedades, te llegarán los avisos en unos segundos.'
      : 'Android no la ha lanzado. ¿Está activado el segundo plano? Abre la app con sesión iniciada.';
  } catch (e) {
    return `No se pudo lanzar: ${(e as Error).message}`;
  }
}
