import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  AVISOS_POR_DEFECTO,
  avisoDeNovedad,
  avisosDeNovedades,
  planRecordatorios,
} from '@/lib/avisos-texto';
import type { Snapshot } from '@/lib/data';
import type { Novedad, TipoNovedad } from '@/lib/novedades';
import { simularEnBase } from '@/lib/simular-novedades';

const nov = (tipo: TipoNovedad, i = 0, extra: Partial<Novedad> = {}): Novedad => ({
  id: `${tipo}:${i}`,
  tipo,
  cursoId: 11,
  curso: `Curso ${i}`,
  titulo: `Cosa ${i}`,
  fecha: 0,
  leida: false,
  ...extra,
});

test('nota publicada: título, nota y abre la entrega', () => {
  const a = avisoDeNovedad(
    nov('nota', 1, {
      titulo: 'F1 - Docker',
      curso: 'Big Data Aplicado',
      detalle: 'Nota: 8,50 / 10,00',
      entregaKey: 'assign-105',
    }),
  );
  assert.equal(a.canal, 'notas');
  assert.equal(a.titulo, 'Nota publicada: F1 - Docker');
  assert.equal(a.cuerpo, '8,50 / 10,00 · Big Data Aplicado');
  assert.equal(a.ruta, '/tarea/assign-105');
});

test('las notas van una a una; más de 3 novedades se agrupan en un resumen', () => {
  const nuevas = [
    nov('nota', 1),
    nov('archivo', 2),
    nov('archivo', 3),
    nov('tarea', 4),
    nov('fecha', 5),
  ];
  const avisos = avisosDeNovedades(nuevas, AVISOS_POR_DEFECTO);
  assert.equal(avisos.length, 2);
  assert.equal(avisos[0].canal, 'notas');
  assert.equal(avisos[1].titulo, '4 novedades en Moodle');
  assert.equal(avisos[1].ruta, '/novedades');
  // Con 3 o menos, cada una por separado
  assert.equal(avisosDeNovedades(nuevas.slice(1, 4), AVISOS_POR_DEFECTO).length, 3);
});

test('respeta lo que se haya desactivado en Ajustes', () => {
  const nuevas = [nov('nota', 1), nov('archivo', 2)];
  assert.deepEqual(
    avisosDeNovedades(nuevas, { ...AVISOS_POR_DEFECTO, notas: false }).map((a) => a.canal),
    ['novedades'],
  );
  assert.deepEqual(
    avisosDeNovedades(nuevas, { ...AVISOS_POR_DEFECTO, novedades: false }).map((a) => a.canal),
    ['notas'],
  );
});

test('recordatorios: 1 día y 2 h antes, solo de lo pendiente y por llegar', () => {
  const ahora = Date.UTC(2026, 9, 22, 10);
  const s = ahora / 1000;
  const snap = {
    entregas: [
      {
        key: 'a',
        nombre: 'A',
        curso: 'BDA',
        cursoId: 11,
        fecha: s + 3 * 86400,
        estado: 'pendiente',
        tipo: 'assign',
      },
      {
        key: 'b',
        nombre: 'B',
        curso: 'BDA',
        cursoId: 11,
        fecha: s + 5 * 3600,
        estado: 'borrador',
        tipo: 'assign',
      },
      {
        key: 'c',
        nombre: 'C',
        curso: 'BDA',
        cursoId: 11,
        fecha: s + 86400,
        estado: 'entregada',
        tipo: 'assign',
      },
      {
        key: 'd',
        nombre: 'D',
        curso: 'BDA',
        cursoId: 11,
        fecha: s - 3600,
        estado: 'pendiente',
        tipo: 'assign',
      },
    ],
  } as unknown as Snapshot;
  const plan = planRecordatorios(snap, ahora);
  assert.deepEqual(
    plan.map((r) => r.id),
    ['recordatorio:b:2h', 'recordatorio:a:24h', 'recordatorio:a:2h'],
  );
  assert.equal(plan[0].cuando, (s + 5 * 3600 - 2 * 3600) * 1000);
  assert.match(plan[0].cuerpo, /borrador sin enviar/);
  assert.equal(plan[1].titulo, 'Mañana se entrega: A');
  assert.equal(planRecordatorios(null).length, 0);
});

test('simular novedades: quita un archivo de la foto y adelanta una fecha', () => {
  const base = {
    cursos: {
      '11': { archivos: { 'https://m/a.pdf': 1, 'https://m/b.pdf': 1 }, actividades: [1] },
    },
    entregas: { x: { fecha: 2000 }, y: { fecha: 5000 } },
  };
  const snap = {
    entregas: [
      { key: 'x', nombre: 'X', estado: 'entregada', fecha: 2000 },
      { key: 'y', nombre: 'Y', estado: 'pendiente', fecha: 5000 },
    ],
  } as unknown as Snapshot;
  const r = simularEnBase(base, snap, () => 0);
  assert.equal(Object.keys(r.base.cursos['11'].archivos).length, 1);
  assert.equal(r.base.entregas.y.fecha, 5000 - 86400);
  assert.equal(r.base.entregas.x.fecha, 2000);
  assert.equal(Object.keys(base.cursos['11'].archivos).length, 2); // no toca el original
  assert.equal(r.hechos.length, 2);
  assert.deepEqual(r.olvidar, ['archivo:https://m/a.pdf:', 'fecha:y:']);
  // Al azar: con otro número elige otro archivo
  assert.ok(simularEnBase(base, snap, () => 0.9).base.cursos['11'].archivos['https://m/a.pdf']);
});
