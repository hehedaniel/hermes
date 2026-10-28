/**
 * Notificaciones del móvil (expo-notifications): canales, permiso, avisos de novedades
 * y recordatorios programados de las entregas. En la web no hay notificaciones (avisos.web.ts).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import {
  AVISOS_POR_DEFECTO,
  type Aviso,
  avisosDeNovedades,
  type Canal,
  planRecordatorios,
  type PreferenciasAvisos,
} from './avisos-texto';
import { CLAVES } from './claves';
import type { Snapshot } from './data';
import type { Novedad } from './novedades';
import { Notifications } from './notif-nativo';

export { AVISOS_POR_DEFECTO, type PreferenciasAvisos } from './avisos-texto';
export const AVISOS_DISPONIBLES = Notifications !== null;

// Con la app abierta también se enseñan (si no, Android las guarda en silencio)
Notifications?.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function canales(
  N: NonNullable<typeof Notifications>,
): Record<Canal, { nombre: string; importancia: number }> {
  return {
    notas: { nombre: 'Notas publicadas', importancia: N.AndroidImportance.HIGH },
    entregas: { nombre: 'Recordatorios de entregas', importancia: N.AndroidImportance.HIGH },
    novedades: { nombre: 'Novedades de Moodle', importancia: N.AndroidImportance.DEFAULT },
  };
}

export async function configurarCanales() {
  if (Platform.OS !== 'android' || !Notifications) return;
  const CANALES = canales(Notifications);
  const N = Notifications;
  await Promise.all(
    (Object.keys(CANALES) as Canal[]).map((id) =>
      N.setNotificationChannelAsync(id, {
        name: CANALES[id].nombre,
        importance: CANALES[id].importancia,
        lightColor: '#0B6B5B',
      }),
    ),
  );
}

export async function leerPreferencias(): Promise<PreferenciasAvisos> {
  try {
    const raw = await AsyncStorage.getItem(CLAVES.avisos);
    return { ...AVISOS_POR_DEFECTO, ...(raw ? JSON.parse(raw) : {}) };
  } catch {
    return AVISOS_POR_DEFECTO;
  }
}

export async function guardarPreferencias(p: PreferenciasAvisos) {
  await AsyncStorage.setItem(CLAVES.avisos, JSON.stringify(p));
}

export async function permisoConcedido() {
  if (!Notifications) return false;
  if (!Notifications) return false;
  return (await Notifications.getPermissionsAsync()).granted;
}

/** Pide permiso para notificar (Android 13+ enseña el diálogo una vez). */
export async function pedirPermiso() {
  if (!Notifications) return false;
  if (!Notifications) return false;
  await AsyncStorage.setItem(CLAVES.permisoPedido, '1').catch(() => {});
  const actual = await Notifications.getPermissionsAsync();
  if (actual.granted) return true;
  if (!actual.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/** Al arrancar: canales y, la primera vez, el permiso. */
export async function prepararAvisos() {
  try {
    await configurarCanales();
    if (!(await AsyncStorage.getItem(CLAVES.permisoPedido))) await pedirPermiso();
  } catch {
    // sin notificaciones no se rompe nada
  }
}

async function mostrar(a: Aviso, cuando?: number) {
  if (!Notifications) return;
  if (!Notifications) return;
  await Notifications.scheduleNotificationAsync({
    identifier: a.id,
    content: { title: a.titulo, body: a.cuerpo, data: { ruta: a.ruta, tipo: a.canal } },
    trigger: cuando
      ? { type: Notifications.SchedulableTriggerInputTypes.DATE, date: cuando, channelId: a.canal }
      : { channelId: a.canal },
  });
}

/** Notifica las novedades que acaba de encontrar una sincronización. */
export async function avisarNovedades(nuevas: Novedad[]) {
  if (!nuevas.length || !(await permisoConcedido())) return;
  const avisos = avisosDeNovedades(nuevas, await leerPreferencias());
  for (const a of avisos) await mostrar(a).catch(() => {});
}

/**
 * Vuelve a programar los recordatorios de las entregas pendientes (1 día y 2 h antes).
 * Se llama tras cada sincronización: así se quitan los de lo ya entregado o cambiado.
 */
export async function programarRecordatorios(snap: Snapshot | null) {
  try {
    const N = Notifications;
    if (!N) return;
    const programadas = await N.getAllScheduledNotificationsAsync();
    await Promise.all(
      programadas
        .filter((n) => n.identifier.startsWith('recordatorio:'))
        .map((n) => N.cancelScheduledNotificationAsync(n.identifier)),
    );
    const prefs = await leerPreferencias();
    if (!prefs.recordatorios || !(await permisoConcedido())) return;
    for (const r of planRecordatorios(snap, Date.now(), prefs.antelacion))
      await mostrar(r, r.cuando);
  } catch {
    // los recordatorios no son críticos
  }
}

/** Un aviso de prueba, desde Ajustes. */
export async function avisoDePrueba() {
  if (!(await pedirPermiso())) return false;
  await mostrar({
    id: `prueba:${Date.now()}`,
    canal: 'novedades',
    titulo: 'Hermes',
    cuerpo: 'Así te llegarán las novedades de Moodle.',
    ruta: '/novedades',
  });
  return true;
}
