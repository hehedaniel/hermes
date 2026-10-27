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

const NOCTURNO: Paleta = {
  paper: '#0E1116',
  paper2: '#11161D',
  surface: '#161B22',
  surface2: '#1C232C',
  ink: '#F2F3F5',
  ink2: '#8B949E',
  ink3: '#5B626B',
  line: '#232A33',
  line2: '#2F3844',
  brand: '#E8B14C',
  brandInk: '#0E1116',
  brandWash: '#332A1D',
  urgent: '#F0563F',
  urgentWash: '#321D1B',
  stPend: '#5B9DF9',
  stDraft: '#F2A03D',
  stDone: '#3FB77A',
  stLate: '#F0563F',
  stPendW: '#1B2A40',
  stDraftW: '#382A1B',
  stDoneW: '#1C3328',
  stLateW: '#3A211F',
  MIA: '#5B9DF9',
  SAA: '#C77DFF',
  BDA: '#3FB77A',
  PIA: '#F2A03D',
  SBD: '#E8B14C',
};

const NOCTURNO_CLARO: Paleta = {
  paper: '#F7F5F0',
  paper2: '#EEEAE2',
  surface: '#FFFFFF',
  surface2: '#FBF9F5',
  ink: '#191B20',
  ink2: '#5E626B',
  ink3: '#7C8189',
  line: '#E3DED4',
  line2: '#CFC8BA',
  brand: '#A86F12',
  brandInk: '#FFFFFF',
  brandWash: '#F6EEDC',
  urgent: '#B3261E',
  urgentWash: '#FBE7E3',
  stPend: '#2456C7',
  stDraft: '#8A5A00',
  stDone: '#146B49',
  stLate: '#B3261E',
  stPendW: '#E9EFFC',
  stDraftW: '#F5ECDD',
  stDoneW: '#E3F2EA',
  stLateW: '#FBE7E3',
  MIA: '#4A5BD6',
  SAA: '#8A45B8',
  BDA: '#146B49',
  PIA: '#A85D00',
  SBD: '#A86F12',
};

const CUADERNO_CLARO: Paleta = {
  paper: '#F5F7F3',
  paper2: '#EDF2ED',
  surface: '#FFFFFF',
  surface2: '#F8FAF7',
  ink: '#172B2A',
  ink2: '#647673',
  ink3: '#7B8A85',
  line: '#DCE5DE',
  line2: '#C8D5CD',
  brand: '#176B5B',
  brandInk: '#FFFFFF',
  brandWash: '#DCEFE7',
  urgent: '#A52F3D',
  urgentWash: '#FFE3E4',
  stPend: '#8B5C00',
  stDraft: '#365F9C',
  stDone: '#176B5B',
  stLate: '#A52F3D',
  stPendW: '#FFF0C9',
  stDraftW: '#E3EDFF',
  stDoneW: '#DCEFE7',
  stLateW: '#FFE3E4',
  MIA: '#B34C2F',
  SAA: '#4168B2',
  BDA: '#8A5A9E',
  PIA: '#197C78',
  SBD: '#9A6C19',
};

const CUADERNO_OSCURO: Paleta = {
  paper: '#111B19',
  paper2: '#233530',
  surface: '#1A2825',
  surface2: '#20312D',
  ink: '#E5EFEA',
  ink2: '#A4B5AD',
  ink3: '#81958B',
  line: '#344943',
  line2: '#496158',
  brand: '#73C6AD',
  brandInk: '#10231E',
  brandWash: '#24483E',
  urgent: '#FFABB2',
  urgentWash: '#54272E',
  stPend: '#FFD579',
  stDraft: '#A9C6FF',
  stDone: '#9EE1CA',
  stLate: '#FFABB2',
  stPendW: '#4B3A17',
  stDraftW: '#233B5D',
  stDoneW: '#21483D',
  stLateW: '#54272E',
  MIA: '#F0A087',
  SAA: '#9DB8FA',
  BDA: '#D2A5E7',
  PIA: '#80D6CE',
  SBD: '#E5C17A',
};

/** Temas disponibles; Nocturno y Cuaderno mantienen sus respectivas propuestas visuales. */
export const TEMAS = {
  anden: { nombre: 'Andén', claro: ANDEN_CLARO, oscuro: ANDEN_OSCURO },
  nocturno: { nombre: 'Nocturno', claro: NOCTURNO_CLARO, oscuro: NOCTURNO },
  cuaderno: { nombre: 'Cuaderno de campo', claro: CUADERNO_CLARO, oscuro: CUADERNO_OSCURO },
} as const;
export type TemaId = keyof typeof TEMAS;

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
  nocturno: conAlias(TEMAS.nocturno.oscuro),
  nocturnoClaro: conAlias(TEMAS.nocturno.claro),
  cuaderno: conAlias(TEMAS.cuaderno.claro),
  cuadernoOscuro: conAlias(TEMAS.cuaderno.oscuro),
};

export type ColoresTema = (typeof Colors)['light'];

/** Para cursos que no son ninguna de las cinco líneas (se asigna por orden de id). */
export const COURSE_PALETTE = ['#4A5BD6', '#0B6E77', '#8A5A00', '#A62A6B', '#58731A', '#565C63'];
