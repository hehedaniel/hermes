'use no memo';

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';

import type { Snapshot } from '@/lib/data';

import { ClasesWidget } from './clases-widget';
import { CLAVE_SNAPSHOT, datosClases, datosEntregas } from './datos';
import { EntregasWidget } from './entregas-widget';

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

/** Tamaño del widget en dp (lo da Android al dibujarlo). */
export type Tamano = { ancho: number; alto: number };

/** Dibuja un widget por su nombre con los datos guardados. */
export function dibujar(nombre: string, snapshot: Snapshot | null, { alto }: Tamano) {
  if (nombre === WIDGETS.clases) {
    return ClasesWidget({
      datos: datosClases(snapshot),
      alto,
      enlace: Linking.createURL('/calendario'),
    });
  }
  return EntregasWidget({
    datos: datosEntregas(snapshot),
    alto,
    enlace: (key) => Linking.createURL(`/tarea/${encodeURIComponent(key)}`),
  });
}
