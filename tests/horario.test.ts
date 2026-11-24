import assert from 'node:assert/strict';
import { test } from 'node:test';

import * as h from '@/lib/horario';
import { horarioDelDia, moduloDe, motivoSinClase } from '@/lib/horario';

const dia = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12);

test('el lunes junta las horas seguidas del mismo módulo', () => {
  const h = horarioDelDia(dia(2026, 10, 26));
  assert.equal(h.tipo, 'clases');
  if (h.tipo !== 'clases') return;
  assert.deepEqual(
    h.clases.map((c) => `${c.inicio}-${c.fin} ${c.modulo}`),
    ['15:45-17:45 MIA', '18:15-19:15 MIA', '19:15-20:15 SAA'],
  );
});

test('días sin clase: el 12 de octubre y SAA el 13, 19 y 20', () => {
  assert.equal(horarioDelDia(dia(2026, 10, 12)).tipo, 'sin-clase');
  for (const [d, resto] of [
    [13, ['BDA']],
    [19, ['MIA']],
    [20, ['BDA']],
  ] as const) {
    const h = horarioDelDia(dia(2026, 10, d));
    assert.equal(h.tipo, 'clases');
    if (h.tipo === 'clases') assert.deepEqual([...new Set(h.clases.map((c) => c.modulo))], resto);
  }
});

test('fines de semana, festivos y fuera de curso', () => {
  assert.equal(horarioDelDia(dia(2026, 10, 24)).tipo, 'fin-de-semana');
  const navidad = horarioDelDia(dia(2026, 12, 28));
  assert.equal(navidad.tipo, 'sin-clase');
  assert.equal(motivoSinClase(dia(2026, 12, 8)), 'Día de la Inmaculada Concepción');
  assert.equal(motivoSinClase(dia(2027, 5, 14)), 'Romería del Rocío (fiesta local)');
  assert.equal(horarioDelDia(dia(2026, 9, 25)).tipo, 'fuera-de-curso');
  assert.equal(horarioDelDia(dia(2027, 6, 23)).tipo, 'fuera-de-curso');
});

test('moduloDe reconoce cursos de Moodle y eventos de Google', () => {
  assert.equal(moduloDe('Big Data Aplicado'), 'BDA');
  assert.equal(moduloDe('S A A (Sistemas de Aprendizaje Automático)'), 'SAA');
  assert.equal(moduloDe('Clase: Programación de Inteligencia Artificial'), 'PIA');
  assert.equal(moduloDe('Punto de encuentro del I.E.S. La Marisma'), null);
});

test('presentaciones: ventana de días de clase, sin fines de semana ni días excluidos', () => {
  const base = h.horarioIncluido();
  const cfg = {
    ...base,
    presentaciones: [
      { desde: '2026-11-19', hasta: '2026-11-27', modulo: 'SBD', titulo: 'Business Case', sin: ['2026-11-26'] },
    ],
  };
  assert.equal(h.aplicarHorario(cfg), null);
  assert.equal(h.presentacionesDelDia('2026-11-19').length, 1);
  assert.equal(h.presentacionesDelDia('2026-11-21').length, 0); // sábado
  assert.equal(h.presentacionesDelDia('2026-11-26').length, 0); // formación
  assert.equal(h.presentacionesDelDia('2026-11-27').length, 1);
  assert.equal(h.presentacionesDelDia('2026-11-30').length, 0);
  assert.notEqual(
    h.aplicarHorario({ ...base, presentaciones: [{ desde: '2026-11-19', hasta: '2026-11-01', modulo: 'SBD', titulo: 'x' }] }),
    null,
  );
  h.aplicarHorario(base);
});
