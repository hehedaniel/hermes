#!/usr/bin/env python3
"""
Sincroniza el Moodle de Educación a Distancia (Junta de Andalucía) con la carpeta del curso.

  python moodle_sync.py login     -> conecta con Moodle (CAS, por el navegador) y guarda el token
  python moodle_sync.py cursos    -> lista tus cursos y la carpeta local a la que va cada uno
  python moodle_sync.py sync      -> descarga lo nuevo y genera PENDIENTES.md y tareas.ics
  python moodle_sync.py sync --auto   (modo desatendido: sin preguntas, log y aviso de Windows)

Solo usa la librería estándar de Python (no hace falta instalar nada).
"""
import base64
import hashlib
import html
import json
import os
import re
import secrets
import subprocess
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
import webbrowser
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = Path(os.environ.get("MOODLE_SYNC_ROOT", HERE.parent)).resolve()
CONFIG_FILE = HERE / "config.json"
ENV_FILE = HERE / ".env"
OLD_TOKEN_FILE = HERE / "token.json"  # formato antiguo, se migra solo a .env
STATE_FILE = HERE / "estado.json"
LOG_FILE = HERE / "ultima_sincronizacion.log"
ICS_FILE = HERE / "tareas.ics"
PENDIENTES_FILE = ROOT / "PENDIENTES.md"

DEFAULT_CONFIG = {
    "moodle_url": "https://educacionadistancia.juntadeandalucia.es/centros/huelva",
    "subcarpeta": "Moodle",
    "avisar_dias": 3,
    "descargar_paginas": True,
    "crear_accesos_url": True,
    "crear_carpetas": True,
    # Cursos que no interesan (se ignoran por completo: ni descargas ni entregas)
    "cursos_ignorados": ["Punto de encuentro"],
    "cursos": {},
}

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) moodle-sync-IA_BD MoodleMobile"
DIAS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]
FALLOS = []
WIN_RESERVED = {"CON", "PRN", "AUX", "NUL", *(f"COM{i}" for i in range(1, 10)), *(f"LPT{i}" for i in range(1, 10))}


class MoodleError(Exception):
    def __init__(self, code, message):
        super().__init__(f"{code}: {message}")
        self.code = code


# ----------------------------------------------------------------------------- utilidades

def load_json(path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return default


def save_json(path, data):
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(tmp, path)


def load_config():
    cfg = dict(DEFAULT_CONFIG)
    cfg.update(load_json(CONFIG_FILE, {}))
    cfg["moodle_url"] = cfg["moodle_url"].rstrip("/")
    return cfg


def norm(s):
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "", s)


def strip_html(s):
    return html.unescape(re.sub(r"<[^>]+>", " ", s or ""))


def clean(name, maxlen=80):
    """Nombre válido para carpeta/archivo en Windows."""
    s = strip_html(name)
    s = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", s)
    s = re.sub(r"\s+", " ", s).strip().rstrip(". ")
    if s.split(".")[0].upper() in WIN_RESERVED:
        s = "_" + s
    return s[:maxlen].rstrip(". ") or "_"


def clean_filename(name, maxlen=100):
    name = clean(name, maxlen=255)
    stem, dot, ext = name.rpartition(".")
    if not dot or len(ext) > 10:
        return clean(name, maxlen)
    return clean(stem, maxlen - len(ext) - 1) + "." + ext


MAX_PATH = 250  # Windows no admite rutas de más de 260 caracteres (dejo margen para ".part")


def fit_path(dest):
    """Acorta el nombre del archivo si la ruta completa no cabe en Windows."""
    s = str(dest)
    if len(s) + 5 <= MAX_PATH:
        return dest
    over = len(s) + 5 - MAX_PATH
    stem, suf = dest.stem, dest.suffix
    keep = len(stem) - over - 5
    if keep >= 15:
        h = hashlib.md5(stem.encode("utf-8")).hexdigest()[:4]
        return dest.with_name(stem[:keep].rstrip(". ") + "~" + h + suf)
    return dest  # ni así cabe: se guarda igualmente con el prefijo de ruta larga (lp)


