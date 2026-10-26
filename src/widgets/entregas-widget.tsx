'use no memo'; // la librería de widgets necesita funciones normales, sin el React Compiler

import { FlexWidget, TextWidget } from 'react-native-android-widget';

import { type DatosEntregas, type FilaEntrega, haceTexto } from './datos';
import { FUENTE, type Hex, type Paleta, PALETAS } from './paleta';

type Props = { datos: DatosEntregas; alto: number; enlace: (key: string) => string };

/**
 * Por debajo de este alto (dp) las filas son de una línea, para que quepan varias
 * aunque el widget esté al tamaño mínimo.
 */
const ALTO_COMPACTO = 160;
const FILA_COMPACTA = 24;
const FILA_NORMAL = 40;
/** Cabecera + regla + relleno de la tarjeta (dp) */
const CABECERA = 46;

const colorDe = (f: FilaEntrega, p: Paleta) => (f.modulo ? p.modulo[f.modulo] : (f.color as Hex));

/** Devuelve una lista de elementos: la librería no admite fragmentos <></>. */
function contenido({ datos, alto, enlace, p }: Props & { p: Paleta }) {
  const cabecera = (
    <FlexWidget
      key="cabecera"
      clickAction="OPEN_APP"
      style={{
        width: 'match_parent',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 7,
      }}>
      <TextWidget
        text="PRÓXIMAS ENTREGAS"
        style={{
          fontSize: 10.5,
          fontFamily: FUENTE[700],
          letterSpacing: 1.1,
          color: p.secundario,
        }}
      />
      <TextWidget
        text={
          datos.tipo === 'ok'
            ? datos.total
              ? String(datos.total)
              : haceTexto(datos.actualizado)
            : ''
        }
        style={{ fontSize: 11, fontFamily: FUENTE[500], color: p.terciario }}
      />
    </FlexWidget>
  );
  const regla = (
    <FlexWidget
      key="regla"
      style={{ width: 'match_parent', height: 1, backgroundColor: p.linea, marginBottom: 4 }}
    />
  );

  if (datos.tipo === 'sin-datos' || !datos.filas.length) {
    return [
      cabecera,
      regla,
      <FlexWidget
        key="vacio"
        clickAction="OPEN_APP"
        style={{ flex: 1, width: 'match_parent', justifyContent: 'center', alignItems: 'center' }}>
        <TextWidget
          text={
            datos.tipo === 'sin-datos' ? 'Abre Hermes para cargar tus entregas' : 'Nada pendiente'
          }
          style={{ fontSize: 13, fontFamily: FUENTE[500], color: p.secundario, textAlign: 'center' }}
        />
      </FlexWidget>,
    ];
  }

  const compacto = alto < ALTO_COMPACTO;
  const fila = compacto ? FILA_COMPACTA : FILA_NORMAL;
  // Las que quepan; cuántas hay en total ya lo dice la cabecera
  const n = Math.max(1, Math.floor((alto - CABECERA) / fila));
  return [
    cabecera,
    regla,
    ...datos.filas
      .slice(0, n)
      .map((f) => (compacto ? filaCompacta(f, enlace, p) : filaNormal(f, enlace, p))),
  ];
}

const textoFalta = (f: FilaEntrega, p: Paleta) => (
  <TextWidget
    text={f.falta}
    style={{
      fontSize: 11.5,
      fontFamily: FUENTE[f.urgente ? 700 : 500],
      color: f.urgente ? p.urgente : p.secundario,
      marginLeft: 8,
    }}
  />
);

const rail = (f: FilaEntrega, alto: number, p: Paleta) => (
  <FlexWidget
    style={{
      width: 3,
      height: alto,
      borderRadius: 2,
      backgroundColor: colorDe(f, p),
      marginRight: 10,
    }}
  />
);

/** Una línea: nombre y cuánto falta. */
function filaCompacta(f: FilaEntrega, enlace: Props['enlace'], p: Paleta) {
  return (
    <FlexWidget
      key={f.key}
      clickAction="OPEN_URI"
      clickActionData={{ uri: enlace(f.key) }}
      style={{
        width: 'match_parent',
        height: FILA_COMPACTA,
        flexDirection: 'row',
        alignItems: 'center',
      }}>
      {rail(f, 16, p)}
      <FlexWidget style={{ flex: 1 }}>
        <TextWidget
          text={f.nombre}
          maxLines={1}
          truncate="END"
          style={{ fontSize: 13, fontFamily: FUENTE[500], color: p.texto }}
        />
      </FlexWidget>
      {textoFalta(f, p)}
    </FlexWidget>
  );
}

/** Dos líneas: nombre, y debajo asignatura, día y hora. */
function filaNormal(f: FilaEntrega, enlace: Props['enlace'], p: Paleta) {
  return (
    <FlexWidget
      key={f.key}
      clickAction="OPEN_URI"
      clickActionData={{ uri: enlace(f.key) }}
      style={{
        width: 'match_parent',
        height: FILA_NORMAL,
        flexDirection: 'row',
        alignItems: 'center',
      }}>
      {rail(f, 28, p)}
      <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
        <TextWidget
          text={f.nombre}
          maxLines={1}
          truncate="END"
          style={{ fontSize: 13, fontFamily: FUENTE[500], color: p.texto }}
        />
        <TextWidget
          text={`${f.siglas} · ${f.cuando}`}
          maxLines={1}
          style={{ fontSize: 11, fontFamily: FUENTE[400], color: p.terciario }}
        />
      </FlexWidget>
      {textoFalta(f, p)}
    </FlexWidget>
  );
}

function Tarjeta(props: Props & { p: Paleta }) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        width: 'match_parent',
        height: 'match_parent',
        flexDirection: 'column',
        backgroundColor: props.p.fondo,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 10,
      }}>
      {contenido(props)}
    </FlexWidget>
  );
}

/** Widget "Próximas entregas", en claro y oscuro (Android elige según el tema del móvil). */
export function EntregasWidget(props: Props) {
  return {
    light: <Tarjeta {...props} p={PALETAS.claro} />,
    dark: <Tarjeta {...props} p={PALETAS.oscuro} />,
  };
}
