/**
 * Peticiones a la IA. Cada usuario elige proveedor y pone su propia clave; la app habla
 * directamente con él, sin servidor. Hay tres formatos de API:
 *  - Gemini (Google)
 *  - Claude (Anthropic)
 *  - el de OpenAI, que también usan OpenRouter, DeepSeek, Mistral y Groq
 * Sin dependencias de React Native: se puede probar en Node.
 */

export type Proveedor =
  'gemini' | 'openrouter' | 'openai' | 'anthropic' | 'deepseek' | 'mistral' | 'groq';

type Formato = 'gemini' | 'anthropic' | 'openai';

export type InfoProveedor = {
  nombre: string;
  /** Lo que se ve en la lista: "Gratis", "De pago"… */
  etiqueta: string;
  gratis: boolean;
  /** Una frase para la lista */
  resumen: string;
  puede: string[];
  noPuede: string[];
  urlClave: string;
  ayudaClave: string;
  placeholderClave: string;
  modeloPorDefecto: string;
  formato: Formato;
  /** URL base de la API (formato OpenAI) */
  base?: string;
  /** directo: lee el PDF tal cual · plugin: OpenRouter lo pasa a texto · texto: Hermes le pasa el texto */
  pdf: 'directo' | 'plugin' | 'texto';
  imagenes: boolean;
};

const PDF_COMO_TEXTO =
  'No lee PDF directamente: Hermes saca el texto del PDF y se lo pasa (no ve las imágenes del PDF, y con un PDF escaneado no hay texto que pasar)';

