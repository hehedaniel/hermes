/**
 * Horario del grupo 1º IA y Big Data (IES La Marisma, curso 2026-27), profesores y días sin clase.
 * Sacado del "Horario IABD 26-27.pdf" y del "Calendario_escolar_2026_27.pdf" del Moodle.
 * Sin dependencias de React Native.
 */

export type ModuloId = 'MIA' | 'SAA' | 'BDA' | 'PIA' | 'SBD';

export type InfoModulo = {
  nombre: string;
  corto: string;
  profesor: string;
  /** Trozos de texto que identifican el curso de Moodle o el evento de Google (sin tildes, en minúsculas). */
  claves: string[];
};

export const MODULOS: Record<ModuloId, InfoModulo> = {
  MIA: {
    nombre: 'Modelos de Inteligencia Artificial',
    corto: 'Modelos de IA',
    profesor: 'Carlos Basulto Pardo',
    claves: ['modelos de inteligencia', 'modelos de ia', 'miart'],
  },
  SAA: {
    nombre: 'Sistemas de Aprendizaje Automático',
    corto: 'Aprendizaje Automático',
    profesor: 'José Carlos del Arco Prieto',
    claves: ['aprendizaje automatico', 'saaut'],
  },
  BDA: {
    nombre: 'Big Data Aplicado',
    corto: 'Big Data Aplicado',
    profesor: 'Francisco de Asís Azcárate Llanes',
    claves: ['big data aplicado'],
  },
  PIA: {
    nombre: 'Programación de Inteligencia Artificial',
    corto: 'Programación de IA',
    profesor: 'Jesús María Prieto',
    claves: ['programacion de inteligencia', 'programacion de ia', 'priar'],
  },
  SBD: {
    nombre: 'Sistemas de Big Data',
    corto: 'Sistemas de Big Data',
    profesor: 'José Manuel González Rodríguez',
    claves: ['sistemas de big data', 'sbigd'],
  },
};

export const AULA = 'TI4';

export type Franja = { inicio: string; fin: string };

/** Las franjas de cada día. Se pueden cambiar con el horario publicado (public/horario.json). */
export const FRANJAS: Franja[] = [
  { inicio: '15:45', fin: '16:45' },
  { inicio: '16:45', fin: '17:45' },
  { inicio: '18:15', fin: '19:15' },
  { inicio: '19:15', fin: '20:15' },
];

/** Por día de la semana (1 = lunes … 5 = viernes), el módulo de cada franja. */
export const HORARIO: Record<number, ModuloId[]> = {
  1: ['MIA', 'MIA', 'MIA', 'SAA'],
  2: ['SAA', 'SAA', 'BDA', 'BDA'],
  3: ['PIA', 'PIA', 'BDA', 'BDA'],
  4: ['SBD', 'PIA', 'PIA', 'PIA'],
  5: ['SBD', 'SBD', 'PIA', 'PIA'],
};

export let INICIO_CURSO = '2026-09-28';
export let FIN_CURSO = '2027-06-22';

/** Días sin clase (fechas "YYYY-MM-DD", ambos extremos incluidos). */
export const DIAS_SIN_CLASE: { desde: string; hasta?: string; motivo: string }[] = [
  { desde: '2026-10-12', motivo: 'Fiesta Nacional de España' },
  { desde: '2026-11-02', motivo: 'Lunes siguiente al Día de Todos los Santos' },
  { desde: '2026-12-07', motivo: 'Lunes siguiente al Día de la Constitución' },
  { desde: '2026-12-08', motivo: 'Día de la Inmaculada Concepción' },
  { desde: '2026-12-23', hasta: '2027-01-05', motivo: 'Vacaciones de Navidad' },
  { desde: '2027-01-06', motivo: 'Día de la Epifanía' },
  { desde: '2027-01-07', motivo: 'Vacaciones de Navidad' },
  { desde: '2027-02-26', motivo: 'Día de la Comunidad Educativa' },
  { desde: '2027-03-01', motivo: 'Lunes siguiente al Día de Andalucía' },
  { desde: '2027-03-22', hasta: '2027-03-24', motivo: 'Vacaciones de Semana Santa' },
  { desde: '2027-03-25', motivo: 'Jueves Santo' },
  { desde: '2027-03-26', motivo: 'Viernes Santo' },
  { desde: '2027-05-13', hasta: '2027-05-14', motivo: 'Romería del Rocío (fiesta local)' },
  { desde: '2027-05-17', motivo: 'Romería del Rocío (fiesta local)' },
];

