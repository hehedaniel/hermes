import Feather from '@expo/vector-icons/Feather';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Cifras, EstadoChip, FilaRail, Seccion } from '@/components/anden';
import { Button } from '@/components/button';
import { EntregaCard, esUrgente, cuandoDe } from '@/components/entrega-card';
import { Screen } from '@/components/screen';
import { PanelTarea } from '@/components/tarea-detalle';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Vacio } from '@/components/vacio';
import {
  ANCHO_ESCRITORIO,
  ANCHO_TABLETA,
  anchoNavegacion,
  MARGEN,
  Radii,
  Spacing,
} from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme, useThemePreference } from '@/hooks/use-theme';
import type { Entrega } from '@/lib/data';
import { diaMesHora } from '@/lib/format';
import { MODULOS, type ModuloId } from '@/lib/horario';
import { useAsignaturas, useMoodle } from '@/lib/store';

const DIA = 86400;
const ANCHO_LISTA_KEY = 'hermes.pendientes.escritorio.lista';
const ANCHO_LATERAL_KEY = 'hermes.pendientes.escritorio.lateral';
const SECCIONES_PLEGADAS_KEY = 'hermes.pendientes.secciones-plegadas';
/** Entregadas que se ven sin pulsar «Ver todas». */
const ENTREGADAS_VISIBLES = 4;

type Grupo = { titulo: string; items: Entrega[] };
type FiltroPendientes = 'todas' | 'vencidas' | 'semana' | 'despues' | 'entregadas';

function agrupar(entregas: Entrega[], now: number) {
  const abiertas = entregas
    .filter((e) => e.estado !== 'entregada')
    .sort((a, b) => (a.fecha || Infinity) - (b.fecha || Infinity));
  return {
    vencidas: abiertas
      .filter((e) => e.estado === 'vencida' && e.fecha > now - 30 * DIA)
      .sort((a, b) => b.fecha - a.fecha),
    semana: abiertas.filter((e) => e.estado !== 'vencida' && e.fecha && e.fecha <= now + 7 * DIA),
    despues: abiertas.filter((e) => e.estado !== 'vencida' && (!e.fecha || e.fecha > now + 7 * DIA)),
    entregadas: entregas
      .filter((e) => e.estado === 'entregada')
      .sort((a, b) => (b.envio?.fecha ?? b.fecha) - (a.envio?.fecha ?? a.fecha)),
  };
}

