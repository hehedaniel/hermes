import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Entrega } from '@/lib/data';
import {
  documentosDe,
  extraerDocumentos,
  htmlParaPdf,
  markdownAHtml,
  nombreSeguro,
} from '@/lib/ia/documentos';
import { construirSistema } from '@/lib/ia/prompt';
import {
  adjuntoCompatible,
  agruparTurnos,
  base64ATexto,
  cuerpoGemini,
  cuerpoOpenRouter,
  errorDeProveedor,
  modeloRecomendado,
  ordenarModelos,
  textoDeGemini,
} from '@/lib/ia/proveedores';

const pdf = { nombre: 'enunciado.pdf', mime: 'application/pdf', base64: 'JVBERi0=' };
const py = {
  nombre: 'base.py',
  mime: '',
  base64: Buffer.from('print("hola ñ")').toString('base64'),
};

test('Gemini: sistema aparte, roles user/model y el PDF como inlineData', () => {
  const b = cuerpoGemini({
    sistema: 'Eres…',
    mensajes: [
      { rol: 'usuario', texto: 'Hazla', adjuntos: [pdf] },
      { rol: 'ia', texto: 'Hecho' },
    ],
  });
  assert.deepEqual(b.systemInstruction, { parts: [{ text: 'Eres…' }] });
  assert.deepEqual(
    b.contents.map((c) => c.role),
    ['user', 'model'],
  );
  assert.deepEqual(b.contents[0].parts[0], {
    inlineData: { mimeType: 'application/pdf', data: 'JVBERi0=' },
  });
  assert.deepEqual(b.contents[0].parts[1], { text: 'Hazla' });
});

test('Los archivos de código se pegan como texto (con tildes bien)', () => {
  const b = cuerpoGemini({
    sistema: '',
    mensajes: [{ rol: 'usuario', texto: 'Mira', adjuntos: [py] }],
  });
  const parte = b.contents[0].parts[0] as { text: string };
  assert.match(parte.text, /«base\.py»/);
  assert.match(parte.text, /print\("hola ñ"\)/);
  assert.equal(base64ATexto(Buffer.from('añeja €').toString('base64')), 'añeja €');
});

test('Un Word no se le puede pasar a la IA', () => {
  assert.equal(adjuntoCompatible('tarea.docx'), false);
  assert.equal(adjuntoCompatible('tarea.pdf'), true);
  assert.equal(adjuntoCompatible('foto.jpg', 'image/jpeg'), true);
  assert.equal(adjuntoCompatible('datos.csv'), true);
  assert.throws(
    () =>
      cuerpoGemini({
        sistema: '',
        mensajes: [
          { rol: 'usuario', texto: '', adjuntos: [{ nombre: 'a.docx', mime: '', base64: '' }] },
        ],
      }),
    /PDF/,
  );
});

test('Dos mensajes seguidos del mismo lado se juntan en uno', () => {
  const r = agruparTurnos([
    { rol: 'usuario', texto: 'uno', adjuntos: [pdf] },
    { rol: 'usuario', texto: 'dos' },
    { rol: 'ia', texto: 'vale' },
  ]);
  assert.equal(r.length, 2);
  assert.equal(r[0].texto, 'uno\n\ndos');
  assert.equal(r[0].adjuntos?.length, 1);
});

test('OpenRouter: mensaje de sistema, PDF como file y lector de PDF gratuito', () => {
  const b = cuerpoOpenRouter({
    modelo: 'google/gemini-2.5-flash',
    sistema: 'S',
    mensajes: [
      { rol: 'usuario', texto: 'Hola' },
      { rol: 'ia', texto: 'Qué tal' },
      { rol: 'usuario', texto: 'Mira', adjuntos: [pdf] },
    ],
  });
  assert.deepEqual(b.messages[0], { role: 'system', content: 'S' });
  assert.deepEqual(b.messages[1], { role: 'user', content: 'Hola' });
  assert.equal(b.messages[2].role, 'assistant');
  const partes = b.messages[3].content as { type: string; file?: { file_data: string } }[];
  assert.equal(partes[0].type, 'file');
  assert.equal(partes[0].file?.file_data, 'data:application/pdf;base64,JVBERi0=');
  assert.deepEqual(b.plugins, [{ id: 'file-parser', pdf: { engine: 'cloudflare-ai' } }]);
});

test('Respuesta de Gemini: se ignora el razonamiento y se avisa si se corta', () => {
  const r = textoDeGemini({
    candidates: [
      {
        content: { parts: [{ text: 'pensando…', thought: true }, { text: 'Hola' }] },
        finishReason: 'MAX_TOKENS',
      },
    ],
  });
  assert.match(r, /^Hola/);
  assert.match(r, /cortado/);
  assert.throws(() => textoDeGemini({ promptFeedback: { blockReason: 'SAFETY' } }), /seguridad/);
});