/** Días en que un módulo concreto no tuvo clase (falta del profesor u otro motivo). */
export const SIN_CLASE_MODULO: { fecha: string; modulo: ModuloId; motivo: string }[] = [
  { fecha: '2026-10-13', modulo: 'SAA', motivo: 'Sin clase de Aprendizaje Automático' },
  { fecha: '2026-10-19', modulo: 'SAA', motivo: 'Sin clase de Aprendizaje Automático' },
  { fecha: '2026-10-20', modulo: 'SAA', motivo: 'Sin clase de Aprendizaje Automático' },
];

/** Motivo por el que ese módulo no tuvo clase ese día (fecha «YYYY-MM-DD»), o null si sí la tuvo. */
export function sinClaseDeModulo(fecha: string, modulo: ModuloId): string | null {
  return SIN_CLASE_MODULO.find((x) => x.fecha === fecha && x.modulo === modulo)?.motivo ?? null;
}

export type Trimestre = { id: 1 | 2 | 3 | 'curso'; nombre: string; desde: string; hasta: string };

export const TRIMESTRES: Trimestre[] = [
  { id: 1, nombre: '1.er trimestre', desde: '2026-09-28', hasta: '2026-12-22' },
  { id: 2, nombre: '2.º trimestre', desde: '2026-12-23', hasta: '2027-03-19' },
  { id: 3, nombre: '3.er trimestre', desde: '2027-03-22', hasta: '2027-06-22' },
];

/** Todo el curso, de seguido: la Orden de la Junta cuenta sobre la duración total del módulo. */
export const CURSO_COMPLETO: Trimestre = {
  id: 'curso',
  nombre: 'Curso completo',
  desde: '2026-09-28',
  hasta: '2027-06-22',
};

/** Cambios de un día concreto: otro reparto de módulos por franja (null = sin clase) y/o otras horas. */
export type CambioDia = {
  fecha: string;
  motivo?: string;
  horario?: (ModuloId | null)[];
  franjas?: Franja[];
};

/** Días en que cambia el horario normal (se rellena con el horario publicado). */
export const CAMBIOS: CambioDia[] = [];

/* ─────────────── Horario publicado (public/horario.json) ───────────────
 * El horario de arriba es el que lleva la app. Si hay uno publicado en la web de Hermes, se
 * descarga y sustituye a este (ver horario-remoto.ts). Aquí solo se valida y se aplica. */

export type ConfigHorario = {
  v: 1;
  inicio: string;
  fin: string;
  franjas: Franja[];
  horario: Record<string, ModuloId[]>;
  trimestres: { desde: string; hasta: string }[];
  sinClase: { desde: string; hasta?: string; motivo: string }[];
  sinClaseModulo: { fecha: string; modulo: ModuloId; motivo: string }[];
  cambios: CambioDia[];
};

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const esModulo = (x: unknown): x is ModuloId =>
  typeof x === 'string' && Object.prototype.hasOwnProperty.call(MODULOS, x);
const esFecha = (x: unknown): x is string =>
  typeof x === 'string' &&
  FECHA.test(x) &&
  !Number.isNaN(Date.parse(`${x}T12:00:00Z`)) &&
  new Date(`${x}T12:00:00Z`).toISOString().slice(0, 10) === x;
const esObjeto = (x: unknown): x is Record<string, unknown> =>
  !!x && typeof x === 'object' && !Array.isArray(x);

function validarFranjas(x: unknown, n?: number): string | null {
  if (!Array.isArray(x) || !x.length || (n !== undefined && x.length !== n))
    return `franjas: tiene que haber ${n ?? 'al menos 1'}`;
  for (const f of x) {
    if (!esObjeto(f) || !HORA.test(String(f.inicio)) || !HORA.test(String(f.fin)))
      return 'franjas: cada una necesita inicio y fin con formato HH:MM';
    if (String(f.inicio) >= String(f.fin)) return 'franjas: el inicio tiene que ser antes del fin';
  }
  return null;
}

