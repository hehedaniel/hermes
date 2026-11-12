/**
 * Avisos y confirmaciones de Hermes con el mismo aspecto que el aviso de actualización y las
 * novedades. Se monta una sola vez en el layout raíz; `avisar` y `confirmar` (lib/dialogo)
 * le mandan los diálogos y, si llegan varios seguidos, se enseñan uno tras otro.
 */
import Feather from '@expo/vector-icons/Feather';
import { useCallback, useEffect, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { type DialogoPedido, registrarDialogo } from '@/lib/dialogo';

export function DialogoModal() {
  const theme = useTheme();
  const [cola, setCola] = useState<DialogoPedido[]>([]);

  useEffect(() => registrarDialogo((d) => setCola((c) => [...c, d])), []);

  const actual = cola[0];
  const cerrar = useCallback(() => setCola((c) => c.slice(1)), []);

  const error = actual?.clase === 'aviso' && actual.tipo === 'error';
  const ok = actual?.clase === 'aviso' && actual.tipo === 'ok';
  const destructivo = actual?.clase === 'confirmar' && actual.destructivo;
  const alerta = error || destructivo;
  const icono = error
    ? 'alert-circle'
    : destructivo
      ? 'alert-triangle'
      : ok
        ? 'check-circle'
        : actual?.clase === 'confirmar'
          ? 'help-circle'
          : 'info';

  return (
    <Modal transparent animationType="fade" visible={!!actual} onRequestClose={cerrar}>
      <View style={styles.overlay}>
        {actual ? (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
            <View
              style={[
                styles.icono,
                { backgroundColor: alerta ? theme.urgentWash : theme.brandWash },
              ]}>
              <Feather name={icono} size={23} color={alerta ? theme.urgent : theme.brand} />
            </View>
            <ThemedText type="heading">{actual.titulo}</ThemedText>
            <ThemedText type="small" themeColor="ink2" selectable>
              {actual.texto}
            </ThemedText>
            <View style={styles.acciones}>
              {actual.clase === 'confirmar' ? (
                <>
                  <Button title="Cancelar" variant="secondary" onPress={cerrar} />
                  <Button
                    title={actual.boton}
                    variant={actual.destructivo ? 'danger' : 'primary'}
                    onPress={() => {
                      cerrar();
                      actual.onOk();
                    }}
                  />
                </>
              ) : (
                <Button title="Entendido" onPress={cerrar} />
              )}
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.48)',
  },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 22,
    gap: 14,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  icono: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acciones: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
});
