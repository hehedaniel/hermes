import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Archivo } from '@/lib/data';
import { formatoTamano, useDownloads } from '@/lib/downloads';
import { avisar } from '@/lib/dialogo';
import { claveArchivo } from '@/lib/novedades';
import { abrirCon, extension, mimeDe } from '@/lib/open-file';
import { useMoodle } from '@/lib/store';

const ICONO: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  pdf: 'picture-as-pdf',
  doc: 'description',
  docx: 'description',
  ppt: 'slideshow',
  pptx: 'slideshow',
  xls: 'table-chart',
  xlsx: 'table-chart',
  csv: 'table-chart',
  zip: 'folder-zip',
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  ipynb: 'code',
  py: 'code',
  mp4: 'movie',
};

/**
 * Fila de un archivo: tocar = abrir (descargándolo antes si hace falta); mantener = opciones.
 * En la web se abre en una pestaña nueva.
 */
export function ArchivoRow({ archivo }: { archivo: Archivo }) {
  const theme = useTheme();
  const {
    guardaArchivos,
    abrir: abrirArchivo,
    estado,
    archivoLocal,
    descargar,
    borrar,
  } = useDownloads();
  const { novedades } = useMoodle();
  const k = claveArchivo(archivo.fileurl);
  const esNuevo = novedades.some(
    (n) => !n.leida && n.archivo && claveArchivo(n.archivo.fileurl) === k,
  );
  const st = estado(archivo);
  const ext = extension(archivo.nombre);

  async function abrir() {
    try {
      await abrirArchivo(archivo);
    } catch (e) {
      avisar('No se pudo abrir', (e as Error).message);
    }
  }

  function opciones() {
    const file = archivoLocal(archivo);
    Alert.alert(archivo.nombre, formatoTamano(archivo.size), [
      ...(file
        ? [
            {
              text: 'Abrir con otra app',
              onPress: () => abrirCon(file, mimeDe(archivo)),
            },
            {
              text: 'Borrar del móvil',
              style: 'destructive' as const,
              onPress: () => borrar(archivo),
            },
          ]
        : [
            {
              text: 'Descargar',
              onPress: () => descargar(archivo).catch((e) => Alert.alert('Error', e.message)),
            },
          ]),
      { text: 'Cerrar', style: 'cancel' as const },
    ]);
  }

  return (
    <Pressable
      onPress={abrir}
      onLongPress={guardaArchivos ? opciones : undefined}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}>
      <MaterialIcons
        name={ICONO[ext] ?? 'insert-drive-file'}
        size={22}
        color={theme.textSecondary}
      />
      <View style={styles.text}>
        <ThemedText type="small" numberOfLines={2}>
          {archivo.ruta ? `${archivo.ruta}/` : ''}
          {archivo.nombre}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.meta}>
          {ext.toUpperCase() || 'ARCHIVO'} · {formatoTamano(archivo.size)}
          {st === 'desactualizado' ? ' · hay versión nueva' : ''}
          {esNuevo ? (
            <ThemedText
              type="small"
              style={[styles.meta, { color: theme.accent, fontWeight: 700 }]}>
              {'  '}NUEVO
            </ThemedText>
          ) : null}
        </ThemedText>
      </View>
      {!guardaArchivos ? (
        <MaterialIcons name="open-in-new" size={20} color={theme.accent} />
      ) : st === 'descargando' ? (
        <ActivityIndicator size="small" color={theme.accent} />
      ) : st === 'si' ? (
        <MaterialIcons name="offline-pin" size={22} color={theme.entregada} />
      ) : st === 'desactualizado' ? (
        <MaterialIcons name="sync" size={22} color={theme.borrador} />
      ) : (
        <MaterialIcons name="file-download" size={22} color={theme.accent} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    paddingVertical: 10,
  },
  text: { flex: 1, gap: 1 },
  meta: { fontSize: 12, lineHeight: 16 },
});
