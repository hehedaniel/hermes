import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { CLAVES } from '../claves';
import type { Archivo, Entrega } from '../data';
import { useDownloads } from '../downloads';
import { useMoodle } from '../store';
import { leerAdjunto } from './archivos-ia';
import { guardarChat, leerChat, type MensajeChat, nuevoId } from './chats';
import { ajustesIA } from './config';
import { extrasDe } from './plantillas-datos';
import { leerPlantillas } from './plantillas';
import { construirSistema } from './prompt';
import { extraerTextoPdf } from './pdf-texto';
import {
  type AdjuntoIA,
  esPdfAdjunto,
  IAError,
  MAX_ADJUNTOS_BYTES,
  type MensajeIA,
  necesitaTextoPdf,
  pdfSinTexto,
  pedirIA,
  PROVEEDORES,
} from './proveedores';

type Ajustes = Awaited<ReturnType<typeof ajustesIA>>;

/** Lo que se eligió en esta tarea: sin tocar (undefined) se usa lo de Ajustes. */
export type EleccionTarea = { plantillaId?: string | null; usarEstilo?: boolean };

/** La conversación con la IA de una tarea: se guarda en el móvil y se retoma al volver. */
export function useChatIA(entrega: Entrega | undefined) {
  const { client } = useMoodle();
  const descargas = useDownloads();
  const key = entrega?.key;
  const [mensajes, setMensajes] = useState<MensajeChat[]>([]);
  const [cargado, setCargado] = useState(false);
  const [pensando, setPensando] = useState<string | null>(null); // qué está haciendo
  const [ajustes, setAjustes] = useState<Ajustes | null>(null);
  const mensajesRef = useRef<MensajeChat[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const cacheAdjuntos = useRef(new Map<string, AdjuntoIA>());
  const [eleccion, setEleccion] = useState<EleccionTarea>({});
  const eleccionRef = useRef<EleccionTarea>({});

  useEffect(() => {
    if (!key) return;
    leerChat(key).then((m) => {
      mensajesRef.current = m;
      setMensajes(m);
      setCargado(true);
    });
  }, [key]);

  useEffect(() => {
    if (!key) return;
    AsyncStorage.getItem(CLAVES.iaChatEleccion(key))
      .then((raw) => {
        const e: EleccionTarea = raw ? JSON.parse(raw) : {};
        eleccionRef.current = e;
        setEleccion(e);
      })
      .catch(() => {});
  }, [key]);

  /** Cambia la plantilla o el estilo de esta tarea (se recuerda al volver). */
  const elegir = useCallback(
    (cambio: EleccionTarea) => {
      const e = { ...eleccionRef.current, ...cambio };
      eleccionRef.current = e;
      setEleccion(e);
      if (key) AsyncStorage.setItem(CLAVES.iaChatEleccion(key), JSON.stringify(e)).catch(() => {});
    },
    [key],
  );

  // Al volver de Ajustes, con la clave o el modelo ya cambiados
  useFocusEffect(
    useCallback(() => {
      ajustesIA().then(setAjustes);
    }, []),
  );

  // Si se sale de la pantalla con una respuesta en marcha, se cancela
  useEffect(() => () => abortRef.current?.abort(), []);

  const actualizar = useCallback(
    (lista: MensajeChat[]) => {
      mensajesRef.current = lista;
      setMensajes(lista);
      if (key) guardarChat(key, lista);
    },
    [key],
  );

  const responder = useCallback(
    async (lista: MensajeChat[]) => {
      if (!entrega) return;
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setPensando('Pensando…');
      try {
        const a = await ajustesIA();
        setAjustes(a);
        if (!a.clave) {
          throw new IAError(
            'clave',
            `Falta tu clave de ${PROVEEDORES[a.config.proveedor].nombre}. Ponla en Ajustes → Inteligencia artificial.`,
          );
        }

        // La IA no recuerda nada: en cada mensaje se le manda la conversación entera con sus adjuntos
        const historial: MensajeIA[] = [];
        let bytes = 0;
        for (const m of lista) {
          if (m.rol === 'error') continue;
          const adjuntos: AdjuntoIA[] = [];
          for (const archivo of m.adjuntos ?? []) {
            let adj = cacheAdjuntos.current.get(archivo.fileurl);
            if (!adj) {
              if (!client) throw new IAError('moodle', 'Conecta primero tu Moodle en Ajustes.');
              setPensando(`Leyendo ${archivo.nombre}…`);
              adj = await leerAdjunto(archivo, descargas, client);
              cacheAdjuntos.current.set(archivo.fileurl, adj);
            }
            // DeepSeek, Mistral y Groq no leen PDF: se les pasa el texto (se saca una vez y se guarda)
            if (necesitaTextoPdf(a.config.proveedor) && esPdfAdjunto(adj.nombre, adj.mime)) {
              if (adj.texto === undefined) {
                setPensando(`Sacando el texto de ${archivo.nombre}…`);
                try {
                  adj = { ...adj, texto: await extraerTextoPdf(adj.base64) };
                } catch (err) {
                  throw new IAError(
                    'pdf',
                    `No se pudo sacar el texto de «${archivo.nombre}»: ${(err as Error).message}`,
                  );
                }
                cacheAdjuntos.current.set(archivo.fileurl, adj);
              }
              // Un PDF escaneado no tiene texto: mejor avisar que mandarle a la IA un PDF vacío
              if (pdfSinTexto(adj.texto!)) {
                throw new IAError(
                  'pdf',
                  `«${archivo.nombre}» es un PDF escaneado (una imagen, sin texto) y ${PROVEEDORES[a.config.proveedor].nombre} no puede leerlo. Cámbiate a Gemini, ChatGPT o Claude en Ajustes, o quita ese archivo.`,
                );
              }
              bytes += adj.texto!.length;
            } else bytes += adj.base64.length * 0.75;
            adjuntos.push(adj);
          }
          historial.push({ rol: m.rol, texto: m.texto, adjuntos });
        }
        if (bytes > MAX_ADJUNTOS_BYTES) {
          throw new IAError(
            'grande',
            'Los archivos adjuntos ocupan demasiado para la IA. Empieza una conversación nueva adjuntando menos archivos.',
          );
        }

        setPensando('Pensando…');
        const texto = await pedirIA({
          proveedor: a.config.proveedor,
          clave: a.clave,
          modelo: a.modelo,
          sistema: construirSistema(
            entrega,
            a.config.instrucciones,
            extrasDe(await leerPlantillas(), eleccionRef.current),
          ),
          mensajes: historial,
          signal: ctrl.signal,
        });
        actualizar([
          ...lista,
          { id: nuevoId(), rol: 'ia', texto, fecha: Date.now(), modelo: a.modelo },
        ]);
      } catch (e) {
        const err = e as IAError;
        if (err.code === 'cancelada') return;
        actualizar([
          ...lista,
          { id: nuevoId(), rol: 'error', texto: err.message ?? String(e), fecha: Date.now() },
        ]);
      } finally {
        if (abortRef.current === ctrl) abortRef.current = null;
        setPensando(null);
      }
    },
    [entrega, client, descargas, actualizar],
  );

  const enviar = useCallback(
    (texto: string, adjuntos: Archivo[]) => {
      const lista: MensajeChat[] = [
        ...mensajesRef.current.filter((m) => m.rol !== 'error'),
        {
          id: nuevoId(),
          rol: 'usuario',
          texto: texto.trim(),
          fecha: Date.now(),
          adjuntos: adjuntos.length ? adjuntos : undefined,
        },
      ];
      actualizar(lista);
      responder(lista);
    },
    [actualizar, responder],
  );

  /** Vuelve a pedir la respuesta al último mensaje (tras un error). */
  const reintentar = useCallback(() => {
    const lista = mensajesRef.current.filter((m) => m.rol !== 'error');
    actualizar(lista);
    if (lista.at(-1)?.rol === 'usuario') responder(lista);
  }, [actualizar, responder]);

  const detener = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setPensando(null);
  }, []);

  const borrar = useCallback(() => {
    detener();
    cacheAdjuntos.current.clear();
    actualizar([]);
  }, [actualizar, detener]);

  const recargarAjustes = useCallback(() => {
    ajustesIA().then(setAjustes);
  }, []);

  return {
    mensajes,
    cargado,
    pensando,
    ajustes,
    eleccion,
    elegir,
    recargarAjustes,
    enviar,
    reintentar,
    detener,
    borrar,
  };
}
