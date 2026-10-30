/**
 * Lo más importante del día para la franja de resumen del inicio: la clase que toca, el próximo
 * examen y cómo vas de faltas. Sin dependencias de React Native: se puede probar en Node.
 */
import { type Marcas, type Nivel, resumen, trimestreDe } from './faltas';
import {
  claveDia,
  examenesDelDia,
  EXAMENES,
  horarioDelDia,
  type ModuloId,
  minutos,
} from './horario';

export type ProximaClase = {
  modulo: ModuloId;
  inicio: string;
  fin: string;
  /** 0 = hoy, 1 = mañana… */
  dias: number;
  enCurso: boolean;
  /** Fecha del día de la clase */
  fecha: Date;
};

/** La clase en curso o la siguiente (hoy o en los próximos días con clase). */
export function proximaClase(ahora: Date): ProximaClase | null {
  const min = ahora.getHours() * 60 + ahora.getMinutes();
  for (let dias = 0; dias < 14; dias++) {
    const fecha = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + dias, 12);
    const h = horarioDelDia(fecha);
    if (h.tipo !== 'clases') continue;
    for (const c of h.clases) {
      if (dias === 0 && min >= minutos(c.fin)) continue;
      return {
        modulo: c.modulo,
        inicio: c.inicio,
        fin: c.fin,
        dias,
        enCurso: dias === 0 && min >= minutos(c.inicio),
        fecha,
      };
    }
  }
  return null;
}

export type ProximoExamen = { fecha: string; titulo: string; modulo: ModuloId; dias: number };

/** El examen más cercano de hoy en adelante, con los días que faltan. */
export function proximoExamen(ahora: Date): ProximoExamen | null {
  const hoy = claveDia(ahora);
  const x = [...EXAMENES]
    .filter((e) => e.fecha >= hoy)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))[0];
  if (!x) return null;
  const [a, m, d] = x.fecha.split('-').map(Number);
  const dias = Math.round(
    (new Date(a, m - 1, d).getTime() -
      new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).getTime()) /
      86_400_000,
  );
  return { fecha: x.fecha, titulo: x.titulo, modulo: x.modulo, dias };
}

export const hayExamenHoy = (ahora: Date) => examenesDelDia(claveDia(ahora)).length > 0;

export type ResumenFaltas = {
  /** Horas faltadas en el trimestre actual, entre todos los módulos */
  faltadas: number;
  /** El módulo con menos margen (o el que se ha pasado) */
  peor: { modulo: ModuloId; restantes: number; exceso: number; nivel: Nivel } | null;
  nivel: Nivel;
};

/** Cómo vas de faltas en el trimestre actual. */
export function resumenFaltas(marcas: Marcas, ahora: Date, limite: number): ResumenFaltas {
  const datos = resumen(marcas, trimestreDe(claveDia(ahora)), ahora, limite);
  const todos = Object.values(datos);
  const faltadas = todos.reduce((n, r) => n + r.faltadas, 0);
  if (!faltadas) return { faltadas: 0, peor: null, nivel: 'ok' };
  const peso = (n: Nivel) => (n === 'pasado' ? 2 : n === 'aviso' ? 1 : 0);
  const peor = [...todos]
    .filter((r) => r.faltadas > 0)
    .sort(
      (a, b) =>
        peso(b.nivel) - peso(a.nivel) || a.restantes - b.restantes || b.faltadas - a.faltadas,
    )[0];
  return {
    faltadas,
    peor: {
      modulo: peor.modulo,
      restantes: peor.restantes,
      exceso: peor.exceso,
      nivel: peor.nivel,
    },
    nivel: peor.nivel,
  };
}
