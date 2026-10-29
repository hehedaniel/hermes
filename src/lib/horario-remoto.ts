/**
 * Horario compartido: se descarga de la web de Hermes (public/horario.json, publicado con GitHub
 * Pages) para que un cambio de horario o un día sin clase les llegue a todos sin actualizar la app.
 * Se guarda la última copia buena para usarla sin conexión; si el archivo está mal, no se toca nada.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { aplicarHorario } from './horario';

export const URL_HORARIO =
  process.env.EXPO_PUBLIC_HORARIO_URL ?? 'https://hehedaniel.github.io/hermes/horario.json';
const CLAVE = 'horario_remoto_v1';
const TIEMPO_MS = 15_000;

function aplicarTexto(texto: string): boolean {
  try {
    return aplicarHorario(JSON.parse(texto)) === null;
  } catch {
    return false;
  }
}

/** Aplica la última copia descargada (sirve sin conexión). */
export async function cargarHorarioGuardado(): Promise<boolean> {
  const guardado = await AsyncStorage.getItem(CLAVE).catch(() => null);
  return guardado ? aplicarTexto(guardado) : false;
}

/** Descarga el horario publicado. «nuevo» si cambió algo; «igual» o «error» si no. */
export async function descargarHorario(): Promise<'nuevo' | 'igual' | 'error'> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIEMPO_MS);
  try {
    // El parámetro cambia cada 5 minutos para no quedarse con una copia vieja de la caché
    const url = `${URL_HORARIO}?v=${Math.floor(Date.now() / 300_000)}`;
    const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
    if (!res.ok) return 'error';
    const texto = await res.text();
    const anterior = await AsyncStorage.getItem(CLAVE).catch(() => null);
    if (anterior === texto) return 'igual';
    if (!aplicarTexto(texto)) return 'error';
    await AsyncStorage.setItem(CLAVE, texto).catch(() => {});
    return 'nuevo';
  } catch {
    return 'error';
  } finally {
    clearTimeout(timer);
  }
}
