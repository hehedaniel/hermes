/**
 * Rellena una plantilla Word (.docx) del alumno con el contenido que escribe la IA.
 *
 * La IA solo escribe el contenido en Markdown; el formato lo pone la propia plantilla:
 *  - Portada: se rellenan sus campos (controles de contenido de Word: título, módulo, fecha…).
 *  - Índice: se rehace con los títulos del trabajo (Word actualiza los números de página).
 *  - Cuerpo: se sustituye por el nuevo contenido usando los estilos de la plantilla (Título 1-3,
 *    Título sin número, Código, Pie de figura, Bibliografía…).
 *  - Todo lo demás (pies de página, márgenes, tipografías, colores, logos) se queda como está.
 *
 * Sin dependencias de React Native: se puede probar en Node.
 */
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

import { bytesABase64 } from './base64';

/** Tamaño máximo de plantilla que se guarda (va dentro de los datos sincronizados). */
export const MAX_DOCX_BYTES = 1_500_000;

export type InfoPlantillaDocx = {
  /** Campos de la portada que la IA debe rellenar (alias de los controles de Word) */
  campos: string[];
  /** Estilos de la plantilla que se usan para cada cosa (para decírselo al alumno/IA) */
  estilos: string[];
};

type Estilos = {
  h1?: string;
  h2?: string;
  h3?: string;
  sin?: string;
  sub?: string;
  caption?: string;
  captura?: string;
  codigo?: string;
  bib?: string;
};

type Paquete = Record<string, Uint8Array>;

const NOMBRES: Record<keyof Estilos, string[]> = {
  h1: ['heading 1', 'título 1', 'titulo 1'],
  h2: ['heading 2', 'título 2', 'titulo 2'],
  h3: ['heading 3', 'título 3', 'titulo 3'],
  sin: ['título sin número', 'titulo sin numero'],
  sub: ['subtítulo sin número', 'subtitulo sin numero'],
  caption: ['caption', 'pie de figura', 'pie de foto'],
  captura: ['captura'],
  codigo: ['código', 'codigo', 'code'],
  bib: ['bibliografía', 'bibliografia', 'bibliography'],
};

const esc = (s: string) =>
  s
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

function leerPaquete(bytes: Uint8Array): Paquete {
  try {
    return unzipSync(bytes);
  } catch {
    throw new Error('No se pudo leer el archivo de Word. ¿Es un .docx (no un .doc antiguo)?');
  }
}

const texto = (p: Paquete, ruta: string) => (p[ruta] ? strFromU8(p[ruta]) : '');

function detectarEstilos(styles: string): Estilos {
  const lista: { id: string; nombre: string }[] = [];
  for (const m of styles.matchAll(
    /<w:style\b[^>]*w:styleId="([^"]+)"[^>]*>\s*<w:name w:val="([^"]+)"/g,
  )) {
    lista.push({ id: m[1], nombre: m[2].toLowerCase() });
  }
  const r: Estilos = {};
  (Object.keys(NOMBRES) as (keyof Estilos)[]).forEach((k) => {
    const hit =
      lista.find((s) => NOMBRES[k].includes(s.nombre)) ??
      lista.find((s) => NOMBRES[k].includes(sinTildes(s.id)));
    if (hit) r[k] = hit.id;
  });
  return r;
}

/** Trozos de primer nivel del cuerpo del documento (párrafos, tablas, controles…). */
function trocear(xml: string) {
  const ini = xml.indexOf('<w:body>');
  const fin = xml.lastIndexOf('</w:body>');
  if (ini < 0 || fin < 0) throw new Error('El documento de Word no tiene cuerpo.');
  const dentro = xml.slice(ini + '<w:body>'.length, fin);
  const trozos: string[] = [];
  let prof = 0;
  let desde = 0;
  const re = /<(\/?)([A-Za-z][\w:.-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
  for (let m = re.exec(dentro); m; m = re.exec(dentro)) {
    const cierra = m[1] === '/';
    const auto = m[3].endsWith('/');
    if (cierra) prof--;
    else if (!auto) prof++;
    if (prof === 0) {
      trozos.push(dentro.slice(desde, re.lastIndex));
      desde = re.lastIndex;
    }
  }
  return { antes: xml.slice(0, ini + '<w:body>'.length), trozos, despues: xml.slice(fin) };
}

const estiloDe = (t: string) => t.match(/^<w:p\b[^>]*>\s*<w:pPr>\s*<w:pStyle w:val="([^"]+)"/)?.[1];

const CAMPO_TEXTO = /<w:sdt>(?:(?!<w:sdt>)[\s\S])*?<\/w:sdt>/g;

function camposDePortada(trozos: string[]) {
  const campos: string[] = [];
  for (const t of trozos) {
    for (const m of t.matchAll(CAMPO_TEXTO)) {
      if (/<w:picture\s*\/>/.test(m[0])) continue;
      const alias = m[0].match(/<w:alias w:val="([^"]+)"/)?.[1];
      if (alias && !campos.includes(alias)) campos.push(alias);
    }
  }
  return campos;
}

