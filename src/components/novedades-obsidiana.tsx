/** Novedades en el diseño Obsidiana: tarjetas cronológicas por día. Reproducido del HTML de Stitch. */
import Feather from '@expo/vector-icons/Feather';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { O, Punto, T, useArriba, useMovil, usePadX } from '@/components/obs';
import { useNow } from '@/hooks/use-now';
import { avisar } from '@/lib/dialogo';
import { useDownloads } from '@/lib/downloads';
import { dayKey, hora, MESES } from '@/lib/format';
import type { Novedad, TipoNovedad } from '@/lib/novedades';
import { useAsignaturas, useMoodle } from '@/lib/store';

const ETIQUETA: Record<TipoNovedad, string> = {
  archivo: 'Material',
  'archivo-actualizado': 'Material actualizado',
  actividad: 'Actividad',
  tarea: 'Tarea',
  nota: 'Corrección',
  fecha: 'Fecha',
};

const ESTILO: Record<
  TipoNovedad,
  { icono: React.ComponentProps<typeof Feather>['name']; c: string; bg: string; b: string }
> = {
  fecha: { icono: 'calendar', c: '#E58A2D', bg: '#1C1816', b: '#2A201B' },
  nota: { icono: 'award', c: '#B567D8', bg: '#1B151F', b: '#2B1F33' },
  archivo: { icono: 'file-text', c: '#9AC84B', bg: '#171D18', b: '#212F22' },
  'archivo-actualizado': { icono: 'file-text', c: '#9AC84B', bg: '#171D18', b: '#212F22' },
  tarea: { icono: 'plus', c: '#D08832', bg: '#1B1915', b: '#2B2519' },
  actividad: { icono: 'plus', c: '#D08832', bg: '#1B1915', b: '#2B2519' },
};

