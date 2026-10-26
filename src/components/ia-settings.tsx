import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button, Segmented } from '@/components/button';
import { SectionTitle } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
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
  listarModelos,
  type ModeloIA,
  modeloRecomendado,
  pedirIA,
  type Proveedor,
  PROVEEDORES,
} from '@/lib/ia/proveedores';

type Msg = { ok: boolean; texto: string } | null;

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

  const info = PROVEEDORES[config.proveedor];
  const inputStyle = [
    styles.input,
    { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border },
  ];

  useEffect(() => {
    leerConfigIA().then((c) => {
      setConfig(c);
      setInstrucciones(c.instrucciones);
      leerClaveIA(c.proveedor).then(setClaveGuardada);
    });
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

  return (
    <>
      <SectionTitle>Inteligencia artificial</SectionTitle>
      <ThemedText type="small" themeColor="textSecondary">
        Para usar la IA en tus tareas. Usa tu propia clave: las conversaciones van directamente de
        tu móvil a {info.nombre}, sin pasar por ningún otro sitio.
      </ThemedText>
      <Segmented
        value={config.proveedor}
        options={[
          { value: 'gemini', label: 'Gemini (gratis)' },
          { value: 'openrouter', label: 'OpenRouter' },
        ]}
        onChange={cambiarProveedor}
      />

      <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
        {mostrarCampoClave ? (
          <>
            <ThemedText type="smallBold">Clave de {info.nombre}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {info.ayudaClave}{' '}
              <ThemedText
                type="smallBold"
                style={{ color: theme.accent }}
                onPress={() => WebBrowser.openBrowserAsync(info.urlClave)}>
                Conseguir clave
              </ThemedText>
            </ThemedText>
            <TextInput
              value={clave}
              onChangeText={setClave}
              placeholder={config.proveedor === 'gemini' ? 'AIza…' : 'sk-or-…'}
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              style={[inputStyle, { backgroundColor: theme.background }]}
            />
            <View style={styles.row}>
              <View style={styles.flex}>
                <Button
                  title="Pegar"
                  variant="secondary"
                  onPress={async () => setClave((await Clipboard.getStringAsync()).trim())}
                />
              </View>
              <View style={styles.flex}>
                <Button
                  title="Guardar"
                  onPress={onGuardarClave}
                  loading={ocupado === 'clave'}
                  disabled={!clave.trim()}
                />
              </View>
            </View>
          </>
        ) : (
          <>
            <View style={styles.fila}>
              <View style={styles.flex}>
                <ThemedText type="smallBold">Clave de {info.nombre}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Guardada ({oculta(claveGuardada!)})
                </ThemedText>
              </View>
              <ThemedText
                type="smallBold"
                style={{ color: theme.accent }}
                onPress={() => setEditandoClave(true)}>
                Cambiar
              </ThemedText>
              <ThemedText type="smallBold" style={{ color: theme.vencida }} onPress={onBorrarClave}>
                Quitar
              </ThemedText>
            </View>
            <View style={[styles.separador, { backgroundColor: theme.border }]} />
            <View style={styles.fila}>
              <View style={styles.flex}>
                <ThemedText type="smallBold">Modelo</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                  {modeloDe(config)}
                </ThemedText>
              </View>
              <ThemedText type="smallBold" style={{ color: theme.accent }} onPress={onVerModelos}>
                {ocupado === 'modelos' ? 'Cargando…' : modelos ? 'Cerrar' : 'Cambiar'}
              </ThemedText>
            </View>
            {modelos ? (
              <View style={styles.lista}>
                {modelos.length > 12 ? (
                  <TextInput
                    value={filtro}
                    onChangeText={setFiltro}
                    placeholder="Buscar modelo (flash, free, claude…)"
                    placeholderTextColor={theme.textSecondary}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={[inputStyle, { backgroundColor: theme.background }]}
                  />
                ) : null}
                {visibles.map((m) => {
                  const actual = m.id === modeloDe(config);
                  return (
                    <Pressable
                      key={m.id}
                      onPress={() => elegirModelo(m.id)}
                      style={({ pressed }) => [
                        styles.modelo,
                        {
                          backgroundColor: actual ? theme.backgroundSelected : theme.background,
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}>
                      <View style={styles.flex}>
                        <ThemedText type="small" numberOfLines={1}>
                          {m.nombre}
                        </ThemedText>
                        <ThemedText
                          type="small"
                          themeColor="textSecondary"
                          numberOfLines={1}
                          style={styles.id}>
                          {m.id}
                        </ThemedText>
                      </View>
                      {m.gratis ? (
                        <ThemedText type="smallBold" style={{ color: theme.entregada }}>
                          Gratis
                        </ThemedText>
                      ) : null}
                      {actual ? (
                        <ThemedText type="smallBold" style={{ color: theme.accent }}>
                          ✓
                        </ThemedText>
                      ) : null}
                    </Pressable>
                  );
                })}
                {config.proveedor === 'gemini' ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    Los «Flash» tienen más uso gratis al día; los «Pro» razonan mejor pero se agotan
                    antes.
                  </ThemedText>
                ) : (
                  <ThemedText type="small" themeColor="textSecondary">
                    Los marcados como gratis no gastan saldo, pero tienen límite diario. Para leer
                    PDF conviene uno que admita archivos o imágenes.
                  </ThemedText>
                )}
              </View>
            ) : null}
            <Button
              title="Probar"
              variant="secondary"
              onPress={onProbar}
              loading={ocupado === 'probar'}
            />
          </>
        )}
        {msg ? (
          <ThemedText type="small" style={{ color: msg.ok ? theme.entregada : theme.vencida }}>
            {msg.texto}
          </ThemedText>
        ) : null}
      </View>

      <ThemedText type="small" themeColor="textSecondary">
        Indicaciones para todas las tareas (opcional)
      </ThemedText>
      <TextInput
        value={instrucciones}
        onChangeText={setInstrucciones}
        onEndEditing={() => guardar({ ...config, instrucciones })}
        onBlur={() => guardar({ ...config, instrucciones })}
        placeholder="Ej.: escribe como un alumno de FP, con frases sencillas y sin palabras rebuscadas."
        placeholderTextColor={theme.textSecondary}
        multiline
        style={[inputStyle, styles.multi]}
      />
    </>
  );
}

const oculta = (k: string) => (k.length > 10 ? `${k.slice(0, 4)}…${k.slice(-4)}` : '••••');

const styles = StyleSheet.create({
  card: { borderRadius: 14, padding: Spacing.three, gap: Spacing.two },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  multi: { minHeight: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: Spacing.two },
  fila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  flex: { flex: 1 },
  separador: { height: StyleSheet.hairlineWidth },
  lista: { gap: 6 },
  modelo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  id: { fontSize: 12, lineHeight: 16 },
});
