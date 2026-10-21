/**
 * Colores de la app, sin dependencias de React Native: así los pueden usar los widgets
 * (que se dibujan en segundo plano) y las pruebas.
 */

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
    border: '#E0E1E6',
    accent: '#1F6FEB',
    onAccent: '#ffffff',
    entregada: '#1A7F37',
    pendiente: '#1F6FEB',
    borrador: '#9A6700',
    vencida: '#CF222E',
    urgente: '#BC4C00',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
    border: '#2E3135',
    accent: '#4C9AFF',
    onAccent: '#0B1220',
    entregada: '#3FB950',
    pendiente: '#58A6FF',
    borrador: '#D29922',
    vencida: '#F85149',
    urgente: '#F0883E',
  },
} as const;

/** Paleta para distinguir asignaturas de un vistazo (se asigna por orden de id, sin repetir). */
export const COURSE_PALETTE = [
  '#1F6FEB',
  '#8250DF',
  '#1A7F37',
  '#BF3989',
  '#BC4C00',
  '#0E8A82',
  '#9A6700',
  '#6E7781',
];
