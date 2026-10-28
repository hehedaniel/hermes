/**
 * Datos de Hermes que se sincronizan entre dispositivos (faltas, límite elegido, plantillas y
 * estilo de escritura). Sin dependencias de React Native.
 *
 * Todo se guarda como un registro plano «clave → { v, t }»: `v` es el valor (null = borrado) y
 * `t` la hora del cambio. Al juntar dos registros, en cada clave gana el cambio más reciente.
 * Así marcar faltas en el móvil y en la web a la vez no se pisa.
 */
import type { Marcas, Marca } from './faltas';
import type { PlantillaIA, PlantillasIA, EstiloIA } from './ia/plantillas-datos';

export type Entrada = { v: unknown; t: number };
export type Registro = Record<string, Entrada>;
export type Remoto = { v: 1; reg: Registro };

/** Lo que Hermes tiene guardado en el dispositivo, tal cual. */
export type Local = {
  marcas: Marcas;
  /** null = nunca se ha elegido */
  limite: number | null;
  plantillas: PlantillasIA;
};

export const claveMarca = (fecha: string, franja: number | string) => `marca:${fecha}:${franja}`;
export const clavePlantilla = (id: string) => `plantilla:${id}`;
export const CLAVE_LIMITE = 'limite';
export const CLAVE_DEFECTO = 'defecto';
export const CLAVE_ESTILO = 'estilo';
export const CLAVE_USAR_ESTILO = 'usarEstilo';

/** Los cambios más antiguos que cualquier cambio real: lo que ya había antes de sincronizar. */
export const T_INICIAL = 1;

/** Junta dos registros: en cada clave gana el cambio más reciente (a igualdad, el de `a`). */
export function mezclar(a: Registro, b: Registro): Registro {
  const salida: Registro = { ...a };
  for (const [k, e] of Object.entries(b)) {
    const mio = salida[k];
    if (!mio || e.t > mio.t) salida[k] = e;
  }
  return salida;
}

/** ¿Hay algo en `a` que `b` no tenga (o que `b` tenga más antiguo)? */
export function aportaA(a: Registro, b: Registro): boolean {
  return Object.entries(a).some(([k, e]) => !b[k] || e.t > b[k].t);
}

const igualesJSON = (x: unknown, y: unknown) => JSON.stringify(x) === JSON.stringify(y);

/**
 * Mete en el registro lo que ya había en el dispositivo y todavía no está anotado
 * (con fecha muy antigua, para que cualquier cambio real de otro dispositivo gane).
 */
export function adoptar(reg: Registro, local: Local): Registro {
  const salida: Registro = { ...reg };
  const poner = (k: string, v: unknown) => {
    if (!(k in salida)) salida[k] = { v, t: T_INICIAL };
  };
  for (const [fecha, dia] of Object.entries(local.marcas))
    for (const [franja, m] of Object.entries(dia)) poner(claveMarca(fecha, franja), m);
  if (local.limite !== null) poner(CLAVE_LIMITE, local.limite);
  const p = local.plantillas;
  for (const pl of p.plantillas)
    poner(clavePlantilla(pl.id), {
      nombre: pl.nombre,
      archivo: pl.archivo,
      texto: pl.texto,
      creada: pl.creada,
    });
  if (p.defecto !== null) poner(CLAVE_DEFECTO, p.defecto);
  if (p.estilo) poner(CLAVE_ESTILO, p.estilo);
  if (p.usarEstilo === false) poner(CLAVE_USAR_ESTILO, false);
  return salida;
}

/** Lo que debe quedar en el dispositivo según el registro. */
export function aplicar(reg: Registro, local: Local): Local {
  const marcas: Marcas = {};
  const plantillas: PlantillaIA[] = [];
  for (const [k, e] of Object.entries(reg)) {
    if (e.v === null || e.v === undefined) continue;
    if (k.startsWith('marca:')) {
      const [, fecha, franja] = k.split(':');
      if (e.v === 'f' || e.v === 's') (marcas[fecha] ??= {})[franja] = e.v as Marca;
    } else if (k.startsWith('plantilla:')) {
      const id = k.slice('plantilla:'.length);
      const v = e.v as Omit<PlantillaIA, 'id'>;
      if (v && typeof v.texto === 'string')
        plantillas.push({
          id,
          nombre: v.nombre,
          archivo: v.archivo,
          texto: v.texto,
          creada: v.creada ?? 0,
        });
    }
  }
  plantillas.sort((x, y) => x.creada - y.creada);

  const tiene = (k: string) => k in reg;
  const defectoReg = tiene(CLAVE_DEFECTO)
    ? (reg[CLAVE_DEFECTO].v as string | null)
    : local.plantillas.defecto;
  const defecto = defectoReg && plantillas.some((p) => p.id === defectoReg) ? defectoReg : null;
  const limite =
    tiene(CLAVE_LIMITE) && typeof reg[CLAVE_LIMITE].v === 'number'
      ? (reg[CLAVE_LIMITE].v as number)
      : local.limite;
  const estilo: EstiloIA | null = tiene(CLAVE_ESTILO)
    ? ((reg[CLAVE_ESTILO].v as EstiloIA | null) ?? null)
    : local.plantillas.estilo;
  const usarEstilo = tiene(CLAVE_USAR_ESTILO)
    ? reg[CLAVE_USAR_ESTILO].v !== false
    : local.plantillas.usarEstilo;
  return { marcas, limite, plantillas: { plantillas, defecto, estilo, usarEstilo } };
}

/** ¿Es lo mismo? (para no reescribir el dispositivo si no hay cambios) */
export const mismoLocal = (a: Local, b: Local) => igualesJSON(a, b);

export function leerRemotoJSON(texto: string): Registro | null {
  try {
    const d = JSON.parse(texto) as Partial<Remoto>;
    return d && d.v === 1 && d.reg && typeof d.reg === 'object' ? d.reg : null;
  } catch {
    return null;
  }
}

export const aTexto = (reg: Registro) => JSON.stringify({ v: 1, reg } satisfies Remoto);
