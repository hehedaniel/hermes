import assert from 'node:assert/strict';
import { test } from 'node:test';

import { strToU8, zipSync } from 'fflate';

import { textoDeBytes, textoDeDocx } from '@/lib/ia/docx-texto';

const p = (t: string, estilo?: string, lista?: boolean) =>
  `<w:p><w:pPr>${estilo ? `<w:pStyle w:val="${estilo}"/>` : ''}${lista ? '<w:numPr><w:ilvl w:val="0"/></w:numPr>' : ''}</w:pPr><w:r><w:t>${t}</w:t></w:r></w:p>`;

const docx = (cuerpo: string) =>
  zipSync({
    'word/document.xml': strToU8(
      `<?xml version="1.0"?><w:document xmlns:w="x"><w:body>${cuerpo}</w:body></w:document>`,
    ),
  });

test('un .docx se pasa a texto con títulos y listas', () => {
  const t = textoDeDocx(
    docx(
      p('Portada', 'Heading1') +
        p('Alumno: Dani &amp; Cía') +
        p('Apartado', 'Heading2') +
        p('punto uno', undefined, true),
    ),
  );
  assert.equal(t, '# Portada\nAlumno: Dani & Cía\n## Apartado\n- punto uno');
});

test('los títulos en español de Word también valen', () => {
  assert.equal(textoDeDocx(docx(p('Introducción', 'Ttulo1'))), '# Introducción');
});

test('un archivo que no es Word da un error claro', () => {
  assert.throws(() => textoDeDocx(strToU8('no soy un zip')), /No se pudo leer/);
});

test('texto plano y formatos no admitidos', () => {
  assert.equal(textoDeBytes('notas.md', strToU8('# Hola\n')), '# Hola');
  assert.throws(() => textoDeBytes('viejo.doc', strToU8('x')), /guárdalo como/);
  assert.throws(() => textoDeBytes('foto.png', strToU8('x')), /No sé leer/);
});