/** Texto del primer error del horario publicado, o null si es válido. */
export function validarHorario(d: unknown): string | null {
  if (!esObjeto(d) || d.v !== 1) return 'Falta "v": 1';
  if (!esFecha(d.inicio) || !esFecha(d.fin) || d.inicio > d.fin)
    return 'inicio/fin: fechas AAAA-MM-DD';
  const ef = validarFranjas(d.franjas);
  if (ef) return ef;
  const n = (d.franjas as unknown[]).length;
  if (!esObjeto(d.horario)) return 'horario: falta';
  for (let dia = 1; dia <= 5; dia++) {
    const h = d.horario[String(dia)];
    if (!Array.isArray(h) || h.length !== n || !h.every(esModulo))
      return `horario["${dia}"]: ${n} módulos válidos (MIA, SAA, BDA, PIA, SBD)`;
  }
  if (!Array.isArray(d.trimestres) || d.trimestres.length !== 3)
    return 'trimestres: tienen que ser 3';
  let previo = '';
  for (const t of d.trimestres) {
    if (
      !esObjeto(t) ||
      !esFecha(t.desde) ||
      !esFecha(t.hasta) ||
      t.desde > t.hasta ||
      t.desde <= previo
    )
      return 'trimestres: desde/hasta en orden, AAAA-MM-DD';
    previo = String(t.hasta);
  }
  if (!Array.isArray(d.sinClase)) return 'sinClase: falta';
  for (const x of d.sinClase) {
    if (
      !esObjeto(x) ||
      !esFecha(x.desde) ||
      (x.hasta !== undefined && !esFecha(x.hasta)) ||
      typeof x.motivo !== 'string'
    )
      return 'sinClase: cada uno necesita desde, motivo y (opcional) hasta';
  }
  if (!Array.isArray(d.sinClaseModulo)) return 'sinClaseModulo: falta';
  for (const x of d.sinClaseModulo) {
    if (!esObjeto(x) || !esFecha(x.fecha) || !esModulo(x.modulo) || typeof x.motivo !== 'string')
      return 'sinClaseModulo: cada uno necesita fecha, modulo y motivo';
  }
  if (!Array.isArray(d.cambios)) return 'cambios: falta';
  for (const x of d.cambios) {
    if (!esObjeto(x) || !esFecha(x.fecha)) return 'cambios: cada uno necesita fecha';
    if (
      x.horario !== undefined &&
      (!Array.isArray(x.horario) ||
        x.horario.length !== n ||
        !x.horario.every((m) => m === null || esModulo(m)))
    )
      return `cambios (${x.fecha}): horario con ${n} módulos o null`;
    if (x.franjas !== undefined) {
      const e = validarFranjas(x.franjas, n);
      if (e) return `cambios (${x.fecha}): ${e}`;
    }
  }
  return null;
}

const reemplazar = <T>(destino: T[], nuevo: T[]) => {
  destino.length = 0;
  destino.push(...nuevo);
};

const clonar = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

const HORARIO_INCLUIDO: ConfigHorario = {
  v: 1,
  inicio: INICIO_CURSO,
  fin: FIN_CURSO,
  franjas: clonar(FRANJAS),
  horario: Object.fromEntries(Object.entries(HORARIO).map(([k, v]) => [k, [...v]])),
  trimestres: TRIMESTRES.map((t) => ({ desde: t.desde, hasta: t.hasta })),
  sinClase: clonar(DIAS_SIN_CLASE),
  sinClaseModulo: clonar(SIN_CLASE_MODULO),
  cambios: [],
};

/** El horario que lleva la app de serie (el mismo que public/horario.json al publicarlo). */
export const horarioIncluido = (): ConfigHorario => clonar(HORARIO_INCLUIDO);

let version = 0;
const oyentes = new Set<() => void>();
export const versionHorario = () => version;
export const suscribirHorario = (fn: () => void) => {
  oyentes.add(fn);
  return () => void oyentes.delete(fn);
};

