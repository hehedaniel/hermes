import * as Clipboard from 'expo-clipboard';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { Campo, Etiqueta, FilaAjuste } from '@/components/ajustes-ui';
import { Caja, Marca, Seccion } from '@/components/anden';
import { AvisosSettings } from '@/components/avisos-settings';
import { Button } from '@/components/button';
import { GoogleCalSettings } from '@/components/google-cal-settings';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { VERSION } from '@/constants/version';
import { useTheme } from '@/hooks/use-theme';
import { confirmar } from '@/lib/dialogo';
import { formatoTamano, useDownloads } from '@/lib/downloads';
import { haceCuanto } from '@/lib/format';
import { leerConfigIA } from '@/lib/ia/config';
import { PROVEEDORES } from '@/lib/ia/proveedores';
import { launchUrl, MoodleError, normalizeUrl } from '@/lib/moodle';
import { useMoodle } from '@/lib/store';
import { onTokenPendiente, tomarTokenPendiente } from '@/lib/token-pendiente';

// El login automático necesita recibir enlaces moodlemobile://: solo funciona en el APK (no en Expo Go ni en web)
const loginMovil =
  Platform.OS !== 'web' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
const esWeb = Platform.OS === 'web';
const CAMBIOS_URL = 'https://github.com/hehedaniel/hermes/blob/main/CHANGELOG.md';

