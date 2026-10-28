/**
 * Barra inferior de Obsidiana en móvil: cuatro pestañas y, en el centro, un botón elevado que
 * despliega en abanico (semicírculo) lo demás: Asignaturas, Asistente y Ajustes.
 */
import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { IconoFeather } from '@/components/anden';
import { O, T } from '@/components/obs';
import { useMoodle } from '@/lib/store';

type Ruta = {
  key: string;
  name: string;
  activa: boolean;
  info: { titulo: string; icono: IconoFeather };
};

const BOTON = 56;
const RADIO = 140;
const ITEM = 52;

export function BarraInferiorObsidiana({
  rutas,
  ir,
  novedades,
  urgentes,
}: {
  rutas: Ruta[];
  ir: (name: string, key: string, activa: boolean) => void;
  novedades: number;
  urgentes: number;
}) {
  const { bottom } = useSafeAreaInsets();
  const { snapshot } = useMoodle();
  const [abierto, setAbierto] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const boton = useRef<View>(null);
  const [p] = useState(() => new Animated.Value(0));

  const proxima = useMemo(
    () =>
      (snapshot?.entregas ?? [])
        .filter((e) => e.estado === 'pendiente' || e.estado === 'borrador')
        .sort((a, b) => (a.fecha || Infinity) - (b.fecha || Infinity))[0],
    [snapshot?.entregas],
  );

  const por = (n: string) => rutas.find((r) => r.name === n);
  const izquierda = ['index'].map(por).filter(Boolean) as Ruta[];
  const derecha = ['calendario'].map(por).filter(Boolean) as Ruta[];
  const enAbanico = rutas.some((r) => r.activa && !['index', 'calendario'].includes(r.name));

  type Opcion = {
    id: string;
    icono: IconoFeather;
    texto: string;
    activa?: boolean;
    alPulsar: () => void;
  };
  const opciones: Opcion[] = [];
  const ruta = (name: string, icono: IconoFeather, texto: string) => {
    const r = por(name);
    if (r)
      opciones.push({
        id: name,
        icono,
        texto,
        activa: r.activa,
        alPulsar: () => ir(r.name, r.key, r.activa),
      });
  };
  ruta('novedades', 'bell', 'Novedades');
  ruta('cursos', 'book-open', 'Asignaturas');
  if (proxima)
    opciones.push({
      id: 'ia',
      icono: 'star',
      texto: 'Asistente',
      alPulsar: () => router.push(`/ia/${encodeURIComponent(proxima.key)}`),
    });
  ruta('notas', 'award', 'Notas');
  ruta('ajustes', 'settings', 'Ajustes');

  useEffect(() => {
    Animated.timing(p, {
      toValue: abierto ? 1 : 0,
      duration: abierto ? 260 : 160,
      easing: abierto ? Easing.out(Easing.back(1.4)) : Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [abierto, p]);

  function abrir() {
    if (abierto) return setAbierto(false);
    boton.current?.measureInWindow((x, y, w, h) => {
      setPos({ x: x + w / 2, y: y + h / 2 });
      setAbierto(true);
    });
  }
  const cerrar = () => setAbierto(false);

  const pestana = (r: Ruta) => {
    const globo = r.name === 'index' ? urgentes : r.name === 'novedades' ? novedades : 0;
    const color = r.activa ? O.lime : '#6B6B77';
    return (
      <Pressable
        key={r.key}
        onPress={() => ir(r.name, r.key, r.activa)}
        accessibilityRole="tab"
        accessibilityState={{ selected: r.activa }}
        accessibilityLabel={r.info.titulo}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 56 }}>
        <View>
          <Feather name={r.info.icono} size={21} color={color} />
          {globo ? (
            <View
              style={{
                position: 'absolute',
                top: -5,
                right: -9,
                minWidth: 16,
                height: 16,
                borderRadius: 8,
                paddingHorizontal: 3,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: r.name === 'index' ? O.amber : O.lime,
                borderWidth: 1.5,
                borderColor: O.side,
              }}>
              <T w={700} s={9} c="#0A0A0C">
                {globo > 9 ? '9+' : globo}
              </T>
            </View>
          ) : null}
        </View>
        <T w={r.activa ? 600 : 500} s={10.5} c={color} numberOfLines={1}>
          {r.info.titulo}
        </T>
      </Pressable>
    );
  };

  const n = opciones.length;
  // Abanico: semicírculo de 160° a 20°
  const angulo = (i: number) => ((n === 1 ? 90 : 160 - (140 * i) / (n - 1)) * Math.PI) / 180;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: O.side,
        borderTopWidth: 1,
        borderTopColor: O.line,
        paddingBottom: bottom,
      }}>
      {izquierda.map(pestana)}
      <View style={{ width: BOTON + 24, alignItems: 'center', justifyContent: 'center' }}>
        <Pressable
          ref={boton}
          onPress={abrir}
          accessibilityRole="button"
          accessibilityLabel="Más opciones"
          style={{
            width: BOTON,
            height: BOTON,
            marginTop: -26,
            borderRadius: BOTON / 2,
            backgroundColor: O.lime,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 4,
            borderColor: O.side,
            opacity: abierto ? 0 : 1,
          }}>
          <Feather name="grid" size={22} color="#0A0A0C" />
          {novedades ? (
            <View
              style={{
                position: 'absolute',
                top: -4,
                right: -4,
                minWidth: 18,
                height: 18,
                borderRadius: 9,
                paddingHorizontal: 4,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: O.amber,
                borderWidth: 2,
                borderColor: O.side,
              }}>
              <T w={700} s={9.5} c="#0A0A0C">
                {novedades > 9 ? '9+' : novedades}
              </T>
            </View>
          ) : null}
          {enAbanico ? (
            <View
              style={{
                position: 'absolute',
                bottom: -9,
                width: 5,
                height: 5,
                borderRadius: 3,
                backgroundColor: O.lime,
              }}
            />
          ) : null}
        </Pressable>
      </View>
      {derecha.map(pestana)}

      <Modal
        visible={abierto}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={cerrar}>
        <Animated.View style={{ flex: 1, backgroundColor: 'rgba(10,10,12,0.8)', opacity: p }}>
          <Pressable style={{ flex: 1 }} onPress={cerrar} accessibilityLabel="Cerrar menú" />
        </Animated.View>
        {pos ? (
          <View
            pointerEvents="box-none"
            style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}>
            {opciones.map((o, i) => {
              const a = angulo(i);
              const dx = Math.cos(a) * RADIO;
              const dy = -Math.sin(a) * RADIO;
              return (
                <Animated.View
                  key={o.id}
                  style={{
                    position: 'absolute',
                    left: pos.x - ITEM / 2,
                    top: pos.y - ITEM / 2,
                    width: ITEM,
                    alignItems: 'center',
                    opacity: p,
                    transform: [
                      { translateX: p.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }) },
                      { translateY: p.interpolate({ inputRange: [0, 1], outputRange: [0, dy] }) },
                      { scale: p.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
                    ],
                  }}>
                  <Pressable
                    onPress={() => {
                      cerrar();
                      o.alPulsar();
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={o.texto}
                    style={{
                      width: ITEM,
                      height: ITEM,
                      borderRadius: ITEM / 2,
                      backgroundColor: o.activa ? '#1B2311' : '#17171C',
                      borderWidth: 1,
                      borderColor: o.activa ? '#43561B' : '#2B2B33',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Feather
                      name={o.icono}
                      size={20}
                      color={o.activa || o.id === 'ia' ? O.lime : '#E2E2E8'}
                    />
                  </Pressable>
                  <T
                    k="mono"
                    up
                    s={9.5}
                    ls={0.08}
                    c="#C3C7D2"
                    style={{ marginTop: 6, width: 84, textAlign: 'center' }}>
                    {o.texto}
                  </T>
                </Animated.View>
              );
            })}
            <Pressable
              onPress={cerrar}
              accessibilityRole="button"
              accessibilityLabel="Cerrar menú"
              style={{
                position: 'absolute',
                left: pos.x - BOTON / 2,
                top: pos.y - BOTON / 2,
                width: BOTON,
                height: BOTON,
                borderRadius: BOTON / 2,
                backgroundColor: O.lime,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 4,
                borderColor: O.side,
              }}>
              <Feather name="x" size={24} color="#0A0A0C" />
            </Pressable>
          </View>
        ) : null}
      </Modal>
    </View>
  );
}
