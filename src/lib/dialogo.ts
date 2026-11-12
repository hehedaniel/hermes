import { Alert, Platform } from 'react-native';

/**
 * Diálogos de Hermes. Se dibujan con el modal propio (`DialogoModal`, montado en el layout
 * raíz), igual que los avisos de actualización y de novedades. Si todavía no hay modal
 * montado se usan los del sistema: en la web los del navegador, porque allí Alert.alert de
 * React Native no hace nada.
 */
export type TipoAviso = 'info' | 'error' | 'ok';

export type DialogoPedido =
  | { clase: 'aviso'; titulo: string; texto: string; tipo: TipoAviso }
  | {
      clase: 'confirmar';
      titulo: string;
      texto: string;
      boton: string;
      destructivo: boolean;
      onOk: () => void;
    };

let manejador: ((d: DialogoPedido) => void) | null = null;

/** Lo llama el modal al montarse; devuelve la función para quitarse al desmontarse. */
export function registrarDialogo(fn: (d: DialogoPedido) => void) {
  manejador = fn;
  return () => {
    if (manejador === fn) manejador = null;
  };
}

export function confirmar(opc: {
  titulo: string;
  texto: string;
  boton: string;
  destructivo?: boolean;
  onOk: () => void;
}) {
  if (manejador) {
    manejador({ clase: 'confirmar', ...opc, destructivo: !!opc.destructivo });
    return;
  }
  if (Platform.OS === 'web') {
    if (window.confirm(`${opc.titulo}\n\n${opc.texto}`)) opc.onOk();
    return;
  }
  Alert.alert(opc.titulo, opc.texto, [
    { text: 'Cancelar', style: 'cancel' },
    { text: opc.boton, style: opc.destructivo ? 'destructive' : 'default', onPress: opc.onOk },
  ]);
}

/** Por defecto, un título que empieza por «No se pudo» se enseña como error. */
export function avisar(titulo: string, texto: string, tipo?: TipoAviso) {
  const t: TipoAviso = tipo ?? (/^No se pudo/i.test(titulo) ? 'error' : 'info');
  if (manejador) {
    manejador({ clase: 'aviso', titulo, texto, tipo: t });
    return;
  }
  if (Platform.OS === 'web') window.alert(`${titulo}\n\n${texto}`);
  else Alert.alert(titulo, texto);
}
