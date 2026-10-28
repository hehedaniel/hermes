import Feather from '@expo/vector-icons/Feather';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { FilaRail, Marca, Seccion } from '@/components/anden';
import { Button, Segmented } from '@/components/button';
import { NovedadesObsidiana } from '@/components/novedades-obsidiana';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Vacio } from '@/components/vacio';
import { ANCHO_ESCRITORIO } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme, useThemePreference } from '@/hooks/use-theme';
import { avisar } from '@/lib/dialogo';
import { useDownloads } from '@/lib/downloads';
import { dayKey, fechaLarga, haceCuanto, hora } from '@/lib/format';
import type { Novedad, TipoNovedad } from '@/lib/novedades';
import { useAsignaturas, useMoodle } from '@/lib/store';

const ETIQUETA: Record<TipoNovedad, string> = {
  archivo: 'Apunte nuevo',
  'archivo-actualizado': 'Archivo actualizado',
  actividad: 'Actividad nueva',
  tarea: 'Tarea nueva',
  nota: 'Nota publicada',
  fecha: 'Cambio de fecha',
};

function NovedadesClasico() {
  const { novedades, client, snapshot, marcarLeidas, recargarNovedades } = useMoodle();
  const ahora = useNow();
  const theme = useTheme();
  const { tema } = useThemePreference();
  const { width } = useWindowDimensions();
  const [soloNoLeidas, setSoloNoLeidas] = useState(false);
  const nocturnoWeb = Platform.OS === 'web' && width >= ANCHO_ESCRITORIO && tema === 'nocturno';
  const nocturnoMovil = width < ANCHO_ESCRITORIO && tema === 'nocturno';
  const cuadernoMovil = width < ANCHO_ESCRITORIO && tema === 'cuaderno';
  const cuadernoWeb =
    Platform.OS === 'web' && width >= ANCHO_ESCRITORIO && tema === 'cuaderno';
  const cuadernoDesign = cuadernoMovil || cuadernoWeb;
  const nocturnoDesign = nocturnoWeb || nocturnoMovil || cuadernoDesign;

  // Al entrar se recoge lo que haya encontrado el segundo plano; al salir, queda como leído
  useFocusEffect(
    useCallback(() => {
      recargarNovedades();
      return () => {
        marcarLeidas();
      };
    }, [marcarLeidas, recargarNovedades]),
  );

  const visibles = useMemo(
    () => (soloNoLeidas ? novedades.filter((n) => !n.leida) : novedades),
    [novedades, soloNoLeidas],
  );
  const grupos = useMemo(() => {
    const hoy = dayKey(new Date(ahora));
    const ayer = dayKey(new Date(ahora - 86400000));
    const map = new Map<string, Novedad[]>();
    for (const n of visibles) {
      const k = dayKey(new Date(n.fecha));
      map.set(k, [...(map.get(k) ?? []), n]);
    }
    return [...map.entries()].map(([k, items]) => {
      const [y, m, d] = k.split('-').map(Number);
      const fecha = `${d} ${new Date(y, m - 1, d).toLocaleDateString('es-ES', { month: 'short' })}`;
      const titulo = k === hoy ? `Hoy · ${fecha}` : k === ayer ? `Ayer · ${fecha}` : fechaLarga(new Date(y, m - 1, d));
      return { titulo, items };
    });
  }, [visibles, ahora]);

  if (!client) {
    return (
      <Screen title="Novedades" refreshable={false}>
        <Vacio
          icono="bell"
          tono="neutro"
          titulo="Conecta tu Moodle"
          texto="Inicia sesión en Ajustes para ver lo que va cambiando en tus asignaturas."
          accion={
            <Button
              title="Ir a Ajustes"
              variant="secondary"
              compacto
              icono="arrow-right"
              onPress={() => router.navigate('/ajustes')}
            />
          }
        />
      </Screen>
    );
  }

  const sinLeer = novedades.filter((n) => !n.leida).length;

  return (
    <Screen
      title={nocturnoWeb || nocturnoMovil ? undefined : 'Novedades'}
      etiqueta={cuadernoDesign ? undefined : `Todo el curso · ${snapshot?.courses.length ?? 0} asignaturas`}
      derecha={cuadernoDesign ? ' ' : sinLeer ? `${sinLeer} sin leer` : 'al día'}
      derechaColor={sinLeer ? theme.brand : undefined}
      maxWidth={nocturnoWeb || cuadernoDesign ? 960 : undefined}
      sinEspacioInicial={nocturnoWeb || nocturnoMovil}>
      {nocturnoWeb || nocturnoMovil ? (
        <View
          style={[
            styles.nocturnoCabecera,
            (nocturnoMovil || cuadernoMovil) && styles.nocturnoCabeceraMovil,
          ]}>
          <ThemedText type="meta" themeColor="ink2">
            Todo el curso · {snapshot?.courses.length ?? 0} asignaturas
          </ThemedText>
          <ThemedText type="display" style={styles.nocturnoTitulo}>
            Novedades
          </ThemedText>
          <ThemedText type="small" themeColor="ink2">
            {sinLeer ? `${sinLeer} sin leer` : 'Estás al día'}
          </ThemedText>
        </View>
      ) : null}
      {cuadernoDesign ? (
        <View style={styles.cuadernoIntro}>
          <ThemedText type="small" themeColor="ink2">
            Lo nuevo desde tu última visita.
          </ThemedText>
          <Segmented
            value={soloNoLeidas ? 'no-leidas' : 'todas'}
            onChange={(value) => setSoloNoLeidas(value === 'no-leidas')}
            options={[
              { value: 'todas', label: 'Todas' },
              { value: 'no-leidas', label: `No leídas · ${sinLeer}` },
            ]}
          />
        </View>
      ) : null}
      {visibles.length === 0 ? (
        <Vacio
          icono="bell"
          titulo={soloNoLeidas ? 'No tienes novedades sin leer' : 'Todo al día'}
          texto={
            snapshot
              ? 'Aquí aparecerá lo que cambie en tus asignaturas: apuntes nuevos, entregas, notas y cambios de fecha.'
              : 'Sincronizando por primera vez…'
          }
        />
      ) : null}
      {grupos.map((g, i) => (
        <View key={g.titulo}>
          {cuadernoDesign ? (
            <View style={styles.cuadernoGroupTitle}>
              <ThemedText type="smallBold" themeColor="ink2">
                {g.titulo}
              </ThemedText>
            </View>
          ) : (
            <Seccion
              numero={nocturnoDesign ? undefined : i + 1}
              titulo={g.titulo}
              derecha={nocturnoDesign ? undefined : String(g.items.length)}
            />
          )}
          {g.items.map((n) => (
            <NovedadRow
              key={n.id}
              novedad={n}
              ahora={ahora}
              nocturnoWeb={nocturnoWeb || nocturnoMovil}
              cuaderno={cuadernoDesign}
            />
          ))}
        </View>
      ))}
      {sinLeer && !cuadernoDesign ? (
        <View style={styles.leidas}>
          <Button
            title="Marcar todo como leído"
            variant="ghost"
            compacto
            icono="check"
            onPress={marcarLeidas}
          />
        </View>
      ) : null}
    </Screen>
  );
}