function inicioCuerpo(trozos: string[], est: Estilos) {
  const ids = [est.h1, est.sin].filter(Boolean);
  if (!ids.length) return -1;
  return trozos.findIndex((t) => ids.includes(estiloDe(t)));
}

/** ¿Es una plantilla que se puede rellenar? Devuelve lo que necesita la IA, o null. */
export function analizarPlantillaDocx(bytes: Uint8Array): InfoPlantillaDocx | null {
  try {
    const p = leerPaquete(bytes);
    const est = detectarEstilos(texto(p, 'word/styles.xml'));
    const { trozos } = trocear(texto(p, 'word/document.xml'));
    const ini = inicioCuerpo(trozos, est);
    if (ini < 0 || !trozos.some((t) => t.startsWith('<w:sectPr'))) return null;
    const usados = (Object.entries(est) as [string, string][]).map(([, id]) => id);
    return { campos: camposDePortada(trozos.slice(0, ini)), estilos: usados };
  } catch {
    return null;
  }
}

/** El Word original en base64 si se puede rellenar con el contenido de la IA; si no, undefined. */
export function docxRellenable(nombre: string, bytes: Uint8Array | null): string | undefined {
  if (!bytes || !/\.docx$/i.test(nombre) || bytes.length > MAX_DOCX_BYTES) return undefined;
  return analizarPlantillaDocx(bytes) ? bytesABase64(bytes) : undefined;
}

/* ─────────────── Markdown → párrafos de Word ─────────────── */

type Bloque =
  | { t: 'h'; nivel: 1 | 2 | 3; sinNumero: boolean; txt: string }
  | { t: 'p'; txt: string }
  | { t: 'li'; marca: string; txt: string }
  | { t: 'codigo'; lineas: string[] }
  | { t: 'tabla'; filas: string[][] }
  | { t: 'figura'; txt: string }
  | { t: 'cita'; txt: string };

export function separarCabecera(md: string): { campos: Record<string, string>; cuerpo: string } {
  const m = md.match(/^\s*---[ \t]*\n([\s\S]*?)\n---[ \t]*(?:\n|$)/);
  if (!m) return { campos: {}, cuerpo: md };
  const campos: Record<string, string> = {};
  for (const l of m[1].split('\n')) {
    const k = l.match(/^\s*([^:]+?)\s*:\s*(.*?)\s*$/);
    if (k) campos[sinTildes(k[1])] = k[2];
  }
  return { campos, cuerpo: md.slice(m[0].length) };
}

function bloques(md: string): Bloque[] {
  const out: Bloque[] = [];
  const lineas = md.replace(/\r/g, '').split('\n');
  let par: string[] = [];
  const cierraPar = () => {
    if (par.length) out.push({ t: 'p', txt: par.join(' ').replace(/\s+/g, ' ').trim() });
    par = [];
  };
  for (let i = 0; i < lineas.length; i++) {
    const l = lineas[i];
    if (/^\s*```/.test(l)) {
      cierraPar();
      const cod: string[] = [];
      for (i++; i < lineas.length && !/^\s*```/.test(lineas[i]); i++) cod.push(lineas[i]);
      out.push({ t: 'codigo', lineas: cod.length ? cod : [''] });
      continue;
    }
    const h = l.match(/^(#{1,6})(!?)\s+(.+?)\s*#*\s*$/);
    if (h) {
      cierraPar();
      const nivel = Math.min(h[1].length, 3) as 1 | 2 | 3;
      out.push({ t: 'h', nivel, sinNumero: h[2] === '!', txt: h[3] });
      continue;
    }
    const fig =
      l.match(/^\s*\[\s*(?:captura|figura|imagen)\s*:\s*(.*?)\s*\]\s*$/i) ??
      l.match(/^\s*!\[(.*?)\]\(.*?\)\s*$/);
    if (fig) {
      cierraPar();
      out.push({ t: 'figura', txt: fig[1] });
      continue;
    }
    if (/^\s*\|.*\|\s*$/.test(l)) {
      cierraPar();
      const filas: string[][] = [];
      for (; i < lineas.length && /^\s*\|.*\|\s*$/.test(lineas[i]); i++) {
        const celdas = lineas[i]
          .trim()
          .replace(/^\||\|$/g, '')
          .split('|');
        if (celdas.every((c) => /^\s*:?-{2,}:?\s*$/.test(c))) continue;
        filas.push(celdas.map((c) => c.trim()));
      }
      i--;
      if (filas.length) out.push({ t: 'tabla', filas });
      continue;
    }
    const li = l.match(/^\s*([-*+]|\d+[.)])\s+(.+)$/);
    if (li) {
      cierraPar();
      out.push({ t: 'li', marca: /\d/.test(li[1]) ? li[1] : '•', txt: li[2].trim() });
      continue;
    }
    const cita = l.match(/^\s*>\s?(.*)$/);
    if (cita) {
      cierraPar();
      out.push({ t: 'cita', txt: cita[1] });
      continue;
    }
    if (/^\s*([-*_]\s*){3,}$/.test(l)) {
      cierraPar();
      continue;
    }
    if (!l.trim()) cierraPar();
    else par.push(l.trim());
  }
  cierraPar();
  return out;
}

