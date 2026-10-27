import { Colors, TEMAS, type Paleta as PaletaTema, type TemaId } from '@/constants/colors';
import type { ModuloId } from '@/lib/horario';
import type { ModoColor } from '@/hooks/use-theme';

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

export type PaletasWidget = { claro: Paleta; oscuro: Paleta };

/** Paleta del widget según el tema seleccionado y el modo de color de la app. */
export function paletasDeTema(tema: TemaId, modo: ModoColor): PaletasWidget {
  const colores = TEMAS[tema];
  return {
    claro: desde(modo === 'oscuro' ? colores.oscuro : colores.claro),
    oscuro: desde(modo === 'claro' ? colores.claro : colores.oscuro),
  };
}

/** Colores de Andén para las llamadas que aún no reciben preferencias. */
export const PALETAS: PaletasWidget = {
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
