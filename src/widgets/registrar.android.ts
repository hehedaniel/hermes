import { registerWidgetTaskHandler, type WidgetTaskHandler } from 'react-native-android-widget';

import { dibujar, leerSnapshot } from './render';

/** Android pide redibujar el widget al añadirlo, al cambiarlo de tamaño y cada 30 min. */
const handler: WidgetTaskHandler = async ({ widgetInfo, widgetAction, renderWidget }) => {
  if (widgetAction === 'WIDGET_DELETED') return;
  const snapshot = await leerSnapshot();
  renderWidget(
    dibujar(widgetInfo.widgetName, snapshot, { ancho: widgetInfo.width, alto: widgetInfo.height }),
  );
};

export function registrarWidgets() {
  registerWidgetTaskHandler(handler);
}