/** «hace 12 min», «ayer · 18:40», «hoy 09:14»… */
function cuando(ms: number, ahora: number) {
  const k = dayKey(new Date(ms));
  if (k === dayKey(new Date(ahora))) {
    return ahora - ms < 6 * 3600000 ? haceCuanto(ms, ahora) : `hoy ${hora(new Date(ms))}`;
  }
  if (k === dayKey(new Date(ahora - 86400000))) return `ayer · ${hora(new Date(ms))}`;
  return hora(new Date(ms));
}

function NovedadRow({
  novedad: n,
  ahora,
  nocturnoWeb,
  cuaderno,
}: {
  novedad: Novedad;
  ahora: number;
  nocturnoWeb: boolean;
  cuaderno?: boolean;
}) {
  const theme = useTheme();
  const info = useAsignaturas()(n.cursoId, n.curso);
  const { abrir: abrirArchivo } = useDownloads();

  async function abrir() {
    try {
      if (n.archivo) {
        await abrirArchivo(n.archivo);
      } else if (n.entregaKey) {
        router.push({ pathname: '/tarea/[key]', params: { key: n.entregaKey } });
      } else {
        router.push({
          pathname: '/curso/[id]',
          params: { id: String(n.cursoId), nombre: n.curso },
        });
      }
    } catch (e) {
      avisar('No se pudo abrir', (e as Error).message);
    }
  }

  if (nocturnoWeb) {
    const icono =
      n.tipo === 'archivo' || n.tipo === 'archivo-actualizado'
        ? 'file-text'
        : n.tipo === 'nota'
          ? 'check-circle'
          : n.tipo === 'fecha'
            ? 'calendar'
            : 'plus';
    const color =
      n.tipo === 'nota'
        ? theme.stDone
        : n.tipo === 'fecha'
          ? theme.stDraft
          : n.tipo === 'archivo' || n.tipo === 'archivo-actualizado'
            ? theme.stPend
            : theme.brand;
    return (
      <Pressable
        onPress={abrir}
        accessibilityRole="button"
        accessibilityLabel={`${ETIQUETA[n.tipo]}: ${n.titulo}`}
        style={({ pressed }) => [
          styles.nocturnoNovedad,
          {
            backgroundColor: theme.surface,
            borderColor: theme.line,
            opacity: pressed ? 0.8 : 1,
          },
        ]}>
        <View style={[styles.nocturnoIcono, { backgroundColor: `${color}22` }]}>
          <Feather name={icono} size={16} color={color} />
        </View>
        <View style={styles.nocturnoNovedadCuerpo}>
          <ThemedText
            type="small"
            style={[styles.nocturnoNovedadTitulo, n.leida && { color: theme.ink2 }]}
            numberOfLines={2}>
            {n.titulo}
          </ThemedText>
          <ThemedText type="meta" themeColor="ink2" numberOfLines={2}>
            {info.nombre} · {ETIQUETA[n.tipo]}
            {n.detalle ? ` · ${n.detalle}` : ''}
          </ThemedText>
        </View>
        <View style={styles.nocturnoNovedadFinal}>
          {!n.leida ? <View style={[styles.nocturnoPunto, { backgroundColor: theme.stPend }]} /> : null}
          <ThemedText type="meta" themeColor="ink3">
            {cuando(n.fecha, ahora)}
          </ThemedText>
        </View>
      </Pressable>
    );
  }

  if (cuaderno) {
    const icono =
      n.tipo === 'archivo' || n.tipo === 'archivo-actualizado'
        ? 'file-text'
        : n.tipo === 'nota'
          ? 'check'
          : n.tipo === 'fecha'
            ? 'calendar'
            : 'plus';
    const color =
      n.tipo === 'nota'
        ? theme.stDone
        : n.tipo === 'fecha'
          ? theme.stDraft
          : n.tipo === 'archivo' || n.tipo === 'archivo-actualizado'
            ? theme.stPend
            : theme.brand;
    return (
      <Pressable
        onPress={abrir}
        accessibilityRole="button"
        accessibilityLabel={`${ETIQUETA[n.tipo]}: ${n.titulo}`}
        style={({ pressed }) => [
          styles.cuadernoNovedad,
          {
            backgroundColor: n.leida ? theme.surface : theme.brandWash,
            borderColor: n.leida ? theme.line : theme.brand,
            opacity: pressed ? 0.8 : 1,
          },
        ]}>
        <View style={[styles.cuadernoIcono, { backgroundColor: theme.paper2 }]}>
          <Feather name={icono} size={15} color={color} />
        </View>
        <View style={styles.cuadernoNovedadBody}>
          <ThemedText type="smallBold" numberOfLines={2}>
            {n.titulo}
          </ThemedText>
          <ThemedText type="meta" themeColor="ink2" numberOfLines={2}>
            {info.siglas} · {cuando(n.fecha, ahora)}
          </ThemedText>
          {n.detalle ? (
            <ThemedText type="meta" themeColor="ink2" numberOfLines={2}>
              {n.detalle}
            </ThemedText>
          ) : null}
        </View>
        {!n.leida ? <View style={[styles.cuadernoUnread, { backgroundColor: theme.brand }]} /> : null}
      </Pressable>
    );
  }

  return (
    <FilaRail color={info.color} apagada={n.leida} onPress={abrir}>
      <View style={styles.linea}>
        <View style={styles.siglas}>
          {!n.leida ? <View style={[styles.punto, { backgroundColor: theme.brand }]} /> : null}
          <ThemedText type="label" style={{ color: info.color, letterSpacing: 1 }}>
            {info.siglas}
          </ThemedText>
        </View>
        <ThemedText type="small" themeColor="ink2">
          {cuando(n.fecha, ahora)}
        </ThemedText>
      </View>
      <ThemedText
        style={[styles.titulo, n.leida ? { fontWeight: 400, color: theme.ink2 } : null]}
        numberOfLines={3}>
        {n.titulo}
      </ThemedText>
      <View style={styles.linea2}>
        <Marca
          texto={ETIQUETA[n.tipo]}
          borde={n.tipo !== 'nota'}
          color={n.tipo === 'nota' ? theme.stDone : undefined}
          fondo={n.tipo === 'nota' ? theme.stDoneW : undefined}
        />
        {n.detalle ? (
          <ThemedText type="meta" themeColor="ink3" numberOfLines={2} style={styles.flex}>
            {n.detalle}
          </ThemedText>
        ) : null}
      </View>
    </FilaRail>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  linea: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  siglas: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  punto: { width: 6, height: 6, borderRadius: 3 },
  titulo: { fontSize: 15.5, lineHeight: 21, fontWeight: 600 },
  linea2: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 2 },
  leidas: { alignItems: 'center', paddingTop: 8 },
  nocturnoCabecera: { gap: 3, marginBottom: 8, paddingTop: 20 },
  nocturnoCabeceraMovil: { paddingTop: 4, marginBottom: 2 },
  nocturnoTitulo: { fontSize: 28, lineHeight: 34 },
  nocturnoNovedad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 76,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  nocturnoIcono: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nocturnoNovedadCuerpo: { flex: 1, gap: 3 },
  nocturnoNovedadTitulo: { fontWeight: 600 },
  nocturnoNovedadFinal: { alignItems: 'flex-end', gap: 5 },
  nocturnoPunto: { width: 7, height: 7, borderRadius: 4 },
  cuadernoIntro: { gap: 12, marginBottom: 4 },
  cuadernoGroupTitle: { marginTop: 10, marginBottom: 3 },
  cuadernoNovedad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 11,
    marginVertical: 4,
  },
  cuadernoIcono: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cuadernoNovedadBody: { flex: 1, minWidth: 0, gap: 3 },
  cuadernoUnread: { width: 7, height: 7, borderRadius: 4 },
});

export default function NovedadesScreen() {
  const { tema } = useThemePreference();
  const { client } = useMoodle();
  if (tema === 'obsidiana' && client) return <NovedadesObsidiana />;
  return <NovedadesClasico />;
}
