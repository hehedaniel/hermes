import Feather from '@expo/vector-icons/Feather';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { IconoIA, type IconoFeather } from '@/components/anden';
import { ThemedText } from '@/components/themed-text';
import { Radii } from '@/constants/theme';
import { useTheme, useThemePreference } from '@/hooks/use-theme';

type Props = {
  title: string;
  onPress: () => void;
  /** primary: la única acción importante (señal) · secondary: contorno · ghost: solo texto */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  /** Icono de Feather o 'ia' (el destello) */
  icono?: IconoFeather | 'ia';
  /** Más bajo (36 px), para filas y tarjetas */
  compacto?: boolean;
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  icono,
  compacto,
}: Props) {
  const theme = useTheme();
  const { tema } = useThemePreference();
  const bg = variant === 'primary' ? theme.brand : variant === 'secondary' ? theme.surface : 'transparent';
  const fg =
    variant === 'primary'
      ? theme.brandInk
      : variant === 'danger'
        ? theme.urgent
        : variant === 'ghost'
          ? theme.ink2
          : theme.ink;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.btn,
        compacto && styles.compacto,
        tema === 'cuaderno' && styles.cuaderno,
        {
          backgroundColor: bg,
          borderColor: variant === 'secondary' ? theme.line2 : 'transparent',
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
        },
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.fila}>
          {icono === 'ia' ? (
            <IconoIA size={compacto ? 15 : 17} color={fg} />
          ) : icono ? (
            <Feather name={icono} size={compacto ? 14 : 16} color={fg} />
          ) : null}
          <ThemedText style={[styles.text, compacto && styles.textCompacto, { color: fg }]}>
            {title}
          </ThemedText>
        </View>
      )}
    </Pressable>
  );
}

/** Conmutador de dos o más opciones (Mes / Horario). */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.seg, { backgroundColor: theme.paper2, borderColor: theme.line }]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[
              styles.segItem,
              active && [styles.segActivo, { backgroundColor: theme.surface }],
            ]}>
            <ThemedText
              type="small"
              style={{ fontWeight: active ? 600 : 500 }}
              themeColor={active ? 'ink' : 'ink2'}>
              {o.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 46,
    borderRadius: Radii.control,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  compacto: { minHeight: 36, paddingHorizontal: 12 },
  cuaderno: { minHeight: 44, borderRadius: 10 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  text: { fontSize: 15, lineHeight: 20, fontWeight: 600 },
  textCompacto: { fontSize: 13.5, lineHeight: 18 },
  seg: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    borderRadius: Radii.control,
    borderWidth: 1,
    padding: 2,
  },
  segItem: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, alignItems: 'center' },
  segActivo: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
});
