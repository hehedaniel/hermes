'use no memo'; // la librería de widgets necesita funciones normales, sin el React Compiler

import { FlexWidget, TextWidget } from 'react-native-android-widget';

import { type DatosEntregas, haceTexto } from './datos';
import { type Paleta, PALETAS, type Hex } from './paleta';

type Props = { datos: DatosEntregas; alto: number; enlace: (key: string) => string };

/** Cuántas filas caben según el alto del widget (en dp). */
const filasQueCaben = (alto: number) => Math.max(1, Math.floor((alto - 52) / 42));

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
        marginBottom: 6,
      }}>
      <TextWidget
        text="Próximas entregas"
        style={{ fontSize: 15, fontWeight: '700', color: p.texto }}
      />
      <TextWidget
        text={datos.tipo === 'ok' ? haceTexto(datos.actualizado) : ''}
        style={{ fontSize: 11, color: p.secundario }}
      />
    </FlexWidget>
  );

  if (datos.tipo === 'sin-datos' || !datos.filas.length) {
    return [
      cabecera,
      <FlexWidget
        key="vacio"
        clickAction="OPEN_APP"
        style={{ flex: 1, width: 'match_parent', justifyContent: 'center', alignItems: 'center' }}>
        <TextWidget
          text={
            datos.tipo === 'sin-datos'
              ? 'Abre Hermes para cargar tus entregas'
              : 'Nada pendiente 🎉'
          }
          style={{ fontSize: 14, color: p.secundario, textAlign: 'center' }}
        />
      </FlexWidget>,
    ];
  }

  const filas = datos.filas.slice(0, filasQueCaben(alto));
  const resto = datos.total - filas.length;
  return [
    cabecera,
    ...filas.map((f) => (
      <FlexWidget
        key={f.key}
        clickAction="OPEN_URI"
        clickActionData={{ uri: enlace(f.key) }}
        style={{
          width: 'match_parent',
          height: 38,
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: 4,
        }}>
        <FlexWidget
          style={{
            width: 4,
            height: 30,
            borderRadius: 2,
            backgroundColor: f.color as Hex,
            marginRight: 10,
          }}
        />
        <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
          <TextWidget
            text={f.nombre}
            maxLines={1}
            truncate="END"
            style={{ fontSize: 13, fontWeight: '600', color: p.texto }}
          />
          <TextWidget
            text={`${f.siglas} · ${f.cuando}`}
            maxLines={1}
            style={{ fontSize: 11, color: p.secundario }}
          />
        </FlexWidget>
        <TextWidget
          text={f.falta}
          style={{
            fontSize: 12,
            fontWeight: f.urgente ? '700' : '500',
            color: f.urgente ? p.urgente : p.secundario,
            marginLeft: 8,
          }}
        />
      </FlexWidget>
    )),
    resto > 0 ? (
      <TextWidget
        key="resto"
        clickAction="OPEN_APP"
        text={`y ${resto} más`}
        style={{ fontSize: 11, color: p.secundario, marginTop: 4 }}
      />
    ) : null,
  ];
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
        borderRadius: 22,
        paddingHorizontal: 16,
        paddingVertical: 12,
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