type Formato = { b?: boolean; i?: boolean; cod?: boolean };

const run = (t: string, f: Formato = {}, extra = '') => {
  if (!t) return '';
  const pr =
    (f.b ? '<w:b/><w:bCs/>' : '') +
    (f.i ? '<w:i/><w:iCs/>' : '') +
    (f.cod
      ? '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas" w:eastAsia="Consolas"/><w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/>'
      : '') +
    extra;
  return `<w:r>${pr ? `<w:rPr>${pr}</w:rPr>` : ''}<w:t xml:space="preserve">${esc(t)}</w:t></w:r>`;
};

/** Texto en línea (negrita, cursiva, código, enlaces) a runs de Word. */
function inline(s: string, base: Formato = {}, extra = ''): string {
  const re = /(\*\*[^*\n]+\*\*|\*[^*\s][^*\n]*\*|`[^`\n]+`|\[[^\]\n]+\]\([^)\s]+\))/g;
  let out = '';
  let pos = 0;
  for (let m = re.exec(s); m; m = re.exec(s)) {
    out += run(s.slice(pos, m.index), base, extra);
    const x = m[0];
    if (x.startsWith('**')) out += run(x.slice(2, -2), { ...base, b: true }, extra);
    else if (x.startsWith('`')) out += run(x.slice(1, -1), { ...base, cod: true }, extra);
    else if (x.startsWith('[')) {
      const k = x.match(/^\[(.+)\]\((.+)\)$/)!;
      out += run(k[1] === k[2] ? k[1] : `${k[1]} (${k[2]})`, base, extra);
    } else out += run(x.slice(1, -1), { ...base, i: true }, extra);
    pos = m.index + x.length;
  }
  return out + run(s.slice(pos), base, extra);
}

const parrafo = (estilo: string | undefined, runs: string, ppr = '', marca = '') =>
  `<w:p><w:pPr>${estilo ? `<w:pStyle w:val="${estilo}"/>` : ''}${ppr}</w:pPr>${marca ? `<w:bookmarkStart w:id="${marca.split(':')[0]}" w:name="${marca.split(':')[1]}"/>` : ''}${runs}${marca ? `<w:bookmarkEnd w:id="${marca.split(':')[0]}"/>` : ''}</w:p>`;

type Entrada = { nivel: 1 | 2 | 3; num: string; txt: string; marca: string; pagina: number };

function tablaXml(filas: string[][]) {
  const cols = Math.max(...filas.map((f) => f.length));
  const ancho = Math.floor(9070 / cols);
  const borde = (n: string) => `<w:${n} w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>`;
  const celda = (t: string, cab: boolean) =>
    `<w:tc><w:tcPr><w:tcW w:w="${ancho}" w:type="dxa"/>${
      cab ? '<w:shd w:val="clear" w:color="auto" w:fill="DBEAFE"/>' : ''
    }</w:tcPr><w:p><w:pPr><w:spacing w:before="40" w:after="40" w:line="240" w:lineRule="auto"/></w:pPr>${inline(t, { b: cab })}</w:p></w:tc>`;
  const filaXml = (f: string[], cab: boolean) =>
    `<w:tr>${cab ? '<w:trPr><w:tblHeader/></w:trPr>' : ''}${Array.from({ length: cols }, (_, i) => celda(f[i] ?? '', cab)).join('')}</w:tr>`;
  return (
    `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders>${['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(borde).join('')}</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr>` +
    `<w:tblGrid>${Array.from({ length: cols }, () => `<w:gridCol w:w="${ancho}"/>`).join('')}</w:tblGrid>` +
    filas.map((f, i) => filaXml(f, i === 0)).join('') +
    '</w:tbl><w:p><w:pPr><w:spacing w:before="0" w:after="120"/></w:pPr></w:p>'
  );
}

