import assert from 'node:assert/strict';
import test from 'node:test';

import {
  adoptar,
  aplicar,
  aportaA,
  aTexto,
  claveMarca,
  clavePlantilla,
  leerRemotoJSON,
  type Local,
  mezclar,
  T_INICIAL,
} from '../src/lib/sync-datos';

const vacio: Local = {
  marcas: {},
  limite: null,
  plantillas: { plantillas: [], defecto: null, estilo: null, usarEstilo: true },
};

test('mezclar: gana el cambio más reciente en cada clave', () => {
  const a = { x: { v: 'f', t: 10 }, y: { v: 1, t: 5 } };
  const b = { x: { v: 's', t: 20 }, z: { v: 3, t: 1 } };
  const m = mezclar(a, b);
  assert.deepEqual(m.x, { v: 's', t: 20 });
  assert.deepEqual(m.y, { v: 1, t: 5 });
  assert.deepEqual(m.z, { v: 3, t: 1 });
});

test('mezclar: un borrado más reciente gana a un valor antiguo', () => {
  const m = mezclar({ k: { v: 'f', t: 5 } }, { k: { v: null, t: 9 } });
  assert.equal(m.k.v, null);
  const n = mezclar({ k: { v: null, t: 9 } }, { k: { v: 'f', t: 5 } });
  assert.equal(n.k.v, null);
});

test('mezclar es conmutativa salvo empates', () => {
  const a = { p: { v: 1, t: 3 }, q: { v: 2, t: 8 } };
  const b = { p: { v: 9, t: 4 }, q: { v: 7, t: 2 } };
  assert.deepEqual(mezclar(a, b), mezclar(b, a));
});

test('adoptar: lo que ya había se anota como antiguo y no pisa lo anotado', () => {
  const local: Local = {
    ...vacio,
    marcas: { '2026-10-05': { '0': 'f', '1': 's' } },
    limite: 0.2,
  };
  const reg = adoptar({ [claveMarca('2026-10-05', 0)]: { v: null, t: 50 } }, local);
  assert.equal(reg[claveMarca('2026-10-05', 0)].v, null); // el borrado anotado se respeta
  assert.deepEqual(reg[claveMarca('2026-10-05', 1)], { v: 's', t: T_INICIAL });
  assert.deepEqual(reg.limite, { v: 0.2, t: T_INICIAL });
});

test('aplicar: reconstruye marcas, plantillas, defecto y estilo; ignora borrados', () => {
  const reg = {
    [claveMarca('2026-10-05', 0)]: { v: 'f', t: 5 },
    [claveMarca('2026-10-05', 1)]: { v: null, t: 6 },
    [clavePlantilla('a')]: { v: { nombre: 'Uno', texto: 'T1', creada: 2 }, t: 3 },
    [clavePlantilla('b')]: { v: { nombre: 'Dos', texto: 'T2', creada: 1 }, t: 3 },
    [clavePlantilla('c')]: { v: null, t: 4 },
    defecto: { v: 'b', t: 4 },
    estilo: { v: { texto: 'mi estilo' }, t: 4 },
    usarEstilo: { v: false, t: 4 },
    limite: { v: 0.2, t: 4 },
  };
  const l = aplicar(reg, vacio);
  assert.deepEqual(l.marcas, { '2026-10-05': { '0': 'f' } });
  assert.deepEqual(
    l.plantillas.plantillas.map((p) => p.id),
    ['b', 'a'],
  );
  assert.equal(l.plantillas.defecto, 'b');
  assert.equal(l.plantillas.estilo?.texto, 'mi estilo');
  assert.equal(l.plantillas.usarEstilo, false);
  assert.equal(l.limite, 0.2);
});

test('aplicar: un defecto que apunta a una plantilla borrada se queda en null', () => {
  const reg = {
    [clavePlantilla('a')]: { v: null, t: 4 },
    defecto: { v: 'a', t: 3 },
  };
  assert.equal(aplicar(reg, vacio).plantillas.defecto, null);
});

test('dos dispositivos que marcan a la vez acaban igual', () => {
  const movil = { [claveMarca('2026-10-13', 2)]: { v: 'f', t: 100 } };
  const web = { [claveMarca('2026-10-13', 3)]: { v: 'f', t: 120 } };
  const juntos = mezclar(movil, web);
  assert.deepEqual(aplicar(juntos, vacio).marcas, { '2026-10-13': { '2': 'f', '3': 'f' } });
  assert.deepEqual(mezclar(web, movil), juntos);
});

test('aportaA y serialización', () => {
  const a = { x: { v: 1, t: 5 } };
  assert.equal(aportaA(a, {}), true);
  assert.equal(aportaA(a, { x: { v: 1, t: 5 } }), false);
  assert.equal(aportaA({ x: { v: 1, t: 4 } }, a), false);
  assert.deepEqual(leerRemotoJSON(aTexto(a)), a);
  assert.equal(leerRemotoJSON('no es json'), null);
  assert.equal(leerRemotoJSON('{"v":2,"reg":{}}'), null);
});