/** Pone este horario como el activo. Devuelve el error si no es válido (y no cambia nada). */
export function aplicarHorario(d: unknown): string | null {
  const error = validarHorario(d);
  if (error) return error;
  const c = clonar(d as ConfigHorario);
  INICIO_CURSO = c.inicio;
  FIN_CURSO = c.fin;
  reemplazar(FRANJAS, c.franjas);
  for (let dia = 1; dia <= 5; dia++) HORARIO[dia] = c.horario[String(dia)];
  reemplazar(DIAS_SIN_CLASE, c.sinClase);
  reemplazar(SIN_CLASE_MODULO, c.sinClaseModulo);
  reemplazar(CAMBIOS, c.cambios);
  c.trimestres.forEach((t, i) => {
    TRIMESTRES[i].desde = t.desde;
    TRIMESTRES[i].hasta = t.hasta;
  });
  CURSO_COMPLETO.desde = c.inicio;
  CURSO_COMPLETO.hasta = c.fin;
  TRIMESTRES[0].desde = c.inicio;
  TRIMESTRES[2].hasta = c.fin;
  version++;
  oyentes.forEach((f) => f());
  return null;
}

/** El mes en que empieza el curso: de ahí hacia atrás el calendario no tiene nada que enseñar. */
export function limitarMes(mes: Date): Date {
  const [a, m] = INICIO_CURSO.split('-').map(Number);
  const primero = new Date(a, m - 1, 1);
  return mes < primero ? primero : mes;
}

/** Cada franja de un día con su módulo (null = sin clase) y su hora, con los cambios de ese día. */
export type Slot = { modulo: ModuloId | null; inicio: string; fin: string };
export function slotsDelDia(fecha: string, dow: number): Slot[] {
  const c = CAMBIOS.find((x) => x.fecha === fecha);
  const base = HORARIO[dow] ?? [];
  return FRANJAS.map((f, i) => ({
    modulo: c?.horario ? (c.horario[i] ?? null) : (base[i] ?? null),
    inicio: c?.franjas?.[i]?.inicio ?? f.inicio,
    fin: c?.franjas?.[i]?.fin ?? f.fin,
  }));
}

const pad = (n: number) => String(n).padStart(2, '0');
export const claveDia = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const normalizar = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ');

/** ¿Qué módulo es este nombre de curso (Moodle) o título de evento (Google)? */
export function moduloDe(texto?: string): ModuloId | null {
  if (!texto) return null;
  const t = normalizar(texto);
  for (const [id, m] of Object.entries(MODULOS) as [ModuloId, InfoModulo][]) {
    if (m.claves.some((c) => t.includes(c))) return id;
  }
  return null;
}

export function motivoSinClase(d: Date): string | null {
  const k = claveDia(d);
  for (const f of DIAS_SIN_CLASE) {
    if (k >= f.desde && k <= (f.hasta ?? f.desde)) return f.motivo;
  }
  return null;
}

export type Clase = { modulo: ModuloId; inicio: string; fin: string };

export type DiaHorario =
  | { tipo: 'clases'; clases: Clase[]; descanso?: { inicio: string; fin: string } }
  | { tipo: 'sin-clase'; motivo: string }
  | { tipo: 'fin-de-semana' }
  | { tipo: 'fuera-de-curso'; motivo: string };

/** Clases de un día, juntando las horas seguidas del mismo módulo. */
export function horarioDelDia(d: Date): DiaHorario {
  const k = claveDia(d);
  const dow = d.getDay(); // 0 = domingo
  if (dow === 0 || dow === 6) return { tipo: 'fin-de-semana' };
  if (k < INICIO_CURSO)
    return { tipo: 'fuera-de-curso', motivo: 'Las clases empiezan el 28 de septiembre' };
  if (k > FIN_CURSO) return { tipo: 'fuera-de-curso', motivo: 'Fin de curso: ¡vacaciones!' };
  const motivo = motivoSinClase(d);
  if (motivo) return { tipo: 'sin-clase', motivo };

  const clases: Clase[] = [];
  for (const f of slotsDelDia(k, dow)) {
    const modulo = f.modulo;
    if (!modulo || sinClaseDeModulo(k, modulo)) continue;
    const ultima = clases[clases.length - 1];
    if (ultima && ultima.modulo === modulo && ultima.fin === f.inicio) ultima.fin = f.fin;
    else clases.push({ modulo, inicio: f.inicio, fin: f.fin });
  }
  if (!clases.length)
    return { tipo: 'sin-clase', motivo: CAMBIOS.find((x) => x.fecha === k)?.motivo ?? 'Sin clase' };
  const descanso =
    FRANJAS.length >= 3 ? { inicio: FRANJAS[1].fin, fin: FRANJAS[2].inicio } : undefined;
  return { tipo: 'clases', clases, descanso };
}

/** "16:45" -> minutos desde medianoche. */
export const minutos = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
