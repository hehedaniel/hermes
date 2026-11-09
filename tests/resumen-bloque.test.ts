import assert from 'node:assert/strict';
import { test } from 'node:test';

import { resumenATexto } from '@/lib/contents';

test('resumenATexto: párrafos, viñetas y listas numeradas sin huecos', () => {
  const html =
    '<p><strong>RA 1.</strong> Caracteriza sistemas</p>\n<p>Índice:</p>\n' +
    '<ol>\n<li>\n<p>Aplicaciones de la IA</p>\n</li>\n<li>\n<p>Automatización</p>\n</li>\n</ol>\n' +
    '<ul><li>Uno</li><li>Dos</li></ul>\n<p>Fechas del 9 de octubre</p>';
  assert.equal(
    resumenATexto(html),
    'RA 1. Caracteriza sistemas\n\nÍndice:\n\n1. Aplicaciones de la IA\n2. Automatización\n\n• Uno\n• Dos\n\nFechas del 9 de octubre',
  );
  assert.equal(resumenATexto(undefined), '');
  assert.equal(resumenATexto('<p>&nbsp;</p>'), '');
});