export default function PendientesScreen() {
  const { client, snapshot, ready } = useMoodle();
  const { width } = useWindowDimensions();
  const theme = useTheme();
  const { tema } = useThemePreference();
  const nowMs = useNow();
  const [verTodas, setVerTodas] = useState(false);
  const [elegida, setElegida] = useState<string>();
  const [filtro, setFiltro] = useState<FiltroPendientes>('todas');
  const [plegadas, setPlegadas] = useState<Record<string, boolean>>({});
  const [anchoLista, setAnchoLista] = useState(380);
  const [anchoLateral, setAnchoLateral] = useState(280);
  const [anchosCargados, setAnchosCargados] = useState(false);

  const g = useMemo(() => agrupar(snapshot?.entregas ?? [], nowMs / 1000), [snapshot, nowMs]);
  const abiertas = g.vencidas.length + g.semana.length + g.despues.length;
  const urgentes = g.semana.filter((e) => esUrgente(e, nowMs)).length;

  useEffect(() => {
    let activa = true;
    Promise.all([
      AsyncStorage.getItem(ANCHO_LISTA_KEY),
      AsyncStorage.getItem(ANCHO_LATERAL_KEY),
      AsyncStorage.getItem(SECCIONES_PLEGADAS_KEY),
    ])
      .then(([lista, lateral, secciones]) => {
        if (!activa) return;
        const parse = (value: string | null, fallback: number) => {
          if (value === null) return fallback;
          const parsed = Number(value);
          if (!Number.isFinite(parsed) || parsed < 1) {
            throw new Error('La preferencia de ancho de columnas no es válida.');
          }
          return parsed;
        };
        setAnchoLista(parse(lista, 380));
        setAnchoLateral(parse(lateral, 280));
        if (secciones) {
          const valor: unknown = JSON.parse(secciones);
          if (
            typeof valor !== 'object' ||
            valor === null ||
            Array.isArray(valor) ||
            !Object.values(valor).every((plegada) => typeof plegada === 'boolean')
          ) {
            throw new Error('La preferencia de secciones plegadas no es válida.');
          }
          const guardadas = valor as Record<string, boolean>;
          setPlegadas(guardadas);
        }
      })
      .catch((error: unknown) =>
        console.error('No se pudieron leer los anchos de columnas.', error),
      )
      .finally(() => {
        if (activa) setAnchosCargados(true);
      });
    return () => {
      activa = false;
    };
  }, []);

  const alternarPlegada = (clave: string) => {
    const nuevas = { ...plegadas, [clave]: !plegadas[clave] };
    setPlegadas(nuevas);
    AsyncStorage.setItem(SECCIONES_PLEGADAS_KEY, JSON.stringify(nuevas)).catch(
      (error: unknown) => console.error('No se pudo guardar el estado de las secciones.', error),
    );
  };

  if (ready && !client) return <Bienvenida />;
  if (client && !snapshot) return <Sincronizando />;

  const maestro = width >= ANCHO_TABLETA;
  const escritorio = width >= ANCHO_ESCRITORIO;
  const nocturnoWeb = Platform.OS === 'web' && escritorio && tema === 'nocturno';
  const nocturnoMovil = width < ANCHO_TABLETA && tema === 'nocturno';
  const cuadernoMovil = width < ANCHO_TABLETA && tema === 'cuaderno';
  const cuadernoWeb = Platform.OS === 'web' && escritorio && tema === 'cuaderno';
  const anchoListaMaximo = Math.max(
    260,
    width - anchoNavegacion(width) - anchoLateral - 284,
  );
  const anchoListaActual = escritorio ? Math.min(anchoLista, anchoListaMaximo) : 330;
  const anchoLateralActual = escritorio
    ? Math.min(anchoLateral, Math.max(200, width - anchoNavegacion(width) - anchoListaActual - 284))
    : anchoLateral;

  const grupos: Grupo[] = [
    { titulo: 'Vencidas', items: g.vencidas },
    { titulo: 'Próximos 7 días', items: g.semana },
    { titulo: 'Más adelante', items: g.despues },
  ];
  const gruposVisibles =
    filtro === 'todas' || filtro === 'entregadas'
      ? filtro === 'todas'
        ? grupos
        : []
      : grupos.filter((gr) =>
          filtro === 'vencidas'
            ? gr.titulo === 'Vencidas'
            : filtro === 'semana'
              ? gr.titulo === 'Próximos 7 días'
              : gr.titulo === 'Más adelante',
        );
  const entregadas = verTodas ? g.entregadas : g.entregadas.slice(0, ENTREGADAS_VISIBLES);
  const cifras = [
    { key: 'entregas', n: abiertas, texto: abiertas === 1 ? 'Entrega' : 'Entregas' },
    {
      key: 'vencidas',
      n: g.vencidas.length,
      texto: g.vencidas.length === 1 ? 'Vencida' : 'Vencidas',
      alerta: g.vencidas.length > 0,
    },
    {
      key: 'urgentes',
      n: urgentes,
      texto: urgentes === 1 ? 'Urgente' : 'Urgentes',
      alerta: urgentes > 0,
    },
    ...(maestro && !escritorio
      ? []
      : [
          {
            key: 'cerradas',
            n: g.entregadas.length,
            texto: g.entregadas.length === 1 ? 'Cerrada' : 'Cerradas',
          },
        ]),
  ];
  const cifrasVisibles = escritorio
    ? cifras.filter(
        (cifra) =>
          (cifra.key !== 'cerradas' || anchoListaActual >= 360) &&
          (cifra.key !== 'vencidas' || anchoListaActual >= 300),
      )
    : cifras;

  // En tableta y escritorio, la tarea elegida se ve al lado (por defecto, la primera abierta)
  const todas = [...g.vencidas, ...g.semana, ...g.despues, ...g.entregadas];
  const seleccion =
    todas.find((e) => e.key === elegida) ?? todas.find((e) => e.estado !== 'entregada') ?? todas[0];
  const alPulsar = maestro ? (e: Entrega) => () => setElegida(e.key) : () => undefined;

  const fila = (e: Entrega) => (
    <EntregaCard
      key={e.key}
      entrega={e}
      nowMs={nowMs}
      onPress={maestro ? alPulsar(e) : undefined}
      seleccionada={maestro && seleccion?.key === e.key}
    />
  );

  if (cuadernoMovil) {
    const gruposCuaderno: Grupo[] = [
      { titulo: 'Vencidas', items: g.vencidas },
      { titulo: 'Próximos 7 días', items: g.semana },
      { titulo: 'Más adelante', items: g.despues },
      { titulo: 'Entregadas', items: g.entregadas },
    ];
    const pendientesVisibles = gruposCuaderno
      .slice(0, 3)
      .some((grupo) => grupo.items.length > 0);
    return (
      <Screen
        title="Pendientes"
        derecha=" "
        refreshable
        maxWidth={480}
        contentStyle={styles.cuadernoHome}>
        <ThemedText type="small" themeColor="ink2" style={styles.cuadernoHomeIntro}>
          Lo siguiente, sin ruido.
        </ThemedText>
        {gruposCuaderno.map((grupo) => {
          if (!grupo.items.length) return null;
          const items =
            grupo.titulo === 'Entregadas' && !verTodas
              ? grupo.items.slice(0, ENTREGADAS_VISIBLES)
              : grupo.items;
          return (
            <View key={grupo.titulo} style={styles.cuadernoHomeGroup}>
              <View style={styles.cuadernoHomeGroupHeader}>
                <ThemedText type="label" themeColor="ink2" style={styles.cuadernoHomeGroupTitle}>
                  {grupo.titulo}
                </ThemedText>
                <ThemedText type="meta" themeColor="ink3">
                  {grupo.items.length}
                </ThemedText>
              </View>
              {items.map((entrega) => (
                <TarjetaCuaderno
                  key={entrega.key}
                  entrega={entrega}
                  nowMs={nowMs}
                />
              ))}
              {grupo.titulo === 'Entregadas' && grupo.items.length > ENTREGADAS_VISIBLES ? (
                <Button
                  title={verTodas ? 'Ver menos' : `Ver las ${grupo.items.length} entregadas`}
                  variant="ghost"
                  compacto
                  icono={verTodas ? 'chevron-up' : 'chevron-down'}
                  onPress={() => setVerTodas((v) => !v)}
                />
              ) : null}
            </View>
          );
        })}
        {!pendientesVisibles ? (
          <Vacio
            icono="check"
            tono="neutro"
            titulo="Nada pendiente"
            texto="Todo al día. Cuando haya una nueva entrega, aparecerá aquí."
            accion={
              <Button
                title="Ver calendario"
                variant="secondary"
                compacto
                icono="calendar"
                onPress={() => router.navigate('/calendario')}
              />
            }
          />
        ) : null}
      </Screen>
    );
  }

  if (nocturnoWeb || nocturnoMovil || cuadernoMovil) {
    return (
      <Screen
        refreshable
        sinEspacioInicial
        maxWidth={nocturnoWeb ? 820 : undefined}
        contentStyle={[
          styles.nocturnoContenido,
          nocturnoMovil && styles.nocturnoContenidoMovil,
        ]}>
        <View style={styles.nocturnoCabecera}>
          <View style={styles.flex}>
            <ThemedText type="meta" themeColor="ink2">
              {new Date(nowMs).getHours() < 12
                ? 'Buenos días,'
                : new Date(nowMs).getHours() < 19
                  ? 'Buenas tardes,'
                  : 'Buenas noches,'}
            </ThemedText>
            <ThemedText type="display" style={styles.nocturnoTitulo}>
              {cuadernoMovil ? 'Pendientes' : 'Lo que te queda'}
            </ThemedText>
            <ThemedText type="label" themeColor="ink2">
              {new Intl.DateTimeFormat('es-ES', {
                weekday: 'long',
                day: 'numeric',
                month: 'short',
              })
                .format(new Date(nowMs))
                .toLocaleUpperCase('es-ES')}
            </ThemedText>
          </View>
          <View style={[styles.nocturnoAvatar, { backgroundColor: theme.brandWash }]}>
            <ThemedText type="smallBold" style={{ color: theme.brand }}>
              {(snapshot?.site.fullname ?? 'H').trim().slice(0, 1).toUpperCase()}
            </ThemedText>
          </View>
        </View>

        <View
          style={[
            styles.nocturnoHero,
            { backgroundColor: theme.surface, borderColor: theme.line },
          ]}>
          <View style={styles.flex}>
            <ThemedText style={styles.nocturnoHeroNumero}>
              <ThemedText style={{ color: theme.brand }}>{g.semana.length}</ThemedText>
              {` ${g.semana.length === 1 ? 'entrega' : 'entregas'} esta semana`}
            </ThemedText>
            <ThemedText type="small" themeColor="ink2" style={styles.nocturnoHeroTexto}>
              Y {g.vencidas.length} vencidas sin resolver
            </ThemedText>
          </View>
          {g.vencidas.length ? (
            <View
              style={[
                styles.nocturnoAlerta,
                { backgroundColor: theme.urgentWash, borderColor: theme.urgent },
              ]}>
              <View style={[styles.nocturnoPunto, { backgroundColor: theme.urgent }]} />
              <ThemedText type="small" style={{ color: theme.urgent }}>
                {g.vencidas.length} {g.vencidas.length === 1 ? 'vencida' : 'vencidas'}
              </ThemedText>
            </View>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.nocturnoFiltros,
            nocturnoMovil && styles.nocturnoFiltrosMovil,
          ]}>
          {(
            [
              ['todas', `Todas · ${abiertas}`],
              ['vencidas', `Vencidas · ${g.vencidas.length}`],
              ['semana', `Esta semana · ${g.semana.length}`],
              ['despues', `Más adelante · ${g.despues.length}`],
              ['entregadas', `Entregadas · ${g.entregadas.length}`],
            ] as const
          ).map(([id, label]) => {
            const activa = filtro === id;
            return (
              <Pressable
                key={id}
                accessibilityRole="button"
                accessibilityState={{ selected: activa }}
                onPress={() => setFiltro(id)}
                style={[
                  styles.nocturnoFiltro,
                  {
                    backgroundColor: activa ? theme.ink : 'transparent',
                    borderColor: activa ? theme.ink : theme.line,
                  },
                ]}>
                <ThemedText
                  type="small"
                  style={{
                    color: activa ? theme.paper : theme.ink2,
                    fontWeight: activa ? 600 : 500,
                  }}>
                  {label}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>

        {abiertas === 0 && filtro !== 'entregadas' ? (
          <Vacio
            titulo="Nada pendiente"
            texto="No tienes entregas abiertas. Cuando un profesor publique una tarea, aparecerá aquí."
            accion={
              <Button
                title="Ver novedades"
                variant="secondary"
                compacto
                icono="arrow-right"
                onPress={() => router.navigate('/novedades')}
              />
            }
          />
        ) : null}
        {filtro === 'entregadas' ? (
          g.entregadas.length ? (
            <View style={styles.nocturnoGrupo}>
              {entregadas.map((entrega) => (
                <TarjetaNocturna key={entrega.key} entrega={entrega} nowMs={nowMs} />
              ))}
              {g.entregadas.length > ENTREGADAS_VISIBLES ? (
                <View style={styles.verTodas}>
                  <Button
                    title={verTodas ? 'Ver menos' : `Ver todas las ${g.entregadas.length}`}
                    variant="ghost"
                    compacto
                    icono={verTodas ? 'chevron-up' : 'chevron-down'}
                    onPress={() => setVerTodas((v) => !v)}
                  />
                </View>
              ) : null}
            </View>
          ) : (
            <Vacio
              titulo="Todavía no hay entregas cerradas"
              texto="Cuando entregues una tarea, la encontrarás aquí."
              tono="neutro"
            />
          )
        ) : null}
        {filtro !== 'entregadas' &&
        abiertas > 0 &&
        gruposVisibles.every((gr) => !gr.items.length) ? (
          <Vacio
            titulo="No hay tareas en este filtro"
            texto="Prueba con otra categoría para ver tus entregas."
            tono="neutro"
          />
        ) : null}

        {gruposVisibles
          .filter((gr) => gr.items.length)
          .map((gr, i) => {
            const plegable = gr.titulo !== 'Vencidas';
            const plegada = !!plegadas[gr.titulo];
            return (
              <View key={gr.titulo} style={styles.nocturnoGrupo}>
                <Seccion
                  numero={i + 1}
                  titulo={gr.titulo}
                  derecha={String(gr.items.length)}
                  onPress={
                    plegable && anchosCargados
                      ? () => alternarPlegada(gr.titulo)
                      : undefined
                  }
                  expanded={plegable ? !plegada : undefined}
                />
                {!plegada
                  ? gr.items.map((entrega) => (
                      <TarjetaNocturna
                        key={entrega.key}
                        entrega={entrega}
                        nowMs={nowMs}
                      />
                    ))
                  : null}
              </View>
            );
          })}
      </Screen>
    );
  }

  const lista = (
    <Screen
      title="Pendientes"
      etiqueta={`FP IA y Big Data · ${snapshot?.courses.length ?? 0} asignaturas`}
      derecha={cuadernoWeb ? ' ' : undefined}
      maxWidth={maestro ? anchoListaActual : undefined}
      contentStyle={
        cuadernoWeb
          ? { paddingTop: 12, paddingRight: 4 }
          : escritorio
            ? { paddingRight: 4 }
            : undefined
      }
      showVerticalScrollIndicator={!escritorio}>
      {cuadernoWeb ? null : <Cifras items={cifrasVisibles} />}

      {abiertas === 0 ? (
        <Vacio
          titulo="Nada pendiente"
          texto="No tienes entregas abiertas. Cuando un profesor publique una tarea, aparecerá aquí."
          accion={
            <Button
              title="Ver novedades"
              variant="secondary"
              compacto
              icono="arrow-right"
              onPress={() => router.navigate('/novedades')}
            />
          }
        />
      ) : null}
      {cuadernoWeb
        ? [
            ...grupos,
            { titulo: 'Entregadas', items: g.entregadas },
          ].map((grupo) =>
            grupo.items.length ? (
              <View key={grupo.titulo} style={styles.cuadernoHomeGroup}>
                <View style={styles.cuadernoHomeGroupHeader}>
                  <ThemedText type="label" themeColor="ink2" style={styles.cuadernoHomeGroupTitle}>
                    {grupo.titulo}
                  </ThemedText>
                  <ThemedText type="meta" themeColor="ink3">
                    {grupo.items.length}
                  </ThemedText>
                </View>
                {grupo.items.map((entrega) => (
                  <TarjetaCuaderno
                    key={entrega.key}
                    entrega={entrega}
                    nowMs={nowMs}
                    onPress={() => setElegida(entrega.key)}
                    seleccionada={seleccion?.key === entrega.key}
                  />
                ))}
              </View>
            ) : null,
          )
        : null}
      {!cuadernoWeb ? gruposVisibles
        .filter((gr) => gr.items.length)
        .map((gr, i) => {
          const plegable = gr.titulo !== 'Vencidas';
          const plegada = !!plegadas[gr.titulo];
          return (
            <View key={gr.titulo}>
              <Seccion
                numero={i + 1}
                titulo={gr.titulo}
                derecha={String(gr.items.length)}
                onPress={
                  plegable && anchosCargados
                    ? () => alternarPlegada(gr.titulo)
                    : undefined
                }
                expanded={plegable ? !plegada : undefined}
              />
              {!plegada ? gr.items.map(fila) : null}
            </View>
          );
        }) : null}

      {!cuadernoWeb && g.entregadas.length ? (
        <View>
          <Seccion
            numero={grupos.filter((gr) => gr.items.length).length + 1}
            titulo="Entregadas"
            derecha={`${g.entregadas.length} cerradas`}
            onPress={anchosCargados ? () => alternarPlegada('entregadas') : undefined}
            expanded={!plegadas.entregadas}
          />
          {!plegadas.entregadas ? (
            <>
              {entregadas.map(fila)}
              {g.entregadas.length > ENTREGADAS_VISIBLES ? (
                <View style={styles.verTodas}>
                  <Button
                    title={verTodas ? 'Ver menos' : `Ver las ${g.entregadas.length} entregadas`}
                    variant="ghost"
                    compacto
                    icono={verTodas ? 'chevron-up' : 'chevron-down'}
                    onPress={() => setVerTodas((v) => !v)}
                  />
                </View>
              ) : null}
            </>
          ) : null}
        </View>
      ) : null}
    </Screen>
  );

  if (!maestro) return lista;

  const anchoDetalle = width - anchoNavegacion(width) - anchoListaActual - (escritorio ? 12 : 1);
  const ajustarAnchoLista = (ancho: number) => {
    setAnchoLista(ancho);
    AsyncStorage.setItem(ANCHO_LISTA_KEY, String(ancho)).catch((error: unknown) =>
      console.error('No se pudo guardar el ancho de Pendientes.', error),
    );
  };
  const ajustarAnchoLateral = (ancho: number) => {
    setAnchoLateral(ancho);
  };
  const guardarAnchoLateral = (ancho: number) =>
    AsyncStorage.setItem(ANCHO_LATERAL_KEY, String(ancho)).catch((error: unknown) =>
      console.error('No se pudo guardar el ancho del panel de información.', error),
    );
  return (
    <ThemedView style={styles.fila}>
      <View style={{ width: anchoListaActual }}>{lista}</View>
      {escritorio ? (
        <SeparadorVertical
          value={anchoLista}
          min={260}
          max={anchoListaMaximo}
          habilitado={anchosCargados}
          onChange={setAnchoLista}
          onRelease={ajustarAnchoLista}
          etiqueta="Ancho de la lista Pendientes"
        />
      ) : null}
      <SafeAreaView
        edges={['top']}
        style={[styles.detalle, { borderLeftColor: theme.line }]}>
        {seleccion ? (
          <PanelTarea
            key={seleccion.key}
            entrega={seleccion}
            nowMs={nowMs}
            ancho={anchoDetalle}
            anchoLateral={escritorio ? anchoLateralActual : undefined}
            alCambiarAnchoLateral={escritorio ? ajustarAnchoLateral : undefined}
            alSoltarAnchoLateral={escritorio ? guardarAnchoLateral : undefined}
          />
        ) : (
          <View style={styles.detalleVacio}>
            <Feather name="clipboard" size={22} color={theme.ink3} />
            <ThemedText type="small" themeColor="ink3">
              Elige una entrega para ver el detalle
            </ThemedText>
          </View>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

function SeparadorVertical({
  value,
  min,
  max,
  habilitado,
  onChange,
  onRelease,
  etiqueta,
}: {
  value: number;
  min: number;
  max: number;
  habilitado: boolean;
  onChange: (value: number) => void;
  onRelease: (value: number) => void;
  etiqueta: string;
}) {
  const theme = useTheme();
  const valorInicial = useRef(value);
  const posicionInicial = useRef(0);
  const valorActual = useRef(value);
  const limitado = Math.min(value, max);
  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={etiqueta}
      accessibilityHint="Arrastra a izquierda o derecha para cambiar el ancho"
      style={styles.separadorVertical}
      onStartShouldSetResponder={() => habilitado}
      onResponderGrant={(event) => {
        valorInicial.current = limitado;
        valorActual.current = limitado;
        posicionInicial.current = event.nativeEvent.pageX;
      }}
      onResponderMove={(event) => {
        const ancho = Math.max(
          min,
          Math.min(max, valorInicial.current + event.nativeEvent.pageX - posicionInicial.current),
        );
        valorActual.current = ancho;
        onChange(ancho);
      }}
      onResponderRelease={() => onRelease(valorActual.current)}>
      <Feather name="more-vertical" size={18} color={theme.ink3} />
    </View>
  );
}

function TarjetaCuaderno({
  entrega,
  nowMs,
  onPress,
  seleccionada,
}: {
  entrega: Entrega;
  nowMs: number;
  onPress?: () => void;
  seleccionada?: boolean;
}) {
  const theme = useTheme();
  const info = useAsignaturas()(entrega.cursoId, entrega.curso);
  const urgente = esUrgente(entrega, nowMs);
  const color =
    entrega.estado === 'vencida' ? theme.stLate : urgente ? theme.urgent : info.color;
  const secondary = entrega.estado === 'entregada' ? 'Pendiente de corregir' : cuandoDe(entrega, nowMs);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={
        onPress ??
        (() => router.push({ pathname: '/tarea/[key]', params: { key: entrega.key } }))
      }
      style={({ pressed }) => [
        styles.cuadernoTask,
        {
          backgroundColor: seleccionada ? theme.brandWash : theme.surface,
          borderColor: seleccionada ? theme.brand : theme.line,
          opacity: pressed ? 0.8 : 1,
        },
      ]}>
      <View style={[styles.cuadernoTaskRail, { backgroundColor: color }]} />
      <View style={styles.cuadernoTaskBody}>
        <View style={styles.cuadernoTaskHead}>
          <View style={[styles.cuadernoTaskDot, { backgroundColor: info.color }]} />
          <ThemedText
            type="meta"
            themeColor="ink2"
            numberOfLines={1}
            style={styles.cuadernoTaskCourse}>
            {info.siglas} · {info.nombre}
          </ThemedText>
        </View>
        <ThemedText style={styles.cuadernoTaskName} numberOfLines={2}>
          {entrega.nombre}
        </ThemedText>
        <View style={styles.cuadernoTaskFoot}>
          <EstadoChip estado={entrega.estado} />
          {entrega.nota ? (
            <ThemedText type="meta" style={{ color: theme.stDone, fontWeight: 700 }}>
              Nota {entrega.nota}
            </ThemedText>
          ) : secondary ? (
            <ThemedText
              type="meta"
              style={{ color: urgente || entrega.estado === 'vencida' ? theme.urgent : theme.ink2 }}>
              {secondary}
            </ThemedText>
          ) : null}
        </View>
        {urgente && entrega.fecha ? (
          <ThemedText type="meta" themeColor="ink3">
            Entrega · {diaMesHora(entrega.fecha)}
          </ThemedText>
        ) : null}
      </View>
    </Pressable>
  );
}

function TarjetaNocturna({ entrega, nowMs }: { entrega: Entrega; nowMs: number }) {
  const theme = useTheme();
  const info = useAsignaturas()(entrega.cursoId, entrega.curso);
  const color =
    entrega.estado === 'vencida'
      ? theme.urgent
      : esUrgente(entrega, nowMs)
        ? theme.stDraft
        : entrega.estado === 'entregada'
          ? theme.stDone
          : theme.ink3;

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/tarea/[key]', params: { key: entrega.key } })}
      accessibilityRole="button"
      accessibilityLabel={`${entrega.nombre}, ${info.nombre}, ${cuandoDe(entrega, nowMs)}`}
      style={({ pressed }) => [
        styles.nocturnoTarjeta,
        { backgroundColor: theme.surface, borderColor: theme.line, opacity: pressed ? 0.8 : 1 },
      ]}>
      <View style={[styles.nocturnoTarjetaRaíl, { backgroundColor: color }]} />
      <View style={styles.nocturnoTarjetaCuerpo}>
        <View style={styles.nocturnoTarjetaMeta}>
          <ThemedText type="label" style={{ color: info.color }}>
            {info.nombre}
          </ThemedText>
          <ThemedText type="meta" style={{ color }}>
            {cuandoDe(entrega, nowMs)}
          </ThemedText>
        </View>
        <ThemedText
          style={[
            styles.nocturnoTarjetaTitulo,
            entrega.estado === 'entregada' && { color: theme.ink2, fontWeight: 500 },
          ]}
          numberOfLines={2}>
          {entrega.nombre}
        </ThemedText>
        <View style={styles.nocturnoTarjetaPie}>
          <EstadoChip estado={entrega.estado} />
          {entrega.nota ? (
            <ThemedText type="small" style={{ color: theme.stDone, fontWeight: 600 }}>
              Nota {entrega.nota}
            </ThemedText>
          ) : null}
        </View>
      </View>
      <Feather name="chevron-right" size={16} color={theme.ink3} />
    </Pressable>
  );
}

/** Sin cuenta: qué es Hermes y un botón para conectar el Moodle. */
function Bienvenida() {
  const theme = useTheme();
  const { tema } = useThemePreference();
  const { width } = useWindowDimensions();
  const nocturnoWeb = Platform.OS === 'web' && width >= ANCHO_ESCRITORIO && tema === 'nocturno';
  const nocturnoMovil = width < ANCHO_TABLETA && tema === 'nocturno';
  const cuadernoMovil = width < ANCHO_TABLETA && tema === 'cuaderno';
  const cuadernoWeb =
    Platform.OS === 'web' && width >= ANCHO_ESCRITORIO && tema === 'cuaderno';
  const bienvenidaMovil = nocturnoMovil || cuadernoMovil;
  const puntos = [
    ['Pendientes ordenados por urgencia', 'con nota y estado reales'],
    ['Novedades de tus asignaturas', 'apuntes, cambios y correcciones'],
    ['Una IA por tarea', 'que lee el enunciado y te ayuda a entregar'],
  ];
  if (nocturnoWeb || nocturnoMovil || cuadernoMovil || cuadernoWeb) {
    return (
      <ThemedView style={styles.flex}>
        <SafeAreaView style={styles.flex} edges={['top']}>
          <View
            style={[
              styles.nocturnoBienvenida,
              bienvenidaMovil && styles.nocturnoBienvenidaMovil,
            ]}>
            {nocturnoWeb || cuadernoWeb || cuadernoMovil ? (
              <View style={styles.nocturnoBienvenidaMarca}>
                <View style={[styles.nocturnoBienvenidaLogo, { backgroundColor: theme.brand }]}>
                  <ThemedText style={[styles.logoLetra, { color: theme.brandInk }]}>H</ThemedText>
                </View>
                <ThemedText type="heading">Hermes</ThemedText>
              </View>
            ) : null}
            <View
              style={[
                styles.nocturnoBienvenidaCuerpo,
                bienvenidaMovil && styles.nocturnoBienvenidaCuerpoMovil,
              ]}>
              <View
                style={[
                  styles.nocturnoBienvenidaTexto,
                  bienvenidaMovil && styles.nocturnoBienvenidaTextoMovil,
                ]}>
                <ThemedText type="label" themeColor="ink2">
                  TU CURSO, EN UN SOLO SITIO
                </ThemedText>
                <ThemedText
                  style={[
                    styles.nocturnoBienvenidaTitulo,
                    bienvenidaMovil && styles.nocturnoBienvenidaTituloMovil,
                  ]}>
                  Tu curso,{'\n'}sin pelearte{'\n'}con Moodle.
                </ThemedText>
                <ThemedText type="small" themeColor="ink2" style={styles.nocturnoBienvenidaSubtitulo}>
                  Hermes organiza entregas, novedades y horarios de Moodle; la IA te ayuda a
                  entender cada tarea y preparar tu trabajo.
                </ThemedText>
                <Button
                  title="Conectar con Moodle"
                  icono="arrow-right"
                  onPress={() => router.navigate('/ajustes')}
                />
                <View style={styles.nota}>
                  <Feather name="lock" size={11} color={theme.ink3} />
                  <ThemedText type="meta" themeColor="ink3">
                    Tu sesión se guarda solo en este dispositivo.
                  </ThemedText>
                </View>
              </View>
              <View
                style={[
                  styles.nocturnoBienvenidaTarjeta,
                  bienvenidaMovil && styles.nocturnoBienvenidaTarjetaMovil,
                  { backgroundColor: theme.surface, borderColor: theme.line },
                ]}>
                <ThemedText type="label" themeColor="ink2">
                  TODO LO QUE NECESITAS
                </ThemedText>
                {puntos.map(([titulo, detalle], index) => (
                  <View key={titulo} style={styles.nocturnoBienvenidaFila}>
                    <View style={[styles.nocturnoBienvenidaIcono, { backgroundColor: theme.brandWash }]}>
                      <Feather
                        name={index === 0 ? 'clipboard' : index === 1 ? 'bell' : 'star'}
                        size={15}
                        color={theme.brand}
                      />
                    </View>
                    <View style={styles.flex}>
                      <ThemedText type="smallBold">{titulo}</ThemedText>
                      <ThemedText type="meta" themeColor="ink2">
                        {detalle}
                      </ThemedText>
                    </View>
                  </View>
                ))}
                <ThemedText
                  type="meta"
                  themeColor="ink3"
                  style={[styles.nocturnoBienvenidaNota, { borderTopColor: theme.line }]}>
                  Sin datos inventados: todo se sincroniza desde tus asignaturas.
                </ThemedText>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }
  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <ScrollView contentContainerStyle={styles.bienvenida}>
          <View style={styles.marca}>
            <View style={[styles.logo, { backgroundColor: theme.ink }]}>
              <ThemedText style={[styles.logoLetra, { color: theme.paper }]}>H</ThemedText>
            </View>
            <ThemedText type="heading">Hermes</ThemedText>
          </View>
          <View style={styles.bloque}>
            <ThemedText type="label" themeColor="ink2">
              Bienvenida
            </ThemedText>
            <ThemedText style={styles.lema}>Tu curso,{'\n'}sin pelearte{'\n'}con Moodle.</ThemedText>
            <ThemedText themeColor="ink2" style={styles.intro}>
              Hermes lee tu Moodle y te lo cuenta claro: qué entregar, qué ha cambiado y qué toca
              hoy.
            </ThemedText>
          </View>
          <View style={styles.puntos}>
            {puntos.map(([t, s]) => (
              <View key={t} style={styles.punto}>
                <View style={[styles.check, { backgroundColor: theme.brandWash }]}>
                  <Feather name="check" size={12} color={theme.brand} />
                </View>
                <View style={styles.flex}>
                  <ThemedText type="small" style={{ fontWeight: 600 }}>
                    {t}
                  </ThemedText>
                  <ThemedText type="meta" themeColor="ink3">
                    {s}
                  </ThemedText>
                </View>
              </View>
            ))}
          </View>
          <Button title="Iniciar sesión en Moodle" onPress={() => router.navigate('/ajustes')} />
          <View style={styles.nota}>
            <Feather name="lock" size={11} color={theme.ink3} />
            <ThemedText type="meta" themeColor="ink3">
              Tu sesión se guarda solo en este dispositivo.
            </ThemedText>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

/** Primera sincronización: esqueletos por asignatura mientras llega todo. */
function Sincronizando() {
  const theme = useTheme();
  const { error } = useMoodle();
  return (
    <Screen title="Sincronizando" etiqueta="Primera sincronización" derecha=" ">
      {error ? (
        <Vacio
          icono="wifi-off"
          tono="alerta"
          titulo="No se pudo conectar"
          texto="Revisa la conexión. Hermes lo volverá a intentar al abrir la app."
        />
      ) : (
        <>
          {(Object.keys(MODULOS) as ModuloId[]).map((m) => (
            <FilaRail key={m} color={theme[m]} apagada>
              <View style={styles.esqCabecera}>
                <ThemedText type="label" style={{ color: theme[m], letterSpacing: 1 }}>
                  {m}
                </ThemedText>
                <ThemedText type="meta" themeColor="ink3">
                  Leyendo…
                </ThemedText>
              </View>
              <View style={[styles.esq, { backgroundColor: theme.paper2, width: '70%' }]} />
              <View style={[styles.esq, { backgroundColor: theme.paper2, width: '40%', height: 8 }]} />
            </FilaRail>
          ))}
          <View style={styles.nota}>
            <Feather name="loader" size={12} color={theme.ink3} />
            <ThemedText type="meta" themeColor="ink3">
              La primera vez tarda unos segundos más.
            </ThemedText>
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  fila: { flex: 1, flexDirection: 'row' },
  detalle: { flex: 1, borderLeftWidth: 1 },
  detalleVacio: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  verTodas: { alignItems: 'flex-start', paddingTop: Spacing.two },
  nocturnoCabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  nocturnoTitulo: { fontSize: 28, lineHeight: 34, marginVertical: 2 },
  nocturnoContenido: { gap: Spacing.two, paddingTop: Spacing.four },
  nocturnoContenidoMovil: { gap: 12, paddingTop: Spacing.three, paddingBottom: 92 },
  nocturnoAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nocturnoHero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 4,
  },
  nocturnoHeroNumero: { fontSize: 19, lineHeight: 25, fontWeight: 700 },
  nocturnoHeroTexto: { marginTop: 2 },
  nocturnoAlerta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  nocturnoPunto: { width: 7, height: 7, borderRadius: 4 },
  nocturnoFiltros: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  nocturnoFiltrosMovil: { flexWrap: 'nowrap', paddingRight: MARGEN, marginRight: -MARGEN },
  nocturnoFiltro: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  nocturnoGrupo: { marginTop: 4, marginBottom: 8 },
  nocturnoTarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 78,
    borderWidth: 1,
    borderRadius: Radii.superficie,
    padding: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  nocturnoTarjetaRaíl: { width: 3, alignSelf: 'stretch', borderRadius: 2 },
  nocturnoTarjetaCuerpo: { flex: 1, gap: 4 },
  nocturnoTarjetaMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  nocturnoTarjetaTitulo: { fontSize: 15, lineHeight: 20, fontWeight: 600 },
  nocturnoTarjetaPie: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cuadernoHome: { gap: 0, paddingTop: 16, paddingBottom: 96 },
  cuadernoHomeIntro: { marginTop: -4, marginBottom: 8 },
  cuadernoHomeGroup: { marginTop: 10 },
  cuadernoHomeGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 2,
  },
  cuadernoHomeGroupTitle: { letterSpacing: 1.1 },
  cuadernoTask: {
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: 13,
    marginVertical: 5,
    minHeight: 76,
  },
  cuadernoTaskRail: { width: 4 },
  cuadernoTaskBody: { flex: 1, minWidth: 0, padding: 12, gap: 6 },
  cuadernoTaskHead: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  cuadernoTaskDot: { width: 8, height: 8, borderRadius: 3 },
  cuadernoTaskCourse: { flex: 1, fontSize: 10, fontWeight: 700 },
  cuadernoTaskName: { fontSize: 13, lineHeight: 17, fontWeight: 700 },
  cuadernoTaskFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    flexWrap: 'wrap',
  },
  separadorVertical: {
    width: 12,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bienvenida: {
    padding: MARGEN + 4,
    paddingTop: Spacing.five,
    gap: Spacing.four,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  nocturnoBienvenida: { flex: 1, maxWidth: 1120, width: '100%', alignSelf: 'center', padding: 32 },
  nocturnoBienvenidaMovil: { maxWidth: 480, padding: MARGEN, paddingTop: Spacing.five },
  nocturnoBienvenidaMarca: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 52 },
  nocturnoBienvenidaLogo: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  nocturnoBienvenidaCuerpo: { flexDirection: 'row', alignItems: 'center', gap: 60, flex: 1 },
  nocturnoBienvenidaCuerpoMovil: { flexDirection: 'column', alignItems: 'stretch', justifyContent: 'center', gap: 28 },
  nocturnoBienvenidaTexto: { flex: 1, gap: 16, maxWidth: 560 },
  nocturnoBienvenidaTextoMovil: { maxWidth: undefined, gap: 14 },
  nocturnoBienvenidaTitulo: { fontSize: 48, lineHeight: 52, fontWeight: 700, letterSpacing: -1.6 },
  nocturnoBienvenidaTituloMovil: { fontSize: 39, lineHeight: 43, letterSpacing: -1.1 },
  nocturnoBienvenidaSubtitulo: { fontSize: 16, lineHeight: 24, maxWidth: 470 },
  nocturnoBienvenidaTarjeta: { flex: 1, maxWidth: 400, gap: 18, borderWidth: 1, borderRadius: 16, padding: 24 },
  nocturnoBienvenidaTarjetaMovil: { flex: undefined, maxWidth: undefined, gap: 14, padding: 16 },
  nocturnoBienvenidaFila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nocturnoBienvenidaIcono: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  nocturnoBienvenidaNota: { borderTopWidth: 1, borderTopColor: '#303742', paddingTop: 16 },
  marca: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 30, height: 30, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  logoLetra: { fontSize: 15, lineHeight: 18, fontWeight: 700 },
  bloque: { gap: Spacing.two, marginTop: Spacing.three },
  lema: { fontSize: 36, lineHeight: 39, fontWeight: 700, letterSpacing: -1.3 },
  intro: { fontSize: 15.5, lineHeight: 23 },
  puntos: { gap: Spacing.three },
  punto: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  check: {
    width: 18,
    height: 18,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  nota: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  esqCabecera: { flexDirection: 'row', justifyContent: 'space-between' },
  esq: { height: 11, borderRadius: 3, marginTop: 4 },
});
