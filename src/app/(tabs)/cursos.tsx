import { router } from 'expo-router';
import { Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Cifras, FilaRail } from '@/components/anden';
import { CursosObsidiana } from '@/components/cursos-obsidiana';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Vacio } from '@/components/vacio';
import { ANCHO_ESCRITORIO } from '@/constants/theme';
import { useTheme, useThemePreference } from '@/hooks/use-theme';
import type { Entrega } from '@/lib/data';
import { useDownloads } from '@/lib/downloads';
import { useAsignaturas, useMoodle } from '@/lib/store';

/** Lo que se ve a la derecha de cada asignatura: lo más urgente que tiene. */
function resumenDe(entregas: Entrega[]) {
  const vencidas = entregas.filter((e) => e.estado === 'vencida').length;
  const pendientes = entregas.filter((e) => e.estado === 'pendiente').length;
  const borradores = entregas.filter((e) => e.estado === 'borrador').length;
  if (vencidas)
    return { texto: `${vencidas} ${vencidas === 1 ? 'vencida' : 'vencidas'}`, alerta: true };
  if (pendientes)
    return { texto: `${pendientes} ${pendientes === 1 ? 'entrega' : 'entregas'}`, alerta: false };
  if (borradores)
    return {
      texto: `${borradores} ${borradores === 1 ? 'borrador' : 'borradores'}`,
      alerta: false,
    };
  return { texto: 'Sin pendientes', alerta: false };
}

