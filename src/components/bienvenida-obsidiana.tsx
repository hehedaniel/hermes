/**
 * Lo que ve quien abre Hermes por primera vez, en el diseño Obsidiana: la bienvenida con el
 * botón para iniciar sesión y, ya con sesión, la primera sincronización.
 */
import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';

import { Etiqueta, O, T, Tarjeta, useArriba, useMovil, usePadX } from '@/components/obs';
import { useMoodle } from '@/lib/store';

const PUNTOS = [
  ['Pendientes ordenados por urgencia', 'con nota y estado reales'],
  ['Novedades de tus asignaturas', 'apuntes, cambios y correcciones'],
  ['Una IA por tarea', 'que lee el enunciado y te ayuda a entregar'],
];

function Marca() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          backgroundColor: O.card2,
          borderWidth: 1,
          borderColor: O.line2,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <T k="sans" w={700} s={18} lh={20} c={O.white}>
          H
        </T>
        <View
          style={{
            width: 12,
            height: 2,
            borderRadius: 1,
            backgroundColor: '#34D3B5',
            marginTop: 1,
          }}
        />
      </View>
      <View>
        <T k="serif" s={24} lh={26} c={O.white} ls={-0.02}>
          Hermes
        </T>
        <Etiqueta s={9} ls={0.25} c={O.t4}>
          Campus IA & Big Data
        </Etiqueta>
      </View>
    </View>
  );
}

export function BienvenidaObsidiana() {
  const movil = useMovil();
  const padX = usePadX();
  const arriba = useArriba();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: O.bg }}
      contentContainerStyle={{
        paddingHorizontal: padX,
        paddingTop: 32 + arriba,
        paddingBottom: 40,
      }}>
      <View style={{ width: '100%', maxWidth: 640, alignSelf: 'center', gap: 32 }}>
        <Marca />
        <View style={{ gap: 12 }}>
          <Etiqueta s={10.5} ls={0.25} c="#686875">
            Bienvenida
          </Etiqueta>
          <T k="serif" s={movil ? 40 : 52} lh={movil ? 46 : 58} c={O.white} ls={-0.025}>
            Tu curso, sin pelearte con Moodle.
          </T>
          <T s={15} lh={23} c={O.t2}>
            Hermes lee tu Moodle y te lo cuenta claro: qué entregar, qué ha cambiado y qué toca hoy.
          </T>
        </View>
        <Tarjeta radius={14} style={{ padding: 20, gap: 16 }}>
          {PUNTOS.map(([titulo, detalle]) => (
            <View key={titulo} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  backgroundColor: O.limeWash,
                  borderWidth: 1,
                  borderColor: O.limeLine,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Feather name="check" size={12} color={O.lime} />
              </View>
              <View style={{ flex: 1 }}>
                <T w={600} s={14} lh={19} c={O.white}>
                  {titulo}
                </T>
                <T k="mono" s={11} lh={16} c={O.t3}>
                  {detalle}
                </T>
              </View>
            </View>
          ))}
        </Tarjeta>
        <View style={{ gap: 14 }}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.navigate('/ajustes')}
            style={{
              backgroundColor: O.lime,
              borderRadius: 12,
              paddingVertical: 15,
              alignItems: 'center',
            }}>
            <T w={600} s={15} c="#0A0A0C">
              Iniciar sesión en Moodle
            </T>
          </Pressable>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}>
            <Feather name="lock" size={11} color={O.t3} />
            <T k="mono" s={11} c={O.t3}>
              Tu sesión se guarda solo en este dispositivo.
            </T>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

/** Primera sincronización, con la sesión ya iniciada. */
export function SincronizandoObsidiana() {
  const padX = usePadX();
  const arriba = useArriba();
  const { error } = useMoodle();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: O.bg }}
      contentContainerStyle={{
        paddingHorizontal: padX,
        paddingTop: 32 + arriba,
        paddingBottom: 40,
      }}>
      <View style={{ width: '100%', maxWidth: 640, alignSelf: 'center', gap: 28 }}>
        <View>
          <Etiqueta s={10.5} ls={0.25} c="#686875" style={{ marginBottom: 4 }}>
            Primera sincronización
          </Etiqueta>
          <T k="serif" s={40} lh={48} c={O.white} ls={-0.025}>
            {error ? 'No se pudo conectar' : 'Sincronizando'}
          </T>
        </View>
        <Tarjeta radius={14} style={{ padding: 20, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Feather name={error ? 'wifi-off' : 'loader'} size={14} color={error ? O.red : O.t2} />
            <T s={14} lh={20} c={O.text} style={{ flex: 1 }}>
              {error
                ? 'Revisa la conexión. Hermes lo volverá a intentar al abrir la app.'
                : 'Leyendo tus asignaturas y entregas. La primera vez tarda unos segundos más.'}
            </T>
          </View>
        </Tarjeta>
      </View>
    </ScrollView>
  );
}
