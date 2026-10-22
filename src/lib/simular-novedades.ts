import type { Snapshot } from './data';
import type { BaseNovedades } from './novedades';

/**
 * Quita de la foto un archivo de una asignatura y adelanta un día la fecha de una entrega
 * pendiente, elegidos al azar. Así la próxima sincronización ve "Apuntes nuevos" y
 * "Cambio de fecha". Devuelve también qué novedades hay que olvidar (si ya estaban en la
 * lista de una prueba anterior, Hermes no avisaría otra vez). Función pura.
 */
export function simularEnBase(
  base: BaseNovedades,
  snap: Snapshot | null,
  azar: () => number = Math.random,
) {
  const nueva: BaseNovedades = {
    cursos: Object.fromEntries(
      Object.entries(base.cursos).map(([id, c]) => [id, { ...c, archivos: { ...c.archivos } }]),
    ),
    entregas: { ...base.entregas },
  };
  const hechos: string[] = [];
  const olvidar: string[] = []; // prefijos de id de novedad

  const elegir = <T>(lista: T[]) => lista[Math.floor(azar() * lista.length)];

  const archivos = Object.values(nueva.cursos).flatMap((c) =>
    Object.keys(c.archivos).map((k) => ({ c, k })),
  );
  if (archivos.length) {
    const { c, k } = elegir(archivos);
    delete c.archivos[k];
    olvidar.push(`archivo:${k}:`);
    hechos.push(`un archivo nuevo (${decodeURIComponent(k.split('/').pop() ?? k)})`);
  }

  const pendientes = (snap?.entregas ?? []).filter(
    (e) =>
      (e.estado === 'pendiente' || e.estado === 'borrador') && e.fecha && nueva.entregas[e.key],
  );
  if (pendientes.length) {
    const e = elegir(pendientes);
    nueva.entregas[e.key] = { ...nueva.entregas[e.key], fecha: e.fecha - 86400 };
    olvidar.push(`fecha:${e.key}:`);
    hechos.push(`un cambio de fecha en «${e.nombre}»`);
  }
  return { base: nueva, hechos, olvidar };
}
