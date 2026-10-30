/** Entregar la tarea desde la app: tus archivos o tu texto, sin pasar por la IA. */
import Feather from '@expo/vector-icons/Feather';
import { ActivityIndicator, Platform, Pressable, TextInput, View } from 'react-native';

import { O, T } from '@/components/obs';
import type { Entrega } from '@/lib/data';
import { formatoTamano } from '@/lib/downloads';
import { useEntregaPropia } from '@/lib/use-entrega-propia';

export function EntregaPropia({ entrega }: { entrega: Entrega }) {
  const { cfg, archivos, texto, setTexto, elegir, quitar, entregar, entregando, hayAlgo } =
    useEntregaPropia(entrega);
  if (!cfg) return null;
  const tipos = cfg.tipos.length && !cfg.tipos.includes('*') ? cfg.tipos.join(', ') : null;

  return (
    <View style={{ gap: 12 }}>
      <T k="mono" up s={9.5} w={700} ls={0.18} c={O.lime}>
        Entregar desde la app
      </T>

      {cfg.archivos ? (
        <View style={{ gap: 8 }}>
          {archivos.map((a) => (
            <View
              key={a.nombre}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                padding: 10,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#262933',
                backgroundColor: '#0E0F13',
              }}>
              <Feather name="file" size={14} color="#8E93A2" />
              <T s={12} c="#E2E4EA" style={{ flex: 1 }} numberOfLines={1}>
                {a.nombre}
              </T>
              {a.tamano ? (
                <T k="mono" s={10} c="#6C707F">
                  {formatoTamano(a.tamano)}
                </T>
              ) : null}
              <Pressable onPress={() => quitar(a)} hitSlop={8} accessibilityLabel="Quitar archivo">
                <Feather name="x" size={14} color="#8E93A2" />
              </Pressable>
            </View>
          ))}
          <Pressable
            onPress={elegir}
            disabled={entregando || archivos.length >= cfg.maxArchivos}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              paddingVertical: 10,
              borderRadius: 8,
              borderWidth: 1,
              borderStyle: 'dashed',
              borderColor: '#292C36',
              opacity: archivos.length >= cfg.maxArchivos ? 0.5 : 1,
            }}>
            <Feather name="paperclip" size={14} color="#8E93A2" />
            <T k="mono" up s={11} ls={0.05} c="#8E93A2">
              {archivos.length ? 'Añadir otro archivo' : 'Elegir archivo'}
            </T>
          </Pressable>
          <T s={11} lh={16} c="#6C707F">
            {tipos ? `Admite ${tipos}. ` : ''}
            {cfg.maxArchivos > 1 ? `Hasta ${cfg.maxArchivos} archivos. ` : ''}
            {cfg.maxBytes ? `Máximo ${formatoTamano(cfg.maxBytes)} por archivo.` : ''}
          </T>
        </View>
      ) : null}

      {cfg.texto ? (
        <TextInput
          value={texto}
          onChangeText={setTexto}
          placeholder="Escribe aquí tu entrega…"
          placeholderTextColor="#555560"
          multiline
          editable={!entregando}
          style={[
            {
              minHeight: 110,
              padding: 12,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#262933',
              backgroundColor: '#0E0F13',
              color: '#E2E4EA',
              fontSize: 13,
              lineHeight: 20,
              textAlignVertical: 'top',
            },
            Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null,
          ]}
        />
      ) : null}

      <Pressable
        onPress={entregar}
        disabled={!hayAlgo || entregando}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          paddingVertical: 10,
          borderRadius: 999,
          backgroundColor: O.lime,
          opacity: hayAlgo && !entregando ? 1 : 0.4,
        }}>
        {entregando ? (
          <ActivityIndicator size="small" color="#000" />
        ) : (
          <Feather name="upload" size={12} color="#000" />
        )}
        <T k="mono" up s={10} w={700} ls={0.05} c="#000">
          {entregando ? 'Entregando…' : 'Entregar'}
        </T>
      </Pressable>
    </View>
  );
}
