import { router } from 'expo-router';
import { useEffect } from 'react';

import { rutaDeAviso } from '@/lib/abrir-aviso';
import { Notifications } from '@/lib/notif-nativo';

// Sin el módulo nativo (cliente antiguo) no hay respuestas a notificaciones
const useUltimaRespuesta = Notifications?.useLastNotificationResponse ?? (() => null);

// Fuera del componente: si la raíz se vuelve a montar, un aviso ya abierto no se abre otra vez
const abiertas = new Set<string>();

/**
 * Al tocar una notificación, abre su pantalla (la entrega o Novedades).
 * `listo`: la navegación ya está montada (fuentes y tema cargados). Hasta entonces se espera.
 */
export function useAbrirAviso(listo: boolean) {
  const respuesta = useUltimaRespuesta();
  useEffect(() => {
    const ruta = rutaDeAviso(respuesta, listo, abiertas);
    // Las pestañas quedan debajo (anchor en _layout), así que se puede volver atrás
    if (ruta) router.push(ruta as never);
  }, [respuesta, listo]);
}