export default function AjustesScreen() {
  const { client, snapshot, moodleUrl, connect, disconnect, refresh, syncing } = useMoodle();
  const theme = useTheme();
  const { guardaArchivos, resumen, borrarTodo } = useDownloads();
  const [url, setUrl] = useState(moodleUrl);
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [verConexion, setVerConexion] = useState(false);
  const [nombreIA, setNombreIA] = useState<string>();

  // Al volver de Ajustes > IA, se ve el proveedor elegido
  useFocusEffect(
    useCallback(() => {
      leerConfigIA().then((c) => setNombreIA(PROVEEDORES[c.proveedor].nombre));
    }, []),
  );

  async function onConnect(tokenInput: string = token) {
    setBusy(true);
    setMsg(null);
    try {
      const site = await connect(url, tokenInput);
      setToken('');
      setVerConexion(false);
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

  const sitio = snapshot?.site;
  return (
    <Screen
      title="Ajustes"
      etiqueta="Cuenta y app"
      derecha={VERSION}
      refreshable={false}>
      {client && snapshot ? (
        <View>
          <FilaAjuste
            icono="cloud"
            titulo="Cuenta de Moodle"
            texto={`Conectada · ${sitio?.fullname ?? ''} · ${sitio?.sitename ?? ''}`}
            derecha={<Marca texto="✓ Activa" color={theme.stDone} fondo={theme.stDoneW} />}
          />
          <FilaAjuste
            icono="refresh-cw"
            titulo="Sincronizar ahora"
            texto={`Última vez ${haceCuanto(snapshot.syncedAt)} · ${snapshot.courses.length} asignaturas`}
            derecha={
              <Button title="Sincronizar" variant="secondary" compacto onPress={refresh} loading={syncing} />
            }
          />
          {guardaArchivos ? (
            <FilaAjuste
              icono="hard-drive"
              titulo="Archivos descargados"
              texto={
                resumen.archivos
                  ? `${resumen.archivos} archivos · ${formatoTamano(resumen.bytes)}`
                  : 'Todavía no has descargado ninguno'
              }
              derecha={
                resumen.archivos ? (
                  <Button
                    title="Borrar"
                    variant="ghost"
                    compacto
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
                ) : undefined
              }
            />
          ) : null}
          <GoogleCalSettings />
        </View>
      ) : null}

      {client ? <AvisosSettings /> : null}

      <View>
        <Seccion titulo="Inteligencia artificial" derecha={nombreIA} sinRegla />
        <FilaAjuste
          icono="star"
          titulo="Elegir proveedor y modelo"
          texto="La IA de cada tarea usa el proveedor elegido, con tu propia clave."
          chevron
          onPress={() => router.push('/ajustes-ia')}
        />
      </View>

      <View>
        <Seccion titulo={client ? 'Sesión' : 'Conectar con Moodle'} sinRegla />
        {client && !verConexion ? (
          <>
            <FilaAjuste
              icono="key"
              titulo="Cambiar de cuenta o de token"
              chevron
              onPress={() => setVerConexion(true)}
            />
            <FilaAjuste
              icono="log-out"
              titulo="Desconectar"
              texto={
                guardaArchivos
                  ? 'Borra el token, los datos y las descargas del móvil'
                  : 'Borra el token y los datos de este navegador'
              }
              tituloColor={theme.urgent}
              onPress={onDisconnect}
              sinRegla
            />
          </>
        ) : (
          <View style={styles.conexion}>
            {loginMovil ? (
              <>
                <Button
                  title="Iniciar sesión en Moodle"
                  icono="log-in"
                  onPress={onLoginMovil}
                  loading={busy}
                />
                <ThemedText type="meta" themeColor="ink2">
                  Se abre el login de la Junta; al terminar vuelves a Hermes ya conectado. Si el
                  móvil pregunta con qué app abrir el enlace, elige Hermes. También puedes pegar el
                  token a mano:
                </ThemedText>
              </>
            ) : null}
            <Etiqueta>Dirección de tu Moodle</Etiqueta>
            <Campo
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <Etiqueta>Token</Etiqueta>
            <Campo
              value={token}
              onChangeText={setToken}
              placeholder="moodlemobile://token=…  o el token de .env"
              autoCapitalize="none"
              autoCorrect={false}
              multiline
              style={styles.token}
            />
            <View style={styles.row}>
              <View style={styles.flex}>
                <Button title="Pegar" variant="secondary" icono="clipboard" onPress={onPaste} />
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
            {client ? (
              <Button title="Cancelar" variant="ghost" compacto onPress={() => setVerConexion(false)} />
            ) : null}
          </View>
        )}
        {msg ? (
          <ThemedText type="small" style={[styles.msg, { color: msg.ok ? theme.stDone : theme.urgent }]}>
            {msg.text}
          </ThemedText>
        ) : null}
      </View>

      {!client || verConexion ? (
        <View>
          <Seccion
            titulo={esWeb ? '¿Cómo consigo el token?' : '¿De dónde saco el token?'}
            sinRegla
          />
          {esWeb ? (
            <Caja>
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
              <Button
                title="Copiar enlace del login"
                variant="secondary"
                icono="copy"
                compacto
                onPress={onCopiarLogin}
              />
              <ThemedText type="meta" themeColor="ink2">
                No compartas el token: da acceso a tu Moodle. Se guarda solo en este navegador.
              </ThemedText>
            </Caja>
          ) : (
            <Caja>
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
              <ThemedText type="meta" themeColor="ink2">
                No compartas el token: da acceso a tu Moodle.
              </ThemedText>
            </Caja>
          )}
        </View>
      ) : null}

      <Pressable onPress={() => WebBrowser.openBrowserAsync(CAMBIOS_URL)} style={styles.version}>
        <ThemedText type="meta" themeColor="ink3">
          Hermes {VERSION} · Ver cambios
        </ThemedText>
      </Pressable>
    </Screen>
  );
}

/** Dirección de la web sin la pantalla actual (p. ej. https://usuario.github.io/hermes). */
function paginaActual() {
  if (typeof window === 'undefined') return '';
  return window.location.href.replace(/\/ajustes\/?$/, '').replace(/\/$/, '');
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: Spacing.two },
  conexion: { gap: 8, paddingTop: 4 },
  token: { minHeight: 70 },
  msg: { marginTop: 8 },
  version: { alignItems: 'center', marginTop: Spacing.three, paddingVertical: 8 },
});
