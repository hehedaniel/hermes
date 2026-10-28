/**
 * Buscador en el diseño Obsidiana: archivos y tareas de todas las asignaturas, por nombre.
 * Funciona con lo ya sincronizado, sin conexión. No sale en el diseño de Stitch: sigue su estética.
 */
import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import type { IconoFeather } from '@/components/anden';
import { Etiqueta, O, Punto, T, useMovil, usePadX } from '@/components/obs';
import { MarcoObsidiana } from '@/components/obs-marco';
import { useBusquedaEstado } from '@/lib/busqueda-estado';
import { buscar, type FiltroBusqueda, type ResultadoBusqueda } from '@/lib/busqueda';
import type { Estado } from '@/lib/data';
import { avisar } from '@/lib/dialogo';
import { formatoTamano, useDownloads } from '@/lib/downloads';
import { diaMes } from '@/lib/format';
import { useAsignaturas } from '@/lib/store';
import { useIndiceBusqueda } from '@/lib/use-busqueda';

const ESTADO: Record<Estado, { texto: string; color: string }> = {
  pendiente: { texto: 'Pendiente', color: O.amber },
  borrador: { texto: 'Borrador', color: O.amber },
  entregada: { texto: 'Entregada', color: O.green },
  vencida: { texto: 'Vencida', color: O.red },
};

function iconoArchivo(nombre: string): IconoFeather {
  const ext = nombre.split('.').pop()?.toLowerCase() ?? '';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive';
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) return 'image';
  if (['csv', 'xls', 'xlsx', 'ods'].includes(ext)) return 'grid';
  if (['py', 'ipynb', 'js', 'ts', 'java', 'sql', 'json', 'html', 'css', 'sh'].includes(ext))
    return 'code';
  if (['mp4', 'mov', 'mkv', 'webm'].includes(ext)) return 'video';
  return 'file-text';
}

export function BuscarObsidiana() {
  const movil = useMovil();
  const padX = usePadX(40);
  const { indice, listo } = useIndiceBusqueda();
  const { consulta, setConsulta, focoPendiente } = useBusquedaEstado();
  // Si se llegó escribiendo en la barra lateral, el foco se queda allí
  const [enfocar] = useState(() => !focoPendiente());
  const [filtro, setFiltro] = useState<FiltroBusqueda>('todo');

  const todos = useMemo(() => buscar(indice, consulta, 'todo', 400), [indice, consulta]);
  const tareas = todos.filter((r) => r.tipo === 'tarea');
  const archivos = todos.filter((r) => r.tipo === 'archivo');
  const visibles = (filtro === 'todo' ? todos : filtro === 'tarea' ? tareas : archivos).slice(
    0,
    100,
  );
  const nTareas = indice.filter((r) => r.tipo === 'tarea').length;
  const nArchivos = indice.length - nTareas;
  const hay = consulta.trim().length > 0;

  const chip = (id: FiltroBusqueda, texto: string, n: number) => {
    const activo = filtro === id;
    return (
      <Pressable
        key={id}
        onPress={() => setFiltro(id)}
        accessibilityRole="button"
        accessibilityState={{ selected: activo }}
        style={{
          paddingHorizontal: 14,
          paddingVertical: 6,
          borderRadius: 99,
          borderWidth: 1,
          backgroundColor: activo ? O.limeWash : '#121215',
          borderColor: activo ? O.limeLine : '#212126',
        }}>
        <T k="mono" up s={11} w={600} ls={0.05} c={activo ? O.lime : '#868694'}>
          {texto}
          {hay ? ` · ${n}` : ''}
        </T>
      </Pressable>
    );
  };

  const lista = (items: ResultadoBusqueda[], titulo?: string) =>
    items.length ? (
      <View style={{ gap: 12 }}>
        {titulo ? (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Etiqueta s={10} ls={0.2}>
              {titulo}
            </Etiqueta>
            <T k="mono" s={11} c={O.t4}>
              {items.length}
            </T>
          </View>
        ) : null}
        <View
          style={{
            borderRadius: 12,
            borderWidth: 1,
            borderColor: O.line,
            backgroundColor: O.card,
            overflow: 'hidden',
          }}>
          {items.map((r, i) => (
            <Fila key={r.id} r={r} ultimo={i === items.length - 1} movil={movil} />
          ))}
        </View>
      </View>
    ) : null;

  return (
    <MarcoObsidiana migas={[{ texto: 'Buscar' }]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: padX, paddingVertical: movil ? 24 : 40 }}>
        <View style={{ width: '100%', maxWidth: 880, gap: 28 }}>
          <View style={{ gap: 10 }}>
            <Etiqueta c={O.lime} s={10} ls={0.2}>
              Todas las asignaturas
            </Etiqueta>
            <T k="serif" s={movil ? 34 : 42} lh={movil ? 40 : 48} c={O.white} ls={-0.02}>
              Buscar
            </T>
            <T s={13.5} lh={22} c="#9393A2">
              Archivos y tareas por su nombre. Busca con lo que ya está guardado en este
              dispositivo, sin conexión.
            </T>
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingHorizontal: 16,
              height: 52,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: hay ? O.limeLine : O.line2,
              backgroundColor: O.card,
            }}>
            <Feather name="search" size={18} color={hay ? O.lime : '#656573'} />
            <TextInput
              value={consulta}
              onChangeText={setConsulta}
              placeholder="Nombre de un archivo o de una tarea"
              placeholderTextColor="#5A5A66"
              autoFocus={!movil && enfocar}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              accessibilityLabel="Buscar"
              style={[
                { flex: 1, color: O.white, fontSize: 15, fontFamily: 'Inter_400Regular' },
                { outlineStyle: 'none' } as object,
              ]}
            />
            {hay ? (
              <Pressable
                onPress={() => setConsulta('')}
                hitSlop={10}
                accessibilityLabel="Borrar búsqueda">
                <Feather name="x" size={16} color="#868694" />
              </Pressable>
            ) : null}
          </View>

          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {chip('todo', 'Todo', todos.length)}
            {chip('tarea', 'Tareas', tareas.length)}
            {chip('archivo', 'Archivos', archivos.length)}
          </View>

          {!hay ? (
            <View style={{ gap: 6, paddingTop: 8 }}>
              <T s={13.5} c="#868694">
                {listo
                  ? `Escribe para buscar entre ${nArchivos} archivos y ${nTareas} tareas.`
                  : 'Cargando lo guardado…'}
              </T>
              <T s={12.5} c={O.t4}>
                Vale con varias palabras («taller clasificación») y no importan las tildes. Si falta
                un archivo, abre su asignatura una vez para guardarlo.
              </T>
            </View>
          ) : !visibles.length ? (
            <T s={13.5} c="#868694">
              No hay nada que coincida con «{consulta.trim()}».
            </T>
          ) : filtro === 'todo' ? (
            <View style={{ gap: 28 }}>
              {lista(tareas.slice(0, 50), 'Tareas')}
              {lista(archivos.slice(0, 80), 'Archivos')}
            </View>
          ) : (
            lista(visibles)
          )}
        </View>
      </ScrollView>
    </MarcoObsidiana>
  );
}

