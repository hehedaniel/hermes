/** El horario compartido en la app: se actualiza solo y avisa a las pantallas cuando cambia. */
import { useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { suscribirHorario, versionHorario } from './horario';
import { cargarHorarioGuardado, descargarHorario } from './horario-remoto';

const CADA_MS = 10 * 60_000;

/** Para que una pantalla se redibuje cuando llega un horario nuevo. Devuelve su número de versión. */
export const useHorario = () =>
  useSyncExternalStore(suscribirHorario, versionHorario, versionHorario);

/** Sin pantalla: carga el horario guardado, descarga el publicado y repite al volver a la app. */
export function HorarioRemoto() {
  useEffect(() => {
    let ultima = 0;
    const actualizar = () => {
      if (Date.now() - ultima < CADA_MS) return;
      ultima = Date.now();
      void descargarHorario();
    };
    void cargarHorarioGuardado().then(actualizar);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') actualizar();
    });
    return () => sub.remove();
  }, []);
  return null;
}
