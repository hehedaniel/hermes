/**
 * Tu rol en una asignatura (alumno, profesor…), tal y como lo tienes en Moodle.
 * Se prueba por dos vías porque cada campus restringe funciones distintas:
 *  1. core_user_get_course_user_profiles: tu perfil dentro del curso, con tus roles.
 *  2. core_enrol_get_enrolled_users: los matriculados, buscando tu id.
 * Si no se puede saber, no se muestra nada (nunca se inventa).
 */
import { useEffect, useState } from 'react';

import type { MoodleClient } from '@/lib/moodle';

export type RolCurso = 'profesor' | 'profesor-sin-edicion' | 'alumno' | 'gestor' | 'otro';

export const ETIQUETA_ROL: Record<RolCurso, string> = {
  profesor: 'Profesor',
  'profesor-sin-edicion': 'Profesor (sin edición)',
  alumno: 'Alumno',
  gestor: 'Gestor',
  otro: 'Otro rol',
};

type ConRoles = { id?: number; roles?: { shortname?: string; name?: string }[] };

/** De los roles de Moodle, el más «alto» manda (un profesor que también es alumno es profesor). */
export function rolDe(roles: { shortname?: string }[] | undefined): RolCurso | null {
  if (!roles?.length) return null;
  const cortos = new Set(roles.map((r) => r.shortname));
  if (cortos.has('editingteacher')) return 'profesor';
  if (cortos.has('teacher')) return 'profesor-sin-edicion';
  if (cortos.has('manager') || cortos.has('coursecreator')) return 'gestor';
  if (cortos.has('student')) return 'alumno';
  return 'otro';
}

const memoria = new Map<string, RolCurso | null>();

export async function leerMiRol(
  client: MoodleClient,
  cursoId: number,
  userid: number,
): Promise<RolCurso | null> {
  try {
    const r = await client.call<ConRoles[]>('core_user_get_course_user_profiles', {
      userlist: [{ userid, courseid: cursoId }],
    });
    const rol = rolDe((Array.isArray(r) ? r : [])[0]?.roles);
    if (rol) return rol;
  } catch {
    /* sin permiso: se prueba la siguiente vía */
  }
  try {
    const users = await client.call<ConRoles[]>('core_enrol_get_enrolled_users', {
      courseid: cursoId,
      options: [{ name: 'limitnumber', value: '0' }],
    });
    return rolDe((Array.isArray(users) ? users : []).find((u) => u.id === userid)?.roles);
  } catch {
    return null;
  }
}

export function useMiRol(client: MoodleClient | null, cursoId: number, userid?: number) {
  const clave = `${client?.base}|${userid}|${cursoId}`;
  const [rol, setRol] = useState<RolCurso | null>(memoria.get(clave) ?? null);
  useEffect(() => {
    if (!client || !userid) return;
    let activo = true;
    leerMiRol(client, cursoId, userid).then((r) => {
      if (r) memoria.set(clave, r);
      if (activo) setRol(r);
    });
    return () => {
      activo = false;
    };
  }, [client, cursoId, userid, clave]);
  return rol;
}
