import { useCallback, useState } from 'react';

import type { Entrega } from './data';
import { avisar, confirmar } from './dialogo';
import { formatoTamano } from './downloads';
import { elegirArchivosParaEntregar } from './entrega-propia';
import {
  type ArchivoParaSubir,
  entregarEnMoodle,
  subirBorrador,
  textoAHtml,
  tipoAdmitido,
} from './entregar';
import { useMoodle } from './store';

/** Entregar en Moodle archivos o texto propios (sin IA), con confirmación antes. */
export function useEntregaPropia(e: Entrega | undefined) {
  const { client, refresh } = useMoodle();
  const cfg = e?.entregable;
  const [archivos, setArchivos] = useState<ArchivoParaSubir[]>([]);
  const [texto, setTexto] = useState('');
  const [entregando, setEntregando] = useState(false);

  const elegir = useCallback(async () => {
    if (!cfg) return;
    try {
      const nuevos = await elegirArchivosParaEntregar();
      if (!nuevos.length) return;
      const malos = nuevos.filter((a) => tipoAdmitido(a.nombre, cfg.tipos) === false);
      if (malos.length) {
        avisar(
          'Tipo de archivo no admitido',
          `Esta tarea solo admite ${cfg.tipos.join(', ')}. No vale: ${malos.map((a) => a.nombre).join(', ')}.`,
        );
      }
      const buenos = nuevos.filter((a) => !malos.includes(a));
      setArchivos((previos) => {
        const todos = [...previos, ...buenos];
        if (todos.length > cfg.maxArchivos) {
          avisar('Demasiados archivos', `Esta tarea admite como máximo ${cfg.maxArchivos}.`);
          return todos.slice(0, cfg.maxArchivos);
        }
        return todos;
      });
    } catch (err) {
      avisar('No se pudo abrir el archivo', (err as Error).message ?? String(err));
    }
  }, [cfg]);

  const quitar = useCallback(
    (a: ArchivoParaSubir) => setArchivos((p) => p.filter((x) => x !== a)),
    [],
  );

  const hayAlgo = (cfg?.archivos && archivos.length > 0) || (cfg?.texto && texto.trim().length > 0);

  const entregar = useCallback(() => {
    if (!e || !cfg || !client || !hayAlgo) return;
    const grande = cfg.maxBytes ? archivos.find((a) => a.tamano && a.tamano > cfg.maxBytes) : null;
    if (grande) {
      avisar(
        'Archivo demasiado grande',
        `«${grande.nombre}» ocupa ${formatoTamano(grande.tamano!)} y la tarea admite como máximo ${formatoTamano(cfg.maxBytes)}.`,
      );
      return;
    }
    const lo_que = [
      archivos.length ? archivos.map((a) => `«${a.nombre}»`).join(', ') : '',
      cfg.texto && texto.trim() ? 'el texto escrito' : '',
    ]
      .filter(Boolean)
      .join(' y ');
    const anteriores = e.envio?.archivos.length
      ? `\n\nSustituye lo que tienes entregado ahora: ${e.envio.archivos.map((a) => a.nombre).join(', ')}.`
      : e.envio?.texto
        ? '\n\nSustituye el texto que tienes entregado ahora.'
        : '';
    const declaracion = cfg.declaracion
      ? '\n\nLa tarea pide aceptar la declaración de que el trabajo es tuyo: al entregar la aceptas.'
      : '';
    confirmar({
      titulo: '¿Entregar en Moodle?',
      texto: `Se entregará ${lo_que} en «${e.nombre}».${anteriores}${declaracion}`,
      boton: 'Entregar',
      onOk: async () => {
        setEntregando(true);
        try {
          const itemid =
            cfg.archivos && archivos.length ? await subirBorrador(client, archivos) : undefined;
          const textoHtml = cfg.texto && texto.trim() ? textoAHtml(texto) : undefined;
          await entregarEnMoodle(client, cfg, { itemid, textoHtml });
          await refresh();
          setArchivos([]);
          setTexto('');
          avisar('Entregada', `Tu trabajo ya está entregado en «${e.nombre}».`);
        } catch (err) {
          avisar('No se pudo entregar', (err as Error).message ?? String(err));
        } finally {
          setEntregando(false);
        }
      },
    });
  }, [e, cfg, client, archivos, texto, hayAlgo, refresh]);

  return {
    cfg,
    archivos,
    texto,
    setTexto,
    elegir,
    quitar,
    entregar,
    entregando,
    hayAlgo: !!hayAlgo,
  };
}
