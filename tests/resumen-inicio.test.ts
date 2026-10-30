import assert from 'node:assert/strict';
import test from 'node:test';

import { proximaClase, proximoExamen, resumenFaltas } from '../src/lib/resumen-inicio';

const f = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m - 1, d, h, min);

test('la próxima clase: en curso, la siguiente de hoy o la del próximo día con clase', () => {
  // Jueves 12 de noviembre de 2026: clases 15:45-16:45 (SBD), 16:45-17:45 y 18:15-20:15 (PIA)
  const enCurso = proximaClase(f(2026, 11, 12, 16, 0));
  assert.equal(enCurso?.modulo, 'SBD');
  assert.equal(enCurso?.enCurso, true);
  assert.equal(enCurso?.dias, 0);
  const antes = proximaClase(f(2026, 11, 12, 9, 0));
  assert.equal(antes?.enCurso, false);
  assert.equal(antes?.inicio, '15:45');
  // Después de la última clase del jueves → el viernes
  const despues = proximaClase(f(2026, 11, 12, 21, 0));
  assert.equal(despues?.dias, 1);
});

test('el fin de semana la próxima clase es la del lunes', () => {
  const p = proximaClase(f(2026, 11, 14, 10, 0)); // sábado
  assert.equal(p?.dias, 2);
});

test('el próximo examen cuenta los días y desaparece al pasar', () => {
  const x = proximoExamen(f(2026, 11, 10, 9, 0));
  assert.equal(x?.dias, 2);
  assert.equal(x?.modulo, 'PIA');
  assert.equal(proximoExamen(f(2026, 11, 12, 9, 0))?.dias, 0);
  assert.equal(proximoExamen(f(2026, 11, 13, 9, 0)), null);
});

test('sin faltas no hay nada que avisar; con faltas sale el módulo más justo', () => {
  assert.equal(resumenFaltas({}, f(2026, 11, 10), 0.1).faltadas, 0);
  assert.equal(resumenFaltas({}, f(2026, 11, 10), 0.1).peor, null);
  const r = resumenFaltas({ '2026-10-06': { '0': 'f' } }, f(2026, 11, 10), 0.1);
  assert.equal(r.faltadas, 1);
  assert.ok(r.peor);
});
