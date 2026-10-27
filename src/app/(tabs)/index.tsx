import Feather from '@expo/vector-icons/Feather';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Cifras, FilaRail, Seccion } from '@/components/anden';
import { Button } from '@/components/button';
import { EntregaCard, esUrgente } from '@/components/entrega-card';
import { Screen } from '@/components/screen';
import { PanelTarea } from '@/components/tarea-detalle';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Vacio } from '@/components/vacio';
import { ANCHO_ESCRITORIO, ANCHO_TABLETA, anchoNavegacion, MARGEN, Spacing } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import type { Entrega } from '@/lib/data';
import { MODULOS, type ModuloId } from '@/lib/horario';
import { useMoodle } from '@/lib/store';

const DIA = 86400;
const ANCHO_LISTA_KEY = 'hermes.pendientes.escritorio.lista';
const ANCHO_LATERAL_KEY = 'hermes.pendientes.escritorio.lateral';
const SECCIONES_PLEGADAS_KEY = 'hermes.pendientes.secciones-plegadas';
/** Entregadas que se ven sin pulsar «Ver todas». */
const ENTREGADAS_VISIBLES = 4;

type Grupo = { titulo: string; items: Entrega[] };

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
  const nowMs = useNow();
  const [verTodas, setVerTodas] = useState(false);
  const [elegida, setElegida] = useState<string>();
  const [plegadas, setPlegadas] = useState<Record<string, boolean>>({});
  const plegadasRef = useRef(plegadas);
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
          plegadasRef.current = guardadas;
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
    const nuevas = { ...plegadasRef.current, [clave]: !plegadasRef.current[clave] };
    plegadasRef.current = nuevas;
    setPlegadas(nuevas);
    AsyncStorage.setItem(SECCIONES_PLEGADAS_KEY, JSON.stringify(nuevas)).catch(
      (error: unknown) => console.error('No se pudo guardar el estado de las secciones.', error),
    );
  };

  if (ready && !client) return <Bienvenida />;
  if (client && !snapshot) return <Sincronizando />;

  const maestro = width >= ANCHO_TABLETA;
  const escritorio = width >= ANCHO_ESCRITORIO;
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

  const lista = (
    <Screen
      title="Pendientes"
      etiqueta={`FP IA y Big Data · ${snapshot?.courses.length ?? 0} asignaturas`}
      maxWidth={maestro ? anchoListaActual : undefined}
      contentStyle={escritorio ? { paddingRight: 4 } : undefined}
      showVerticalScrollIndicator={!escritorio}>
      <Cifras items={cifrasVisibles} />

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

      {grupos
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
        })}

      {g.entregadas.length ? (
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
      <Feather name="more-vertical" size={18} color="#8A8F98" />
    </View>
  );
}

/** Sin cuenta: qué es Hermes y un botón para conectar el Moodle. */
function Bienvenida() {
  const theme = useTheme();
  const puntos = [
    ['Pendientes ordenados por urgencia', 'con nota y estado reales'],
    ['Novedades de tus asignaturas', 'apuntes, cambios y correcciones'],
    ['Una IA por tarea', 'que lee el enunciado y te ayuda a entregar'],
  ];
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
