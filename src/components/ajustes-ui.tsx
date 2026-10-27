/**
 * Piezas de las pantallas de ajustes: fila con icono, interruptor y campo de texto.
 */
import Feather from '@expo/vector-icons/Feather';
import type { ReactNode } from 'react';
import {
  Platform,
  Pressable,
  type StyleProp,
  StyleSheet,
  Switch,
  TextInput,
  type TextInputProps,
  type TextStyle,
  View,
} from 'react-native';

import type { IconoFeather } from '@/components/anden';
import { estiloCampo, ThemedText } from '@/components/themed-text';
import { Radii } from '@/constants/theme';
import { useTheme, useThemePreference } from '@/hooks/use-theme';

/** Fila de ajuste: icono, título, explicación y algo a la derecha (botón, interruptor, chip…). */
export function FilaAjuste({
  icono,
  titulo,
  texto,
  derecha,
  onPress,
  chevron,
  sinRegla,
  tituloColor,
}: {
  icono?: IconoFeather;
  titulo: string;
  texto?: string;
  derecha?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  sinRegla?: boolean;
  tituloColor?: string;
}) {
  const theme = useTheme();
  const contenido = (
    <>
      {icono ? (
        <View style={styles.icono}>
          <Feather name={icono} size={17} color={tituloColor ?? theme.ink2} />
        </View>
      ) : null}
      <View style={styles.flex}>
        <ThemedText style={[styles.titulo, tituloColor ? { color: tituloColor } : null]}>
          {titulo}
        </ThemedText>
        {texto ? (
          <ThemedText type="meta" themeColor="ink2" style={styles.texto}>
            {texto}
          </ThemedText>
        ) : null}
      </View>
      {derecha}
      {chevron ? <Feather name="chevron-right" size={16} color={theme.ink3} /> : null}
    </>
  );
  const estilo = [styles.fila, !sinRegla && { borderBottomWidth: 1, borderBottomColor: theme.line }];
  if (!onPress) return <View style={estilo}>{contenido}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [...estilo, pressed && { opacity: 0.6 }]}>
      {contenido}
    </Pressable>
  );
}

/** Interruptor con el verde de señal. */
export function Interruptor({
  value,
  onValueChange,
  accessibilityLabel,
}: {
  value: boolean;
  onValueChange: (v: boolean) => void;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      accessibilityLabel={accessibilityLabel}
      trackColor={{ true: theme.brand, false: theme.line2 }}
      thumbColor={Platform.OS === 'android' ? theme.surface : undefined}
      {...(Platform.OS === 'web' ? { activeThumbColor: theme.surface } : {})}
    />
  );
}

/** Campo de texto con la fuente de la app, sobre superficie y con borde de control. */
export function Campo({
  style,
  multiline,
  ...props
}: TextInputProps & { style?: StyleProp<TextStyle> }) {
  const theme = useTheme();
  const { tema } = useThemePreference();
  return (
    <TextInput
      placeholderTextColor={theme.ink3}
      multiline={multiline}
      {...props}
      style={[
        styles.campo,
        tema === 'cuaderno' ? { fontSize: 15 } : estiloCampo(),
        { color: theme.ink, backgroundColor: theme.surface, borderColor: theme.line2 },
        multiline && styles.multi,
        style,
      ]}
    />
  );
}

/** Etiqueta en versalitas para un campo («CLAVE DE API», «MODELO»…). */
export function Etiqueta({ children, derecha }: { children: string; derecha?: ReactNode }) {
  return (
    <View style={styles.etiqueta}>
      <ThemedText type="label" themeColor="ink2" style={styles.flex}>
        {children}
      </ThemedText>
      {derecha}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, minHeight: 56 },
  icono: { width: 22, alignItems: 'center' },
  titulo: { fontSize: 15, lineHeight: 20, fontWeight: 500 },
  texto: { marginTop: 1 },
  campo: {
    borderWidth: 1,
    borderRadius: Radii.control,
    paddingHorizontal: 12,
    paddingVertical: 11,
    minHeight: 46,
  },
  multi: { minHeight: 84, textAlignVertical: 'top' },
  etiqueta: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
});
