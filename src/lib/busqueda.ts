/**
 * Buscador de Hermes: busca por nombre archivos y tareas de todas las asignaturas, con lo que ya
 * está sincronizado en el dispositivo (sin conexión). Las asignaturas en sí no se buscan.
 */
import type { ContenidoCurso } from './contents';
import type { Archivo, Entrega, Estado } from './data';

export type TipoResultado = 'tarea' | 'archivo';
export type FiltroBusqueda = 'todo' | TipoResultado;

export type ResultadoBusqueda = {
  id: string;
  tipo: TipoResultado;
  nombre: string;
  cursoId: number;
  curso: string;
  /** Unidad o apartado donde está (solo archivos) */
  unidad?: string;
  /** Fecha de entrega (tareas) o de última modificación (archivos), en segundos */
  fecha?: number;
  estado?: Estado;
  entregaKey?: string;
  archivo?: Archivo;
  /** nombre normalizado y contexto normalizado, para comparar */
  _n: string;
  _c: string;
};

/** Minúsculas y sin tildes: «Evaluación» y «evaluacion» coinciden. */
export const normaliza = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[_.\-–—]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const limpiaUnidad = (s: string) =>
  s.replace(/^(unidad|tema|ud)\s*\d+\s*[:.\-–]?\s*/i, '').trim() || s;

export function construirIndice({
  entregas,
  contenidos,
  nombreCurso,
}: {
  entregas: Entrega[];
  contenidos: ContenidoCurso[];
  nombreCurso: (cursoId: number) => string;
}): ResultadoBusqueda[] {
  const out: ResultadoBusqueda[] = [];
  for (const e of entregas) {
    const curso = nombreCurso(e.cursoId);
    out.push({
      id: `t:${e.key}`,
      tipo: 'tarea',
      nombre: e.nombre,
      cursoId: e.cursoId,
      curso,
      fecha: e.fecha || undefined,
      estado: e.estado,
      entregaKey: e.key,
      _n: normaliza(e.nombre),
      _c: normaliza(curso),
    });
  }
  const vistos = new Set<string>();
  for (const ct of contenidos) {
    const curso = nombreCurso(ct.cursoId);
    for (const b of ct.bloques) {
      const unidad = b.numero > 0 ? limpiaUnidad(b.nombre) : b.nombre;
      for (const m of b.modulos) {
        for (const f of m.archivos) {
          const id = `a:${f.fileurl}`;
          if (vistos.has(id)) continue;
          vistos.add(id);
          out.push({
            id,
            tipo: 'archivo',
            nombre: f.nombre,
            cursoId: ct.cursoId,
            curso,
            unidad,
            fecha: f.timemodified || undefined,
            archivo: f,
            _n: normaliza(f.nombre),
            _c: normaliza(`${curso} ${unidad} ${m.nombre}`),
          });
        }
      }
    }
  }
  return out;
}

/**
 * Todas las palabras de la consulta tienen que aparecer (en el nombre o, si no, en la asignatura
 * o la unidad). Primero los que empiezan por lo escrito, luego los que lo llevan en el nombre.
 */
export function buscar(
  indice: ResultadoBusqueda[],
  consulta: string,
  filtro: FiltroBusqueda = 'todo',
  limite = 100,
): ResultadoBusqueda[] {
  const q = normaliza(consulta);
  if (!q) return [];
  const palabras = q.split(' ');
  const puntuados: { r: ResultadoBusqueda; p: number }[] = [];
  for (const r of indice) {
    if (filtro !== 'todo' && r.tipo !== filtro) continue;
    const enNombre = palabras.every((w) => r._n.includes(w));
    const enTodo = enNombre || palabras.every((w) => r._n.includes(w) || r._c.includes(w));
    if (!enTodo) continue;
    const p = r._n.startsWith(q) ? 0 : enNombre ? 1 : 2;
    puntuados.push({ r, p });
  }
  puntuados.sort(
    (a, b) =>
      a.p - b.p ||
      (a.r.tipo === b.r.tipo ? 0 : a.r.tipo === 'tarea' ? -1 : 1) ||
      a.r.nombre.localeCompare(b.r.nombre, 'es', { numeric: true }),
  );
  return puntuados.slice(0, limite).map((x) => x.r);
}
