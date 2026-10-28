/**
 * Lista de asignaturas en Obsidiana (solo se llega a ella desde la barra inferior del móvil;
 * en escritorio las asignaturas viven en la barra lateral). Composición propia con las piezas
 * del diseño: título serif y una tarjeta por asignatura.
 */
import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';

import { Etiqueta, O, T, useArriba, useMovil, usePadX } from '@/components/obs';
import { useMoodle, useAsignaturas } from '@/lib/store';

export function CursosObsidiana() {
  const { snapshot } = useMoodle();
  const info = useAsignaturas();
  const movil = useMovil();
  const padX = usePadX(40);
  const arriba = useArriba();
  const entregas = snapshot?.entregas ?? [];
  const cursos = [...(snapshot?.courses ?? [])]
    .filter((c) => !/punto de encuentro/i.test(c.fullname))
    .map((c) => ({ c, a: info(c.id, c.fullname) }))
    .sort((x, y) => x.a.siglas.localeCompare(y.a.siglas, 'es'));
  const pendientesTotal = entregas.filter((e) => e.estado === 'pendiente' || e.estado === 'borrador' || e.estado === 'vencida').length;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: O.bg }}
      contentContainerStyle={{ paddingHorizontal: padX, paddingTop: (movil ? 28 : 40) + arriba, paddingBottom: 40 }}>
      <View style={{ width: '100%', maxWidth: 1000, alignSelf: 'center', gap: movil ? 24 : 32 }}>
        <View style={{ gap: 6 }}>
          <Etiqueta s={10.5} ls={0.24} c="#696975">
            Este cuatrimestre
          </Etiqueta>
          <T k="serif" s={movil ? 36 : 42} lh={movil ? 44 : 52} c={O.white} ls={-0.025}>
            Asignaturas
          </T>
          <T s={13} lh={20} c="#7D7D8A">
            {cursos.length} asignaturas · {pendientesTotal} {pendientesTotal === 1 ? 'entrega pendiente' : 'entregas pendientes'}
          </T>
        </View>
        <View style={{ gap: 12 }}>
          {cursos.map(({ c, a }) => {
            const delCurso = entregas.filter((e) => e.cursoId === c.id);
            const abiertas = delCurso.filter((e) => e.estado === 'pendiente' || e.estado === 'borrador').length;
            const vencidas = delCurso.filter((e) => e.estado === 'vencida').length;
            return (
              <Pressable
                key={c.id}
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/curso/[id]', params: { id: String(c.id), nombre: c.fullname } })}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: 14, backgroundColor: O.card, borderWidth: 1, borderColor: '#1D1D23' }}>
                <View style={{ width: 3, alignSelf: 'stretch', borderRadius: 99, backgroundColor: a.color }} />
                <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                  <T k="serif" s={20} lh={26} c={O.white}>
                    {a.nombre}
                  </T>
                  {a.profesor ? (
                    <T k="mono" up s={9.5} ls={0.1} c="#6B6B77" numberOfLines={1}>
                      {a.profesor}
                    </T>
                  ) : null}
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    <Chip texto={abiertas ? `${abiertas} ${abiertas === 1 ? 'por entregar' : 'por entregar'}` : 'Sin pendientes'} c={abiertas ? '#9393A2' : '#6B6B77'} bg="#161619" b="#2B2B33" />
                    {vencidas ? <Chip texto={`${vencidas} ${vencidas === 1 ? 'vencida' : 'vencidas'}`} c="#F87171" bg="#2A1818" b="#4A2424" /> : null}
                  </View>
                </View>
                <Feather name="chevron-right" size={18} color="#555560" />
              </Pressable>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

function Chip({ texto, c, bg, b }: { texto: string; c: string; bg: string; b: string }) {
  return (
    <View style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99, borderWidth: 1, backgroundColor: bg, borderColor: b }}>
      <T k="mono" up s={9.5} w={600} ls={0.05} c={c}>
        {texto}
      </T>
    </View>
  );
}
