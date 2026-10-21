# Cambios

Todos los cambios de Hermes, de lo más nuevo a lo más antiguo.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y versiones [SemVer](https://semver.org/lang/es/).
Las notas de cada release del APK salen de aquí.

## [Sin publicar]

### Añadido
- Widgets para la pantalla de inicio (Android): **Próximas entregas**, con cuánto falta para cada una, y **Clases de hoy**, con la clase que toca ahora. Si las clases ya han acabado, enseñan las del siguiente día lectivo. Se actualizan solos cada 30 minutos y al sincronizar.
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

[Sin publicar]: https://github.com/hehedaniel/hermes/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/hehedaniel/hermes/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/hehedaniel/hermes/releases/tag/v1.0.0
