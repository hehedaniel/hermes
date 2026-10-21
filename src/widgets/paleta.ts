import { Colors } from '@/constants/theme';

export type Hex = `#${string}`;
export type Paleta = {
  fondo: Hex;
  texto: Hex;
  secundario: Hex;
  urgente: Hex;
  acento: Hex;
  chip: Hex;
  sobreAcento: Hex;
};

/** Los colores de la app, en claro y oscuro. */
export const PALETAS: Record<'claro' | 'oscuro', Paleta> = {
  claro: {
    fondo: Colors.light.background,
    texto: Colors.light.text,
    secundario: Colors.light.textSecondary,
    urgente: Colors.light.urgente,
    acento: Colors.light.accent,
    chip: Colors.light.backgroundElement,
    sobreAcento: Colors.light.onAccent,
  },
  oscuro: {
    fondo: '#1B1C1F',
    texto: Colors.dark.text,
    secundario: Colors.dark.textSecondary,
    urgente: Colors.dark.urgente,
    acento: Colors.dark.accent,
    chip: Colors.dark.backgroundSelected,
    sobreAcento: Colors.dark.onAccent,
  },
};
