import assert from 'node:assert/strict';
import test from 'node:test';

import {
  conMarca,
  CURSO_COMPLETO,
  horasDelDia,
  resumen,
  TRIMESTRES,
  trimestreDe,
} from '../src/lib/faltas';
import { horarioDelDia } from '../src/lib/horario';

const T1 = TRIMESTRES[0];
const FIN = new Date(2027, 0, 1, 12);

test('trimestres: fechas límite', () => {
  assert.equal(TRIMESTRES[0].desde, '2026-09-28');
  assert.equal(trimestreDe('2026-12-22').id, 1);
  assert.equal(trimestreDe('2026-12-23').id, 2);
  assert.equal(trimestreDe('2027-03-19').id, 2);
  assert.equal(trimestreDe('2027-03-21').id, 3);
  assert.equal(trimestreDe('2027-06-22').id, 3);
});

test('el 12 de octubre no hay clase y SAA no tuvo clase el 13, 19 y 20', () => {
  assert.equal(horarioDelDia(new Date(2026, 9, 12, 12)).tipo, 'sin-clase');
  const mar13 = horarioDelDia(new Date(2026, 9, 13, 12));
  assert.equal(mar13.tipo, 'clases');
  if (mar13.tipo === 'clases')
    assert.deepEqual(
      mar13.clases.map((c) => c.modulo),
      ['BDA'],
    );
  const lun19 = horarioDelDia(new Date(2026, 9, 19, 12));
  if (lun19.tipo === 'clases') assert.ok(lun19.clases.every((c) => c.modulo === 'MIA'));
});

test('horasDelDia marca las automáticas y las del usuario', () => {
  const h = horasDelDia('2026-10-13', { '2026-10-13': { '3': 'f' } });
  assert.equal(h.length, 4);
  assert.ok(h[0].automatica && h[1].automatica); // SAA
  assert.equal(h[2].automatica, null);
  assert.equal(h[3].marca, 'f');
  assert.deepEqual(horasDelDia('2026-10-10', {}), []); // sábado
});

test('total, límite y faltas por módulo', () => {
  const r = resumen({}, T1, FIN);
  // MIA: lun 3 h por semana; el resto del cálculo lo comprobamos con la suma de módulos
  const suma = Object.values(r).reduce((a, x) => a + x.total, 0);
  assert.ok(suma > 200 && suma < 300);
  assert.ok(r.SAA.sinClase >= 5); // 13, 19 y 20 de octubre
  assert.equal(r.MIA.limite, r.MIA.total * 0.1);
  assert.equal(r.MIA.dadas, r.MIA.total); // trimestre acabado
  assert.equal(r.MIA.faltadas, 0);
  assert.equal(r.MIA.nivel, 'ok');
});

test('una hora sin clase baja el total y el límite; una falta no baja el total', () => {
  const base = resumen({}, T1, FIN);
  const m = conMarca({}, '2026-10-05', 0, 'f'); // lunes, MIA
  const conFalta = resumen(m, T1, FIN);
  assert.equal(conFalta.MIA.total, base.MIA.total);
  assert.equal(conFalta.MIA.faltadas, 1);
  assert.equal(conFalta.MIA.restantes, base.MIA.permitidas - 1);
  const sin = resumen(conMarca({}, '2026-10-05', 0, 's'), T1, FIN);
  assert.equal(sin.MIA.total, base.MIA.total - 1);
  assert.equal(sin.MIA.sinClase, base.MIA.sinClase + 1);
});

test('pasarse del límite es suspenso; cerca del límite es aviso', () => {
  const base = resumen({}, T1, FIN).MIA;
  let m = {};
  const lunes = [
    '2026-10-05',
    '2026-10-19',
    '2026-10-26',
    '2026-11-09',
    '2026-11-16',
    '2026-11-23',
  ];
  let n = 0;
  for (const f of lunes)
    for (const i of [0, 1, 2]) if (n < base.permitidas + 1) ((m = conMarca(m, f, i, 'f')), n++);
  const r = resumen(m, T1, FIN).MIA;
  assert.equal(r.faltadas, base.permitidas + 1);
  assert.equal(r.exceso, 1);
  assert.equal(r.nivel, 'pasado');
  const casi = resumen(conMarca({}, '2026-10-05', 0, 'f'), T1, FIN).MIA;
  assert.equal(casi.nivel, base.permitidas <= 1 ? 'aviso' : 'ok');
});

test('faltas de un día futuro cuentan para el total pero no para el % de hoy', () => {
  const hoy = new Date(2026, 9, 28, 12);
  const m = conMarca({}, '2026-11-09', 0, 'f');
  const r = resumen(m, T1, hoy).MIA;
  assert.equal(r.faltadas, 1);
  assert.equal(r.faltadasHoy, 0);
  assert.ok(r.dadas < r.total);
});

test('el límite del 20 % duplica las horas permitidas y el curso completo suma los trimestres', () => {
  const a = resumen({}, TRIMESTRES[0], new Date(2027, 6, 1), 0.1).PIA;
  const b = resumen({}, TRIMESTRES[0], new Date(2027, 6, 1), 0.2).PIA;
  assert.equal(b.limite, a.limite * 2);
  assert.ok(b.permitidas >= a.permitidas * 2);
  const todo = resumen({}, CURSO_COMPLETO, new Date(2027, 6, 1)).PIA;
  const suma = TRIMESTRES.reduce((n, t) => n + resumen({}, t, new Date(2027, 6, 1)).PIA.total, 0);
  assert.equal(todo.total, suma);
});
