import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buscar, construirIndice, normaliza } from '@/lib/busqueda';
import type { ContenidoCurso } from '@/lib/contents';
import type { Entrega } from '@/lib/data';

const entrega = (key: string, nombre: string, cursoId: number): Entrega => ({
  key,
  nombre,
  cursoId,
  curso: 'x',
  fecha: 1,
  tipo: 'assign',
  estado: 'pendiente',
});

const archivo = (nombre: string, cursoId: number) => ({
  nombre,
  fileurl: `https://moodle/${cursoId}/${nombre}`,
  size: 10,
  timemodified: 5,
  cursoId,
  cmid: 1,
});

const contenidos: ContenidoCurso[] = [
  {
    cursoId: 1,
    fetchedAt: 0,
    bloques: [
      {
        id: 1,
        numero: 1,
        nombre: 'Unidad 1. Fundamentos',
        modulos: [
          {
            cmid: 1,
            nombre: 'Apuntes tema 1',
            tipo: 'resource',
            archivos: [archivo('Evaluación_inicial.pdf', 1)],
          },
          {
            cmid: 2,
            nombre: 'Datos',
            tipo: 'resource',
            archivos: [archivo('dataset_ventas.csv', 1)],
          },
        ],
      },
    ],
  },
];

const indice = construirIndice({
  entregas: [
    entrega('a1', 'RA1.1 AEE Taller: clasificación', 1),
    entrega('a2', 'Entrega Unidad Inicial', 1),
  ],
  contenidos,
  nombreCurso: () => 'Modelos de IA',
});

test('normaliza quita tildes y símbolos', () => {
  assert.equal(normaliza('Evaluación_inicial.PDF'), 'evaluacion inicial pdf');
});

test('encuentra sin importar tildes ni mayúsculas', () => {
  const r = buscar(indice, 'evaluacion');
  assert.equal(r.length, 1);
  assert.equal(r[0].tipo, 'archivo');
});

test('filtra por tipo', () => {
  assert.equal(buscar(indice, 'inicial', 'tarea').length, 1);
  assert.equal(buscar(indice, 'inicial', 'archivo').length, 1);
  assert.equal(buscar(indice, 'inicial').length, 2);
});

test('todas las palabras tienen que aparecer; la asignatura y la unidad también valen', () => {
  assert.equal(buscar(indice, 'clasificacion taller').length, 1);
  assert.equal(buscar(indice, 'clasificacion zzz').length, 0);
  assert.equal(buscar(indice, 'fundamentos csv').length, 1);
});

test('sin consulta no devuelve nada y los que empiezan por lo escrito van primero', () => {
  assert.equal(buscar(indice, '   ').length, 0);
  assert.equal(buscar(indice, 'entrega')[0].nombre, 'Entrega Unidad Inicial');
});

test('no repite el mismo archivo', () => {
  const doble = construirIndice({
    entregas: [],
    contenidos: [
      { ...contenidos[0], bloques: [contenidos[0].bloques[0], contenidos[0].bloques[0]] },
    ],
    nombreCurso: () => 'x',
  });
  assert.equal(doble.filter((r) => r.tipo === 'archivo').length, 2);
});
