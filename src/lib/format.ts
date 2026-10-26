const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
export const DIAS_CORTOS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
export const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

const pad = (n: number) => String(n).padStart(2, '0');

export const hora = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** "jue 22 oct · 23:59" */
export function fechaCorta(ts: number) {
  const d = new Date(ts * 1000);
  return `${DIAS[d.getDay()].slice(0, 3)} ${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)} · ${hora(d)}`;
}

/** "jueves 22 de octubre" */
export function fechaLarga(d: Date) {
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

/** "en 2 días", "en 5 h", "hace 3 días" */
export function relativo(ts: number, nowMs = Date.now()) {
  const secs = ts - nowMs / 1000;
  const abs = Math.abs(secs);
  let txt: string;
  if (abs < 3600) txt = `${Math.max(1, Math.round(abs / 60))} min`;
  else if (abs < 86400) txt = `${Math.round(abs / 3600)} h`;
  else {
    const d = Math.round(abs / 86400);
    txt = d === 1 ? '1 día' : `${d} días`;
  }
  return secs >= 0 ? `en ${txt}` : `hace ${txt}`;
}

export function haceCuanto(ms: number, nowMs = Date.now()) {
  const mins = Math.round((nowMs - ms) / 60000);
  if (mins < 1) return 'ahora mismo';
  if (mins < 60) return `hace ${mins} min`;
  const h = Math.round(mins / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} d`;
}

/** Clave "YYYY-MM-DD" en hora local. */
export const dayKey = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const mesCorto = (d: Date) => MESES[d.getMonth()].slice(0, 3);

/** "27 oct" */
export const diaMes = (ts: number) => {
  const d = new Date(ts * 1000);
  return `${d.getDate()} ${mesCorto(d)}`;
};

/** "27 oct · 23:59" */
export const diaMesHora = (ts: number) => `${diaMes(ts)} · ${hora(new Date(ts * 1000))}`;

/**
 * Cuándo se entrega, para el lado derecho de cada fila:
 * "mañana 23:59", "hoy 14:00", "en 5 días · 31 oct", "12 nov".
 */
export function cuandoVence(ts: number, nowMs = Date.now()) {
  const d = new Date(ts * 1000);
  const hoy = new Date(nowMs);
  const manana = new Date(nowMs + 86400000);
  if (dayKey(d) === dayKey(hoy)) return `hoy ${hora(d)}`;
  if (dayKey(d) === dayKey(manana)) return `mañana ${hora(d)}`;
  // Días de calendario (no horas / 24): el jueves es «en 2 días» aunque falten 36 h
  const medianoche = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const dias = Math.round((medianoche(d) - medianoche(hoy)) / 86400000);
  if (dias > 0 && dias < 7) return `en ${dias} días · ${diaMes(ts)}`;
  return diaMes(ts);
}

/** "Quedan 1 día y 12 h", "Quedan 5 h", "Quedan 40 min" */
export function quedan(ts: number, nowMs = Date.now()) {
  const min = Math.max(0, Math.round((ts * 1000 - nowMs) / 60000));
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  if (d) return `Quedan ${d} ${d === 1 ? 'día' : 'días'}${h ? ` y ${h} h` : ''}`;
  if (h) return `Quedan ${h} h`;
  return `Quedan ${min} min`;
}

/** "Lunes, 26 de octubre" */
export function fechaTitulo(d: Date) {
  const t = fechaLarga(d).replace(' ', ', ').replace(/^\w/, (c) => c.toUpperCase());
  return t.replace(/(\d+) de/, '$1 de');
}
