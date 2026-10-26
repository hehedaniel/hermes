import Feather from '@expo/vector-icons/Feather';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { IconoIA, type IconoFeather } from '@/components/anden';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Estado vacío: un círculo con icono sobre señal suave, título, explicación y, si hace falta,
 * una acción. No es una tarjeta: se apoya directamente sobre el papel.
 */
export function Vacio({
  titulo,
  texto,
  accion,
  icono = 'check',
  tono = 'senal',
}: {
  titulo: string;
  texto: string;
  accion?: ReactNode;
  icono?: IconoFeather | 'ia';
  tono?: 'senal' | 'neutro' | 'alerta';
}) {
  const theme = useTheme();
  const [color, fondo] =
    tono === 'alerta'
      ? [theme.urgent, theme.urgentWash]
      : tono === 'neutro'
        ? [theme.ink2, theme.paper2]
        : [theme.brand, theme.brandWash];
  return (
    <View style={styles.empty}>
      <View style={[styles.circulo, { backgroundColor: fondo }]}>
        {icono === 'ia' ? (
          <IconoIA size={22} color={color} />
        ) : (
          <Feather name={icono} size={22} color={color} />
        )}
      </View>
      <ThemedText type="heading" style={styles.titulo}>
        {titulo}
      </ThemedText>
      <ThemedText type="small" themeColor="ink2" style={styles.texto}>
        {texto}
      </ThemedText>
      {accion ? <View style={styles.accion}>{accion}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.three,
  },
  circulo: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  titulo: { fontSize: 17, textAlign: 'center' },
  texto: { textAlign: 'center', maxWidth: 300 },
  accion: { marginTop: Spacing.two, alignItems: 'center' },
});