/** Los proveedores, en el orden en que salen en Ajustes. */
export const PROVEEDORES: Record<Proveedor, InfoProveedor> = {
  gemini: {
    nombre: 'Gemini',
    etiqueta: 'Gratis',
    gratis: true,
    resumen: 'Google. Gratis con límite diario; lee PDF e imágenes.',
    puede: [
      'Gratis con tu cuenta de Google, con un límite de peticiones al día',
      'Lee los PDF y las imágenes de la tarea tal cual',
    ],
    noPuede: [
      'En el plan gratis, Google puede usar tus conversaciones para mejorar sus productos',
      'Cuando llegas al límite del día hay que esperar o cambiar de proveedor',
    ],
    urlClave: 'https://aistudio.google.com/apikey',
    ayudaClave: 'En Google AI Studio → Get API key, en un proyecto sin facturación.',
    placeholderClave: 'AIza…',
    modeloPorDefecto: 'gemini-2.5-flash',
    formato: 'gemini',
    pdf: 'directo',
    imagenes: true,
  },
  openrouter: {
    nombre: 'OpenRouter',
    etiqueta: 'Gratis con límites',
    gratis: true,
    resumen: 'Una clave para cientos de modelos (ChatGPT, Claude, DeepSeek, Llama…).',
    puede: [
      'Una sola clave para modelos de muchas empresas',
      'Modelos gratis (los «:free»): unas 50 peticiones al día sin pagar nada',
      'Lee los PDF (los pasa a texto antes de dárselos al modelo)',
    ],
    noPuede: [
      'Los modelos de pago necesitan saldo en OpenRouter, que cobra una pequeña comisión',
      'Los gratis a veces están saturados y cambian a menudo',
      'Las imágenes solo las ven algunos modelos',
    ],
    urlClave: 'https://openrouter.ai/settings/keys',
    ayudaClave: 'Crea una cuenta en OpenRouter y una clave en Settings → Keys.',
    placeholderClave: 'sk-or-…',
    modeloPorDefecto: 'openrouter/auto',
    formato: 'openai',
    base: 'https://openrouter.ai/api/v1',
    pdf: 'plugin',
    imagenes: true,
  },
  openai: {
    nombre: 'ChatGPT',
    etiqueta: 'De pago',
    gratis: false,
    resumen: 'OpenAI, los modelos GPT de ChatGPT. Lee PDF e imágenes.',
    puede: [
      'Los modelos GPT, los mismos de ChatGPT',
      'Lee los PDF y las imágenes de la tarea tal cual',
    ],
    noPuede: [
      'No es gratis: hay que poner saldo en la plataforma de OpenAI',
      'La suscripción ChatGPT Plus no sirve: la API se paga aparte',
    ],
    urlClave: 'https://platform.openai.com/api-keys',
    ayudaClave: 'En platform.openai.com → API keys. Necesitas saldo en Billing.',
    placeholderClave: 'sk-…',
    modeloPorDefecto: 'gpt-5-mini',
    formato: 'openai',
    base: 'https://api.openai.com/v1',
    pdf: 'directo',
    imagenes: true,
  },
  anthropic: {
    nombre: 'Claude',
    etiqueta: 'De pago',
    gratis: false,
    resumen: 'Anthropic. Lee PDF (con sus tablas y gráficos) e imágenes.',
    puede: [
      'Los modelos Claude (Haiku, Sonnet, Opus)',
      'Lee los PDF y las imágenes de la tarea tal cual',
    ],
    noPuede: [
      'No es gratis: hay que poner saldo (desde 5 $) en la consola de Anthropic',
      'La suscripción Claude Pro no sirve: la API se paga aparte',
    ],
    urlClave: 'https://console.anthropic.com/settings/keys',
    ayudaClave: 'En la consola de Anthropic → API keys. Necesitas saldo en Billing.',
    placeholderClave: 'sk-ant-…',
    modeloPorDefecto: 'claude-haiku-4-5',
    formato: 'anthropic',
    pdf: 'directo',
    imagenes: true,
  },
  deepseek: {
    nombre: 'DeepSeek',
    etiqueta: 'De pago (muy barato)',
    gratis: false,
    resumen: 'El más barato de los de pago: un trabajo cuesta céntimos.',
    puede: ['El de pago más barato: un trabajo entero cuesta céntimos', 'Contexto muy largo'],
    noPuede: [
      'No es gratis: hay que poner saldo en la plataforma de DeepSeek',
      PDF_COMO_TEXTO,
      'En Hermes no ve imágenes',
    ],
    urlClave: 'https://platform.deepseek.com/api_keys',
    ayudaClave: 'En platform.deepseek.com → API keys. Necesitas saldo en Top up.',
    placeholderClave: 'sk-…',
    modeloPorDefecto: 'deepseek-flash',
    formato: 'openai',
    base: 'https://api.deepseek.com',
    pdf: 'texto',
    imagenes: false,
  },
  mistral: {
    nombre: 'Mistral',
    etiqueta: 'Gratis con límites',
    gratis: true,
    resumen: 'Francesa. Plan gratis con bastante uso, a cambio de tus datos.',
    puede: ['Plan gratis («Experiment») con bastante uso al mes'],
    noPuede: [
      'En el plan gratis, Mistral usa tus conversaciones para entrenar sus modelos',
      PDF_COMO_TEXTO,
      'En Hermes no ve imágenes',
    ],
    urlClave: 'https://console.mistral.ai/api-keys',
    ayudaClave: 'En console.mistral.ai elige el plan Experiment y crea una clave en API keys.',
    placeholderClave: 'Tu clave de Mistral',
    modeloPorDefecto: 'mistral-small-latest',
    formato: 'openai',
    base: 'https://api.mistral.ai/v1',
    pdf: 'texto',
    imagenes: false,
  },
  groq: {
    nombre: 'Groq',
    etiqueta: 'Gratis',
    gratis: true,
    resumen: 'Gratis y muy rápido, con modelos abiertos (Llama, Qwen…).',
    puede: ['Gratis, unas 1.000 peticiones al día', 'Respuestas muy rápidas'],
    noPuede: [
      'Solo modelos abiertos (Llama, Qwen…), no ChatGPT ni Claude',
      PDF_COMO_TEXTO,
      'En Hermes no ve imágenes',
    ],
    urlClave: 'https://console.groq.com/keys',
    ayudaClave: 'Crea una cuenta en console.groq.com y una clave en API Keys.',
    placeholderClave: 'gsk_…',
    modeloPorDefecto: 'llama-3.3-70b-versatile',
    formato: 'openai',
    base: 'https://api.groq.com/openai/v1',
    pdf: 'texto',
    imagenes: false,
  },
};

