import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Campo, FilaAjuste, Interruptor } from '@/components/ajustes-ui';
import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { confirmar } from '@/lib/dialogo';
import { useGoogleCal } from '@/lib/google-cal';

/** Sección de Ajustes para conectar tu Google Calendar (vía el Apps Script). */
export function GoogleCalSettings() {
  const theme = useTheme();
  const { url, guardarUrl, quitar } = useGoogleCal();
  const [texto, setTexto] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function guardar(valor: string) {
    setBusy(true);
    setMsg(null);
    try {
      const n = await guardarUrl(valor);
      setTexto('');
      setMsg({ ok: true, text: `Conectado: ${n} eventos en las próximas semanas.` });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const [abierto, setAbierto] = useState(false);

  return (
    <View>
      <FilaAjuste
        icono="calendar"
        titulo="Google Calendar"
        texto={url ? 'Conectado · solo lectura' : 'Tus eventos junto a las entregas y el horario'}
        sinRegla={abierto && !url}
        derecha={
          url ? (
            <Interruptor
              value
              onValueChange={() =>
                confirmar({
                  titulo: 'Google Calendar',
                  texto: '¿Dejar de mostrar tus eventos de Google?',
                  boton: 'Desconectar',
                  destructivo: true,
                  onOk: () => quitar(),
                })
              }
            />
          ) : (
            <Interruptor value={abierto} onValueChange={setAbierto} />
          )
        }
      />
      {!url && abierto ? (
        <View style={[styles.form, { borderBottomColor: theme.line }]}>
          <ThemedText type="meta" themeColor="ink2">
            Pega el enlace que da la función crearClaveApp del script de Google (ver
            google-apps-script/README.md).
          </ThemedText>
          <Campo
            value={texto}
            onChangeText={setTexto}
            placeholder="https://script.google.com/macros/s/…/exec?key=…"
            autoCapitalize="none"
            autoCorrect={false}
            multiline
          />
          <View style={styles.row}>
            <View style={styles.flex}>
              <Button
                title="Pegar"
                variant="secondary"
                icono="clipboard"
                compacto
                onPress={async () => setTexto((await Clipboard.getStringAsync()).trim())}
              />
            </View>
            <View style={styles.flex}>
              <Button
                title="Conectar"
                compacto
                onPress={() => guardar(texto)}
                loading={busy}
                disabled={!texto.trim()}
              />
            </View>
          </View>
        </View>
      ) : null}
      {msg ? (
        <ThemedText type="small" style={[styles.msg, { color: msg.ok ? theme.stDone : theme.urgent }]}>
          {msg.text}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 8, paddingBottom: 14, borderBottomWidth: 1 },
  row: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
  msg: { paddingVertical: 8 },
});
