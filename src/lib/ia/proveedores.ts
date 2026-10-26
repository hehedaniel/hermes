/**
 * Peticiones a la IA: Gemini (API de Google AI Studio) y OpenRouter.
 * Cada usuario pone su propia clave; la app habla directamente con el proveedor, sin servidor.
 * Sin dependencias de React Native: se puede probar en Node.
 */

export type Proveedor = 'gemini' | 'openrouter';

export const PROVEEDORES: Record<
  Proveedor,
  { nombre: string; urlClave: string; ayudaClave: string; modeloPorDefecto: string }
> = {
  gemini: {
    nombre: 'Gemini',
    urlClave: 'https://aistudio.google.com/apikey',
    ayudaClave: 'Gratis con tu cuenta de Google, en Google AI Studio → Get API key.',
    modeloPorDefecto: 'gemini-2.5-flash',
  },
  openrouter: {
    nombre: 'OpenRouter',
    urlClave: 'https://openrouter.ai/settings/keys',
    ayudaClave: 'Crea una cuenta en OpenRouter y una clave en Settings → Keys.',
    modeloPorDefecto: 'openrouter/auto',
  },
};

/** Un archivo que se le pasa a la IA (el PDF del enunciado, una imagen…). */
export type AdjuntoIA = { nombre: string; mime: string; base64: string };

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
const OPENROUTER = 'https://openrouter.ai/api/v1';
/** Las respuestas largas (un trabajo entero) pueden tardar; más de esto es que algo va mal. */
const TIMEOUT_MS = 180_000;
/** Lo que aceptan los proveedores en una petición, con margen (el base64 ocupa un 33 % más). */
export const MAX_ADJUNTOS_BYTES = 15 * 1024 * 1024;

// ------------------------------------------------------------------ adjuntos

const EXT_TEXTO = [
  'txt',
  'md',
  'csv',
  'tsv',
  'json',
  'ipynb',
  'py',
  'js',
  'ts',
  'tsx',
  'jsx',
  'java',
  'c',
  'cpp',
  'h',
  'cs',
  'kt',
  'sql',
  'html',
  'css',
  'xml',
  'yml',
  'yaml',
  'r',
  'sh',
  'php',
  'go',
  'rs',
];

const extension = (nombre: string) =>
  nombre.includes('.') ? nombre.split('.').pop()!.toLowerCase() : '';

/** Cómo le llega un archivo a la IA: como archivo (PDF, imagen) o pegado como texto (código, CSV…). */
export type AdjuntoPreparado =
  | { tipo: 'archivo'; nombre: string; mime: string; base64: string }
  | { tipo: 'texto'; nombre: string; texto: string };

export function prepararAdjunto(a: AdjuntoIA): AdjuntoPreparado {
  const ext = extension(a.nombre);
  if (a.mime === 'application/pdf' || ext === 'pdf')
    return { tipo: 'archivo', nombre: a.nombre, mime: 'application/pdf', base64: a.base64 };
  if (a.mime.startsWith('image/')) return { tipo: 'archivo', ...a };
  if (EXT_TEXTO.includes(ext) || a.mime.startsWith('text/'))
    return { tipo: 'texto', nombre: a.nombre, texto: base64ATexto(a.base64) };
  throw new IAError(
    'tipo',
    `La IA no puede leer «${a.nombre}». Sirven PDF, imágenes y archivos de texto o código; si es un Word o un PowerPoint, guárdalo antes como PDF.`,
  );
}

