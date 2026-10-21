/**
 * Versión web: el navegador no puede guardar archivos para verlos sin conexión, así que cada
 * archivo se abre en una pestaña nueva (Safari y Chrome ya traen visor de PDF).
 * Misma interfaz que downloads.tsx para que las pantallas no tengan que distinguir.
 */
import { createContext, type ReactNode, useContext, useMemo } from 'react';

import type { Archivo } from './data';
import type { DownloadsCtx, EstadoDescarga } from './downloads';
import { useMoodle } from './store';

export type { EstadoDescarga };

const DownloadsContext = createContext<DownloadsCtx | null>(null);

export const claveArchivo = (a: Archivo) => a.fileurl.split('?')[0];

/** Moodle añade ?forcedownload=1: sin él, Safari y Chrome muestran el PDF en vez de descargarlo. */
const sinForzarDescarga = (url: string) =>
  url
    .replace(/([?&])forcedownload=1(&|$)/, (_, a: string, b: string) => (b ? a : ''))
    .replace(/\?$/, '');

const NO_DISPONIBLE = () => {
  throw new Error('En la versión web los archivos se abren en el navegador.');
};

export function DownloadsProvider({ children }: { children: ReactNode }) {
  const { client } = useMoodle();

  const value = useMemo<DownloadsCtx>(
    () => ({
      guardaArchivos: false,
      // Sin await antes de window.open: Safari solo deja abrir pestañas en respuesta directa a un toque
      abrir: async (a: Archivo) => {
        if (!client) throw new Error('Conecta primero tu Moodle en Ajustes.');
        window.open(client.fileUrl(sinForzarDescarga(a.fileurl)), '_blank', 'noopener');
      },
      estado: (): EstadoDescarga => 'no',
      archivoLocal: () => undefined,
      descargar: async () => NO_DISPONIBLE(),
      descargarVarios: async () => ({ ok: 0, fallos: 0 }),
      borrar: () => {},
      borrarTodo: async () => {},
      resumen: { archivos: 0, bytes: 0 },
    }),
    [client],
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
