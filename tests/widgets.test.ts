import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Snapshot } from '@/lib/data';
import { datosClases, datosEntregas } from '@/widgets/datos';

// Miércoles 21 de octubre de 2026, 17:00 (hora local)
const AHORA = new Date(2026, 9, 21, 17, 0).getTime();
const s = AHORA / 1000;

const snap = {
  syncedAt: AHORA,
  courses: [
    { id: 11, fullname: 'Big Data Aplicado' },
    { id: 14, fullname: 'Programación de Inteligencia Artificial' },
  ],
  entregas: [
    {
      key: 'lejos',
      nombre: 'B',
      curso: 'Big Data Aplicado',
      cursoId: 11,
      fecha: s + 6 * 86400,
      estado: 'borrador',
    },
    {
      key: 'cerca',
      nombre: 'A',
      curso: 'Big Data Aplicado',
      cursoId: 11,
      fecha: s + 5 * 3600,
      estado: 'pendiente',
    },
    {
      key: 'vencida',
      nombre: 'C',
      curso: 'Big Data Aplicado',
      cursoId: 11,
      fecha: s - 3600,
      estado: 'pendiente',
    },
    {
      key: 'hecha',
      nombre: 'D',
      curso: 'Big Data Aplicado',
      cursoId: 11,
      fecha: s + 86400,
      estado: 'entregada',
    },
  ],
} as unknown as Snapshot;

test('widget de entregas: solo lo pendiente y por llegar, de lo más cercano a lo más lejano', () => {
  const d = datosEntregas(snap, AHORA);
  assert.equal(d.tipo, 'ok');
  if (d.tipo !== 'ok') return;
  assert.deepEqual(
    d.filas.map((f) => f.key),
    ['cerca', 'lejos'],
  );
  assert.equal(d.filas[0].siglas, 'BDA');
  assert.equal(d.filas[0].falta, 'en 5 h');
  assert.equal(d.filas[0].urgente, true);
  assert.equal(d.filas[1].urgente, false);
  assert.equal(datosEntregas(null).tipo, 'sin-datos');
});

test('widget de clases: marca la que toca ahora', () => {
  const d = datosClases(snap, AHORA);
  assert.equal(d.titulo, 'Hoy');
  assert.deepEqual(
    d.clases.map((c) => [c.modulo, c.ahora]),
    [
      ['PIA', true],
      ['BDA', false],
    ],
  );
});

test('widget de clases: por la noche enseña mañana; el fin de semana, el lunes', () => {
  assert.equal(datosClases(snap, new Date(2026, 9, 21, 21, 0).getTime()).titulo, 'Mañana');
  const sabado = datosClases(snap, new Date(2026, 9, 24, 11, 0).getTime());
  assert.equal(sabado.titulo, 'Lunes 26');
  assert.equal(sabado.aviso, 'Hoy no hay clase: fin de semana');
});

test('widget de clases: festivos seguidos saltan al siguiente día con clase', () => {
  const d = datosClases(snap, new Date(2026, 11, 7, 12, 0).getTime());
  assert.equal(d.titulo, 'Miércoles 9');
  assert.match(d.aviso ?? '', /Constitución/);
});