def lp(path):
    """Ruta con prefijo \\\\?\\ en Windows para saltarse el límite de 260 caracteres."""
    s = str(path)
    if os.name == "nt" and len(s) >= 240 and not s.startswith("\\\\?\\"):
        return "\\\\?\\" + os.path.abspath(s)
    return s


def fmt_fecha(ts):
    d = datetime.fromtimestamp(ts)
    return f"{DIAS[d.weekday()][:3]} {d:%d/%m/%Y %H:%M}"


def faltan(ts, now):
    secs = ts - now
    if secs < 0:
        dias = int(-secs // 86400)
        return "vencida" if dias == 0 else f"vencida hace {dias} d"
    if secs < 86400:
        return f"{int(secs // 3600)} h"
    return f"{int(secs // 86400)} d"


def log(*args):
    print(*args, flush=True)


# ----------------------------------------------------------------------------- cliente Moodle

def flatten(params, prefix=""):
    out = {}
    if isinstance(params, dict):
        items = params.items()
    else:
        items = enumerate(params)
    for k, v in items:
        key = f"{prefix}[{k}]" if prefix else str(k)
        if isinstance(v, (dict, list, tuple)):
            out.update(flatten(v, key))
        elif isinstance(v, bool):
            out[key] = int(v)
        else:
            out[key] = v
    return out


class Moodle:
    def __init__(self, base, token):
        self.base = base.rstrip("/")
        self.token = token

    def call(self, function, **params):
        data = {"wstoken": self.token, "wsfunction": function, "moodlewsrestformat": "json"}
        data.update(flatten(params))
        req = urllib.request.Request(
            f"{self.base}/webservice/rest/server.php",
            data=urllib.parse.urlencode(data).encode(),
            headers={"User-Agent": UA},
        )
        with urllib.request.urlopen(req, timeout=90) as r:
            res = json.loads(r.read().decode("utf-8"))
        if isinstance(res, dict) and ("exception" in res or "errorcode" in res):
            raise MoodleError(res.get("errorcode"), res.get("message"))
        return res

    def download(self, fileurl, dest, intentos=3):
        for i in range(1, intentos + 1):
            try:
                return self._download(fileurl, dest)
            except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
                if i == intentos:
                    raise
                log(f"   … reintentando {dest.name} ({i}/{intentos - 1}): {getattr(e, 'reason', e)}")
                time.sleep(5 * i)

    def _download(self, fileurl, dest):
        sep = "&" if "?" in fileurl else "?"
        url = f"{fileurl}{sep}token={urllib.parse.quote(self.token)}"
        Path(lp(dest.parent)).mkdir(parents=True, exist_ok=True)
        tmp = lp(dest.with_name(dest.name + ".part"))
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=120) as r, open(tmp, "wb") as f:
            ctype = r.headers.get("Content-Type", "")
            first = r.read(65536)
            # Un error de Moodle vuelve como JSON en lugar del archivo
            if "application/json" in ctype and first.lstrip().startswith(b"{"):
                try:
                    err = json.loads(first.decode("utf-8"))
                    if "errorcode" in err or "error" in err:
                        raise MoodleError(err.get("errorcode", "download"), err.get("error") or err.get("message"))
                except (ValueError, UnicodeDecodeError):
                    pass
            f.write(first)
            while chunk := r.read(1 << 20):
                f.write(chunk)
        os.replace(tmp, lp(dest))


ENV_KEYS = {"token": "MOODLE_TOKEN", "privatetoken": "MOODLE_PRIVATETOKEN", "userid": "MOODLE_USERID",
            "usuario": "MOODLE_USUARIO", "guardado": "MOODLE_GUARDADO"}


