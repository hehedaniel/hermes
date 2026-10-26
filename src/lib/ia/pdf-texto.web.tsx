/**
 * Versión web de pdf-texto.tsx: en el navegador pdf.js se carga directamente en la página.
 */
import { PDFJS } from '../pdf-viewer-html';

type PdfJs = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (o: { data: Uint8Array }) => {
    promise: Promise<{
      numPages: number;
      getPage: (n: number) => Promise<{
        getTextContent: () => Promise<{ items: { str: string; hasEOL?: boolean }[] }>;
      }>;
    }>;
  };
};

let carga: Promise<PdfJs> | null = null;

function cargarPdfJs(): Promise<PdfJs> {
  carga ??= new Promise<PdfJs>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `${PDFJS}/pdf.min.js`;
    s.onload = () => {
      const lib = (window as unknown as { pdfjsLib?: PdfJs }).pdfjsLib;
      if (!lib) return reject(new Error('No se pudo cargar el lector de PDF.'));
      lib.GlobalWorkerOptions.workerSrc = `${PDFJS}/pdf.worker.min.js`;
      resolve(lib);
    };
    s.onerror = () => {
      carga = null;
      reject(new Error('No se pudo cargar el lector de PDF (¿sin internet?).'));
    };
    document.head.appendChild(s);
  });
  return carga;
}

export async function extraerTextoPdf(base64: string): Promise<string> {
  const lib = await cargarPdfJs();
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const pdf = await lib.getDocument({ data: bytes }).promise;
  const partes: string[] = [];
  for (let n = 1; n <= Math.min(pdf.numPages, 150); n++) {
    const tc = await (await pdf.getPage(n)).getTextContent();
    const t = tc.items.map((it) => it.str + (it.hasEOL ? '\n' : ' ')).join('');
    partes.push(`--- Página ${n} ---\n${t.replace(/[ \t]+\n/g, '\n').trim()}`);
  }
  return partes.join('\n\n');
}

/** En la web no hace falta nada montado. */
export function ExtractorPdf() {
  return null;
}
