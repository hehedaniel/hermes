/**
 * Junta tareas (mod_assign) y eventos del calendario (cuestionarios, SCORM...) en una
 * sola lista de "entregas" con su estado. Sin dependencias de React Native.
 */
import {
  type ActionEvent,
  type Assignment,
  type Course,
  cursoIgnorado,
  MoodleClient,
  type SiteInfo,
  type AssignPlugin,
  type SubmissionStatus,
} from './moodle';

export type Estado = 'entregada' | 'borrador' | 'pendiente' | 'vencida';

/** Un archivo de Moodle (de un recurso, carpeta o adjunto de una tarea). */
export type Archivo = {
  nombre: string;
  fileurl: string; // URL de la API (sin token)
  size: number;
  timemodified: number;
  mimetype?: string;
  cursoId: number;
  cmid: number; // actividad a la que pertenece (para ordenar las descargas en carpetas)
  ruta?: string; // subcarpeta dentro de una "carpeta" de Moodle
};

export type Entrega = {
  key: string;
  nombre: string;
  cursoId: number;
  curso: string;
  fecha: number; // segundos (timestamp de Moodle)
  url?: string;
  tipo: string; // assign, quiz, scorm...
  estado: Estado;
  nota?: string;
  cmid?: number;
  enunciado?: string; // HTML de la descripción de la tarea
  adjuntos?: Archivo[];
  apertura?: number; // desde cuándo se puede entregar
  corte?: number; // fecha de corte (después ya no deja entregar)
  /** Lo que enviaste tú (solo tareas) */
  envio?: Envio;
  /** La corrección del profesor, si ya es visible para ti */
  correccion?: Correccion;
};

export type Envio = {
  fecha?: number; // última modificación de tu entrega
  archivos: Archivo[];
  texto?: string; // HTML del texto en línea, si la tarea lo pide
  pendienteDeCorregir: boolean;
};

export type Correccion = {
  nota?: string;
  fecha?: number; // cuándo la corrigieron
  comentario?: string; // HTML del comentario del profesor
  archivos: Archivo[]; // retroalimentación: tu PDF anotado, una plantilla corregida…
};

export type Snapshot = {
  site: SiteInfo;
  courses: Course[];
  entregas: Entrega[];
  syncedAt: number; // ms
};

/** Archivos de los plugins de una entrega o corrección, como Archivo de Hermes. */
function archivosDePlugins(
  plugins: AssignPlugin[] | undefined,
  cursoId: number,
  cmid: number,
): Archivo[] {
  return (plugins ?? []).flatMap((pl) =>
    (pl.fileareas ?? []).flatMap((fa) =>
      (fa.files ?? [])
        .filter((f) => f.fileurl)
        .map((f) => ({
          nombre: f.filename,
          fileurl: f.fileurl,
          size: f.filesize ?? 0,
          timemodified: f.timemodified ?? 0,
          mimetype: f.mimetype,
          cursoId,
          cmid,
        })),
    ),
  );
}

const textoDePlugins = (plugins: AssignPlugin[] | undefined, tipo: string) =>
  (plugins ?? [])
    .filter((pl) => pl.type === tipo)
    .flatMap((pl) => pl.editorfields ?? [])
    .map((f) => f.text ?? '')
    .filter((t) => t.replace(/<[^>]+>|&nbsp;|\s/g, ''))
    .join('<br>') || undefined;

/** Tu entrega y la corrección del profesor, a partir de mod_assign_get_submission_status. */
export function detalleEntrega(
  st: SubmissionStatus,
  cursoId: number,
  cmid: number,
): { envio?: Envio; correccion?: Correccion } {
  const sub = st.lastattempt?.submission ?? st.lastattempt?.teamsubmission;
  const enviada = sub?.status === 'submitted' || sub?.status === 'draft';
  const envio: Envio | undefined = enviada
    ? {
        fecha: sub?.timemodified || undefined,
        archivos: archivosDePlugins(sub?.plugins, cursoId, cmid),
        texto: textoDePlugins(sub?.plugins, 'onlinetext'),
        pendienteDeCorregir:
          sub?.status === 'submitted' &&
          !st.feedback?.gradefordisplay &&
          st.lastattempt?.gradingstatus !== 'graded',
      }
    : undefined;

  const fb = st.feedback;
  const nota = fb?.gradefordisplay ? strip(fb.gradefordisplay) : undefined;
  const comentario = textoDePlugins(fb?.plugins, 'comments');
  const archivos = archivosDePlugins(fb?.plugins, cursoId, cmid);
  const correccion: Correccion | undefined =
    nota || comentario || archivos.length
      ? {
          nota,
          fecha: fb?.gradeddate || fb?.grade?.timemodified || undefined,
          comentario,
          archivos,
        }
      : undefined;
  return { envio, correccion };
}

