/** En la web no hay segundo plano: misma interfaz que segundo-plano.ts. */
export const TAREA_SEGUNDO_PLANO = 'hermes-sincronizar';
export async function activarSegundoPlano() {}
export async function desactivarSegundoPlano() {}
export async function pasadaSegundoPlano(): Promise<number | null> {
  return null;
}