export const LISTA_PROVEEDORES = Object.keys(PROVEEDORES) as Proveedor[];

/** ¿Hay que sacar el texto de los PDF antes de pasárselos a este proveedor? */
export const necesitaTextoPdf = (p: Proveedor) => PROVEEDORES[p].pdf === 'texto';

/** Un archivo que se le pasa a la IA (el PDF del enunciado, una imagen…). */
export type AdjuntoIA = {
  nombre: string;
  mime: string;
  base64: string;
  /** Texto del PDF, para los proveedores que no leen PDF */
  texto?: string;
};

export type MensajeIA = { rol: 'usuario' | 'ia'; texto: string; adjuntos?: AdjuntoIA[] };

export type PeticionIA = {
  proveedor: Proveedor;
  clave: string;
  modelo: string;
  sistema: string;
  mensajes: MensajeIA[];
  signal?: AbortSignal;
};

export type ModeloIA = { id: string; nombre: string; gratis?: boolean };

export class IAError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'IAError';
  }
}

const GEMINI = 'https://generativelanguage.googleapis.com/v1beta';
const ANTHROPIC = 'https://api.anthropic.com/v1';
/** Las respuestas largas (un trabajo entero) pueden tardar; más de esto es que algo va mal. */
const TIMEOUT_MS = 180_000;
/** Lo que aceptan los proveedores en una petición, con margen (el base64 ocupa un 33 % más). */
export const MAX_ADJUNTOS_BYTES = 15 * 1024 * 1024;

// ------------------------------------------------------------------ adjuntos

const EXT_TEXTO = [
  'txt', 'md', 'csv', 'tsv', 'json', 'ipynb', 'py', 'js', 'ts', 'tsx', 'jsx', 'java', 'c', 'cpp',
  'h', 'cs', 'kt', 'sql', 'html', 'css', 'xml', 'yml', 'yaml', 'r', 'sh', 'php', 'go', 'rs',
]; // prettier-ignore

const extension = (nombre: string) =>
  nombre.includes('.') ? nombre.split('.').pop()!.toLowerCase() : '';

export const esPdfAdjunto = (nombre: string, mime?: string) =>
  mime === 'application/pdf' || extension(nombre) === 'pdf';

/** Cómo le llega un archivo a la IA: como archivo (PDF, imagen) o pegado como texto (código, CSV…). */
export type AdjuntoPreparado =
  | { tipo: 'archivo'; nombre: string; mime: string; base64: string }
  | { tipo: 'texto'; nombre: string; texto: string; dePdf?: boolean };

export function prepararAdjunto(a: AdjuntoIA, proveedor: Proveedor = 'gemini'): AdjuntoPreparado {
  const info = PROVEEDORES[proveedor];
  if (esPdfAdjunto(a.nombre, a.mime)) {
    if (info.pdf !== 'texto')
      return { tipo: 'archivo', nombre: a.nombre, mime: 'application/pdf', base64: a.base64 };
    if (a.texto === undefined)
      throw new IAError('pdf', `No se pudo sacar el texto de «${a.nombre}» para ${info.nombre}.`);
    return { tipo: 'texto', nombre: a.nombre, texto: a.texto, dePdf: true };
  }
  if (a.mime.startsWith('image/')) {
    if (!info.imagenes)
      throw new IAError(
        'tipo',
        `${info.nombre} no puede ver imágenes («${a.nombre}»). Para eso usa Gemini, ChatGPT o Claude.`,
      );
    return { tipo: 'archivo', nombre: a.nombre, mime: a.mime, base64: a.base64 };
  }
  if (EXT_TEXTO.includes(extension(a.nombre)) || a.mime.startsWith('text/'))
    return { tipo: 'texto', nombre: a.nombre, texto: base64ATexto(a.base64) };
  throw new IAError(
    'tipo',
    `La IA no puede leer «${a.nombre}». Sirven PDF, imágenes y archivos de texto o código; si es un Word o un PowerPoint, guárdalo antes como PDF.`,
  );
}

