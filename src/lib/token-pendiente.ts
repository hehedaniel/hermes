/**
 * Token que llega por el enlace moodlemobile://token=… al iniciar sesión desde el móvil.
 * +native-intent lo deja aquí y la pantalla de Ajustes lo recoge y conecta.
 */
let pendiente: string | null = null;
const oyentes = new Set<() => void>();

export function setTokenPendiente(raw: string) {
  pendiente = raw;
  oyentes.forEach((f) => f());
}

export function tomarTokenPendiente() {
  const t = pendiente;
  pendiente = null;
  return t;
}

export function onTokenPendiente(f: () => void) {
  oyentes.add(f);
  return () => {
    oyentes.delete(f);
  };
}
