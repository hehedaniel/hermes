/**
 * Ajustes en el diseño Obsidiana: tarjetas numeradas con títulos en serif. Reproducido del HTML
 * de Stitch. Todo lo que se ve funciona: recordatorios, avisos, Google Calendar, asistente de IA,
 * cuenta y apariencia.
 */
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, useWindowDimensions, View } from 'react-native';

import { T, useArriba, useMovil } from '@/components/obs';
import { TEMAS, type TemaId } from '@/constants/colors';
import { VERSION } from '@/constants/version';
import { useAppUpdates } from '@/hooks/app-updates';
import { useThemePreference } from '@/hooks/use-theme';
import {
  AVISOS_DISPONIBLES,
  AVISOS_POR_DEFECTO,
  avisoDePrueba,
  guardarPreferencias,
  leerPreferencias,
  pedirPermiso,
  permisoConcedido,
  type PreferenciasAvisos,
  programarRecordatorios,
} from '@/lib/avisos';
import { confirmar } from '@/lib/dialogo';
import { formatoTamano, useDownloads } from '@/lib/downloads';
import { haceCuanto } from '@/lib/format';
import { useGoogleCal } from '@/lib/google-cal';
import {
  CONFIG_IA_POR_DEFECTO,
  type ConfigIA,
  guardarClaveIA,
  guardarConfigIA,
  leerClaveIA,
  leerConfigIA,
  modeloDe,
} from '@/lib/ia/config';
import {
  LISTA_PROVEEDORES,
  listarModelos,
  type ModeloIA,
  modeloRecomendado,
  pedirIA,
  type Proveedor,
  PROVEEDORES,
} from '@/lib/ia/proveedores';
import { useMoodle } from '@/lib/store';

const Z = { z100: '#F4F4F5', z200: '#E4E4E7', z300: '#D4D4D8', z400: '#A1A1AA', z500: '#71717A', z600: '#52525B', z800: '#27272A' };
const CAMBIOS_URL = 'https://github.com/hehedaniel/hermes/blob/main/CHANGELOG.md';
const ANTELACIONES = [48, 24, 12, 3, 2, 1];

export function AjustesObsidiana() {
  const { width } = useWindowDimensions();
  const movil = useMovil();
  const arriba = useArriba();
  const padX = width < 500 ? 20 : movil ? 28 : width >= 1280 ? 80 : width >= 900 ? 56 : 32;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#0A0A0C' }} contentContainerStyle={{ paddingHorizontal: padX, paddingTop: (movil ? 28 : 40) + arriba, paddingBottom: 40 }}>
      <View style={{ width: '100%', maxWidth: 896, alignSelf: 'center', gap: movil ? 24 : 40 }}>
        <View style={{ borderBottomWidth: 1, borderBottomColor: '#1C1C22', paddingBottom: 32 }}>
          <T k="mono" w={600} up s={11} ls={0.24} c={Z.z500} style={{ marginBottom: 6 }}>
            Preferencias
          </T>
          <T k="serif" s={36} lh={40} c={Z.z100} style={{ marginBottom: 10 }}>
            Ajustes
          </T>
          <T w={300} s={14} lh={20} c={Z.z400}>
            Recordatorios, notificaciones, conexión con tu calendario y el proveedor del asistente.
          </T>
        </View>
        <Recordatorios />
        <Notificaciones />
        <GoogleCalendar />
        <Asistente />
        <Cuenta />
        <Apariencia />
        <Pressable onPress={() => WebBrowser.openBrowserAsync(CAMBIOS_URL)} style={{ alignItems: 'center', paddingBottom: 24 }}>
          <T k="mono" s={11} c={Z.z600}>
            Hermes {VERSION} · Ver cambios
          </T>
        </Pressable>
      </View>
    </ScrollView>
  );
}

// ——— piezas ———

function Tarjeta({ n, titulo, texto, children }: { n: number; titulo: string; texto?: string; children: React.ReactNode }) {
  const movil = useMovil();
  return (
    <View style={{ backgroundColor: '#121215', borderWidth: 1, borderColor: '#202026', borderRadius: 16, padding: movil ? 20 : 28 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: texto ? 8 : 24 }}>
        <T k="mono" s={12} c={Z.z600}>
          {String(n).padStart(2, '0')}
        </T>
        <T k="serif" s={20} lh={28} c={Z.z100}>
          {titulo}
        </T>
      </View>
      {texto ? (
        <T s={12} lh={16} c={Z.z400} style={{ marginBottom: 24, marginLeft: movil ? 0 : 28 }}>
          {texto}
        </T>
      ) : null}
      <View style={{ marginLeft: movil ? 0 : 28 }}>{children}</View>
    </View>
  );
}

