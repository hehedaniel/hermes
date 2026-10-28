/**
 * Elegir un documento del móvil (plantilla o muestra de estilo) y sacar su texto.
 * La versión web está en leer-documento.web.ts.
 */
import { File } from 'expo-file-system';

import { docxRellenable } from './docx-plantilla';
import { extensionDe, textoDeBytes } from './docx-texto';
import { extraerTextoPdf } from './pdf-texto';
import { pdfSinTexto } from './proveedores';

/** `docx`: el Word original en base64, si es una plantilla que se puede rellenar */
export type DocumentoLeido = { nombre: string; texto: string; docx?: string };

type Selector = {
  getDocumentAsync: (o: {
    type?: string | string[];
    copyToCacheDirectory?: boolean;
  }) => Promise<{ canceled: boolean; assets: { uri: string; name: string }[] | null }>;
};

/** Cargado con tolerancia: un cliente antiguo de la app no trae este módulo nativo. */
function cargarSelector(): Selector {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-document-picker') as Selector;
  } catch {
    throw new Error(
      'Esta versión de la app todavía no puede abrir archivos. Actualiza Hermes a la última versión.',
    );
  }
}

export const PUEDE_ELEGIR_ARCHIVOS = true;

export async function elegirDocumento(): Promise<DocumentoLeido | null> {
  const selector = cargarSelector();
  const r = await selector.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
  const a = r.assets?.[0];
  if (r.canceled || !a) return null;
  const file = new File(a.uri);
  const bytes = extensionDe(a.name) === 'pdf' ? null : await file.bytes();
  const texto = bytes ? textoDeBytes(a.name, bytes) : await extraerTextoPdf(await file.base64());
  if (!texto.trim() || (extensionDe(a.name) === 'pdf' && pdfSinTexto(texto))) {
    throw new Error(
      `«${a.name}» no tiene texto que se pueda leer (¿es un PDF escaneado?). Sube otro o pega el texto.`,
    );
  }
  return { nombre: a.name, texto, docx: docxRellenable(a.name, bytes) };
}
