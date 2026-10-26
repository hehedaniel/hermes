import Feather from '@expo/vector-icons/Feather';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EstadoChip, type IconoFeather, Progreso, Seccion } from '@/components/anden';
import { ArchivoRow } from '@/components/archivo-row';
import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MARGEN, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Archivo } from '@/lib/data';
import { archivosDe, type Bloque, type Modulo } from '@/lib/contents';
import { avisar } from '@/lib/dialogo';
import { formatoTamano, useDownloads } from '@/lib/downloads';
import { diaMesHora } from '@/lib/format';
import { useAsignaturas, useMoodle } from '@/lib/store';
import { useCourseContents } from '@/lib/use-course-contents';

const ICONO_TIPO: Record<string, IconoFeather> = {
  assign: 'clipboard',
  quiz: 'check-square',
  forum: 'message-square',
  url: 'link',
  page: 'file-text',
  scorm: 'play-circle',
  folder: 'folder',
  resource: 'file',
  book: 'book',
  lesson: 'book',
  choice: 'bar-chart-2',
  feedback: 'message-circle',
  h5pactivity: 'box',
};

/** A partir de este ancho, el estado de las descargas va en un panel a la derecha. */
const ANCHO_PANEL = 900;

const peso = (as: Archivo[]) => as.reduce((s, a) => s + (a.size || 0), 0);