function Interruptor({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={() => !disabled && onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        backgroundColor: value ? '#9BC63B' : Z.z800,
        justifyContent: 'center',
        opacity: disabled ? 0.5 : 1,
      }}>
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: value ? '#09090B' : '#A1A1AA',
          marginLeft: value ? 22 : 2,
        }}
      />
    </Pressable>
  );
}

function Fila({
  titulo,
  texto,
  derecha,
  borde,
}: {
  titulo: string;
  texto?: string;
  derecha: React.ReactNode;
  borde?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        paddingTop: borde ? 20 : 0,
        marginTop: borde ? 20 : 0,
        borderTopWidth: borde ? 1 : 0,
        borderTopColor: '#1D1D23',
      }}>
      <View style={{ flex: 1 }}>
        <T w={500} s={14} lh={20} c={Z.z200}>
          {titulo}
        </T>
        {texto ? (
          <T s={12} lh={16} c={Z.z500} style={{ marginTop: 2 }}>
            {texto}
          </T>
        ) : null}
      </View>
      {derecha}
    </View>
  );
}

function Chip({ texto, activo, onPress, ancho = 16 }: { texto: string; activo?: boolean; onPress?: () => void; ancho?: number }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: ancho,
        paddingVertical: 6,
        borderRadius: 99,
        borderWidth: 1,
        backgroundColor: activo ? '#222A16' : '#16161C',
        borderColor: activo ? 'rgba(63,98,18,0.8)' : Z.z800,
      }}>
      <T k="mono" up s={12} w={activo ? 600 : 400} ls={0.05} c={activo ? '#A3E635' : Z.z400}>
        {texto}
      </T>
    </Pressable>
  );
}

function Boton({
  texto,
  onPress,
  peligro,
  disabled,
  ancho,
}: {
  texto: string;
  onPress?: () => void;
  peligro?: boolean;
  disabled?: boolean;
  ancho?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        paddingHorizontal: ancho ?? 16,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Z.z800,
        backgroundColor: '#16161B',
        opacity: disabled ? 0.5 : 1,
      }}>
      <T k="mono" up s={12} ls={0.05} c={peligro ? '#FB7185' : Z.z300}>
        {texto}
      </T>
    </Pressable>
  );
}

const campo = {
  backgroundColor: '#17171D',
  borderWidth: 1,
  borderColor: 'rgba(39,39,42,0.9)',
  borderRadius: 12,
  paddingHorizontal: 16,
  paddingVertical: 8,
  color: Z.z300,
  fontFamily: 'JetBrainsMono_400Regular',
  fontSize: 12,
} as const;

// ——— 01 y 02: avisos ———

function useAvisos() {
  const { snapshot } = useMoodle();
  const [prefs, setPrefs] = useState<PreferenciasAvisos>(AVISOS_POR_DEFECTO);
  const [permiso, setPermiso] = useState<boolean | null>(null);
  useEffect(() => {
    leerPreferencias().then(setPrefs);
    permisoConcedido().then(setPermiso);
  }, []);
  const cambiar = useCallback(
    async (parcial: Partial<PreferenciasAvisos>) => {
      const nuevas = { ...prefs, ...parcial };
      setPrefs(nuevas);
      await guardarPreferencias(nuevas);
      if ('recordatorios' in parcial || 'antelacion' in parcial) programarRecordatorios(snapshot);
    },
    [prefs, snapshot],
  );
  return { prefs, cambiar, permiso, setPermiso, snapshot };
}

