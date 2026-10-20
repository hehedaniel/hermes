import { setTokenPendiente } from '@/lib/token-pendiente';

/**
 * Enlaces que abren la app desde fuera. Al iniciar sesión en Moodle desde el móvil,
 * Moodle redirige a moodlemobile://token=…: guardamos el token y vamos a Ajustes.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    const m = path.match(/token=([A-Za-z0-9+/=_%-]+)/);
    if (path.startsWith('moodlemobile') || m) {
      if (m) setTokenPendiente(`moodlemobile://token=${m[1]}`);
      return '/ajustes';
    }
    return path;
  } catch {
    return '/';
  }
}