const strip = (s?: string) =>
  (s ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

/** Ejecuta las promesas de `n` en `n` para no saturar al servidor. */
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (t: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return out;
}

export type ActividadCalendario = {
  key: string;
  cursoId: number;
  cmid?: number;
  tipo: string; // scorm, quiz, lesson…
  instancia?: number; // id del SCORM o del cuestionario
};

type ClienteMoodle = Pick<MoodleClient, 'call'>;

/**
 * Qué actividades del calendario (no tareas) ya has hecho. Tres pistas, por orden:
 *  1. El estado de finalización de Moodle (el ✓ de "Completado"), si el profesor lo usa.
 *  2. SCORM: algún intento.
 *  3. Cuestionarios: algún intento terminado.
 * Si una petición falla, esa pista no cuenta (la actividad sigue como pendiente).
 */
export async function actividadesHechas(
  client: ClienteMoodle,
  userid: number,
  actividades: ActividadCalendario[],
): Promise<Set<string>> {
  const hechas = new Set<string>();
  if (!actividades.length) return hechas;

  // 1. Finalización, un curso cada vez
  const cursos = [...new Set(actividades.map((a) => a.cursoId).filter(Boolean))];
  const completadas = new Set<number>();
  await mapLimit(cursos, 3, async (courseid) => {
    const r = await client
      .call<{ statuses?: { cmid: number; state: number }[] }>(
        'core_completion_get_activities_completion_status',
        { courseid, userid },
      )
      .catch(() => ({ statuses: [] }));
    for (const st of r.statuses ?? []) {
      if (st.state >= 1) completadas.add(st.cmid); // 1 completada, 2 aprobada, 3 suspensa
    }
  });
  for (const a of actividades) if (a.cmid && completadas.has(a.cmid)) hechas.add(a.key);

  // 2 y 3. Intentos, solo de lo que no se haya resuelto ya
  const resto = actividades.filter((a) => !hechas.has(a.key) && a.instancia);
  await mapLimit(resto, 4, async (a) => {
    if (a.tipo === 'scorm') {
      const r = await client
        .call<{ attemptscount?: number }>('mod_scorm_get_scorm_attempt_count', {
          scormid: a.instancia,
          userid,
        })
        .catch(() => ({ attemptscount: 0 }));
      if ((r.attemptscount ?? 0) > 0) hechas.add(a.key);
    } else if (a.tipo === 'quiz') {
      const r = await client
        .call<{ attempts?: unknown[] }>('mod_quiz_get_user_attempts', {
          quizid: a.instancia,
          userid,
          status: 'finished',
        })
        .catch(() => ({ attempts: [] }));
      if ((r.attempts ?? []).length > 0) hechas.add(a.key);
    }
  });
  return hechas;
}

function estadoDe(status: string | undefined, fecha: number, now: number): Estado {
  if (status === 'submitted') return 'entregada';
  if (fecha && fecha < now) return 'vencida';
  if (status === 'draft') return 'borrador';
  return 'pendiente';
}

const cmidFromUrl = (url?: string) => url?.match(/[?&]id=(\d+)/)?.[1];

export async function fetchSnapshot(client: MoodleClient, nowMs = Date.now()): Promise<Snapshot> {
  const now = Math.floor(nowMs / 1000);
  const site = await client.call<SiteInfo>('core_webservice_get_site_info');
  const courses = (
    await client.call<Course[]>('core_enrol_get_users_courses', {
      userid: site.userid,
    })
  )
    .map((c) => ({ ...c, fullname: strip(c.fullname) }))
    .filter((c) => !cursoIgnorado(c.fullname));
  const courseName = new Map(courses.map((c) => [c.id, c.fullname]));

  const [assignRes, eventsRes] = await Promise.all([
    courses.length
      ? client.call<{ courses: { id: number; assignments: Assignment[] }[] }>(
          'mod_assign_get_assignments',
          {
            courseids: courses.map((c) => c.id),
          },
        )
      : Promise.resolve({ courses: [] }),
    client
      .call<{ events: ActionEvent[] }>('core_calendar_get_action_events_by_timesort', {
        timesortfrom: now - 30 * 86400,
        limitnum: 50,
      })
      .catch(() => ({ events: [] as ActionEvent[] })),
  ]);

  const assignments = assignRes.courses.flatMap((c) =>
    c.assignments.map((a) => ({ ...a, course: c.id })),
  );
  const statuses = await mapLimit(assignments, 5, (a) =>
    client
      .call<SubmissionStatus>('mod_assign_get_submission_status', {
        assignid: a.id,
      })
      .catch(() => ({}) as SubmissionStatus),
  );

  const entregas = new Map<string, Entrega>();

  assignments.forEach((a, i) => {
    const st = statuses[i];
    const sub = st.lastattempt?.submission ?? st.lastattempt?.teamsubmission;
    const nota = st.feedback?.gradefordisplay ? strip(st.feedback.gradefordisplay) : undefined;
    entregas.set(`assign-${a.cmid}`, {
      key: `assign-${a.cmid}`,
      nombre: strip(a.name),
      cursoId: a.course,
      curso: courseName.get(a.course) ?? '',
      fecha: a.duedate || 0,
      url: `${client.base}/mod/assign/view.php?id=${a.cmid}`,
      tipo: 'assign',
      estado: estadoDe(sub?.status, a.duedate, now),
      nota,
      cmid: a.cmid,
      enunciado: a.intro || undefined,
      adjuntos: (a.introattachments ?? []).map((f) => ({
        nombre: f.filename,
        fileurl: f.fileurl,
        size: f.filesize,
        timemodified: f.timemodified ?? 0,
        mimetype: f.mimetype,
        cursoId: a.course,
        cmid: a.cmid,
      })),
      apertura: a.allowsubmissionsfromdate || undefined,
      corte: a.cutoffdate || undefined,
      ...detalleEntrega(st, a.course, a.cmid),
    });
  });

  // Eventos "con acción pendiente" del calendario: si una tarea ya está en la lista, solo
  // completamos datos; si no (cuestionarios, SCORM, foros con fecha...), la añadimos.
  const delCalendario: ActividadCalendario[] = [];
  for (const e of eventsRes.events ?? []) {
    if (e.action?.actionable === false) continue;
    if (cursoIgnorado(e.course?.fullname)) continue;
    const url = e.url || e.action?.url;
    const key = `${e.modulename}-${cmidFromUrl(url) ?? `i${e.instance}`}`;
    if (entregas.has(key)) continue;
    delCalendario.push({
      key,
      cursoId: e.course?.id ?? 0,
      cmid: Number(cmidFromUrl(url)) || undefined,
      tipo: e.modulename ?? '',
      instancia: e.instance,
    });
    const fecha = e.timesort || e.timestart || 0;
    entregas.set(key, {
      key,
      nombre: strip(e.activityname || e.name),
      cursoId: e.course?.id ?? 0,
      curso: courseName.get(e.course?.id ?? -1) ?? strip(e.course?.fullname),
      fecha,
      url,
      tipo: e.modulename ?? 'evento',
      estado: fecha < now ? 'vencida' : 'pendiente',
      cmid: Number(cmidFromUrl(url)) || undefined,
    });
  }

  // SCORM, cuestionarios…: no tienen "entrega"; se miran su finalización y sus intentos
  const hechas = await actividadesHechas(client, site.userid, delCalendario);
  for (const key of hechas) {
    const e = entregas.get(key);
    if (e) entregas.set(key, { ...e, estado: 'entregada' });
  }

  return {
    site,
    courses,
    entregas: [...entregas.values()].sort((a, b) => (a.fecha || Infinity) - (b.fecha || Infinity)),
    syncedAt: nowMs,
  };
}