def load_env():
    """Lee _moodle/.env (KEY=valor). Las variables de entorno del sistema tienen prioridad."""
    vals = {}
    try:
        for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                vals[k.strip()] = v.strip().strip('"').strip("'")
    except FileNotFoundError:
        pass
    vals.update({k: v for k, v in os.environ.items() if k.startswith("MOODLE_")})
    return vals


def save_token(data):
    lines = ["# Credenciales de Moodle generadas por login.bat. NO subir a git (está en .gitignore).",
             "# Si alguien obtiene este token puede entrar en tu Moodle: si se filtra, cierra sesión en",
             "# Moodle > Preferencias > Claves de seguridad y vuelve a ejecutar login.bat."]
    for k, env in ENV_KEYS.items():
        if data.get(k) is not None:
            lines.append(f"{env}={data[k]}")
    ENV_FILE.write_bytes(("\n".join(lines) + "\n").encode("utf-8"))


def load_token():
    env = load_env()
    if not env.get("MOODLE_TOKEN") and OLD_TOKEN_FILE.exists():
        old = load_json(OLD_TOKEN_FILE, {})
        if old.get("token"):
            save_token(old)
            OLD_TOKEN_FILE.unlink()
            log("(Token migrado de token.json a .env)")
            env = load_env()
    if not env.get("MOODLE_TOKEN"):
        return None
    tok = {k: env.get(e) for k, e in ENV_KEYS.items()}
    tok["userid"] = int(tok["userid"]) if tok.get("userid") else None
    return tok


def get_moodle(cfg):
    tok = load_token()
    if not tok or not tok.get("token"):
        raise SystemExit("No hay token guardado. Ejecuta primero login.bat (python moodle_sync.py login).")
    return Moodle(cfg["moodle_url"], tok["token"]), tok


# ----------------------------------------------------------------------------- login

def cmd_login(cfg):
    base = cfg["moodle_url"]
    passport = str(secrets.randbelow(900_000_000) + 100_000_000)
    url = (f"{base}/admin/tool/mobile/launch.php?service=moodle_mobile_app"
           f"&passport={passport}&urlscheme=moodlemobile")
    log("\n=== Conectar con Moodle ===\n")
    log("1. Se va a abrir el navegador. Inicia sesión con tu usuario de la Junta (CAS) como siempre.")
    log("2. Al terminar, la página se quedará en blanco o el navegador preguntará si abrir 'moodlemobile'.")
    log("   Cancela ese aviso. Pulsa F12 -> pestaña 'Consola' y pulsa F5 para recargar la página.")
    log("   Aparecerá un error rojo tipo:  Failed to launch 'moodlemobile://token=XXXXXXXX...'")
    log("3. Copia ese texto 'moodlemobile://token=...' (o solo lo que va detrás de token=) y pégalo aquí.\n")
    log("Si no se abre solo, copia este enlace en el navegador:\n")
    log(url + "\n")
    try:
        webbrowser.open(url)
    except Exception:
        pass

    raw = input("Pega aquí el enlace o el token: ").strip().strip("'\"")
    raw = urllib.parse.unquote(raw)
    m = re.search(r"token=([A-Za-z0-9+/=_-]+)", raw)
    b64 = (m.group(1) if m else raw).strip()
    b64 += "=" * (-len(b64) % 4)
    try:
        decoded = base64.b64decode(b64.replace("-", "+").replace("_", "/")).decode("utf-8")
    except Exception:
        raise SystemExit("Eso no parece un token válido. Vuelve a intentarlo copiando todo lo de detrás de token=")
    parts = decoded.split(":::")
    if len(parts) < 2:
        raise SystemExit("Eso no parece un token válido (formato inesperado).")
    signature, token = parts[0], parts[1]
    private = parts[2] if len(parts) > 2 else None

    candidates = {hashlib.md5((u + passport).encode()).hexdigest() for u in (base, base + "/", base.replace("https://", "http://"))}
    if signature not in candidates:
        log("Aviso: la firma no coincide con este intento de login (¿has pegado un token de otro intento?). Lo pruebo igualmente.")

    m_ = Moodle(base, token)
    info = m_.call("core_webservice_get_site_info")
    save_token({
        "token": token,
        "privatetoken": private,
        "userid": info["userid"],
        "usuario": info.get("fullname"),
        "guardado": datetime.now().isoformat(timespec="seconds"),
    })
    if OLD_TOKEN_FILE.exists():
        OLD_TOKEN_FILE.unlink()
    log(f"\nConectado como {info.get('fullname')} en «{strip_html(info.get('sitename', ''))}». Token guardado.")
    update_courses(cfg, m_, info["userid"], verbose=True)


