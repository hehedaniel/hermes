import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test, { afterEach } from 'node:test';

import { horasDelDia, resumen, TRIMESTRES } from '../src/lib/faltas';
import {
  aplicarHorario,
  horarioDelDia,
  horarioIncluido,
  limitarMes,
  motivoSinClase,
  tipoSinClase,
  validarHorario,
  versionHorario,
} from '../src/lib/horario';

afterEach(() => {
  assert.equal(aplicarHorario(horarioIncluido()), null);
});

const dia = (a: number, m: number, d: number) => new Date(a, m - 1, d, 12);

test('el horario publicado (public/horario.json) es válido: si no, no se publica la web', () => {
  const d = JSON.parse(readFileSync('public/horario.json', 'utf8'));
  assert.equal(validarHorario(d), null, 'public/horario.json no es válido');
});

test('el horario que lleva la app es válido y aplicarlo no cambia nada', () => {
  const antes = horarioDelDia(dia(2026, 10, 26));
  assert.equal(aplicarHorario(horarioIncluido()), null);
  assert.deepEqual(horarioDelDia(dia(2026, 10, 26)), antes);
});

test('un día sin clase nuevo y un cambio de horario llegan a las pantallas y a las faltas', () => {
  const c = horarioIncluido();
  c.sinClase.push({ desde: '2026-11-10', motivo: 'Jornada de puertas abiertas' }); // martes
  c.cambios.push({
    fecha: '2026-11-11', // miércoles: PIA PIA BDA BDA
    motivo: 'Charla',
    horario: ['PIA', null, 'BDA', 'BDA'],
    franjas: [
      { inicio: '15:45', fin: '16:45' },
      { inicio: '16:45', fin: '17:45' },
      { inicio: '18:30', fin: '19:30' },
      { inicio: '19:30', fin: '20:30' },
    ],
  });
  const v = versionHorario();
  assert.equal(aplicarHorario(c), null);
  assert.equal(versionHorario(), v + 1);

  const martes = horarioDelDia(dia(2026, 11, 10));
  assert.equal(martes.tipo, 'sin-clase');
  assert.equal(motivoSinClase(dia(2026, 11, 10)), 'Jornada de puertas abiertas');

  const miercoles = horarioDelDia(dia(2026, 11, 11));
  assert.equal(miercoles.tipo, 'clases');
  if (miercoles.tipo === 'clases') {
    assert.deepEqual(
      miercoles.clases.map((x) => [x.modulo, x.inicio, x.fin]),
      [
        ['PIA', '15:45', '16:45'],
        ['BDA', '18:30', '20:30'],
      ],
    );
  }
  // en faltas, la franja sin clase no existe y las horas se mueven
  const horas = horasDelDia('2026-11-11', {});
  assert.deepEqual(
    horas.map((h) => [h.franja, h.modulo, h.inicio]),
    [
      [0, 'PIA', '15:45'],
      [2, 'BDA', '18:30'],
      [3, 'BDA', '19:30'],
    ],
  );
  assert.equal(
    horasDelDia('2026-11-10', {}).every((h) => h.automatica),
    true,
  );
});

test('las fechas de los trimestres y del curso se pueden cambiar', () => {
  const c = horarioIncluido();
  c.fin = '2027-06-25';
  c.trimestres[0].hasta = '2026-12-21';
  assert.equal(aplicarHorario(c), null);
  assert.equal(TRIMESTRES[0].hasta, '2026-12-21');
  assert.equal(TRIMESTRES[2].hasta, '2027-06-25');
  const r = resumen({}, TRIMESTRES[0], dia(2026, 11, 2), 0.1);
  assert.ok(r.SBD.total > 0);
});

test('un horario mal escrito se rechaza con su motivo y no cambia nada', () => {
  const antes = horarioDelDia(dia(2026, 10, 26));
  const malos: [string, (c: ReturnType<typeof horarioIncluido>) => void][] = [
    ['fecha', (c) => (c.inicio = '28/09/2026')],
    ['módulo', (c) => (c.horario['1'][0] = 'XXX' as never)],
    ['franjas', (c) => (c.horario['2'] = ['SAA'])],
    ['hora', (c) => (c.franjas[0].inicio = '25:99')],
    ['sinClase', (c) => c.sinClase.push({ desde: '2026-02-30', motivo: 'x' })],
    ['trimestres', (c) => c.trimestres.pop()],
    ['cambio', (c) => c.cambios.push({ fecha: '2026-11-11', horario: ['PIA'] })],
  ];
  for (const [nombre, rompe] of malos) {
    const c = horarioIncluido();
    rompe(c);
    const error = aplicarHorario(c);
    assert.ok(error, `debería rechazar: ${nombre}`);
  }
  assert.ok(aplicarHorario('no es un objeto'));
  assert.ok(aplicarHorario({ v: 2 }));
  assert.deepEqual(horarioDelDia(dia(2026, 10, 26)), antes);
});

test('el calendario no retrocede más allá del mes en que empieza el curso', () => {
  assert.deepEqual(limitarMes(new Date(2026, 7, 1)), new Date(2026, 8, 1));
  assert.deepEqual(limitarMes(new Date(2026, 8, 1)), new Date(2026, 8, 1));
  assert.deepEqual(limitarMes(new Date(2026, 10, 1)), new Date(2026, 10, 1));
});

test('los días sin clase tienen tipo: formación, excursión…, y por defecto festivo o vacaciones', () => {
  const c = horarioIncluido();
  c.sinClase.push({ desde: '2026-11-17', motivo: 'Visita a una empresa', tipo: 'excursion' });
  assert.equal(aplicarHorario(c), null);
  assert.equal(tipoSinClase(dia(2026, 11, 17)), 'excursion');
  assert.equal(tipoSinClase(dia(2026, 10, 29)), 'formacion'); // el de public/horario.json
  assert.equal(tipoSinClase(dia(2026, 12, 8)), 'festivo');
  assert.equal(tipoSinClase(dia(2026, 12, 28)), 'vacaciones');
  assert.equal(tipoSinClase(dia(2026, 11, 18)), null);
  const malo = horarioIncluido();
  malo.sinClase.push({ desde: '2026-11-17', motivo: 'x', tipo: 'fiesta' as never });
  assert.match(String(aplicarHorario(malo)), /tipo/);
});
