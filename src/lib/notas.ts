/**
 * Notas de cada asignatura tal y como las calcula Moodle (libro de calificaciones), con el
 * peso de cada actividad. Si Moodle no las deja leer (o una asignatura las oculta), la
 * pantalla se queda con las notas que ya traen las entregas y no muestra pesos.
 */
import { useEffect, useState } from 'react';

import type { MoodleClient } from '@/lib/moodle';

export type ItemNota = {
  nombre: string;
  cmid?: number;
  /** «15,00 %» tal y como lo da Moodle; vacío si la actividad no pondera */
  peso?: string;
  nota?: number;
  max: number;
  fecha?: number;
};

export type NotasCurso = {
  items: ItemNota[];
  total?: { nota: number; max: number };
};

const num = (v: unknown): number | undefined => {
  if (v === null || v === undefined || v === '') return undefined;
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
};

export async function leerNotasCurso(
  client: MoodleClient,
  cursoId: number,
  userId: number,
): Promise<NotasCurso | null> {
  try {
    const r = await client.call<any>('gradereport_user_get_grade_items', {
      courseid: cursoId,
      userid: userId,
    });
    const filas: any[] = r?.usergrades?.[0]?.gradeitems ?? [];
    if (!filas.length) return null;
    const items: ItemNota[] = [];
    let total: NotasCurso['total'];
    for (const f of filas) {
      const max = num(f.grademax) ?? 10;
      if (f.itemtype === 'course') {
        const nota = num(f.graderaw);
        if (nota !== undefined) total = { nota, max };
        continue;
      }
      if (f.itemtype !== 'mod') continue;
      const peso = typeof f.weightformatted === 'string' && f.weightformatted.trim() ? f.weightformatted.trim() : undefined;
      items.push({
        nombre: String(f.itemname ?? 'Actividad'),
        cmid: num(f.cmid),
        peso,
        nota: num(f.graderaw),
        max,
        fecha: num(f.gradedategraded) || undefined,
      });
    }
    return { items, total };
  } catch {
    return null;
  }
}

/** Notas de todos los cursos dados; `null` = Moodle no las dio. */
export function useNotasMoodle(client: MoodleClient | null, userId: number | undefined, cursoIds: number[]) {
  const [datos, setDatos] = useState<Record<number, NotasCurso | null>>({});
  const clave = cursoIds.join(',');
  useEffect(() => {
    if (!client || userId === undefined || !clave) return;
    let activo = true;
    Promise.all(
      clave.split(',').map(async (id) => [Number(id), await leerNotasCurso(client, Number(id), userId)] as const),
    ).then((pares) => {
      if (!activo) return;
      setDatos(Object.fromEntries(pares));
    });
    return () => {
      activo = false;
    };
  }, [client, userId, clave]);
  return { datos };
}
