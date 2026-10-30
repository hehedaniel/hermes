/**
 * ¿Eres profesor en alguna asignatura? Si lo eres, la app oculta lo de la IA y los trabajos con IA
 * (está pensada para alumnos). Se mira tu rol en cada asignatura al sincronizar, se guarda para
 * saberlo al instante y sin conexión, y solo cambia cuando Moodle da una respuesta clara.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';

import { leerMiRol } from './rol';
import { useMoodle } from './store';

const CLAVE = 'es_profesor_v1';

let valor = false;
const oyentes = new Set<() => void>();

function poner(v: boolean) {
  if (v === valor) return;
  valor = v;
  oyentes.forEach((f) => f());
  AsyncStorage.setItem(CLAVE, v ? '1' : '0').catch(() => undefined);
}

const suscribir = (f: () => void) => {
  oyentes.add(f);
  return () => {
    oyentes.delete(f);
  };
};

/** true si eres profesor en alguna asignatura (por defecto, false). */
export const useEsProfesor = () =>
  useSyncExternalStore(
    suscribir,
    () => valor,
    () => valor,
  );

/** Sin pantalla: carga lo guardado y, cuando hay sincronización, revisa tu rol en cada asignatura. */
export function DetectarRol() {
  const { client, snapshot } = useMoodle();
  const userid = snapshot?.site.userid;
  const cursos = snapshot?.courses;
  const firma = cursos?.map((c) => c.id).join(',');

  useEffect(() => {
    AsyncStorage.getItem(CLAVE)
      .then((v) => {
        if (v === '1') poner(true);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!client || !userid || !cursos?.length) return;
    let activo = true;
    Promise.all(cursos.map((c) => leerMiRol(client, c.id, userid))).then((roles) => {
      if (!activo) return;
      const conocidos = roles.filter((r) => r !== null);
      if (conocidos.some((r) => r === 'profesor' || r === 'profesor-sin-edicion')) poner(true);
      // Solo se vuelve a «alumno» si Moodle contestó en todas y ninguna es de profesor
      else if (conocidos.length === roles.length) poner(false);
    });
    return () => {
      activo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, userid, firma]);

  return null;
}
