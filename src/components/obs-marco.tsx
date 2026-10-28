/**
 * Marco común de las pantallas Obsidiana que no están en el diseño de Stitch (asistente,
 * ajustes de la IA, documentos): barra lateral y cabecera con migas, igual que el detalle de tarea.
 */
import { router } from 'expo-router';
import { type ReactNode } from 'react';
import Feather from '@expo/vector-icons/Feather';
import { Pressable, useWindowDimensions, View } from 'react-native';

import { Etiqueta, O, Punto, T, useArriba } from '@/components/obs';
import { LateralObsidianaFuera } from '@/components/obs-lateral';

export type Miga = { texto: string; color?: string; alPulsar?: () => void };

export function MarcoObsidiana({
  migas,
  derecha,
  cursoActivo,
  children,
}: {
  migas: Miga[];
  derecha?: ReactNode;
  cursoActivo?: number;
  children: ReactNode;
}) {
  const { width } = useWindowDimensions();
  const movil = width < 1100;
  const arriba = useArriba();
  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: O.bg }}>
      {width >= 1100 ? <LateralObsidianaFuera cursoActivo={cursoActivo} /> : null}
      <View style={{ flex: 1, minWidth: 0, backgroundColor: '#0D0E11' }}>
        <View
          style={{
            height: 56 + arriba,
            paddingTop: arriba,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            paddingHorizontal: movil ? 20 : 32,
            borderBottomWidth: 1,
            borderBottomColor: '#18191F',
          }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              flexShrink: 1,
              minWidth: 0,
            }}>
            {movil ? (
              <Pressable
                onPress={() => router.back()}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Volver"
                style={{ paddingRight: 4 }}>
                <Feather name="arrow-left" size={18} color="#A4A9B6" />
              </Pressable>
            ) : null}
            {(movil ? migas.slice(-1) : migas).map((m, i, lista) => (
              <View
                key={`${m.texto}-${i}`}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  flexShrink: i === lista.length - 1 ? 1 : 0,
                  minWidth: 0,
                }}>
                {i > 0 ? (
                  <T k="mono" s={10} c="#41444E">
                    /
                  </T>
                ) : null}
                {m.color ? <Punto color={m.color} size={6} /> : null}
                <Pressable
                  style={{ flexShrink: 1, minWidth: 0 }}
                  disabled={!m.alPulsar}
                  onPress={m.alPulsar ?? (() => router.back())}
                  accessibilityRole={m.alPulsar ? 'link' : undefined}>
                  <Etiqueta
                    s={10}
                    ls={0.16}
                    w={400}
                    c={i === lista.length - 1 ? '#898E9C' : '#6D717E'}
                    numberOfLines={1}>
                    {m.texto}
                  </Etiqueta>
                </Pressable>
              </View>
            ))}
          </View>
          {derecha}
        </View>
        {children}
      </View>
    </View>
  );
}

/** Botón-píldora de la cabecera («Abrir en Moodle», «Borrar»…). */
export function PildoraObs({
  texto,
  alPulsar,
  peligro,
}: {
  texto: string;
  alPulsar: () => void;
  peligro?: boolean;
}) {
  return (
    <Pressable
      onPress={alPulsar}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: peligro ? '#4A2020' : '#24272F',
      }}>
      <T k="mono" up s={10} ls={0.14} c={peligro ? '#F87171' : '#A4A9B6'}>
        {texto}
      </T>
    </Pressable>
  );
}
