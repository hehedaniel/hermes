/**
 * Calculadora de faltas. Sin dependencias de React Native.
 *
 * Para cada módulo y trimestre:
 *  - total   = horas que le tocan en el horario, sin festivos ni horas «sin clase»
 *              (falta del profesor u otro motivo): esas no cuentan y bajan el total.
 *  - límite  = 10 % del total. Faltar más horas que el límite es suspender el módulo.
 *  - faltadas = horas que el alumno marcó como «falté» (todas injustificadas).
 */
import {
  FIN_CURSO,
  FRANJAS,
  HORARIO,
  INICIO_CURSO,
  type ModuloId,
  claveDia,
  minutos,
  motivoSinClase,
  sinClaseDeModulo,
} from './horario';

export const LIMITE_FALTAS = 0.1;

export type Trimestre = { id: 1 | 2 | 3 | 'curso'; nombre: string; desde: string; hasta: string };

export const TRIMESTRES: Trimestre[] = [
  { id: 1, nombre: '1.er trimestre', desde: INICIO_CURSO, hasta: '2026-12-22' },
  { id: 2, nombre: '2.º trimestre', desde: '2026-12-23', hasta: '2027-03-19' },
  { id: 3, nombre: '3.er trimestre', desde: '2027-03-22', hasta: FIN_CURSO },
];

/** Todo el curso, de seguido: la Orden de la Junta cuenta sobre la duración total del módulo. */
export const CURSO_COMPLETO: Trimestre = {
  id: 'curso',
  nombre: 'Curso completo',
  desde: INICIO_CURSO,
  hasta: FIN_CURSO,
};

/** Los tres trimestres y el curso entero, para el selector. */
export const PERIODOS: Trimestre[] = [...TRIMESTRES, CURSO_COMPLETO];

/** Los dos límites que se pueden mirar: 10 % (aviso por escrito) y 20 % (pierdes evaluación continua). */
export const LIMITES = [0.1, 0.2] as const;

/** El trimestre de una fecha (los días entre dos trimestres cuentan para el siguiente). */
export function trimestreDe(fecha: string): Trimestre {
  return TRIMESTRES.find((t) => fecha <= t.hasta) ?? TRIMESTRES[TRIMESTRES.length - 1];
}

/** «f» = falté a esa hora; «s» = esa hora no hubo clase. Por día y franja (0-3). */
export type Marca = 'f' | 's';
export type Marcas = Record<string, Record<string, Marca>>;

export type Hora = {
  fecha: string;
  franja: number;
  modulo: ModuloId;
  inicio: string;
  fin: string;
  /** Sin clase por el calendario (festivo o falta del profesor ya registrada en la app) */
  automatica: string | null;
  marca: Marca | null;
};

const MODULOS_IDS: ModuloId[] = ['MIA', 'SAA', 'BDA', 'PIA', 'SBD'];

/** Las horas lectivas de un día, con su marca. Vacío en fines de semana y fuera de curso. */
export function horasDelDia(fecha: string, marcas: Marcas): Hora[] {
  if (fecha < INICIO_CURSO || fecha > FIN_CURSO) return [];
  const [a, m, d] = fecha.split('-').map(Number);
  const dow = new Date(a, m - 1, d, 12).getDay();
  if (dow === 0 || dow === 6) return [];
  const festivo = motivoSinClase(new Date(a, m - 1, d, 12));
  return HORARIO[dow].map((modulo, i) => ({
    fecha,
    franja: i,
    modulo,
    inicio: FRANJAS[i].inicio,
    fin: FRANJAS[i].fin,
    automatica: festivo ?? sinClaseDeModulo(fecha, modulo),
    marca: marcas[fecha]?.[String(i)] ?? null,
  }));
}

/** Todas las fechas «YYYY-MM-DD» de un trimestre. */
export function fechasDe(t: Trimestre): string[] {
  const salida: string[] = [];
  const [a, m, d] = t.desde.split('-').map(Number);
  for (
    let dia = new Date(a, m - 1, d, 12);
    claveDia(dia) <= t.hasta;
    dia.setDate(dia.getDate() + 1)
  )
    salida.push(claveDia(dia));
  return salida;
}

