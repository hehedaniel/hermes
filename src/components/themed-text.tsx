import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { familia, Fonts, type ThemeColor } from '@/constants/theme';
import { useTheme, useThemePreference } from '@/hooks/use-theme';

/**
 * Escala tipográfica de Andén (Space Grotesk):
 * display 34 · title 28 · subtitle 20 · heading 16 · default 15 · small 13 · meta 11.5 ·
 * label 10.5 en versalitas · cifra (tabular) · code.
 */
export type ThemedTextProps = TextProps & {
  type?:
    | 'default'
    | 'display'
    | 'title'
    | 'subtitle'
    | 'heading'
    | 'small'
    | 'smallBold'
    | 'meta'
    | 'label'
    | 'cifra'
    | 'link'
    | 'linkPrimary'
    | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const { tema } = useThemePreference();
  const plano = StyleSheet.flatten([styles[type], style]) as TextStyle;
  // Cada peso de Space Grotesk es una fuente aparte: se elige la familia y no se sintetiza
  // (si el estilo trae su propia fuente, p. ej. la monoespaciada, se respeta)
  const tipo =
    type === 'code'
      ? { fontFamily: Fonts.mono }
      : tema === 'cuaderno'
        ? {}
      : plano.fontFamily
        ? {}
        : { fontFamily: familia(plano.fontWeight), fontWeight: 'normal' as const };
  return (
    <Text
      style={[
        { color: type === 'linkPrimary' ? theme.brand : theme[themeColor ?? 'ink'] },
        plano,
        tipo,
      ]}
      {...rest}
    />
  );
}

/** Estilo de texto para un TextInput (no pasa por ThemedText). */
export const estiloCampo = (peso: number = 400): TextStyle => ({
  fontFamily: familia(peso),
  fontSize: 15,
});

const styles = StyleSheet.create({
  default: { fontSize: 15, lineHeight: 22, fontWeight: 400 },
  display: { fontSize: 34, lineHeight: 38, fontWeight: 700, letterSpacing: -1.2 },
  title: { fontSize: 28, lineHeight: 32, fontWeight: 700, letterSpacing: -1 },
  subtitle: { fontSize: 20, lineHeight: 25, fontWeight: 700, letterSpacing: -0.5 },
  heading: { fontSize: 16, lineHeight: 21, fontWeight: 700 },
  small: { fontSize: 13, lineHeight: 18, fontWeight: 400 },
  smallBold: { fontSize: 13, lineHeight: 18, fontWeight: 700 },
  meta: { fontSize: 11.5, lineHeight: 15, fontWeight: 500 },
  label: {
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: 700,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  cifra: { fontSize: 12.5, lineHeight: 16, fontWeight: 600, fontVariant: ['tabular-nums'] },
  link: { fontSize: 14, lineHeight: 30 },
  linkPrimary: { fontSize: 14, lineHeight: 30, fontWeight: 600 },
  code: { fontSize: 12, lineHeight: 17 },
});