export function NovedadesObsidiana() {
  const { novedades, snapshot, marcarLeidas, recargarNovedades } = useMoodle();
  const ahora = useNow();
  const movil = useMovil();
  const arriba = useArriba();

  // Al entrar se recoge lo que haya encontrado el segundo plano; al salir, queda como leído
  useFocusEffect(
    useCallback(() => {
      recargarNovedades();
      return () => {
        marcarLeidas();
      };
    }, [marcarLeidas, recargarNovedades]),
  );

  const grupos = useMemo(() => {
    const hoy = dayKey(new Date(ahora));
    const ayer = dayKey(new Date(ahora - 86400000));
    const map = new Map<string, Novedad[]>();
    for (const n of novedades) {
      const k = dayKey(new Date(n.fecha));
      map.set(k, [...(map.get(k) ?? []), n]);
    }
    return [...map.entries()].map(([k, items]) => {
      const [y, m, d] = k.split('-').map(Number);
      const titulo =
        k === hoy
          ? 'Hoy'
          : k === ayer
            ? 'Ayer'
            : `${d} ${MESES[m - 1].slice(0, 3)}${y !== new Date(ahora).getFullYear() ? ` ${y}` : ''}`;
      return { titulo, items };
    });
  }, [novedades, ahora]);

  const sinLeer = novedades.filter((n) => !n.leida).length;
  const padX = usePadX(48);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#09090B' }}
      contentContainerStyle={{
        paddingHorizontal: padX,
        paddingTop: (movil ? 28 : 40) + arriba,
        paddingBottom: 40,
      }}>
      <View style={{ width: '100%', maxWidth: 890, alignSelf: 'center' }}>
        <View
          style={{
            paddingBottom: movil ? 28 : 40,
            flexDirection: movil ? 'column' : 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: movil ? 16 : 24,
          }}>
          <View style={{ flex: movil ? undefined : 1 }}>
            <T w={600} up s={10.5} ls={0.24} c="#696975" style={{ marginBottom: 6 }}>
              Actividad del campus
            </T>
            <T k="serif" s={movil ? 40 : 52} lh={movil ? 48 : 65} c="#F4EFE8" ls={-0.025}>
              Novedades
            </T>
            <T s={13.5} lh={22} c="#868694" style={{ marginTop: 8, maxWidth: 672 }}>
              Anuncios, materiales nuevos, cambios de fecha y correcciones publicadas, por orden
              cronológico.
            </T>
          </View>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 12,
              paddingTop: movil ? 0 : 16,
            }}>
            <View
              style={{
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 99,
                borderWidth: 1,
                borderColor: sinLeer ? '#2B3518' : '#22222A',
                backgroundColor: sinLeer ? '#14180F' : '#111115',
              }}>
              <T k="mono" up s={10.5} w={600} ls={0.05} c={sinLeer ? '#BBF451' : '#9B9BA8'}>
                {sinLeer ? `${sinLeer} sin leer` : 'Al día'}
              </T>
            </View>
            <Pressable
              onPress={marcarLeidas}
              disabled={!sinLeer}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 99,
                borderWidth: 1,
                borderColor: '#22222A',
                backgroundColor: '#111115',
                opacity: sinLeer ? 1 : 0.5,
              }}>
              <Feather name="check" size={12} color="#9B9BA8" />
              <T k="mono" up s={10.5} ls={0.05} c="#9B9BA8">
                Marcar todo leído
              </T>
            </Pressable>
          </View>
        </View>

        {grupos.length === 0 ? (
          <T s={13} c="#868694">
            {snapshot
              ? 'Aquí aparecerá lo que cambie en tus asignaturas: apuntes nuevos, entregas, notas y cambios de fecha.'
              : 'Sincronizando por primera vez…'}
          </T>
        ) : null}

        {grupos.map((g) => (
          <View key={g.titulo} style={{ marginBottom: 40 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <T k="mono" up s={10.5} ls={0.1} c="#585864">
                {g.titulo}
              </T>
              <View
                style={{
                  flex: 1,
                  borderTopWidth: 1,
                  borderTopColor: '#16161B',
                  marginHorizontal: 16,
                }}
              />
              <T k="mono" s={11} c="#585864">
                {g.items.length}
              </T>
            </View>
            <View style={{ gap: 10 }}>
              {g.items.map((n) => (
                <Tarjeta key={n.id} n={n} />
              ))}
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function Tarjeta({ n }: { n: Novedad }) {
  const movil = useMovil();
  const a = useAsignaturas()(n.cursoId, n.curso);
  const { abrir: abrirArchivo } = useDownloads();
  const e = ESTILO[n.tipo];

  async function abrir() {
    try {
      if (n.archivo) await abrirArchivo(n.archivo);
      else if (n.entregaKey)
        router.push({ pathname: '/tarea/[key]', params: { key: n.entregaKey } });
      else
        router.push({
          pathname: '/curso/[id]',
          params: { id: String(n.cursoId), nombre: n.curso },
        });
    } catch (err) {
      avisar('No se pudo abrir', (err as Error).message);
    }
  }

  return (
    <Pressable
      onPress={abrir}
      accessibilityRole="button"
      accessibilityLabel={`${ETIQUETA[n.tipo]}: ${n.titulo}`}
      style={{
        padding: movil ? 16 : 20,
        borderRadius: 16,
        backgroundColor: O.card,
        borderWidth: 1,
        borderColor: '#1B1B22',
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: movil ? 12 : 16,
        opacity: n.leida ? 0.75 : 1,
      }}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: e.bg,
          borderWidth: 1,
          borderColor: e.b,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 2,
        }}>
        <Feather name={e.icono} size={16} color={e.c} />
      </View>
      <View style={{ flex: 1, minWidth: 0, paddingRight: movil ? 40 : 48 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Punto color={a.color} />
          <T w={500} s={14} c="#EAEAF0" style={{ flexShrink: 1 }}>
            {n.titulo}
          </T>
        </View>
        {n.detalle ? (
          <T s={13} lh={21} c="#9393A2" style={{ marginBottom: 12 }}>
            {n.detalle}
          </T>
        ) : (
          <View style={{ height: 6 }} />
        )}
        <T k="mono" up s={10} ls={0.1} c="#5F5F6E" w={400}>
          {ETIQUETA[n.tipo]}{' '}
          <T k="mono" s={10} c="#43434E">
            ·
          </T>{' '}
          {a.nombre}
          {a.profesor ? (
            <>
              {' '}
              <T k="mono" s={10} c="#43434E">
                ·
              </T>{' '}
              {a.profesor}
            </>
          ) : null}
        </T>
      </View>
      <View
        style={{
          position: 'absolute',
          right: movil ? 16 : 20,
          top: movil ? 16 : 20,
          alignItems: 'flex-end',
          gap: 8,
        }}>
        <T k="mono" s={11} c={n.leida ? '#575764' : '#6C6C7B'}>
          {hora(new Date(n.fecha))}
        </T>
        <Punto color={n.leida ? '#3D3D46' : '#BBF451'} />
      </View>
    </Pressable>
  );
}
