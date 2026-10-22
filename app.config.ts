import type { ConfigContext, ExpoConfig } from 'expo/config';
import type { WithAndroidWidgetsParams } from 'react-native-android-widget';

/**
 * Variantes de la app:
 *  - normal (preview/production): "Hermes", es.danihermoso.campus
 *  - desarrollo (APP_VARIANT=development): "Hermes Dev", es.danihermoso.campus.dev
 * Así la versión de desarrollo se instala al lado de la normal en vez de sustituirla.
 */
const IS_DEV = process.env.APP_VARIANT === 'development';
/** Ruta de la versión web cuando no está en la raíz del dominio (GitHub Pages: "/hermes"). */
const BASE_URL = process.env.EXPO_BASE_URL;

/** Widgets de la pantalla de inicio (Android). Se dibujan en src/widgets. */
const widgets: WithAndroidWidgetsParams = {
  widgets: [
    {
      name: 'Entregas',
      label: 'Próximas entregas',
      description: 'Lo próximo que tienes que entregar y cuánto falta',
      minWidth: '250dp',
      minHeight: '110dp',
      targetCellWidth: 4,
      targetCellHeight: 2,
      resizeMode: 'horizontal|vertical',
      previewImage: './assets/widget-preview/entregas.png',
      updatePeriodMillis: 1800000, // cada 30 min, para que "en 5 h" no se quede viejo
    },
    {
      name: 'Clases',
      label: 'Clases de hoy',
      description: 'Las clases del día con su hora y profesor',
      minWidth: '250dp',
      minHeight: '110dp',
      targetCellWidth: 4,
      targetCellHeight: 2,
      resizeMode: 'horizontal|vertical',
      previewImage: './assets/widget-preview/clases.png',
      updatePeriodMillis: 1800000, // cada 30 min, para marcar la clase que toca "AHORA"
    },
  ],
};

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: IS_DEV ? 'Hermes Dev' : (config.name ?? 'Hermes'),
  slug: config.slug ?? 'campus',
  scheme: IS_DEV ? ['hermes-dev', 'moodlemobile'] : config.scheme,
  android: {
    ...config.android,
    package: IS_DEV ? 'es.danihermoso.campus.dev' : config.android?.package,
  },
  plugins: [
    ...(config.plugins ?? []),
    ['react-native-android-widget', widgets],
    [
      'expo-notifications',
      {
        icon: './assets/images/notification-icon.png',
        color: '#1F6FEB',
        defaultChannel: 'novedades',
      },
    ],
    'expo-background-task',
  ],
  experiments: {
    ...config.experiments,
    ...(BASE_URL ? { baseUrl: BASE_URL } : {}),
  },
});
