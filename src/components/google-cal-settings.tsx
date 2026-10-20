import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { SectionTitle } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
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

  return (
    <>
      <SectionTitle>Google Calendar</SectionTitle>
      {url ? (
        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="small">
            ✓ Tus calendarios de Google salen en la pestaña Calendario.
          </ThemedText>
          <Button
            title="Desconectar Google Calendar"
            variant="secondary"
            onPress={() =>
              Alert.alert('Google Calendar', '¿Dejar de mostrar tus eventos de Google?', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Desconectar', style: 'destructive', onPress: () => quitar() },
              ])
            }
          />
        </View>
      ) : (
        <>
          <ThemedText type="small" themeColor="textSecondary">
            Pega el enlace que da la función crearClaveApp del script de Google (ver
            google-apps-script/README.md).
          </ThemedText>
          <TextInput
            value={texto}
            onChangeText={setTexto}
            placeholder="https://script.google.com/macros/s/…/exec?key=…"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            multiline
            style={[
              styles.input,
              {
                color: theme.text,
                backgroundColor: theme.backgroundElement,
                borderColor: theme.border,
              },
            ]}
          />
          <View style={styles.row}>
            <View style={styles.flex}>
              <Button
                title="Pegar"
                variant="secondary"
                onPress={async () => setTexto((await Clipboard.getStringAsync()).trim())}
              />
            </View>
            <View style={styles.flex}>
              <Button
                title="Conectar"
                onPress={() => guardar(texto)}
                loading={busy}
                disabled={!texto.trim()}
              />
            </View>
          </View>
        </>
      )}
      {msg ? (
        <ThemedText type="small" style={{ color: msg.ok ? theme.entregada : theme.vencida }}>
          {msg.text}
        </ThemedText>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, padding: Spacing.three, gap: Spacing.two },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 64,
    textAlignVertical: 'top',
  },
  row: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
});
