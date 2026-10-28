/**
 * Registro local de cambios (para sincronizar) y aviso a quien escuche.
 * Cada vez que cambias algo sincronizable, la pantalla correspondiente lo anota aquí con su hora.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { CLAVES } from './claves';
import type { Marcas } from './faltas';
import { leerPlantillas } from './ia/plantillas-almacen';
import type { PlantillasIA } from './ia/plantillas-datos';
import {
  adoptar,
  aplicar,
  claveMarca,
  clavePlantilla,
  CLAVE_DEFECTO,
  CLAVE_ESTILO,
  CLAVE_LIMITE,
  CLAVE_USAR_ESTILO,
  type Local,
  mezclar,
  mismoLocal,
  type Registro,
} from './sync-datos';

type Oyente = () => void;
const alAnotar = new Set<Oyente>();
const alCambiarDesdeFuera = new Set<Oyente>();

/** Avisa cuando el usuario cambia algo sincronizable (para sincronizar poco después). */
export function suscribirAnotaciones(cb: Oyente) {
  alAnotar.add(cb);
  return () => void alAnotar.delete(cb);
}

/** Avisa cuando la sincronización ha cambiado los datos del dispositivo (para recargarlos). */
export function suscribirRemoto(cb: Oyente) {
  alCambiarDesdeFuera.add(cb);
  return () => void alCambiarDesdeFuera.delete(cb);
}

// Todas las operaciones sobre el registro van de una en una
let cola: Promise<unknown> = Promise.resolve();
const enCola = <T>(f: () => Promise<T>): Promise<T> => {
  const p = cola.then(f, f);
  cola = p.catch(() => {});
  return p;
};

export async function leerReg(): Promise<Registro> {
  try {
    const raw = await AsyncStorage.getItem(CLAVES.syncReg);
    const d = raw ? JSON.parse(raw) : {};
    return d && typeof d === 'object' ? (d as Registro) : {};
  } catch {
    return {};
  }
}

const guardarReg = (r: Registro) =>
  AsyncStorage.setItem(CLAVES.syncReg, JSON.stringify(r)).catch(() => {});

/** Anota cambios (valor null = borrado). Varios a la vez comparten la misma hora. */
export function anotar(cambios: Record<string, unknown>) {
  const p = enCola(async () => {
    const reg = await leerReg();
    const ahora = Date.now();
    for (const [k, v] of Object.entries(cambios))
      reg[k] = { v, t: Math.max(ahora, (reg[k]?.t ?? 0) + 1) };
    await guardarReg(reg);
  });
  p.then(() => alAnotar.forEach((cb) => cb())).catch(() => {});
  return p;
}

export const anotarMarcas = (fecha: string, franjas: number[], marca: 'f' | 's' | null) =>
  anotar(Object.fromEntries(franjas.map((f) => [claveMarca(fecha, f), marca])));

export const anotarLimite = (n: number) => anotar({ [CLAVE_LIMITE]: n });

/** Lo que ha cambiado en las plantillas entre `antes` y `despues` (también los borrados). */
export function anotarPlantillas(antes: PlantillasIA, despues: PlantillasIA) {
  const cambios: Record<string, unknown> = {};
  const viejas = new Map(antes.plantillas.map((p) => [p.id, p]));
  const nuevas = new Map(despues.plantillas.map((p) => [p.id, p]));
  for (const [id, p] of nuevas) {
    const v = viejas.get(id);
    if (!v || v.nombre !== p.nombre || v.texto !== p.texto || v.archivo !== p.archivo)
      cambios[clavePlantilla(id)] = {
        nombre: p.nombre,
        archivo: p.archivo,
        texto: p.texto,
        creada: p.creada,
      };
  }
  for (const id of viejas.keys()) if (!nuevas.has(id)) cambios[clavePlantilla(id)] = null;
  if (antes.defecto !== despues.defecto) cambios[CLAVE_DEFECTO] = despues.defecto;
  if (JSON.stringify(antes.estilo) !== JSON.stringify(despues.estilo))
    cambios[CLAVE_ESTILO] = despues.estilo;
  if (antes.usarEstilo !== despues.usarEstilo) cambios[CLAVE_USAR_ESTILO] = despues.usarEstilo;
  if (Object.keys(cambios).length) return anotar(cambios);
  return Promise.resolve();
}

async function leerMarcas(): Promise<Marcas> {
  try {
    const raw = await AsyncStorage.getItem(CLAVES.faltas);
    const d = raw ? JSON.parse(raw) : {};
    return d && typeof d === 'object' ? (d as Marcas) : {};
  } catch {
    return {};
  }
}

async function leerLimite(): Promise<number | null> {
  const n = Number(await AsyncStorage.getItem(CLAVES.faltasLimite).catch(() => null));
  return n === 0.1 || n === 0.2 ? n : null;
}

export async function leerLocal(): Promise<Local> {
  const [marcas, limite, plantillas] = await Promise.all([
    leerMarcas(),
    leerLimite(),
    leerPlantillas(),
  ]);
  return { marcas, limite, plantillas };
}

async function escribirLocal(l: Local) {
  await Promise.all([
    AsyncStorage.setItem(CLAVES.faltas, JSON.stringify(l.marcas)),
    l.limite !== null ? AsyncStorage.setItem(CLAVES.faltasLimite, String(l.limite)) : null,
    AsyncStorage.setItem(CLAVES.iaPlantillas, JSON.stringify(l.plantillas)),
  ]).catch(() => {});
}

/**
 * Junta lo remoto con lo del dispositivo, de una vez y sin que se cuele otro cambio en medio.
 * Devuelve el registro final y si hay algo que subir a Moodle.
 */
export function juntarConRemoto(remoto: Registro | null) {
  return enCola(async () => {
    const reg = await leerReg();
    const local = await leerLocal();
    const conLocal = adoptar(reg, local);
    const final = mezclar(conLocal, remoto ?? {});
    const nuevoLocal = aplicar(final, local);
    const cambioLocal = !mismoLocal(nuevoLocal, local);
    if (cambioLocal) await escribirLocal(nuevoLocal);
    await guardarReg(final);
    if (cambioLocal) alCambiarDesdeFuera.forEach((cb) => cb());
    return final;
  });
}
