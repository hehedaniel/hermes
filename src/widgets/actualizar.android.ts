import { requestWidgetUpdate } from 'react-native-android-widget';

import type { Snapshot } from '@/lib/data';
import { cargarHorarioGuardado } from '@/lib/horario-remoto';

import { dibujar, leerPaletasWidget, WIDGETS } from './render';

/** Redibuja los widgets que haya en la pantalla de inicio (se llama tras cada sincronización). */
export function actualizarWidgets(snapshot: Snapshot) {
  void Promise.all([leerPaletasWidget(), cargarHorarioGuardado()])
    .then(([paletas]) => {
      for (const nombre of Object.values(WIDGETS)) {
        requestWidgetUpdate({
          widgetName: nombre,
          renderWidget: (info) =>
            dibujar(nombre, snapshot, { ancho: info.width, alto: info.height }, paletas),
        }).catch(() => {
          // Sin widgets puestos, o en Expo Go: no pasa nada
        });
      }
    })
    .catch((error: unknown) => {
      console.error('No se pudieron leer las preferencias de apariencia para los widgets.', error);
    });
}