export default function CursoScreen() {
  const { id, nombre } = useLocalSearchParams<{ id: string; nombre?: string }>();
  const cursoId = Number(id);
  const { contenido, cargando, error, recargar } = useCourseContents(cursoId);
  const { guardaArchivos, estado, descargarVarios } = useDownloads();
  const { novedades } = useMoodle();
  const theme = useTheme();
  const info = useAsignaturas()(cursoId, nombre);
  const { width } = useWindowDimensions();
  const [progreso, setProgreso] = useState<{ hechos: number; total: number } | null>(null);

  const archivos = contenido ? archivosDe(contenido) : [];
  const faltan = archivos.filter((a) => estado(a) === 'no' || estado(a) === 'desactualizado');
  const descargados = archivos.length - faltan.length;
  const sinLeer = novedades.filter((n) => n.cursoId === cursoId && !n.leida);
  const conPanel = width >= ANCHO_PANEL;

  async function descargarTodo() {
    setProgreso({ hechos: 0, total: faltan.length });
    const r = await descargarVarios(faltan, (hechos, total) => setProgreso({ hechos, total }));
    setProgreso(null);
    if (r.fallos)
      avisar('Descarga terminada', `${r.ok} descargados, ${r.fallos} con error. Vuelve a intentarlo.`);
  }

  const botonDescargar =
    guardaArchivos && faltan.length ? (
      <Button
        title={
          progreso
            ? `Descargando ${progreso.hechos} de ${progreso.total}…`
            : faltan.length === archivos.length
              ? `Descargar los ${faltan.length} archivos (${formatoTamano(peso(faltan))})`
              : `Descargar los ${faltan.length} restantes`
        }
        variant="secondary"
        icono="download"
        onPress={descargarTodo}
        disabled={!!progreso}
      />
    ) : null;

  // En oscuro los colores de asignatura son claros: el texto de la banda va en tinta oscura
  const sobreBanda = theme.paper;

  const banda = (
    <View style={[styles.banda, { backgroundColor: info.color }]}>
      <SafeAreaView edges={['top']}>
        <View style={styles.bandaContenido}>
          <View style={styles.bandaFila}>
            <Pressable
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/cursos'))}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Volver a Asignaturas"
              style={styles.volver}>
              <Feather name="arrow-left" size={18} color={sobreBanda} />
              <ThemedText type="small" style={{ color: sobreBanda, fontWeight: 600 }}>
                Asignaturas
              </ThemedText>
            </Pressable>
            {guardaArchivos && faltan.length && !conPanel ? (
              <Pressable
                onPress={descargarTodo}
                disabled={!!progreso}
                hitSlop={8}
                style={[styles.bandaBoton, { backgroundColor: 'rgba(255,255,255,0.16)' }]}>
                {progreso ? (
                  <ActivityIndicator size="small" color={sobreBanda} />
                ) : (
                  <Feather name="download" size={13} color={sobreBanda} />
                )}
                <ThemedText type="meta" style={{ color: sobreBanda, fontWeight: 600 }}>
                  {progreso ? `${progreso.hechos}/${progreso.total}` : 'Descargar todo'}
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
          <ThemedText type="label" style={{ color: sobreBanda, opacity: 0.85 }}>
            {info.siglas}
          </ThemedText>
          <ThemedText style={[styles.bandaTitulo, { color: sobreBanda }]}>{info.nombre}</ThemedText>
          <ThemedText type="meta" style={{ color: sobreBanda, opacity: 0.85 }}>
            {[
              info.profesor,
              contenido ? `${contenido.bloques.length} bloques` : null,
              contenido ? `${archivos.length} archivos · ${formatoTamano(peso(archivos))}` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </ThemedText>
        </View>
      </SafeAreaView>
    </View>
  );

  const cuerpo = (
    <View style={styles.cuerpo}>
      {error ? (
        <View style={[styles.aviso, { backgroundColor: theme.urgentWash }]}>
          <Feather name="wifi-off" size={14} color={theme.urgent} />
          <ThemedText type="small" style={[styles.flex, { color: theme.urgent }]}>
            {contenido ? `${error} Mostrando lo guardado.` : error}
          </ThemedText>
        </View>
      ) : null}
      {!contenido && cargando ? (
        <ActivityIndicator color={theme.brand} style={styles.cargando} />
      ) : null}
      {contenido?.bloques.map((b) => (
        <BloqueView key={b.id} bloque={b} />
      ))}
      {!conPanel && botonDescargar ? (
        <View style={styles.pie}>
          {botonDescargar}
          <ThemedText type="meta" themeColor="ink3">
            Los archivos se guardan en el móvil para leerlos sin conexión. Al salir de la
            asignatura se mantienen.
          </ThemedText>
        </View>
      ) : null}
    </View>
  );

  const refresco = (
    <RefreshControl
      refreshing={cargando}
      onRefresh={recargar}
      colors={[theme.brand]}
      tintColor={theme.brand}
    />
  );

  if (!conPanel) {
    return (
      <ThemedView style={styles.flex}>
        <ScrollView refreshControl={refresco}>
          {banda}
          {cuerpo}
        </ScrollView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.flex, styles.fila]}>
      <ScrollView style={styles.flex} refreshControl={refresco}>
        {banda}
        {cuerpo}
      </ScrollView>
      <SafeAreaView
        edges={['top']}
        style={[styles.panel, { borderLeftColor: theme.line, backgroundColor: theme.surface2 }]}>
        <ScrollView contentContainerStyle={styles.panelContenido}>
          {guardaArchivos ? (
            <View style={styles.panelBloque}>
              <Seccion titulo="Descargas" sinRegla />
              <View style={styles.cifra}>
                <ThemedText style={styles.cifraN}>{descargados}</ThemedText>
                <ThemedText type="meta" themeColor="ink2">
                  de {archivos.length} archivos
                </ThemedText>
              </View>
              <Progreso valor={archivos.length ? descargados / archivos.length : 0} ancho />
              <ThemedText type="meta" themeColor="ink3">
                {formatoTamano(peso(archivos.filter((a) => !faltan.includes(a))))} de{' '}
                {formatoTamano(peso(archivos))} · sin conexión
              </ThemedText>
              {botonDescargar}
            </View>
          ) : null}
          <View style={styles.panelBloque}>
            <Seccion titulo="Novedades sin leer" derecha={String(sinLeer.length)} sinRegla />
            {sinLeer.length ? (
              sinLeer.slice(0, 6).map((n) => (
                <View key={n.id} style={styles.novedad}>
                  <View style={[styles.punto, { backgroundColor: theme.brand }]} />
                  <ThemedText type="small" style={styles.flex} numberOfLines={2}>
                    {n.titulo}
                  </ThemedText>
                </View>
              ))
            ) : (
              <ThemedText type="meta" themeColor="ink3">
                Todo al día.
              </ThemedText>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function BloqueView({ bloque }: { bloque: Bloque }) {
  const theme = useTheme();
  const [abierto, setAbierto] = useState(true);
  const nArchivos = bloque.modulos.reduce((s, m) => s + m.archivos.length, 0);
  return (
    <View>
      <Pressable
        onPress={() => setAbierto((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: abierto }}
        style={[styles.bloqueCabecera, { borderBottomColor: theme.line }]}>
        <ThemedText type="cifra" themeColor="ink3" style={styles.bloqueNum}>
          {String(bloque.numero).padStart(2, '0')}
        </ThemedText>
        <ThemedText type="smallBold" style={styles.flex} numberOfLines={2}>
          {bloque.nombre}
        </ThemedText>
        <ThemedText type="meta" themeColor="ink3">
          {nArchivos ? `${nArchivos} ${nArchivos === 1 ? 'archivo' : 'archivos'}` : ''}
        </ThemedText>
        <Feather name={abierto ? 'chevron-up' : 'chevron-down'} size={16} color={theme.ink3} />
      </Pressable>
      {abierto
        ? bloque.modulos.map((m) => <ModuloView key={m.cmid} modulo={m} />)
        : null}
    </View>
  );
}

function ModuloView({ modulo }: { modulo: Modulo }) {
  const theme = useTheme();
  const { snapshot } = useMoodle();

  // Un recurso con un solo archivo: basta con la fila del archivo
  if (modulo.tipo === 'resource' && modulo.archivos.length === 1) {
    return <ArchivoRow archivo={modulo.archivos[0]} />;
  }

  const entrega = modulo.entregaKey
    ? snapshot?.entregas.find((e) => e.key === modulo.entregaKey)
    : undefined;

  const onPress = () => {
    if (modulo.entregaKey)
      router.push({ pathname: '/tarea/[key]', params: { key: modulo.entregaKey } });
    else if (modulo.enlace) WebBrowser.openBrowserAsync(modulo.enlace);
    else if (modulo.url) WebBrowser.openBrowserAsync(modulo.url);
  };

  return (
    <View>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.modulo,
          !modulo.archivos.length && { borderBottomWidth: 1, borderBottomColor: theme.line },
          { opacity: pressed ? 0.6 : 1 },
        ]}>
        <View style={styles.moduloIcono}>
          <Feather name={ICONO_TIPO[modulo.tipo] ?? 'box'} size={16} color={theme.ink2} />
        </View>
        <View style={styles.flex}>
          <ThemedText style={styles.moduloNombre} numberOfLines={3}>
            {modulo.nombre}
          </ThemedText>
          {entrega ? (
            <ThemedText type="meta" themeColor="ink3">
              {entrega.fecha ? `Entrega ${diaMesHora(entrega.fecha)}` : 'Sin fecha de entrega'}
            </ThemedText>
          ) : null}
        </View>
        {entrega ? (
          <EstadoChip estado={entrega.estado} />
        ) : modulo.archivos.length === 0 ? (
          <Feather
            name={modulo.entregaKey ? 'chevron-right' : 'external-link'}
            size={15}
            color={theme.ink3}
          />
        ) : null}
      </Pressable>
      {modulo.archivos.length ? (
        <View style={styles.sangria}>
          {modulo.archivos.map((a) => (
            <ArchivoRow key={a.fileurl} archivo={a} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  fila: { flexDirection: 'row' },
  banda: {},
  bandaContenido: {
    paddingHorizontal: MARGEN,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
    gap: 4,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
  bandaFila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  volver: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 32 },
  bandaBoton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radii.control,
  },
  bandaTitulo: { fontSize: 24, lineHeight: 29, fontWeight: 700, letterSpacing: -0.6 },
  cuerpo: {
    paddingHorizontal: MARGEN,
    paddingBottom: Spacing.five,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
    gap: Spacing.two,
  },
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: Radii.control,
    padding: 10,
    marginTop: Spacing.three,
  },
  cargando: { marginTop: 40 },
  bloqueCabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: Spacing.four,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  bloqueNum: { fontSize: 11, minWidth: 16 },
  modulo: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  moduloIcono: { width: 32, alignItems: 'center' },
  moduloNombre: { fontSize: 14.5, lineHeight: 19, fontWeight: 500 },
  sangria: { paddingLeft: 44 },
  pie: { gap: 8, marginTop: Spacing.three },
  panel: { width: 290, borderLeftWidth: 1 },
  panelContenido: { padding: 22, paddingTop: 28, gap: Spacing.four },
  panelBloque: { gap: 8 },
  cifra: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  cifraN: { fontSize: 26, lineHeight: 30, fontWeight: 700, fontVariant: ['tabular-nums'] },
  novedad: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  punto: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
});
