/** Las marcas de faltas y de horas sin clase, guardadas en el dispositivo (y sincronizadas con Moodle). */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { CLAVES } from './claves';
import { conMarca, LIMITE_FALTAS, LIMITES, type Marca, type Marcas } from './faltas';
import { anotarLimite, anotarMarcas, suscribirRemoto } from './sync-reg';

async function leerTodo() {
  const raw = await AsyncStorage.getItem(CLAVES.faltas).catch(() => null);
  let marcas: Marcas = {};
  try {
    const d = raw ? JSON.parse(raw) : {};
    if (d && typeof d === 'object') marcas = d as Marcas;
  } catch {
    // dato ilegible: se empieza de cero
  }
  const n = Number(await AsyncStorage.getItem(CLAVES.faltasLimite).catch(() => null));
  const limite = (LIMITES as readonly number[]).includes(n) ? n : null;
  return { marcas, limite };
}

export function useFaltas() {
  const [marcas, setMarcas] = useState<Marcas>({});
  const [listo, setListo] = useState(false);
  const [limite, setLimiteEstado] = useState<number>(LIMITE_FALTAS);
  const ref = useRef<Marcas>({});

  const cargar = useCallback(async () => {
    const d = await leerTodo();
    ref.current = d.marcas;
    setMarcas(d.marcas);
    if (d.limite !== null) setLimiteEstado(d.limite);
    setListo(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let vivo = true;
      leerTodo().then((d) => {
        if (!vivo) return;
        ref.current = d.marcas;
        setMarcas(d.marcas);
        if (d.limite !== null) setLimiteEstado(d.limite);
        setListo(true);
      });
      return () => {
        vivo = false;
      };
    }, []),
  );

  // Cuando la sincronización trae cambios de otro dispositivo
  useEffect(() => suscribirRemoto(() => void cargar()), [cargar]);

  /** Qué límite se mira: 10 % o 20 % */
  const setLimite = useCallback((n: number) => {
    setLimiteEstado(n);
    AsyncStorage.setItem(CLAVES.faltasLimite, String(n)).catch(() => {});
    anotarLimite(n);
  }, []);

  const marcar = useCallback((fecha: string, franja: number, marca: Marca | null) => {
    const nuevo = conMarca(ref.current, fecha, franja, marca);
    ref.current = nuevo;
    setMarcas(nuevo);
    AsyncStorage.setItem(CLAVES.faltas, JSON.stringify(nuevo)).catch(() => {});
    anotarMarcas(fecha, [franja], marca);
  }, []);

  /** Marca (o desmarca) varias franjas de golpe */
  const marcarVarias = useCallback((fecha: string, franjas: number[], marca: Marca | null) => {
    let nuevo = ref.current;
    for (const f of franjas) nuevo = conMarca(nuevo, fecha, f, marca);
    ref.current = nuevo;
    setMarcas(nuevo);
    AsyncStorage.setItem(CLAVES.faltas, JSON.stringify(nuevo)).catch(() => {});
    anotarMarcas(fecha, franjas, marca);
  }, []);

  /** Borra todas las marcas (también en tus otros dispositivos, al sincronizar) */
  const borrarTodo = useCallback(() => {
    const antes = ref.current;
    ref.current = {};
    setMarcas({});
    AsyncStorage.setItem(CLAVES.faltas, JSON.stringify({})).catch(() => {});
    for (const [fecha, porFranja] of Object.entries(antes)) {
      anotarMarcas(fecha, Object.keys(porFranja).map(Number), null);
    }
  }, []);

  return { marcas, listo, limite, setLimite, marcar, marcarVarias, borrarTodo };
}