function Fila({ r, ultimo, movil }: { r: ResultadoBusqueda; ultimo: boolean; movil: boolean }) {
  const info = useAsignaturas();
  const { abrir, estado } = useDownloads();
  const color = info(r.cursoId).color;
  const esTarea = r.tipo === 'tarea';

  async function pulsar() {
    if (esTarea && r.entregaKey) {
      router.push({ pathname: '/tarea/[key]', params: { key: r.entregaKey } });
      return;
    }
    if (r.archivo) {
      try {
        await abrir(r.archivo);
      } catch (e) {
        avisar('No se pudo abrir', (e as Error).message);
      }
    }
  }

  const est = r.estado ? ESTADO[r.estado] : undefined;
  const bajado = !esTarea && r.archivo ? estado(r.archivo) === 'si' : false;
  const entrega = esTarea && r.fecha ? `Entrega ${diaMes(r.fecha)}` : null;
  const sub = esTarea ? [r.curso, movil ? null : entrega] : [r.curso, r.unidad];

  return (
    <Pressable
      onPress={pulsar}
      accessibilityRole="button"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: ultimo ? 0 : 1,
        borderBottomColor: '#1B1B22',
      }}>
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 9,
          backgroundColor: '#1A1A24',
          borderWidth: 1,
          borderColor: '#292934',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Feather
          name={esTarea ? 'clipboard' : iconoArchivo(r.nombre)}
          size={15}
          color={esTarea ? O.lime : '#A4A4B2'}
        />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
        <T w={600} s={14} c={O.white} numberOfLines={2}>
          {r.nombre}
        </T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <Punto color={color} size={6} />
          <T k="mono" s={10.5} c="#757582" numberOfLines={1} style={{ flexShrink: 1 }}>
            {sub.filter(Boolean).join(' · ')}
          </T>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        {est ? (
          <T k="mono" up s={10} w={600} ls={0.08} c={est.color}>
            {est.texto}
          </T>
        ) : r.archivo ? (
          <T k="mono" s={10.5} c="#757582">
            {formatoTamano(r.archivo.size)}
          </T>
        ) : null}
        {movil && entrega ? (
          <T k="mono" s={10} c="#757582">
            {entrega}
          </T>
        ) : null}
        {!esTarea ? (
          <Feather
            name={bajado ? 'check' : 'eye'}
            size={14}
            color={bajado ? '#84CC16' : '#656573'}
          />
        ) : movil ? null : (
          <Feather name="chevron-right" size={14} color="#656573" />
        )}
      </View>
    </Pressable>
  );
}