test('Errores de los proveedores en castellano', () => {
  assert.equal(
    errorDeProveedor('gemini', 400, {
      error: { message: 'API key not valid. Please pass a valid API key.' },
    }).code,
    'clave',
  );
  assert.equal(errorDeProveedor('gemini', 429, {}).code, 'cuota');
  assert.equal(errorDeProveedor('openrouter', 402, {}).code, 'saldo');
});

test('Modelo recomendado: el Flash estable más nuevo', () => {
  const modelos = [
    { id: 'gemini-2.0-flash', nombre: '' },
    { id: 'gemini-2.5-pro', nombre: '' },
    { id: 'gemini-3-flash-preview', nombre: '' },
    { id: 'gemini-2.5-flash', nombre: '' },
    { id: 'gemini-2.5-flash-lite', nombre: '' },
  ];
  assert.equal(modeloRecomendado('gemini', modelos), 'gemini-2.5-flash');
  assert.equal(ordenarModelos('gemini', modelos)[0].id, 'gemini-2.5-flash');
  assert.equal(
    ordenarModelos('openrouter', [
      { id: 'a', nombre: 'A' },
      { id: 'b:free', nombre: 'B', gratis: true },
    ])[0].id,
    'b:free',
  );
});

test('Documentos: se separan del texto de la respuesta', () => {
  const partes = extraerDocumentos(
    'Aquí tienes la memoria:\n\n<<<ARCHIVO nombre="memoria.pdf">>>\n# Memoria\n\nTexto\n<<<FIN>>>\n\nRevísala antes de entregar.',
  );
  assert.deepEqual(
    partes.map((p) => p.tipo),
    ['texto', 'documento', 'texto'],
  );
  const doc = partes[1].tipo === 'documento' ? partes[1].doc : null;
  assert.deepEqual(doc, { nombre: 'memoria.pdf', contenido: '# Memoria\n\nTexto', completo: true });
});

test('Documentos: varios, cortados a medias y envueltos en ```', () => {
  const docs = documentosDe(
    '<<<ARCHIVO nombre="a.py">>>\n```python\nprint(1)\n```\n<<<FIN>>>\n<<<ARCHIVO nombre="Memoria final">>>\n# Sin terminar',
  );
  assert.equal(docs.length, 2);
  assert.equal(docs[0].contenido, 'print(1)');
  assert.equal(docs[1].nombre, 'Memoria-final.pdf');
  assert.equal(docs[1].completo, false);
  assert.deepEqual(extraerDocumentos('Solo texto'), [{ tipo: 'texto', texto: 'Solo texto' }]);
});

test('Nombres de archivo válidos para Moodle', () => {
  assert.equal(nombreSeguro('Práctica 1: redes.pdf'), 'Practica-1-redes.pdf');
  assert.equal(nombreSeguro('  '), 'documento.pdf');
  assert.equal(nombreSeguro('script.py'), 'script.py');
});

test('Markdown → HTML para el PDF', () => {
  assert.match(
    markdownAHtml('# Hola\n\n| a | b |\n|---|---|\n| 1 | 2 |'),
    /<h1>Hola<\/h1>[\s\S]*<table>/,
  );
  const html = htmlParaPdf({ nombre: 'memoria.pdf', contenido: '**negrita**', completo: true });
  assert.match(html, /<title>memoria<\/title>/);
  assert.match(html, /<strong>negrita<\/strong>/);
  assert.match(html, /@page/);
});

test('El sistema lleva la tarea, el enunciado, cómo se entrega y las indicaciones del alumno', () => {
  const e: Entrega = {
    key: 'assign-1',
    nombre: 'Práctica 1',
    cursoId: 1,
    curso: 'Big Data',
    fecha: 1_793_000_000,
    tipo: 'assign',
    estado: 'pendiente',
    enunciado: '<p>Haz un <b>informe</b></p>',
    adjuntos: [
      { nombre: 'datos.csv', fileurl: 'u', size: 1, timemodified: 0, cursoId: 1, cmid: 1 },
    ],
    entregable: {
      assignId: 9,
      archivos: true,
      texto: false,
      maxArchivos: 1,
      tipos: ['.docx'],
      maxBytes: 0,
      borradores: false,
      declaracion: false,
    },
  };
  const s = construirSistema(e, 'Escribe sencillo');
  assert.match(s, /Práctica 1/);
  assert.match(s, /Haz un informe/);
  assert.match(s, /datos\.csv/);
  assert.match(s, /no admite PDF/);
  assert.match(s, /<<<ARCHIVO/);
  assert.match(s, /Escribe sencillo/);
});
