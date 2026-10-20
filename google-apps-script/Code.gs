/**
 * Moodle → Google Tasks + Google Calendar
 *
 * Cada hora (con el disparador que crea `instalar()`):
 *  - Lee tus entregas de Moodle (tareas, cuestionarios, lecciones SCORM… con fecha).
 *  - Google Tasks: crea cada entrega en la lista de su asignatura (o reutiliza la que ya tengas
 *    apuntada a mano con el mismo nombre), con la fecha y hora exactas en las notas.
 *    Cuando la entregas en Moodle, la marca como completada.
 *  - Google Calendar: crea un evento a la hora exacta de entrega en el calendario
 *    "Entregas Moodle", con avisos 5 días, 3 días, 1 día, 6 h y 2 h antes, y otro evento
 *    con aviso 1 semana antes.
 *
 * Configuración: el token de Moodle va en Configuración del proyecto → Propiedades del
 * script → MOODLE_TOKEN (no en este código).
 */

const CONFIG = {
  MOODLE_URL: 'https://educacionadistancia.juntadeandalucia.es/centros/huelva',
  CALENDARIO: 'Entregas Moodle',
  ZONA: 'Europe/Madrid',
  // Google Calendar admite como máximo 5 avisos por evento (minutos antes)
  AVISOS_MIN: [5 * 1440, 3 * 1440, 1440, 6 * 60, 2 * 60],
  // El aviso de "1 semana antes" va en un evento aparte (por el límite de 5)
  AVISO_UNA_SEMANA: true,
  HORA_AVISO_SEMANA: 10, // a qué hora del día salta ese aviso
  // Entregas vencidas que todavía se tienen en cuenta (para completar las que entregues tarde)
  DIAS_ATRAS: 30,
  // No crear tareas nuevas para entregas que vencieron hace más de estos días
  NO_CREAR_SI_VENCIDA_HACE_DIAS: 7,
  CREAR_LISTAS_QUE_FALTEN: true,
  // Además de las tareas de entrega, incluir lecciones SCORM, cuestionarios… que tengan fecha
  INCLUIR_OTRAS_ACTIVIDADES: true,
  // Cursos de Moodle que se ignoran por completo
  CURSOS_IGNORADOS: ['Punto de encuentro'],
  // Calendarios que NO se envían a la app (además de "Entregas Moodle", que la app ya pinta)
  CALENDARIOS_OCULTOS_EN_APP: [],
};

const MARCA = '#moodle:';
const CABECERA = '— Moodle —';

// ============================================================================ entrada

/** Ejecuta esto UNA vez: crea el disparador horario y hace la primera sincronización. */
function instalar() {
  ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === 'sincronizar')
    .forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('sincronizar').timeBased().everyHours(1).create();
  console.log('Disparador creado: se sincronizará cada hora.');
  sincronizar();
}

/** Lo que hace cada hora. */
function sincronizar() {
  ejecutar_(false);
}

/** Prueba sin cambiar nada: muestra en el registro qué haría (listas, tareas que reutiliza…). */
function simular() {
  ejecutar_(true);
}

/** Quita el disparador (deja de sincronizar). No borra tareas ni eventos. */
function desinstalar() {
  ScriptApp.getProjectTriggers().forEach((t) => ScriptApp.deleteTrigger(t));
  console.log('Disparadores eliminados.');
}

function ejecutar_(simulacion) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return;
  try {
    const entregas = leerEntregas_();
    console.log(`${Object.keys(entregas).length} entregas con fecha leídas de Moodle.`);
    const t = sincronizarTasks_(entregas, simulacion);
    const c = sincronizarCalendar_(entregas, simulacion);
    console.log(
      `${simulacion ? '[SIMULACIÓN] ' : ''}Tasks: ${t.creadas} creadas, ${t.reutilizadas} reutilizadas, ` +
        `${t.actualizadas} actualizadas, ${t.completadas} completadas. ` +
        `Calendar: ${c.creados} creados, ${c.actualizados} actualizados.`,
    );
  } finally {
    lock.releaseLock();
  }
}

// ============================================================================ Moodle

function token_() {
  const t = PropertiesService.getScriptProperties().getProperty('MOODLE_TOKEN');
  if (!t) throw new Error('Falta MOODLE_TOKEN en Configuración del proyecto → Propiedades del script.');
  return t.trim();
}