/** ¿Se le puede pasar este archivo a la IA de este proveedor? */
export function adjuntoCompatible(nombre: string, mime?: string, proveedor: Proveedor = 'gemini') {
  if (esPdfAdjunto(nombre, mime)) return true;
  try {
    prepararAdjunto({ nombre, mime: mime ?? '', base64: '' }, proveedor);
    return true;
  } catch {
    return false;
  }
}

/** Base64 → texto UTF-8 (sin depender de TextDecoder, que no siempre está en el móvil). */
export function base64ATexto(b64: string) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  if (typeof TextDecoder !== 'undefined') return new TextDecoder().decode(bytes);
  let out = '';
  for (let i = 0; i < bytes.length;) {
    const b = bytes[i++];
    let cp = b;
    if (b >= 0xf0)
      cp =
        ((b & 7) << 18) | ((bytes[i++] & 63) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63);
    else if (b >= 0xe0) cp = ((b & 15) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63);
    else if (b >= 0xc0) cp = ((b & 31) << 6) | (bytes[i++] & 63);
    out += String.fromCodePoint(cp);
  }
  return out;
}

const textoDeAdjunto = (a: { nombre: string; texto: string; dePdf?: boolean }) =>
  a.dePdf
    ? `Texto del PDF «${a.nombre}»:\n"""\n${a.texto.trim() || '(el PDF no tiene texto: puede ser escaneado)'}\n"""`
    : `Contenido del archivo «${a.nombre}»:\n\`\`\`\n${a.texto}\n\`\`\``;

/**
 * Junta los mensajes seguidos del mismo lado (p. ej. dos tuyos si una respuesta falló o se
 * canceló): algunos modelos exigen que se alternen usuario e IA.
 */
export function agruparTurnos(mensajes: MensajeIA[]): MensajeIA[] {
  const out: MensajeIA[] = [];
  for (const m of mensajes) {
    const prev = out[out.length - 1];
    if (prev && prev.rol === m.rol) {
      out[out.length - 1] = {
        rol: m.rol,
        texto: [prev.texto, m.texto].filter(Boolean).join('\n\n'),
        adjuntos: [...(prev.adjuntos ?? []), ...(m.adjuntos ?? [])],
      };
    } else out.push(m);
  }
  return out;
}

const AVISO_CORTADA = '\n\n_(La respuesta se ha cortado por largo. Pídele que continúe.)_';

// ------------------------------------------------------------------ Gemini

export function cuerpoGemini(p: Pick<PeticionIA, 'sistema' | 'mensajes'>) {
  return {
    systemInstruction: { parts: [{ text: p.sistema }] },
    contents: agruparTurnos(p.mensajes).map((m) => {
      const adjuntos = (m.adjuntos ?? []).map((a) => prepararAdjunto(a, 'gemini'));
      return {
        role: m.rol === 'ia' ? 'model' : 'user',
        parts: [
          ...adjuntos.map((a) =>
            a.tipo === 'archivo'
              ? { inlineData: { mimeType: a.mime, data: a.base64 } }
              : { text: textoDeAdjunto(a) },
          ),
          { text: m.texto || '(sin texto)' },
        ],
      };
    }),
  };
}

export function textoDeGemini(data: any): string {
  const cand = data?.candidates?.[0];
  const texto = (cand?.content?.parts ?? [])
    .filter((p: any) => typeof p.text === 'string' && !p.thought)
    .map((p: any) => p.text)
    .join('');
  if (!texto) {
    const motivo = data?.promptFeedback?.blockReason ?? cand?.finishReason;
    throw new IAError(
      'vacia',
      motivo === 'SAFETY' || data?.promptFeedback?.blockReason
        ? 'Gemini no ha querido responder a esto (filtro de seguridad). Prueba a reformularlo.'
        : `Gemini no ha devuelto respuesta${motivo ? ` (${motivo})` : ''}. Prueba otra vez.`,
    );
  }
  return cand?.finishReason === 'MAX_TOKENS' ? texto + AVISO_CORTADA : texto;
}