function Recordatorios() {
  const { prefs, cambiar } = useAvisos();
  const horas = prefs.antelacion ?? AVISOS_POR_DEFECTO.antelacion;
  const alternar = (h: number) => {
    const nuevas = horas.includes(h) ? horas.filter((x) => x !== h) : [...horas, h];
    cambiar({ antelacion: nuevas.sort((a, b) => b - a) });
  };
  return (
    <Tarjeta n={1} titulo="Recordatorios de entrega" texto="Avisar antes del vencimiento de cada tarea.">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 28 }}>
        {ANTELACIONES.map((h) => (
          <Chip key={h} texto={`${h} H`} activo={horas.includes(h)} onPress={() => alternar(h)} />
        ))}
      </View>
      <Fila
        borde
        titulo="Activar los recordatorios"
        texto={
          AVISOS_DISPONIBLES
            ? 'Una notificación en el móvil a las horas elegidas.'
            : 'Solo funcionan en la app del móvil.'
        }
        derecha={
          <Interruptor
            value={prefs.recordatorios}
            disabled={!AVISOS_DISPONIBLES}
            onChange={(v) => cambiar({ recordatorios: v })}
          />
        }
      />
    </Tarjeta>
  );
}

function Notificaciones() {
  const { prefs, cambiar, permiso, setPermiso, snapshot } = useAvisos();
  const [msg, setMsg] = useState<string | null>(null);
  async function activar() {
    const ok = await pedirPermiso();
    setPermiso(ok);
    if (ok) programarRecordatorios(snapshot);
    else Linking.openSettings();
  }
  async function probar() {
    const ok = await avisoDePrueba();
    setPermiso(ok);
    setMsg(ok ? 'Enviada. Debería salirte arriba en un momento.' : null);
  }
  const off = !AVISOS_DISPONIBLES;
  return (
    <Tarjeta n={2} titulo="Notificaciones">
      {off ? (
        <T s={12} lh={18} c={Z.z500} style={{ marginBottom: 20 }}>
          Las notificaciones solo funcionan en la app del móvil.
        </T>
      ) : null}
      {permiso === false && !off ? (
        <View style={{ marginBottom: 20, gap: 10 }}>
          <T s={12} lh={18} c="#F59E0B">
            Las notificaciones están desactivadas para Hermes. Actívalas para que te avise de notas, novedades y entregas.
          </T>
          <View style={{ alignSelf: 'flex-start' }}>
            <Boton texto="Activar notificaciones" onPress={activar} />
          </View>
        </View>
      ) : null}
      <Fila
        titulo="Correcciones publicadas"
        texto="Cuando se publica una nota o un PDF corregido."
        derecha={<Interruptor value={prefs.notas} disabled={off} onChange={(v) => cambiar({ notas: v })} />}
      />
      <Fila
        borde
        titulo="Novedades del campus"
        texto="Material nuevo o actualizado, tareas nuevas y cambios de fecha."
        derecha={<Interruptor value={prefs.novedades} disabled={off} onChange={(v) => cambiar({ novedades: v })} />}
      />
      {!off ? (
        <View style={{ marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#1D1D23', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Boton texto="Probar una notificación" onPress={probar} />
          {msg ? (
            <T k="mono" up s={11} ls={0.05} c={Z.z500}>
              {msg}
            </T>
          ) : null}
        </View>
      ) : null}
    </Tarjeta>
  );
}

// ——— 03: Google Calendar ———

function GoogleCalendar() {
  const { url, guardarUrl, quitar } = useGoogleCal();
  const [texto, setTexto] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  async function guardar(valor: string) {
    setBusy(true);
    setMsg(null);
    try {
      const n = await guardarUrl(valor);
      setTexto('');
      setMsg({ ok: true, t: `Conectado: ${n} eventos en las próximas semanas.` });
    } catch (e) {
      setMsg({ ok: false, t: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }
  return (
    <Tarjeta n={3} titulo="Google Calendar">
      {url ? (
        <View
          style={{
            backgroundColor: '#17171D',
            borderWidth: 1,
            borderColor: 'rgba(39,39,42,0.8)',
            borderRadius: 12,
            padding: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
          <View>
            <T w={500} s={14} c={Z.z200}>
              Conectado
            </T>
            <T k="mono" up s={11} c={Z.z500}>
              Solo lectura · se superpone a clases y plazos
            </T>
          </View>
          <Pressable
            onPress={() =>
              confirmar({
                titulo: 'Google Calendar',
                texto: '¿Dejar de mostrar tus eventos de Google?',
                boton: 'Desconectar',
                destructivo: true,
                onOk: () => quitar(),
              })
            }
            style={{ paddingHorizontal: 16, paddingVertical: 6, borderRadius: 99, borderWidth: 1, borderColor: Z.z800 }}>
            <T k="mono" up s={11} ls={0.05} c={Z.z400}>
              Desconectar
            </T>
          </Pressable>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          <T s={12} lh={18} c={Z.z500}>
            Pega el enlace que da la función crearClaveApp del script de Google (ver google-apps-script/README.md).
          </T>
          <TextInput
            value={texto}
            onChangeText={setTexto}
            placeholder="https://script.google.com/macros/s/…/exec?key=…"
            placeholderTextColor={Z.z600}
            autoCapitalize="none"
            autoCorrect={false}
            style={campo}
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Boton
              texto="Pegar"
              onPress={async () => setTexto((await Clipboard.getStringAsync()).trim())}
            />
            <Boton texto={busy ? 'Conectando…' : 'Conectar'} onPress={() => guardar(texto)} disabled={busy || !texto.trim()} />
          </View>
        </View>
      )}
      {msg ? (
        <T s={12} c={msg.ok ? '#84CC16' : '#F87171'} style={{ marginTop: 12 }}>
          {msg.t}
        </T>
      ) : null}
    </Tarjeta>
  );
}

// ——— 04: asistente con IA ———

function Asistente() {
  const [config, setConfig] = useState<ConfigIA>(CONFIG_IA_POR_DEFECTO);
  const [claveGuardada, setClaveGuardada] = useState<string | null>(null);
  const [clave, setClave] = useState('');
  const [editando, setEditando] = useState(false);
  const [modelos, setModelos] = useState<ModeloIA[] | null>(null);
  const [verModelos, setVerModelos] = useState(false);
  const [ocupado, setOcupado] = useState<'clave' | 'modelos' | 'probar' | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

  useEffect(() => {
    leerConfigIA().then((c) => {
      setConfig(c);
      leerClaveIA(c.proveedor).then(setClaveGuardada);
    });
  }, []);

  async function guardar(c: ConfigIA) {
    setConfig(c);
    await guardarConfigIA(c);
  }
  async function elegirProveedor(p: Proveedor) {
    setMsg(null);
    setModelos(null);
    setVerModelos(false);
    setClave('');
    setEditando(false);
    await guardar({ ...config, proveedor: p });
    setClaveGuardada(await leerClaveIA(p));
  }
  async function guardarClave() {
    const k = clave.trim();
    if (!k) return;
    setOcupado('clave');
    setMsg(null);
    try {
      let lista: ModeloIA[] | null = null;
      try {
        lista = await listarModelos(config.proveedor, k);
      } catch (e) {
        if ((e as { code?: string }).code === 'clave') throw e;
      }
      await guardarClaveIA(config.proveedor, k);
      setClaveGuardada(k);
      setClave('');
      setEditando(false);
      if (lista) {
        setModelos(lista);
        if (!config.modelos[config.proveedor]) {
          const m = modeloRecomendado(config.proveedor, lista);
          await guardar({ ...config, modelos: { ...config.modelos, [config.proveedor]: m } });
        }
      }
      setMsg({ ok: true, t: 'Clave guardada. Ya puedes usar la IA en tus tareas.' });
    } catch (e) {
      setMsg({ ok: false, t: (e as Error).message });
    } finally {
      setOcupado(null);
    }
  }
  async function quitarClave() {
    await guardarClaveIA(config.proveedor, '');
    setClaveGuardada(null);
    setEditando(true);
  }
  async function abrirModelos() {
    if (verModelos) {
      setVerModelos(false);
      return;
    }
    if (!modelos) {
      setOcupado('modelos');
      try {
        setModelos(await listarModelos(config.proveedor, claveGuardada ?? ''));
      } catch (e) {
        setMsg({ ok: false, t: (e as Error).message });
        setOcupado(null);
        return;
      }
      setOcupado(null);
    }
    setVerModelos(true);
  }
  async function elegirModelo(id: string) {
    setVerModelos(false);
    await guardar({ ...config, modelos: { ...config.modelos, [config.proveedor]: id } });
  }
  async function probar() {
    setOcupado('probar');
    setMsg(null);
    try {
      const r = await pedirIA({
        proveedor: config.proveedor,
        clave: claveGuardada ?? '',
        modelo: modeloDe(config),
        sistema: 'Responde en una sola frase corta, en español.',
        mensajes: [{ rol: 'usuario', texto: 'Saluda y di qué modelo eres.' }],
      });
      setMsg({ ok: true, t: r.trim() });
    } catch (e) {
      setMsg({ ok: false, t: (e as Error).message });
    } finally {
      setOcupado(null);
    }
  }

  const info = PROVEEDORES[config.proveedor];
  const mostrarCampo = !claveGuardada || editando;
  const lista = useMemo(() => (modelos ?? []).slice(0, 40), [modelos]);
  const oculta = (k: string) => '•'.repeat(Math.max(8, Math.min(k.length - 4, 28))) + k.slice(-4);

  return (
    <Tarjeta
      n={4}
      titulo="Asistente con IA"
      texto="Usa tu propio proveedor y tu clave. Solo se usa cuando pulsas «Hacer con IA» dentro de una tarea.">
      <View style={{ gap: 24 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {LISTA_PROVEEDORES.map((p) => (
            <Chip key={p} texto={PROVEEDORES[p].nombre} ancho={20} activo={p === config.proveedor} onPress={() => elegirProveedor(p)} />
          ))}
        </View>

        <View style={{ gap: 6 }}>
          <T w={500} s={14} c={Z.z200}>
            Clave de API
          </T>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <View style={{ flex: 1, minWidth: 200 }}>
              <T s={12} lh={16} c={Z.z500}>
                Se guarda solo en este dispositivo.
              </T>
              <Pressable onPress={() => WebBrowser.openBrowserAsync(info.urlClave)} hitSlop={6}>
                <T k="mono" s={11} c="#A3E635" style={{ marginTop: 4 }}>
                  Conseguir clave ↗
                </T>
              </Pressable>
            </View>
            {mostrarCampo ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <TextInput
                  value={clave}
                  onChangeText={setClave}
                  placeholder={info.placeholderClave}
                  placeholderTextColor={Z.z600}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[campo, { minWidth: 240 }]}
                />
                <Boton texto={ocupado === 'clave' ? 'Guardando…' : 'Guardar'} onPress={guardarClave} disabled={!clave.trim() || ocupado === 'clave'} ancho={12} />
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[campo, { minWidth: 240 }]}>
                  <T k="mono" s={12} ls={0.1} c={Z.z300} numberOfLines={1}>
                    {oculta(claveGuardada!)}
                  </T>
                </View>
                <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, backgroundColor: '#202715', borderWidth: 1, borderColor: 'rgba(63,98,18,0.8)' }}>
                  <T k="mono" s={10} w={500} c="#BEF264">
                    GUARDADA
                  </T>
                </View>
                <Pressable onPress={() => setEditando(true)} hitSlop={6}>
                  <T k="mono" up s={11} c={Z.z400}>
                    Editar
                  </T>
                </Pressable>
                <Pressable onPress={quitarClave} hitSlop={6}>
                  <T k="mono" up s={11} c="#FB7185">
                    Quitar
                  </T>
                </Pressable>
              </View>
            )}
          </View>
        </View>

        {!mostrarCampo ? (
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <View>
                <T w={500} s={14} c={Z.z200}>
                  Modelo
                </T>
                <T s={12} c={Z.z500} style={{ marginTop: 2 }}>
                  Se usa en las respuestas del asistente.
                </T>
              </View>
              <Pressable onPress={abrirModelos} style={[campo, { width: 240, flexDirection: 'row', justifyContent: 'space-between' }]}>
                <T k="mono" s={12} c={Z.z200} numberOfLines={1} style={{ flex: 1 }}>
                  {modeloDe(config)}
                </T>
                <T k="mono" s={12} c={Z.z500}>
                  {ocupado === 'modelos' ? '…' : verModelos ? '▴' : '▾'}
                </T>
              </Pressable>
            </View>
            {verModelos ? (
              <View style={{ alignSelf: 'flex-end', width: 240, borderWidth: 1, borderColor: Z.z800, borderRadius: 12, backgroundColor: '#17171D', overflow: 'hidden', maxHeight: 260 }}>
                <ScrollView>
                  {lista.map((m, i) => (
                    <Pressable
                      key={m.id}
                      onPress={() => elegirModelo(m.id)}
                      style={{ paddingHorizontal: 14, paddingVertical: 9, borderTopWidth: i ? 1 : 0, borderTopColor: '#1D1D23', backgroundColor: m.id === modeloDe(config) ? '#202715' : 'transparent' }}>
                      <T k="mono" s={12} c={m.id === modeloDe(config) ? '#BEF264' : Z.z200} numberOfLines={1}>
                        {m.id}
                      </T>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}
          </View>
        ) : null}

        {!mostrarCampo ? (
          <View style={{ paddingTop: 12, borderTopWidth: 1, borderTopColor: '#1D1D23', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Boton texto={ocupado === 'probar' ? 'Probando…' : 'Probar conexión'} onPress={probar} disabled={ocupado === 'probar'} />
          </View>
        ) : null}
        {msg ? (
          <T s={12} lh={18} c={msg.ok ? '#84CC16' : '#F87171'}>
            {msg.t}
          </T>
        ) : null}
      </View>
    </Tarjeta>
  );
}

// ——— 05: cuenta ———

function Cuenta() {
  const { snapshot, syncing, refresh, disconnect } = useMoodle();
  const { guardaArchivos, resumen, borrarTodo } = useDownloads();
  const { enabled: updatesEnabled, checking, checkNow } = useAppUpdates();
  const nombre = snapshot?.site.fullname ?? 'Cuenta de Moodle';
  const iniciales = nombre.split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  function cerrar() {
    confirmar({
      titulo: 'Cerrar sesión',
      texto: guardaArchivos
        ? 'Se borrará el token, los datos y los archivos descargados en el móvil.'
        : 'Se borrará el token y los datos guardados en este navegador.',
      boton: 'Cerrar sesión',
      destructivo: true,
      onOk: async () => {
        await borrarTodo();
        await disconnect();
      },
    });
  }
  return (
    <Tarjeta n={5} titulo="Cuenta">
      <View style={{ gap: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#1B1B22', borderWidth: 1, borderColor: 'rgba(63,63,70,0.8)', alignItems: 'center', justifyContent: 'center' }}>
              <T w={600} s={14} ls={0.05} c={Z.z200}>
                {iniciales}
              </T>
            </View>
            <View>
              <T w={500} s={14} c={Z.z100}>
                {nombre}
              </T>
              <T k="mono" up s={12} ls={0.05} c={Z.z500} style={{ marginTop: 2 }}>
                {snapshot ? `${snapshot.site.sitename} · ${snapshot.courses.length} asignaturas` : 'Moodle'}
              </T>
            </View>
          </View>
          <T k="mono" up s={10} ls={0.05} c={Z.z500}>
            {syncing ? 'Sincronizando…' : snapshot ? `Sincronizado ${haceCuanto(snapshot.syncedAt)}` : 'Sin sincronizar'}
          </T>
        </View>
        <View style={{ paddingTop: 16, borderTopWidth: 1, borderTopColor: '#1D1D23', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Boton texto={syncing ? 'Sincronizando…' : 'Sincronizar ahora'} onPress={() => refresh()} disabled={syncing} />
            <Boton texto="Cerrar sesión" peligro onPress={cerrar} />
          </View>
          <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
            {updatesEnabled ? (
              <Pressable onPress={checkNow} disabled={checking}>
                <T k="mono" up s={12} ls={0.05} c={Z.z400}>
                  {checking ? 'Buscando…' : 'Buscar actualizaciones'}
                </T>
              </Pressable>
            ) : null}
            {guardaArchivos && resumen.archivos ? (
              <Pressable
                onPress={() =>
                  confirmar({
                    titulo: 'Borrar descargas',
                    texto: 'Se borrarán del móvil (puedes volver a descargarlos).',
                    boton: 'Borrar',
                    destructivo: true,
                    onOk: () => borrarTodo(),
                  })
                }>
                <T k="mono" up s={12} ls={0.05} c={Z.z400}>
                  Borrar descargas · {formatoTamano(resumen.bytes)}
                </T>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Tarjeta>
  );
}

// ——— 06: apariencia (el selector de tema) ———

function Apariencia() {
  const { tema, cambiarTema, listo } = useThemePreference();
  return (
    <Tarjeta n={6} titulo="Apariencia" texto="Elige el diseño de Hermes. Obsidiana solo existe en oscuro.">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {(Object.keys(TEMAS) as TemaId[]).map((id) => (
          <Chip key={id} texto={TEMAS[id].nombre} activo={tema === id} onPress={() => listo && cambiarTema(id)} />
        ))}
      </View>
    </Tarjeta>
  );
}

