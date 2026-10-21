import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { ArchivoRow } from '@/components/archivo-row';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { archivosDe, type Bloque, type Modulo } from '@/lib/contents';
import { formatoTamano, useDownloads } from '@/lib/downloads';
import { useCourseContents } from '@/lib/use-course-contents';

const ICONO_TIPO: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  assign: 'assignment',
  quiz: 'quiz',
  forum: 'forum',
  url: 'link',
  page: 'article',
  scorm: 'school',
  folder: 'folder',
  resource: 'insert-drive-file',
  book: 'menu-book',
  lesson: 'menu-book',
  choice: 'how-to-vote',
  feedback: 'rate-review',
  h5pactivity: 'extension',
};

export default function CursoScreen() {
  const { id, nombre } = useLocalSearchParams<{
    id: string;
    nombre?: string;
  }>();
  const cursoId = Number(id);
  const { contenido, cargando, error, recargar } = useCourseContents(cursoId);
  const { guardaArchivos, estado, descargarVarios } = useDownloads();
  const theme = useTheme();
  const [progreso, setProgreso] = useState<{
    hechos: number;
    total: number;
  } | null>(null);

  const archivos = contenido ? archivosDe(contenido) : [];
  const faltan = archivos.filter((a) => estado(a) === 'no' || estado(a) === 'desactualizado');
  const bytesFaltan = faltan.reduce((s, a) => s + a.size, 0);

  async function descargarTodo() {
    setProgreso({ hechos: 0, total: faltan.length });
    const r = await descargarVarios(faltan, (hechos, total) => setProgreso({ hechos, total }));
    setProgreso(null);
    if (r.fallos)
      Alert.alert(
        'Descarga terminada',
        `${r.ok} descargados, ${r.fallos} con error. Vuelve a intentarlo.`,
      );
  }

  return (
    <>
      <Stack.Screen options={{ title: nombre ?? 'Asignatura' }} />
      <Screen refreshing={cargando} onRefresh={recargar}>
        {error ? (
          <ThemedText type="small" style={{ color: theme.vencida }}>
            {error}
          </ThemedText>
        ) : null}
        {!contenido && cargando ? (
          <ActivityIndicator color={theme.accent} style={{ marginTop: 40 }} />
        ) : null}

        {contenido && guardaArchivos ? (
          <View style={[styles.descargas, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="small" themeColor="textSecondary">
              {archivos.length} archivos ·{' '}
              {faltan.length
                ? `${faltan.length} sin descargar (${formatoTamano(bytesFaltan)})`
                : 'todo descargado en el móvil ✓'}
            </ThemedText>
            {faltan.length ? (
              <Button
                title={
                  progreso ? `Descargando ${progreso.hechos}/${progreso.total}…` : 'Descargar todo'
                }
                onPress={descargarTodo}
                loading={false}
                disabled={!!progreso}
              />
            ) : null}
          </View>
        ) : null}

        {contenido?.bloques.map((b) => (
          <BloqueView key={b.id} bloque={b} />
        ))}
      </Screen>
    </>
  );
}

function BloqueView({ bloque }: { bloque: Bloque }) {
  const theme = useTheme();
  const [abierto, setAbierto] = useState(true);
  return (
    <View style={[styles.bloque, { backgroundColor: theme.backgroundElement }]}>
      <Pressable onPress={() => setAbierto((v) => !v)} style={styles.bloqueHeader}>
        <ThemedText type="smallBold" style={styles.bloqueTitulo}>
          {String(bloque.numero).padStart(2, '0')} · {bloque.nombre}
        </ThemedText>
        <MaterialIcons
          name={abierto ? 'expand-less' : 'expand-more'}
          size={22}
          color={theme.textSecondary}
        />
      </Pressable>
      {abierto ? (
        <View style={[styles.bloqueBody, { borderTopColor: theme.border }]}>
          {bloque.modulos.map((m) => (
            <ModuloView key={m.cmid} modulo={m} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function ModuloView({ modulo }: { modulo: Modulo }) {
  const theme = useTheme();

  // Un recurso con un solo archivo: basta con la fila del archivo
  if (modulo.tipo === 'resource' && modulo.archivos.length === 1) {
    return <ArchivoRow archivo={modulo.archivos[0]} />;
  }

  const onPress = () => {
    if (modulo.entregaKey)
      router.push({
        pathname: '/tarea/[key]',
        params: { key: modulo.entregaKey },
      });
    else if (modulo.enlace) WebBrowser.openBrowserAsync(modulo.enlace);
    else if (modulo.url) WebBrowser.openBrowserAsync(modulo.url);
  };

  return (
    <View>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.modulo, { opacity: pressed ? 0.6 : 1 }]}>
        <MaterialIcons name={ICONO_TIPO[modulo.tipo] ?? 'widgets'} size={22} color={theme.accent} />
        <ThemedText type="small" style={styles.flex} numberOfLines={3}>
          {modulo.nombre}
        </ThemedText>
        {modulo.archivos.length === 0 ? (
          <MaterialIcons
            name={modulo.entregaKey ? 'chevron-right' : 'open-in-new'}
            size={18}
            color={theme.textSecondary}
          />
        ) : null}
      </Pressable>
      {modulo.archivos.length ? (
        <View style={styles.indent}>
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
  descargas: { borderRadius: 14, padding: Spacing.three, gap: Spacing.two },
  bloque: { borderRadius: 14, overflow: 'hidden' },
  bloqueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three - 4,
    gap: Spacing.two,
  },
  bloqueTitulo: { flex: 1 },
  bloqueBody: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  modulo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    paddingVertical: 10,
  },
  indent: { paddingLeft: 34 },
});