# ----------------------------------------------------------------------------- cursos

def local_subject_dirs():
    return [d.name for d in ROOT.iterdir() if d.is_dir() and not d.name.startswith((".", "_"))]


def guess_folder(course, dirs):
    full, short = norm(course.get("fullname")), norm(course.get("shortname"))
    hits = [d for d in dirs if norm(d) and (norm(d) in full or norm(d) in short or (full and full in norm(d)))]
    return max(hits, key=len) if hits else None


def ignorado(cfg, nombre):
    n = norm(nombre)
    return any(norm(x) and norm(x) in n for x in cfg.get("cursos_ignorados", []))


def update_courses(cfg, m, userid, verbose=False):
    courses = m.call("core_enrol_get_users_courses", userid=userid)
    dirs = local_subject_dirs()
    known = cfg.setdefault("cursos", {})
    # Fuera los cursos ignorados (p. ej. el "Punto de encuentro" del instituto)
    for cid in [k for k, v in known.items() if ignorado(cfg, v.get("nombre", ""))]:
        del known[cid]
    courses = [c for c in courses if not ignorado(cfg, c.get("fullname", ""))]
    for c in courses:
        cid = str(c["id"])
        if cid not in known:
            carpeta = guess_folder(c, dirs)
            if not carpeta and cfg.get("crear_carpetas", True):
                carpeta = re.sub(r"\s+", "_", clean(c.get("fullname") or c.get("shortname") or cid, 60))
            known[cid] = {"nombre": strip_html(c.get("fullname")), "carpeta": carpeta}
        else:
            known[cid]["nombre"] = strip_html(c.get("fullname"))
    save_json(CONFIG_FILE, cfg)
    if verbose:
        log("\nCursos encontrados (edita config.json para cambiar la carpeta; null = no descargar):\n")
        for cid, c in known.items():
            dest = c["carpeta"] or "— (null: no se descarga)"
            log(f"  [{cid:>6}] {c['nombre']}\n           -> {dest}")
        log("")
    return courses


def cmd_cursos(cfg):
    m, tok = get_moodle(cfg)
    update_courses(cfg, m, tok["userid"], verbose=True)


# ----------------------------------------------------------------------------- sincronización

def sync_file(m, state, fileurl, dest, tmod, size, new_files, label):
    key = fileurl.split("?")[0]
    rec = state["archivos"].get(key)
    dest = fit_path(dest)
    rel = str(dest.relative_to(ROOT))
    if rec and rec.get("t") == tmod and rec.get("s") == size:
        if os.path.exists(lp(ROOT / rec["ruta"])):
            if rec["ruta"] != rel:  # han renombrado tema/actividad en Moodle: lo muevo
                Path(lp(dest.parent)).mkdir(parents=True, exist_ok=True)
                if not os.path.exists(lp(dest)):
                    os.replace(lp(ROOT / rec["ruta"]), lp(dest))
                    rec["ruta"] = rel
            return
    try:
        m.download(fileurl, dest)
    except (urllib.error.URLError, MoodleError, OSError) as e:
        log(f"   ! No se pudo descargar {dest.name}: {getattr(e, 'reason', e)}")
        FALLOS.append(rel)
        return
    if tmod:
        try:
            os.utime(lp(dest), (tmod, tmod))
        except OSError:
            pass
    is_update = rec is not None
    state["archivos"][key] = {"t": tmod, "s": size, "ruta": rel}
    new_files.append((label, rel, is_update))
    log(f"   {'↻' if is_update else '+'} {rel}")


