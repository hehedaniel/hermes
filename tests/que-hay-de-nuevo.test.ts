import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { NOVEDADES_APP, novedadesDe, novedadesPendientes } from '../src/lib/que-hay-de-nuevo';

const versiones = (l: { version: string }[]) => l.map((n) => n.version);

test('al actualizar se enseñan solo las versiones nuevas, de la más reciente a la más antigua', () => {
  assert.deepEqual(versiones(novedadesPendientes('2.3.0', '2.5.0')), ['2.5.0', '2.4.0']);
  assert.deepEqual(versiones(novedadesPendientes('2.4.0', '2.5.0')), ['2.5.0']);
  assert.deepEqual(versiones(novedadesPendientes('2.5.0', '2.5.0')), []);
  assert.deepEqual(versiones(novedadesPendientes('2.0.0', '2.5.0')), ['2.5.0', '2.4.0', '2.3.0']);
});

test('sin versión vista solo salen las de la versión instalada; las futuras no salen', () => {
  assert.deepEqual(versiones(novedadesPendientes(null, '2.5.0')), ['2.5.0']);
  assert.deepEqual(versiones(novedadesPendientes('2.2.0', '2.4.0')), ['2.4.0', '2.3.0']);
  assert.deepEqual(novedadesPendientes(null, '9.9.9'), []);
  assert.deepEqual(versiones(novedadesDe('2.4.0')), ['2.4.0']);
});

test('la versión de app.json tiene sus novedades escritas', () => {
  const v = JSON.parse(readFileSync('app.json', 'utf8')).expo.version as string;
  assert.ok(
    NOVEDADES_APP.some((n) => n.version === v),
    `faltan las novedades de la ${v}`,
  );
  for (const n of NOVEDADES_APP) assert.ok(n.puntos.length >= 1 && n.puntos.length <= 4, n.version);
});
