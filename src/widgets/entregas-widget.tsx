'use no memo'; // la librería de widgets necesita funciones normales, sin el React Compiler

import { FlexWidget, ListWidget, TextWidget } from 'react-native-android-widget';

import { type DatosEntregas, haceTexto } from './datos';
import { type Paleta, PALETAS, type Hex } from './paleta';

type Props = { datos: DatosEntregas; ancho: number; enlace: (key: string) => string };

/** Relleno lateral de la tarjeta (dp). */
const RELLENO = 16;

/** Como mucho, las 20 más cercanas: la lista se desliza dentro del widget. */
const MAX_FILAS = 20;

/** Devuelve una lista de elementos: la librería no admite fragmentos <></>. */
function contenido({ datos, ancho, enlace, p }: Props & { p: Paleta }) {
  // En una lista, Android no estira las filas: se les da el ancho exacto de la tarjeta
  const anchoFila = Math.max(160, Math.floor(ancho - RELLENO * 2));
  const cabecera = (
    <FlexWidget
      key="cabecera"
      clickAction="OPEN_APP"
      style={{
        width: 'match_parent',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
      }}>
      <TextWidget
        text={
          datos.tipo === 'ok' && datos.total
            ? `Próximas entregas · ${datos.total}`
            : 'Próximas entregas'
        }
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

  // Lista con scroll: aunque el widget sea pequeño se ven todas deslizando
  return [
    cabecera,
    // El contenedor flexible hace que la lista ocupe solo el hueco bajo el título
    <FlexWidget key="lista" style={{ flex: 1, width: 'match_parent' }}>
      <ListWidget style={{ width: 'match_parent', height: 'match_parent' }}>
        {datos.filas.slice(0, MAX_FILAS).map((f) => (
          <FlexWidget
            key={f.key}
            clickAction="OPEN_URI"
            clickActionData={{ uri: enlace(f.key) }}
            style={{
              width: anchoFila,
              height: 44,
              flexDirection: 'row',
              alignItems: 'center',
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
        ))}
      </ListWidget>
    </FlexWidget>,
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
        paddingHorizontal: RELLENO,
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
