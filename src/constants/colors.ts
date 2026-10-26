/**
 * Colores de la app, sin dependencias de React Native: así los pueden usar los widgets
 * (que se dibujan en segundo plano) y las pruebas.
 *
 * Tema «Andén»: el tablón de salidas del curso. Papel cálido, tinta casi negra y un verde de
 * señal para la única acción importante de cada pantalla. Cada asignatura es una «línea» con
 * su color. Está preparado para tener más temas: cada uno es un claro y un oscuro con las
 * mismas claves.
 */

export type Paleta = {
  /** Fondo de la app */
  paper: string;
  /** Franjas, navegación y bloques de apoyo */
  paper2: string;
  /** Solo lo que flota: campos, menús, paneles */
  surface: string;
  surface2: string;
  /** Texto principal, secundario y metadatos */
  ink: string;
  ink2: string;
  ink3: string;
  /** Separadores de 1 px y bordes de control */
  line: string;
  line2: string;
  /** Señal: la acción primaria */
  brand: string;
  brandInk: string;
  brandWash: string;
  /** Urgente y vencido */
  urgent: string;
  urgentWash: string;
  /** Estados de entrega: color y fondo suave */
  stPend: string;
  stDraft: string;
  stDone: string;
  stLate: string;
  stPendW: string;
  stDraftW: string;
  stDoneW: string;
  stLateW: string;
  /** Las cinco «líneas» de asignatura */
  MIA: string;
  SAA: string;
  BDA: string;
  PIA: string;
  SBD: string;
};

const ANDEN_CLARO: Paleta = {
  paper: '#F7F4ED',
  paper2: '#EFEBE1',
  surface: '#FFFFFF',
  surface2: '#FBF8F2',
  ink: '#15181A',
  ink2: '#565C63',
  ink3: '#7F858B',
  line: '#E2DCCF',
  line2: '#CDC6B6',
  brand: '#0B6B5B',
  brandInk: '#FFFFFF',
  brandWash: '#E0EFE9',
  urgent: '#B3261E',
  urgentWash: '#FBE7E3',
  stPend: '#2456C7',
  stDraft: '#6A6F76',
  stDone: '#146B49',
  stLate: '#B3261E',
  stPendW: '#E9EFFC',
  stDraftW: '#EDEEE9',
  stDoneW: '#E3F2EA',
  stLateW: '#FBE7E3',
  MIA: '#4A5BD6',
  SAA: '#0B6E77',
  BDA: '#8A5A00',
  PIA: '#A62A6B',
  SBD: '#58731A',
};

const ANDEN_OSCURO: Paleta = {
  paper: '#0E1112',
  paper2: '#151A1B',
  surface: '#191F20',
  surface2: '#1D2425',
  ink: '#EDECE5',
  ink2: '#A7AEAC',
  ink3: '#848E8C',
  line: '#252C2D',
  line2: '#394444',
  brand: '#56D4B8',
  brandInk: '#07221C',
  brandWash: '#102A25',
  urgent: '#FF9C8A',
  urgentWash: '#2E1A17',
  stPend: '#8FB0FF',
  stDraft: '#A9B1B8',
  stDone: '#5CD49D',
  stLate: '#FF9080',
  stPendW: '#17233A',
  stDraftW: '#232829',
  stDoneW: '#12291F',
  stLateW: '#2F1A17',
  MIA: '#9AA6FF',
  SAA: '#52D2DB',
  BDA: '#DFA948',
  PIA: '#F28CBF',
  SBD: '#B0CC6D',
};

/** Temas disponibles (de momento uno). */
export const TEMAS = {
  anden: { nombre: 'Andén', claro: ANDEN_CLARO, oscuro: ANDEN_OSCURO },
} as const;

/** Nombres antiguos que aún usan algunas pantallas, apuntando a los del tema. */
const conAlias = (p: Paleta) => ({
  ...p,
  text: p.ink,
  background: p.paper,
  backgroundElement: p.surface,
  backgroundSelected: p.paper2,
  textSecondary: p.ink2,
  border: p.line,
  accent: p.brand,
  onAccent: p.brandInk,
  entregada: p.stDone,
  pendiente: p.stPend,
  borrador: p.stDraft,
  vencida: p.stLate,
  urgente: p.urgent,
});

export const Colors = {
  light: conAlias(TEMAS.anden.claro),
  dark: conAlias(TEMAS.anden.oscuro),
};

export type ColoresTema = (typeof Colors)['light'];

/** Para cursos que no son ninguna de las cinco líneas (se asigna por orden de id). */
export const COURSE_PALETTE = ['#4A5BD6', '#0B6E77', '#8A5A00', '#A62A6B', '#58731A', '#565C63'];
