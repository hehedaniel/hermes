import type { File } from 'expo-file-system';

import type { TipoVisor } from './open-file';

/**
 * Archivo que tiene que mostrar la pantalla del visor. Se pasa así, y no por los parámetros
 * de la ruta, porque la URI de un archivo con espacios se estropea al ir y volver por la URL.
 */
export type VisorActual = {
  file: File;
  nombre: string;
  tipo: Exclude<TipoVisor, null>;
  mime: string;
};

let actual: VisorActual | null = null;

export const setVisorActual = (v: VisorActual) => {
  actual = v;
};
export const getVisorActual = () => actual;
