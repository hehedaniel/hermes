/**
 * «Qué hay de nuevo»: se enseña una vez después de actualizar la app (no en la primera
 * instalación) y se puede volver a ver desde Ajustes.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import Feather from '@expo/vector-icons/Feather';
import { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { VERSION } from '@/constants/version';
import { useTheme } from '@/hooks/use-theme';
import { CLAVES } from '@/lib/claves';
import { type NovedadVersion, novedadesDe, novedadesPendientes } from '@/lib/que-hay-de-nuevo';

const oyentes = new Set<(n: NovedadVersion[]) => void>();

/** Vuelve a enseñar las novedades de la versión instalada (botón de Ajustes). */
export const abrirNovedades = () => oyentes.forEach((f) => f(novedadesDe(VERSION)));

async function pendientes(): Promise<NovedadVersion[]> {
  const vista = await AsyncStorage.getItem(CLAVES.novedadesVista).catch(() => null);
  if (vista === VERSION) return [];
  if (!vista) {
    // Sin nada guardado y sin datos de Moodle: es una instalación nueva, no una actualización
    const datos = await AsyncStorage.getItem(CLAVES.snapshot).catch(() => null);
    if (!datos) {
      await AsyncStorage.setItem(CLAVES.novedadesVista, VERSION).catch(() => {});
      return [];
    }
  }
  return novedadesPendientes(vista, VERSION);
}

export function NovedadesModal() {
  const theme = useTheme();
  const [lista, setLista] = useState<NovedadVersion[]>([]);

  useEffect(() => {
    let vivo = true;
    void pendientes().then((n) => {
      if (vivo && n.length) setLista(n);
    });
    oyentes.add(setLista);
    return () => {
      vivo = false;
      oyentes.delete(setLista);
    };
  }, []);

  const cerrar = () => {
    setLista([]);
    AsyncStorage.setItem(CLAVES.novedadesVista, VERSION).catch(() => {});
  };

  return (
    <Modal transparent animationType="fade" visible={lista.length > 0} onRequestClose={cerrar}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          <View style={[styles.icono, { backgroundColor: theme.brandWash }]}>
            <Feather name="gift" size={23} color={theme.brand} />
          </View>
          <ThemedText type="heading">Novedades de Hermes</ThemedText>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.lista}>
            {lista.map((n) => (
              <View key={n.version} style={styles.version}>
                <ThemedText type="smallBold">
                  {n.titulo}
                  <ThemedText type="small" themeColor="ink3">{`  ·  ${n.version}`}</ThemedText>
                </ThemedText>
                {n.puntos.map((p) => (
                  <View key={p} style={styles.punto}>
                    <ThemedText type="small" themeColor="ink3">
                      •
                    </ThemedText>
                    <ThemedText type="small" themeColor="ink2" style={styles.texto}>
                      {p}
                    </ThemedText>
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
          <Button title="Entendido" onPress={cerrar} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.48)',
  },
  card: { borderWidth: 1, borderRadius: 18, padding: 22, gap: 14, maxHeight: '85%' },
  icono: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flexGrow: 0 },
  lista: { gap: 16 },
  version: { gap: 6 },
  punto: { flexDirection: 'row', gap: 8 },
  texto: { flex: 1 },
});