// ------------------------------------------------------------------ Claude (Anthropic)

/** Máximo de la respuesta: los Claude 3 antiguos admiten menos que los actuales. */
export function maxTokensClaude(modelo: string) {
  if (/claude-3-(haiku|sonnet|opus)/.test(modelo)) return 4096;
  if (/claude-3-5/.test(modelo)) return 8192;
  return 16000;
}

export function cuerpoAnthropic(p: Pick<PeticionIA, 'sistema' | 'mensajes' | 'modelo'>) {
  return {
    model: p.modelo,
    max_tokens: maxTokensClaude(p.modelo),
    system: p.sistema,
    messages: agruparTurnos(p.mensajes).map((m) => ({
      role: m.rol === 'ia' ? 'assistant' : 'user',
      content: [
        ...(m.adjuntos ?? [])
          .map((a) => prepararAdjunto(a, 'anthropic'))
          .map((a) =>
            a.tipo === 'texto'
              ? { type: 'text', text: textoDeAdjunto(a) }
              : {
                  type: a.mime === 'application/pdf' ? 'document' : 'image',
                  source: { type: 'base64', media_type: a.mime, data: a.base64 },
                },
          ),
        { type: 'text', text: m.texto || '(sin texto)' },
      ],
    })),
  };
}

export function textoDeAnthropic(data: any): string {
  const texto = (data?.content ?? [])
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('');
  if (!texto) throw new IAError('vacia', 'Claude no ha devuelto respuesta. Prueba otra vez.');
  return data?.stop_reason === 'max_tokens' ? texto + AVISO_CORTADA : texto;
}

// ------------------------------------------------------------------ formato OpenAI

/** Cuerpo para OpenAI y los que usan su formato (OpenRouter, DeepSeek, Mistral, Groq). */
export function cuerpoCompatible(
  proveedor: Proveedor,
  p: Pick<PeticionIA, 'sistema' | 'mensajes' | 'modelo'>,
) {
  let hayPdf = false;
  const messages = [
    { role: 'system', content: p.sistema },
    ...agruparTurnos(p.mensajes).map((m) => {
      const partes = [
        ...(m.adjuntos ?? [])
          .map((a) => prepararAdjunto(a, proveedor))
          .map((a) => {
            if (a.tipo === 'texto') return { type: 'text', text: textoDeAdjunto(a) };
            const url = `data:${a.mime};base64,${a.base64}`;
            if (a.mime.startsWith('image/')) return { type: 'image_url', image_url: { url } };
            hayPdf = true;
            return { type: 'file', file: { filename: a.nombre, file_data: url } };
          }),
        { type: 'text', text: m.texto || '(sin texto)' },
      ];
      const role = m.rol === 'ia' ? 'assistant' : 'user';
      // Si todo es texto, como una cadena: algunos modelos no aceptan la lista de partes
      return partes.every((x) => x.type === 'text')
        ? { role, content: partes.map((x) => (x as { text: string }).text).join('\n\n') }
        : { role, content: partes };
    }),
  ];
  return {
    model: p.modelo,
    messages,
    // OpenRouter: los PDF se pasan a texto con su lector gratuito (el de por defecto puede cobrar)
    ...(proveedor === 'openrouter' && hayPdf
      ? { plugins: [{ id: 'file-parser', pdf: { engine: 'cloudflare-ai' } }] }
      : {}),
  };
}

/** @deprecated nombre antiguo */
export const cuerpoOpenRouter = (p: Pick<PeticionIA, 'sistema' | 'mensajes' | 'modelo'>) =>
  cuerpoCompatible('openrouter', p);

