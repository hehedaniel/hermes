import AsyncStorage from '@react-native-async-storage/async-storage';

import { CLAVES } from '../claves';
import type { Archivo } from '../data';

/** Un mensaje de la conversación con la IA de una tarea, tal como se guarda en el móvil. */
export type MensajeChat = {
  id: string;
  rol: 'usuario' | 'ia' | 'error';
  texto: string;
  fecha: number; // ms
  /** Archivos de la tarea que se adjuntaron (se guardan solo las referencias, no el contenido) */
  adjuntos?: Archivo[];
  /** Con qué modelo se generó (respuestas de la IA) */
  modelo?: string;
};

export const nuevoId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export async function leerChat(key: string): Promise<MensajeChat[]> {
  try {
    const raw = await AsyncStorage.getItem(CLAVES.iaChat(key));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export const guardarChat = (key: string, mensajes: MensajeChat[]) =>
  mensajes.length
    ? AsyncStorage.setItem(CLAVES.iaChat(key), JSON.stringify(mensajes))
    : AsyncStorage.removeItem(CLAVES.iaChat(key));

/** Tareas que tienen conversación guardada (para el botón "Seguir con la IA"). */
export async function hayChat(key: string) {
  return !!(await AsyncStorage.getItem(CLAVES.iaChat(key)).catch(() => null));
}
