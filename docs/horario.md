# Horario compartido

El horario, los días sin clase y los cambios no están fijos en la app: viven en
[`public/horario.json`](../public/horario.json). Al hacer `git push origin main`, GitHub Pages lo publica en
`https://hehedaniel.github.io/hermes/horario.json` y la app (móvil y web) lo descarga al abrirse y cada
10 minutos que esté abierta. Así, un cambio le llega a todos **sin sacar una versión nueva**.

- Se guarda la última copia buena, así que funciona sin conexión.
- Si el archivo está mal escrito, la app ignora esa versión y sigue con la anterior (y `npm test` falla,
  con lo que la web ni siquiera se publica).
- Lo que ven los compañeros es solo el horario; las faltas de cada uno siguen siendo personales.
- Hace falta una versión de la app con esta función (2.5.0 o posterior). Las anteriores usan el horario que
  llevaban incluido.

## Cómo editarlo

Edita `public/horario.json`, ejecuta `npm test` (comprueba que es válido) y haz `git push origin main`. En un par
de minutos está publicado.

Módulos: `MIA`, `SAA`, `BDA`, `PIA`, `SBD`. Fechas siempre `AAAA-MM-DD`, horas `HH:MM`.

### Un día sin clase para todos (festivo, formación, excursión…)

En `sinClase` (con `hasta` para varios días seguidos). `tipo` es opcional y decide cómo se ve en el calendario:
`festivo`, `vacaciones`, `formacion`, `excursion` u `otro` («Sin clase»). Si no lo pones, es «Vacaciones» cuando el
motivo lo dice y «Festivo» en el resto.
Si ese día hay un evento, añade `inicio`, `fin`, `descripcion` y `enlace` (todos opcionales): salen en una tarjeta al abrir el día.

```json
{ "desde": "2026-10-29", "tipo": "formacion", "motivo": "Jornada de formación FIWARE",
  "inicio": "17:00", "fin": "18:00", "descripcion": "Formación FIWARE básico", "enlace": "https://maps.app.goo.gl/..." },
{ "desde": "2026-12-23", "hasta": "2027-01-05", "motivo": "Vacaciones de Navidad" }
```

### Un examen (o fecha señalada) de un módulo

En `examenes`. Sale en el calendario (marca violeta y una tarjeta «Examen» en el día) y **no quita clases**:
si ese día no hay clase, ponlo también en `sinClase`. `hora` es opcional.

```json
{ "fecha": "2026-11-12", "modulo": "PIA", "titulo": "Examen de Programación", "hora": "16:45" }
```

### Un módulo concreto sin clase un día (falta el profesor)

En `sinClaseModulo`:

```json
{ "fecha": "2026-11-12", "modulo": "BDA", "motivo": "Sin clase de Big Data Aplicado" }
```

Esas horas no cuentan para el total de faltas.

### Cambio de horario un día concreto

En `cambios`. `horario` tiene un valor por franja (`null` = esa franja no hay clase) y `franjas` (opcional)
cambia las horas de ese día. Las dos listas tienen que tener tantos elementos como franjas (4):

```json
{
  "fecha": "2026-11-11",
  "motivo": "Charla de empresa",
  "horario": ["PIA", null, "BDA", "BDA"],
  "franjas": [
    { "inicio": "15:45", "fin": "16:45" },
    { "inicio": "16:45", "fin": "17:45" },
    { "inicio": "18:30", "fin": "19:30" },
    { "inicio": "19:30", "fin": "20:30" }
  ]
}
```

Puedes poner solo `horario` o solo `franjas`.

### Cambios para todo el curso

- `horario`: los módulos de cada franja por día de la semana (`"1"` lunes … `"5"` viernes).
- `franjas`: las horas de cada franja.
- `inicio` y `fin`: primer y último día del curso.
- `trimestres`: dónde empieza y acaba cada uno (el primero empieza en `inicio` y el tercero acaba en `fin`).

## Comprobar antes de publicar

`npm test` valida el archivo (`tests/horario-publicado.test.ts`). Si falla, el mensaje dice qué parte está mal.
