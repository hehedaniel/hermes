import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Entrega } from '@/lib/data';
import { construirSistema } from '@/lib/ia/prompt';
import {
  extrasDe,
  MAX_PLANTILLA,
  PLANTILLAS_POR_DEFECTO,
  type PlantillasIA,
  recortar,
} from '@/lib/ia/plantillas-datos';

const entrega = {
  key: 'a',
  nombre: 'Taller',
  cursoId: 1,
  curso: 'MIA',
  fecha: 0,
  tipo: 'assign',
  estado: 'pendiente',
} as Entrega;

const datos: PlantillasIA = {
  plantillas: [
    { id: 'p1', nombre: 'Informe', texto: '# Portada\n# Introducción', creada: 1 },
    { id: 'p2', nombre: 'Memoria', texto: '# Resumen', creada: 2 },
  ],
  defecto: 'p1',
  estilo: { texto: 'Yo lo explico así, sin rodeos.' },
  usarEstilo: true,
};

test('sin plantilla ni estilo el mensaje de sistema no cambia', () => {
  const s = construirSistema(entrega, '', extrasDe(PLANTILLAS_POR_DEFECTO));
  assert.ok(!s.includes('Plantilla del trabajo'));
  assert.ok(!s.includes('Estilo de escritura'));
  assert.equal(s, construirSistema(entrega, ''));
});

test('la plantilla por defecto y el estilo entran en el mensaje', () => {
  const s = construirSistema(entrega, '', extrasDe(datos));
  assert.ok(s.includes('«Informe»'));
  assert.ok(s.includes('# Introducción'));
  assert.ok(s.includes('Yo lo explico así'));
});

test('en una tarea se puede cambiar de plantilla o quitarla, y apagar el estilo', () => {
  assert.equal(extrasDe(datos, { plantillaId: 'p2' }).plantilla?.nombre, 'Memoria');
  assert.equal(extrasDe(datos, { plantillaId: null }).plantilla, null);
  assert.equal(extrasDe(datos, { usarEstilo: false }).estilo, null);
});

test('las plantillas muy largas se recortan y se avisa', () => {
  const larga = {
    ...datos,
    plantillas: [{ ...datos.plantillas[0], texto: 'x'.repeat(MAX_PLANTILLA + 50) }],
  };
  assert.equal(recortar('x'.repeat(MAX_PLANTILLA + 50), MAX_PLANTILLA).recortado, true);
  assert.ok(construirSistema(entrega, '', extrasDe(larga)).includes('recortada'));
});
