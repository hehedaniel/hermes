import type { Snapshot } from './data';
import type { BaseNovedades } from './novedades';

/**
 * Quita de la foto un archivo de una asignatura y adelanta un día la fecha de una entrega
 * pendiente. Así la próxima sincronización ve "Apuntes nuevos" y "Cambio de fecha".
 * Función pura, para poder probarla.
 */
export function simularEnBase(base: BaseNovedades, snap: Snapshot | null) {
  const nueva: BaseNovedades = {
    cursos: Object.fromEntries(
      Object.entries(base.cursos).map(([id, c]) => [id, { ...c, archivos: { ...c.archivos } }]),
    ),
    entregas: { ...base.entregas },
  };
  const hechos: string[] = [];

  const conArchivos = Object.values(nueva.cursos).find((c) => Object.keys(c.archivos).length);
  if (conArchivos) {
    delete conArchivos.archivos[Object.keys(conArchivos.archivos)[0]];
    hechos.push('un archivo nuevo');
  }

  const pendiente = snap?.entregas.find(
    (e) =>
      (e.estado === 'pendiente' || e.estado === 'borrador') && e.fecha && nueva.entregas[e.key],
  );
  if (pendiente) {
    nueva.entregas[pendiente.key] = {
      ...nueva.entregas[pendiente.key],
      fecha: pendiente.fecha - 86400,
    };
    hechos.push(`un cambio de fecha en «${pendiente.nombre}»`);
  }
  return { base: nueva, hechos };
}
