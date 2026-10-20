# Sincronizador para el PC

Script de Python (solo librería estándar, sin instalar nada) que **descarga todo el material de Moodle a tu PC**, ordenado por asignatura y bloque, y genera un resumen `PENDIENTES.md` con tus entregas.

```
Mi_Curso/                          <- la carpeta de tu curso (donde quieras)
├── PENDIENTES.md                  <- entregas por hacer, novedades y notas
├── Big_Data_Aplicado/
│   └── Moodle/
│       ├── 00 - General/
│       └── 03 - UNIDAD 1_ …/
│           ├── Hoja_de_ruta_UD1.pdf
│           └── Tarea - F1/F1_Enunciado_y_rubrica.pdf
├── Sistemas_de_Big_Data/
│   └── Moodle/…
└── _moodle/                       <- esta carpeta, con este nombre
```

- La primera vez lo descarga todo. Después, **solo lo nuevo o lo que el profesor haya cambiado**.
- Las carpetas `00, 01, 02…` son los bloques de la página de cada asignatura, en el mismo orden que en Moodle.
- Si ya tienes carpetas con el nombre de las asignaturas, las detecta y descarga dentro de ellas, en una subcarpeta `Moodle/`.
- `PENDIENTES.md` recoge las entregas ordenadas por fecha, las novedades de cada sincronización y todas las tareas con su estado y nota.
- `_moodle/tareas.ics` es un calendario de las entregas pendientes, con avisos.
- Si quieres, se ejecuta solo a las 8:00 y a las 15:00 y Windows te avisa de lo urgente.
- El "Punto de encuentro" del instituto se ignora (`cursos_ignorados` en `config.json`).

> Lo que hay dentro de las carpetas `Moodle/` es una copia del aula virtual y se sobrescribe si el profesor actualiza un archivo. Guarda tus trabajos fuera de ellas.

## Instalación

Necesitas Python 3 (https://www.python.org; marca *"Add python.exe to PATH"* al instalarlo).

1. Copia esta carpeta dentro de la carpeta de tu curso y llámala **`_moodle`**.
2. **`login.bat`**: abre el login de la Junta (CAS) en el navegador. Inicia sesión y, cuando la página se quede en blanco, pulsa **F12 → Consola → F5**. Copia el texto `moodlemobile://token=…` del error rojo y pégalo en la ventana negra. El token se guarda en `_moodle\.env`. **No lo compartas ni lo subas a git.**
3. Opcional: revisa en **`config.json`** a qué carpeta va cada curso (`null` = no descargar).
4. **`sincronizar.bat`**: descarga y abre `PENDIENTES.md`.
5. Opcional: **`programar_tarea.bat`** crea una tarea de Windows a las 8:00 y a las 15:00. No necesita administrador. Para quitarla: `Unregister-ScheduledTask -TaskName 'Moodle IA_BD'`.

Si algo falla, mira `_moodle\ultima_sincronizacion.log`, que no incluye el token.

## Archivos

| Archivo | Para qué |
|---|---|
| `moodle_sync.py` | El programa (`login`, `cursos`, `sync`, `sync --auto`) |
| `login.bat` · `sincronizar.bat` · `cursos.bat` | Atajos para Windows |
| `programar_tarea.bat` / `.ps1` | Tarea programada diaria |
| `config.json` · `.env` · `estado.json` | Se crean solos (configuración, token y registro de descargas) |

Si tu carpeta del curso es un repositorio git, añade esto a su `.gitignore`:

```gitignore
.env
_moodle/estado.json
_moodle/*.log
_moodle/tareas.ics
PENDIENTES.md
*/Moodle/
```
