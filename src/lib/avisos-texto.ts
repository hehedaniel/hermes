/**
 * Qué dice cada notificación y cuándo salta cada recordatorio. Sin dependencias de
 * React Native, para poder probarlo.
 */
import type { Entrega, Snapshot } from './data';
import { fechaCorta } from './format';
import type { Novedad } from './novedades';

export type Canal = 'notas' | 'novedades' | 'entregas';

export type PreferenciasAvisos = {
  notas: boolean;
  novedades: boolean;
  recordatorios: boolean;
};

export const AVISOS_POR_DEFECTO: PreferenciasAvisos = {
  notas: true,
  novedades: true,
  recordatorios: true,
};

export type Aviso = {
  id: string;
  canal: Canal;
  titulo: string;
  cuerpo: string;
  /** Pantalla de la app que se abre al tocarla */
  ruta: string;
};

const rutaTarea = (key: string) => `/tarea/${encodeURIComponent(key)}`;

/** Una novedad como notificación. */
export function avisoDeNovedad(n: Novedad): Aviso {
  const ruta = n.entregaKey ? rutaTarea(n.entregaKey) : '/novedades';
  switch (n.tipo) {
    case 'nota':
      return {
        id: n.id,
        canal: 'notas',
        titulo: `Nota publicada: ${n.titulo}`,
        cuerpo: `${n.detalle?.replace(/^Nota: /, '') ?? ''} · ${n.curso}`.replace(/^ · /, ''),
        ruta,
      };
    case 'fecha':
      return {
        id: n.id,
        canal: 'novedades',
        titulo: `Cambio de fecha: ${n.titulo}`,
        cuerpo: n.detalle ?? n.curso,
        ruta,
      };
    case 'tarea':
      return {
        id: n.id,
        canal: 'novedades',
        titulo: `Nueva entrega: ${n.titulo}`,
        cuerpo: `${n.curso} · ${n.detalle ?? ''}`.replace(/ · $/, ''),
        ruta,
      };
    case 'archivo-actualizado':
      return {
        id: n.id,
        canal: 'novedades',
        titulo: `Apuntes actualizados: ${n.titulo}`,
        cuerpo: n.curso,
        ruta,
      };
    case 'archivo':
      return {
        id: n.id,
        canal: 'novedades',
        titulo: `Apuntes nuevos: ${n.titulo}`,
        cuerpo: n.curso,
        ruta,
      };
    default:
      return {
        id: n.id,
        canal: 'novedades',
        titulo: `Novedad: ${n.titulo}`,
        cuerpo: n.curso,
        ruta,
      };
  }
}

/**
 * Las notificaciones de un lote de novedades: las notas siempre una a una; del resto,
 * si son más de 3 se agrupan en una sola ("5 novedades en Moodle").
 */
export function avisosDeNovedades(nuevas: Novedad[], prefs: PreferenciasAvisos): Aviso[] {
  const notas = prefs.notas ? nuevas.filter((n) => n.tipo === 'nota') : [];
  const resto = prefs.novedades ? nuevas.filter((n) => n.tipo !== 'nota') : [];
  const avisos = notas.map(avisoDeNovedad);
  if (resto.length > 3) {
    const cursos = [...new Set(resto.map((n) => n.curso))];
    avisos.push({
      id: `resumen:${resto.map((n) => n.id).join('|')}`,
      canal: 'novedades',
      titulo: `${resto.length} novedades en Moodle`,
      cuerpo:
        cursos.slice(0, 3).join(' · ') + (cursos.length > 3 ? ` y ${cursos.length - 3} más` : ''),
      ruta: '/novedades',
    });
  } else {
    avisos.push(...resto.map(avisoDeNovedad));
  }
  return avisos;
}

export type Recordatorio = Aviso & { cuando: number /* ms */ };

/** Cuánto antes de la entrega avisar, en horas. */
export const ANTELACION_HORAS = [24, 2];
const MAX_RECORDATORIOS = 40;

const abierta = (e: Entrega) => e.estado === 'pendiente' || e.estado === 'borrador';

/** Recordatorios de las entregas pendientes: 1 día y 2 horas antes, solo los que están por llegar. */
export function planRecordatorios(snap: Snapshot | null, ahora = Date.now()): Recordatorio[] {
  if (!snap) return [];
  const plan: Recordatorio[] = [];
  for (const e of snap.entregas) {
    if (!abierta(e) || !e.fecha) continue;
    for (const horas of ANTELACION_HORAS) {
      const cuando = e.fecha * 1000 - horas * 3600_000;
      if (cuando <= ahora + 60_000) continue; // ya pasó (o es ahora mismo)
      plan.push({
        id: `recordatorio:${e.key}:${horas}h`,
        canal: 'entregas',
        titulo:
          horas >= 24 ? `Mañana se entrega: ${e.nombre}` : `En ${horas} h se entrega: ${e.nombre}`,
        cuerpo: `${e.curso} · ${fechaCorta(e.fecha)}${e.estado === 'borrador' ? ' · tienes un borrador sin enviar' : ''}`,
        ruta: rutaTarea(e.key),
        cuando,
      });
    }
  }
  return plan.sort((a, b) => a.cuando - b.cuando).slice(0, MAX_RECORDATORIOS);
}
