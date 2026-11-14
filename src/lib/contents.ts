/**
 * Contenido de un curso (bloques → actividades → archivos), igual que la página del curso en Moodle.
 * Sin dependencias de React Native.
 */
import type { Archivo, Entrega } from './data';
import { type CourseSection, MoodleClient } from './moodle';

export type Modulo = {
  cmid: number;
  nombre: string;
  tipo: string; // resource, folder, assign, url, page, quiz, forum…
  url?: string; // página de la actividad en Moodle
  enlace?: string; // para actividades "URL": la web externa
  archivos: Archivo[];
  entregaKey?: string; // si es una tarea con entrega, su clave en Pendientes
  /** Subapartado de la unidad al que pertenece (la última etiqueta de Moodle que lo precede) */
  grupo?: string;
};

export type Bloque = {
  id: number;
  numero: number;
  nombre: string;
  /** Descripción del bloque en Moodle (resultado de aprendizaje, criterios, fechas…), en texto */
  descripcion?: string;
  modulos: Modulo[];
};

export type ContenidoCurso = {
  cursoId: number;
  bloques: Bloque[];
  fetchedAt: number;
};

const strip = (s?: string) =>
  (s ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Convierte la descripción de un bloque (HTML de Moodle) en texto: párrafos separados por una
 * línea en blanco, viñetas y listas numeradas pegadas, sin los saltos que trae el HTML.
 */
export function resumenATexto(html?: string) {
  if (!html) return '';
  return html
    .replace(/\s+/g, ' ')
    .replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_m, dentro: string) => {
      let n = 0;
      return dentro.replace(/<li[^>]*>/gi, () => `<li>${++n}. `);
    })
    .replace(/<li[^>]*>\s*<p[^>]*>/gi, '<li>')
    .replace(/<\/p>\s*<\/li>/gi, '</li>')
    .replace(/<li>(\d+\. )?/gi, (_m, num?: string) => num ?? '• ')
    .replace(/<(ul|ol)[^>]*>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|tr)>/gi, '\n\n')
    .replace(/<\/(li|ul|ol)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .split('\n')
    .map((l) => l.replace(/[ \t ]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Actividades que no aportan nada en la lista (etiquetas de texto, subsecciones…). */
const OCULTAR = new Set(['label', 'subsection', 'qbank']);

/** Una etiqueta más larga que esto es un párrafo de texto, no el título de un subapartado. */
const MAX_TITULO_GRUPO = 80;

/**
 * Las etiquetas de Moodle («Ejercicios y Ejemplos de Python y R», «Prácticas Evaluables»…)
 * hacen de subtítulos dentro de una unidad: cada actividad pertenece a la última etiqueta
 * corta que tiene delante. Devuelve el grupo de cada actividad por su cmid.
 */
export function gruposDeSeccion(
  modules: { id: number; modname: string; name?: string; uservisible?: boolean }[],
): Map<number, string> {
  const grupos = new Map<number, string>();
  let actual: string | undefined;
  for (const m of modules) {
    if (m.uservisible === false) continue;
    if (m.modname === 'label') {
      const t = strip(m.name);
      if (t && t.length <= MAX_TITULO_GRUPO) actual = t;
    } else if (actual) {
      grupos.set(m.id, actual);
    }
  }
  return grupos;
}

export async function fetchCourseContents(
  client: MoodleClient,
  cursoId: number,
  entregas: Entrega[] = [],
): Promise<ContenidoCurso> {
  const sections = await client.call<CourseSection[]>('core_course_get_contents', {
    courseid: cursoId,
  });
  const entregaPorCmid = new Map(entregas.filter((e) => e.cmid).map((e) => [e.cmid!, e]));

  const bloques: Bloque[] = sections
    .map((sec, i) => {
      const grupos = gruposDeSeccion(sec.modules ?? []);
      const modulos: Modulo[] = (sec.modules ?? [])
        .filter((m) => m.uservisible !== false && !OCULTAR.has(m.modname))
        .map((m) => {
          const contents = m.contents ?? [];
          const entrega = entregaPorCmid.get(m.id);
          let archivos: Archivo[] = contents
            .filter((c) => c.type === 'file' && c.fileurl)
            .map((c) => ({
              nombre: c.filename,
              fileurl: c.fileurl,
              size: c.filesize ?? 0,
              timemodified: c.timemodified ?? 0,
              mimetype: c.mimetype,
              cursoId,
              cmid: m.id,
              ruta: (c.filepath ?? '/').replace(/^\/|\/$/g, '') || undefined,
            }));
          // Las páginas de Moodle traen su HTML como "index.html": no es un documento útil
          if (m.modname === 'page') archivos = [];
          // Las tareas no traen sus adjuntos aquí: los cogemos de la lista de entregas
          if (m.modname === 'assign' && entrega?.adjuntos) archivos = entrega.adjuntos;
          return {
            cmid: m.id,
            nombre: strip(m.name),
            tipo: m.modname,
            url: m.url,
            enlace:
              m.modname === 'url' ? contents.find((c) => c.type === 'url')?.fileurl : undefined,
            archivos,
            entregaKey: entrega?.key,
            grupo: grupos.get(m.id),
          };
        });
      return {
        id: sec.id,
        numero: sec.section ?? i,
        nombre: strip(sec.name) || (i === 0 ? 'General' : `Bloque ${i}`),
        descripcion: resumenATexto(sec.summary) || undefined,
        modulos,
      };
    })
    .filter((b) => b.modulos.length > 0 || b.descripcion);

  return { cursoId, bloques, fetchedAt: Date.now() };
}

export const archivosDe = (c: ContenidoCurso) =>
  c.bloques.flatMap((b) => b.modulos.flatMap((m) => m.archivos));
