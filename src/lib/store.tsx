import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
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
import { AppState, Platform } from 'react-native';

import { COURSE_PALETTE } from '@/constants/theme';

import { actualizarWidgets } from '@/widgets/actualizar';

import { avisarNovedades, prepararAvisos, programarRecordatorios } from './avisos';
import { activarSegundoPlano, desactivarSegundoPlano } from './segundo-plano';
import { guardarListaNovedades, leerNovedades, leerSnapshot, sincronizarNovedades } from './sync';

import { fetchSnapshot, type Snapshot } from './data';
import type { Novedad } from './novedades';
import {
  DEFAULT_MOODLE_URL,
  MoodleClient,
  MoodleError,
  normalizeUrl,
  parseToken,
  type SiteInfo,
} from './moodle';

const TOKEN_KEY = 'moodle_token';

// En el móvil el token va cifrado (SecureStore). En web no existe SecureStore: se usa el almacenamiento normal.
const tokenStore =
  Platform.OS === 'web'
    ? {
        getItemAsync: (k: string) => AsyncStorage.getItem(k),
        setItemAsync: (k: string, v: string) => AsyncStorage.setItem(k, v),
        deleteItemAsync: (k: string) => AsyncStorage.removeItem(k),
      }
    : SecureStore;
const URL_KEY = 'moodle_url';
const CACHE_KEY = 'snapshot_v1';
const NOVEDADES_KEY = 'novedades_v1';
const BASE_KEY = 'novedades_base_v1';
const AUTO_REFRESH_MS = 15 * 60 * 1000; // al volver a la app, sincroniza si han pasado 15 min
const SYNC_MAX_MS = 2 * 60 * 1000; // pase lo que pase, a los 2 minutos se deja de "sincronizar"

/** Lee de AsyncStorage sin romper el arranque si un valor no se puede leer. */
const leer = (k: string) => AsyncStorage.getItem(k).catch(() => null);

function conLimite<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(
      () =>
        reject(new MoodleError('timeout', 'Moodle está tardando demasiado. Prueba en un rato.')),
      ms,
    );
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

type Ctx = {
  ready: boolean;
  client: MoodleClient | null;
  moodleUrl: string;
  snapshot: Snapshot | null;
  syncing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  connect: (url: string, tokenInput: string) => Promise<SiteInfo>;
  disconnect: () => Promise<void>;
  novedades: Novedad[];
  noLeidas: number;
  marcarLeidas: () => Promise<void>;
  /** Vuelve a leer las novedades guardadas (las que haya añadido el segundo plano). */
  recargarNovedades: () => Promise<void>;
};

const MoodleContext = createContext<Ctx | null>(null);

