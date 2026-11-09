/** Conectar con Moodle en el diseño Obsidiana: lo primero que ve quien instala Hermes. */
import Feather from '@expo/vector-icons/Feather';
import * as Clipboard from 'expo-clipboard';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, TextInput, View } from 'react-native';

import { Etiqueta, O, T, Tarjeta, useArriba, usePadX } from '@/components/obs';
import { VERSION } from '@/constants/version';
import { launchUrl, MoodleError, normalizeUrl } from '@/lib/moodle';
import { useMoodle } from '@/lib/store';
import { onTokenPendiente, tomarTokenPendiente } from '@/lib/token-pendiente';

// El login automático necesita recibir enlaces moodlemobile://: solo funciona en el APK
const loginMovil =
  Platform.OS !== 'web' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
const esWeb = Platform.OS === 'web';

function paginaActual() {
  if (typeof window === 'undefined') return '';
  return window.location.href.replace(/\/ajustes\/?$/, '').replace(/\/$/, '');
}

function Boton({
  texto,
  onPress,
  principal,
  disabled,
  cargando,
}: {
  texto: string;
  onPress: () => void;
  principal?: boolean;
  disabled?: boolean;
  cargando?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || cargando}
      style={{
        paddingVertical: 13,
        paddingHorizontal: 18,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        backgroundColor: principal ? O.lime : O.card2,
        borderColor: principal ? O.lime : O.line2,
        opacity: disabled || cargando ? 0.5 : 1,
      }}>
      <T w={600} s={14} c={principal ? '#0A0A0C' : O.text}>
        {cargando ? 'Conectando…' : texto}
      </T>
    </Pressable>
  );
}

function Campo({
  valor,
  cambiar,
  placeholder,
  multilinea,
}: {
  valor: string;
  cambiar: (t: string) => void;
  placeholder?: string;
  multilinea?: boolean;
}) {
  return (
    <TextInput
      value={valor}
      onChangeText={cambiar}
      placeholder={placeholder}
      placeholderTextColor={O.t4}
      autoCapitalize="none"
      autoCorrect={false}
      multiline={multilinea}
      style={{
        color: O.text,
        backgroundColor: O.card2,
        borderColor: O.line2,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
        minHeight: multilinea ? 84 : undefined,
        textAlignVertical: multilinea ? 'top' : undefined,
      }}
    />
  );
}

export function ConectarObsidiana() {
  const padX = usePadX();
  const arriba = useArriba();
  const { moodleUrl, connect } = useMoodle();
  const [url, setUrl] = useState(moodleUrl);
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

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
      if (t) void conectarRef.current(t);
    };
    Promise.resolve().then(comprobar);
    return onTokenPendiente(comprobar);
  }, []);

  async function pegar() {
    const text = await Clipboard.getStringAsync();
    if (text) setToken(text.trim());
  }
  async function copiarLogin() {
    await Clipboard.setStringAsync(launchUrl(normalizeUrl(url)));
    setMsg({ ok: true, text: 'Enlace del login copiado.' });
  }

  const nota = (t: string) => (
    <T s={13} lh={20} c={O.t2}>
      {t}
    </T>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: O.bg }}
      contentContainerStyle={{
        paddingHorizontal: padX,
        paddingTop: 32 + arriba,
        paddingBottom: 40,
      }}>
      <View style={{ width: '100%', maxWidth: 640, alignSelf: 'center', gap: 24 }}>
        <View>
          <Etiqueta s={10.5} ls={0.25} c="#686875" style={{ marginBottom: 4 }}>
            Cuenta y app
          </Etiqueta>
          <T k="serif" s={40} lh={48} c={O.white} ls={-0.025}>
            Conectar con Moodle
          </T>
        </View>

        <Tarjeta radius={14} style={{ padding: 20, gap: 14 }}>
          {loginMovil ? (
            <>
              <Boton
                principal
                texto="Iniciar sesión en Moodle"
                cargando={busy}
                onPress={() => void WebBrowser.openBrowserAsync(launchUrl(normalizeUrl(url)))}
              />
              {nota(
                'Se abre el login de la Junta; al terminar vuelves a Hermes ya conectado. Si el móvil pregunta con qué app abrir el enlace, elige Hermes. También puedes pegar el token a mano:',
              )}
            </>
          ) : null}
          <Etiqueta>Dirección de tu Moodle</Etiqueta>
          <Campo valor={url} cambiar={setUrl} />
          <Etiqueta>Token</Etiqueta>
          <Campo
            valor={token}
            cambiar={setToken}
            placeholder="moodlemobile://token=…  o el token de .env"
            multilinea
          />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Boton texto="Pegar" onPress={() => void pegar()} />
            </View>
            <View style={{ flex: 1 }}>
              <Boton
                principal
                texto="Conectar"
                cargando={busy}
                disabled={!token.trim()}
                onPress={() => void onConnect()}
              />
            </View>
          </View>
          {msg ? (
            <T s={13} lh={19} c={msg.ok ? O.green : O.red}>
              {msg.text}
            </T>
          ) : null}
        </Tarjeta>

        <Tarjeta radius={14} style={{ padding: 20, gap: 12 }}>
          <T k="serif" s={20} lh={26} c={O.white}>
            {esWeb ? '¿Cómo consigo el token?' : '¿De dónde saco el token?'}
          </T>
          {esWeb ? (
            <>
              {nota(
                'Desde el navegador no se puede iniciar sesión directamente, así que la primera vez hace falta un ordenador:',
              )}
              {nota(`1. En el ordenador, abre esta misma página: ${paginaActual()}`)}
              {nota(
                '2. Abre una pestaña nueva en Chrome o Edge, pulsa F12 y ve a la pestaña Consola.',
              )}
              {nota(
                '3. Pulsa el botón de abajo para copiar el enlace del login, pégalo en esa pestaña y entra con tu usuario de la Junta. Al terminar, la página no hace nada: es normal.',
              )}
              {nota(
                '4. En la Consola sale una línea roja con moodlemobile://token=… Cópiala entera y pégala arriba, en Token.',
              )}
              <Boton texto="Copiar enlace del login" onPress={() => void copiarLogin()} />
            </>
          ) : (
            <>
              {nota(
                '• Si ya usas el sincronizador del PC: abre _moodle\\.env y copia el valor de MOODLE_TOKEN.',
              )}
              {nota(
                '• Si no: en el PC ejecuta login.bat del sincronizador, inicia sesión, pulsa F12 → Consola → F5 y copia el texto moodlemobile://token=…',
              )}
              {nota(
                '• Pásatelo al móvil (por ejemplo, enviándotelo a ti mismo) y pégalo aquí. Se guarda cifrado en el móvil.',
              )}
            </>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Feather name="lock" size={11} color={O.t3} />
            <T k="mono" s={11} lh={16} c={O.t3} style={{ flex: 1 }}>
              No compartas el token: da acceso a tu Moodle.
            </T>
          </View>
        </Tarjeta>

        <T k="mono" s={11} c={O.t4} style={{ textAlign: 'center' }}>
          Hermes {VERSION}
        </T>
      </View>
    </ScrollView>
  );
}
