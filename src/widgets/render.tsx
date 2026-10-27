'use no memo';

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';

import { TEMAS, type TemaId } from '@/constants/colors';
import { MODO_COLOR_PREFERENCIA_KEY, TEMA_PREFERENCIA_KEY } from '@/constants/theme';
import type { ModoColor } from '@/hooks/use-theme';
import type { Snapshot } from '@/lib/data';

import { ClasesWidget } from './clases-widget';
import { CLAVE_SNAPSHOT, datosClases, datosEntregas } from './datos';
import { EntregasWidget } from './entregas-widget';
import { PALETAS, paletasDeTema, type PaletasWidget } from './paleta';

/** Nombres con los que están declarados en app.json (plugin react-native-android-widget). */
export const WIDGETS = { entregas: 'Entregas', clases: 'Clases' } as const;

export async function leerSnapshot(): Promise<Snapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(CLAVE_SNAPSHOT);
    return raw ? (JSON.parse(raw) as Snapshot) : null;
  } catch {
    return null;
  }
}

export async function leerPaletasWidget(): Promise<PaletasWidget> {
  const [temaGuardado, modoGuardado] = await Promise.all([
    AsyncStorage.getItem(TEMA_PREFERENCIA_KEY),
    AsyncStorage.getItem(MODO_COLOR_PREFERENCIA_KEY),
  ]);
  const tema: TemaId =
    temaGuardado && Object.prototype.hasOwnProperty.call(TEMAS, temaGuardado)
      ? (temaGuardado as TemaId)
      : 'anden';
  const modo: ModoColor =
    modoGuardado === 'claro' || modoGuardado === 'oscuro' ? modoGuardado : 'sistema';
  if (temaGuardado && tema === 'anden' && temaGuardado !== 'anden')
    console.error(`Tema guardado desconocido al dibujar el widget: ${temaGuardado}`);
  if (modoGuardado && modoGuardado !== 'sistema' && modoGuardado !== 'claro' && modoGuardado !== 'oscuro')
    console.error(`Modo de color desconocido al dibujar el widget: ${modoGuardado}`);
  return tema === 'anden' && modo === 'sistema' ? PALETAS : paletasDeTema(tema, modo);
}

/** Tamaño del widget en dp (lo da Android al dibujarlo). */
export type Tamano = { ancho: number; alto: number };

/** Dibuja un widget por su nombre con los datos guardados. */
export function dibujar(
  nombre: string,
  snapshot: Snapshot | null,
  { alto }: Tamano,
  paletas: PaletasWidget = PALETAS,
) {
  if (nombre === WIDGETS.clases) {
    return ClasesWidget({
      datos: datosClases(snapshot),
      alto,
      enlace: Linking.createURL('/calendario'),
      paletas,
    });
  }
  return EntregasWidget({
    datos: datosEntregas(snapshot),
    alto,
    enlace: (key) => Linking.createURL(`/tarea/${encodeURIComponent(key)}`),
    paletas,
  });
}
