import type { Entrega } from '../data';
import { htmlATexto } from '../html-texto';
import { FORMATO_DOCUMENTOS } from './documentos';
import { type ExtrasIA, MAX_ESTILO, MAX_PLANTILLA, recortar } from './plantillas-datos';

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
export function construirSistema(e: Entrega, instruccionesUsuario?: string, extras?: ExtrasIA) {
  const plantilla = extras?.plantilla?.texto.trim()
    ? recortar(extras.plantilla.texto, MAX_PLANTILLA)
    : null;
  const estilo = extras?.estilo?.texto.trim() ? recortar(extras.estilo.texto, MAX_ESTILO) : null;
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
    plantilla
      ? [
          '',
          '## Plantilla del trabajo',
          `El alumno ha elegido la plantilla «${extras!.plantilla!.nombre}». Cuando le prepares el documento, síguela: mismos apartados, mismo orden, mismos títulos, la misma portada y el mismo formato. Sustituye el contenido de ejemplo por el de esta tarea y no añadas apartados que no estén en la plantilla, salvo que el enunciado los pida. Si la plantilla y el enunciado se contradicen, avisa al alumno.`,
          plantilla.recortado
            ? '(La plantilla es muy larga y aquí aparece recortada: pídele al alumno el resto si lo necesitas.)'
            : null,
          '<plantilla>',
          plantilla.texto,
          '</plantilla>',
        ]
          .filter((l) => l !== null)
          .join('\n')
      : null,
    estilo
      ? [
          '',
          '## Estilo de escritura del alumno',
          'Debajo hay un texto escrito por el propio alumno. Escribe los textos de sus entregas con su estilo: el mismo tono, la longitud de sus frases y párrafos, su vocabulario y su nivel de formalidad. No copies frases suyas ni repitas su contenido, y no imites sus faltas de ortografía.',
          '<muestra-de-estilo>',
          estilo.texto,
          '</muestra-de-estilo>',
        ].join('\n')
      : null,
    instruccionesUsuario?.trim()
      ? `\n## Indicaciones del alumno para todas sus tareas\n${instruccionesUsuario.trim()}`
      : null,
  ]
    .filter((l) => l !== null)
    .join('\n');
}
