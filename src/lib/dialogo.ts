import { Alert, Platform } from 'react-native';

/**
 * Diálogos que también funcionan en la web: allí Alert.alert de React Native no hace nada,
 * así que se usan los del navegador.
 */
export function confirmar(opc: {
  titulo: string;
  texto: string;
  boton: string;
  destructivo?: boolean;
  onOk: () => void;
}) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${opc.titulo}\n\n${opc.texto}`)) opc.onOk();
    return;
  }
  Alert.alert(opc.titulo, opc.texto, [
    { text: 'Cancelar', style: 'cancel' },
    { text: opc.boton, style: opc.destructivo ? 'destructive' : 'default', onPress: opc.onOk },
  ]);
}

export function avisar(titulo: string, texto: string) {
  if (Platform.OS === 'web') window.alert(`${titulo}\n\n${texto}`);
  else Alert.alert(titulo, texto);
}