export function MoodleProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [client, setClient] = useState<MoodleClient | null>(null);
  const [moodleUrl, setMoodleUrl] = useState(DEFAULT_MOODLE_URL);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [novedades, setNovedades] = useState<Novedad[]>([]);
  const syncingRef = useRef(false);
  const novedadesRef = useRef<Novedad[]>([]);

  const guardarNovedades = useCallback((lista: Novedad[]) => {
    novedadesRef.current = lista;
    setNovedades(lista);
    guardarListaNovedades(lista);
  }, []);

  // Novedades: contenido de todos los cursos comparado con la foto anterior. Va aparte de la
  // sincronización principal para que Pendientes no espere a que se descarguen todos los cursos.
  const novedadesEnCurso = useRef(false);
  const actualizarNovedades = useCallback(async (c: MoodleClient, snap: Snapshot) => {
    if (novedadesEnCurso.current) return;
    novedadesEnCurso.current = true;
    try {
      const r = await sincronizarNovedades(c, snap);
      if (r) {
        novedadesRef.current = r.lista;
        setNovedades(r.lista);
        // Con la app abierta solo se avisa de las notas (el resto ya se ve en Novedades)
        avisarNovedades(r.nuevas.filter((n) => n.tipo === 'nota'));
      }
    } catch {
      // Las novedades no son críticas: ya se calcularán en la próxima sincronización
    } finally {
      novedadesEnCurso.current = false;
    }
  }, []);

  const sync = useCallback(
    async (c: MoodleClient) => {
      if (syncingRef.current) return;
      syncingRef.current = true;
      setSyncing(true);
      setError(null);
      try {
        const snap = await conLimite(fetchSnapshot(c), SYNC_MAX_MS);
        setSnapshot(snap);
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify(snap)).catch(() => {});
        actualizarWidgets(snap);
        programarRecordatorios(snap);
        actualizarNovedades(c, snap);
      } catch (e) {
        const err = e as MoodleError;
        setError(
          err.code === 'invalidtoken'
            ? 'El token ya no es válido. Vuelve a pegarlo en Ajustes.'
            : (err.message ?? 'Error al sincronizar'),
        );
      } finally {
        syncingRef.current = false;
        setSyncing(false);
      }
    },
    [actualizarNovedades],
  );

  // Arranque: carga token y la última copia guardada (para verla al instante y sin conexión)
  useEffect(() => {
    (async () => {
      let token: string | null = null;
      try {
        token = await tokenStore.getItemAsync(TOKEN_KEY);
      } catch {
        // sin acceso al almacén cifrado: habrá que volver a iniciar sesión
      }
      const [url, cache, nov] = await Promise.all([
        leer(URL_KEY),
        leer(CACHE_KEY),
        leer(NOVEDADES_KEY),
      ]);
      if (nov) {
        try {
          const lista = JSON.parse(nov);
          novedadesRef.current = lista;
          setNovedades(lista);
        } catch {
          // lista corrupta: se ignora
        }
      }
      const base = url || DEFAULT_MOODLE_URL;
      setMoodleUrl(base);
      if (cache) {
        try {
          setSnapshot(JSON.parse(cache));
        } catch {
          // caché corrupta: se ignora
        }
      }
      if (token) {
        const c = new MoodleClient(base, token);
        setClient(c);
        setReady(true);
        sync(c);
        prepararAvisos();
        activarSegundoPlano();
      } else {
        setReady(true);
      }
    })();
  }, [sync]);

  // Al volver a primer plano: recoge lo del segundo plano y sincroniza si la copia tiene más de 15 min
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (state) => {
      if (state !== 'active' || !client) return;
      // Lo que haya encontrado el segundo plano mientras la app estaba cerrada
      const [guardada, lista] = await Promise.all([leerSnapshot(), leerNovedades()]);
      novedadesRef.current = lista;
      setNovedades(lista);
      const masReciente =
        guardada && (!snapshot || guardada.syncedAt > snapshot.syncedAt) ? guardada : snapshot;
      if (masReciente !== snapshot) setSnapshot(masReciente);
      if (!masReciente || Date.now() - masReciente.syncedAt > AUTO_REFRESH_MS) sync(client);
    });
    return () => sub.remove();
  }, [client, snapshot, sync]);

  const refresh = useCallback(async () => {
    if (client) await sync(client);
  }, [client, sync]);

  const connect = useCallback(
    async (url: string, tokenInput: string) => {
      const base = normalizeUrl(url);
      const { token } = parseToken(tokenInput);
      const c = new MoodleClient(base, token);
      const site = await c.call<SiteInfo>('core_webservice_get_site_info'); // valida antes de guardar
      await tokenStore.setItemAsync(TOKEN_KEY, token);
      await AsyncStorage.setItem(URL_KEY, base);
      setMoodleUrl(base);
      setClient(c);
      sync(c);
      prepararAvisos();
      activarSegundoPlano();
      return site;
    },
    [sync],
  );

  const disconnect = useCallback(async () => {
    await desactivarSegundoPlano();
    await programarRecordatorios(null); // quita los recordatorios pendientes
    await tokenStore.deleteItemAsync(TOKEN_KEY);
    await AsyncStorage.multiRemove([CACHE_KEY, NOVEDADES_KEY, BASE_KEY]);
    setClient(null);
    setSnapshot(null);
    setError(null);
    novedadesRef.current = [];
    setNovedades([]);
  }, []);

  const recargarNovedades = useCallback(async () => {
    const guardada = await leerNovedades();
    if (guardada.length) {
      novedadesRef.current = guardada;
      setNovedades(guardada);
    }
  }, []);

  // Se parte de la lista guardada: el segundo plano puede haber añadido novedades mientras
  // la app estaba abierta, y no deben perderse al marcar como leídas
  const marcarLeidas = useCallback(async () => {
    const guardada = await leerNovedades();
    const lista = guardada.length ? guardada : novedadesRef.current;
    if (lista.some((n) => !n.leida)) {
      guardarNovedades(lista.map((n) => (n.leida ? n : { ...n, leida: true })));
    } else if (guardada.length) {
      novedadesRef.current = guardada;
      setNovedades(guardada);
    }
  }, [guardarNovedades]);

  const noLeidas = useMemo(() => novedades.filter((n) => !n.leida).length, [novedades]);

  const value = useMemo(
    () => ({
      ready,
      client,
      moodleUrl,
      snapshot,
      syncing,
      error,
      refresh,
      connect,
      disconnect,
      novedades,
      noLeidas,
      marcarLeidas,
      recargarNovedades,
    }),
    [
      ready,
      client,
      moodleUrl,
      snapshot,
      syncing,
      error,
      refresh,
      connect,
      disconnect,
      novedades,
      noLeidas,
      marcarLeidas,
      recargarNovedades,
    ],
  );
  return <MoodleContext.Provider value={value}>{children}</MoodleContext.Provider>;
}

export function useMoodle() {
  const ctx = useContext(MoodleContext);
  if (!ctx) throw new Error('useMoodle debe usarse dentro de <MoodleProvider>');
  return ctx;
}

/** Color de cada asignatura: estable mientras no cambien tus cursos. */
export function useCourseColors() {
  const { snapshot } = useMoodle();
  return useMemo(() => {
    const ids = [...(snapshot?.courses ?? [])].map((c) => c.id).sort((a, b) => a - b);
    const map = new Map(ids.map((id, i) => [id, COURSE_PALETTE[i % COURSE_PALETTE.length]]));
    return (id: number) => map.get(id) ?? COURSE_PALETTE[COURSE_PALETTE.length - 1];
  }, [snapshot?.courses]);
}