export function textoDeCompatible(data: any, nombre = 'La IA'): string {
  const msg = data?.choices?.[0]?.message?.content;
  const texto =
    typeof msg === 'string'
      ? msg
      : Array.isArray(msg)
        ? msg.map((p: any) => p.text ?? '').join('')
        : '';
  if (!texto) throw new IAError('vacia', `${nombre} no ha devuelto respuesta. Prueba otra vez.`);
  return data?.choices?.[0]?.finish_reason === 'length' ? texto + AVISO_CORTADA : texto;
}

// ------------------------------------------------------------------ errores y peticiones

/** Mensaje de error legible a partir de la respuesta HTTP del proveedor. */
export function errorDeProveedor(proveedor: Proveedor, status: number, data: any): IAError {
  const nombre = PROVEEDORES[proveedor].nombre;
  const msg: string = data?.error?.message ?? (typeof data?.error === 'string' ? data.error : '');
  const codigo = `${data?.error?.code ?? ''} ${data?.error?.type ?? ''}`;
  if (
    status === 402 ||
    /insufficient_quota/.test(codigo) ||
    /credit balance|insufficient balance/i.test(msg)
  )
    return new IAError(
      'saldo',
      PROVEEDORES[proveedor].gratis
        ? `${nombre}: ese modelo es de pago y no tienes saldo. Elige uno gratis en Ajustes.`
        : `${nombre}: no tienes saldo. Recarga en su web o elige otro proveedor en Ajustes.`,
    );
  if ((status === 400 && /api key|api_key/i.test(msg)) || status === 401 || status === 403)
    return new IAError('clave', `${nombre} no acepta la clave. Revísala en Ajustes.`);
  if (status === 404)
    return new IAError('modelo', `${nombre} no encuentra el modelo. Elige otro en Ajustes.`);
  if (status === 429)
    return new IAError(
      'cuota',
      `Has llegado al límite de ${nombre} por ahora. Espera un poco o prueba con otro modelo.`,
    );
  if (status >= 500)
    return new IAError('saturado', `${nombre} está saturado o caído. Prueba en un rato.`);
  return new IAError('http', `${nombre} respondió con un error ${status}${msg ? `: ${msg}` : ''}`);
}

async function pedirJson(
  proveedor: Proveedor,
  url: string,
  init: RequestInit,
  signalExterna?: AbortSignal,
): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const cancelar = () => ctrl.abort();
  signalExterna?.addEventListener('abort', cancelar);
  try {
    let res: Response;
    try {
      res = await fetch(url, { ...init, signal: ctrl.signal });
    } catch {
      if (signalExterna?.aborted) throw new IAError('cancelada', 'Cancelado.');
      throw ctrl.signal.aborted
        ? new IAError('timeout', 'La IA está tardando demasiado. Prueba otra vez.')
        : new IAError(
            'red',
            `No se pudo conectar con ${PROVEEDORES[proveedor].nombre}. ¿Tienes internet?`,
          );
    }
    let data: any = null;
    try {
      data = await res.json();
    } catch {
      if (signalExterna?.aborted) throw new IAError('cancelada', 'Cancelado.');
    }
    if (!res.ok || data?.error) throw errorDeProveedor(proveedor, res.ok ? 400 : res.status, data);
    return data;
  } finally {
    clearTimeout(timer);
    signalExterna?.removeEventListener('abort', cancelar);
  }
}

/** Cabeceras de cada proveedor con la clave. */
export function cabeceras(proveedor: Proveedor, clave: string): Record<string, string> {
  const k = clave.trim();
  const formato = PROVEEDORES[proveedor].formato;
  if (formato === 'gemini') return { 'x-goog-api-key': k };
  if (formato === 'anthropic')
    return {
      'x-api-key': k,
      'anthropic-version': '2023-06-01',
      // Sin esto Anthropic rechaza las peticiones hechas desde un navegador (la versión web)
      'anthropic-dangerous-direct-browser-access': 'true',
    };
  return {
    Authorization: `Bearer ${k}`,
    ...(proveedor === 'openrouter'
      ? { 'HTTP-Referer': 'https://github.com/hehedaniel/hermes', 'X-Title': 'Hermes' }
      : {}),
  };
}

