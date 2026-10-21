/**
 * Cliente mínimo de la API REST de Moodle (la misma que usa la app oficial).
 * No depende de React Native: se puede probar en Node.
 */

export const DEFAULT_MOODLE_URL = 'https://educacionadistancia.juntadeandalucia.es/centros/huelva';

/** Cursos que no interesan y se ignoran por completo (el "Punto de encuentro" del instituto). */
export const CURSOS_IGNORADOS = ['punto de encuentro'];

export const cursoIgnorado = (nombre?: string) =>
  CURSOS_IGNORADOS.some((x) => (nombre ?? '').toLowerCase().includes(x));

export class MoodleError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'MoodleError';
  }
}

type Params = Record<string, unknown>;

/** Convierte {courseids: [1, 2]} en {"courseids[0]": "1", "courseids[1]": "2"} como espera Moodle. */
export function flatten(params: Params | unknown[], prefix = '', out: Record<string, string> = {}) {
  const entries = Array.isArray(params)
    ? params.map((v, i) => [String(i), v] as const)
    : Object.entries(params);
  for (const [k, v] of entries) {
    const key = prefix ? `${prefix}[${k}]` : k;
    if (v === undefined || v === null) continue;
    if (typeof v === 'object') flatten(v as Params, key, out);
    else if (typeof v === 'boolean') out[key] = v ? '1' : '0';
    else out[key] = String(v);
  }
  return out;
}

/** Tiempo máximo de cada petición a Moodle. */
const TIMEOUT_MS = 25_000;

export class MoodleClient {
  readonly base: string;

  constructor(
    base: string,
    readonly token: string,
  ) {
    this.base = base.replace(/\/+$/, '');
  }

  async call<T = any>(wsfunction: string, params: Params = {}): Promise<T> {
    const body = new URLSearchParams({
      wstoken: this.token,
      wsfunction,
      moodlewsrestformat: 'json',
      ...flatten(params),
    });
    // Sin límite, una petición que Moodle no contesta deja la app "sincronizando" para siempre
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    let data: any;
    try {
      let res: Response;
      try {
        res = await fetch(`${this.base}/webservice/rest/server.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString(),
          signal: ctrl.signal,
        });
      } catch {
        throw ctrl.signal.aborted
          ? new MoodleError(
              'timeout',
              'Moodle está tardando demasiado en responder. Prueba en un rato.',
            )
          : new MoodleError('network', 'No se pudo conectar con Moodle. ¿Tienes internet?');
      }
      if (!res.ok)
        throw new MoodleError(`http${res.status}`, `Moodle respondió con un error ${res.status}`);
      try {
        data = await res.json();
      } catch {
        throw ctrl.signal.aborted
          ? new MoodleError(
              'timeout',
              'Moodle está tardando demasiado en responder. Prueba en un rato.',
            )
          : new MoodleError('badjson', 'Moodle devolvió una respuesta que no se entiende.');
      }
    } finally {
      clearTimeout(timer);
    }
    if (
      data &&
      typeof data === 'object' &&
      !Array.isArray(data) &&
      ('exception' in data || 'errorcode' in data)
    ) {
      throw new MoodleError(data.errorcode ?? 'unknown', data.message ?? 'Error de Moodle');
    }
    return data as T;
  }

  /** URL de descarga de un archivo (fileurl de la API + token). */
  fileUrl(fileurl: string) {
    return `${fileurl}${fileurl.includes('?') ? '&' : '?'}token=${encodeURIComponent(this.token)}`;
  }
}

/**
 * Acepta lo que el usuario pegue:
 *  - "moodlemobile://token=BASE64"  (lo que sale en la consola del navegador al hacer login)
 *  - solo el BASE64
 *  - el token "en claro" (32 caracteres hex, el que guarda el script de Python en .env)
 */
export function parseToken(input: string): {
  token: string;
  privateToken?: string;
} {
  let raw = input.trim().replace(/^['"]|['"]$/g, '');
  try {
    raw = decodeURIComponent(raw);
  } catch {
    // ya venía sin codificar
  }
  const envLine = raw.match(/MOODLE_TOKEN\s*=\s*([a-f0-9]{32})/i);
  if (envLine) return { token: envLine[1] };
  if (/^[a-f0-9]{32}$/i.test(raw)) return { token: raw };

  const m = raw.match(/token=([A-Za-z0-9+/=_-]+)/);
  let b64 = (m ? m[1] : raw).replace(/-/g, '+').replace(/_/g, '/');
  b64 += '='.repeat((4 - (b64.length % 4)) % 4);
  let decoded: string;
  try {
    decoded = atob(b64);
  } catch {
    throw new MoodleError('badtoken', 'Eso no parece un token válido.');
  }
  const parts = decoded.split(':::');
  if (parts.length < 2 || !/^[a-f0-9]{32}$/i.test(parts[1])) {
    throw new MoodleError('badtoken', 'Eso no parece un token válido.');
  }
  return { token: parts[1], privateToken: parts[2] };
}

/** Deja la dirección base del Moodle aunque se pegue la de "Mi área" (/my/) o con barra final. */
export function normalizeUrl(url: string) {
  return (url.trim() || DEFAULT_MOODLE_URL)
    .replace(/\/(my\/?|login\/index\.php.*)?$/, '')
    .replace(/\/+$/, '');
}

/** Enlace para obtener el token iniciando sesión por el navegador (login CAS). */
export function launchUrl(base: string) {
  const passport = Math.floor(Math.random() * 900_000_000 + 100_000_000);
  return `${base.replace(/\/+$/, '')}/admin/tool/mobile/launch.php?service=moodle_mobile_app&passport=${passport}&urlscheme=moodlemobile`;
}

// ------------------------------------------------------------------ tipos de la API que usamos

export type SiteInfo = {
  userid: number;
  fullname: string;
  sitename: string;
  userpictureurl?: string;
};

export type Course = {
  id: number;
  fullname: string;
  shortname: string;
  visible?: number;
};

export type Assignment = {
  id: number;
  cmid: number;
  course: number;
  name: string;
  duedate: number;
  cutoffdate?: number;
  allowsubmissionsfromdate?: number;
  intro?: string;
  introattachments?: {
    filename: string;
    filepath?: string;
    fileurl: string;
    filesize: number;
    timemodified?: number;
    mimetype?: string;
  }[];
};

export type ActionEvent = {
  id: number;
  name: string;
  activityname?: string;
  modulename?: string;
  instance?: number;
  timesort: number;
  timestart?: number;
  url?: string;
  course?: { id: number; fullname: string };
  action?: { name?: string; url?: string; actionable?: boolean };
};

export type SubmissionStatus = {
  lastattempt?: {
    submission?: { status?: string };
    teamsubmission?: { status?: string };
  };
  feedback?: { gradefordisplay?: string };
};

export type ModuleContent = {
  type: 'file' | 'url' | 'content' | string;
  filename: string;
  filepath?: string;
  filesize: number;
  fileurl: string;
  timemodified?: number;
  mimetype?: string;
};

export type CourseModule = {
  id: number; // cmid
  name: string;
  modname: string;
  url?: string;
  uservisible?: boolean;
  visible?: number;
  description?: string;
  contents?: ModuleContent[];
};

export type CourseSection = {
  id: number;
  name: string;
  section: number;
  summary?: string;
  modules: CourseModule[];
};
