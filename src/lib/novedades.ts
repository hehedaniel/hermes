/**
 * Novedades: qué ha cambiado en Moodle desde la última sincronización.
 * Compara el contenido de los cursos y las entregas con una "foto" anterior (la base).
 * Sin dependencias de React Native.
 */
import { type ContenidoCurso, fetchCourseContents } from './contents';
import { type Archivo, type Entrega, mapLimit, type Snapshot } from './data';
import { fechaCorta } from './format';
import type { MoodleClient } from './moodle';

export type TipoNovedad =
  'archivo' | 'archivo-actualizado' | 'actividad' | 'tarea' | 'nota' | 'fecha';

export type Novedad = {
  id: string;
  tipo: TipoNovedad;
  cursoId: number;
  curso: string;
  titulo: string;
  detalle?: string;
  fecha: number; // ms: cuándo la detectó la app
  leida: boolean;
  archivo?: Archivo;
  entregaKey?: string;
  cmid?: number;
};

/** Foto de lo que había la última vez (solo lo necesario para comparar). */
export type BaseNovedades = {
  cursos: Record<string, { archivos: Record<string, number>; actividades: number[] }>;
  entregas: Record<string, { fecha: number; nota?: string }>;
};

export const claveArchivo = (fileurl: string) => fileurl.split('?')[0];

/** Tipos de actividad cuyos cambios ya se cuentan por otro lado (archivos o entregas). */
const SIN_AVISO_DE_ACTIVIDAD = new Set(['resource', 'folder', 'assign', 'label']);

/** Contenido de todos los cursos (de 3 en 3). Si uno falla, se omite y se conserva su base. */
export async function fetchTodosLosContenidos(client: MoodleClient, snapshot: Snapshot) {
  const res = await mapLimit(snapshot.courses, 3, (c) =>
    fetchCourseContents(client, c.id, snapshot.entregas).catch(() => null),
  );
  return res.filter((c): c is ContenidoCurso => c !== null);
}

export function calcularNovedades(
  base: BaseNovedades | null,
  contenidos: ContenidoCurso[],
  snapshot: Snapshot,
  ahora = Date.now(),
): { novedades: Novedad[]; base: BaseNovedades } {
  const nombreCurso = new Map(snapshot.courses.map((c) => [c.id, c.fullname]));
  const nueva: BaseNovedades = {
    cursos: { ...(base?.cursos ?? {}) },
    entregas: {},
  };
  const novedades: Novedad[] = [];
  const cmidsDeEntregas = new Set(snapshot.entregas.map((e) => e.cmid).filter(Boolean));

  for (const c of contenidos) {
    const id = String(c.cursoId);
    const previo = base?.cursos[id];
    const curso = nombreCurso.get(c.cursoId) ?? '';
    const archivos: Record<string, number> = {};
    const actividades: number[] = [];

    for (const b of c.bloques) {
      for (const m of b.modulos) {
        actividades.push(m.cmid);
        if (
          previo &&
          !previo.actividades.includes(m.cmid) &&
          !SIN_AVISO_DE_ACTIVIDAD.has(m.tipo) &&
          !cmidsDeEntregas.has(m.cmid)
        ) {
          novedades.push({
            id: `actividad:${m.cmid}`,
            tipo: 'actividad',
            cursoId: c.cursoId,
            curso,
            titulo: m.nombre,
            detalle: b.nombre,
            fecha: ahora,
            leida: false,
            cmid: m.cmid,
          });
        }
        for (const a of m.archivos) {
          const k = claveArchivo(a.fileurl);
          archivos[k] = a.timemodified;
          if (!previo) continue;
          const antes = previo.archivos[k];
          if (antes === undefined) {
            novedades.push({
              id: `archivo:${k}:${a.timemodified}`,
              tipo: 'archivo',
              cursoId: c.cursoId,
              curso,
              titulo: a.nombre,
              detalle: m.tipo === 'resource' ? b.nombre : `${b.nombre} · ${m.nombre}`,
              fecha: ahora,
              leida: false,
              archivo: a,
              cmid: m.cmid,
            });
          } else if (antes && a.timemodified && antes !== a.timemodified) {
            novedades.push({
              id: `archivo:${k}:${a.timemodified}`,
              tipo: 'archivo-actualizado',
              cursoId: c.cursoId,
              curso,
              titulo: a.nombre,
              detalle: `${b.nombre} · el profesor ha subido una versión nueva`,
              fecha: ahora,
              leida: false,
              archivo: a,
              cmid: m.cmid,
            });
          }
        }
      }
    }
    nueva.cursos[id] = { archivos, actividades };
  }

  for (const e of snapshot.entregas) {
    nueva.entregas[e.key] = { fecha: e.fecha, nota: e.nota };
    if (!base) continue;
    const antes = base.entregas[e.key];
    if (!antes) {
      // Si es de un curso que aún no estaba en la base, no es "nueva": es la primera vez que lo vemos
      if (!base.cursos[String(e.cursoId)]) continue;
      novedades.push(novedadEntrega(e, 'tarea', ahora));
      continue;
    }
    if (e.nota && e.nota !== antes.nota) novedades.push(novedadEntrega(e, 'nota', ahora));
    if (e.fecha && antes.fecha && Math.abs(e.fecha - antes.fecha) >= 600) {
      novedades.push(novedadEntrega(e, 'fecha', ahora, antes.fecha));
    }
  }

  return { novedades, base: nueva };
}

function novedadEntrega(
  e: Entrega,
  tipo: 'tarea' | 'nota' | 'fecha',
  ahora: number,
  fechaAntes?: number,
): Novedad {
  const valor = tipo === 'nota' ? e.nota : tipo === 'fecha' ? e.fecha : '';
  return {
    id: `${tipo}:${e.key}:${valor}`,
    tipo,
    cursoId: e.cursoId,
    curso: e.curso,
    titulo: e.nombre,
    detalle:
      tipo === 'nota'
        ? `Nota: ${e.nota}`
        : tipo === 'fecha'
          ? `Fecha cambiada: ahora ${fechaCorta(e.fecha)}${fechaAntes ? ` (antes ${fechaCorta(fechaAntes)})` : ''}`
          : e.fecha
            ? `Nueva entrega · ${fechaCorta(e.fecha)}`
            : 'Nueva entrega',
    fecha: ahora,
    leida: false,
    entregaKey: e.key,
    cmid: e.cmid,
  };
}

/** Añade las nuevas arriba, sin duplicados, y guarda como mucho las últimas 150 (y 60 días). */
export function fusionarNovedades(previas: Novedad[], nuevas: Novedad[], ahora = Date.now()) {
  const ids = new Set(previas.map((n) => n.id));
  const limite = ahora - 60 * 86400000;
  return [...nuevas.filter((n) => !ids.has(n.id)), ...previas]
    .filter((n) => n.fecha >= limite)
    .slice(0, 150);
}
