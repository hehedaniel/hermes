/**
 * Texto de un documento subido por el alumno (plantilla o muestra de su estilo): Word (.docx),
 * texto plano y Markdown. Los títulos de Word se pasan a Markdown (#, ##…) para que la IA vea
 * la estructura de la plantilla. Los PDF se leen aparte (pdf-texto), porque necesitan pdf.js.
 */
import { strFromU8, unzipSync } from 'fflate';

const ENTIDADES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
};

const decodificaEntidades = (s: string) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTIDADES[e.toLowerCase()] ?? m;
  });

/** Texto de un .docx, un párrafo por línea. */
export function textoDeDocx(bytes: Uint8Array): string {
  let xml: string;
  try {
    const f = unzipSync(bytes, { filter: (x) => x.name === 'word/document.xml' });
    const doc = f['word/document.xml'];
    if (!doc) throw new Error('sin documento');
    xml = strFromU8(doc);
  } catch {
    throw new Error('No se pudo leer el archivo de Word. ¿Es un .docx (no un .doc antiguo)?');
  }
  const parrafos = xml.split('</w:p>').map((p) => {
    const estilo = p.match(/<w:pStyle w:val="([^"]+)"/)?.[1] ?? '';
    const nivel = estilo.match(/^(?:heading|t[ií]tulo|ttulo)\s*(\d)/i)?.[1];
    const lista = /<w:numPr>/.test(p);
    const texto = decodificaEntidades(
      p
        .replace(/<w:tab\s*\/>/g, '\t')
        .replace(/<w:br[^>]*\/>/g, '\n')
        .replace(/<[^>]+>/g, ''),
    ).trim();
    if (!texto) return '';
    if (nivel) return `${'#'.repeat(Math.min(Number(nivel), 6))} ${texto}`;
    return lista ? `- ${texto}` : texto;
  });
  return parrafos
    .filter((p, i) => p || (i > 0 && parrafos[i - 1]))
    .join('\n')
    .trim();
}

export function decodificaUtf8(bytes: Uint8Array): string {
  const texto = new TextDecoder('utf-8').decode(bytes);
  return texto.charCodeAt(0) === 0xfeff ? texto.slice(1) : texto;
}

export const extensionDe = (nombre: string) => nombre.split('.').pop()?.toLowerCase() ?? '';

/** Formatos que se leen sin pdf.js. */
export const EXTENSIONES_TEXTO = ['txt', 'md', 'markdown', 'csv', 'html', 'htm', 'json'];

/** Texto de un archivo que no es PDF. */
export function textoDeBytes(nombre: string, bytes: Uint8Array): string {
  const ext = extensionDe(nombre);
  if (ext === 'docx') return textoDeDocx(bytes);
  if (ext === 'doc' || ext === 'odt' || ext === 'rtf')
    throw new Error(`Los archivos .${ext} no se pueden leer: guárdalo como .docx, .pdf o .txt.`);
  if (EXTENSIONES_TEXTO.includes(ext) || !ext) return decodificaUtf8(bytes).trim();
  throw new Error(
    `No sé leer archivos .${ext}. Sube un PDF, un Word (.docx) o un texto (.txt, .md).`,
  );
}