function aplanar_(params, prefijo, out) {
  out = out || {};
  Object.keys(params).forEach((k) => {
    const v = params[k];
    const clave = prefijo ? `${prefijo}[${k}]` : k;
    if (v === null || v === undefined) return;
    if (typeof v === 'object') aplanar_(v, clave, out);
    else out[clave] = String(v);
  });
  return out;
}

function peticion_(wsfunction, params) {
  return {
    url: `${CONFIG.MOODLE_URL}/webservice/rest/server.php`,
    method: 'post',
    payload: Object.assign(
      { wstoken: token_(), wsfunction: wsfunction, moodlewsrestformat: 'json' },
      aplanar_(params || {}),
    ),
    muteHttpExceptions: true,
  };
}

function moodle_(wsfunction, params) {
  const p = peticion_(wsfunction, params);
  const res = UrlFetchApp.fetch(p.url, p);
  const data = JSON.parse(res.getContentText());
  if (data && !Array.isArray(data) && (data.exception || data.errorcode)) {
    throw new Error(`Moodle (${wsfunction}): ${data.errorcode} - ${data.message}`);
  }
  return data;
}

function limpiar_(s) {
  return String(s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Devuelve {clave: entrega} con tareas y demás actividades con fecha. */
function leerEntregas_() {
  const ahora = Math.floor(Date.now() / 1000);
  const desde = ahora - CONFIG.DIAS_ATRAS * 86400;
  const site = moodle_('core_webservice_get_site_info');
  const ignorado = (n) =>
    CONFIG.CURSOS_IGNORADOS.some((x) => normalizar_(n).indexOf(normalizar_(x)) >= 0);
  const cursos = moodle_('core_enrol_get_users_courses', { userid: site.userid }).filter(
    (c) => !ignorado(c.fullname),
  );
  const nombreCurso = {};
  cursos.forEach((c) => (nombreCurso[c.id] = limpiar_(c.fullname)));

  const tareas = [];
  if (cursos.length) {
    const r = moodle_('mod_assign_get_assignments', { courseids: cursos.map((c) => c.id) });
    r.courses.forEach((c) => c.assignments.forEach((a) => tareas.push(Object.assign({}, a, { course: c.id }))));
  }
  const conFecha = tareas.filter((a) => a.duedate && a.duedate >= desde);

  // Estado de cada entrega, en paralelo
  const respuestas = conFecha.length
    ? UrlFetchApp.fetchAll(conFecha.map((a) => peticion_('mod_assign_get_submission_status', { assignid: a.id })))
    : [];

  const out = {};
  conFecha.forEach((a, i) => {
    let st = {};
    try {
      st = JSON.parse(respuestas[i].getContentText());
    } catch (e) {
      // sin estado: se trata como pendiente
    }
    const ultimo = st.lastattempt || {};
    const envio = ultimo.submission || ultimo.teamsubmission || {};
    const clave = `assign-${a.cmid}`;
    out[clave] = {
      clave: clave,
      nombre: limpiar_(a.name),
      cursoId: a.course,
      curso: nombreCurso[a.course] || '',
      fecha: a.duedate,
      url: `${CONFIG.MOODLE_URL}/mod/assign/view.php?id=${a.cmid}`,
      entregada: envio.status === 'submitted',
      tipo: 'assign',
    };
  });

  // Otras actividades con fecha que el calendario de Moodle marca como pendientes
  if (!CONFIG.INCLUIR_OTRAS_ACTIVIDADES) return out;
  const ev = moodle_('core_calendar_get_action_events_by_timesort', { timesortfrom: desde, limitnum: 50 });
  (ev.events || []).forEach((e) => {
    if (e.action && e.action.actionable === false) return;
    if (ignorado((e.course || {}).fullname)) return;
    const url = e.url || (e.action || {}).url || '';
    const m = url.match(/[?&]id=(\d+)/);
    const clave = `${e.modulename}-${m ? m[1] : 'i' + e.instance}`;
    if (out[clave] || !e.timesort) return;
    const curso = e.course || {};
    out[clave] = {
      clave: clave,
      nombre: limpiar_(e.activityname || e.name),
      cursoId: curso.id,
      curso: nombreCurso[curso.id] || limpiar_(curso.fullname),
      fecha: e.timesort,
      url: url,
      entregada: false,
      tipo: e.modulename,
    };
  });
  return out;
}

// ============================================================================ utilidades

function normalizar_(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, ' ')
    .trim();
}

/** Formas de llamar a un curso: "S A A (Sistemas de Aprendizaje Automático) - IA_BIGDATA" →
 *  el nombre entero, lo de dentro del paréntesis y lo que va antes del " - ". */
function variantesCurso_(nombre) {
  const v = [nombre];
  const par = nombre.match(/\(([^)]+)\)/);
  if (par) v.push(par[1]);
  v.push(nombre.replace(/\(.*?\)/g, ' ').replace(/\s[-–]\s.*$/, ''));
  return v.map(normalizar_).filter((x) => x.length >= 3);
}

