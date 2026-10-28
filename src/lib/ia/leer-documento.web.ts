/** Versión web de leer-documento.ts: el selector de archivos es el del navegador. */
import { extensionDe, textoDeBytes } from './docx-texto';
import type { DocumentoLeido } from './leer-documento';
import { extraerTextoPdf } from './pdf-texto';
import { pdfSinTexto } from './proveedores';

export type { DocumentoLeido } from './leer-documento';

export const PUEDE_ELEGIR_ARCHIVOS = true;

function elegirArchivo(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.docx,.txt,.md,.markdown,.csv,.html,.json';
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}

const aBase64 = (bytes: Uint8Array) => {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000)
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};

export async function elegirDocumento(): Promise<DocumentoLeido | null> {
  const f = await elegirArchivo();
  if (!f) return null;
  const bytes = new Uint8Array(await f.arrayBuffer());
  const pdf = extensionDe(f.name) === 'pdf';
  const texto = pdf ? await extraerTextoPdf(aBase64(bytes)) : textoDeBytes(f.name, bytes);
  if (!texto.trim() || (pdf && pdfSinTexto(texto))) {
    throw new Error(
      `«${f.name}» no tiene texto que se pueda leer (¿es un PDF escaneado?). Sube otro o pega el texto.`,
    );
  }
  return { nombre: f.name, texto };
}
