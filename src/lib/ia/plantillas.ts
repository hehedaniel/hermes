/** Plantillas de entrega y estilo del alumno: se guardan en el dispositivo y se editan desde Ajustes. */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { CLAVES } from '../claves';
import {
  type EstiloIA,
  MAX_ESTILO,
  MAX_PLANTILLA,
  type PlantillaIA,
  PLANTILLAS_POR_DEFECTO,
  type PlantillasIA,
} from './plantillas-datos';

export async function leerPlantillas(): Promise<PlantillasIA> {
  try {
    const raw = await AsyncStorage.getItem(CLAVES.iaPlantillas);
    const d = raw ? JSON.parse(raw) : {};
    return {
      ...PLANTILLAS_POR_DEFECTO,
      ...d,
      plantillas: Array.isArray(d.plantillas) ? d.plantillas : [],
    };
  } catch {
    return PLANTILLAS_POR_DEFECTO;
  }
}

const guardar = (d: PlantillasIA) =>
  AsyncStorage.setItem(CLAVES.iaPlantillas, JSON.stringify(d)).catch(() => {});

const nuevoId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Todas las plantillas y el estilo, con las acciones para cambiarlos. */
export function usePlantillas() {
  const [datos, setDatos] = useState<PlantillasIA>(PLANTILLAS_POR_DEFECTO);
  const [listo, setListo] = useState(false);
  const ref = useRef(datos);

  // También al volver a la pantalla (por ejemplo, de Ajustes al chat de una tarea)
  useFocusEffect(
    useCallback(() => {
      let vivo = true;
      leerPlantillas().then((d) => {
        if (!vivo) return;
        ref.current = d;
        setDatos(d);
        setListo(true);
      });
      return () => {
        vivo = false;
      };
    }, []),
  );

  const poner = useCallback((d: PlantillasIA) => {
    ref.current = d;
    setDatos(d);
    guardar(d);
  }, []);

  const anadir = useCallback(
    (nombre: string, texto: string, archivo?: string) => {
      const p: PlantillaIA = {
        id: nuevoId(),
        nombre: nombre.trim() || archivo || 'Plantilla',
        archivo,
        texto: texto.trim().slice(0, MAX_PLANTILLA * 2),
        creada: Date.now(),
      };
      const d = ref.current;
      poner({ ...d, plantillas: [...d.plantillas, p], defecto: d.defecto ?? p.id });
      return p;
    },
    [poner],
  );

  const borrar = useCallback(
    (id: string) => {
      const d = ref.current;
      const plantillas = d.plantillas.filter((p) => p.id !== id);
      poner({ ...d, plantillas, defecto: d.defecto === id ? null : d.defecto });
    },
    [poner],
  );

  const renombrar = useCallback(
    (id: string, nombre: string) => {
      const d = ref.current;
      poner({
        ...d,
        plantillas: d.plantillas.map((p) =>
          p.id === id ? { ...p, nombre: nombre || p.nombre } : p,
        ),
      });
    },
    [poner],
  );

  const ponerDefecto = useCallback(
    (id: string | null) => poner({ ...ref.current, defecto: id }),
    [poner],
  );

  const cambiarEstilo = useCallback(
    (estilo: EstiloIA | null) =>
      poner({
        ...ref.current,
        estilo: estilo ? { ...estilo, texto: estilo.texto.trim().slice(0, MAX_ESTILO * 2) } : null,
      }),
    [poner],
  );

  const ponerUsarEstilo = useCallback(
    (v: boolean) => poner({ ...ref.current, usarEstilo: v }),
    [poner],
  );

  return { datos, listo, anadir, borrar, renombrar, ponerDefecto, cambiarEstilo, ponerUsarEstilo };
}
