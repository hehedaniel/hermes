import assert from 'node:assert/strict';
import { test } from 'node:test';

import { gruposDeSeccion } from '../src/lib/contents';

const mod = (id: number, modname: string, name: string, uservisible = true) => ({
  id,
  modname,
  name,
  uservisible,
});

test('cada actividad pertenece a la última etiqueta corta que tiene delante', () => {
  const g = gruposDeSeccion([
    mod(1, 'resource', 'Lenguajes y Herramientas de IA'),
    mod(2, 'label', '<p>Ejercicios y Ejemplos de Python y R</p>'),
    mod(3, 'resource', 'Ejercicios Numpy'),
    mod(4, 'url', 'Ejercicios Pandas I'),
    mod(5, 'label', 'Prácticas Evaluables'),
    mod(6, 'assign', 'Práctica Tema I'),
  ]);
  assert.equal(g.has(1), false);
  assert.equal(g.get(3), 'Ejercicios y Ejemplos de Python y R');
  assert.equal(g.get(4), 'Ejercicios y Ejemplos de Python y R');
  assert.equal(g.get(6), 'Prácticas Evaluables');
});

test('una etiqueta larga es un párrafo y no abre un grupo; una oculta tampoco', () => {
  const g = gruposDeSeccion([
    mod(1, 'label', 'x'.repeat(200)),
    mod(2, 'resource', 'A'),
    mod(3, 'label', 'Oculta', false),
    mod(4, 'resource', 'B'),
  ]);
  assert.equal(g.size, 0);
});
