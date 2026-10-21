import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { ContenidoCurso } from '@/lib/contents';
import type { Snapshot } from '@/lib/data';
import { calcularNovedades, fusionarNovedades, type Novedad } from '@/lib/novedades';

const archivo = (nombre: string, timemodified: number) => ({
  nombre,
  fileurl: `https://moodle/pluginfile.php/1/${nombre}?forcedownload=1`,
  size: 1000,
  timemodified,
  cursoId: 11,
  cmid: 100,
});

const contenido = (
  archivos: ReturnType<typeof archivo>[],
  extra: number[] = [],
): ContenidoCurso[] => [
  {
    cursoId: 11,
    fetchedAt: 0,
    bloques: [
      {
        id: 1,
        numero: 1,
        nombre: 'Unidad 1',
        modulos: [
          { cmid: 100, nombre: 'Teoría', tipo: 'resource', archivos },
          ...extra.map((cmid) => ({ cmid, nombre: `Foro ${cmid}`, tipo: 'forum', archivos: [] })),
        ],
      },
    ],
  },
];

const snapshot = (entregas: Partial<Snapshot['entregas'][number]>[] = []): Snapshot => ({
  site: {} as Snapshot['site'],
  courses: [{ id: 11, fullname: 'Big Data Aplicado' }] as Snapshot['courses'],
  syncedAt: 0,
  entregas: entregas.map((e) => ({
    key: 'assign-1',
    nombre: 'Práctica 1',
    cursoId: 11,
    curso: 'Big Data Aplicado',
    fecha: 1_800_000_000,
    tipo: 'assign',
    estado: 'pendiente',
    ...e,
  })) as Snapshot['entregas'],
});

test('la primera sincronización solo guarda la foto, sin avisar de nada', () => {
  const r = calcularNovedades(null, contenido([archivo('a.pdf', 1)]), snapshot([{}]));
  assert.equal(r.novedades.length, 0);
  assert.ok(r.base.cursos['11']);
  assert.ok(r.base.entregas['assign-1']);
});

test('detecta apuntes nuevos, actualizados y actividades nuevas', () => {
  const { base } = calcularNovedades(null, contenido([archivo('a.pdf', 1)]), snapshot());
  const r = calcularNovedades(
    base,
    contenido([archivo('a.pdf', 2), archivo('b.pdf', 1)], [200]),
    snapshot(),
  );
  assert.deepEqual(r.novedades.map((n) => n.tipo).sort(), [
    'actividad',
    'archivo',
    'archivo-actualizado',
  ]);
});

test('nota publicada y cambio de fecha (a partir de 10 minutos)', () => {
  const { base } = calcularNovedades(null, contenido([]), snapshot([{}]));
  const pocoCambio = calcularNovedades(
    base,
    contenido([]),
    snapshot([{ fecha: 1_800_000_000 + 300 }]),
  );
  assert.equal(pocoCambio.novedades.length, 0);
  const r = calcularNovedades(
    base,
    contenido([]),
    snapshot([{ fecha: 1_800_086_400, nota: '8,50' }]),
  );
  assert.deepEqual(r.novedades.map((n) => n.tipo).sort(), ['fecha', 'nota']);
});

test('fusionarNovedades no duplica y olvida lo de hace más de 60 días', () => {
  const ahora = Date.now();
  const n = (id: string, diasAtras: number): Novedad => ({
    id,
    tipo: 'archivo',
    cursoId: 11,
    curso: 'BDA',
    titulo: id,
    fecha: ahora - diasAtras * 86400000,
    leida: false,
  });
  const r = fusionarNovedades([n('a', 1), n('vieja', 61)], [n('a', 0), n('b', 0)], ahora);
  assert.deepEqual(
    r.map((x) => x.id),
    ['b', 'a'],
  );
});
