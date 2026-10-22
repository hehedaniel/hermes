import assert from 'node:assert/strict';
import { test } from 'node:test';

import { type ActividadCalendario, actividadesHechas } from '@/lib/data';

/** Un Moodle de mentira: responde según la función pedida. */
const moodle = (respuestas: Record<string, (p: Record<string, unknown>) => unknown>) => ({
  call: async <T>(fn: string, p: Record<string, unknown> = {}) => {
    const r = respuestas[fn];
    if (!r) throw new Error(`no esperaba ${fn}`);
    return r(p) as T;
  },
});

const scorm: ActividadCalendario = {
  key: 'scorm-148755',
  cursoId: 13,
  cmid: 148755,
  tipo: 'scorm',
  instancia: 77,
};
const quiz: ActividadCalendario = {
  key: 'quiz-300',
  cursoId: 13,
  cmid: 300,
  tipo: 'quiz',
  instancia: 5,
};

test('SCORM completado según Moodle (✓ de finalización)', async () => {
  const hechas = await actividadesHechas(
    moodle({
      core_completion_get_activities_completion_status: () => ({
        statuses: [{ cmid: 148755, state: 1 }],
      }),
    }),
    1,
    [scorm],
  );
  assert.deepEqual([...hechas.hechas], ['scorm-148755']);
});

const intentos = (estado: string) =>
  moodle({
    core_completion_get_activities_completion_status: () => ({ statuses: [] }),
    mod_scorm_get_scorm_attempt_count: () => ({ attemptscount: 2 }),
    mod_scorm_get_scorm_user_data: (p) => {
      assert.equal(p.attempt, 2); // se mira el último intento
      return { data: [{ userdata: [{ element: 'cmi.core.lesson_status', value: estado }] }] };
    },
    mod_quiz_get_user_attempts: (p) => {
      assert.equal(p.status, 'finished'); // solo los intentos enviados
      return { attempts: [] };
    },
  });

test('SCORM sin finalización: hecho si el último intento quedó terminado', async () => {
  for (const estado of ['completed', 'passed', 'failed']) {
    const r = await actividadesHechas(intentos(estado), 1, [scorm]);
    assert.deepEqual([...r.hechas], ['scorm-148755'], estado);
  }
});

test('SCORM empezado y abandonado: no está hecho, sale como empezado', async () => {
  for (const estado of ['incomplete', 'browsed', 'not attempted']) {
    const r = await actividadesHechas(intentos(estado), 1, [scorm, quiz]);
    assert.equal(r.hechas.size, 0, estado);
    assert.deepEqual([...r.empezadas], ['scorm-148755'], estado);
  }
});

test('si Moodle falla, se queda como pendiente (no inventa)', async () => {
  const r = await actividadesHechas(moodle({}), 1, [scorm, quiz]);
  assert.equal(r.hechas.size + r.empezadas.size, 0);
});
