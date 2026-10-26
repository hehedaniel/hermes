import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, useWindowDimensions } from 'react-native';

import { Screen } from '@/components/screen';
import { PanelTarea, TareaDetalle } from '@/components/tarea-detalle';
import { ThemedView } from '@/components/themed-view';
import { Vacio } from '@/components/vacio';
import { ANCHO_TABLETA, MARGEN } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useMoodle } from '@/lib/store';

export default function TareaScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const { snapshot } = useMoodle();
  const nowMs = useNow();
  const { width } = useWindowDimensions();
  const e = snapshot?.entregas.find((x) => x.key === key);

  if (!e) {
    return (
      <Screen refreshable={false}>
        <Vacio
          icono="search"
          tono="neutro"
          titulo="No encontrada"
          texto="Esta entrega ya no aparece en Moodle. Tira para actualizar en Pendientes."
        />
      </Screen>
    );
  }

  // En tableta y escritorio, a sangre y con la columna lateral hasta abajo
  if (width >= ANCHO_TABLETA) {
    return (
      <ThemedView style={styles.flex}>
        <PanelTarea entrega={e} nowMs={nowMs} ancho={Math.min(width, 1100)} />
      </ThemedView>
    );
  }

  return (
    <Screen refreshable={false}>
      <TareaDetalle entrega={e} nowMs={nowMs} ancho={width - MARGEN * 2} />
    </Screen>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
