import { useCallback, useState } from 'react';

import type { Entrega } from '../data';
import { avisar, confirmar } from '../dialogo';
import { formatoTamano } from '../downloads';
import { entregarEnMoodle, subirBorrador, tipoAdmitido } from '../entregar';
import { useMoodle } from '../store';
import { archivoParaSubir } from './archivos-ia';
import { type DocumentoIA, esPdf, markdownAHtml } from './documentos';

/** ¿Se puede entregar esta tarea desde la app? (tareas con entrega de archivos o de texto) */
export const sePuedeEntregar = (e: Entrega) => !!e.entregable && e.tipo === 'assign';

/**
 * Entregar en Moodle un documento hecho por la IA, con confirmación antes. Si la tarea admite
 * archivos se sube el archivo; si solo admite texto en línea, se pega el contenido.
 */
export function useEntregar(e: Entrega | undefined) {
  const { client, refresh } = useMoodle();
  const [entregando, setEntregando] = useState<string | null>(null);

  const entregar = useCallback(
    (doc: DocumentoIA) => {
      const cfg = e?.entregable;
      if (!e || !cfg || !client) return;
      const comoArchivo = cfg.archivos;
      if (comoArchivo && tipoAdmitido(doc.nombre, cfg.tipos) === false) {
        avisar(
          'Tipo de archivo no admitido',
          `Esta tarea solo admite ${cfg.tipos.join(', ')}. Pídele a la IA el trabajo en uno de esos formatos.`,
        );
        return;
      }
      const anteriores = e.envio?.archivos.length
        ? `\n\nSustituye lo que tienes entregado ahora: ${e.envio.archivos.map((a) => a.nombre).join(', ')}.`
        : e.envio?.texto
          ? '\n\nSustituye el texto que tienes entregado ahora.'
          : '';
      const incompleto = doc.completo
        ? ''
        : '\n\nOjo: la respuesta de la IA se cortó y el documento puede estar incompleto.';
      const declaracion = cfg.declaracion
        ? '\n\nLa tarea pide aceptar la declaración de que el trabajo es tuyo: al entregar la aceptas.'
        : '';
      if (cfg.prueba) {
        confirmar({
          titulo: 'Tarea de prueba',
          texto: `Se crea «${doc.nombre}» y se sube a tu zona de borradores de Moodle para comprobar que la subida funciona. No se entrega en ninguna tarea (Moodle borra esos borradores solo).`,
          boton: 'Probar subida',
          onOk: async () => {
            setEntregando(doc.nombre);
            try {
              const archivo = await archivoParaSubir(doc);
              const itemid = await subirBorrador(client, [archivo]);
              avisar(
                'Subida correcta',
                `«${doc.nombre}»${archivo.tamano ? ` (${formatoTamano(archivo.tamano)})` : ''} ha llegado a Moodle (borrador ${itemid}). En una tarea de verdad, ahora se guardaría la entrega.`,
              );
            } catch (err) {
              avisar('No se pudo subir', (err as Error).message ?? String(err));
            } finally {
              setEntregando(null);
            }
          },
        });
        return;
      }
      confirmar({
        titulo: '¿Entregar en Moodle?',
        texto: `${comoArchivo ? `Se subirá «${doc.nombre}»` : 'Se pegará el contenido como texto en línea'} en «${e.nombre}».${anteriores}${incompleto}${declaracion}`,
        boton: 'Entregar',
        onOk: async () => {
          setEntregando(doc.nombre);
          try {
            let itemid: number | undefined;
            let textoHtml: string | undefined;
            if (comoArchivo) {
              const archivo = await archivoParaSubir(doc);
              if (cfg.maxBytes && archivo.tamano && archivo.tamano > cfg.maxBytes) {
                throw new Error(
                  `El archivo ocupa ${formatoTamano(archivo.tamano)} y la tarea admite como máximo ${formatoTamano(cfg.maxBytes)}.`,
                );
              }
              itemid = await subirBorrador(client, [archivo]);
            } else {
              textoHtml =
                esPdf(doc) || /\.(md|txt)$/i.test(doc.nombre)
                  ? markdownAHtml(doc.contenido)
                  : `<pre>${doc.contenido.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!)}</pre>`;
            }
            await entregarEnMoodle(client, cfg, { itemid, textoHtml });
            await refresh();
            avisar('Entregada', `«${doc.nombre}» ya está entregada en «${e.nombre}».`);
          } catch (err) {
            avisar('No se pudo entregar', (err as Error).message ?? String(err));
          } finally {
            setEntregando(null);
          }
        },
      });
    },
    [e, client, refresh],
  );

  return { entregar, entregando, puede: !!e && sePuedeEntregar(e) && !!client };
}
