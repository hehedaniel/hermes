import assert from 'node:assert/strict';
import test from 'node:test';

import { ETIQUETA_ROL, rolDe } from '../src/lib/rol';

test('el rol sale de los roles de Moodle, mandando el más alto', () => {
  assert.equal(rolDe([{ shortname: 'student' }]), 'alumno');
  assert.equal(rolDe([{ shortname: 'student' }, { shortname: 'editingteacher' }]), 'profesor');
  assert.equal(rolDe([{ shortname: 'teacher' }]), 'profesor-sin-edicion');
  assert.equal(rolDe([{ shortname: 'manager' }]), 'gestor');
  assert.equal(rolDe([{ shortname: 'guest' }]), 'otro');
});

test('sin roles no se inventa ninguno', () => {
  assert.equal(rolDe(undefined), null);
  assert.equal(rolDe([]), null);
  assert.equal(ETIQUETA_ROL.alumno, 'Alumno');
});
