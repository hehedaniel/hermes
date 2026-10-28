/** Barra lateral del diseño Obsidiana (270 px). Medidas del HTML de «Pendientes». */
import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';

import type { IconoFeather } from '@/components/anden';
import { Etiqueta, O, Punto, T } from '@/components/obs';
import { useNow } from '@/hooks/use-now';
import { haceCuanto } from '@/lib/format';
import { useAsignaturas, useMoodle } from '@/lib/store';

type Ruta = {
  key: string;
  name: string;
  activa: boolean;
  info: { titulo: string; icono: IconoFeather };
};

export const ANCHO_LATERAL_OBS = 270;

export function LateralObsidiana({
  rutas,
  ir,
  novedades,
  cursoActivo,
}: {
  rutas: Ruta[];
  ir: (name: string, key: string, activa: boolean) => void;
  novedades: number;
  /** Asignatura que se está viendo (se marca en la lista) */
  cursoActivo?: number;
}) {
  const { snapshot, syncing, refresh } = useMoodle();
  const info = useAsignaturas();
  const nowMs = useNow();
  const nombre = snapshot?.site.fullname ?? 'Sin cuenta';
  const iniciales = nombre
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
  const principales = ['index', 'calendario', 'notas', 'novedades']
    .map((n) => rutas.find((r) => r.name === n))
    .filter((r): r is Ruta => !!r);
  const ajustes = rutas.find((r) => r.name === 'ajustes');
  const cursos = (snapshot?.courses ?? []).filter((c) => !/punto de encuentro/i.test(c.fullname));
  const sincronizado = syncing
    ? 'Sincronizando…'
    : snapshot
      ? `Sincronizado ${haceCuanto(snapshot.syncedAt, nowMs)}`
      : 'Sin sincronizar';

  return (
    <View
      style={{
        width: ANCHO_LATERAL_OBS,
        backgroundColor: O.side,
        borderRightWidth: 1,
        borderRightColor: '#1A1A1F',
        paddingVertical: 24,
        paddingHorizontal: 16,
        justifyContent: 'space-between',
      }}>
      <View style={{ flex: 1, minHeight: 0 }}>
        <View style={{ paddingHorizontal: 12, marginBottom: 32 }}>
          <T k="serif" s={30} lh={36} c={O.white} ls={0.025}>
            Hermes
          </T>
          <Etiqueta s={9.5} ls={0.25} c="#63636E" w={500} style={{ marginTop: 6 }}>
            Campus IA & Big Data
          </Etiqueta>
        </View>

        <View style={{ gap: 4, marginBottom: 32 }}>
          {principales.map((r, i) => {
            const activa = r.activa;
            const n = r.name === 'novedades' ? novedades : 0;
            return (
              <Pressable
                key={r.key}
                onPress={() => ir(r.name, r.key, r.activa)}
                accessibilityRole="tab"
                accessibilityLabel={r.info.titulo}
                accessibilityState={{ selected: activa }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 8,
                  backgroundColor: activa ? '#141418' : 'transparent',
                }}>
                {activa ? (
                  <View
                    style={{
                      position: 'absolute',
                      left: -16,
                      top: 6,
                      width: 3.5,
                      height: 24,
                      backgroundColor: O.lime,
                      borderTopRightRadius: 99,
                      borderBottomRightRadius: 99,
                    }}
                  />
                ) : null}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Feather name={r.info.icono} size={16} color={activa ? O.lime : '#6E6E79'} />
                  <T s={13.5} w={500} c={activa ? O.white : '#888894'}>
                    {r.info.titulo}
                  </T>
                </View>
                {n > 0 ? (
                  <View
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 8,
                      backgroundColor: '#3C4A17',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <T k="mono" s={10} w={600} c={O.lime}>
                      {n > 9 ? '9+' : n}
                    </T>
                  </View>
                ) : (
                  <T k="mono" s={11} c={activa ? '#71717E' : '#555562'}>
                    {String(i + 1).padStart(2, '0')}
                  </T>
                )}
              </Pressable>
            );
          })}
        </View>

        <View style={{ paddingHorizontal: 12, flex: 1, minHeight: 0 }}>
          <Etiqueta s={10} ls={0.2} c="#565660" style={{ marginBottom: 12 }}>
            Asignaturas
          </Etiqueta>
          <ScrollView contentContainerStyle={{ gap: 10 }} showsVerticalScrollIndicator={false}>
            {cursos.map((c) => {
              const a = info(c.id, c.fullname);
              return (
                <Pressable
                  key={c.id}
                  onPress={() =>
                    router.push({
                      pathname: '/curso/[id]',
                      params: { id: String(c.id), nombre: c.fullname },
                    })
                  }
                  accessibilityRole="link"
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Punto color={a.color} />
                  <T s={12.5} c={cursoActivo === c.id ? O.white : '#868692'} w={cursoActivo === c.id ? 600 : 400} numberOfLines={1} style={{ flex: 1 }}>
                    {a.nombre}
                  </T>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>

      <View
        style={{ paddingHorizontal: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#19191D' }}>
        {ajustes ? (
          <Pressable
            onPress={() => ir(ajustes.name, ajustes.key, ajustes.activa)}
            accessibilityRole="tab"
            accessibilityLabel="Ajustes"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              paddingHorizontal: 8,
              paddingVertical: 8,
              marginBottom: 12,
              borderRadius: 8,
              backgroundColor: ajustes.activa ? '#141418' : 'transparent',
            }}>
            <Feather name="sliders" size={16} color={ajustes.activa ? O.lime : '#7C7C88'} />
            <T s={13} w={500} c={ajustes.activa ? O.white : '#7C7C88'}>
              Ajustes
            </T>
          </Pressable>
        ) : null}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 8,
            paddingVertical: 6,
            borderRadius: 8,
            backgroundColor: '#111114',
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: '#1E1E24',
                borderWidth: 1,
                borderColor: '#2B2B34',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <T s={11} w={600} c="#A4A4B2">
                {iniciales}
              </T>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <T s={12} w={600} c={O.white} numberOfLines={1} lh={16}>
                {nombre}
              </T>
              <Etiqueta s={9} ls={0.025} c="#6B6B77" w={400} numberOfLines={1}>
                IA y Big Data
              </Etiqueta>
            </View>
          </View>
          <Pressable
            onPress={() => refresh()}
            disabled={syncing}
            accessibilityLabel="Actualizar"
            style={{ padding: 4 }}>
            <Feather name="refresh-cw" size={14} color="#595966" />
          </Pressable>
        </View>
        <T k="mono" s={9.5} c="#484852" style={{ marginTop: 10, paddingHorizontal: 8 }}>
          {sincronizado}
        </T>
      </View>
    </View>
  );
}

const RUTAS: Ruta[] = [
  { key: 'index', name: 'index', activa: false, info: { titulo: 'Pendientes', icono: 'clipboard' } },
  { key: 'calendario', name: 'calendario', activa: false, info: { titulo: 'Calendario', icono: 'calendar' } },
  { key: 'notas', name: 'notas', activa: false, info: { titulo: 'Notas', icono: 'award' } },
  { key: 'novedades', name: 'novedades', activa: false, info: { titulo: 'Novedades', icono: 'bell' } },
  { key: 'ajustes', name: 'ajustes', activa: false, info: { titulo: 'Ajustes', icono: 'settings' } },
];

/** La barra lateral fuera de las pestañas (en la pantalla de una asignatura o de una tarea). */
export function LateralObsidianaFuera({ cursoActivo }: { cursoActivo?: number }) {
  const { noLeidas } = useMoodle();
  return (
    <LateralObsidiana
      rutas={RUTAS}
      novedades={noLeidas}
      cursoActivo={cursoActivo}
      ir={(name) => router.navigate(name === 'index' ? '/' : (`/${name}` as '/ajustes'))}
    />
  );
}
