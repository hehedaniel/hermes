import { router } from 'expo-router';
import { useEffect, useRef } from 'react';

import { Notifications } from '@/lib/notif-nativo';

// Sin el módulo nativo (cliente antiguo) no hay respuestas a notificaciones
const useUltimaRespuesta = Notifications?.useLastNotificationResponse ?? (() => null);

/** Al tocar una notificación, abre su pantalla (la entrega o Novedades). */
export function useAbrirAviso() {
  const respuesta = useUltimaRespuesta();
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
