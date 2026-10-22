/** En la web no hay notificaciones: misma interfaz que avisos.ts, sin hacer nada. */
import { AVISOS_POR_DEFECTO, type PreferenciasAvisos } from './avisos-texto';
import type { Snapshot } from './data';
import type { Novedad } from './novedades';

export { AVISOS_POR_DEFECTO, type PreferenciasAvisos } from './avisos-texto';
export const AVISOS_DISPONIBLES = false;

export async function configurarCanales() {}
export async function leerPreferencias(): Promise<PreferenciasAvisos> {
  return AVISOS_POR_DEFECTO;
}
export async function guardarPreferencias(_p: PreferenciasAvisos) {}
export async function permisoConcedido() {
  return false;
}
export async function pedirPermiso() {
  return false;
}
export async function prepararAvisos() {}
export async function avisarNovedades(_nuevas: Novedad[]) {}
export async function programarRecordatorios(_snap: Snapshot | null) {}
export async function avisoDePrueba() {
  return false;
}
