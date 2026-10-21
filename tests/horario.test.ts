import assert from 'node:assert/strict';
import { test } from 'node:test';

import { horarioDelDia, moduloDe, motivoSinClase } from '@/lib/horario';

const dia = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12);

test('el lunes junta las horas seguidas del mismo módulo', () => {
  const h = horarioDelDia(dia(2026, 10, 19));
  assert.equal(h.tipo, 'clases');
  if (h.tipo !== 'clases') return;
  assert.deepEqual(
    h.clases.map((c) => `${c.inicio}-${c.fin} ${c.modulo}`),
    ['15:45-17:45 MIA', '18:15-19:15 MIA', '19:15-20:15 SAA'],
  );
});

test('fines de semana, festivos y fuera de curso', () => {
  assert.equal(horarioDelDia(dia(2026, 10, 24)).tipo, 'fin-de-semana');
  const navidad = horarioDelDia(dia(2026, 12, 28));
  assert.equal(navidad.tipo, 'sin-clase');
  assert.equal(motivoSinClase(dia(2026, 12, 8)), 'Día de la Inmaculada Concepción');
  assert.equal(motivoSinClase(dia(2027, 5, 14)), 'Romería del Rocío (fiesta local)');
  assert.equal(horarioDelDia(dia(2026, 9, 14)).tipo, 'fuera-de-curso');
  assert.equal(horarioDelDia(dia(2027, 6, 23)).tipo, 'fuera-de-curso');
});

test('moduloDe reconoce cursos de Moodle y eventos de Google', () => {
  assert.equal(moduloDe('Big Data Aplicado'), 'BDA');
  assert.equal(moduloDe('S A A (Sistemas de Aprendizaje Automático)'), 'SAA');
  assert.equal(moduloDe('Clase: Programación de Inteligencia Artificial'), 'PIA');
  assert.equal(moduloDe('Punto de encuentro del I.E.S. La Marisma'), null);
});
