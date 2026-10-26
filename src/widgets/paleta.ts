import { Colors, type Paleta as PaletaTema } from '@/constants/colors';
import type { ModuloId } from '@/lib/horario';

export type Hex = `#${string}`;
export type Paleta = {
  fondo: Hex;
  texto: Hex;
  secundario: Hex;
  terciario: Hex;
  linea: Hex;
  urgente: Hex;
  acento: Hex;
  chip: Hex;
  sobreAcento: Hex;
  /** Color de cada asignatura en este tema */
  modulo: Record<ModuloId, Hex>;
};

const desde = (c: PaletaTema): Paleta => ({
  fondo: c.surface as Hex,
  texto: c.ink as Hex,
  secundario: c.ink2 as Hex,
  terciario: c.ink3 as Hex,
  linea: c.line as Hex,
  urgente: c.urgent as Hex,
  acento: c.brand as Hex,
  chip: c.paper2 as Hex,
  sobreAcento: c.brandInk as Hex,
  modulo: { MIA: c.MIA as Hex, SAA: c.SAA as Hex, BDA: c.BDA as Hex, PIA: c.PIA as Hex, SBD: c.SBD as Hex },
});

/** Los colores de la app, en claro y oscuro. */
export const PALETAS: Record<'claro' | 'oscuro', Paleta> = {
  claro: desde(Colors.light),
  oscuro: desde(Colors.dark),
};

/**
 * Space Grotesk en el widget: los .ttf se copian a assets/fonts al compilar
 * (opción «fonts» del plugin en app.config.ts) y se nombran sin la extensión.
 */
export const FUENTE = {
  400: 'SpaceGrotesk_400Regular',
  500: 'SpaceGrotesk_500Medium',
  700: 'SpaceGrotesk_700Bold',
} as const;
