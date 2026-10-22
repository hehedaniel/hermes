/**
 * Herramientas para probar las notificaciones en Hermes Dev (no salen en la app normal).
 * Alteran la "foto anterior" de las novedades para que la siguiente sincronización
 * detecte cambios reales de tu Moodle.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundTask from 'expo-background-task';
import { AppState } from 'react-native';

import { CLAVES } from './claves';
import { estadoSegundoPlano, pasadaSegundoPlano } from './segundo-plano';
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

let armado = false;

/**
 * Lanza la tarea de verdad, a través de Android, en cuanto la app pase a segundo plano.
 * (Android no la ejecuta con Hermes delante, y con la app en segundo plano los temporizadores
 * de JavaScript se pausan, así que se engancha al momento exacto de salir.)
 */
export function lanzarAlSalir(): string {
  if (!armado) {
    armado = true;
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado !== 'background') return;
      sub.remove();
      armado = false;
      BackgroundTask.triggerTaskWorkerForTestingAsync().catch(() => {});
    });
  }
  return 'Preparado. Sal ahora de la app con el botón de inicio (sin cerrarla) y espera unos segundos: deberían llegarte los avisos.';
}

/** Texto del diagnóstico: si la tarea está registrada y cuándo fue la última pasada real. */
export async function diagnosticoSegundoPlano(): Promise<string> {
  const e = await estadoSegundoPlano();
  const partes = [
    e.disponible ? 'Segundo plano disponible' : 'Segundo plano NO disponible en este móvil',
    e.registrada ? 'tarea registrada ✓' : 'tarea NO registrada',
  ];
  if (!e.ultima) partes.push('todavía no ha habido ninguna pasada real');
  else {
    const min = Math.round((Date.now() - e.ultima.fecha) / 60000);
    const cuando =
      min < 1
        ? 'hace menos de 1 min'
        : min < 60
          ? `hace ${min} min`
          : `hace ${Math.round(min / 60)} h`;
    partes.push(
      e.ultima.ok
        ? `última pasada real ${cuando} (${e.ultima.novedades ?? 0} novedades)`
        : `última pasada real ${cuando}, con error: ${e.ultima.error}`,
    );
  }
  return partes.join(' · ');
}