/** Formas de llamar a una lista: "SAA Sistemas de Aprendizaje Automático" → también sin el código del principio. */
function variantesLista_(titulo) {
  const v = [titulo];
  const sinCodigo = titulo.replace(/^[A-ZÁÉÍÓÚÑ]{2,6}\s*[-–:·.]?\s+/, '');
  if (sinCodigo !== titulo) v.push(sinCodigo);
  return v.map(normalizar_).filter((x) => x.length >= 3);
}

/** Cuánto encaja una lista de Tasks con un curso de Moodle (0 = nada). */
function encaje_(tituloLista, nombreCurso) {
  const palabras = (s) => s.split(' ').filter((p) => p.length > 3);
  let mejor = 0;
  variantesLista_(tituloLista).forEach((a) => {
    variantesCurso_(nombreCurso).forEach((b) => {
      if (a === b) mejor = Math.max(mejor, 3);
      else if (Math.min(a.length, b.length) >= 6 && (a.indexOf(b) >= 0 || b.indexOf(a) >= 0)) mejor = Math.max(mejor, 2);
      else {
        const pa = palabras(a);
        const pb = new Set(palabras(b));
        if (pa.length >= 2 && pa.every((p) => pb.has(p))) mejor = Math.max(mejor, 1);
      }
    });
  });
  return mejor;
}

