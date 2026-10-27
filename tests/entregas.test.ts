import assert from 'node:assert/strict';
import { test } from 'node:test';

import { detalleEntrega } from '@/lib/data';

const archivo = (filename: string) => ({
  type: 'file',
  filename,
  filesize: 1000,
  timemodified: 5,
  fileurl: `https://moodle/pluginfile.php/1/${filename}`,
});

test('corrección: nota, fecha, comentario y archivos del profesor', () => {
  const { envio, correccion } = detalleEntrega(
    {
      lastattempt: {
        submission: { status: 'submitted', timemodified: 100 },
        gradingstatus: 'graded',
      },
      feedback: {
        gradefordisplay: '8,50 / 10,00',
        gradeddate: 200,
        plugins: [
          { type: 'comments', editorfields: [{ name: 'comments', text: '<p>Bien hecho</p>' }] },
          {
            type: 'file',
            fileareas: [{ area: 'feedback_files', files: [archivo('corregido.pdf')] }],
          },
        ],
      },
    },
    11,
    105,
  );
  assert.equal(correccion?.nota, '8,50 / 10,00');
  assert.equal(correccion?.fecha, 200);
  assert.equal(correccion?.comentario, '<p>Bien hecho</p>');
  assert.deepEqual(
    correccion?.archivos.map((a) => [a.nombre, a.cursoId, a.cmid]),
    [['corregido.pdf', 11, 105]],
  );
  assert.equal(envio?.fecha, 100);
  assert.equal(envio?.pendienteDeCorregir, false);
});

test('entrega enviada sin corregir: tus archivos y "pendiente de corregir"', () => {
  const { envio, correccion } = detalleEntrega(
    {
      lastattempt: {
        submission: {
          status: 'submitted',
          timemodified: 100,
          plugins: [
            {
              type: 'file',
              fileareas: [{ area: 'submission_files', files: [archivo('mio.pdf')] }],
            },
            { type: 'onlinetext', editorfields: [{ name: 'onlinetext', text: '<p>&nbsp;</p>' }] },
          ],
        },
        gradingstatus: 'notgraded',
      },
    },
    11,
    105,
  );
  assert.equal(correccion, undefined);
  assert.deepEqual(
    envio?.archivos.map((a) => a.nombre),
    ['mio.pdf'],
  );
  assert.equal(envio?.texto, undefined); // un texto vacío no cuenta
  assert.equal(envio?.pendienteDeCorregir, true);
});

test('sin entregar: ni envío ni corrección', () => {
  assert.deepEqual(detalleEntrega({ lastattempt: { submission: { status: 'new' } } }, 11, 105), {
    envio: undefined,
    correccion: undefined,
  });
});

test('corrección con editpdf: solo el PDF anotado, sin imágenes de página ni sellos', () => {
  const { correccion } = detalleEntrega(
    {
      feedback: {
        gradefordisplay: '9,00 / 10,00',
        plugins: [
          {
            type: 'editpdf',
            fileareas: [
              { area: 'download', files: [archivo('combined.pdf')] },
              {
                area: 'pages',
                files: [archivo('image_page0.png'), archivo('image_page1.png')],
              },
              {
                area: 'stamps',
                files: [archivo('cross.png'), archivo('smile.png'), archivo('sad.png')],
              },
            ],
          },
        ],
      },
    },
    11,
    105,
  );
  assert.deepEqual(
    correccion?.archivos.map((a) => a.nombre),
    ['combined.pdf'],
  );
});
