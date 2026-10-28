/**
 * expo-notifications cargado con tolerancia: si el cliente de desarrollo instalado es más antiguo
 * que las dependencias y le falta algún módulo nativo, la app arranca igualmente, sin avisos.
 */
import type * as Tipos from 'expo-notifications';

export type ModuloNotificaciones = typeof Tipos;

function cargar(): ModuloNotificaciones | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-notifications') as ModuloNotificaciones;
  } catch {
    return null;
  }
}

export const Notifications = cargar();