export default function CursosScreen() {
  const { snapshot, client } = useMoodle();
  const { resumen, guardaArchivos } = useDownloads();
  const theme = useTheme();
  const { tema } = useThemePreference();
  const { width } = useWindowDimensions();
  const info = useAsignaturas();

  if (tema === 'obsidiana' && client) return <CursosObsidiana />;

  if (!client) {
    return (
      <Screen title="Asignaturas" refreshable={false}>
        <Vacio
          icono="book-open"
          tono="neutro"
          titulo="Conecta tu Moodle"
          texto="Inicia sesión en Ajustes para ver tus asignaturas, sus apuntes y sus entregas."
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

  const cursos = [...(snapshot?.courses ?? [])]
    .map((c) => ({ c, a: info(c.id, c.fullname) }))
    .sort((x, y) => x.a.siglas.localeCompare(y.a.siglas, 'es'));
  const entregas = snapshot?.entregas ?? [];
  const nocturnoWeb =
    Platform.OS === 'web' && width >= ANCHO_ESCRITORIO && tema === 'nocturno';
  const nocturnoMovil = width < ANCHO_ESCRITORIO && tema === 'nocturno';
  const cuadernoMovil = width < ANCHO_ESCRITORIO && tema === 'cuaderno';
  const cuadernoWeb =
    Platform.OS === 'web' && width >= ANCHO_ESCRITORIO && tema === 'cuaderno';
  const cuadernoDesign = cuadernoMovil || cuadernoWeb;
  const nocturnoDesign = nocturnoWeb || nocturnoMovil || cuadernoDesign;

  if (nocturnoDesign) {
    return (
      <Screen
        title={cuadernoDesign ? 'Asignaturas' : undefined}
        derecha={cuadernoDesign ? ' ' : undefined}
        refreshable
        sinEspacioInicial={!cuadernoDesign}
        maxWidth={nocturnoWeb || (tema === 'cuaderno' && width >= ANCHO_ESCRITORIO) ? 960 : undefined}
        contentStyle={[
          styles.nocturnoContenido,
          nocturnoMovil && styles.nocturnoContenidoMovil,
          cuadernoDesign && styles.cuadernoCursosContent,
        ]}>
        {cuadernoDesign ? (
          <ThemedText type="small" themeColor="ink2">
            Tus {cursos.length} espacios de trabajo.
          </ThemedText>
        ) : (
          <View style={styles.nocturnoCabecera}>
          <ThemedText type="meta" themeColor="ink2">
            Este cuatrimestre
          </ThemedText>
          <ThemedText type="display" style={styles.nocturnoTitulo}>
            Asignaturas
          </ThemedText>
          <ThemedText type="small" themeColor="ink2">
            {cuadernoMovil
              ? `Tus ${cursos.length} espacios de trabajo.`
              : `${cursos.length} asignaturas · ${entregas.filter((e) => e.estado !== 'entregada').length} entregas pendientes`}
          </ThemedText>
          </View>
        )}
        <View
          style={[
            styles.nocturnoGrid,
            (nocturnoMovil || cuadernoMovil) && styles.nocturnoGridMovil,
          ]}>
          {cursos.map(({ c, a }) => {
            const delCurso = entregas.filter((e) => e.cursoId === c.id);
            const pendientes = delCurso.filter((e) => e.estado !== 'entregada');
            const vencidas = pendientes.filter((e) => e.estado === 'vencida').length;
            return (
              <Pressable
                key={c.id}
                accessibilityRole="button"
                onPress={() =>
                  router.push({
                    pathname: '/curso/[id]',
                    params: { id: String(c.id), nombre: c.fullname },
                  })
                }
                style={({ pressed }) => [
                  styles.nocturnoCurso,
                  (nocturnoMovil || cuadernoMovil) && styles.nocturnoCursoMovil,
                  cuadernoDesign && styles.cuadernoCurso,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.line,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}>
                  <View
                    style={[
                      cuadernoDesign ? styles.cuadernoCursoRail : styles.nocturnoCursoRail,
                      { backgroundColor: a.color },
                    ]}
                  />
                  <ThemedText type="smallBold" style={styles.nocturnoCursoNombre} numberOfLines={2}>
                    {cuadernoDesign ? `${a.siglas} · ${a.nombre}` : a.nombre}
                  </ThemedText>
                  <ThemedText type="meta" themeColor="ink2" numberOfLines={2}>
                    {cuadernoDesign
                      ? `${a.profesor || 'Asignatura'} · ${pendientes.length} ${pendientes.length === 1 ? 'entrega pendiente' : 'entregas pendientes'}${vencidas ? ` · ${vencidas} ${vencidas === 1 ? 'vencida' : 'vencidas'}` : ''}`
                      : a.profesor || 'Asignatura'}
                  </ThemedText>
                  {!cuadernoDesign ? (
                    <View style={styles.nocturnoMetricas}>
                      <View>
                        <ThemedText type="cifra">{pendientes.length}</ThemedText>
                        <ThemedText type="meta" themeColor="ink2">
                          pendientes
                        </ThemedText>
                      </View>
                      <View>
                        <ThemedText
                          type="cifra"
                          style={vencidas > 0 ? { color: theme.urgent } : undefined}>
                          {vencidas}
                        </ThemedText>
                        <ThemedText type="meta" themeColor="ink2">
                          vencidas
                        </ThemedText>
                      </View>
                    </View>
                  ) : null}
              </Pressable>
            );
          })}
        </View>
      </Screen>
    );
  }

  return (
    <Screen title="Asignaturas" etiqueta="FP IA y Big Data · curso 26-27">
      <Cifras
        items={[
          { n: cursos.length, texto: 'Asignaturas' },
          // {
          //   n: vencidasRecientes,
          //   texto: vencidasRecientes === 1 ? 'Vencida' : 'Vencidas',
          //   alerta: vencidasRecientes > 0,
          // },
          ...(guardaArchivos ? [{ n: resumen.archivos, texto: 'Archivos' }] : []),
        ]}
      />
      <View>
        {cursos.map(({ c, a }) => {
          const r = resumenDe(entregas.filter((e) => e.cursoId === c.id));
          return (
            <FilaRail
              key={c.id}
              color={a.color}
              onPress={() =>
                router.push({
                  pathname: '/curso/[id]',
                  params: { id: String(c.id), nombre: c.fullname },
                })
              }>
              <View style={styles.linea}>
                <ThemedText type="label" style={{ color: a.color, letterSpacing: 1 }}>
                  {a.siglas}
                </ThemedText>
                <ThemedText
                  type="small"
                  style={{
                    color: r.alerta ? theme.urgent : theme.ink2,
                    fontWeight: r.alerta ? 600 : 500,
                  }}>
                  {r.texto}
                </ThemedText>
              </View>
              <ThemedText style={styles.nombre} numberOfLines={2}>
                {a.nombre}
              </ThemedText>
              {a.profesor ? (
                <ThemedText type="meta" themeColor="ink2">
                  {a.profesor}
                </ThemedText>
              ) : null}
            </FilaRail>
          );
        })}
      </View>
      <ThemedText type="meta" themeColor="ink3" style={styles.pie}>
        Cada asignatura conserva su color en toda la app: es su «línea» del tablón.
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  linea: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  nombre: { fontSize: 16, lineHeight: 21, fontWeight: 500 },
  pie: { paddingTop: 8 },
  nocturnoContenido: { gap: 18, paddingTop: 28 },
  nocturnoContenidoMovil: { gap: 12, paddingTop: 12, paddingBottom: 92 },
  nocturnoCabecera: { gap: 3, marginBottom: 8 },
  nocturnoTitulo: { fontSize: 28, lineHeight: 34 },
  nocturnoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  nocturnoGridMovil: { flexDirection: 'column', flexWrap: 'nowrap' },
  nocturnoCurso: {
    width: '48%',
    minHeight: 150,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 5,
    overflow: 'hidden',
  },
  nocturnoCursoMovil: { width: '100%', minHeight: 128 },
  nocturnoCursoRail: { height: 3, position: 'absolute', top: 0, left: 0, right: 0 },
  nocturnoCursoNombre: { fontSize: 16, marginTop: 2 },
  nocturnoMetricas: { flexDirection: 'row', gap: 28, marginTop: 12 },
  cuadernoCurso: {
    minHeight: 0,
    gap: 4,
    padding: 13,
    paddingLeft: 17,
    borderLeftWidth: 4,
    borderTopWidth: 1,
  },
  cuadernoCursoRail: { width: 4, position: 'absolute', top: 0, bottom: 0, left: 0 },
  cuadernoCursosContent: { gap: 12, paddingTop: 8, paddingBottom: 96 },
});
