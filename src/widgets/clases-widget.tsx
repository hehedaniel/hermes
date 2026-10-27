'use no memo'; // la librería de widgets necesita funciones normales, sin el React Compiler

import { FlexWidget, TextWidget } from 'react-native-android-widget';

import type { DatosClases } from './datos';
import { FUENTE, type Hex, type Paleta, PALETAS, type PaletasWidget } from './paleta';

type Props = { datos: DatosClases; enlace: string; alto: number; paletas?: PaletasWidget };

/**
 * Las clases que caben según el alto del widget (en dp). Si no caben todas, se quitan
 * primero las que ya han acabado.
 */
function queCaben(datos: DatosClases, alto: number) {
  const caben = Math.max(1, Math.floor((alto - 48 - (datos.aviso ? 18 : 0)) / 41));
  let clases = datos.clases;
  if (clases.length > caben) clases = clases.filter((c) => !c.acabada);
  return clases.slice(0, caben);
}

/** Devuelve una lista de elementos: la librería no admite fragmentos <></>. */
function contenido({ datos, alto, p }: Props & { p: Paleta }) {
  const cabecera = (
    <FlexWidget
      key="cabecera"
      style={{
        width: 'match_parent',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 7,
      }}>
      <TextWidget
        text={datos.titulo === 'Hoy' ? 'CLASES DE HOY' : `CLASES · ${datos.titulo.toUpperCase()}`}
        style={{ fontSize: 10.5, fontFamily: FUENTE[700], letterSpacing: 1.1, color: p.secundario }}
      />
      <TextWidget
        text={`Aula ${datos.aula}`}
        style={{ fontSize: 11, fontFamily: FUENTE[500], color: p.terciario }}
      />
    </FlexWidget>
  );
  const regla = (
    <FlexWidget
      key="regla"
      style={{ width: 'match_parent', height: 1, backgroundColor: p.linea, marginBottom: 2 }}
    />
  );

  const aviso = datos.aviso ? (
    <TextWidget
      key="aviso"
      text={datos.aviso}
      maxLines={1}
      truncate="END"
      style={{ fontSize: 11, fontFamily: FUENTE[400], color: p.terciario, marginTop: 4 }}
    />
  ) : null;

  if (!datos.clases.length) {
    return [
      cabecera,
      regla,
      aviso,
      <FlexWidget
        key="vacio"
        style={{ flex: 1, width: 'match_parent', justifyContent: 'center', alignItems: 'center' }}>
        <TextWidget
          text={datos.vacio ?? 'No hay clase'}
          style={{ fontSize: 13, fontFamily: FUENTE[500], color: p.secundario, textAlign: 'center' }}
        />
      </FlexWidget>,
    ];
  }

  return [
    cabecera,
    regla,
    aviso,
    ...queCaben(datos, alto).map((c) => {
      const tinta = c.acabada ? p.terciario : p.texto;
      return (
        <FlexWidget
          key={`${c.modulo}-${c.inicio}`}
          style={{
            width: 'match_parent',
            height: 36,
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 5,
          }}>
          <TextWidget
            text={c.inicio}
            style={{ fontSize: 12, fontFamily: FUENTE[500], color: p.terciario, width: 42 }}
          />
          <FlexWidget
            style={{
              width: 3,
              height: 28,
              borderRadius: 2,
              backgroundColor: p.modulo[c.modulo] ?? (c.color as Hex),
              marginRight: 10,
            }}
          />
          <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
            <TextWidget
              text={`${c.modulo} · ${c.nombre}`}
              maxLines={1}
              truncate="END"
              style={{ fontSize: 13, fontFamily: FUENTE[700], color: tinta }}
            />
            <TextWidget
              text={`${c.profesor.split(' ')[0]} · hasta ${c.fin}`}
              maxLines={1}
              truncate="END"
              style={{ fontSize: 11, fontFamily: FUENTE[400], color: p.terciario }}
            />
          </FlexWidget>
          {/* A la derecha: AHORA en la que está en curso, ✓ en las acabadas y si no, cuánto dura */}
          {c.ahora ? (
            <FlexWidget
              style={{
                backgroundColor: p.acento,
                borderRadius: 4,
                paddingHorizontal: 6,
                paddingVertical: 2,
                marginLeft: 8,
              }}>
              <TextWidget
                text="AHORA"
                style={{ fontSize: 9.5, fontFamily: FUENTE[700], letterSpacing: 0.8, color: p.sobreAcento }}
              />
            </FlexWidget>
          ) : (
            <TextWidget
              text={c.acabada ? '✓' : c.duracion}
              style={{ fontSize: 11, fontFamily: FUENTE[500], color: p.terciario, marginLeft: 8 }}
            />
          )}
        </FlexWidget>
      );
    }),
  ];
}

function Tarjeta(props: Props & { p: Paleta }) {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: props.enlace }}
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

/** Widget "Clases de hoy", en claro y oscuro. Al tocarlo abre el calendario. */
export function ClasesWidget({ paletas = PALETAS, ...props }: Props) {
  return {
    light: <Tarjeta {...props} p={paletas.claro} />,
    dark: <Tarjeta {...props} p={paletas.oscuro} />,
  };
}
