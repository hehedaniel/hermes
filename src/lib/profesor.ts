/**
 * Foto del profesor de una asignatura, tal y como la tiene puesta en Moodle.
 * Se prueba por varias vías porque cada campus restringe funciones distintas:
 *  1. core_enrol_get_enrolled_users: los matriculados con rol de profesor.
 *  2. core_course_get_courses_by_field: los «contactos del curso» (profesores) y,
 *     de ahí, core_user_get_users_by_field para leer su foto.
 */
import { useEffect, useState } from 'react';

import type { MoodleClient } from '@/lib/moodle';

export type ProfesorMoodle = { nombre: string; foto?: string };

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

/** Cuántas palabras del nombre buscado aparecen en el nombre de Moodle (orden indiferente). */
function parecido(buscado: string, candidato: string) {
  const a = norm(buscado);
  const b = new Set(norm(candidato));
  return a.filter((p) => b.has(p)).length;
}

/** La foto por defecto de Moodle (la silueta) no cuenta como foto. */
export function urlFoto(client: MoodleClient, url?: string) {
  if (!url) return undefined;
  if (url.includes('theme/image.php')) return undefined;
  // pluginfile.php exige sesión; webservice/pluginfile.php acepta el token
  const conWs = url.includes('/webservice/pluginfile.php')
    ? url
    : url.replace('/pluginfile.php/', '/webservice/pluginfile.php/');
  return client.fileUrl(conWs.replace(/([?&])rev=\d+&?/, '$1'));
}

type Candidato = { id?: number; fullname: string; profileimageurl?: string; roles?: { shortname: string }[] };

function elegir(candidatos: Candidato[], buscado?: string) {
  if (!candidatos.length) return undefined;
  if (buscado) {
    const mejor = [...candidatos].sort((x, y) => parecido(buscado, y.fullname) - parecido(buscado, x.fullname))[0];
    if (parecido(buscado, mejor.fullname) >= 2) return mejor;
  }
  return buscado ? undefined : candidatos[0];
}

export async function leerProfesor(
  client: MoodleClient,
  cursoId: number,
  buscado?: string,
): Promise<ProfesorMoodle | null> {
  // 1) Matriculados con rol de profesor
  try {
    const users = await client.call<Candidato[]>('core_enrol_get_enrolled_users', {
      courseid: cursoId,
      options: [{ name: 'limitnumber', value: '0' }],
    });
    const profes = (Array.isArray(users) ? users : []).filter((u) =>
      (u.roles ?? []).some((r) => r.shortname === 'editingteacher' || r.shortname === 'teacher'),
    );
    const p = elegir(profes, buscado) ?? (buscado ? undefined : profes[0]);
    if (p) return { nombre: p.fullname, foto: urlFoto(client, p.profileimageurl) };
  } catch {
    /* sin permiso: se prueba la siguiente vía */
  }
  // 2) Contactos del curso
  try {
    const r = await client.call<{ courses?: { contacts?: { id: number; fullname: string }[] }[] }>(
      'core_course_get_courses_by_field',
      { field: 'id', value: String(cursoId) },
    );
    const contactos = r.courses?.[0]?.contacts ?? [];
    const c = elegir(contactos, buscado);
    if (c?.id) {
      const us = await client.call<Candidato[]>('core_user_get_users_by_field', {
        field: 'id',
        values: [String(c.id)],
      });
      const u = Array.isArray(us) ? us[0] : undefined;
      return { nombre: c.fullname, foto: urlFoto(client, u?.profileimageurl) };
    }
  } catch {
    /* sin foto */
  }
  return null;
}

export function useProfesorMoodle(client: MoodleClient | null, cursoId: number, buscado?: string) {
  const [profesor, setProfesor] = useState<ProfesorMoodle | null>(null);
  useEffect(() => {
    if (!client) return;
    let activo = true;
    leerProfesor(client, cursoId, buscado).then((p) => {
      if (activo) setProfesor(p);
    });
    return () => {
      activo = false;
    };
  }, [client, cursoId, buscado]);
  return profesor;
}
