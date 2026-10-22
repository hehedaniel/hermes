/**
 * Herramientas para probar las notificaciones en Hermes Dev (no salen en la app normal).
 * Alteran la "foto anterior" de las novedades para que la siguiente sincronización
 * detecte cambios reales de tu Moodle.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundTask from 'expo-background-task';

import { CLAVES } from './claves';
import { pasadaSegundoPlano } from './segundo-plano';
import { simularEnBase } from './simular-novedades';
import { guardarListaNovedades, leerNovedades } from './sync';

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
  // Si ya estaban en Novedades de una prueba anterior, se quitan para que vuelvan a avisar
  const lista = await leerNovedades();
  await guardarListaNovedades(lista.filter((n) => !r.olvidar.some((p) => n.id.startsWith(p))));
  return `Listo: la próxima sincronización encontrará ${r.hechos.join(' y ')}.`;
}

/** Ejecuta ahora mismo la misma pasada que el segundo plano, avisos incluidos. */
export async function comprobarComoSegundoPlano(): Promise<string> {
  try {
    const n = await pasadaSegundoPlano();
    if (n === null) return 'No hay sesión iniciada en Moodle.';
    return n
      ? `Hecho: ${n} ${n === 1 ? 'novedad' : 'novedades'}. Deberían llegarte los avisos ahora.`
      : 'Hecho, pero no había nada nuevo. Pulsa antes «Simular novedades».';
  } catch (e) {
    return `Falló: ${(e as Error).message}`;
  }
}

/**
 * Lanza la tarea de verdad, a través de Android, dentro de 10 s. Android no la ejecuta
 * con la app delante, así que hay que salir de Hermes (botón de inicio) antes de que pase.
 */
export function lanzarSegundoPlanoEn10s(): string {
  setTimeout(() => {
    BackgroundTask.triggerTaskWorkerForTestingAsync().catch(() => {});
  }, 10_000);
  return 'Sal ya de la app con el botón de inicio. En 10 s Android lanzará el segundo plano y, si hay novedades, te llegarán los avisos.';
}
