import assert from 'node:assert/strict';
import { test } from 'node:test';

import { type RespuestaAviso, rutaDeAviso } from '@/lib/abrir-aviso';

const aviso = (id: string, data: Record<string, unknown> | null = { ruta: '/novedades' }) =>
  ({ notification: { request: { identifier: id, content: { data } } } }) as RespuestaAviso;

test('sin respuesta no se navega', () => {
  assert.equal(rutaDeAviso(null, true, new Set()), null);
  assert.equal(rutaDeAviso(undefined, true, new Set()), null);
});

test('mientras la navegación no está lista se espera y no se gasta el aviso', () => {
  const abiertas = new Set<string>();
  assert.equal(rutaDeAviso(aviso('a'), false, abiertas), null);
  assert.equal(abiertas.size, 0);
  assert.equal(rutaDeAviso(aviso('a'), true, abiertas), '/novedades');
});

test('el mismo aviso se abre una sola vez, aunque la raíz se vuelva a montar', () => {
  const abiertas = new Set<string>();
  assert.equal(rutaDeAviso(aviso('a'), true, abiertas), '/novedades');
  // Un remontaje vuelve a entregar la misma respuesta: no debe navegar otra vez (antes, bucle)
  for (let i = 0; i < 5; i++) assert.equal(rutaDeAviso(aviso('a'), true, abiertas), null);
});

test('un aviso distinto sí se abre', () => {
  const abiertas = new Set<string>(['a']);
  assert.equal(rutaDeAviso(aviso('b', { ruta: '/tarea/1' }), true, abiertas), '/tarea/1');
});

test('sin ruta no se navega', () => {
  assert.equal(rutaDeAviso(aviso('a', null), true, new Set()), null);
  assert.equal(rutaDeAviso(aviso('b', { ruta: 3 }), true, new Set()), null);
});
