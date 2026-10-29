import { registerWidgetTaskHandler, type WidgetTaskHandler } from 'react-native-android-widget';

import { cargarHorarioGuardado } from '@/lib/horario-remoto';
import { dibujar, leerPaletasWidget, leerSnapshot } from './render';

/** Android pide redibujar el widget al añadirlo, al cambiarlo de tamaño y cada 30 min. */
const handler: WidgetTaskHandler = async ({ widgetInfo, widgetAction, renderWidget }) => {
  if (widgetAction === 'WIDGET_DELETED') return;
  const [snapshot, paletas] = await Promise.all([
    leerSnapshot(),
    leerPaletasWidget(),
    cargarHorarioGuardado(),
  ]);
  renderWidget(
    dibujar(
      widgetInfo.widgetName,
      snapshot,
      { ancho: widgetInfo.width, alto: widgetInfo.height },
      paletas,
    ),
  );
};

export function registrarWidgets() {
  registerWidgetTaskHandler(handler);
}
