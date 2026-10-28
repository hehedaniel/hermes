# Cambios

Todos los cambios de Hermes, de lo más nuevo a lo más antiguo.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y versiones [SemVer](https://semver.org/lang/es/).
Las notas de cada release del APK salen de aquí.

## [Sin publicar]

## [2.1.0] - 2026-10-28

### Añadido
- **Tema «Obsidiana»** (Ajustes → Apariencia), ahora el tema por defecto: oscuro, editorial, con letra serif en los títulos y el verde lima como acento. Disponible en todas las pantallas, también en móvil.
- Nueva pantalla de **Notas** con tus calificaciones por asignatura.
- Foto del profesor, tal y como la tiene en Moodle, en el detalle de cada asignatura.
- Asignaturas con su propia lista y detalle de tarea rediseñado, y el asistente de IA, los ajustes de IA y los documentos generados con el mismo estilo.
- En móvil, la barra de abajo deja Pendientes y Calendario y reúne el resto (Novedades, Asignaturas, Asistente, Notas y Ajustes) en un botón central que se abre en abanico.

### Cambiado
- Se elimina el diseño de tableta: ahora solo hay móvil y escritorio.
- Si falta el módulo de notificaciones en una versión antigua de la app, esta arranca igualmente, sin avisos.

## [2.0.0] - 2026-10-26

### Cambiado
- **Rediseño completo («Andén»)**: papel cálido, tinta casi negra y un verde de señal para la acción importante de cada pantalla; tipografía Space Grotesk; cada asignatura es una «línea» con su color en toda la app; estados con color, icono y palabra. Modo oscuro dibujado aparte.
- Pantallas pensadas para cada tamaño: en el móvil, barra de pestañas abajo; en tableta, raíl de iconos; en escritorio, barra lateral con contadores. Pendientes muestra la lista y la tarea elegida a la vez; el calendario, el mes entero con el día al lado; la asignatura y el chat de IA, un panel de contexto.
- Pendientes: resumen de cifras (entregas, vencidas, urgentes, cerradas), secciones numeradas y bienvenida nueva sin cuenta. El detalle de la tarea, con tira de fechas, corrección con la nota en grande y tu entrega.
- Novedades, Calendario/Horario, Asignaturas, Ajustes y el chat de IA con el nuevo diseño. *Ajustes → Inteligencia artificial* pasa a su propia pantalla.
- Las tablas de las respuestas de la IA se ven como tablas.
- Icono, pantalla de carga y widgets con el nuevo estilo.
- Dentro de cada asignatura, los apartados (Unidad 1, Unidad 2…) empiezan plegados y dicen qué tienen: actividades, archivos, lo que queda por entregar, lo vencido y lo nuevo. Al tocarlos se despliegan.

## [1.3.0] - 2026-10-26

### Añadido
- **Hacer tareas con IA.** Botón *Hacer con IA* en cada tarea: un chat que ya conoce el enunciado, la asignatura y la fecha. Le pasas los archivos de la tarea (PDF, imágenes, código, CSV…), le pides lo que quieras y la conversación se guarda para seguir otro día.
- Los trabajos que genera la IA salen como documentos dentro del chat: los **PDF** se maquetan solos y se ven en el visor de la app; el código y los textos, como archivo.
- **Entregar en Moodle** desde el chat, con confirmación antes: sube el archivo a la tarea (o lo pega como texto en línea si la tarea es de texto) y avisa si sustituye lo que ya tenías entregado.
- *Ajustes → Inteligencia artificial*: eliges la IA de una lista (**Gemini**, **OpenRouter**, **ChatGPT**, **Claude**, **DeepSeek**, **Mistral** y **Groq**) y al tocar cada una ves qué puede y qué no (si es gratis, si lee PDF, si ve imágenes…). Cada una con tu clave, el modelo que prefieras e indicaciones para todas las tareas.
- A las IA que no leen PDF (DeepSeek, Mistral, Groq) Hermes les pasa el texto del PDF; si el PDF es escaneado, avisa.

### Cambiado
- Horario: nuevo profesor de Sistemas de Aprendizaje Automático, José Carlos del Arco Prieto.
- Ajustes muestra el número de versión correcto (se había quedado en 1.0.1).

## [1.2.0] - 2026-10-22

### Añadido
- **Notificaciones**: nota publicada, apuntes nuevos o actualizados, entregas nuevas y cambios de fecha. Hermes mira Moodle en segundo plano cada media hora más o menos, aunque esté cerrada.
- **Recordatorios** 1 día y 2 horas antes de cada entrega pendiente (avisando si solo tienes un borrador).
- Al tocar una notificación se abre la entrega o las Novedades.
- *Ajustes → Notificaciones*: activar o desactivar cada tipo de aviso y probar una notificación.
- El detalle de cada entrega muestra la **corrección** (nota, fecha, comentario y archivos del profesor) y **tu envío** (fecha, archivos y si está pendiente de corregir).

### Corregido
- Al abrir una entrega desde el widget ya se puede volver atrás.
- Las lecciones SCORM y los cuestionarios salen como hechos cuando los terminas (antes siempre aparecían pendientes). Un SCORM empezado y sin terminar sale como borrador.

## [1.1.0] - 2026-10-22

### Añadido
- Widgets para la pantalla de inicio (Android): **Próximas entregas**, con cuánto falta para cada una, y **Clases de hoy**, con la clase que toca ahora, cuánto dura cada una y cuáles ya han acabado. Si las clases ya han acabado, enseñan las del siguiente día lectivo. Se actualizan solos cada 30 minutos y al sincronizar.
- La versión de la app aparece al final de Ajustes, con un enlace a esta lista de cambios.

### Interno
- Pruebas automáticas (`npm test`) del token, el horario, las novedades y los widgets.
- Comprobaciones en GitHub (tipos, lint, pruebas y detección de secretos) antes de publicar la web o un APK.

## [1.0.1] - 2026-10-21

### Añadido
- Versión web instalable en iPhone desde Safari (*Compartir → Añadir a pantalla de inicio*), publicada en GitHub Pages.
- En la web, los archivos se abren en el navegador y Ajustes explica cómo conseguir el token desde un ordenador.
- Releases automáticas del APK al subir una etiqueta de versión.

### Cambiado
- El script de Google tiene interruptores para usar solo Google Tasks, solo Google Calendar o ninguno.

## [1.0.0] - 2026-10-21

Primera versión para compañeros.

### Añadido
- Pendientes, Novedades, Calendario con horario de clases, Asignaturas con descargas y visor de PDF.
- Inicio de sesión desde el móvil con el usuario de la Junta.
- Google Tasks y Google Calendar con Apps Script, y tu Google Calendar dentro de la app.

### Corregido
- La app ya no se queda "sincronizando" para siempre si Moodle no responde: cada petición se corta a los 25 s.

[Sin publicar]: https://github.com/hehedaniel/hermes/compare/v1.3.0...HEAD
[1.3.0]: https://github.com/hehedaniel/hermes/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/hehedaniel/hermes/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/hehedaniel/hermes/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/hehedaniel/hermes/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/hehedaniel/hermes/releases/tag/v1.0.0
