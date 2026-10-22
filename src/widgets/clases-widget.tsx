'use no memo'; // la librería de widgets necesita funciones normales, sin el React Compiler

import { FlexWidget, TextWidget } from 'react-native-android-widget';

import type { DatosClases } from './datos';
import { type Hex, type Paleta, PALETAS } from './paleta';

type Props = { datos: DatosClases; enlace: string; alto: number };

/**
 * Las clases que caben según el alto del widget (en dp). Si no caben todas, se quitan
 * primero las que ya han acabado.
 */
function queCaben(datos: DatosClases, alto: number) {
  const caben = Math.max(1, Math.floor((alto - 44 - (datos.aviso ? 16 : 0)) / 41));
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
      }}>
      <TextWidget
        text={datos.titulo === 'Hoy' ? 'Clases de hoy' : `Clases · ${datos.titulo}`}
        style={{ fontSize: 15, fontWeight: '700', color: p.texto }}
      />
      <TextWidget text={`Aula ${datos.aula}`} style={{ fontSize: 11, color: p.secundario }} />
    </FlexWidget>
  );

  const aviso = datos.aviso ? (
    <TextWidget
      key="aviso"
      text={datos.aviso}
      maxLines={1}
      truncate="END"
      style={{ fontSize: 11, color: p.secundario, marginTop: 2 }}
    />
  ) : null;

  if (!datos.clases.length) {
    return [
      cabecera,
      aviso,
      <FlexWidget
        key="vacio"
        style={{ flex: 1, width: 'match_parent', justifyContent: 'center', alignItems: 'center' }}>
        <TextWidget
          text={datos.vacio ?? 'No hay clase'}
          style={{ fontSize: 14, color: p.secundario, textAlign: 'center' }}
        />
      </FlexWidget>,
    ];
  }

  return [
    cabecera,
    aviso,
    ...queCaben(datos, alto).map((c) => (
      <FlexWidget
        key={`${c.modulo}-${c.inicio}`}
        style={{
          width: 'match_parent',
          height: 36,
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: 5,
        }}>
        <FlexWidget style={{ width: 46, flexDirection: 'column' }}>
          <TextWidget
            text={c.inicio}
            style={{ fontSize: 12, fontWeight: '700', color: c.acabada ? p.secundario : p.texto }}
          />
          <TextWidget text={c.fin} style={{ fontSize: 11, color: p.secundario }} />
        </FlexWidget>
        <FlexWidget
          style={{
            width: 4,
            height: 30,
            borderRadius: 2,
            backgroundColor: c.color as Hex,
            marginRight: 10,
          }}
        />
        <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
          <TextWidget
            text={c.nombre}
            maxLines={1}
            truncate="END"
            style={{ fontSize: 13, fontWeight: '600', color: c.acabada ? p.secundario : p.texto }}
          />
          <TextWidget
            text={c.profesor}
            maxLines={1}
            truncate="END"
            style={{ fontSize: 11, color: p.secundario }}
          />
        </FlexWidget>
        {/* A la derecha: AHORA en la que está en curso, ✓ en las acabadas y si no, cuánto dura */}
        {c.ahora ? (
          <FlexWidget
            style={{
              backgroundColor: p.acento,
              borderRadius: 10,
              paddingHorizontal: 8,
              paddingVertical: 3,
              marginLeft: 8,
            }}>
            <TextWidget
              text="AHORA"
              style={{ fontSize: 10, fontWeight: '800', color: p.sobreAcento }}
            />
          </FlexWidget>
        ) : (
          <FlexWidget
            style={{
              backgroundColor: p.chip,
              borderRadius: 10,
              paddingHorizontal: 8,
              paddingVertical: 3,
              marginLeft: 8,
            }}>
            <TextWidget
              text={c.acabada ? '✓ hecha' : c.duracion}
              style={{ fontSize: 11, fontWeight: '600', color: p.secundario }}
            />
          </FlexWidget>
        )}
      </FlexWidget>
    )),
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
        borderRadius: 22,
        paddingHorizontal: 16,
        paddingVertical: 12,
      }}>
      {contenido(props)}
    </FlexWidget>
  );
}

/** Widget "Clases de hoy", en claro y oscuro. Al tocarlo abre el calendario. */
export function ClasesWidget(props: Props) {
  return {
    light: <Tarjeta {...props} p={PALETAS.claro} />,
    dark: <Tarjeta {...props} p={PALETAS.oscuro} />,
  };
}
