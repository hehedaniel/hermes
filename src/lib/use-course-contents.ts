import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { type ContenidoCurso, fetchCourseContents } from './contents';
import { useMoodle } from './store';

const key = (id: number) => `contents_v1_${id}`;

/** Contenido de un curso: muestra al instante la copia guardada y la actualiza desde Moodle. */
export function useCourseContents(cursoId: number) {
  const { client, snapshot } = useMoodle();
  const [contenido, setContenido] = useState<ContenidoCurso | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const entregas = snapshot?.entregas;

  const recargar = useCallback(async () => {
    if (!client || !cursoId) return;
    setCargando(true);
    setError(null);
    try {
      const c = await fetchCourseContents(client, cursoId, entregas ?? []);
      setContenido(c);
      await AsyncStorage.setItem(key(cursoId), JSON.stringify(c));
    } catch (e) {
      setError((e as Error).message ?? 'No se pudo cargar el curso');
    } finally {
      setCargando(false);
    }
  }, [client, cursoId, entregas]);

  useEffect(() => {
    let vivo = true;
    AsyncStorage.getItem(key(cursoId)).then((raw) => {
      if (!vivo) return;
      if (raw) {
        try {
          setContenido((actual) => actual ?? JSON.parse(raw));
        } catch {
          // copia corrupta: se ignora
        }
      }
      recargar();
    });
    return () => {
      vivo = false;
    };
  }, [cursoId, recargar]);

  return { contenido, cargando, error, recargar };
}
