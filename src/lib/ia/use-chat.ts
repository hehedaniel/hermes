import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { Archivo, Entrega } from '../data';
import { useDownloads } from '../downloads';
import { useMoodle } from '../store';
import { leerAdjunto } from './archivos-ia';
import { guardarChat, leerChat, type MensajeChat, nuevoId } from './chats';
import { ajustesIA } from './config';
import { construirSistema } from './prompt';
import {
  type AdjuntoIA,
  IAError,
  MAX_ADJUNTOS_BYTES,
  type MensajeIA,
  pedirIA,
  PROVEEDORES,
} from './proveedores';

type Ajustes = Awaited<ReturnType<typeof ajustesIA>>;

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

  useEffect(() => {
    if (!key) return;
    leerChat(key).then((m) => {
      mensajesRef.current = m;
      setMensajes(m);
      setCargado(true);
    });
  }, [key]);

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
            bytes += adj.base64.length * 0.75;
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
          sistema: construirSistema(entrega, a.config.instrucciones),
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
    recargarAjustes,
    enviar,
    reintentar,
    detener,
    borrar,
  };
}
