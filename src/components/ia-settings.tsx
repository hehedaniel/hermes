import Feather from '@expo/vector-icons/Feather';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Campo, Etiqueta } from '@/components/ajustes-ui';
import { Caja, Marca } from '@/components/anden';
import { Button } from '@/components/button';
import { IAPlantillas } from '@/components/ia-plantillas';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
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
  IAError,
  LISTA_PROVEEDORES,
  listarModelos,
  type ModeloIA,
  modeloRecomendado,
  pedirIA,
  type Proveedor,
  PROVEEDORES,
} from '@/lib/ia/proveedores';

type Msg = { ok: boolean; texto: string } | null;

/** Ayuda para elegir modelo en cada proveedor. */
const CONSEJO_MODELO: Partial<Record<Proveedor, string>> = {
  gemini: 'Los «Flash» tienen más uso gratis al día; los «Pro» razonan mejor pero se agotan antes.',
  openrouter:
    'Los marcados como gratis no gastan saldo, pero tienen límite diario. Escribe «free» para verlos.',
  openai: 'Los «mini» y «nano» son mucho más baratos; los grandes, mejores pero caros.',
  anthropic: 'Haiku es el más barato y rápido; Sonnet y Opus, mejores pero más caros.',
};

/** Ajustes > Inteligencia artificial: proveedor, clave, modelo e indicaciones para todas las tareas. */
export function IASettings({ onCambio }: { onCambio?: () => void }) {
  const theme = useTheme();
  const [config, setConfig] = useState<ConfigIA>(CONFIG_IA_POR_DEFECTO);
  const [claveGuardada, setClaveGuardada] = useState<string | null>(null);
  const [clave, setClave] = useState('');
  const [editandoClave, setEditandoClave] = useState(false);
  const [modelos, setModelos] = useState<ModeloIA[] | null>(null);
  const [filtro, setFiltro] = useState('');
  const [instrucciones, setInstrucciones] = useState('');
  const [ocupado, setOcupado] = useState<'clave' | 'modelos' | 'probar' | null>(null);
  const [msg, setMsg] = useState<Msg>(null);
  /** Proveedores con clave guardada, para marcarlos en la lista */
  const [conClave, setConClave] = useState<Set<Proveedor>>(new Set());

  const info = PROVEEDORES[config.proveedor];

  useEffect(() => {
    leerConfigIA().then((c) => {
      setConfig(c);
      setInstrucciones(c.instrucciones);
      leerClaveIA(c.proveedor).then(setClaveGuardada);
    });
    Promise.all(LISTA_PROVEEDORES.map(async (p) => [p, await leerClaveIA(p)] as const)).then((r) =>
      setConClave(new Set(r.filter(([, k]) => k).map(([p]) => p))),
    );
  }, []);

  async function guardar(c: ConfigIA) {
    setConfig(c);
    await guardarConfigIA(c);
    onCambio?.();
  }

  async function cambiarProveedor(p: Proveedor) {
    setMsg(null);
    setModelos(null);
    setClave('');
    setEditandoClave(false);
    await guardar({ ...config, proveedor: p });
    setClaveGuardada(await leerClaveIA(p));
  }

  async function onGuardarClave() {
    const k = clave.trim();
    if (!k) return;
    setOcupado('clave');
    setMsg(null);
    try {
      // Se comprueba la clave pidiendo la lista de modelos (en Gemini depende de la clave)
      let lista: ModeloIA[] | null = null;
      try {
        lista = await listarModelos(config.proveedor, k);
      } catch (e) {
        if ((e as IAError).code === 'clave') throw e;
      }
      await guardarClaveIA(config.proveedor, k);
      setClaveGuardada(k);
      setConClave((s) => new Set(s).add(config.proveedor));
      setClave('');
      setEditandoClave(false);
      if (lista) {
        setModelos(lista);
        if (!config.modelos[config.proveedor]) {
          const modelo = modeloRecomendado(config.proveedor, lista);
          await guardar({ ...config, modelos: { ...config.modelos, [config.proveedor]: modelo } });
        }
      }
      setMsg({ ok: true, texto: 'Clave guardada. Ya puedes usar la IA en tus tareas.' });
      onCambio?.();
    } catch (e) {
      setMsg({ ok: false, texto: (e as Error).message });
    } finally {
      setOcupado(null);
    }
  }

  async function onBorrarClave() {
    await guardarClaveIA(config.proveedor, '');
    setClaveGuardada(null);
    setConClave((s) => {
      const n = new Set(s);
      n.delete(config.proveedor);
      return n;
    });
    setEditandoClave(true);
    onCambio?.();
  }

  async function onVerModelos() {
    if (modelos) {
      setModelos(null);
      return;
    }
    setOcupado('modelos');
    setMsg(null);
    try {
      setModelos(await listarModelos(config.proveedor, claveGuardada ?? ''));
    } catch (e) {
      setMsg({ ok: false, texto: (e as Error).message });
    } finally {
      setOcupado(null);
    }
  }

  async function elegirModelo(id: string) {
    setModelos(null);
    setFiltro('');
    await guardar({ ...config, modelos: { ...config.modelos, [config.proveedor]: id } });
  }

  async function onProbar() {
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
      setMsg({ ok: true, texto: r.trim() });
    } catch (e) {
      setMsg({ ok: false, texto: (e as Error).message });
    } finally {
      setOcupado(null);
    }
  }

  const visibles = useMemo(() => {
    const f = filtro.trim().toLowerCase();
    return (modelos ?? [])
      .filter((m) => !f || m.id.toLowerCase().includes(f) || m.nombre.toLowerCase().includes(f))
      .slice(0, 40);
  }, [modelos, filtro]);

  const mostrarCampoClave = !claveGuardada || editandoClave;
  const siglas = (n: string) => n.slice(0, 2).toUpperCase();
  const tono = (p: Proveedor) =>
    !PROVEEDORES[p].gratis
      ? { color: theme.urgent, fondo: theme.urgentWash }
      : /l[ií]mite/i.test(PROVEEDORES[p].etiqueta)
        ? { color: theme.stPend, fondo: theme.stPendW }
        : { color: theme.stDone, fondo: theme.stDoneW };

  return (
    <View style={styles.todo}>
      <ThemedText type="small" themeColor="ink2">
        Elige qué IA usar en tus tareas. Cada una con tu propia clave: las conversaciones van
        directamente de tu dispositivo a esa empresa, sin pasar por ningún otro sitio.
      </ThemedText>

      <View>
        {LISTA_PROVEEDORES.map((p) => {
          const sel = p === config.proveedor;
          const pi = PROVEEDORES[p];
          const t = tono(p);
          return (
            <Pressable
              key={p}
              onPress={() => cambiarProveedor(p)}
              accessibilityRole="radio"
              accessibilityState={{ checked: sel }}
              style={({ pressed }) => [
                styles.proveedor,
                { borderBottomColor: theme.line },
                { opacity: pressed ? 0.7 : 1 },
              ]}>
              <View
                style={[
                  styles.siglas,
                  {
                    borderColor: sel ? theme.brand : theme.line2,
                    backgroundColor: sel ? theme.brandWash : theme.surface,
                  },
                ]}>
                <ThemedText style={[styles.siglasTexto, { color: sel ? theme.brand : theme.ink2 }]}>
                  {siglas(pi.nombre)}
                </ThemedText>
              </View>
              <View style={styles.flex}>
                <View style={styles.filaNombre}>
                  <ThemedText style={styles.nombre}>{pi.nombre}</ThemedText>
                  <Marca texto={pi.etiqueta} color={t.color} fondo={t.fondo} />
                  {conClave.has(p) ? <Feather name="key" size={11} color={theme.brand} /> : null}
                </View>
                <ThemedText type="meta" themeColor="ink2" numberOfLines={2}>
                  {pi.resumen}
                </ThemedText>
              </View>
              <View style={[styles.radio, { borderColor: sel ? theme.brand : theme.line2 }]}>
                {sel ? (
                  <View style={[styles.radioDentro, { backgroundColor: theme.brand }]} />
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      <Caja style={styles.detalle}>
        <View style={styles.filaNombre}>
          <ThemedText type="smallBold">{info.nombre} · lo que puede</ThemedText>
          <Marca
            texto={info.etiqueta}
            color={tono(config.proveedor).color}
            fondo={tono(config.proveedor).fondo}
          />
        </View>
        {info.puede.map((t) => (
          <View key={t} style={styles.punto}>
            <Feather name="check" size={14} color={theme.stDone} style={styles.puntoIcono} />
            <ThemedText type="small" style={styles.flex}>
              {t}
            </ThemedText>
          </View>
        ))}
        {info.noPuede.map((t) => (
          <View key={t} style={styles.punto}>
            <Feather name="x" size={14} color={theme.urgent} style={styles.puntoIcono} />
            <ThemedText type="small" themeColor="ink2" style={styles.flex}>
              {t}
            </ThemedText>
          </View>
        ))}

        <Etiqueta
          derecha={
            <Pressable onPress={() => WebBrowser.openBrowserAsync(info.urlClave)} hitSlop={8}>
              <ThemedText type="label" style={{ color: theme.brand }}>
                Conseguir clave ↗
              </ThemedText>
            </Pressable>
          }>
          Clave de API
        </Etiqueta>
        {mostrarCampoClave ? (
          <>
            <ThemedText type="meta" themeColor="ink2">
              {info.ayudaClave}
            </ThemedText>
            <Campo
              value={clave}
              onChangeText={setClave}
              placeholder={info.placeholderClave}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
            <View style={styles.row}>
              <View style={styles.flex}>
                <Button
                  title="Pegar"
                  variant="secondary"
                  icono="clipboard"
                  compacto
                  onPress={async () => setClave((await Clipboard.getStringAsync()).trim())}
                />
              </View>
              <View style={styles.flex}>
                <Button
                  title="Guardar"
                  compacto
                  onPress={onGuardarClave}
                  loading={ocupado === 'clave'}
                  disabled={!clave.trim()}
                />
              </View>
            </View>
          </>
        ) : (
          <View
            style={[
              styles.campoFijo,
              { borderColor: theme.line2, backgroundColor: theme.surface },
            ]}>
            <Feather name="key" size={14} color={theme.ink3} />
            <ThemedText type="cifra" style={styles.flex} numberOfLines={1}>
              {oculta(claveGuardada!)}
            </ThemedText>
            <Pressable onPress={() => setEditandoClave(true)} hitSlop={8}>
              <ThemedText type="label" style={{ color: theme.brand }}>
                Editar
              </ThemedText>
            </Pressable>
            <Pressable onPress={onBorrarClave} hitSlop={8}>
              <ThemedText type="label" style={{ color: theme.urgent }}>
                Quitar
              </ThemedText>
            </Pressable>
          </View>
        )}

        {!mostrarCampoClave ? (
          <>
            <Etiqueta>Modelo</Etiqueta>
            <Pressable
              onPress={onVerModelos}
              accessibilityRole="button"
              style={[
                styles.campoFijo,
                { borderColor: theme.line2, backgroundColor: theme.surface },
              ]}>
              <ThemedText style={styles.flex} numberOfLines={1}>
                {modeloDe(config)}
              </ThemedText>
              {ocupado === 'modelos' ? (
                <ThemedText type="meta" themeColor="ink3">
                  Cargando…
                </ThemedText>
              ) : (
                <Feather
                  name={modelos ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={theme.ink2}
                />
              )}
            </Pressable>
            {modelos ? (
              <View style={styles.lista}>
                {modelos.length > 12 ? (
                  <Campo
                    value={filtro}
                    onChangeText={setFiltro}
                    placeholder="Buscar modelo (flash, free, claude…)"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                ) : null}
                <View
                  style={[
                    styles.modelos,
                    { borderColor: theme.line, backgroundColor: theme.surface },
                  ]}>
                  {visibles.map((m, i) => {
                    const actual = m.id === modeloDe(config);
                    return (
                      <Pressable
                        key={m.id}
                        onPress={() => elegirModelo(m.id)}
                        style={({ pressed }) => [
                          styles.modelo,
                          i > 0 && { borderTopWidth: 1, borderTopColor: theme.line },
                          actual && { backgroundColor: theme.brandWash },
                          pressed && { backgroundColor: theme.paper2 },
                        ]}>
                        <View style={styles.flex}>
                          <ThemedText type="small" numberOfLines={1} style={{ fontWeight: 500 }}>
                            {m.nombre}
                          </ThemedText>
                          <ThemedText type="meta" themeColor="ink3" numberOfLines={1}>
                            {m.id}
                          </ThemedText>
                        </View>
                        {m.gratis ? (
                          <Marca texto="Gratis" color={theme.stDone} fondo={theme.stDoneW} />
                        ) : null}
                        {actual ? <Feather name="check" size={15} color={theme.brand} /> : null}
                      </Pressable>
                    );
                  })}
                </View>
                {CONSEJO_MODELO[config.proveedor] ? (
                  <ThemedText type="meta" themeColor="ink2">
                    {CONSEJO_MODELO[config.proveedor]}
                  </ThemedText>
                ) : null}
              </View>
            ) : null}
            <Button
              title="Probar la conexión"
              variant="secondary"
              icono="zap"
              compacto
              onPress={onProbar}
              loading={ocupado === 'probar'}
            />
          </>
        ) : null}
        {msg ? (
          <View
            style={[styles.msg, { backgroundColor: msg.ok ? theme.stDoneW : theme.urgentWash }]}>
            <Feather
              name={msg.ok ? 'check-circle' : 'alert-circle'}
              size={14}
              color={msg.ok ? theme.stDone : theme.urgent}
              style={styles.puntoIcono}
            />
            <ThemedText
              type="small"
              style={[styles.flex, { color: msg.ok ? theme.stDone : theme.urgent }]}>
              {msg.texto}
            </ThemedText>
          </View>
        ) : null}
      </Caja>

      <View style={styles.bloque}>
        <Etiqueta>Indicaciones para todas las tareas</Etiqueta>
        <Campo
          value={instrucciones}
          onChangeText={setInstrucciones}
          onEndEditing={() => guardar({ ...config, instrucciones })}
          onBlur={() => guardar({ ...config, instrucciones })}
          placeholder="Opcional. Ej.: escribe como un alumno de FP, con frases sencillas y sin palabras rebuscadas."
          multiline
        />
      </View>

      <IAPlantillas />
    </View>
  );
}

const oculta = (k: string) => (k.length > 10 ? `${'•'.repeat(12)}${k.slice(-4)}` : '••••');

const styles = StyleSheet.create({
  todo: { gap: Spacing.three },
  flex: { flex: 1 },
  proveedor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  siglas: {
    width: 32,
    height: 32,
    borderRadius: Radii.chip,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  siglasTexto: { fontSize: 10.5, lineHeight: 13, fontWeight: 700, letterSpacing: 0.5 },
  nombre: { fontSize: 15, lineHeight: 20, fontWeight: 600 },
  filaNombre: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDentro: { width: 8, height: 8, borderRadius: 4 },
  detalle: { padding: 14, gap: 8 },
  punto: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  puntoIcono: { marginTop: 2 },
  row: { flexDirection: 'row', gap: Spacing.two },
  campoFijo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: Radii.control,
    paddingHorizontal: 12,
    minHeight: 46,
  },
  lista: { gap: 8 },
  modelos: { borderWidth: 1, borderRadius: Radii.control, overflow: 'hidden' },
  modelo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  msg: { flexDirection: 'row', gap: 8, borderRadius: Radii.control, padding: 10 },
  bloque: { gap: 6 },
});