export type Nivel = 'ok' | 'aviso' | 'pasado';

export type ResumenModulo = {
  modulo: ModuloId;
  /** Horas del trimestre sin contar las «sin clase» */
  total: number;
  /** Horas «sin clase» (festivos aparte): falta del profesor u otro motivo */
  sinClase: number;
  /** De ese total, las que ya han pasado */
  dadas: number;
  /** Horas que has faltado (incluye las ya marcadas de días futuros) */
  faltadas: number;
  /** Las faltadas que ya han pasado */
  faltadasHoy: number;
  /** 10 % del total, con decimales */
  limite: number;
  /** Horas enteras que se pueden faltar: floor(límite) */
  permitidas: number;
  /** Cuántas más puedes faltar sin pasarte (nunca negativo) */
  restantes: number;
  /** Cuántas te has pasado (0 si no) */
  exceso: number;
  /** faltadas / horas dadas hasta hoy */
  pctHoy: number;
  /** faltadas / total del trimestre: el que decide el suspenso */
  pctTotal: number;
  nivel: Nivel;
};

/** Resumen de todos los módulos en un trimestre. `ahora` decide qué horas ya se han dado. */
export function resumen(
  marcas: Marcas,
  t: Trimestre,
  ahora: Date,
  limitePct: number = LIMITE_FALTAS,
): Record<ModuloId, ResumenModulo> {
  const hoy = claveDia(ahora);
  const minAhora = ahora.getHours() * 60 + ahora.getMinutes();
  const acc = {} as Record<ModuloId, ResumenModulo>;
  for (const id of MODULOS_IDS)
    acc[id] = {
      modulo: id,
      total: 0,
      sinClase: 0,
      dadas: 0,
      faltadas: 0,
      faltadasHoy: 0,
      limite: 0,
      permitidas: 0,
      restantes: 0,
      exceso: 0,
      pctHoy: 0,
      pctTotal: 0,
      nivel: 'ok',
    };

  for (const fecha of fechasDe(t)) {
    const festivo = (() => {
      const [a, m, d] = fecha.split('-').map(Number);
      return !!motivoSinClase(new Date(a, m - 1, d, 12));
    })();
    for (const h of horasDelDia(fecha, marcas)) {
      const r = acc[h.modulo];
      if (festivo) continue;
      if (h.automatica || h.marca === 's') {
        r.sinClase++;
        continue;
      }
      r.total++;
      const pasada = fecha < hoy || (fecha === hoy && minAhora >= minutos(h.fin));
      if (pasada) r.dadas++;
      if (h.marca === 'f') {
        r.faltadas++;
        if (pasada) r.faltadasHoy++;
      }
    }
  }

  for (const id of MODULOS_IDS) {
    const r = acc[id];
    r.limite = r.total * limitePct;
    r.permitidas = Math.floor(r.limite + 1e-9);
    r.restantes = Math.max(0, r.permitidas - r.faltadas);
    r.exceso = Math.max(0, r.faltadas - r.permitidas);
    r.pctHoy = r.dadas ? r.faltadasHoy / r.dadas : 0;
    r.pctTotal = r.total ? r.faltadas / r.total : 0;
    r.nivel =
      r.exceso > 0
        ? 'pasado'
        : r.permitidas > 0 && r.faltadas / r.permitidas >= 0.7
          ? 'aviso'
          : 'ok';
    if (r.permitidas === 0 && r.faltadas > 0) r.nivel = 'pasado';
  }
  return acc;
}

/** Pone o quita una marca sin modificar el objeto original. */
export function conMarca(
  marcas: Marcas,
  fecha: string,
  franja: number,
  marca: Marca | null,
): Marcas {
  const dia = { ...(marcas[fecha] ?? {}) };
  if (marca) dia[String(franja)] = marca;
  else delete dia[String(franja)];
  const nuevo = { ...marcas };
  if (Object.keys(dia).length) nuevo[fecha] = dia;
  else delete nuevo[fecha];
  return nuevo;
}
