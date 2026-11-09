/**
 * Horario compartido: se descarga de la web de Hermes (public/horario.json y public/horarios/*,
 * publicados con GitHub Pages) para que un cambio de horario o un día sin clase les llegue a todos
 * sin actualizar la app. Cada grupo de clase tiene su archivo; el índice (public/horarios.json) los
 * lista y Hermes elige el del alumno por sus asignaturas, o el que él haya elegido en Ajustes.
 * Se guarda la última copia buena para usarla sin conexión; si un archivo está mal, no se toca nada.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  detectarGrupo,
  type GrupoInfo,
  ID_GRUPO_INCLUIDO,
  indiceIncluido,
  type IndiceGrupos,
  validarIndice,
} from './grupos';
import { aplicarHorario, aplicarSinGrupo, notificarHorario } from './horario';

export const URL_HORARIO =
  process.env.EXPO_PUBLIC_HORARIO_URL ?? 'https://hehedaniel.github.io/hermes/horario.json';
const BASE = URL_HORARIO.replace(/[^/]*$/, '');
export const URL_INDICE = `${BASE}horarios.json`;

/** «auto» (por las asignaturas) o el id del grupo que el alumno ha elegido */
const CLAVE_ELEGIDO = 'horario_grupo_v1';
/** El grupo que está aplicado ahora ('' = ninguno) */
const CLAVE_ACTIVO = 'horario_grupo_activo_v1';
const CLAVE_INDICE = 'horario_indice_v1';
/** El grupo de IA y Big Data conserva su clave de siempre, para no perder la copia guardada */
const claveGrupo = (id: string) =>
  id === ID_GRUPO_INCLUIDO ? 'horario_remoto_v1' : `horario_remoto_v2:${id}`;
const TIEMPO_MS = 15_000;

export type EstadoGrupo = { elegido: string; grupos: GrupoInfo[] };
let estado: EstadoGrupo = { elegido: 'auto', grupos: indiceIncluido().grupos };
export const estadoGrupo = () => estado;

function aplicarTexto(texto: string): boolean {
  try {
    return aplicarHorario(JSON.parse(texto)) === null;
  } catch {
    return false;
  }
}

async function descargarTexto(url: string): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIEMPO_MS);
  try {
    // El parámetro cambia cada 5 minutos para no quedarse con una copia vieja de la caché
    const res = await fetch(`${url}?v=${Math.floor(Date.now() / 300_000)}`, {
      signal: ctrl.signal,
      cache: 'no-store',
    });
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function cargarIndice(): Promise<IndiceGrupos> {
  const texto = await descargarTexto(URL_INDICE);
  if (texto) {
    try {
      const d: unknown = JSON.parse(texto);
      if (validarIndice(d) === null) {
        await AsyncStorage.setItem(CLAVE_INDICE, texto).catch(() => {});
        return d as IndiceGrupos;
      }
    } catch {
      // se usa la copia guardada
    }
  }
  const guardado = await AsyncStorage.getItem(CLAVE_INDICE).catch(() => null);
  if (guardado) {
    try {
      const d: unknown = JSON.parse(guardado);
      if (validarIndice(d) === null) return d as IndiceGrupos;
    } catch {
      // se usa el de serie
    }
  }
  return indiceIncluido();
}

/** Aplica la última copia descargada del grupo activo (sirve sin conexión). */
export async function cargarHorarioGuardado(): Promise<boolean> {
  const elegido = await AsyncStorage.getItem(CLAVE_ELEGIDO).catch(() => null);
  if (elegido) estado = { ...estado, elegido };
  const activo = await AsyncStorage.getItem(CLAVE_ACTIVO).catch(() => null);
  if (activo === '') {
    aplicarSinGrupo();
    return true;
  }
  const guardado = await AsyncStorage.getItem(claveGrupo(activo ?? ID_GRUPO_INCLUIDO)).catch(
    () => null,
  );
  return guardado ? aplicarTexto(guardado) : false;
}

/**
 * Pone el horario del grupo del alumno: el que eligió o, en automático, el que encaja con sus
 * asignaturas. «nuevo» si cambió algo; «igual» o «error» si no.
 */
export async function sincronizarHorario(cursos: string[]): Promise<'nuevo' | 'igual' | 'error'> {
  const indice = await cargarIndice();
  const elegido = (await AsyncStorage.getItem(CLAVE_ELEGIDO).catch(() => null)) ?? 'auto';
  estado = { elegido, grupos: indice.grupos };
  notificarHorario();

  let id: string | null;
  if (elegido !== 'auto') id = indice.grupos.some((g) => g.id === elegido) ? elegido : null;
  else if (!cursos.length)
    return 'igual'; // aún no se sabe qué asignaturas tiene
  else id = detectarGrupo(indice, cursos);

  const activo = await AsyncStorage.getItem(CLAVE_ACTIVO).catch(() => null);
  if (id === null) {
    if (activo === '') return 'igual';
    await AsyncStorage.setItem(CLAVE_ACTIVO, '').catch(() => {});
    aplicarSinGrupo();
    return 'nuevo';
  }
  const grupo = indice.grupos.find((g) => g.id === id) as GrupoInfo;
  const anterior = await AsyncStorage.getItem(claveGrupo(id)).catch(() => null);
  const texto = await descargarTexto(BASE + grupo.archivo);
  if (texto === null) {
    // Sin conexión: si el grupo cambió, se usa la copia guardada
    if (activo !== id && anterior && aplicarTexto(anterior)) {
      await AsyncStorage.setItem(CLAVE_ACTIVO, id).catch(() => {});
      return 'nuevo';
    }
    return 'error';
  }
  if (anterior === texto && activo === id) return 'igual';
  if (!aplicarTexto(texto)) return 'error';
  await AsyncStorage.setItem(claveGrupo(id), texto).catch(() => {});
  await AsyncStorage.setItem(CLAVE_ACTIVO, id).catch(() => {});
  return 'nuevo';
}

/** El alumno elige su grupo en Ajustes («auto» para que Hermes lo reconozca solo). */
export async function elegirGrupo(id: string, cursos: string[]) {
  await AsyncStorage.setItem(CLAVE_ELEGIDO, id).catch(() => {});
  estado = { ...estado, elegido: id };
  notificarHorario();
  await sincronizarHorario(cursos);
}