const sinPrefijo = (modelo: string) => modelo.replace(/^models\//, '');

/** Manda la conversación a la IA y devuelve el texto de su respuesta. */
export async function pedirIA(p: PeticionIA): Promise<string> {
  const info = PROVEEDORES[p.proveedor];
  if (!p.clave.trim())
    throw new IAError(
      'clave',
      `Falta la clave de ${info.nombre}. Ponla en Ajustes → Inteligencia artificial.`,
    );
  const headers = { 'Content-Type': 'application/json', ...cabeceras(p.proveedor, p.clave) };
  if (info.formato === 'gemini') {
    const url = `${GEMINI}/models/${encodeURIComponent(sinPrefijo(p.modelo))}:generateContent`;
    const data = await pedirJson(
      p.proveedor,
      url,
      { method: 'POST', headers, body: JSON.stringify(cuerpoGemini(p)) },
      p.signal,
    );
    return textoDeGemini(data);
  }
  if (info.formato === 'anthropic') {
    const data = await pedirJson(
      p.proveedor,
      `${ANTHROPIC}/messages`,
      { method: 'POST', headers, body: JSON.stringify(cuerpoAnthropic(p)) },
      p.signal,
    );
    return textoDeAnthropic(data);
  }
  const data = await pedirJson(
    p.proveedor,
    `${info.base}/chat/completions`,
    { method: 'POST', headers, body: JSON.stringify(cuerpoCompatible(p.proveedor, p)) },
    p.signal,
  );
  return textoDeCompatible(data, info.nombre);
}

// ------------------------------------------------------------------ modelos

/** Modelos de cada proveedor que sirven para chatear (sin los de voz, imágenes, embeddings…). */
const DESCARTAR: Partial<Record<Proveedor, RegExp>> = {
  gemini: /embedding|aqa|imagen|image|tts|audio|live|robotics|computer-use|veo/i,
  openai:
    /audio|realtime|tts|transcribe|image|search|embedding|instruct|moderation|dall|whisper|davinci|babbage|codex/i,
  mistral: /embed|ocr|moderation|transcribe|voxtral/i,
  groq: /whisper|tts|guard|playai|orpheus/i,
};

/** Modelos que se pueden usar con esa clave. */
export async function listarModelos(proveedor: Proveedor, clave: string): Promise<ModeloIA[]> {
  const info = PROVEEDORES[proveedor];
  const descartar = DESCARTAR[proveedor];
  if (proveedor !== 'openrouter' && !clave.trim())
    throw new IAError('clave', `Pon primero la clave de ${info.nombre}.`);
  const headers = proveedor === 'openrouter' ? {} : cabeceras(proveedor, clave);

  if (info.formato === 'gemini') {
    const data = await pedirJson(proveedor, `${GEMINI}/models?pageSize=200`, { headers });
    return ordenarModelos(
      proveedor,
      (data?.models ?? [])
        .filter(
          (m: any) =>
            (m.supportedGenerationMethods ?? []).includes('generateContent') &&
            !descartar?.test(m.name),
        )
        .map((m: any) => ({ id: sinPrefijo(m.name), nombre: m.displayName ?? sinPrefijo(m.name) })),
    );
  }
  if (info.formato === 'anthropic') {
    const data = await pedirJson(proveedor, `${ANTHROPIC}/models?limit=100`, { headers });
    // La API ya los da del más nuevo al más antiguo
    return (data?.data ?? []).map((m: any) => ({ id: m.id, nombre: m.display_name ?? m.id }));
  }
  const data = await pedirJson(proveedor, `${info.base}/models`, { headers });
  return ordenarModelos(
    proveedor,
    (data?.data ?? [])
      .filter(
        (m: any) =>
          !descartar?.test(m.id) &&
          (proveedor !== 'openai' || /^(gpt-|o\d|chatgpt)/.test(m.id)) &&
          m.capabilities?.completion_chat !== false &&
          (m.architecture?.output_modalities ?? ['text']).includes('text'),
      )
      .map((m: any) => ({
        id: m.id,
        nombre: m.name ?? m.id,
        gratis:
          proveedor === 'openrouter'
            ? m.id.endsWith(':free') || (m.pricing?.prompt === '0' && m.pricing?.completion === '0')
            : undefined,
      })),
  );
}

/** Versión de un modelo (2.5, 5…) para poner primero los más nuevos. */
const version = (id: string, prefijo: string) =>
  Number(id.match(new RegExp(`${prefijo}-(\\d+(?:\\.\\d+)?)`))?.[1] ?? 0);
const esEstable = (id: string) => !/preview|exp|latest|-\d{3}$|-\d{2}-\d{2}/.test(id);

export function ordenarModelos(proveedor: Proveedor, modelos: ModeloIA[]): ModeloIA[] {
  if (proveedor === 'gemini') {
    // Primero los estables y más nuevos; dentro de la misma versión, flash antes que pro (más cuota gratis)
    const peso = (id: string) =>
      id.includes('flash') && !id.includes('lite') ? 0 : id.includes('pro') ? 1 : 2;
    return [...modelos].sort(
      (a, b) =>
        Number(esEstable(b.id)) - Number(esEstable(a.id)) ||
        version(b.id, 'gemini') - version(a.id, 'gemini') ||
        peso(a.id) - peso(b.id) ||
        a.id.localeCompare(b.id),
    );
  }
  if (proveedor === 'openai') {
    return [...modelos].sort(
      (a, b) => version(b.id, 'gpt') - version(a.id, 'gpt') || a.id.localeCompare(b.id),
    );
  }
  return [...modelos].sort(
    (a, b) => Number(!!b.gratis) - Number(!!a.gratis) || a.nombre.localeCompare(b.nombre),
  );
}

/** El modelo que se usa si el usuario no ha elegido ninguno. */
export function modeloRecomendado(proveedor: Proveedor, modelos: ModeloIA[]): string {
  const porDefecto = PROVEEDORES[proveedor].modeloPorDefecto;
  const ids = modelos.map((m) => m.id);
  switch (proveedor) {
    case 'gemini': {
      const flash = ordenarModelos('gemini', modelos).find((m) =>
        /^gemini-[\d.]+-flash$/.test(m.id),
      );
      return flash?.id ?? modelos[0]?.id ?? porDefecto;
    }
    case 'openrouter': {
      // Sin saldo solo funcionan los gratis: el mejor conocido que haya, o el primero gratis
      const gratis = modelos.filter((m) => m.gratis);
      const bueno = ['deepseek', 'gemini', 'qwen', 'llama', 'mistral']
        .map((familia) => gratis.find((m) => m.id.toLowerCase().includes(familia)))
        .find(Boolean);
      return bueno?.id ?? gratis[0]?.id ?? porDefecto;
    }
    case 'openai': {
      // El "mini" más nuevo: barato y suficiente para trabajos de clase
      const mini = ordenarModelos('openai', modelos).find((m) => /^gpt-[\d.]+-mini$/.test(m.id));
      return mini?.id ?? (ids.includes(porDefecto) ? porDefecto : (ids[0] ?? porDefecto));
    }
    case 'anthropic':
      return ids.find((id) => id.includes('haiku')) ?? ids[0] ?? porDefecto;
    case 'deepseek':
      return ids.find((id) => id.includes('flash')) ?? ids[0] ?? porDefecto;
    case 'mistral':
      return ids.includes(porDefecto)
        ? porDefecto
        : (ids.find((id) => id.includes('small')) ?? ids[0] ?? porDefecto);
    case 'groq':
      return ids.includes(porDefecto)
        ? porDefecto
        : (ids.find((id) => id.includes('llama')) ?? ids[0] ?? porDefecto);
  }
}
