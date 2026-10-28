# Cambios

Todos los cambios de Hermes, de lo más nuevo a lo más antiguo.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y versiones [SemVer](https://semver.org/lang/es/).
Las notas de cada release del APK salen de aquí.

## [Sin publicar]

## [2.4.0] - 2026-10-29

### Añadido
- **Sincronización móvil ↔ web.** Tus faltas, el límite 10/20 %, las plantillas y tu estilo de escritura se guardan en tus Archivos privados de Moodle (`hermes-datos.json`) y se ven en todos tus dispositivos. Sincroniza al abrir la app, al volver a ella y poco después de cada cambio; funciona sin conexión y los errores solo salen en Ajustes → Cuenta, donde hay un botón «Sincronizar datos». Las claves de API no se sincronizan.
- **Plantillas Word con tu formato.** Si subes una plantilla .docx hecha con estilos (Título 1, Título 2…), la app guarda el Word y, al pedir un trabajo, la IA solo escribe el contenido: la app lo vuelca en tu documento con su portada, índice, tipografías, pies de página y estilos. El documento sale como .docx (botón «Abrir»), que también se puede entregar en Moodle. Las capturas quedan como hueco con su «Figura n.». Los PDF y los textos siguen sirviendo como guía de apartados.

### Corregido
- Subir archivos desde el móvil (entregas con IA y sincronización) fallaba con «unsupported formdatapart implementation».

### Nota
- Las plantillas que ya tenías guardadas solo conservan el texto: vuelve a subir el Word para que se use con su formato.

## [2.3.0] - 2026-10-28

### Añadido
- **Calculadora de faltas** (diseño Obsidiana): una pantalla «Faltas» con una tarjeta por asignatura que dice cuántas horas has faltado, cuántas te quedan y el porcentaje sobre el total, con barra y color. Se calcula por trimestre o sobre el curso completo, y puedes elegir si el límite es el 10 % o el 20 %.
- Registro por días para marcar cada hora como «Asistí», «Falté» o «Sin clase» (o «Falté todo el día»). Las horas sin clase no cuentan y bajan el total y, con él, las faltas permitidas.
- El 12 de octubre y los días 13, 19 y 20 de octubre sin clase de Aprendizaje Automático, ya en el calendario y el horario.

### Cambiado
- El curso empieza el 28 de septiembre: antes de esa fecha ya no hay clases en el horario.
- Ajustes → Apariencia solo muestra Obsidiana, el diseño completo; «más diseños vendrán en el futuro».

## [2.2.0] - 2026-10-28

### Añadido
- **Plantillas de entrega con IA.** En Ajustes → Inteligencia artificial subes tu plantilla (Word, PDF, texto) o pegas el texto, y la IA hace el trabajo siguiendo ese formato. Puedes dejar una por defecto y, en el chat de cada tarea, elegir otra o ninguna.
- **Tu estilo de escritura.** Sube un texto tuyo y la IA imitará tu forma de escribir; se activa o desactiva en Ajustes y por tarea («Mi estilo»).
- **Buscador** de archivos y tareas por nombre, sin conexión, en la barra lateral de la versión de escritorio y la web (el campo lateral y el de la pantalla Buscar muestran siempre lo mismo).
- Notas: si el profesor no publica cuánto vale cada tarea, se muestra una **nota aproximada** (indicada como tal); el test de evaluación inicial no cuenta.

### Nota
- Para subir archivos desde el móvil hace falta esta versión de la app (usa un componente nuevo).

## [2.1.1] - 2026-10-28

### Añadido
- Tu foto de perfil de Moodle en la barra lateral y en Ajustes → Cuenta (si no tienes, tus iniciales).
- El logo de Hermes en la cabecera de la barra lateral y como icono de la pestaña del navegador en la versión web.

### Arreglado
- Calendario en móvil (iPhone y web móvil): ahora se puede deslizar la pantalla para ver lo que hay en el día seleccionado.
- Los índices de unidad («UD 1», «UD 2»…) de cada asignatura ya no se parten ni se montan sobre el nombre.
- Pendientes: los filtros por asignatura ya no salen cortados por arriba en la web.
- Un poco más de espacio entre las asignaturas de la barra lateral.

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
