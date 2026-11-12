/** Entregar la tarea desde la app: tus archivos o tu texto, sin pasar por la IA. */
import Feather from '@expo/vector-icons/Feather';
import { ActivityIndicator, Platform, Pressable, TextInput, View } from 'react-native';

import { O, T } from '@/components/obs';
import type { Entrega } from '@/lib/data';
import { formatoTamano } from '@/lib/downloads';
import { useEntregaPropia } from '@/lib/use-entrega-propia';

/** Cambiar o borrar lo que ya entregaste, mientras Moodle lo permita (como «Editar entrega»). */
export function AccionesEntrega({
  entrega,
  onCambiar,
}: {
  entrega: Entrega;
  /** Si se pasa, sale el botón «Cambiar entrega» (en un borrador el formulario ya está a la vista) */
  onCambiar?: () => void;
}) {
  const { borrar, entregando } = useEntregaPropia(entrega);
  const boton = (texto: string, icono: 'edit-2' | 'trash-2', color: string, onPress: () => void) => (
    <Pressable
      onPress={onPress}
      disabled={entregando}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#292C36',
        opacity: entregando ? 0.5 : 1,
      }}>
      <Feather name={icono} size={12} color={color} />
      <T k="mono" up s={10} w={700} ls={0.05} c={color}>
        {texto}
      </T>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {onCambiar ? boton('Cambiar entrega', 'edit-2', '#E2E4EA', onCambiar) : null}
      {boton(entrega.estado === 'borrador' ? 'Borrar borrador' : 'Borrar entrega', 'trash-2', '#F87171', borrar)}
    </View>
  );
}

export function EntregaPropia({
  entrega,
  cambiando,
  onCancelar,
}: {
  entrega: Entrega;
  /** Ya hay una entrega y se está sustituyendo por otra */
  cambiando?: boolean;
  onCancelar?: () => void;
}) {
  const { cfg, archivos, texto, setTexto, elegir, quitar, entregar, entregando, hayAlgo } =
    useEntregaPropia(entrega);
  if (!cfg) return null;
  const tipos = cfg.tipos.length && !cfg.tipos.includes('*') ? cfg.tipos.join(', ') : null;

  return (
    <View style={{ gap: 12 }}>
      <T k="mono" up s={9.5} w={700} ls={0.18} c={O.lime}>
        {cambiando ? 'Cambiar la entrega' : 'Entregar desde la app'}
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
          {entregando ? 'Entregando…' : cambiando ? 'Guardar cambios' : 'Entregar'}
        </T>
      </Pressable>
      {cambiando && onCancelar ? (
        <Pressable
          onPress={onCancelar}
          disabled={entregando}
          style={{ alignItems: 'center', paddingVertical: 6 }}>
          <T k="mono" up s={10} ls={0.05} c="#8E93A2">
            Cancelar
          </T>
        </Pressable>
      ) : null}
    </View>
  );
}
