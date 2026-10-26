import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { FilaRail, Marca, Seccion } from '@/components/anden';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Vacio } from '@/components/vacio';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
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

export default function NovedadesScreen() {
  const { novedades, client, snapshot, marcarLeidas, recargarNovedades } = useMoodle();
  const ahora = useNow();
  const theme = useTheme();

  // Al entrar se recoge lo que haya encontrado el segundo plano; al salir, queda como leído
  useFocusEffect(
    useCallback(() => {
      recargarNovedades();
      return () => {
        marcarLeidas();
      };
    }, [marcarLeidas, recargarNovedades]),
  );

  const grupos = useMemo(() => {
    const hoy = dayKey(new Date(ahora));
    const ayer = dayKey(new Date(ahora - 86400000));
    const map = new Map<string, Novedad[]>();
    for (const n of novedades) {
      const k = dayKey(new Date(n.fecha));
      map.set(k, [...(map.get(k) ?? []), n]);
    }
    return [...map.entries()].map(([k, items]) => {
      const [y, m, d] = k.split('-').map(Number);
      const titulo = k === hoy ? 'Hoy' : k === ayer ? 'Ayer' : fechaLarga(new Date(y, m - 1, d));
      return { titulo, items };
    });
  }, [novedades, ahora]);

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
      title="Novedades"
      etiqueta={`Todo el curso · ${snapshot?.courses.length ?? 0} asignaturas`}
      derecha={sinLeer ? `${sinLeer} sin leer` : 'al día'}
      derechaColor={sinLeer ? theme.brand : undefined}>
      {novedades.length === 0 ? (
        <Vacio
          icono="bell"
          titulo="Todo al día"
          texto={
            snapshot
              ? 'Aquí aparecerá lo que cambie en tus asignaturas: apuntes nuevos, entregas, notas y cambios de fecha.'
              : 'Sincronizando por primera vez…'
          }
        />
      ) : null}
      {grupos.map((g, i) => (
        <View key={g.titulo}>
          <Seccion
            numero={i + 1}
            titulo={g.titulo}
            derecha={String(g.items.length)}
          />
          {g.items.map((n) => (
            <NovedadRow key={n.id} novedad={n} ahora={ahora} />
          ))}
        </View>
      ))}
      {sinLeer ? (
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

function NovedadRow({ novedad: n, ahora }: { novedad: Novedad; ahora: number }) {
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
});