/** ¿Se le puede pasar este archivo a la IA? */
export function adjuntoCompatible(nombre: string, mime?: string) {
  try {
    prepararAdjunto({ nombre, mime: mime ?? '', base64: '' });
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

const textoDeAdjunto = (a: { nombre: string; texto: string }) =>
  `Contenido del archivo «${a.nombre}»:\n\`\`\`\n${a.texto}\n\`\`\``;

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

// ------------------------------------------------------------------ Gemini

export function cuerpoGemini(p: Pick<PeticionIA, 'sistema' | 'mensajes'>) {
  return {
    systemInstruction: { parts: [{ text: p.sistema }] },
    contents: agruparTurnos(p.mensajes).map((m) => {
      const adjuntos = (m.adjuntos ?? []).map(prepararAdjunto);
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
  return cand?.finishReason === 'MAX_TOKENS'
    ? `${texto}\n\n_(La respuesta se ha cortado por largo. Pídele que continúe.)_`
    : texto;
}

/** Mensaje de error legible a partir de la respuesta HTTP del proveedor. */
export function errorDeProveedor(proveedor: Proveedor, status: number, data: any): IAError {
  const nombre = PROVEEDORES[proveedor].nombre;
  const msg: string = data?.error?.message ?? (typeof data?.error === 'string' ? data.error : '');
  if (status === 400 && /api key|api_key/i.test(msg))
    return new IAError('clave', `${nombre} dice que la clave no es válida. Revísala en Ajustes.`);
  if (status === 401 || status === 403)
    return new IAError('clave', `${nombre} no acepta la clave. Revísala en Ajustes.`);
  if (status === 402)
    return new IAError('saldo', `${nombre}: no tienes saldo para este modelo. Elige uno gratis.`);
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

// ------------------------------------------------------------------ OpenRouter

export function cuerpoOpenRouter(p: Pick<PeticionIA, 'sistema' | 'mensajes' | 'modelo'>) {
  let hayPdf = false;
  const messages = [
    { role: 'system', content: p.sistema },
    ...agruparTurnos(p.mensajes).map((m) => {
      const adjuntos = (m.adjuntos ?? []).map(prepararAdjunto);
      if (!adjuntos.length)
        return { role: m.rol === 'ia' ? 'assistant' : 'user', content: m.texto };
      return {
        role: m.rol === 'ia' ? 'assistant' : 'user',
        content: [
          ...adjuntos.map((a) => {
            if (a.tipo === 'texto') return { type: 'text', text: textoDeAdjunto(a) };
            const url = `data:${a.mime};base64,${a.base64}`;
            if (a.mime.startsWith('image/')) return { type: 'image_url', image_url: { url } };
            hayPdf = true;
            return { type: 'file', file: { filename: a.nombre, file_data: url } };
          }),
          { type: 'text', text: m.texto || '(sin texto)' },
        ],
      };
    }),
  ];
  return {
    model: p.modelo,
    messages,
    // Los PDF se pasan a texto con el lector gratuito (el de por defecto puede cobrar por página)
    ...(hayPdf ? { plugins: [{ id: 'file-parser', pdf: { engine: 'cloudflare-ai' } }] } : {}),
  };
}

export function textoDeOpenRouter(data: any): string {
  const msg = data?.choices?.[0]?.message?.content;
  const texto =
    typeof msg === 'string'
      ? msg
      : Array.isArray(msg)
        ? msg.map((p: any) => p.text ?? '').join('')
        : '';
  if (!texto) throw new IAError('vacia', 'OpenRouter no ha devuelto respuesta. Prueba otra vez.');
  return data?.choices?.[0]?.finish_reason === 'length'
    ? `${texto}\n\n_(La respuesta se ha cortado por largo. Pídele que continúe.)_`
    : texto;
}

// ------------------------------------------------------------------ peticiones

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

const sinPrefijo = (modelo: string) => modelo.replace(/^models\//, '');

/** Manda la conversación a la IA y devuelve el texto de su respuesta. */
export async function pedirIA(p: PeticionIA): Promise<string> {
  if (!p.clave.trim())
    throw new IAError(
      'clave',
      'Falta la clave de la IA. Ponla en Ajustes → Inteligencia artificial.',
    );
  if (p.proveedor === 'gemini') {
    const data = await pedirJson(
      'gemini',
      `${GEMINI}/models/${encodeURIComponent(sinPrefijo(p.modelo))}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': p.clave.trim() },
        body: JSON.stringify(cuerpoGemini(p)),
      },
      p.signal,
    );
    return textoDeGemini(data);
  }
  const data = await pedirJson(
    'openrouter',
    `${OPENROUTER}/chat/completions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${p.clave.trim()}`,
        'HTTP-Referer': 'https://github.com/hehedaniel/hermes',
        'X-Title': 'Hermes',
      },
      body: JSON.stringify(cuerpoOpenRouter(p)),
    },
    p.signal,
  );
  return textoDeOpenRouter(data);
}

/** Modelos que se pueden usar con esa clave (Gemini) o en OpenRouter. */
export async function listarModelos(proveedor: Proveedor, clave: string): Promise<ModeloIA[]> {
  if (proveedor === 'gemini') {
    if (!clave.trim()) throw new IAError('clave', 'Pon primero la clave de Gemini.');
    const data = await pedirJson('gemini', `${GEMINI}/models?pageSize=200`, {
      headers: { 'x-goog-api-key': clave.trim() },
    });
    return ordenarModelos(
      'gemini',
      (data?.models ?? [])
        .filter(
          (m: any) =>
            (m.supportedGenerationMethods ?? []).includes('generateContent') &&
            !/embedding|aqa|imagen|image|tts|audio|live|robotics|computer-use|veo/i.test(m.name),
        )
        .map((m: any) => ({ id: sinPrefijo(m.name), nombre: m.displayName ?? sinPrefijo(m.name) })),
    );
  }
  const data = await pedirJson('openrouter', `${OPENROUTER}/models`, {});
  return ordenarModelos(
    'openrouter',
    (data?.data ?? [])
      .filter((m: any) => (m.architecture?.output_modalities ?? ['text']).includes('text'))
      .map((m: any) => ({
        id: m.id,
        nombre: m.name ?? m.id,
        gratis:
          m.id.endsWith(':free') || (m.pricing?.prompt === '0' && m.pricing?.completion === '0'),
      })),
  );
}

/** Versión de un modelo Gemini (2.5, 3…) para poner primero los más nuevos. */
const versionGemini = (id: string) => Number(id.match(/gemini-(\d+(?:\.\d+)?)/)?.[1] ?? 0);
const esEstable = (id: string) => !/preview|exp|latest|-\d{3}$|-\d{2}-\d{2}/.test(id);

export function ordenarModelos(proveedor: Proveedor, modelos: ModeloIA[]): ModeloIA[] {
  if (proveedor === 'gemini') {
    // Primero los estables y más nuevos; dentro de la misma versión, flash antes que pro (más cuota gratis)
    const peso = (id: string) =>
      id.includes('flash') && !id.includes('lite') ? 0 : id.includes('pro') ? 1 : 2;
    return [...modelos].sort(
      (a, b) =>
        Number(esEstable(b.id)) - Number(esEstable(a.id)) ||
        versionGemini(b.id) - versionGemini(a.id) ||
        peso(a.id) - peso(b.id) ||
        a.id.localeCompare(b.id),
    );
  }
  return [...modelos].sort(
    (a, b) => Number(!!b.gratis) - Number(!!a.gratis) || a.nombre.localeCompare(b.nombre),
  );
}

/** El modelo que se usa si el usuario no ha elegido ninguno. */
export function modeloRecomendado(proveedor: Proveedor, modelos: ModeloIA[]): string {
  if (proveedor === 'gemini') {
    const flash = ordenarModelos('gemini', modelos).find((m) => /^gemini-[\d.]+-flash$/.test(m.id));
    return flash?.id ?? modelos[0]?.id ?? PROVEEDORES.gemini.modeloPorDefecto;
  }
  return PROVEEDORES.openrouter.modeloPorDefecto;
}
