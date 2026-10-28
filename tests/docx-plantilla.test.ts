import assert from 'node:assert/strict';
import test from 'node:test';

import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

import { base64ABytes, bytesABase64 } from '../src/lib/ia/base64';
import {
  analizarPlantillaDocx,
  docxRellenable,
  rellenarPlantillaDocx,
  separarCabecera,
} from '../src/lib/ia/docx-plantilla';
import { elegirPlantillaDocx } from '../src/lib/ia/docx-generar';

const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const estilo = (id: string, nombre: string) =>
  `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${nombre}"/></w:style>`;
const sdt = (alias: string, texto: string, extra = '') =>
  `<w:sdt><w:sdtPr><w:alias w:val="${alias}"/>${extra}<w:text/></w:sdtPr><w:sdtContent><w:r><w:t>${texto}</w:t></w:r></w:sdtContent></w:sdt>`;
const SECT = '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr>';

/** Una plantilla mínima con portada, índice, un título y el cuerpo de ejemplo. */
function plantilla() {
  const doc =
    `<?xml version="1.0"?><w:document ${NS}><w:body>` +
    `<w:p><w:r><w:t>PORTADA FIJA</w:t></w:r>${sdt('Título', 'Lorem', '<w:dataBinding w:xpath="/ns1:coreProperties[1]/ns0:title[1]"/>')}</w:p>` +
    `<w:tbl><w:tr><w:tc><w:p>${sdt('Módulo', 'Mod')}</w:p></w:tc></w:tr></w:tbl>` +
    `<w:p><w:pPr><w:pStyle w:val="TituloIndice"/></w:pPr><w:r><w:t>Índice</w:t></w:r></w:p>` +
    `<w:p><w:pPr><w:pStyle w:val="TOC1"/></w:pPr><w:r><w:t>Viejo</w:t></w:r></w:p>` +
    `<w:p><w:pPr><w:pStyle w:val="TOC2"/>${SECT}</w:pPr><w:r><w:t>Viejo 2</w:t></w:r></w:p>` +
    `<w:p><w:pPr><w:pStyle w:val="TituloSinNumero"/></w:pPr><w:r><w:t>Descripción</w:t></w:r></w:p>` +
    `<w:p><w:r><w:t>Lorem ipsum</w:t></w:r></w:p>` +
    `<w:sectPr><w:footerReference w:type="default" r:id="x"/></w:sectPr>` +
    `</w:body></w:document>`;
  const styles =
    `<w:styles ${NS}>` +
    [
      estilo('Heading1', 'heading 1'),
      estilo('Heading2', 'heading 2'),
      estilo('TituloSinNumero', 'Título sin número'),
      estilo('Codigo', 'Código'),
      estilo('Caption', 'caption'),
      estilo('Bibliografia', 'Bibliografia'),
    ].join('') +
    '</w:styles>';
  return zipSync({
    'word/document.xml': strToU8(doc),
    'word/styles.xml': strToU8(styles),
    'word/settings.xml': strToU8(`<w:settings ${NS}><w:zoom w:percent="100"/></w:settings>`),
    'docProps/core.xml': strToU8(
      '<cp:coreProperties><dc:title>Lorem</dc:title></cp:coreProperties>',
    ),
  });
}

const MD = `---
Título: Mi trabajo <1>
Módulo: Big Data
plantilla: Curso
---
#! Descripción
Hola **mundo** con \`code\`.

# Uno
## Subuno
- a
- b

[Captura: la gráfica]

\`\`\`py
x = 1
\`\`\`

| A | B |
|---|---|
| 1 | 2 |

#! Bibliografía
Autor (2020). *Libro*.
`;

const abrir = (b: Uint8Array) => {
  const z = unzipSync(b);
  return {
    doc: strFromU8(z['word/document.xml']),
    ajustes: strFromU8(z['word/settings.xml']),
    core: strFromU8(z['docProps/core.xml']),
  };
};

