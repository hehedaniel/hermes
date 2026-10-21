import * as Clipboard from 'expo-clipboard';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { GoogleCalSettings } from '@/components/google-cal-settings';
import { Screen, SectionTitle } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { confirmar } from '@/lib/dialogo';
import { formatoTamano, useDownloads } from '@/lib/downloads';
import { haceCuanto } from '@/lib/format';
import { launchUrl, MoodleError, normalizeUrl } from '@/lib/moodle';
import { useMoodle } from '@/lib/store';
import { onTokenPendiente, tomarTokenPendiente } from '@/lib/token-pendiente';

// El login automático necesita recibir enlaces moodlemobile://: solo funciona en el APK (no en Expo Go ni en web)
const loginMovil =
  Platform.OS !== 'web' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
const esWeb = Platform.OS === 'web';

export default function AjustesScreen() {
  const { client, snapshot, moodleUrl, connect, disconnect, refresh, syncing } = useMoodle();
  const theme = useTheme();
  const { guardaArchivos, resumen, borrarTodo } = useDownloads();
  const [url, setUrl] = useState(moodleUrl);
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const inputStyle = [
    styles.input,
    {
      color: theme.text,
      backgroundColor: theme.backgroundElement,
      borderColor: theme.border,
    },
  ];

  async function onConnect(tokenInput: string = token) {
    setBusy(true);
    setMsg(null);
    try {
      const site = await connect(url, tokenInput);
      setToken('');
      setUrl(normalizeUrl(url));
      setMsg({ ok: true, text: `Conectado como ${site.fullname}.` });
    } catch (e) {
      const err = e as MoodleError;
      setMsg({
        ok: false,
        text:
          err.code === 'invalidtoken'
            ? 'Moodle dice que ese token no es válido.'
            : (err.message ?? String(e)),
      });
    } finally {
      setBusy(false);
    }
  }

  // Token que llega solo al iniciar sesión desde el móvil (enlace moodlemobile://)
  const conectarRef = useRef(onConnect);
  useEffect(() => {
    conectarRef.current = onConnect;
  });
  useEffect(() => {
    const comprobar = () => {
      const t = tomarTokenPendiente();
      if (t) conectarRef.current(t);
    };
    Promise.resolve().then(comprobar);
    return onTokenPendiente(comprobar);
  }, []);

  function onLoginMovil() {
    WebBrowser.openBrowserAsync(launchUrl(normalizeUrl(url)));
  }

  async function onPaste() {
    const text = await Clipboard.getStringAsync();
    if (text) setToken(text.trim());
  }

  async function onCopiarLogin() {
    await Clipboard.setStringAsync(launchUrl(normalizeUrl(url)));
    setMsg({ ok: true, text: 'Enlace del login copiado.' });
  }

  function onDisconnect() {
    confirmar({
      titulo: 'Desconectar',
      texto: guardaArchivos
        ? 'Se borrará el token, los datos y los archivos descargados en el móvil.'
        : 'Se borrará el token y los datos guardados en este navegador.',
      boton: 'Desconectar',
      destructivo: true,
      onOk: async () => {
        await borrarTodo();
        await disconnect();
      },
    });
  }

  return (
    <Screen title="Ajustes" refreshable={false}>
      {client && snapshot ? (
        <>
          <SectionTitle>Cuenta</SectionTitle>
          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold">{snapshot.site.fullname}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {snapshot.site.sitename}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {snapshot.courses.length} cursos · {snapshot.entregas.length} entregas · actualizado{' '}
              {haceCuanto(snapshot.syncedAt)}
            </ThemedText>
          </View>
          <Button title="Sincronizar ahora" onPress={refresh} loading={syncing} />
          <Button title="Desconectar" variant="danger" onPress={onDisconnect} />

          {guardaArchivos ? (
            <>
              <SectionTitle>Archivos descargados</SectionTitle>
              <ThemedText type="small" themeColor="textSecondary">
                {resumen.archivos
                  ? `${resumen.archivos} archivos ocupan ${formatoTamano(resumen.bytes)} en el móvil.`
                  : 'Todavía no has descargado ningún archivo.'}
              </ThemedText>
              {resumen.archivos ? (
                <Button
                  title="Borrar todas las descargas"
                  variant="secondary"
                  onPress={() =>
                    confirmar({
                      titulo: 'Borrar descargas',
                      texto: 'Se borrarán del móvil (puedes volver a descargarlos).',
                      boton: 'Borrar',
                      destructivo: true,
                      onOk: () => borrarTodo(),
                    })
                  }
                />
              ) : null}
            </>
          ) : null}
        </>
      ) : null}

      <SectionTitle>{client ? 'Cambiar token' : 'Conectar con Moodle'}</SectionTitle>
      {loginMovil ? (
        <>
          <Button title="Iniciar sesión en Moodle" onPress={onLoginMovil} loading={busy} />
          <ThemedText type="small" themeColor="textSecondary">
            Se abre el login de la Junta; al terminar vuelves a Hermes ya conectado. Si el móvil
            pregunta con qué app abrir el enlace, elige Hermes. También puedes pegar el token a
            mano:
          </ThemedText>
        </>
      ) : null}
      <ThemedText type="small" themeColor="textSecondary">
        Dirección de tu Moodle
      </ThemedText>
      <TextInput
        value={url}
        onChangeText={setUrl}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        style={inputStyle}
      />
      <ThemedText type="small" themeColor="textSecondary">
        Token
      </ThemedText>
      <TextInput
        value={token}
        onChangeText={setToken}
        placeholder="moodlemobile://token=…  o el token de .env"
        placeholderTextColor={theme.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        multiline
        style={[inputStyle, styles.tokenInput]}
      />
      <View style={styles.row}>
        <View style={styles.flex}>
          <Button title="Pegar" variant="secondary" onPress={onPaste} />
        </View>
        <View style={styles.flex}>
          <Button
            title="Conectar"
            onPress={() => onConnect()}
            loading={busy}
            disabled={!token.trim()}
          />
        </View>
      </View>
      {msg ? (
        <ThemedText type="small" style={{ color: msg.ok ? theme.entregada : theme.vencida }}>
          {msg.text}
        </ThemedText>
      ) : null}

      <GoogleCalSettings />

      {esWeb ? (
        <>
          <SectionTitle>¿Cómo consigo el token?</SectionTitle>
          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="small">
              Desde el navegador no se puede iniciar sesión directamente, así que la primera vez
              hace falta un ordenador:
            </ThemedText>
            <ThemedText type="small">
              1. En el ordenador, abre esta misma página:{' '}
              <ThemedText type="code">{paginaActual()}</ThemedText>
            </ThemedText>
            <ThemedText type="small">
              2. Abre una pestaña nueva en Chrome o Edge, pulsa{' '}
              <ThemedText type="code">F12</ThemedText> y ve a la pestaña{' '}
              <ThemedText type="smallBold">Consola</ThemedText>.
            </ThemedText>
            <ThemedText type="small">
              3. Pulsa el botón de abajo para copiar el enlace del login, pégalo en esa pestaña y
              entra con tu usuario de la Junta. Al terminar, la página no hace nada: es normal.
            </ThemedText>
            <ThemedText type="small">
              4. En la Consola sale una línea roja con{' '}
              <ThemedText type="code">moodlemobile://token=…</ThemedText>. Cópiala entera y pégala
              arriba, en Token. Para usarlo en el iPhone, envíatela (por WhatsApp a ti mismo, por
              ejemplo) y pégala allí.
            </ThemedText>
            <Button title="Copiar enlace del login" variant="secondary" onPress={onCopiarLogin} />
            <ThemedText type="small" themeColor="textSecondary">
              No compartas el token: da acceso a tu Moodle. Se guarda solo en este navegador.
            </ThemedText>
          </View>
        </>
      ) : (
        <>
          <SectionTitle>¿De dónde saco el token?</SectionTitle>
          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="small">
              • Si ya usas el sincronizador del PC: abre{' '}
              <ThemedText type="code">_moodle\.env</ThemedText> y copia el valor de{' '}
              <ThemedText type="code">MOODLE_TOKEN</ThemedText>.
            </ThemedText>
            <ThemedText type="small">
              • Si no: en el PC ejecuta <ThemedText type="code">login.bat</ThemedText> del
              sincronizador, inicia sesión, pulsa F12 → Consola → F5 y copia el texto{' '}
              <ThemedText type="code">moodlemobile://token=…</ThemedText>.
            </ThemedText>
            <ThemedText type="small">
              • Pásatelo al móvil (por ejemplo, enviándotelo a ti mismo) y pégalo aquí. Se guarda
              cifrado en el móvil.
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              No compartas el token: da acceso a tu Moodle.
            </ThemedText>
          </View>
        </>
      )}
    </Screen>
  );
}

/** Dirección de la web sin la pantalla actual (p. ej. https://usuario.github.io/hermes). */
function paginaActual() {
  if (typeof window === 'undefined') return '';
  return window.location.href.replace(/\/ajustes\/?$/, '').replace(/\/$/, '');
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, padding: Spacing.three, gap: Spacing.two },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  tokenInput: { minHeight: 70, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
});
