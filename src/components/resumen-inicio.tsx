/** Franja de resumen del inicio: lo más importante de un vistazo (clase, entrega, examen, faltas). */
import { type Href, router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Etiqueta, O, Punto, T, Tarjeta, useMovil } from '@/components/obs';
import type { Entrega } from '@/lib/data';
import { diaMesHora, quedan } from '@/lib/format';
import { AULA, MODULOS } from '@/lib/horario';
import { proximaClase, proximoExamen, resumenFaltas } from '@/lib/resumen-inicio';
import { useAsignaturas } from '@/lib/store';
import { useFaltas } from '@/lib/use-faltas';

const ROJO = '#FF1744';
const AMBAR = '#F59E0B';
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function Cuadro({
  etiqueta,
  onPress,
  borde,
  fondo,
  children,
}: {
  etiqueta: string;
  onPress?: () => void;
  borde?: string;
  fondo?: string;
  children: ReactNode;
}) {
  const movil = useMovil();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={movil ? { flexBasis: '47%', flexGrow: 1 } : { flex: 1, minWidth: 0 }}>
      <Tarjeta
        radius={12}
        borde={borde ?? O.line}
        bg={fondo}
        style={{ padding: movil ? 14 : 16, gap: 6, minHeight: movil ? 128 : 112, flex: 1 }}>
        <Etiqueta s={9.5} ls={0.2} c={borde ?? '#6B6B77'}>
          {etiqueta}
        </Etiqueta>
        {children}
      </Tarjeta>
    </Pressable>
  );
}

export function ResumenInicio({
  ahora,
  abiertas,
  urgentes,
}: {
  ahora: Date;
  abiertas: Entrega[];
  urgentes: number;
}) {
  const movil = useMovil();
  const info = useAsignaturas();
  const { marcas, limite } = useFaltas();
  const ms = ahora.getTime();

  const clase = proximaClase(ahora);
  const proxima = abiertas.find((e) => e.fecha && e.fecha * 1000 > ms) ?? abiertas[0];
  const examen = proximoExamen(ahora);
  const faltas = resumenFaltas(marcas, ahora, limite);

  const cuando = clase
    ? clase.enCurso
      ? `Hasta las ${clase.fin}`
      : `${clase.dias === 0 ? 'Hoy' : clase.dias === 1 ? 'Mañana' : DIAS[clase.fecha.getDay()]} · ${clase.inicio} - ${clase.fin}`
    : '';

  const colorFaltas = faltas.nivel === 'pasado' ? ROJO : faltas.nivel === 'aviso' ? AMBAR : O.white;

  return (
    <View
      style={{ flexDirection: 'row', flexWrap: movil ? 'wrap' : 'nowrap', gap: movil ? 10 : 14 }}>
      <Cuadro etiqueta={clase?.enCurso ? 'Ahora en clase' : 'Próxima clase'}>
        {clase ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Punto color={info(0, MODULOS[clase.modulo].nombre).color} />
              <T s={14} w={600} c={O.white} numberOfLines={2} style={{ flex: 1 }}>
                {movil ? MODULOS[clase.modulo].corto : MODULOS[clase.modulo].nombre}
              </T>
            </View>
            <T s={12.5} c="#8E8E9C">
              {cuando}
            </T>
            <T k="mono" up s={9.5} ls={0.05} c="#6B6B77">
              Aula {AULA}
            </T>
          </>
        ) : (
          <T s={13} c="#7E7E8D">
            No hay clases en los próximos días.
          </T>
        )}
      </Cuadro>

      <Cuadro
        etiqueta="Próxima entrega"
        onPress={
          proxima
            ? () => router.push({ pathname: '/tarea/[key]', params: { key: proxima.key } })
            : undefined
        }>
        {proxima ? (
          <>
            <T s={14} w={600} c={O.white} numberOfLines={2}>
              {proxima.nombre}
            </T>
            <T s={12.5} c={urgentes ? O.lime : '#8E8E9C'}>
              {proxima.fecha
                ? `${diaMesHora(proxima.fecha)} · ${quedan(proxima.fecha, ms).replace('Quedan ', 'en ')}`
                : 'Sin fecha'}
            </T>
          </>
        ) : (
          <T s={13} c="#7E7E8D">
            Nada pendiente de entregar.
          </T>
        )}
      </Cuadro>

      <Cuadro
        etiqueta={examen && examen.dias <= 7 ? '¡Examen!' : 'Próximo examen'}
        borde={examen && examen.dias <= 14 ? ROJO : undefined}
        fondo={examen && examen.dias <= 14 ? 'rgba(255,23,68,0.10)' : undefined}
        onPress={() => router.push('/calendario')}>
        {examen ? (
          <>
            <T s={14} w={700} c={O.white} numberOfLines={2}>
              {examen.titulo}
            </T>
            <T s={12.5} w={600} c={examen.dias <= 14 ? ROJO : '#8E8E9C'}>
              {examen.dias === 0
                ? 'Es hoy'
                : examen.dias === 1
                  ? 'Mañana'
                  : `Faltan ${examen.dias} días`}
            </T>
            <T k="mono" up s={9.5} ls={0.05} c="#6B6B77">
              {MODULOS[examen.modulo].corto} ·{' '}
              {examen.fecha.split('-').reverse().slice(0, 2).join('/')}
            </T>
          </>
        ) : (
          <T s={13} c="#7E7E8D">
            No hay exámenes a la vista.
          </T>
        )}
      </Cuadro>

      <Cuadro
        etiqueta={movil ? 'Faltas' : 'Faltas del trimestre'}
        borde={faltas.nivel === 'ok' ? undefined : colorFaltas}
        onPress={() => router.push('/faltas' as Href)}>
        {faltas.faltadas && faltas.peor ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
              <T w={300} s={24} lh={30} c={colorFaltas} ls={-0.025}>
                {faltas.faltadas}
              </T>
              <T s={12} c="#71717E">
                {faltas.faltadas === 1 ? 'hora faltada' : 'horas faltadas'}
              </T>
            </View>
            <T s={12.5} c={faltas.peor.exceso ? ROJO : '#8E8E9C'}>
              {faltas.peor.exceso
                ? `Te has pasado en ${MODULOS[faltas.peor.modulo].corto}`
                : `Margen más justo: ${MODULOS[faltas.peor.modulo].corto}, ${faltas.peor.restantes} h`}
            </T>
          </>
        ) : (
          <>
            <T s={14} w={600} c={O.white}>
              Sin faltas
            </T>
            <T s={12.5} c="#8E8E9C">
              Vas bien de asistencia.
            </T>
          </>
        )}
      </Cuadro>
    </View>
  );
}
