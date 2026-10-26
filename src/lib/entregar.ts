/**
 * Entregar una tarea (mod_assign) desde la app, igual que la app oficial de Moodle:
 *   1. Se suben los archivos a una zona de borrador (webservice/upload.php) → itemid.
 *   2. mod_assign_save_submission guarda la entrega con ese itemid (o con el texto en línea).
 *   3. Si la tarea usa borradores, mod_assign_submit_for_grading la envía para calificar.
 * Sin dependencias de React Native: se puede probar en Node.
 */
import { type Assignment, MoodleError, type SubmissionStatus } from './moodle';

export type ConfigEntrega = {
  /** id de la tarea (no el cmid): es el que piden las funciones de entrega */
  assignId: number;
  /** Se entrega subiendo archivos */
  archivos: boolean;
  /** Se entrega escribiendo texto en línea */
  texto: boolean;
  maxArchivos: number;
  /** Tipos admitidos tal cual los da Moodle (".pdf", ".docx", "document"…); vacío = cualquiera */
  tipos: string[];
  maxBytes: number;
  /** Primero se guarda un borrador y luego hay que enviarlo */
  borradores: boolean;
  /** Al enviar hay que aceptar la declaración de autoría */
  declaracion: boolean;
  /** Tarea de prueba de Hermes Dev: el archivo se sube, pero no se entrega en ninguna tarea */
  prueba?: boolean;
};

export function configEntrega(a: Assignment): ConfigEntrega | undefined {
  if (!a.configs?.length) return undefined;
  const valor = (plugin: string, name: string) =>
    a.configs!.find(
      (c) => c.subtype === 'assignsubmission' && c.plugin === plugin && c.name === name,
    )?.value;
  const archivos = valor('file', 'enabled') === '1';
  const texto = valor('onlinetext', 'enabled') === '1';
  if (!archivos && !texto) return undefined;
  return {
    assignId: a.id,
    archivos,
    texto,
    maxArchivos: Number(valor('file', 'maxfilesubmissions')) || 1,
    tipos: (valor('file', 'filetypeslist') ?? '').split(/[\s,;]+/).filter(Boolean),
    maxBytes: Number(valor('file', 'maxsubmissionsizebytes')) || 0,
    borradores: a.submissiondrafts === 1,
    declaracion: a.requiresubmissionstatement === 1,
  };
}

/**
 * ¿Admite la tarea un archivo con este nombre? null = no se sabe (Moodle usa grupos como
 * "document" que no sabemos traducir): se deja intentar y, si no vale, Moodle lo dirá.
 */
export function tipoAdmitido(nombre: string, tipos: string[]): boolean | null {
  if (!tipos.length || tipos.includes('*')) return true;
  const ext = nombre.includes('.') ? `.${nombre.split('.').pop()!.toLowerCase()}` : '';
  if (tipos.some((t) => t.toLowerCase() === ext)) return true;
  return tipos.some((t) => !t.startsWith('.')) ? null : false;
}

/** Un archivo para subir. Cada plataforma sabe cómo meterlo en el FormData (URI en el móvil, Blob en la web). */
export type ArchivoParaSubir = {
  nombre: string;
  /** bytes, si se sabe (para avisar antes de subir si pasa del máximo de la tarea) */
  tamano?: number;
  anadir: (form: FormData, campo: string) => void;
};

type ClienteMoodle = {
  base: string;
  token: string;
  call: <T = any>(wsfunction: string, params?: Record<string, unknown>) => Promise<T>;
};

const SUBIDA_MS = 120_000;

/** Sube los archivos a una zona de borrador nueva y devuelve su itemid. */
export async function subirBorrador(client: ClienteMoodle, archivos: ArchivoParaSubir[]) {
  let itemid = 0;
  for (const a of archivos) {
    const form = new FormData();
    form.append('token', client.token);
    form.append('filearea', 'draft');
    form.append('itemid', String(itemid));
    a.anadir(form, 'file_1');
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), SUBIDA_MS);
    let data: any;
    try {
      const res = await fetch(`${client.base}/webservice/upload.php`, {
        method: 'POST',
        body: form,
        signal: ctrl.signal,
      });
      data = await res.json();
    } catch {
      throw ctrl.signal.aborted
        ? new MoodleError('timeout', `La subida de «${a.nombre}» está tardando demasiado.`)
        : new MoodleError('network', `No se pudo subir «${a.nombre}» a Moodle. ¿Tienes internet?`);
    } finally {
      clearTimeout(timer);
    }
    if (!Array.isArray(data) || !data[0]?.itemid) {
      throw new MoodleError(
        data?.errorcode ?? 'upload',
        `Moodle no aceptó «${a.nombre}»${data?.error ? `: ${data.error}` : '.'}`,
      );
    }
    itemid = data[0].itemid;
  }
  return itemid;
}

type Aviso = { item?: string; message?: string; warningcode?: string };

function comprobarAvisos(r: unknown) {
  const avisos = (
    Array.isArray(r) ? r : ((r as { warnings?: Aviso[] })?.warnings ?? [])
  ) as Aviso[];
  if (avisos.length) {
    throw new MoodleError(
      avisos[0].warningcode ?? 'aviso',
      `Moodle no ha guardado la entrega: ${avisos.map((w) => w.message ?? w.item).join(' ')}`,
    );
  }
}

/**
 * Guarda la entrega (sustituye lo que hubiera) y, si la tarea usa borradores y `enviar` es
 * true, la envía para calificar. Devuelve cómo queda.
 */
export async function entregarEnMoodle(
  client: Pick<ClienteMoodle, 'call'>,
  cfg: ConfigEntrega,
  contenido: { itemid?: number; textoHtml?: string },
  enviar = true,
): Promise<'enviada' | 'borrador'> {
  const st = await client.call<SubmissionStatus>('mod_assign_get_submission_status', {
    assignid: cfg.assignId,
  });
  if (st.lastattempt?.canedit === false) {
    throw new MoodleError(
      'nopuede',
      'Moodle no deja cambiar la entrega de esta tarea: el plazo está cerrado, ya está corregida o el profesor la ha bloqueado.',
    );
  }

  const plugindata: Record<string, unknown> = {};
  if (contenido.itemid) plugindata.files_filemanager = contenido.itemid;
  if (contenido.textoHtml !== undefined) {
    // El editor de texto necesita su propia zona de borrador (para imágenes incrustadas)
    const draft = await client
      .call<{ itemid: number }>('core_files_get_unused_draft_itemid')
      .then((r) => r.itemid)
      .catch(() => Math.floor(Math.random() * 1e9));
    plugindata.onlinetext_editor = { text: contenido.textoHtml, format: 1, itemid: draft };
  }
  if (!Object.keys(plugindata).length) throw new MoodleError('vacia', 'No hay nada que entregar.');

  comprobarAvisos(
    await client.call('mod_assign_save_submission', { assignmentid: cfg.assignId, plugindata }),
  );

  if (!cfg.borradores) return 'enviada';
  if (!enviar) return 'borrador';
  comprobarAvisos(
    await client.call('mod_assign_submit_for_grading', {
      assignmentid: cfg.assignId,
      acceptsubmissionstatement: 1,
    }),
  );
  return 'enviada';
}
