import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
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

import type { Archivo } from './data';
import { abrirArchivo } from './open-file';
import { useMoodle } from './store';

const REGISTRY_KEY = 'downloads_v2';

type Registro = {
  /** Ruta dentro de la carpeta de documentos de la app (sin codificar: así no hay líos con espacios). */
  partes: string[];
  size: number;
  timemodified: number;
  nombre: string;
  cursoId: number;
};
export type EstadoDescarga = 'no' | 'descargando' | 'si' | 'desactualizado';

type Ctx = {
  /** false en la versión web: allí los archivos se abren en el navegador y no se guardan. */
  guardaArchivos: boolean;
  /** Abre un archivo: con la copia del móvil si la hay, si no lo descarga antes. */
  abrir: (a: Archivo) => Promise<void>;
  estado: (a: Archivo) => EstadoDescarga;
  archivoLocal: (a: Archivo) => File | undefined;
  descargar: (a: Archivo) => Promise<File>;
  descargarVarios: (
    as: Archivo[],
    onProgress?: (hechos: number, total: number) => void,
  ) => Promise<{ ok: number; fallos: number }>;
  borrar: (a: Archivo) => void;
  borrarTodo: () => Promise<void>;
  resumen: { archivos: number; bytes: number };
};

const DownloadsContext = createContext<Ctx | null>(null);

export const claveArchivo = (a: Archivo) => a.fileurl.split('?')[0];
export type DownloadsCtx = Ctx;

/** Nombre válido para el sistema de archivos del móvil. */
const fileDe = (r: Registro) => new File(Paths.document, ...r.partes);

const seguro = (s: string) =>
  s
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_')
    .trim()
    .slice(0, 120) || '_';

export function DownloadsProvider({ children }: { children: ReactNode }) {
  const { client } = useMoodle();
  const [registro, setRegistro] = useState<Record<string, Registro>>({});
  const [enCurso, setEnCurso] = useState<Record<string, true>>({});
  const registroRef = useRef(registro);
  useEffect(() => {
    registroRef.current = registro;
  }, [registro]);

  // Al arrancar: carga el registro y quita lo que ya no exista en el móvil
  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(REGISTRY_KEY);
      if (!raw) return;
      try {
        const reg: Record<string, Registro> = JSON.parse(raw);
        const limpio = Object.fromEntries(
          Object.entries(reg).filter(([, r]) => Array.isArray(r.partes) && fileDe(r).exists),
        );
        setRegistro(limpio);
      } catch {
        // registro corrupto: se empieza de cero
      }
    })();
  }, []);

  const guardar = useCallback((reg: Record<string, Registro>) => {
    setRegistro(reg);
    AsyncStorage.setItem(REGISTRY_KEY, JSON.stringify(reg));
  }, []);

  const estado = useCallback(
    (a: Archivo): EstadoDescarga => {
      const k = claveArchivo(a);
      if (enCurso[k]) return 'descargando';
      const r = registro[k];
      if (!r) return 'no';
      return a.timemodified && r.timemodified !== a.timemodified ? 'desactualizado' : 'si';
    },
    [registro, enCurso],
  );

  const archivoLocal = useCallback(
    (a: Archivo) => {
      const r = registro[claveArchivo(a)];
      return r ? fileDe(r) : undefined;
    },
    [registro],
  );

  const descargar = useCallback(
    async (a: Archivo) => {
      if (!client) throw new Error('Conecta primero tu Moodle en Ajustes.');
      const k = claveArchivo(a);
      setEnCurso((s) => ({ ...s, [k]: true }));
      try {
        const carpeta = [
          'moodle',
          String(a.cursoId),
          String(a.cmid),
          ...(a.ruta ? a.ruta.split('/').map(seguro) : []),
        ];
        const dir = new Directory(Paths.document, ...carpeta);
        dir.create({ intermediates: true, idempotent: true });
        const partes = [...carpeta, seguro(a.nombre)];
        await File.downloadFileAsync(
          client.fileUrl(a.fileurl),
          new File(Paths.document, ...partes),
          {
            idempotent: true,
          },
        );
        // Volvemos a construir el File desde las partes (no desde la URI que devuelve la descarga)
        const out = new File(Paths.document, ...partes);

        // Si Moodle devuelve un error, llega un JSON pequeño en lugar del archivo
        if (out.size < 2048 && !(a.mimetype ?? '').includes('json')) {
          const txt = await out.text();
          if (txt.trimStart().startsWith('{') && txt.includes('error')) {
            out.delete();
            throw new Error(JSON.parse(txt).error ?? 'Moodle no dejó descargar el archivo');
          }
        }
        const nuevo = {
          ...registroRef.current,
          [k]: {
            partes,
            size: out.size,
            timemodified: a.timemodified,
            nombre: a.nombre,
            cursoId: a.cursoId,
          },
        };
        registroRef.current = nuevo;
        guardar(nuevo);
        return out;
      } finally {
        setEnCurso((s) => {
          const { [k]: _, ...rest } = s;
          return rest;
        });
      }
    },
    [client, guardar],
  );

  const descargarVarios = useCallback(
    async (as: Archivo[], onProgress?: (hechos: number, total: number) => void) => {
      let ok = 0;
      let fallos = 0;
      // De 3 en 3 para no saturar ni al móvil ni al servidor de la Junta
      let i = 0;
      const worker = async () => {
        while (i < as.length) {
          const a = as[i++];
          try {
            await descargar(a);
            ok++;
          } catch {
            fallos++;
          }
          onProgress?.(ok + fallos, as.length);
        }
      };
      await Promise.all([worker(), worker(), worker()]);
      return { ok, fallos };
    },
    [descargar],
  );

  const borrar = useCallback(
    (a: Archivo) => {
      const k = claveArchivo(a);
      const r = registroRef.current[k];
      if (r) {
        try {
          fileDe(r).delete();
        } catch {
          // ya no existía
        }
      }
      const { [k]: _, ...rest } = registroRef.current;
      registroRef.current = rest;
      guardar(rest);
    },
    [guardar],
  );

  const abrir = useCallback(
    async (a: Archivo) => {
      const local = estado(a) === 'si' ? archivoLocal(a) : undefined;
      await abrirArchivo(a, local ?? (await descargar(a)));
    },
    [estado, archivoLocal, descargar],
  );

  const borrarTodo = useCallback(async () => {
    const dir = new Directory(Paths.document, 'moodle');
    if (dir.exists) dir.delete();
    registroRef.current = {};
    guardar({});
  }, [guardar]);

  const resumen = useMemo(() => {
    const regs = Object.values(registro);
    return {
      archivos: regs.length,
      bytes: regs.reduce((s, r) => s + (r.size || 0), 0),
    };
  }, [registro]);

  const value = useMemo(
    () => ({
      guardaArchivos: true,
      abrir,
      estado,
      archivoLocal,
      descargar,
      descargarVarios,
      borrar,
      borrarTodo,
      resumen,
    }),
    [abrir, estado, archivoLocal, descargar, descargarVarios, borrar, borrarTodo, resumen],
  );
  return <DownloadsContext.Provider value={value}>{children}</DownloadsContext.Provider>;
}

export function useDownloads() {
  const ctx = useContext(DownloadsContext);
  if (!ctx) throw new Error('useDownloads debe usarse dentro de <DownloadsProvider>');
  return ctx;
}

export function formatoTamano(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}
