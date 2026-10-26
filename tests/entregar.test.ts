import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import {
  type ConfigEntrega,
  configEntrega,
  entregarEnMoodle,
  subirBorrador,
  tipoAdmitido,
} from '@/lib/entregar';
import type { Assignment } from '@/lib/moodle';

const tarea = (extra: Partial<Assignment>): Assignment => ({
  id: 77,
  cmid: 150000,
  course: 13,
  name: 'Práctica',
  duedate: 0,
  ...extra,
});

const config = (plugin: string, name: string, value: string) => ({
  plugin,
  subtype: 'assignsubmission',
  name,
  value,
});

test('Cómo se entrega una tarea, a partir de sus ajustes en Moodle', () => {
  const cfg = configEntrega(
    tarea({
      submissiondrafts: 0,
      requiresubmissionstatement: 1,
      configs: [
        config('file', 'enabled', '1'),
        config('file', 'maxfilesubmissions', '3'),
        config('file', 'filetypeslist', '.pdf,.docx'),
        config('file', 'maxsubmissionsizebytes', '2097152'),
        config('onlinetext', 'enabled', '0'),
        { plugin: 'comments', subtype: 'assignfeedback', name: 'enabled', value: '1' },
      ],
    }),
  );
  assert.deepEqual(cfg, {
    assignId: 77,
    archivos: true,
    texto: false,
    maxArchivos: 3,
    tipos: ['.pdf', '.docx'],
    maxBytes: 2_097_152,
    borradores: false,
    declaracion: true,
  });
  // Sin ningún tipo de entrega activo (o sin ajustes) no se puede entregar desde la app
  assert.equal(configEntrega(tarea({ configs: [config('file', 'enabled', '0')] })), undefined);
  assert.equal(configEntrega(tarea({})), undefined);
});

test('Tipos de archivo admitidos', () => {
  assert.equal(tipoAdmitido('memoria.pdf', []), true);
  assert.equal(tipoAdmitido('memoria.PDF', ['.pdf']), true);
  assert.equal(tipoAdmitido('memoria.pdf', ['.docx']), false);
  assert.equal(tipoAdmitido('memoria.pdf', ['document']), null); // grupo de Moodle: no se sabe
});

const cfg: ConfigEntrega = {
  assignId: 77,
  archivos: true,
  texto: false,
  maxArchivos: 1,
  tipos: [],
  maxBytes: 0,
  borradores: false,
  declaracion: false,
};

/** Moodle de mentira que apunta las llamadas. */
function moodle(respuestas: Record<string, unknown> = {}) {
  const llamadas: { fn: string; p: Record<string, unknown> }[] = [];
  return {
    llamadas,
    call: async <T>(fn: string, p: Record<string, unknown> = {}) => {
      llamadas.push({ fn, p });
      return (fn in respuestas ? respuestas[fn] : []) as T;
    },
  };
}

test('Entregar archivos: guarda la entrega con el itemid del borrador', async () => {
  const m = moodle({ mod_assign_get_submission_status: { lastattempt: { canedit: true } } });
  assert.equal(await entregarEnMoodle(m, cfg, { itemid: 555 }), 'enviada');
  assert.deepEqual(
    m.llamadas.map((l) => l.fn),
    ['mod_assign_get_submission_status', 'mod_assign_save_submission'],
  );
  assert.deepEqual(m.llamadas[1].p, { assignmentid: 77, plugindata: { files_filemanager: 555 } });
});

test('Con borradores, además se envía para calificar', async () => {
  const m = moodle({ mod_assign_get_submission_status: {} });
  await entregarEnMoodle(m, { ...cfg, borradores: true }, { itemid: 1 });
  assert.equal(m.llamadas.at(-1)?.fn, 'mod_assign_submit_for_grading');
  assert.equal(m.llamadas.at(-1)?.p.acceptsubmissionstatement, 1);
  // …salvo que solo se quiera guardar el borrador
  const m2 = moodle({ mod_assign_get_submission_status: {} });
  assert.equal(
    await entregarEnMoodle(m2, { ...cfg, borradores: true }, { itemid: 1 }, false),
    'borrador',
  );
  assert.equal(m2.llamadas.at(-1)?.fn, 'mod_assign_save_submission');
});

test('Texto en línea: pide una zona de borrador para el editor', async () => {
  const m = moodle({
    mod_assign_get_submission_status: {},
    core_files_get_unused_draft_itemid: { itemid: 42 },
  });
  await entregarEnMoodle(m, { ...cfg, archivos: false, texto: true }, { textoHtml: '<p>Hola</p>' });
  assert.deepEqual(m.llamadas.at(-1)?.p, {
    assignmentid: 77,
    plugindata: { onlinetext_editor: { text: '<p>Hola</p>', format: 1, itemid: 42 } },
  });
});

test('No se entrega si Moodle no deja cambiarla, y los avisos de Moodle son errores', async () => {
  await assert.rejects(
    entregarEnMoodle(
      moodle({ mod_assign_get_submission_status: { lastattempt: { canedit: false } } }),
      cfg,
      { itemid: 1 },
    ),
    /no deja cambiar/,
  );
  await assert.rejects(
    entregarEnMoodle(
      moodle({
        mod_assign_get_submission_status: {},
        mod_assign_save_submission: [
          { item: 'x', warningcode: 'couldnotsave', message: 'Fuera de plazo' },
        ],
      }),
      cfg,
      { itemid: 1 },
    ),
    /Fuera de plazo/,
  );
});

const fetchOriginal = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = fetchOriginal;
});

test('Subida: el segundo archivo va a la misma zona de borrador que el primero', async () => {
  const enviados: { url: string; itemid: string }[] = [];
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    const form = init.body as FormData;
    enviados.push({ url, itemid: String(form.get('itemid')) });
    return new Response(JSON.stringify([{ itemid: 900, filename: 'x' }]));
  }) as typeof fetch;
  const archivo = (nombre: string) => ({
    nombre,
    anadir: (form: FormData, campo: string) => form.append(campo, new Blob(['x']), nombre),
  });
  const itemid = await subirBorrador(
    { base: 'https://m', token: 't', call: async () => ({}) as never },
    [archivo('a.pdf'), archivo('b.pdf')],
  );
  assert.equal(itemid, 900);
  assert.deepEqual(enviados, [
    { url: 'https://m/webservice/upload.php', itemid: '0' },
    { url: 'https://m/webservice/upload.php', itemid: '900' },
  ]);
});

test('Subida rechazada por Moodle', async () => {
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({ error: 'Archivo demasiado grande', errorcode: 'maxbytes' }),
    )) as unknown as typeof fetch;
  await assert.rejects(
    subirBorrador({ base: 'https://m', token: 't', call: async () => ({}) as never }, [
      { nombre: 'a.pdf', anadir: () => {} },
    ]),
    /demasiado grande/,
  );
});
