/**
 * Sincronización de novedades, la misma para la app abierta y para el segundo plano.
 * La lista de novedades guardada es la referencia: así no se pierde lo que haya añadido
 * la otra (por ejemplo, lo que encontró el segundo plano mientras la app estaba cerrada).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { CLAVES } from './claves';
import type { Snapshot } from './data';
import type { MoodleClient } from './moodle';
import {
  type BaseNovedades,
  calcularNovedades,
  fetchTodosLosContenidos,
  fusionarNovedades,
  type Novedad,
} from './novedades';

const leerJSON = async <T>(clave: string): Promise<T | null> => {
  try {
    const raw = await AsyncStorage.getItem(clave);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null; // dato corrupto o ilegible: se empieza de cero
  }
};

export const leerNovedades = async () => (await leerJSON<Novedad[]>(CLAVES.novedades)) ?? [];
export const leerSnapshot = () => leerJSON<Snapshot>(CLAVES.snapshot);

export async function guardarListaNovedades(lista: Novedad[]) {
  await AsyncStorage.setItem(CLAVES.novedades, JSON.stringify(lista)).catch(() => {});
}

/**
 * Descarga el contenido de todos los cursos, lo compara con la foto anterior y guarda
 * las novedades. Devuelve las nuevas de esta vez y la lista completa.
 */
export async function sincronizarNovedades(
  client: MoodleClient,
  snap: Snapshot,
): Promise<{ nuevas: Novedad[]; lista: Novedad[] } | null> {
  const contenidos = await fetchTodosLosContenidos(client, snap);
  if (!contenidos.length) return null; // sin conexión con ningún curso: no se toca la foto
  const base = await leerJSON<BaseNovedades>(CLAVES.base);
  const r = calcularNovedades(base, contenidos, snap);
  const previas = await leerNovedades();
  const ids = new Set(previas.map((n) => n.id));
  const nuevas = r.novedades.filter((n) => !ids.has(n.id));
  const lista = nuevas.length ? fusionarNovedades(previas, nuevas) : previas;
  await AsyncStorage.multiSet([
    [CLAVES.base, JSON.stringify(r.base)],
    [CLAVES.novedades, JSON.stringify(lista)],
    ...contenidos.map(
      (ct) => [CLAVES.contenido(ct.cursoId), JSON.stringify(ct)] as [string, string],
    ),
  ]).catch(() => {});
  return { nuevas, lista };
}
