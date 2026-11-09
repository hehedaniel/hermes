'use no memo'; // lee datos globales que cambian: el React Compiler no debe memorizarlos

/** El horario compartido en la app: se actualiza solo y avisa a las pantallas cuando cambia. */
import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { NOMBRE_GRUPO, SIN_GRUPO, suscribirHorario, versionHorario } from './horario';
import { cargarHorarioGuardado, estadoGrupo, sincronizarHorario } from './horario-remoto';
import { useMoodle } from './store';

const CADA_MS = 10 * 60_000;

/** Para que una pantalla se redibuje cuando llega un horario nuevo. Devuelve su número de versión. */
export const useHorario = () =>
  useSyncExternalStore(suscribirHorario, versionHorario, versionHorario);

/** El grupo de clase: el elegido, los que hay y cuál está aplicado ahora. */
export function useGrupoHorario() {
  useHorario();
  return { ...estadoGrupo(), nombre: NOMBRE_GRUPO, sinGrupo: SIN_GRUPO };
}

/** Nombres de las asignaturas del alumno en Moodle (sin el «Punto de encuentro»). */
export function useNombresCursos() {
  const { snapshot } = useMoodle();
  return useMemo(
    () =>
      (snapshot?.courses ?? [])
        .map((c) => c.fullname)
        .filter((n) => !/punto de encuentro/i.test(n)),
    [snapshot?.courses],
  );
}

/** Sin pantalla: carga el horario guardado, descarga el publicado y repite al volver a la app. */
export function HorarioRemoto() {
  const cursos = useNombresCursos();
  const cursosRef = useRef(cursos);
  const ultima = useRef(0);
  useEffect(() => {
    cursosRef.current = cursos;
  });

  const actualizar = useCallback((forzar = false) => {
    if (!forzar && Date.now() - ultima.current < CADA_MS) return;
    ultima.current = Date.now();
    void sincronizarHorario(cursosRef.current);
  }, []);

  useEffect(() => {
    void cargarHorarioGuardado().then(() => actualizar());
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') actualizar();
    });
    return () => sub.remove();
  }, [actualizar]);

  // Cuando llegan o cambian las asignaturas, se vuelve a decidir el grupo
  const clave = cursos.join('|');
  useEffect(() => {
    if (clave) actualizar(true);
  }, [clave, actualizar]);
  return null;
}
