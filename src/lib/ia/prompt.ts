import type { Entrega } from '../data';
import { htmlATexto } from '../html-texto';
import { FORMATO_DOCUMENTOS } from './documentos';

const fecha = (ts?: number) =>
  ts
    ? new Date(ts * 1000).toLocaleString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Madrid',
      })
    : undefined;

/** Instrucciones de sistema: quién es la IA, la tarea con su enunciado y cómo devolver documentos. */
export function construirSistema(e: Entrega, instruccionesUsuario?: string) {
  const enunciado = htmlATexto(e.enunciado);
  const cfg = e.entregable;
  const comoSeEntrega = !cfg
    ? undefined
    : [
        cfg.archivos
          ? `se entrega subiendo ${cfg.maxArchivos > 1 ? `hasta ${cfg.maxArchivos} archivos` : 'un archivo'}${
              cfg.tipos.length ? ` (tipos admitidos: ${cfg.tipos.join(', ')})` : ''
            }`
          : null,
        cfg.texto ? 'admite texto en línea escrito en Moodle' : null,
      ]
        .filter(Boolean)
        .join(' y ');

  return [
    'Eres el asistente de estudio de un alumno de Formación Profesional en España. Le ayudas con las tareas de su Moodle: le explicas lo que piden, resuelves dudas y, si te lo pide, le preparas el trabajo listo para entregar.',
    'Responde siempre en español de España, con un nivel adecuado a FP. Sé claro y ve al grano.',
    '',
    '## La tarea',
    `- Nombre: ${e.nombre}`,
    `- Asignatura: ${e.curso}`,
    e.fecha ? `- Fecha de entrega: ${fecha(e.fecha)}` : null,
    comoSeEntrega ? `- Cómo se entrega: ${comoSeEntrega}` : null,
    e.adjuntos?.length
      ? `- Archivos de la tarea: ${e.adjuntos.map((a) => a.nombre).join(', ')} (el alumno te los adjunta cuando hacen falta)`
      : null,
    '',
    enunciado
      ? `### Enunciado\n${enunciado}`
      : 'La tarea no tiene enunciado escrito en Moodle; puede estar en los archivos adjuntos.',
    '',
    '## Documentos',
    FORMATO_DOCUMENTOS,
    cfg?.archivos && cfg.tipos.length && !cfg.tipos.some((t) => /pdf/i.test(t))
      ? `Ojo: esta tarea no admite PDF (${cfg.tipos.join(', ')}). Genera el archivo en uno de los tipos admitidos que puedas escribir como texto, o avisa al alumno.`
      : null,
    instruccionesUsuario?.trim()
      ? `\n## Indicaciones del alumno para todas sus tareas\n${instruccionesUsuario.trim()}`
      : null,
  ]
    .filter((l) => l !== null)
    .join('\n');
}
