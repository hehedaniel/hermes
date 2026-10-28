/** Plantillas de entrega y muestra de estilo del alumno: tipos y utilidades sin dependencias. */

export type PlantillaIA = {
  id: string;
  nombre: string;
  /** Archivo del que salió el texto (si se subió uno) */
  archivo?: string;
  /** Texto de la plantilla: portada, apartados, formato… */
  texto: string;
  creada: number;
};

export type EstiloIA = {
  archivo?: string;
  /** Un texto escrito por el alumno, del que la IA copia el estilo de escritura */
  texto: string;
};

export type PlantillasIA = {
  plantillas: PlantillaIA[];
  /** Plantilla que se usa en todas las tareas salvo que se cambie en una */
  defecto: string | null;
  estilo: EstiloIA | null;
  /** ¿Se aplica el estilo en las tareas? */
  usarEstilo: boolean;
};

export const PLANTILLAS_POR_DEFECTO: PlantillasIA = {
  plantillas: [],
  defecto: null,
  estilo: null,
  usarEstilo: true,
};

/** Lo que cabe en el mensaje de sistema sin comerse el espacio de los archivos de la tarea. */
export const MAX_PLANTILLA = 15000;
export const MAX_ESTILO = 10000;

export function recortar(texto: string, max: number) {
  const t = texto.trim();
  if (t.length <= max) return { texto: t, recortado: false };
  return { texto: t.slice(0, max).trimEnd(), recortado: true };
}

/** Lo que se pasa a la IA en cada tarea: la plantilla y el estilo ya elegidos. */
export type ExtrasIA = {
  plantilla?: { nombre: string; texto: string } | null;
  estilo?: { texto: string } | null;
};

/** La plantilla de una tarea: la elegida en ella o, si no se tocó, la de por defecto. */
export function plantillaActiva(
  datos: PlantillasIA,
  elegida?: string | null,
): PlantillaIA | undefined {
  const id = elegida === undefined ? datos.defecto : elegida;
  return id ? datos.plantillas.find((p) => p.id === id) : undefined;
}

export function extrasDe(
  datos: PlantillasIA,
  opciones: { plantillaId?: string | null; usarEstilo?: boolean } = {},
): ExtrasIA {
  const p = plantillaActiva(datos, opciones.plantillaId);
  const usar = opciones.usarEstilo ?? datos.usarEstilo;
  return {
    plantilla: p ? { nombre: p.nombre, texto: p.texto } : null,
    estilo: usar && datos.estilo?.texto.trim() ? { texto: datos.estilo.texto } : null,
  };
}