test('base64: ida y vuelta con cualquier longitud', () => {
  for (const n of [0, 1, 2, 3, 4, 5, 100, 1001]) {
    const b = Uint8Array.from({ length: n }, (_, i) => (i * 37 + 11) % 256);
    assert.deepEqual([...base64ABytes(bytesABase64(b))], [...b]);
    assert.equal(bytesABase64(b), Buffer.from(b).toString('base64'));
  }
});

test('analiza una plantilla: campos de la portada y estilos', () => {
  const info = analizarPlantillaDocx(plantilla());
  assert.deepEqual(info?.campos, ['Título', 'Módulo']);
  assert.ok(info?.estilos.includes('Heading1'));
});

test('un documento sin estilos de título no es una plantilla rellenable', () => {
  const z = unzipSync(plantilla());
  z['word/styles.xml'] = strToU8(`<w:styles ${NS}></w:styles>`);
  assert.equal(analizarPlantillaDocx(zipSync(z)), null);
  assert.equal(analizarPlantillaDocx(strToU8('no es un zip')), null);
  assert.equal(docxRellenable('notas.txt', plantilla()), undefined);
  assert.ok(docxRellenable('plantilla.docx', plantilla()));
});

test('rellena portada, índice y cuerpo con los estilos de la plantilla', () => {
  const { doc, ajustes, core } = abrir(rellenarPlantillaDocx(plantilla(), MD));
  assert.match(doc, /PORTADA FIJA/); // lo fijo de la portada se conserva
  assert.match(doc, /Mi trabajo &lt;1&gt;/); // campos rellenos y escapados
  assert.match(doc, /Big Data/);
  assert.doesNotMatch(doc, /Lorem/);
  assert.match(core, /<dc:title>Mi trabajo &lt;1&gt;<\/dc:title>/);
  assert.match(ajustes, /w:updateFields/);
  // el cuerpo de ejemplo se sustituye y los títulos usan los estilos
  assert.doesNotMatch(doc, /Lorem ipsum/);
  assert.match(doc, /<w:pStyle w:val="TituloSinNumero"\/>/);
  assert.match(doc, /<w:pStyle w:val="Heading1"\/>/);
  assert.match(doc, /<w:pStyle w:val="Heading2"\/>/);
  assert.match(doc, /<w:pStyle w:val="Codigo"\/>/);
  assert.match(doc, /<w:pStyle w:val="Bibliografia"\/>/);
  assert.match(doc, /Figura 1\. la gráfica/);
  assert.match(doc, /<w:tbl>/);
  assert.match(doc, /<w:b\/>/);
  // el índice se rehace con los títulos y conserva el salto de sección
  assert.doesNotMatch(doc, /Viejo/);
  assert.match(doc, /TOC \\o "1-3"/);
  assert.match(doc, /1\.<\/w:t><\/w:r><w:r><w:tab\/><\/w:r><w:r><w:t xml:space="preserve">Uno/);
  assert.equal((doc.match(/<w:sectPr/g) ?? []).length, 2);
  // el último sectPr (pies de página) sigue al final
  assert.match(doc, /<w:footerReference[^>]*\/><\/w:sectPr><\/w:body>/);
});

test('la cabecera del Markdown se separa y la fecha se pone sola', () => {
  const { campos, cuerpo } = separarCabecera(MD);
  assert.equal(campos['titulo'], 'Mi trabajo <1>');
  assert.equal(campos.plantilla, 'Curso');
  assert.ok(cuerpo.startsWith('#! Descripción'));
  assert.deepEqual(separarCabecera('# Sin cabecera').campos, {});
});

test('elige la plantilla Word por nombre, por defecto o la primera', () => {
  const p = (id: string, nombre: string, docx?: string) => ({
    id,
    nombre,
    texto: '',
    creada: 0,
    docx,
  });
  const lista = [p('a', 'Sin Word'), p('b', 'Curso', 'x'), p('c', 'Otra', 'y')];
  assert.equal(elegirPlantillaDocx(lista, null, 'curso')?.id, 'b');
  assert.equal(elegirPlantillaDocx(lista, 'c')?.id, 'c');
  assert.equal(elegirPlantillaDocx(lista, 'a')?.id, 'b');
  assert.equal(elegirPlantillaDocx([p('a', 'Sin Word')], null), undefined);
});
