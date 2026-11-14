/**
 * Qué pantalla abrir al tocar una notificación. Sin dependencias de React ni de expo-notifications
 * para poder probarlo.
 */

/** Lo que se usa de la respuesta de expo-notifications al tocar un aviso. */
export type RespuestaAviso = {
  notification: {
    request: { identifier: string; content: { data?: Record<string, unknown> | null } };
  };
};

/**
 * Ruta que hay que abrir, o null si no toca navegar.
 * - `listo`: el Stack de la raíz ya está montado. Si se navega antes (arranque en frío desde el
 *   aviso, con las fuentes aún cargando), expo-router vuelve a montar la raíz y se entra en bucle.
 * - `abiertas`: avisos ya abiertos. Se anota aquí el id para no abrir el mismo aviso dos veces.
 */
export function rutaDeAviso(
  respuesta: RespuestaAviso | null | undefined,
  listo: boolean,
  abiertas: Set<string>,
): string | null {
  if (!listo || !respuesta) return null;
  const { identifier, content } = respuesta.notification.request;
  const ruta = content.data?.ruta;
  if (abiertas.has(identifier) || typeof ruta !== 'string') return null;
  abiertas.add(identifier);
  return ruta;
}
