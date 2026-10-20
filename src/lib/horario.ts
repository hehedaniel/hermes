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
    profesor: 'María Arantzazu Fiallega Escauriaza',
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

export const FRANJAS = [
  { inicio: '15:45', fin: '16:45' },
  { inicio: '16:45', fin: '17:45' },
  { inicio: '18:15', fin: '19:15' },
  { inicio: '19:15', fin: '20:15' },
] as const;

/** Por día de la semana (1 = lunes … 5 = viernes), el módulo de cada franja. */
export const HORARIO: Record<number, ModuloId[]> = {
  1: ['MIA', 'MIA', 'MIA', 'SAA'],
  2: ['SAA', 'SAA', 'BDA', 'BDA'],
  3: ['PIA', 'PIA', 'BDA', 'BDA'],
  4: ['SBD', 'PIA', 'PIA', 'PIA'],
  5: ['SBD', 'SBD', 'PIA', 'PIA'],
};

export const INICIO_CURSO = '2026-09-15';
export const FIN_CURSO = '2027-06-22';

/** Días sin clase (fechas "YYYY-MM-DD", ambos extremos incluidos). */
export const DIAS_SIN_CLASE: { desde: string; hasta?: string; motivo: string }[] = [
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
    return { tipo: 'fuera-de-curso', motivo: 'Las clases empiezan el 15 de septiembre' };
  if (k > FIN_CURSO) return { tipo: 'fuera-de-curso', motivo: 'Fin de curso: ¡vacaciones!' };
  const motivo = motivoSinClase(d);
  if (motivo) return { tipo: 'sin-clase', motivo };

  const clases: Clase[] = [];
  HORARIO[dow].forEach((modulo, i) => {
    const f = FRANJAS[i];
    const ultima = clases[clases.length - 1];
    if (ultima && ultima.modulo === modulo && ultima.fin === f.inicio) ultima.fin = f.fin;
    else clases.push({ modulo, inicio: f.inicio, fin: f.fin });
  });
  return { tipo: 'clases', clases, descanso: { inicio: '17:45', fin: '18:15' } };
}

/** "16:45" -> minutos desde medianoche. */
export const minutos = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
