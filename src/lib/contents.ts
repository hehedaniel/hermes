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
};

export type Bloque = {
  id: number;
  numero: number;
  nombre: string;
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

/** Actividades que no aportan nada en la lista (etiquetas de texto, subsecciones…). */
const OCULTAR = new Set(['label', 'subsection', 'qbank']);

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
          };
        });
      return {
        id: sec.id,
        numero: sec.section ?? i,
        nombre: strip(sec.name) || (i === 0 ? 'General' : `Bloque ${i}`),
        modulos,
      };
    })
    .filter((b) => b.modulos.length > 0);

  return { cursoId, bloques, fetchedAt: Date.now() };
}

export const archivosDe = (c: ContenidoCurso) =>
  c.bloques.flatMap((b) => b.modulos.flatMap((m) => m.archivos));
