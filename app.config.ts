import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Variantes de la app:
 *  - normal (preview/production): "Hermes", es.danihermoso.campus
 *  - desarrollo (APP_VARIANT=development): "Hermes Dev", es.danihermoso.campus.dev
 * Así la versión de desarrollo se instala al lado de la normal en vez de sustituirla.
 */
const IS_DEV = process.env.APP_VARIANT === 'development';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: IS_DEV ? 'Hermes Dev' : (config.name ?? 'Hermes'),
  slug: config.slug ?? 'campus',
  scheme: IS_DEV ? ['hermes-dev', 'moodlemobile'] : config.scheme,
  android: {
    ...config.android,
    package: IS_DEV ? 'es.danihermoso.campus.dev' : config.android?.package,
  },
});
