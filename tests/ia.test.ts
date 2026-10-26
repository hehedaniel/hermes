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
  cabeceras,
  cuerpoAnthropic,
  cuerpoCompatible,
  cuerpoGemini,
  cuerpoOpenRouter,
  errorDeProveedor,
  maxTokensClaude,
  modeloRecomendado,
  necesitaTextoPdf,
  ordenarModelos,
  textoDeAnthropic,
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
    modeloRecomendado('openrouter', [
      { id: 'openai/gpt-x', nombre: 'GPT' },
      { id: 'meta-llama/llama-x:free', nombre: 'Llama', gratis: true },
      { id: 'deepseek/deepseek-x:free', nombre: 'DeepSeek', gratis: true },
    ]),
    'deepseek/deepseek-x:free',
  );
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

// ------------------------------------------------------------------ resto de proveedores

test('ChatGPT: PDF como archivo; DeepSeek: el texto del PDF, en una cadena', () => {
  const mensajes = [
    { rol: 'usuario' as const, texto: 'Hazla', adjuntos: [{ ...pdf, texto: 'Hola PDF' }] },
  ];
  const openai = cuerpoCompatible('openai', { modelo: 'gpt-5-mini', sistema: 'S', mensajes });
  const partes = openai.messages[1].content as { type: string }[];
  assert.equal(partes[0].type, 'file');
  assert.equal('plugins' in openai, false);

  const deepseek = cuerpoCompatible('deepseek', {
    modelo: 'deepseek-flash',
    sistema: 'S',
    mensajes,
  });
  const contenido = deepseek.messages[1].content as string;
  assert.equal(typeof contenido, 'string');
  assert.match(contenido, /Texto del PDF «enunciado\.pdf»/);
  assert.match(contenido, /Hola PDF/);
  assert.match(contenido, /Hazla$/);
  // Sin el texto sacado no se puede mandar el PDF a DeepSeek
  assert.throws(
    () =>
      cuerpoCompatible('deepseek', {
        modelo: 'x',
        sistema: 'S',
        mensajes: [{ rol: 'usuario', texto: '', adjuntos: [pdf] }],
      }),
    /texto/,
  );
});

test('Groq no ve imágenes: ni se ofrecen ni se mandan', () => {
  assert.equal(adjuntoCompatible('foto.png', 'image/png', 'groq'), false);
  assert.equal(adjuntoCompatible('foto.png', 'image/png', 'anthropic'), true);
  assert.equal(adjuntoCompatible('tarea.pdf', 'application/pdf', 'groq'), true);
  assert.throws(
    () =>
      cuerpoCompatible('groq', {
        modelo: 'x',
        sistema: 'S',
        mensajes: [
          {
            rol: 'usuario',
            texto: '',
            adjuntos: [{ nombre: 'f.png', mime: 'image/png', base64: 'x' }],
          },
        ],
      }),
    /no puede ver imágenes/,
  );
  assert.equal(necesitaTextoPdf('groq'), true);
  assert.equal(necesitaTextoPdf('anthropic'), false);
});

test('Claude: sistema aparte, el PDF como documento y límite de respuesta según el modelo', () => {
  const b = cuerpoAnthropic({
    modelo: 'claude-haiku-4-5',
    sistema: 'S',
    mensajes: [
      {
        rol: 'usuario',
        texto: 'Hazla',
        adjuntos: [pdf, { nombre: 'f.jpg', mime: 'image/jpeg', base64: 'iVB' }],
      },
      { rol: 'ia', texto: 'Hecho' },
    ],
  });
  assert.equal(b.system, 'S');
  assert.equal(b.max_tokens, 16000);
  assert.deepEqual(
    b.messages.map((m) => m.role),
    ['user', 'assistant'],
  );
  assert.deepEqual(b.messages[0].content[0], {
    type: 'document',
    source: { type: 'base64', media_type: 'application/pdf', data: 'JVBERi0=' },
  });
  assert.equal(b.messages[0].content[1].type, 'image');
  assert.equal(maxTokensClaude('claude-3-haiku-20240307'), 4096);
  assert.equal(
    textoDeAnthropic({
      content: [{ type: 'text', text: 'Hola' }],
      stop_reason: 'max_tokens',
    }).startsWith('Hola'),
    true,
  );
  assert.equal(cabeceras('anthropic', ' k ')['x-api-key'], 'k');
  assert.equal(cabeceras('deepseek', 'k').Authorization, 'Bearer k');
});

test('Sin saldo se distingue de pasarse del límite', () => {
  assert.equal(
    errorDeProveedor('anthropic', 400, {
      error: { message: 'Your credit balance is too low to access the Anthropic API.' },
    }).code,
    'saldo',
  );
  assert.equal(
    errorDeProveedor('openai', 429, {
      error: { code: 'insufficient_quota', message: 'You exceeded your current quota' },
    }).code,
    'saldo',
  );
  assert.equal(
    errorDeProveedor('deepseek', 402, { error: { message: 'Insufficient Balance' } }).code,
    'saldo',
  );
  // Gemini gratis usa "quota" para el límite diario: eso es esperar, no pagar
  assert.equal(
    errorDeProveedor('gemini', 429, {
      error: { message: 'You exceeded your current quota, please check your plan' },
    }).code,
    'cuota',
  );
});

test('Modelo recomendado de cada proveedor', () => {
  const m = (...ids: string[]) => ids.map((id) => ({ id, nombre: id }));
  assert.equal(
    modeloRecomendado('openai', m('gpt-4o', 'gpt-4.1-mini', 'gpt-5-mini', 'gpt-5')),
    'gpt-5-mini',
  );
  assert.equal(
    modeloRecomendado('anthropic', m('claude-sonnet-4-6', 'claude-haiku-4-5', 'claude-3-haiku')),
    'claude-haiku-4-5',
  );
  assert.equal(
    modeloRecomendado('deepseek', m('deepseek-v4-pro', 'deepseek-flash')),
    'deepseek-flash',
  );
  assert.equal(
    modeloRecomendado('mistral', m('mistral-large-latest', 'mistral-small-latest')),
    'mistral-small-latest',
  );
  assert.equal(
    modeloRecomendado('groq', m('qwen-x', 'llama-3.3-70b-versatile')),
    'llama-3.3-70b-versatile',
  );
  assert.equal(modeloRecomendado('deepseek', []), 'deepseek-flash');
});
