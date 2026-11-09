import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test, { afterEach } from 'node:test';

import { horasDelDia, resumen, TRIMESTRES } from '../src/lib/faltas';
import { detectarGrupo, type IndiceGrupos, indiceIncluido, validarIndice } from '../src/lib/grupos';
import {
  aplicarHorario,
  aplicarSinGrupo,
  type ConfigHorario,
  horarioDelDia,
  horarioIncluido,
  MODULOS,
  moduloDe,
  SIN_GRUPO,
  validarHorario,
} from '../src/lib/horario';

afterEach(() => {
  assert.equal(aplicarHorario(horarioIncluido()), null);
});

const leer = <T>(ruta: string) => JSON.parse(readFileSync(ruta, 'utf8')) as T;
const dia = (a: number, m: number, d: number) => new Date(a, m - 1, d, 12);

test('el índice de grupos publicado es válido y cada archivo existe y es válido', () => {
  const indice = leer<IndiceGrupos>('public/horarios.json');
  assert.equal(validarIndice(indice), null);
  for (const g of indice.grupos) {
    const perfil = leer<ConfigHorario>(`public/${g.archivo}`);
    assert.equal(validarHorario(perfil), null, `${g.archivo} no es válido`);
    // las claves del índice son las de los módulos del perfil (para detectar sin descargarlo)
    if (g.id === 'iabd-1') continue;
    const claves = Object.values(perfil.modulos ?? {}).flatMap((m) => m.claves);
    assert.deepEqual([...g.claves].sort(), [...claves].sort());
  }
  assert.deepEqual(
    [...indice.grupos[0].claves].sort(),
    [...indiceIncluido().grupos[0].claves].sort(),
  );
});

test('detectarGrupo: reconoce el grupo por las asignaturas y no confunde Programación', () => {
  const indice = leer<IndiceGrupos>('public/horarios.json');
  const iabd = [
    'Modelos de Inteligencia Artificial',
    'Sistemas de Aprendizaje Automático',
    'Big Data Aplicado',
    'Programación de Inteligencia Artificial',
    'Sistemas de Big Data',
    'Punto de encuentro',
  ];
  assert.equal(detectarGrupo(indice, iabd), 'iabd-1');
  const dam = ['Base de Datos', 'Programación', 'Sistemas Informáticos', 'Lenguajes de Marcas'];
  assert.equal(detectarGrupo(indice, dam), 'dam-1b-tarde');
  assert.equal(detectarGrupo(indice, ['Matemáticas', 'Inglés']), null);
  assert.equal(detectarGrupo(indice, []), null);
});

test('el horario de 1º DAM-B (tarde): 6 horas al día, 30 a la semana y descanso de 17:45 a 18:15', () => {
  const dam = leer<ConfigHorario>('public/horarios/dam-1b-tarde.json');
  assert.equal(aplicarHorario(dam), null);
  assert.ok('BDAT' in MODULOS && !('MIA' in MODULOS));
  assert.equal(moduloDe('Base de Datos'), 'BDAT');
  // lunes 26 oct 2026: BDAT×2, SIM×2, IPEC, SOS
  const lunes = horarioDelDia(dia(2026, 10, 26));
  assert.equal(lunes.tipo, 'clases');
  if (lunes.tipo === 'clases') {
    assert.deepEqual(
      lunes.clases.map((c) => [c.modulo, c.inicio, c.fin]),
      [
        ['BDAT', '14:45', '16:45'],
        ['SIM', '16:45', '17:45'],
        ['SIM', '18:15', '19:15'],
        ['IPEC', '19:15', '20:15'],
        ['SOS', '20:15', '21:15'],
      ],
    );
    assert.deepEqual(lunes.descanso, { inicio: '17:45', fin: '18:15' });
  }
  const horas = Object.values(dam.horario).flat();
  assert.equal(horas.length, 30);
  const r = resumen({}, TRIMESTRES[0], dia(2026, 12, 30));
  assert.deepEqual(Object.keys(r).sort(), Object.keys(dam.modulos ?? {}).sort());
  assert.ok(r.PRDA.total > r.SOS.total);
  assert.ok(horasDelDia('2026-10-26', {}).length === 6);
});

test('sin grupo no hay horario, módulos ni exámenes, y se avisa de que hay que elegir', () => {
  aplicarSinGrupo();
  assert.equal(SIN_GRUPO, true);
  assert.equal(Object.keys(MODULOS).length, 0);
  const d = horarioDelDia(dia(2026, 10, 26));
  assert.equal(d.tipo, 'sin-clase');
  assert.match(d.tipo === 'sin-clase' ? d.motivo : '', /grupo/i);
});

test('un horario con módulos propios no se acepta si usa un código que no declara', () => {
  const dam = leer<ConfigHorario>('public/horarios/dam-1b-tarde.json');
  dam.horario['1'][0] = 'XXXX';
  assert.match(validarHorario(dam) ?? '', /horario/);
});
