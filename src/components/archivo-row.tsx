import Feather from '@expo/vector-icons/Feather';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { Marca, TipoArchivo } from '@/components/anden';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import type { Archivo } from '@/lib/data';
import { avisar } from '@/lib/dialogo';
import { formatoTamano, useDownloads } from '@/lib/downloads';
import { claveArchivo } from '@/lib/novedades';
import { abrirCon, extension, mimeDe } from '@/lib/open-file';
import { useMoodle } from '@/lib/store';

/**
 * Fila de un archivo: tipo, nombre, tamaño y su estado en el móvil (descargado, descargando,
 * versión nueva o por descargar). Tocar = abrir (descargándolo antes si hace falta);
 * mantener = opciones. En la web se abre en una pestaña nueva.
 */
export function ArchivoRow({ archivo, sinRegla }: { archivo: Archivo; sinRegla?: boolean }) {
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

  async function bajar() {
    try {
      await descargar(archivo);
    } catch (e) {
      avisar('No se pudo descargar', (e as Error).message);
    }
  }

  function opciones() {
    const file = archivoLocal(archivo);
    Alert.alert(archivo.nombre, formatoTamano(archivo.size), [
      ...(file
        ? [
            { text: 'Abrir con otra app', onPress: () => abrirCon(file, mimeDe(archivo)) },
            {
              text: 'Borrar del móvil',
              style: 'destructive' as const,
              onPress: () => borrar(archivo),
            },
          ]
        : [{ text: 'Descargar', onPress: bajar }]),
      { text: 'Cerrar', style: 'cancel' as const },
    ]);
  }

  const estadoDerecha = !guardaArchivos ? (
    <View style={styles.estado}>
      <Feather name="external-link" size={12} color={theme.ink2} />
      <ThemedText type="label" themeColor="ink2" style={styles.estadoTexto}>
        Abrir
      </ThemedText>
    </View>
  ) : st === 'descargando' ? (
    <View style={styles.estado}>
      <ActivityIndicator size="small" color={theme.brand} />
    </View>
  ) : st === 'si' ? (
    <View style={styles.estado}>
      <Feather name="check" size={12} color={theme.stDone} />
      <ThemedText type="label" style={[styles.estadoTexto, { color: theme.stDone }]}>
        Descargado
      </ThemedText>
    </View>
  ) : st === 'desactualizado' ? (
    <Pressable onPress={bajar} hitSlop={8} style={styles.estadoCol} accessibilityRole="button">
      <View style={styles.estado}>
        <Feather name="alert-triangle" size={12} color={theme.urgent} />
        <ThemedText type="label" style={[styles.estadoTexto, { color: theme.urgent }]}>
          Versión nueva
        </ThemedText>
      </View>
      <Feather name="download" size={15} color={theme.ink2} />
    </Pressable>
  ) : (
    <Pressable onPress={bajar} hitSlop={8} style={styles.estado} accessibilityRole="button">
      <Feather name="download" size={12} color={theme.ink2} />
      <ThemedText type="label" themeColor="ink2" style={styles.estadoTexto}>
        Descargar
      </ThemedText>
    </Pressable>
  );

  return (
    <Pressable
      onPress={abrir}
      onLongPress={guardaArchivos ? opciones : undefined}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.row,
        !sinRegla && { borderBottomWidth: 1, borderBottomColor: theme.line },
        { opacity: pressed ? 0.6 : 1 },
      ]}>
      <TipoArchivo ext={ext} />
      <View style={styles.text}>
        <ThemedText style={styles.nombre} numberOfLines={2}>
          {archivo.ruta ? `${archivo.ruta}/` : ''}
          {archivo.nombre}
        </ThemedText>
        <View style={styles.meta}>
          <ThemedText type="meta" themeColor="ink3">
            {formatoTamano(archivo.size)}
          </ThemedText>
          {esNuevo ? <Marca texto="Nuevo" color={theme.brand} fondo={theme.brandWash} /> : null}
        </View>
      </View>
      {estadoDerecha}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  text: { flex: 1, gap: 2 },
  nombre: { fontSize: 14.5, lineHeight: 19, fontWeight: 500 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  estado: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 24 },
  estadoCol: { alignItems: 'flex-end', gap: 4 },
  estadoTexto: { fontSize: 9.5, letterSpacing: 0.8 },
});