def write_shortcut(dest, url, state, new_files, label):
    dest = fit_path(dest)
    rel = str(dest.relative_to(ROOT))
    content = f"[InternetShortcut]\r\nURL={url}\r\n".encode("utf-8")
    if os.path.exists(lp(dest)) and Path(lp(dest)).read_bytes() == content:
        return
    Path(lp(dest.parent)).mkdir(parents=True, exist_ok=True)
    Path(lp(dest)).write_bytes(content)
    new_files.append((label, rel, False))
    log(f"   + {rel}")


def sync_course(m, cfg, state, cid, course, assigns_by_cmid, new_files):
    base_dir = ROOT / course["carpeta"] / cfg["subcarpeta"]
    label = course["nombre"]
    sections = m.call("core_course_get_contents", courseid=int(cid))
    for idx, sec in enumerate(sections):
        mods = [x for x in sec.get("modules", []) if x.get("uservisible", True)]
        if not mods:
            continue
        secname = clean(sec.get("name") or f"Sección {sec.get('section', idx)}", 70)
        secdir = base_dir / f"{idx:02d} - {secname}"
        for mod in mods:
            modname = mod.get("modname")
            name = clean(mod.get("name", ""), 70)
            files = [f for f in (mod.get("contents") or []) if f.get("type") == "file" and f.get("fileurl")]

            if modname == "url":
                if cfg.get("crear_accesos_url"):
                    links = [f for f in (mod.get("contents") or []) if f.get("type") == "url" and f.get("fileurl")]
                    if links:
                        write_shortcut(secdir / f"{name}.url", links[0]["fileurl"], state, new_files, label)
                continue

            if modname == "assign":
                a = assigns_by_cmid.get(mod.get("id"))
                files = [f for f in ((a or {}).get("introattachments") or []) if f.get("fileurl")]
                targets = [(f, secdir / f"Tarea - {name}" / clean_filename(f["filename"])) for f in files]
            elif modname == "page":
                if not cfg.get("descargar_paginas"):
                    continue
                targets = []
                for f in files:
                    if f.get("filename") == "index.html" and (f.get("filepath") or "/") == "/":
                        targets.append((f, secdir / f"{name}.html"))
                    else:
                        targets.append((f, secdir / f"{name}_archivos" / clean_filename(f["filename"])))
            elif modname == "resource" and len(files) == 1:
                targets = [(files[0], secdir / clean_filename(files[0]["filename"]))]
            else:  # folder, resource con varios archivos, book, etc.
                targets = []
                for f in files:
                    sub = [clean(p) for p in (f.get("filepath") or "/").strip("/").split("/") if p]
                    targets.append((f, secdir.joinpath(name, *sub, clean_filename(f["filename"]))))

            for f, dest in targets:
                sync_file(m, state, f["fileurl"], dest, f.get("timemodified") or 0, f.get("filesize") or 0, new_files, label)


def get_assignments(m, course_ids):
    if not course_ids:
        return []
    res = m.call("mod_assign_get_assignments", courseids=[int(c) for c in course_ids])
    out = []
    for c in res.get("courses", []):
        for a in c.get("assignments", []):
            a["_courseid"] = c["id"]
            a["_course"] = strip_html(c.get("fullname"))
            out.append(a)
    return out


def submission_status(m, assign_id):
    try:
        st = m.call("mod_assign_get_submission_status", assignid=assign_id)
    except MoodleError:
        return None, None
    last = st.get("lastattempt") or {}
    sub = last.get("submission") or last.get("teamsubmission") or {}
    graded = (st.get("feedback") or {}).get("gradefordisplay")
    return sub.get("status"), (strip_html(graded).strip() if graded else None)


