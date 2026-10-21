# Moodle → Google Tasks + Google Calendar

Script de Google Apps Script que se ejecuta **solo, cada hora, en los servidores de Google**: no necesita el PC encendido ni la app abierta. Es gratis.

## Elige qué quieres

El script tiene tres partes **independientes**. Ninguna es necesaria para usar la app: las **Novedades**, Pendientes, Asignaturas y el Horario de Hermes funcionan solo con el token de Moodle.

| Quiero… | Qué hacer |
|---|---|
| Solo la app (Novedades incluidas) | **Nada.** No hace falta instalar el script. |
| Mis entregas en **Google Tasks** | `USAR_TASKS: true` · `USAR_CALENDAR: false` |
| Eventos con avisos en **Google Calendar** | `USAR_TASKS: false` · `USAR_CALENDAR: true` |
| Las dos cosas | `USAR_TASKS: true` · `USAR_CALENDAR: true` (como viene) |
| Ver **mi Google Calendar dentro de la app** | Implementarlo como aplicación web ([ver abajo](#ver-tu-google-calendar-dentro-de-la-app-hermes)). Es aparte: funciona aunque tengas las dos opciones de arriba en `false`. |

Los interruptores están al principio de `Code.gs`, dentro de `CONFIG`. Si cambias alguno, guarda (💾) y listo: la siguiente ejecución horaria ya lo usa.

## Qué hace

**Google Tasks**
- Cada entrega de Moodle (tareas, cuestionarios, lecciones SCORM… con fecha) va a **la lista de su asignatura**. Busca la lista cuyo nombre coincida con el del módulo; si no existe ninguna, la crea.
- Si ya tenías la tarea apuntada a mano con un nombre parecido, **la reutiliza** en vez de duplicarla. Tu título y tus notas se respetan; solo añade un bloque al final de las notas.
- En las notas pone la **fecha y hora exactas** de entrega y el enlace a Moodle:
  ```
  — Moodle —
  Entrega: jueves 22/10/2026 a las 23:59
  Sistemas de Big Data
  https://educacionadistancia.juntadeandalucia.es/.../view.php?id=165530
  #moodle:assign-165530
  ```
  No borres la línea `#moodle:…`: es la que usa el script para reconocer la tarea.
- La fecha límite de la tarea es el día de entrega. La API de Google Tasks no permite poner hora; si quieres la hora en la tarea, la puedes añadir tú a mano.
- Cuando entregas en Moodle, **marca la tarea como completada**. Si la marcas tú antes, la deja como está.
- Si el profesor cambia la fecha, la actualiza.

**Google Calendar** (calendario nuevo **"Entregas Moodle"**, en rojo)
- Un evento a la **hora exacta** de entrega, con avisos **5 días, 3 días, 1 día, 6 horas y 2 horas** antes. Google permite como máximo 5 avisos por evento.
- El aviso de **1 semana antes** va como un evento aparte: "⏰ Queda 1 semana: …", a las 10:00 de ese día.
- Al entregar, el evento pasa a "✅ …", se le quitan los avisos y se borra el de "1 semana".

## Instalación (unos 5 minutos)

Hazlo con **la cuenta de Google donde tienes tus listas de Tasks**.

1. Ve a **https://script.google.com** → **Nuevo proyecto**. Ponle de nombre, por ejemplo, *Moodle → Google*.
2. Borra lo que hay en `Código.gs` y pega todo el contenido de **`Code.gs`**.
3. Pon los interruptores `USAR_TASKS` y `USAR_CALENDAR` de `CONFIG` según lo que quieras (tabla de arriba).
   Si usas Tasks, activa su API: en el menú de la izquierda, **Servicios (+)** → **Google Tasks API** → **Añadir**. Tiene que quedar con el identificador `Tasks`. Si no usas Tasks, sáltatelo.
4. Pon la zona horaria y el token: ⚙️ **Configuración del proyecto**
   - **Zona horaria**: `(GMT+01:00) Madrid`.
   - Abajo, **Propiedades del script** → **Añadir propiedad del script**:
     - Propiedad: `MOODLE_TOKEN`
     - Valor: tu token de Moodle (el mismo que usas en la app)
5. **Prueba primero sin cambiar nada**: vuelve al editor, elige la función **`simular`** en el desplegable de arriba y pulsa **Ejecutar**. La primera vez Google pide permisos ("Google no ha verificado esta aplicación" → *Configuración avanzada* → *Ir a … (no seguro)* → *Permitir*; es tu propio script). En el **registro de ejecución** verás:
   - qué asignatura va a qué lista,
   - qué tareas tuyas va a reutilizar,
   - qué tareas nuevas crearía.
6. Si todo cuadra, elige **`instalar`** y pulsa **Ejecutar**. Hace la primera sincronización y deja programada una cada hora.

Para pararlo: ejecuta **`desinstalar`**. No borra nada de Tasks ni de Calendar.

Si solo quieres ver tu Google Calendar en la app (las dos opciones en `false`), no hace falta `instalar`: salta directamente a la sección siguiente.

## Ver tu Google Calendar dentro de la app Hermes

El mismo script tiene una "puerta" privada (`doGet`) que le pasa a la app los eventos de tus calendarios: horario, cosas personales, etc. Incluye los eventos que se repiten y deja fuera "Entregas Moodle", que la app ya muestra a su manera.

1. Con el `Code.gs` actualizado pegado, pulsa **Implementar → Nueva implementación**.
2. En el engranaje de *Seleccionar tipo* elige **Aplicación web**:
   - *Ejecutar como*: **Yo**
   - *Quién tiene acceso*: **Cualquier usuario**. Hace falta para que la app pueda pedir los datos sin iniciar sesión en Google; sin la clave no devuelve nada.
   - Pulsa **Implementar** y autoriza los permisos.
3. Vuelve al editor, elige la función **`crearClaveApp`** y pulsa **Ejecutar**. En el registro sale un enlace como `https://script.google.com/macros/s/…/exec?key=…`.
4. Pásate ese enlace al móvil y, en la app, **Ajustes → Google Calendar → Pegar → Conectar**.

**El enlace es privado:** quien lo tenga puede ver tus eventos. Si se filtra, ejecuta **`cambiarClaveApp`** y pega el enlace nuevo en la app.

**Si cambias el código más adelante**, la aplicación web sigue usando la versión anterior hasta que la actualices: **Implementar → Gestionar implementaciones → ✏️ → Versión: Nueva versión → Implementar**. El enlace no cambia. La sincronización horaria con Tasks y Calendar usa siempre el código guardado, así que esa no hace falta actualizarla.

Para no enviar algún calendario a la app, añade su nombre a `CALENDARIOS_OCULTOS_EN_APP` en `CONFIG`. Solo se envían los calendarios que tienes marcados como visibles en Google Calendar.

## Ajustes

Al principio de `Code.gs`, en `CONFIG`:

| Opción | Para qué |
|---|---|
| `USAR_TASKS` | Crear y completar las entregas en Google Tasks. |
| `USAR_CALENDAR` | Crear los eventos con avisos en el calendario "Entregas Moodle". |
| `AVISOS_MIN` | Avisos del evento en minutos antes (máx. 5). Por defecto: 5 d, 3 d, 1 d, 6 h, 2 h. |
| `AVISO_UNA_SEMANA` / `HORA_AVISO_SEMANA` | El evento extra de "queda 1 semana" y a qué hora salta. |
| `CALENDARIO` | Nombre del calendario de Google que se crea. |
| `CREAR_LISTAS_QUE_FALTEN` | Crear una lista nueva si una asignatura no tiene la suya. |
| `INCLUIR_OTRAS_ACTIVIDADES` | `false` = solo tareas de entrega (sin lecciones SCORM ni cuestionarios). |
| `CALENDARIOS_OCULTOS_EN_APP` | Calendarios que no quieres ver en la app. |
| `NO_CREAR_SI_VENCIDA_HACE_DIAS` | No crear tareas de entregas vencidas hace más de X días. |

## Si algo falla

- Mira **Ejecuciones** (menú de la izquierda): ahí sale el registro de cada hora.
- `Moodle (...): invalidtoken` → el token ha caducado. Pon el nuevo en las Propiedades del script.
- Si una asignatura cae en la lista equivocada, cambia el nombre de la lista para que coincida mejor con el del módulo en Moodle.
