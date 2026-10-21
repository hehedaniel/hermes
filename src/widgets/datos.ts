/**
 * Qué enseña cada widget, sin nada de React: así se puede probar en el PC.
 * Los widgets se dibujan en segundo plano (sin la app abierta) con lo último que guardó la app.
 */
import { COURSE_PALETTE } from '@/constants/colors';
import type { Entrega, Snapshot } from '@/lib/data';
import { fechaLarga, relativo } from '@/lib/format';
import {
  AULA,
  claveDia,
  horarioDelDia,
  minutos,
  MODULOS,
  type ModuloId,
  moduloDe,
} from '@/lib/horario';

/** Misma clave que usa la app para guardar la última sincronización (store.tsx). */
export const CLAVE_SNAPSHOT = 'snapshot_v1';

const DIA_MS = 86400000;
const URGENTE_SEGUNDOS = 3 * 86400;

/** Mismo color por asignatura que en la app (por orden de id). */
function coloresDe(snapshot: Snapshot | null) {
  const ids = [...(snapshot?.courses ?? [])].map((c) => c.id).sort((a, b) => a - b);
  const mapa = new Map(ids.map((id, i) => [id, COURSE_PALETTE[i % COURSE_PALETTE.length]]));
  return (id?: number) =>
    (id !== undefined && mapa.get(id)) || COURSE_PALETTE[COURSE_PALETTE.length - 1];
}

/** "Big Data Aplicado" -> "BDA"; si no es un módulo conocido, las iniciales. */
function siglas(curso: string) {
  const m = moduloDe(curso);
  if (m) return m;
  return curso
    .replace(/\(.*?\)/g, '')
    .split(/\s+/)
    .filter((p) => p && !/^(de|del|la|el|y|a|en)$/i.test(p))
    .slice(0, 3)
    .map((p) => p[0].toUpperCase())
    .join('');
}

const pad = (n: number) => String(n).padStart(2, '0');
const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

/** "jue 23 · 23:59", o "hoy · 23:59" / "mañana · 23:59" */
function cuandoCorto(fecha: number, ahora: number) {
  const d = new Date(fecha * 1000);
  const hoy = new Date(ahora);
  const manana = new Date(ahora + DIA_MS);
  const h = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (claveDia(d) === claveDia(hoy)) return `hoy · ${h}`;
  if (claveDia(d) === claveDia(manana)) return `mañana · ${h}`;
  return `${DIAS[d.getDay()]} ${d.getDate()} · ${h}`;
}

export type FilaEntrega = {
  key: string;
  nombre: string;
  siglas: string;
  color: string;
  cuando: string; // "jue 23 · 23:59"
  falta: string; // "en 5 h"
  urgente: boolean;
};

export type DatosEntregas =
  { tipo: 'sin-datos' } | { tipo: 'ok'; filas: FilaEntrega[]; total: number; actualizado: number };

/** Entregas pendientes (o en borrador) que aún no han vencido, de la más cercana a la más lejana. */
export function datosEntregas(snapshot: Snapshot | null, ahora = Date.now()): DatosEntregas {
  if (!snapshot) return { tipo: 'sin-datos' };
  const color = coloresDe(snapshot);
  const abiertas = snapshot.entregas
    .filter(
      (e: Entrega) =>
        (e.estado === 'pendiente' || e.estado === 'borrador') && e.fecha && e.fecha * 1000 > ahora,
    )
    .sort((a, b) => a.fecha - b.fecha);
  return {
    tipo: 'ok',
    total: abiertas.length,
    actualizado: snapshot.syncedAt,
    filas: abiertas.map((e) => ({
      key: e.key,
      nombre: e.nombre,
      siglas: siglas(e.curso),
      color: color(e.cursoId),
      cuando: cuandoCorto(e.fecha, ahora),
      falta: relativo(e.fecha, ahora),
      urgente: e.fecha - ahora / 1000 < URGENTE_SEGUNDOS,
    })),
  };
}

export type FilaClase = {
  modulo: ModuloId;
  nombre: string;
  profesor: string;
  inicio: string;
  fin: string;
  color: string;
  ahora: boolean;
  acabada: boolean;
};

export type DatosClases = {
  /** "Hoy", "Mañana" o "Lunes 26" */
  titulo: string;
  /** Por qué no se enseña hoy: "Fin de semana", "Día de la Inmaculada…" */
  aviso?: string;
  clases: FilaClase[];
  aula: string;
  /** Fuera del curso o sin clases en las próximas semanas */
  vacio?: string;
};

const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * El día que interesa ver: hoy mientras queden clases; si ya han acabado o no hay clase,
 * el siguiente día lectivo (con el motivo de por qué hoy no).
 */
export function datosClases(snapshot: Snapshot | null, ahora = Date.now()): DatosClases {
  const color = coloresDe(snapshot);
  const colorModulo = (m: ModuloId) =>
    color(snapshot?.courses.find((c) => moduloDe(c.fullname) === m)?.id);
  const hoy = new Date(ahora);
  const minAhora = hoy.getHours() * 60 + hoy.getMinutes();

  const deHoy = horarioDelDia(hoy);
  let aviso: string | undefined;
  if (deHoy.tipo === 'clases') {
    const ultima = deHoy.clases[deHoy.clases.length - 1];
    if (minAhora < minutos(ultima.fin)) {
      return {
        titulo: 'Hoy',
        aula: AULA,
        clases: deHoy.clases.map((c) => ({
          modulo: c.modulo,
          nombre: MODULOS[c.modulo].corto,
          profesor: MODULOS[c.modulo].profesor,
          inicio: c.inicio,
          fin: c.fin,
          color: colorModulo(c.modulo),
          ahora: minAhora >= minutos(c.inicio) && minAhora < minutos(c.fin),
          acabada: minAhora >= minutos(c.fin),
        })),
      };
    }
  } else if (deHoy.tipo === 'fin-de-semana') {
    aviso = 'Hoy no hay clase: fin de semana';
  } else if (deHoy.tipo === 'sin-clase') {
    aviso = `Hoy no hay clase: ${deHoy.motivo}`;
  } else {
    return { titulo: 'Clases', aula: AULA, clases: [], vacio: deHoy.motivo };
  }

  // Siguiente día con clase (como mucho dentro de 3 semanas: cubre Navidad)
  for (let i = 1; i <= 21; i++) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + i, 12);
    const h = horarioDelDia(d);
    if (h.tipo === 'fuera-de-curso')
      return { titulo: 'Clases', aula: AULA, clases: [], vacio: h.motivo, aviso };
    if (h.tipo !== 'clases') continue;
    const [dia, num] = fechaLarga(d).split(' ');
    return {
      titulo: i === 1 ? 'Mañana' : `${capitalizar(dia)} ${num}`,
      aviso,
      aula: AULA,
      clases: h.clases.map((c) => ({
        modulo: c.modulo,
        nombre: MODULOS[c.modulo].corto,
        profesor: MODULOS[c.modulo].profesor,
        inicio: c.inicio,
        fin: c.fin,
        color: colorModulo(c.modulo),
        ahora: false,
        acabada: false,
      })),
    };
  }
  return {
    titulo: 'Clases',
    aula: AULA,
    clases: [],
    vacio: 'No hay clases en las próximas semanas',
    aviso,
  };
}

/** "hace 2 h" para el pie del widget */
export function haceTexto(ms: number, ahora = Date.now()) {
  const min = Math.round((ahora - ms) / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  return h < 24 ? `hace ${h} h` : `hace ${Math.round(h / 24)} d`;
}
