/**
 * Tarea de mentira para probar la IA y la entrega cuando no hay ninguna tarea abierta.
 * Solo aparece en desarrollo (Hermes Dev con el servidor de Expo): la app normal no la ve.
 * Al "entregarla" el archivo se sube de verdad a tu zona de borradores de Moodle (así se
 * prueba la subida), pero no se guarda en ninguna tarea.
 */
import type { Entrega, Snapshot } from './data';

export const TAREA_PRUEBA_KEY = 'prueba-ia';

export function tareaDePrueba(snap: Snapshot, ahora = Date.now()): Entrega {
  // Como adjuntos, PDF reales de otras tareas: así se prueba también leerlos y pasárselos a la IA
  const pdfs = snap.entregas
    .flatMap((e) => e.adjuntos ?? [])
    .filter((a) => a.mimetype === 'application/pdf' || /\.pdf$/i.test(a.nombre))
    .slice(0, 2);
  const curso = snap.courses[0];
  return {
    key: TAREA_PRUEBA_KEY,
    nombre: '🧪 Tarea de prueba (solo en Hermes Dev)',
    cursoId: curso?.id ?? 0,
    curso: curso?.fullname ?? 'Pruebas',
    fecha: Math.floor(ahora / 1000) + 3 * 86400,
    tipo: 'assign',
    estado: 'pendiente',
    enunciado:
      '<p>Redacta un informe de unas dos páginas sobre los tipos de aprendizaje automático: <b>supervisado</b>, <b>no supervisado</b> y <b>por refuerzo</b>.</p>' +
      '<ul><li>Explica cada uno con un ejemplo real.</li><li>Incluye una tabla comparativa.</li><li>Termina con una conclusión personal.</li></ul>' +
      '<p>Entrega un único archivo PDF.</p>',
    adjuntos: pdfs.length ? pdfs : undefined,
    entregable: {
      assignId: 0,
      archivos: true,
      texto: false,
      maxArchivos: 1,
      tipos: ['.pdf'],
      maxBytes: 0,
      borradores: false,
      declaracion: false,
      prueba: true,
    },
  };
}

/** El snapshot con la tarea de prueba al principio de la lista (una sola vez). */
export function conTareaDePrueba(snap: Snapshot, ahora = Date.now()): Snapshot {
  if (snap.entregas.some((e) => e.key === TAREA_PRUEBA_KEY)) return snap;
  return { ...snap, entregas: [tareaDePrueba(snap, ahora), ...snap.entregas] };
}
