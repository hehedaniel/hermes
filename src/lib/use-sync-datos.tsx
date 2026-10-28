/**
 * Sincroniza tus datos de Hermes (faltas, plantillas…) con tus Archivos privados de Moodle:
 * al abrir la app, al volver a ella y poco después de cada cambio. Funciona sin conexión:
 * si falla, los datos siguen en el dispositivo y se reintenta en la próxima ocasión.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';

import { CLAVES } from './claves';
import { aportaA } from './sync-datos';
import { guardarRemoto, leerRemoto } from './sync-moodle';
import { juntarConRemoto, suscribirAnotaciones } from './sync-reg';
import { useMoodle } from './store';

export type EstadoSync = 'inactivo' | 'sincronizando' | 'ok' | 'error';

type Ctx = {
  estado: EstadoSync;
  /** Hora de la última sincronización buena (ms) */
  ultima: number | null;
  error: string | null;
  sincronizar: () => Promise<void>;
};

const Contexto = createContext<Ctx>({
  estado: 'inactivo',
  ultima: null,
  error: null,
  sincronizar: async () => {},
});

const ESPERA_TRAS_CAMBIO_MS = 4000;

export function SyncDatosProvider({ children }: { children: ReactNode }) {
  const { client } = useMoodle();
  const [estado, setEstado] = useState<EstadoSync>('inactivo');
  const [ultima, setUltima] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const enCurso = useRef(false);
  const repetir = useRef(false);
  const siguiente = useRef<() => void>(() => {});

  useEffect(() => {
    AsyncStorage.getItem(CLAVES.syncUltima)
      .then((v) => v && setUltima(Number(v)))
      .catch(() => {});
  }, []);

  const sincronizar = useCallback(async () => {
    const c = client;
    if (!c) return;
    if (enCurso.current) {
      repetir.current = true;
      return;
    }
    enCurso.current = true;
    setEstado('sincronizando');
    try {
      const remoto = await leerRemoto(c);
      const final = await juntarConRemoto(remoto);
      const haySubir = Object.keys(final).length > 0 && (!remoto || aportaA(final, remoto));
      if (haySubir) await guardarRemoto(c, final);
      const t = Date.now();
      setUltima(t);
      setError(null);
      setEstado('ok');
      AsyncStorage.setItem(CLAVES.syncUltima, String(t)).catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron sincronizar tus datos.');
      setEstado('error');
    } finally {
      enCurso.current = false;
      if (repetir.current) {
        repetir.current = false;
        setTimeout(() => siguiente.current(), 500);
      }
    }
  }, [client]);

  useEffect(() => {
    siguiente.current = () => void sincronizar();
  }, [sincronizar]);

  // Al tener sesión
  useEffect(() => {
    if (!client) return;
    const t = setTimeout(() => void sincronizar(), 0);
    return () => clearTimeout(t);
  }, [client, sincronizar]);

  // Al volver a la app
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void sincronizar();
    });
    return () => sub.remove();
  }, [sincronizar]);

  // Poco después de cada cambio
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const off = suscribirAnotaciones(() => {
      clearTimeout(timer);
      timer = setTimeout(() => void sincronizar(), ESPERA_TRAS_CAMBIO_MS);
    });
    return () => {
      off();
      clearTimeout(timer);
    };
  }, [sincronizar]);

  const valor = useMemo(
    () => ({ estado, ultima, error, sincronizar }),
    [estado, ultima, error, sincronizar],
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export const useSyncDatos = () => useContext(Contexto);
