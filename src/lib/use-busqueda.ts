import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';

import { construirIndice } from './busqueda';
import { CLAVES } from './claves';
import type { ContenidoCurso } from './contents';
import { useAsignaturas, useMoodle } from './store';

/** Índice de todo lo guardado en el dispositivo; se rehace cuando cambian las entregas. */
export function useIndiceBusqueda() {
  const { snapshot } = useMoodle();
  const info = useAsignaturas();
  const [contenidos, setContenidos] = useState<ContenidoCurso[]>([]);
  const [listo, setListo] = useState(false);
  const cursos = useMemo(
    () => (snapshot?.courses ?? []).filter((c) => !/punto de encuentro/i.test(c.fullname)),
    [snapshot?.courses],
  );

  useEffect(() => {
    let vivo = true;
    AsyncStorage.multiGet(cursos.map((c) => CLAVES.contenido(c.id)))
      .then((pares) => {
        if (!vivo) return;
        const lista: ContenidoCurso[] = [];
        for (const [, raw] of pares) {
          if (!raw) continue;
          try {
            lista.push(JSON.parse(raw));
          } catch {
            // copia corrupta: se ignora
          }
        }
        setContenidos(lista);
      })
      .catch(() => {})
      .finally(() => vivo && setListo(true));
    return () => {
      vivo = false;
    };
  }, [cursos, snapshot?.syncedAt]);

  const indice = useMemo(() => {
    const nombres = new Map(cursos.map((c) => [c.id, c.fullname]));
    return construirIndice({
      entregas: (snapshot?.entregas ?? []).filter((e) => nombres.has(e.cursoId)),
      contenidos,
      nombreCurso: (id) => info(id, nombres.get(id)).nombre,
    });
  }, [snapshot?.entregas, contenidos, cursos, info]);

  return { indice, listo };
}
