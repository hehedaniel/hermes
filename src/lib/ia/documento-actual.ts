import type { DocumentoIA } from './documentos';

/** Documento de texto que muestra la pantalla /documento (igual que visor-actual con los PDF). */
let actual: DocumentoIA | null = null;

export const setDocumentoActual = (d: DocumentoIA) => {
  actual = d;
};
export const getDocumentoActual = () => actual;
