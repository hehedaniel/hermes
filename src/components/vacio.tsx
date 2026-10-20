import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function Vacio({
  titulo,
  texto,
  accion,
}: {
  titulo: string;
  texto: string;
  accion?: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.empty, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="smallBold" style={{ fontSize: 18 }}>
        {titulo}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
        {texto}
      </ThemedText>
      {accion}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    borderRadius: 14,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
});