def get_action_events(m, now):
    try:
        res = m.call("core_calendar_get_action_events_by_timesort",
                     timesortfrom=now - 14 * 86400, limitnum=50)
    except MoodleError as e:
        log(f"   ! No se pudieron leer los eventos del calendario: {e}")
        return []
    return res.get("events", [])


# ----------------------------------------------------------------------------- informes

ESTADOS = {"submitted": "✅ Entregada", "draft": "📝 Borrador", "new": "⏳ Sin entregar", "reopened": "🔁 Reabierta"}


def build_items(events, assignments, statuses, now, base):
    """Lista unificada de cosas pendientes (sin entregar) con fecha, sin duplicados."""
    items = {}
    for e in events:
        if e.get("action") and e["action"].get("actionable") is False:
            continue
        if ignorado(CFG_ACTUAL, (e.get("course") or {}).get("fullname", "")):
            continue
        url = e.get("url") or (e.get("action") or {}).get("url") or ""
        m = re.search(r"[?&]id=(\d+)", url)
        # Clave por cmid (el id de la URL view.php?id=...): así no se repite con la lista de tareas
        key = f"{e.get('modulename')}-{m.group(1) if m else 'i' + str(e.get('instance'))}"
        items[key] = {
            "nombre": strip_html(e.get("activityname") or e.get("name")),
            "curso": strip_html((e.get("course") or {}).get("fullname", "")),
            "fecha": e.get("timesort") or e.get("timestart"),
            "url": url or None,
            "tipo": e.get("modulename"),
        }
    for a in assignments:
        st, _ = statuses.get(a["id"], (None, None))
        if not a.get("duedate") or st == "submitted":
            continue
        key = f"assign-{a.get('cmid')}"
        if key in items or a["duedate"] < now - 14 * 86400:
            continue
        items[key] = {"nombre": a["name"], "curso": a["_course"], "fecha": a["duedate"],
                      "url": f"{base}/mod/assign/view.php?id={a.get('cmid')}", "tipo": "assign"}
    return sorted(items.items(), key=lambda kv: kv[1]["fecha"] or 0)


def write_pendientes(cfg, items, assignments, statuses, new_files, first_run, now):
    L = ["# Pendientes de Moodle", "", f"_Actualizado: {fmt_fecha(now)} · generado por `_moodle/moodle_sync.py`_", ""]
    if FALLOS:
        L += [f"> ⚠️ {len(FALLOS)} archivos no se pudieron descargar (se reintentará en la próxima sincronización). Detalle en `_moodle/ultima_sincronizacion.log`.", ""]

    L += ["## Próximas entregas sin hacer", ""]
    if items:
        L += ["| Fecha | Faltan | Asignatura | Actividad |", "|---|---|---|---|"]
        for _, it in items:
            nombre = f"[{it['nombre']}]({it['url']})" if it.get("url") else it["nombre"]
            aviso = " ⚠️" if it["fecha"] - now < cfg["avisar_dias"] * 86400 else ""
            L.append(f"| {fmt_fecha(it['fecha'])} | {faltan(it['fecha'], now)}{aviso} | {it['curso']} | {nombre} |")
    else:
        L.append("Nada pendiente con fecha. 🎉")
    L.append("")

    L += ["## Novedades de esta sincronización", ""]
    if first_run:
        L.append(f"Primera sincronización: {len(new_files)} archivos descargados.")
    elif new_files:
        for label, rel, upd in new_files:
            L.append(f"- {'(actualizado) ' if upd else ''}**{label}** — `{rel}`")
    else:
        L.append("Nada nuevo.")
    L.append("")

    L += ["## Todas las tareas", ""]
    by_course = {}
    for a in assignments:
        by_course.setdefault(a["_course"], []).append(a)
    for course, lst in sorted(by_course.items()):
        L += [f"### {course}", "", "| Tarea | Fecha límite | Estado | Nota |", "|---|---|---|---|"]
        for a in sorted(lst, key=lambda x: x.get("duedate") or 0):
            st, grade = statuses.get(a["id"], (None, None))
            estado = ESTADOS.get(st, st or "—")
            if st != "submitted" and a.get("duedate") and a["duedate"] < now:
                estado = "⚠️ Vencida sin entregar"
            fecha = fmt_fecha(a["duedate"]) if a.get("duedate") else "sin fecha"
            L.append(f"| {a['name']} | {fecha} | {estado} | {grade or ''} |")
        L.append("")
    PENDIENTES_FILE.write_bytes(("\n".join(L) + "\n").encode("utf-8"))


