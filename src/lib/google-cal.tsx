import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Platform } from 'react-native';

/**
 * Eventos de tu Google Calendar, servidos por el Apps Script (función doGet) con una clave privada.
 * Así funciona en Expo Go sin login de Google ni módulos nativos.
 */

export type EventoGoogle = {
  id: string;
  titulo: string;
  inicio: number; // ms
  fin: number; // ms
  todoElDia: boolean;
  lugar?: string;
  calendario: string;
  color: string;
};

const URL_KEY = 'gcal_url';
const CACHE_KEY = 'gcal_cache_v1';

const store =
  Platform.OS === 'web'
    ? {
        getItemAsync: (k: string) => AsyncStorage.getItem(k),
        setItemAsync: (k: string, v: string) => AsyncStorage.setItem(k, v),
        deleteItemAsync: (k: string) => AsyncStorage.removeItem(k),
      }
    : SecureStore;

export async function pedirEventos(
  url: string,
  desde: number,
  hasta: number,
): Promise<EventoGoogle[]> {
  const sep = url.includes('?') ? '&' : '?';
  let res: Response;
  try {
    res = await fetch(`${url}${sep}desde=${desde}&hasta=${hasta}`);
  } catch {
    throw new Error('No se pudo conectar con Google. ¿Tienes internet?');
  }
  const texto = await res.text();
  let data: { error?: string; eventos?: EventoGoogle[] };
  try {
    data = JSON.parse(texto);
  } catch {
    throw new Error(
      'El enlace no devuelve datos. Revisa que la implementación del script sea "Aplicación web" con acceso "Cualquier usuario".',
    );
  }
  if (data.error)
    throw new Error(
      data.error === 'Clave incorrecta' ? 'La clave del enlace no es correcta.' : data.error,
    );
  return data.eventos ?? [];
}

type Ctx = {
  url: string | null;
  guardarUrl: (url: string) => Promise<number>;
  quitar: () => Promise<void>;
  /** Eventos ya descargados (de todos los meses vistos). */
  eventos: EventoGoogle[];
  cargarRango: (desde: number, hasta: number) => Promise<void>;
  cargando: boolean;
  error: string | null;
};

const GoogleCalContext = createContext<Ctx | null>(null);

/** Une eventos nuevos con los guardados, sustituyendo los del rango pedido. */
function fusionar(previos: EventoGoogle[], nuevos: EventoGoogle[], desde: number, hasta: number) {
  const fuera = previos.filter((e) => e.fin <= desde || e.inicio >= hasta);
  const porId = new Map([...fuera, ...nuevos].map((e) => [e.id, e]));
  return [...porId.values()].sort((a, b) => a.inicio - b.inicio);
}

export function GoogleCalProvider({ children }: { children: ReactNode }) {
  const [url, setUrl] = useState<string | null>(null);
  const [eventos, setEventos] = useState<EventoGoogle[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [u, cache] = await Promise.all([
        store.getItemAsync(URL_KEY),
        AsyncStorage.getItem(CACHE_KEY),
      ]);
      if (cache) {
        try {
          setEventos(JSON.parse(cache));
        } catch {
          // caché corrupta
        }
      }
      setUrl(u);
    })();
  }, []);

  const cargarRango = useCallback(
    async (desde: number, hasta: number) => {
      if (!url) return;
      setCargando(true);
      setError(null);
      try {
        const nuevos = await pedirEventos(url, desde, hasta);
        setEventos((prev) => {
          const todos = fusionar(prev, nuevos, desde, hasta);
          AsyncStorage.setItem(CACHE_KEY, JSON.stringify(todos));
          return todos;
        });
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setCargando(false);
      }
    },
    [url],
  );

  const guardarUrl = useCallback(async (nueva: string) => {
    const limpia = nueva.trim();
    if (
      !/^https:\/\/script\.google(usercontent)?\.com\//.test(limpia) ||
      !limpia.includes('key=')
    ) {
      throw new Error(
        'Pega el enlace completo que sale en el registro de crearClaveApp (https://script.google.com/…?key=…).',
      );
    }
    const ahora = Date.now();
    const prueba = await pedirEventos(limpia, ahora - 7 * 86400000, ahora + 42 * 86400000);
    await store.setItemAsync(URL_KEY, limpia);
    setUrl(limpia);
    setEventos(prueba);
    setError(null);
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(prueba));
    return prueba.length;
  }, []);

  const quitar = useCallback(async () => {
    await store.deleteItemAsync(URL_KEY);
    await AsyncStorage.removeItem(CACHE_KEY);
    setUrl(null);
    setEventos([]);
  }, []);

  const value = useMemo(
    () => ({ url, guardarUrl, quitar, eventos, cargarRango, cargando, error }),
    [url, guardarUrl, quitar, eventos, cargarRango, cargando, error],
  );
  return <GoogleCalContext.Provider value={value}>{children}</GoogleCalContext.Provider>;
}

export function useGoogleCal() {
  const ctx = useContext(GoogleCalContext);
  if (!ctx) throw new Error('useGoogleCal debe usarse dentro de <GoogleCalProvider>');
  return ctx;
}

/** Reparte los eventos por día ("YYYY-MM-DD"); los de varios días aparecen en todos sus días. */
export function eventosPorDia(eventos: EventoGoogle[], dayKey: (d: Date) => string) {
  const map = new Map<string, EventoGoogle[]>();
  for (const e of eventos) {
    const d = new Date(e.inicio);
    d.setHours(0, 0, 0, 0);
    // Los de todo el día terminan a las 00:00 del día siguiente (exclusivo)
    const fin = e.todoElDia ? e.fin - 1 : Math.max(e.fin - 1, e.inicio);
    for (let i = 0; i < 62 && d.getTime() <= fin; i++) {
      const k = dayKey(d);
      map.set(k, [...(map.get(k) ?? []), e]);
      d.setDate(d.getDate() + 1);
    }
  }
  return map;
}
