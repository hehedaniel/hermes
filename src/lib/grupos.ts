/**
 * Grupos de clase: cada grupo (curso, turno) tiene su propio horario, módulos, exámenes y días sin
 * clase. El índice (public/horarios.json) los lista y Hermes reconoce el del alumno por los nombres
 * de sus asignaturas en Moodle. Sin dependencias de React Native.
 */
import { horarioIncluido, NOMBRE_INCLUIDO } from './horario';

export type GrupoInfo = {
  id: string;
  nombre: string;
  /** Ruta del horario del grupo, relativa al índice (por ejemplo «horarios/dam-1b-tarde.json») */
  archivo: string;
  /** Trozos de nombre de asignatura (sin tildes, en minúsculas) que identifican al grupo */
  claves: string[];
};

export type IndiceGrupos = { v: 1; grupos: GrupoInfo[] };

export const ID_GRUPO_INCLUIDO = 'iabd-1';

/** El índice que lleva la app de serie: solo el grupo de IA y Big Data. */
export function indiceIncluido(): IndiceGrupos {
  const modulos = horarioIncluido().modulos ?? {};
  return {
    v: 1,
    grupos: [
      {
        id: ID_GRUPO_INCLUIDO,
        nombre: NOMBRE_INCLUIDO,
        archivo: 'horario.json',
        claves: Object.values(modulos).flatMap((m) => m.claves),
      },
    ],
  };
}

const esObjeto = (x: unknown): x is Record<string, unknown> =>
  !!x && typeof x === 'object' && !Array.isArray(x);

/** Texto del primer error del índice, o null si es válido. */
export function validarIndice(d: unknown): string | null {
  if (!esObjeto(d) || d.v !== 1 || !Array.isArray(d.grupos) || !d.grupos.length)
    return 'Falta "v": 1 y la lista de grupos';
  const vistos = new Set<string>();
  for (const g of d.grupos) {
    if (
      !esObjeto(g) ||
      typeof g.id !== 'string' ||
      !/^[a-z0-9-]{1,40}$/.test(g.id) ||
      typeof g.nombre !== 'string' ||
      !g.nombre ||
      typeof g.archivo !== 'string' ||
      !/^[A-Za-z0-9._/-]+\.json$/.test(g.archivo) ||
      g.archivo.includes('..') ||
      !Array.isArray(g.claves) ||
      !g.claves.length ||
      !g.claves.every((c) => typeof c === 'string' && c.length > 2)
    )
      return 'grupos: cada uno necesita id, nombre, archivo (.json) y claves';
    if (vistos.has(g.id)) return `grupos: el id "${g.id}" está repetido`;
    vistos.add(g.id);
  }
  return null;
}

const normalizar = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ');

/**
 * El grupo cuyas claves coinciden con más asignaturas del alumno. null si ninguno coincide o si
 * hay empate entre dos grupos (mejor preguntar que enseñar el horario de otro).
 */
export function detectarGrupo(indice: IndiceGrupos, cursos: string[]): string | null {
  const nombres = cursos.map(normalizar).filter((n) => n && !n.includes('punto de encuentro'));
  let mejor: string | null = null;
  let puntos = 0;
  let empate = false;
  for (const g of indice.grupos) {
    const n = nombres.filter((c) => g.claves.some((k) => c.includes(normalizar(k)))).length;
    if (n > puntos) {
      mejor = g.id;
      puntos = n;
      empate = false;
    } else if (n === puntos && n > 0) empate = true;
  }
  return empate ? null : mejor;
}
