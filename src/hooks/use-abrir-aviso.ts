import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';

/** Al tocar una notificación, abre su pantalla (la entrega o Novedades). */
export function useAbrirAviso() {
  const respuesta = Notifications.useLastNotificationResponse();
  const abierta = useRef<string | null>(null);
  useEffect(() => {
    if (!respuesta) return;
    const id = respuesta.notification.request.identifier;
    const ruta = respuesta.notification.request.content.data?.ruta;
    if (abierta.current === id || typeof ruta !== 'string') return;
    abierta.current = id;
    // Las pestañas quedan debajo (anchor en _layout), así que se puede volver atrás
    router.push(ruta as never);
  }, [respuesta]);
}
