/**
 * «Qué hay de nuevo»: lo más importante de cada versión, en pocas líneas, para enseñarlo una vez
 * después de actualizar. Sin dependencias de React Native. Las más nuevas, primero.
 * (Los cambios completos están en CHANGELOG.md.)
 */
import { versionIsNewer } from './app-update';

export type NovedadVersion = { version: string; titulo: string; puntos: string[] };

export const NOVEDADES_APP: NovedadVersion[] = [
  {
    version: '2.5.1',
    titulo: 'Novedades al actualizar',
    puntos: [
      'Esta pantalla: después de actualizar te cuenta lo nuevo, y la puedes volver a ver en Ajustes.',
      'El 29 de octubre, sin clase por la jornada de FIWARE.',
    ],
  },
  {
    version: '2.5.0',
    titulo: 'Horario compartido',
    puntos: [
      'El horario y los días sin clase se actualizan solos para todos, sin instalar una versión nueva.',
      'Faltas: botón para borrar todas tus marcas.',
      'El calendario ya no retrocede más allá de septiembre.',
    ],
  },
  {
    version: '2.4.0',
    titulo: 'Tus datos, en todos tus dispositivos',
    puntos: [
      'Faltas, plantillas y estilo de escritura se sincronizan entre móvil y web con tu Moodle.',
      'Plantillas Word: la IA escribe el contenido y se rellena tu propio documento, con su formato.',
      'Corregida la subida de archivos desde el móvil.',
    ],
  },
  {
    version: '2.3.0',
    titulo: 'Calculadora de faltas',
    puntos: [
      'Cuántas horas has faltado y cuántas te quedan en cada módulo, por trimestre o curso completo.',
      'Marca cada hora como asistida, faltada o sin clase.',
    ],
  },
  {
    version: '2.2.0',
    titulo: 'Plantillas y buscador',
    puntos: [
      'Sube tu plantilla de entrega y un texto tuyo para que la IA siga el formato y escriba como tú.',
      'Buscador de archivos y tareas, y nota aproximada cuando el profesor no pone el peso.',
    ],
  },
];

const MAX_VERSIONES = 3;

/**
 * Qué enseñar al abrir la app. `vista` es la última versión cuyas novedades se vieron (null si nunca):
 * en ese caso solo se enseñan las de la versión instalada.
 */
export function novedadesPendientes(vista: string | null, actual: string): NovedadVersion[] {
  if (!vista) return NOVEDADES_APP.filter((n) => n.version === actual);
  return NOVEDADES_APP.filter(
    (n) => versionIsNewer(n.version, vista) && !versionIsNewer(n.version, actual),
  ).slice(0, MAX_VERSIONES);
}

/** Las de la versión instalada (para volver a verlas desde Ajustes). */
export const novedadesDe = (actual: string) => NOVEDADES_APP.filter((n) => n.version === actual);
