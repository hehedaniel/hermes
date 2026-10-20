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

import { fetchSnapshot, type Snapshot } from './data';
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
const AUTO_REFRESH_MS = 15 * 60 * 1000; // al volver a la app, sincroniza si han pasado 15 min

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
};

const MoodleContext = createContext<Ctx | null>(null);

export function MoodleProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [client, setClient] = useState<MoodleClient | null>(null);
  const [moodleUrl, setMoodleUrl] = useState(DEFAULT_MOODLE_URL);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const syncingRef = useRef(false);

  const sync = useCallback(async (c: MoodleClient) => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    setError(null);
    try {
      const snap = await fetchSnapshot(c);
      setSnapshot(snap);
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(snap));
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
  }, []);

  // Arranque: carga token y la última copia guardada (para verla al instante y sin conexión)
  useEffect(() => {
    (async () => {
      const [token, url, cache] = await Promise.all([
        tokenStore.getItemAsync(TOKEN_KEY),
        AsyncStorage.getItem(URL_KEY),
        AsyncStorage.getItem(CACHE_KEY),
      ]);
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
      } else {
        setReady(true);
      }
    })();
  }, [sync]);

  // Al volver a primer plano, sincroniza si la copia tiene más de 15 minutos
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (
        state === 'active' &&
        client &&
        (!snapshot || Date.now() - snapshot.syncedAt > AUTO_REFRESH_MS)
      ) {
        sync(client);
      }
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
      return site;
    },
    [sync],
  );

  const disconnect = useCallback(async () => {
    await tokenStore.deleteItemAsync(TOKEN_KEY);
    await AsyncStorage.removeItem(CACHE_KEY);
    setClient(null);
    setSnapshot(null);
    setError(null);
  }, []);

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
    }),
    [ready, client, moodleUrl, snapshot, syncing, error, refresh, connect, disconnect],
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
