import { requestWidgetUpdate } from 'react-native-android-widget';

import type { Snapshot } from '@/lib/data';

import { dibujar, WIDGETS } from './render';

/** Redibuja los widgets que haya en la pantalla de inicio (se llama tras cada sincronización). */
export function actualizarWidgets(snapshot: Snapshot) {
  for (const nombre of Object.values(WIDGETS)) {
    requestWidgetUpdate({
      widgetName: nombre,
      renderWidget: (info) => dibujar(nombre, snapshot, info.height),
    }).catch(() => {
      // Sin widgets puestos, o en Expo Go: no pasa nada
    });
  }
}