/** ¿Es la misma tarea? (para reconocer las que apuntaste a mano) */
function parecido_(a, b) {
  const x = normalizar_(a);
  const y = normalizar_(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const corto = x.length < y.length ? x : y;
  const largo = x.length < y.length ? y : x;
  if (corto.length >= 8 && largo.indexOf(corto) >= 0) return true;
  const px = new Set(x.split(' ').filter((p) => p.length > 1));
  const py = new Set(y.split(' ').filter((p) => p.length > 1));
  let comunes = 0;
  px.forEach((p) => py.has(p) && comunes++);
  const union = new Set([...px, ...py]).size;
  return union > 0 && comunes / union >= 0.6;
}

function fechaLarga_(ts) {
  const d = new Date(ts * 1000);
  const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const dia = dias[Number(Utilities.formatDate(d, CONFIG.ZONA, 'u')) % 7];
  return `${dia} ${Utilities.formatDate(d, CONFIG.ZONA, "dd/MM/yyyy 'a las' HH:mm")}`;
}

/** Google Tasks solo guarda el día de la fecha límite: se envía la fecha local a las 00:00Z. */
function dueDe_(ts) {
  return Utilities.formatDate(new Date(ts * 1000), CONFIG.ZONA, 'yyyy-MM-dd') + 'T00:00:00.000Z';
}

function bloqueNotas_(e) {
  return [CABECERA, `Entrega: ${fechaLarga_(e.fecha)}`, e.curso, e.url, MARCA + e.clave].filter(Boolean).join('\n');
}

/** Añade o sustituye el bloque de Moodle en las notas, respetando lo que hayas escrito tú. */
function conBloque_(notas, bloque) {
  notas = notas || '';
  const re = new RegExp(`${CABECERA}[\\s\\S]*?${MARCA}\\S+`);
  if (re.test(notas)) return notas.replace(re, bloque);
  return notas ? `${notas.trim()}\n\n${bloque}` : bloque;
}

function cargar_(nombre) {
  const raw = PropertiesService.getScriptProperties().getProperty(`estado_${nombre}`);
  return raw ? JSON.parse(raw) : {};
}

function guardar_(nombre, valor) {
  PropertiesService.getScriptProperties().setProperty(`estado_${nombre}`, JSON.stringify(valor));
}

// ============================================================================ Google Tasks

function sincronizarTasks_(entregas, simulacion) {
  const ahora = Date.now() / 1000;
  const res = { creadas: 0, reutilizadas: 0, actualizadas: 0, completadas: 0 };
  const estado = cargar_('tasks'); // clave -> {lista, id, creada, tipo}

  let listas = [];
  let token;
  do {
    const r = Tasks.Tasklists.list({ maxResults: 100, pageToken: token });
    listas = listas.concat(r.items || []);
    token = r.nextPageToken;
  } while (token);

  const listaDeCurso = {};
  function listaPara(e) {
    if (listaDeCurso[e.cursoId]) return listaDeCurso[e.cursoId];
    const candidatas = listas
      .map((l) => ({ l: l, p: encaje_(l.title, e.curso) }))
      .filter((x) => x.p > 0)
      .sort((a, b) => b.p - a.p || b.l.title.length - a.l.title.length);
    let lista = candidatas.length ? candidatas[0].l : null;
    if (!lista) {
      if (!CONFIG.CREAR_LISTAS_QUE_FALTEN) return null;
      console.log(`No hay lista para "${e.curso}": ${simulacion ? 'se crearía' : 'la creo'}.`);
      lista = simulacion ? { id: `nueva:${e.cursoId}`, title: e.curso } : Tasks.Tasklists.insert({ title: e.curso });
      listas.push(lista);
    } else if (simulacion) {
      console.log(`"${e.curso}" → lista "${lista.title}"`);
    }
    listaDeCurso[e.cursoId] = lista.id;
    return lista.id;
  }

  const tareasDeLista = {};
  function tareasDe(listaId) {
    if (tareasDeLista[listaId]) return tareasDeLista[listaId];
    let items = [];
    let pt;
    if (listaId.indexOf('nueva:') !== 0) {
      do {
        const r = Tasks.Tasks.list(listaId, { showCompleted: true, showHidden: true, maxResults: 100, pageToken: pt });
        items = items.concat(r.items || []);
        pt = r.nextPageToken;
      } while (pt);
    }
    return (tareasDeLista[listaId] = items);
  }

  const usadas = new Set(Object.keys(estado).map((k) => estado[k].id));

  Object.keys(entregas).forEach((clave) => {
    const e = entregas[clave];
    const listaId = listaPara(e);
    if (!listaId) return;
    const tareas = tareasDe(listaId);
    const reg = estado[clave];
    let creada = reg ? reg.creada : false;
    let t = reg ? tareas.find((x) => x.id === reg.id) : null;
    if (!t) t = tareas.find((x) => (x.notes || '').indexOf(MARCA + clave) >= 0);
    if (!t) {
      t = tareas.find(
        (x) => !usadas.has(x.id) && (x.notes || '').indexOf(MARCA) < 0 && parecido_(x.title, e.nombre),
      );
      if (t) {
        creada = false;
        res.reutilizadas++;
        console.log(`Reutilizo tu tarea "${t.title}" para "${e.nombre}".`);
      }
    }
    const bloque = bloqueNotas_(e);

    if (!t) {
      if (e.entregada) return; // ya entregada: no hace falta apuntarla
      if (e.fecha < ahora - CONFIG.NO_CREAR_SI_VENCIDA_HACE_DIAS * 86400) return;
      res.creadas++;
      console.log(`Nueva tarea: "${e.nombre}" (${e.curso})`);
      if (simulacion) return;
      t = Tasks.Tasks.insert({ title: e.nombre, notes: bloque, due: dueDe_(e.fecha) }, listaId);
      tareas.push(t);
      creada = true;
    } else {
      const cambios = {};
      const notas = conBloque_(t.notes, bloque);
      if (notas !== (t.notes || '')) cambios.notes = notas;
      const due = dueDe_(e.fecha);
      if (!t.due || t.due.slice(0, 10) !== due.slice(0, 10)) cambios.due = due;
      if (creada && t.title !== e.nombre) cambios.title = e.nombre;
      if (e.entregada && t.status !== 'completed') cambios.status = 'completed';
      if (Object.keys(cambios).length) {
        if (cambios.status) res.completadas++;
        else res.actualizadas++;
        if (!simulacion) t = Tasks.Tasks.patch(cambios, listaId, t.id);
      }
    }
    usadas.add(t.id);
    estado[clave] = { lista: listaId, id: t.id, creada: creada, tipo: e.tipo };
  });

  // Actividades del calendario de Moodle (cuestionarios, SCORM…) que ya no aparecen como
  // pendientes: las has completado, así que se marcan como hechas.
  Object.keys(estado).forEach((clave) => {
    const reg = estado[clave];
    if (entregas[clave] || reg.tipo === 'assign' || reg.completada) return;
    res.completadas++;
    if (!simulacion) {
      try {
        Tasks.Tasks.patch({ status: 'completed' }, reg.lista, reg.id);
      } catch (err) {
        // la tarea ya no existe
      }
    }
    reg.completada = true;
  });

  if (!simulacion) guardar_('tasks', estado);
  return res;
}

// ============================================================================ Google Calendar

function calendario_() {
  const existentes = CalendarApp.getCalendarsByName(CONFIG.CALENDARIO);
  if (existentes.length) return existentes[0];
  const cal = CalendarApp.createCalendar(CONFIG.CALENDARIO, {
    color: CalendarApp.Color.RED,
    timeZone: CONFIG.ZONA,
  });
  console.log(`Calendario "${CONFIG.CALENDARIO}" creado.`);
  return cal;
}

function ponerAvisos_(ev, minutos) {
  const actuales = ev
    .getPopupReminders()
    .slice()
    .sort((a, b) => a - b)
    .join(',');
  const deseados = minutos
    .slice()
    .sort((a, b) => a - b)
    .join(',');
  if (actuales === deseados && !ev.getEmailReminders().length) return false;
  ev.removeAllReminders();
  minutos.forEach((m) => ev.addPopupReminder(m));
  return true;
}

function crearEvento_(cal, titulo, inicio, opciones) {
  try {
    return cal.createEvent(titulo, inicio, inicio, opciones);
  } catch (err) {
    return cal.createEvent(titulo, inicio, new Date(inicio.getTime() + 60000), opciones);
  }
}

function sincronizarCalendar_(entregas, simulacion) {
  const res = { creados: 0, actualizados: 0 };
  const ahoraMs = Date.now();
  const cal = simulacion ? null : calendario_();
  const estado = cargar_('eventos'); // clave -> {id, aviso}

  Object.keys(entregas).forEach((clave) => {
    const e = entregas[clave];
    const reg = estado[clave] || {};
    const inicio = new Date(e.fecha * 1000);
    const titulo = (e.entregada ? '✅ ' : '') + e.nombre;
    const descripcion = [e.curso, e.url].filter(Boolean).join('\n');

    if (simulacion) {
      if (!reg.id && !e.entregada && inicio.getTime() > ahoraMs) res.creados++;
      return;
    }

    let ev = reg.id ? cal.getEventById(reg.id) : null;
    if (!ev) {
      // No creamos eventos para lo ya entregado o vencido
      if (e.entregada || inicio.getTime() < ahoraMs) return;
      ev = crearEvento_(cal, titulo, inicio, { description: descripcion });
      ponerAvisos_(ev, CONFIG.AVISOS_MIN);
      res.creados++;
    } else {
      let cambio = false;
      if (ev.getTitle() !== titulo) {
        ev.setTitle(titulo);
        cambio = true;
      }
      if (ev.getStartTime().getTime() !== inicio.getTime()) {
        ev.setTime(inicio, inicio);
        cambio = true;
      }
      if (ev.getDescription() !== descripcion) {
        ev.setDescription(descripcion);
        cambio = true;
      }
      if (e.entregada) {
        if (ev.getPopupReminders().length) {
          ev.removeAllReminders();
          cambio = true;
        }
      } else if (ponerAvisos_(ev, CONFIG.AVISOS_MIN)) {
        cambio = true;
      }
      if (cambio) res.actualizados++;
    }

    // Aviso de "1 semana antes" como evento aparte
    const avisoInicio = new Date(inicio.getTime() - 7 * 86400000);
    avisoInicio.setHours(CONFIG.HORA_AVISO_SEMANA, 0, 0, 0);
    let aviso = reg.aviso ? cal.getEventById(reg.aviso) : null;
    const quiereAviso = CONFIG.AVISO_UNA_SEMANA && !e.entregada && avisoInicio.getTime() > ahoraMs;
    if (quiereAviso) {
      const tituloAviso = `⏰ Queda 1 semana: ${e.nombre}`;
      if (!aviso) {
        aviso = crearEvento_(cal, tituloAviso, avisoInicio, { description: descripcion });
        ponerAvisos_(aviso, [0]);
      } else {
        if (aviso.getStartTime().getTime() !== avisoInicio.getTime()) aviso.setTime(avisoInicio, avisoInicio);
        if (aviso.getTitle() !== tituloAviso) aviso.setTitle(tituloAviso);
      }
    } else if (aviso && e.entregada) {
      aviso.deleteEvent();
      aviso = null;
    }

    estado[clave] = { id: ev.getId(), aviso: aviso ? aviso.getId() : null, tipo: e.tipo };
  });

  // Cuestionarios, SCORM… que ya no salen como pendientes en Moodle: completados
  if (!simulacion) {
    Object.keys(estado).forEach((clave) => {
      const reg = estado[clave];
      if (entregas[clave] || reg.tipo === 'assign' || reg.completado) return;
      const ev = reg.id ? cal.getEventById(reg.id) : null;
      if (ev) {
        if (ev.getTitle().indexOf('✅') !== 0) ev.setTitle('✅ ' + ev.getTitle());
        ev.removeAllReminders();
        res.actualizados++;
      }
      const aviso = reg.aviso ? cal.getEventById(reg.aviso) : null;
      if (aviso) aviso.deleteEvent();
      reg.completado = true;
    });
  }

  if (!simulacion) guardar_('eventos', estado);
  return res;
}

// ============================================================================ app Hermes

/**
 * Ejecuta esto una vez (después de "Implementar como aplicación web") para crear la clave
 * privada. En el registro sale el enlace que hay que pegar en la app (Ajustes → Google Calendar).
 */
function crearClaveApp() {
  const props = PropertiesService.getScriptProperties();
  let clave = props.getProperty('APP_KEY');
  if (!clave) {
    clave = Utilities.getUuid().replace(/-/g, '');
    props.setProperty('APP_KEY', clave);
  }
  const url = ScriptApp.getService().getUrl();
  if (!url) {
    console.log('Primero implementa el proyecto como aplicación web (Implementar → Nueva implementación).');
    return;
  }
  console.log('Pega este enlace en la app (Ajustes → Google Calendar). No lo compartas:');
  console.log(`${url}?key=${clave}`);
}

/** Cambia la clave (el enlace anterior deja de funcionar). */
function cambiarClaveApp() {
  PropertiesService.getScriptProperties().deleteProperty('APP_KEY');
  crearClaveApp();
}

/**
 * La app pide: <url>?key=CLAVE&desde=<ms>&hasta=<ms>
 * Devuelve los eventos de tus calendarios visibles en ese rango (máx. 100 días).
 */
function doGet(e) {
  const p = (e && e.parameter) || {};
  const clave = PropertiesService.getScriptProperties().getProperty('APP_KEY');
  if (!clave || p.key !== clave) return json_({ error: 'Clave incorrecta' });

  const ahora = Date.now();
  const desde = new Date(Number(p.desde) || ahora - 7 * 86400000);
  let hasta = new Date(Number(p.hasta) || ahora + 42 * 86400000);
  if (hasta - desde > 100 * 86400000) hasta = new Date(desde.getTime() + 100 * 86400000);

  const ocultos = new Set([CONFIG.CALENDARIO].concat(CONFIG.CALENDARIOS_OCULTOS_EN_APP));
  const calendarios = CalendarApp.getAllCalendars().filter(
    (c) => !c.isHidden() && c.isSelected() && !ocultos.has(c.getName()),
  );

  const eventos = [];
  calendarios.forEach((c) => {
    const nombre = c.getName();
    const color = c.getColor();
    c.getEvents(desde, hasta).forEach((ev) => {
      eventos.push({
        id: `${ev.getId()}@${ev.getStartTime().getTime()}`,
        titulo: ev.getTitle(),
        inicio: ev.getStartTime().getTime(),
        fin: ev.getEndTime().getTime(),
        todoElDia: ev.isAllDayEvent(),
        lugar: ev.getLocation() || undefined,
        calendario: nombre,
        color: color,
      });
    });
  });
  eventos.sort((a, b) => a.inicio - b.inicio);
  return json_({ desde: desde.getTime(), hasta: hasta.getTime(), eventos: eventos });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
