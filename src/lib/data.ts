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
};

export type Snapshot = {
  site: SiteInfo;
  courses: Course[];
  entregas: Entrega[];
  syncedAt: number; // ms
};

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
async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
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
    });
  });

  // Eventos "con acción pendiente" del calendario: si una tarea ya está en la lista, solo
  // completamos datos; si no (cuestionarios, SCORM, foros con fecha...), la añadimos.
  for (const e of eventsRes.events ?? []) {
    if (e.action?.actionable === false) continue;
    if (cursoIgnorado(e.course?.fullname)) continue;
    const url = e.url || e.action?.url;
    const key = `${e.modulename}-${cmidFromUrl(url) ?? `i${e.instance}`}`;
    if (entregas.has(key)) continue;
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

  return {
    site,
    courses,
    entregas: [...entregas.values()].sort((a, b) => (a.fecha || Infinity) - (b.fecha || Infinity)),
    syncedAt: nowMs,
  };
}
