/**
 * Documentos que genera la IA dentro de su respuesta. Se le pide que los marque así:
 *
 *   <<<ARCHIVO nombre="memoria.pdf">>>
 *   ...contenido en Markdown (o el código, si es un .py)...
 *   <<<FIN>>>
 *
 * Los .pdf se escriben en Markdown y la app los convierte en PDF; el resto se guardan tal cual.
 */
import { marked } from 'marked';

export type DocumentoIA = {
  nombre: string;
  contenido: string;
  /** false si la respuesta se cortó antes de <<<FIN>>> */
  completo: boolean;
};

export type ParteRespuesta =
  { tipo: 'texto'; texto: string } | { tipo: 'documento'; doc: DocumentoIA };

const INICIO = /<<<\s*ARCHIVO\s+nombre\s*=\s*["“]?([^"”>\n]+?)["”]?\s*>>>[ \t]*\n?/i;
const FIN = /\n?[ \t]*<<<\s*FIN\s*>>>/i;

export const FORMATO_DOCUMENTOS = `Cuando el alumno te pida el trabajo, un documento o un archivo para entregar, escríbelo completo dentro de un bloque así, sin nada más en las líneas de las marcas:

<<<ARCHIVO nombre="nombre-del-archivo.pdf">>>
(contenido)
<<<FIN>>>

- Para un .pdf, escribe el contenido en Markdown (títulos con #, listas, tablas, negritas, bloques de código); la app lo convierte en un PDF con buen formato. No pongas portada salvo que te la pidan.
- Para otros archivos (.py, .sql, .ipynb, .txt, .md, .csv…), escribe el contenido tal cual debe quedar el archivo.
- Usa un nombre de archivo corto, sin espacios ni tildes.
- Fuera del bloque explica brevemente lo que has hecho. No repitas el contenido fuera del bloque.
- Si el alumno solo pregunta o quiere una explicación, responde normal, sin bloque.`;

/** Separa el texto de la respuesta y los documentos que contiene. */
export function extraerDocumentos(respuesta: string): ParteRespuesta[] {
  const partes: ParteRespuesta[] = [];
  let resto = respuesta;
  while (resto) {
    const ini = INICIO.exec(resto);
    if (!ini) {
      partes.push({ tipo: 'texto', texto: resto });
      break;
    }
    if (ini.index > 0) partes.push({ tipo: 'texto', texto: resto.slice(0, ini.index) });
    const tras = resto.slice(ini.index + ini[0].length);
    const fin = FIN.exec(tras);
    const contenido = fin ? tras.slice(0, fin.index) : tras;
    partes.push({
      tipo: 'documento',
      doc: {
        nombre: nombreSeguro(ini[1]),
        contenido: limpiarContenido(contenido),
        completo: !!fin,
      },
    });
    resto = fin ? tras.slice(fin.index + fin[0].length) : '';
  }
  return partes
    .map((p) => (p.tipo === 'texto' ? { ...p, texto: p.texto.trim() } : p))
    .filter((p) => p.tipo === 'documento' || p.texto);
}

export const documentosDe = (respuesta: string) =>
  extraerDocumentos(respuesta).flatMap((p) => (p.tipo === 'documento' ? [p.doc] : []));

/** A veces la IA envuelve el contenido en ```markdown ... ```: se quita. */
function limpiarContenido(s: string) {
  const t = s.replace(/^\s*\n/, '').replace(/\s+$/, '');
  const m = t.match(/^```[\w-]*\n([\s\S]*?)\n```$/);
  return m ? m[1] : t;
}

/** Nombre válido para Moodle y para el móvil; si no trae extensión, es un PDF. */
export function nombreSeguro(nombre: string) {
  let n = nombre
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 80);
  if (!n || n.startsWith('.')) n = `documento${n}`;
  return /\.[a-z0-9]{1,5}$/i.test(n) ? n : `${n}.pdf`;
}

export const extensionDe = (nombre: string) =>
  nombre.includes('.') ? nombre.split('.').pop()!.toLowerCase() : '';

export const esDocx = (d: Pick<DocumentoIA, 'nombre'>) => extensionDe(d.nombre) === 'docx';

export const esPdf = (d: Pick<DocumentoIA, 'nombre'>) => extensionDe(d.nombre) === 'pdf';

const MIMES: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  md: 'text/markdown',
  txt: 'text/plain',
  csv: 'text/csv',
  json: 'application/json',
  ipynb: 'application/x-ipynb+json',
  html: 'text/html',
  py: 'text/x-python',
  sql: 'application/sql',
};
export const mimeDocumento = (d: Pick<DocumentoIA, 'nombre'>) =>
  MIMES[extensionDe(d.nombre)] ?? 'text/plain';

/** Markdown → HTML (para el texto en línea de Moodle y para el PDF). */
export const markdownAHtml = (md: string) => marked.parse(md, { async: false, gfm: true });

/** Página completa lista para convertir en PDF (A4, márgenes, tablas y código legibles). */
export function htmlParaPdf(doc: DocumentoIA) {
  const titulo = doc.nombre.replace(/\.pdf$/i, '');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escapar(titulo)}</title>
<style>
  @page { size: A4; margin: 2cm 2cm 2.2cm; }
  body { font-family: -apple-system, Roboto, "Segoe UI", Arial, sans-serif; font-size: 11.5pt; line-height: 1.5; color: #111; }
  h1 { font-size: 20pt; margin: 0 0 12pt; } h2 { font-size: 15pt; margin: 18pt 0 8pt; } h3 { font-size: 12.5pt; margin: 14pt 0 6pt; }
  h1, h2, h3 { page-break-after: avoid; } p, li { orphans: 3; widows: 3; }
  table { border-collapse: collapse; width: 100%; margin: 10pt 0; font-size: 10.5pt; page-break-inside: avoid; }
  th, td { border: 1px solid #bbb; padding: 4pt 6pt; text-align: left; vertical-align: top; } th { background: #f0f0f3; }
  code { font-family: Menlo, "Roboto Mono", Consolas, monospace; font-size: 9.5pt; background: #f3f3f5; padding: 1pt 3pt; border-radius: 3pt; }
  pre { background: #f3f3f5; padding: 8pt 10pt; border-radius: 5pt; white-space: pre-wrap; word-break: break-word; page-break-inside: avoid; }
  pre code { background: none; padding: 0; }
  blockquote { border-left: 3pt solid #ccc; margin: 8pt 0; padding: 2pt 10pt; color: #444; }
  img { max-width: 100%; }
</style></head><body>${markdownAHtml(doc.contenido)}</body></html>`;
}

const escapar = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
