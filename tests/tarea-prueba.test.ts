import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Snapshot } from '@/lib/data';
import { conTareaDePrueba, TAREA_PRUEBA_KEY } from '@/lib/tarea-prueba';

const pdf = (nombre: string) => ({
  nombre,
  fileurl: `https://m/${nombre}`,
  size: 1,
  timemodified: 0,
  cursoId: 13,
  cmid: 1,
  mimetype: 'application/pdf',
});

const snap: Snapshot = {
  site: { userid: 1, fullname: 'Dani', sitename: 'Huelva' },
  courses: [{ id: 13, fullname: 'Modelos de IA', shortname: 'MIA' }],
  syncedAt: 0,
  entregas: [
    {
      key: 'assign-1',
      nombre: 'Vieja',
      cursoId: 13,
      curso: 'Modelos de IA',
      fecha: 1,
      tipo: 'assign',
      estado: 'entregada',
      adjuntos: [
        pdf('a.pdf'),
        { ...pdf('b.docx'), mimetype: undefined },
        pdf('c.pdf'),
        pdf('d.pdf'),
      ],
    },
  ],
};

test('La tarea de prueba va primero, una sola vez, con PDF reales y marcada como prueba', () => {
  const r = conTareaDePrueba(snap, 1_000_000);
  assert.equal(r.entregas.length, 2);
  const t = r.entregas[0];
  assert.equal(t.key, TAREA_PRUEBA_KEY);
  assert.equal(t.fecha, 1000 + 3 * 86400);
  assert.deepEqual(
    t.adjuntos?.map((a) => a.nombre),
    ['a.pdf', 'c.pdf'],
  );
  assert.equal(t.entregable?.prueba, true);
  assert.equal(conTareaDePrueba(r).entregas.length, 2);
  assert.equal(snap.entregas.length, 1); // no toca el original
});
