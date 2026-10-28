/** Las marcas de faltas y de horas sin clase, guardadas en el dispositivo. */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { CLAVES } from './claves';
import { conMarca, LIMITE_FALTAS, LIMITES, type Marca, type Marcas } from './faltas';

export function useFaltas() {
  const [marcas, setMarcas] = useState<Marcas>({});
  const [listo, setListo] = useState(false);
  const [limite, setLimiteEstado] = useState<number>(LIMITE_FALTAS);
  const ref = useRef<Marcas>({});

  useFocusEffect(
    useCallback(() => {
      let vivo = true;
      AsyncStorage.getItem(CLAVES.faltas)
        .then((raw) => {
          const d = raw ? JSON.parse(raw) : {};
          return d && typeof d === 'object' ? (d as Marcas) : {};
        })
        .catch(() => ({}) as Marcas)
        .then((d) => {
          if (!vivo) return;
          ref.current = d;
          setMarcas(d);
          setListo(true);
        });
      AsyncStorage.getItem(CLAVES.faltasLimite)
        .then((raw) => {
          const n = Number(raw);
          if (vivo && (LIMITES as readonly number[]).includes(n)) setLimiteEstado(n);
        })
        .catch(() => {});
      return () => {
        vivo = false;
      };
    }, []),
  );

  /** Qué límite se mira: 10 % o 20 % */
  const setLimite = useCallback((n: number) => {
    setLimiteEstado(n);
    AsyncStorage.setItem(CLAVES.faltasLimite, String(n)).catch(() => {});
  }, []);

  const marcar = useCallback((fecha: string, franja: number, marca: Marca | null) => {
    const nuevo = conMarca(ref.current, fecha, franja, marca);
    ref.current = nuevo;
    setMarcas(nuevo);
    AsyncStorage.setItem(CLAVES.faltas, JSON.stringify(nuevo)).catch(() => {});
  }, []);

  /** Marca (o desmarca) varias franjas de golpe */
  const marcarVarias = useCallback((fecha: string, franjas: number[], marca: Marca | null) => {
    let nuevo = ref.current;
    for (const f of franjas) nuevo = conMarca(nuevo, fecha, f, marca);
    ref.current = nuevo;
    setMarcas(nuevo);
    AsyncStorage.setItem(CLAVES.faltas, JSON.stringify(nuevo)).catch(() => {});
  }, []);

  return { marcas, listo, limite, setLimite, marcar, marcarVarias };
}