function cuerpoXml(md: string, est: Estilos) {
  const bs = bloques(md);
  const indice: Entrada[] = [];
  const n = [0, 0, 0];
  let figura = 0;
  let marcaId = 100;
  let chars = 0;
  let enBib = false;
  const xml: string[] = [];
  for (const b of bs) {
    if (b.t === 'h') {
      const nivel = b.nivel;
      const estilo = b.sinNumero
        ? nivel === 1
          ? est.sin
          : (est.sub ?? est.sin)
        : nivel === 1
          ? est.h1
          : nivel === 2
            ? est.h2
            : est.h3;
      let num = '';
      if (!b.sinNumero) {
        n[nivel - 1]++;
        for (let k = nivel; k < 3; k++) n[k] = 0;
        num = n.slice(0, nivel).join('.') + (nivel === 1 ? '.' : '');
      }
      enBib = b.sinNumero && nivel === 1 && /bibliograf/i.test(sinTildes(b.txt));
      const id = ++marcaId;
      const marca = `_Toc${String(id).padStart(4, '0')}`;
      indice.push({
        nivel: b.sinNumero ? (nivel === 1 ? 1 : 2) : nivel,
        num,
        txt: b.txt.replace(/\*\*|`/g, ''),
        marca,
        pagina: 1 + Math.floor(chars / 2600),
      });
      xml.push(parrafo(estilo, inline(b.txt.replace(/\*\*/g, '')), '', `${id}:${marca}`));
      chars += 300;
    } else if (b.t === 'p') {
      xml.push(
        enBib && est.bib ? parrafo(est.bib, inline(b.txt)) : parrafo(undefined, inline(b.txt)),
      );
      chars += b.txt.length;
    } else if (b.t === 'li') {
      xml.push(
        enBib && est.bib
          ? parrafo(est.bib, inline(b.txt))
          : parrafo(
              undefined,
              run(`${b.marca}\t`) + inline(b.txt),
              '<w:tabs><w:tab w:val="left" w:pos="567"/></w:tabs><w:spacing w:after="60"/><w:ind w:left="567" w:hanging="283"/>',
            ),
      );
      chars += b.txt.length;
    } else if (b.t === 'cita') {
      xml.push(parrafo(undefined, inline(b.txt, { i: true }), '<w:ind w:left="567"/>'));
      chars += b.txt.length;
    } else if (b.t === 'codigo') {
      for (const l of b.lineas) {
        xml.push(
          est.codigo
            ? parrafo(est.codigo, run(l))
            : parrafo(undefined, run(l, { cod: true }), '<w:spacing w:after="0"/>'),
        );
      }
      chars += b.lineas.length * 90;
    } else if (b.t === 'tabla') {
      xml.push(tablaXml(b.filas));
      chars += b.filas.length * 120;
    } else if (b.t === 'figura') {
      figura++;
      xml.push(
        parrafo(
          est.captura,
          run(
            '[Aquí va la captura: pega la imagen y borra este texto]',
            { i: true },
            '<w:color w:val="94A3B8"/>',
          ),
          est.captura ? '' : '<w:jc w:val="center"/>',
        ),
        parrafo(
          est.caption,
          run(`Figura ${figura}. ${b.txt}`),
          est.caption ? '' : '<w:jc w:val="center"/>',
        ),
      );
      chars += 1400;
    }
  }
  return { xml: xml.join(''), indice };
}

/** Párrafos de índice (TOC) con el formato del que traía la plantilla. */
function indiceXml(entradas: Entrada[], sectPr: string) {
  const out: string[] = [];
  entradas.forEach((e, i) => {
    const primero = i === 0;
    const ultimo = i === entradas.length - 1;
    const num = e.num ? `${run(e.num)}<w:r><w:tab/></w:r>` : '';
    out.push(
      `<w:p><w:pPr><w:pStyle w:val="TOC${e.nivel}"/>${ultimo && sectPr ? sectPr : ''}</w:pPr>` +
        (primero
          ? '<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> TOC \\o "1-3" \\h \\z \\u </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r>'
          : '') +
        `<w:hyperlink w:anchor="${e.marca}" w:history="1">${num}${run(e.txt)}<w:r><w:tab/></w:r>` +
        `<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> PAGEREF ${e.marca} \\h </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>${e.pagina}</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:hyperlink>` +
        (ultimo ? '<w:r><w:fldChar w:fldCharType="end"/></w:r>' : '') +
        '</w:p>',
    );
  });
  return out.join('');
}

function rellenarPortada(trozos: string[], datos: Record<string, string>) {
  let titulo: string | undefined;
  const nuevos = trozos.map((t) =>
    t.replace(CAMPO_TEXTO, (sdt) => {
      if (/<w:picture\s*\/>/.test(sdt)) return sdt;
      const alias = sdt.match(/<w:alias w:val="([^"]+)"/)?.[1];
      const valor = alias ? datos[sinTildes(alias)] : undefined;
      if (valor === undefined || valor === '') return sdt;
      if (/<w:dataBinding[^>]*\/title\[1\]/.test(sdt) || /ns0:title\[1\]/.test(sdt)) titulo = valor;
      return sdt.replace(
        /(<w:sdtContent>[\s\S]*?)<w:t(?:\s[^>]*)?>[^<]*<\/w:t>/,
        (_m, pre: string) => `${pre}<w:t xml:space="preserve">${esc(valor)}</w:t>`,
      );
    }),
  );
  return { nuevos, titulo };
}

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];
export const fechaLarga = (d = new Date()) =>
  `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;

/**
 * Plantilla Word + Markdown de la IA → .docx final.
 * El Markdown puede empezar con una cabecera `---` con los campos de la portada.
 */
export function rellenarPlantillaDocx(plantilla: Uint8Array, markdown: string): Uint8Array {
  const p = leerPaquete(plantilla);
  const est = detectarEstilos(texto(p, 'word/styles.xml'));
  const doc = texto(p, 'word/document.xml');
  const { antes, trozos, despues } = trocear(doc);
  const ini = inicioCuerpo(trozos, est);
  const finalSect = trozos.findIndex((t, i) => i > ini && t.startsWith('<w:sectPr'));
  if (ini < 0 || finalSect < 0)
    throw new Error('La plantilla de Word no tiene el formato esperado.');

  const { campos, cuerpo } = separarCabecera(markdown);
  if (!campos['fecha de entrega'] && !campos.fecha) campos['fecha de entrega'] = fechaLarga();
  if (campos.fecha && !campos['fecha de entrega']) campos['fecha de entrega'] = campos.fecha;

  const { xml, indice } = cuerpoXml(cuerpo, est);
  let previo = trozos.slice(0, ini);
  const portada = rellenarPortada(previo, campos);
  previo = portada.nuevos;

  // El índice: desde el primer párrafo «TOC» hasta el último; el salto de sección se conserva
  const esToc = (t: string) => /^TOC\d/.test(estiloDe(t) ?? '');
  const a = previo.findIndex(esToc);
  if (a >= 0 && indice.length) {
    let b = a;
    for (let k = previo.length - 1; k >= a; k--) {
      if (esToc(previo[k])) {
        b = k;
        break;
      }
    }
    const sect =
      previo
        .slice(a, b + 1)
        .join('')
        .match(/<w:sectPr[\s\S]*?<\/w:sectPr>/)?.[0] ?? '';
    previo = [...previo.slice(0, a), indiceXml(indice, sect), ...previo.slice(b + 1)];
  }

  const nuevo = antes + previo.join('') + xml + trozos.slice(finalSect).join('') + despues;
  const salida: Paquete = { ...p, 'word/document.xml': strToU8(nuevo) };

  // Word pregunta si actualizar los campos al abrir: así el índice lleva las páginas de verdad
  const ajustes = texto(p, 'word/settings.xml');
  if (ajustes && !ajustes.includes('w:updateFields')) {
    salida['word/settings.xml'] = strToU8(
      ajustes.replace(/(<w:settings\b[^>]*>)/, '$1<w:updateFields w:val="true"/>'),
    );
  }
  // El título de la portada está enlazado a las propiedades del archivo
  const core = texto(p, 'docProps/core.xml');
  if (portada.titulo && core.includes('<dc:title')) {
    salida['docProps/core.xml'] = strToU8(
      core.replace(/(<dc:title>)[\s\S]*?(<\/dc:title>)/, `$1${esc(portada.titulo)}$2`),
    );
  }
  return zipSync(salida, { level: 6 });
}