def ics_escape(s):
    return (s or "").replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")


def write_ics(items, now):
    def dt(ts):
        return datetime.fromtimestamp(ts, timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//IA_BD//moodle-sync//ES", "CALSCALE:GREGORIAN",
         "X-WR-CALNAME:Entregas Moodle IA_BD"]
    for key, it in items:
        if not it["fecha"] or it["fecha"] < now:
            continue
        L += ["BEGIN:VEVENT", f"UID:{key}@moodle-iabd", f"DTSTAMP:{dt(now)}",
              f"DTSTART:{dt(it['fecha'] - 1800)}", f"DTEND:{dt(it['fecha'])}",
              f"SUMMARY:{ics_escape('Entrega: ' + it['nombre'])}",
              f"DESCRIPTION:{ics_escape(it['curso'] + (chr(10) + it['url'] if it.get('url') else ''))}"]
        if it.get("url"):
            L.append(f"URL:{it['url']}")
        for trig in ("-P1D", "-PT3H"):
            L += ["BEGIN:VALARM", "ACTION:DISPLAY", f"TRIGGER:{trig}",
                  f"DESCRIPTION:{ics_escape(it['nombre'])}", "END:VALARM"]
        L.append("END:VEVENT")
    L.append("END:VCALENDAR")
    ICS_FILE.write_bytes(("\r\n".join(L) + "\r\n").encode("utf-8"))


def notify(title, msg):
    if os.name != "nt":
        return
    q = lambda s: "'" + s.replace("'", "''") + "'"
    ps = ("Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing; "
          "$n = New-Object System.Windows.Forms.NotifyIcon; $n.Icon = [System.Drawing.SystemIcons]::Information; "
          f"$n.BalloonTipTitle = {q(title[:60])}; $n.BalloonTipText = {q(msg[:250])}; "
          "$n.Visible = $true; $n.ShowBalloonTip(15000); Start-Sleep -Seconds 15; $n.Dispose()")
    try:
        subprocess.Popen(["powershell", "-NoProfile", "-WindowStyle", "Hidden", "-Command", ps],
                         creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
    except OSError:
        pass


CFG_ACTUAL = dict(DEFAULT_CONFIG)


def cmd_sync(cfg, auto=False):
    CFG_ACTUAL.update(cfg)
    now = int(time.time())
    log(f"=== Sincronización {fmt_fecha(now)} ===")
    try:
        m, tok = get_moodle(cfg)
        update_courses(cfg, m, tok["userid"])
    except MoodleError as e:
        if e.code in ("invalidtoken", "accessexception"):
            msg = "El token de Moodle ha caducado. Ejecuta _moodle\\login.bat"
            log(msg)
            if auto:
                notify("Moodle IA_BD", msg)
            raise SystemExit(1)
        raise

    state = load_json(STATE_FILE, {"archivos": {}})
    first_run = not state["archivos"]
    selected = {cid: c for cid, c in cfg["cursos"].items() if c.get("carpeta")}
    skipped = [c["nombre"] for c in cfg["cursos"].values() if not c.get("carpeta")]
    if skipped:
        log("Cursos sin carpeta asignada (no se descargan): " + "; ".join(skipped))

    log("Leyendo tareas...")
    try:
        assignments = get_assignments(m, list(cfg["cursos"].keys()))
    except MoodleError as e:
        log(f"   ! No se pudieron leer las tareas: {e}")
        assignments = []
    assigns_by_cmid = {a.get("cmid"): a for a in assignments}

    new_files = []
    for cid, course in selected.items():
        log(f"\n> {course['nombre']}  ->  {course['carpeta']}/{cfg['subcarpeta']}")
        try:
            sync_course(m, cfg, state, cid, course, assigns_by_cmid, new_files)
        except (MoodleError, urllib.error.URLError) as e:
            log(f"   ! Error en este curso: {e}")
        save_json(STATE_FILE, state)

    log("\nComprobando entregas...")
    statuses = {a["id"]: submission_status(m, a["id"]) for a in assignments}
    events = get_action_events(m, now)
    items = build_items(events, assignments, statuses, now, cfg["moodle_url"])
    write_pendientes(cfg, items, assignments, statuses, new_files, first_run, now)
    write_ics(items, now)

    urgent = [it for _, it in items if it["fecha"] and it["fecha"] - now < cfg["avisar_dias"] * 86400]
    log(f"\nListo: {len(new_files)} archivos nuevos/actualizados, {len(items)} entregas pendientes "
        f"({len(urgent)} en menos de {cfg['avisar_dias']} días).")
    log(f"Resumen en {PENDIENTES_FILE}")
    if FALLOS:
        log(f"\n{len(FALLOS)} archivos no se pudieron descargar (se reintentará la próxima vez):")
        for r in FALLOS:
            log(f"   ! {r}")
    for it in urgent:
        log(f"   ⚠️  {fmt_fecha(it['fecha'])} ({faltan(it['fecha'], now)}) · {it['curso']} · {it['nombre']}")

    if auto and (urgent or (new_files and not first_run)):
        partes = []
        if new_files and not first_run:
            partes.append(f"{len(new_files)} archivos nuevos")
        if urgent:
            u = urgent[0]
            partes.append(f"{len(urgent)} entregas próximas · la primera: {u['nombre']} ({faltan(u['fecha'], now)})")
        notify("Moodle IA_BD", " · ".join(partes))


class Tee:
    """Escribe a la vez en la consola y en el archivo de log."""
    def __init__(self, *streams):
        self.streams = streams

    def write(self, data):
        for st in self.streams:
            try:
                st.write(data)
            except Exception:
                pass
        return len(data)

    def flush(self):
        for st in self.streams:
            try:
                st.flush()
            except Exception:
                pass


def main():
    args = sys.argv[1:]
    auto = "--auto" in args
    args = [a for a in args if a != "--auto"]
    cmd = args[0] if args else "sync"

    logf = open(LOG_FILE if cmd == "sync" else HERE / f"ultimo_{cmd}.log", "w", encoding="utf-8")
    if auto or sys.stdout is None:
        sys.stdout = sys.stderr = logf
    else:
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass
        sys.stdout = Tee(sys.stdout, logf)
        sys.stderr = Tee(sys.stderr, logf)

    cfg = load_config()
    if not CONFIG_FILE.exists():
        save_json(CONFIG_FILE, cfg)
    try:
        if cmd == "login":
            cmd_login(cfg)
        elif cmd == "cursos":
            cmd_cursos(cfg)
        elif cmd == "sync":
            cmd_sync(cfg, auto=auto)
        else:
            print(__doc__)
    except urllib.error.URLError as e:
        log(f"No se pudo conectar con Moodle: {e}")
        if auto:
            notify("Moodle IA_BD", "No se pudo conectar con Moodle (¿sin internet?)")
        sys.exit(1)
    except MoodleError as e:
        log(f"Error de Moodle: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
