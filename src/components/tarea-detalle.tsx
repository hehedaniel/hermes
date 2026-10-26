import Feather from '@expo/vector-icons/Feather';
import { router, useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { type ReactNode, useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Caja, EstadoChip, Seccion } from '@/components/anden';
import { ArchivoRow } from '@/components/archivo-row';
import { Button } from '@/components/button';
import { esUrgente } from '@/components/entrega-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Archivo, Entrega } from '@/lib/data';
import { formatoTamano } from '@/lib/downloads';
import { diaMes, diaMesHora, hora, quedan } from '@/lib/format';
import { htmlATexto } from '@/lib/html-texto';
import { hayChat } from '@/lib/ia/chats';
import { iniciales, useAsignaturas } from '@/lib/store';

/** A partir de este ancho, la corrección o las fechas van en una columna al lado. */
export const ANCHO_DOS_COLUMNAS = 620;

/** «8,50 / 10,00» → { nota: '8,5', sobre: '10' } */
function partirNota(texto: string) {
  const limpia = (s: string) => s.trim().replace(/([,.]\d*?)0+$/, '$1').replace(/[,.]$/, '');
  const [nota, sobre] = texto.split('/');
  return { nota: limpia(nota), sobre: sobre ? limpia(sobre) : undefined };
}

const pesoTotal = (archivos: Archivo[]) => archivos.reduce((s, a) => s + (a.size || 0), 0);

/**
 * Todo lo de una tarea: cabecera, fechas, acciones, corrección, tu entrega, archivos y
 * enunciado. Con ancho de sobra se reparte en dos columnas (tarea a la izquierda;
 * corrección o fechas y entrega a la derecha). No hace scroll: lo pone quien lo usa.
 */
export function TareaDetalle({
  entrega: e,
  nowMs,
  ancho,
}: {
  entrega: Entrega;
  nowMs: number;
  /** Ancho disponible para el detalle (decide si van dos columnas) */
  ancho: number;
}) {
  const theme = useTheme();
  const info = useAsignaturas()(e.cursoId, e.curso);
  const dos = ancho >= ANCHO_DOS_COLUMNAS;
  const [chat, setChat] = useState<{ key: string; hay: boolean }>();
  useFocusEffect(
    useCallback(() => {
      let vivo = true;
      hayChat(e.key).then((hay) => vivo && setChat({ key: e.key, hay }));
      return () => {
        vivo = false;
      };
    }, [e.key]),
  );
  const conChat = chat?.key === e.key && chat.hay;

  const urgente = esUrgente(e, nowMs);
  const abierta = e.estado === 'pendiente' || e.estado === 'borrador';
  const texto = htmlATexto(e.enunciado);
  const corte = e.corte && e.corte !== e.fecha ? e.corte : undefined;

  const fechas = [
    e.apertura ? { label: 'Apertura', ts: e.apertura, alerta: false } : null,
    e.fecha
      ? { label: 'Entrega', ts: e.fecha, alerta: urgente || e.estado === 'vencida' }
      : null,
    corte ? { label: 'Cierre', ts: corte, alerta: false } : null,
  ].filter(Boolean) as { label: string; ts: number; alerta: boolean }[];

  const pista = e.correccion
    ? 'Pídele que te explique la corrección antes de la siguiente.'
    : abierta && e.fecha && e.fecha * 1000 > nowMs
      ? `${quedan(e.fecha, nowMs)}${corte ? ` · se puede entregar con retraso hasta el ${diaMes(corte)}` : ''}`
      : e.estado === 'vencida' && corte && corte * 1000 > nowMs
        ? `Aún se puede entregar con retraso hasta el ${diaMesHora(corte)}`
        : undefined;

  const irIA = () => router.push(`/ia/${encodeURIComponent(e.key)}`);
  const abrirMoodle = e.url ? () => WebBrowser.openBrowserAsync(e.url!) : undefined;
  const tituloIA = conChat ? 'Seguir con la IA' : 'Hacer con IA';

  // ——— Bloques ———

  const cabecera = (
    <View style={styles.cabecera}>
      <View style={styles.fila}>
        <ThemedText type="label" style={{ color: info.color, letterSpacing: 1.2 }}>
          {info.siglas}
        </ThemedText>
        <EstadoChip estado={e.estado} />
      </View>
      <ThemedText style={[styles.titulo, dos && styles.tituloGrande]}>{e.nombre}</ThemedText>
      <ThemedText type="meta" themeColor="ink2">
        {[info.nombre, info.profesor].filter(Boolean).join(' · ')}
      </ThemedText>
    </View>
  );

  const tiraFechas = fechas.length ? (
    <View style={[styles.tira, { borderColor: theme.line }]}>
      {fechas.map((f, i) => (
        <View
          key={f.label}
          style={[styles.tiraCol, i > 0 && { borderLeftWidth: 1, borderLeftColor: theme.line }]}>
          <ThemedText
            type="label"
            style={[styles.tiraLabel, { color: f.alerta ? theme.urgent : theme.ink3 }]}>
            {f.label}
          </ThemedText>
          <ThemedText type="cifra" style={f.alerta && { color: theme.urgent }}>
            {diaMes(f.ts)}
            {dos ? ' · ' : '\n'}
            {hora(new Date(f.ts * 1000))}
          </ThemedText>
        </View>
      ))}
    </View>
  ) : null;

  const acciones = (
    <View style={styles.bloque}>
      {dos ? (
        <View style={styles.botones}>
          <View style={styles.boton}>
            <Button title={tituloIA} icono="ia" onPress={irIA} />
          </View>
          {abrirMoodle ? (
            <View style={styles.boton}>
              <Button
                title="Abrir en Moodle"
                variant="secondary"
                icono="arrow-up-right"
                onPress={abrirMoodle}
              />
            </View>
          ) : null}
        </View>
      ) : (
        <Button title={tituloIA} icono="ia" onPress={irIA} />
      )}
      {pista ? (
        <View style={styles.pista}>
          <Feather name="clock" size={12} color={theme.ink3} style={styles.pistaIcono} />
          <ThemedText type="meta" themeColor="ink3" style={styles.flex}>
            {pista}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );

  const correccion = e.correccion ? (
    <View>
      <Seccion
        titulo="Corrección del profesor"
        derecha={e.correccion.fecha ? diaMes(e.correccion.fecha) : undefined}
        sinRegla
      />
      {e.correccion.nota ? <Nota texto={e.correccion.nota} profesor={info.profesor} /> : null}
      {e.correccion.comentario ? (
        <Caja style={styles.cajaEspacio}>
          <ThemedText type="small" style={styles.parrafo} selectable>
            «{htmlATexto(e.correccion.comentario)}»
          </ThemedText>
        </Caja>
      ) : null}
      {e.correccion.archivos.length ? (
        <>
          <Seccion titulo="Archivos de corrección" sinRegla />
          {e.correccion.archivos.map((a) => (
            <ArchivoRow key={a.fileurl} archivo={a} />
          ))}
        </>
      ) : null}
    </View>
  ) : null;

  const tuEntrega = e.envio ? (
    <View>
      <Seccion
        titulo="Tu entrega"
        derecha={e.envio.fecha ? diaMesHora(e.envio.fecha) : undefined}
        sinRegla
      />
      <Caja style={styles.cajaEspacio}>
        <View style={styles.fila}>
          <Feather
            name={e.estado === 'borrador' ? 'edit-2' : 'check'}
            size={13}
            color={e.estado === 'borrador' ? theme.ink2 : theme.stDone}
          />
          <ThemedText type="smallBold">
            {e.estado === 'borrador'
              ? 'Borrador guardado'
              : e.envio.fecha && e.fecha && e.envio.fecha > e.fecha
                ? 'Entregada con retraso'
                : 'Entregada a tiempo'}
          </ThemedText>
        </View>
        <ThemedText type="meta" themeColor="ink2">
          {[
            e.envio.archivos.length
              ? `${e.envio.archivos.length} ${e.envio.archivos.length === 1 ? 'archivo' : 'archivos'} · ${formatoTamano(pesoTotal(e.envio.archivos))}`
              : null,
            e.envio.pendienteDeCorregir ? 'Pendiente de corregir' : null,
          ]
            .filter(Boolean)
            .join(' · ') || 'Sin archivos'}
        </ThemedText>
        {e.envio.texto ? (
          <ThemedText type="small" style={styles.parrafo} selectable>
            {htmlATexto(e.envio.texto)}
          </ThemedText>
        ) : null}
      </Caja>
      {e.envio.archivos.map((a) => (
        <ArchivoRow key={a.fileurl} archivo={a} />
      ))}
    </View>
  ) : null;

  const archivos = e.adjuntos?.length ? (
    <View>
      <Seccion
        titulo="Archivos de la tarea"
        derecha={`${e.adjuntos.length} · ${formatoTamano(pesoTotal(e.adjuntos))}`}
        sinRegla
      />
      {e.adjuntos.map((a) => (
        <ArchivoRow key={a.fileurl} archivo={a} />
      ))}
    </View>
  ) : null;

  const enunciado = texto ? (
    <View>
      <Seccion titulo="Enunciado" sinRegla />
      <Caja style={styles.cajaEspacio}>
        <ThemedText type="small" style={styles.parrafo} selectable>
          {texto}
        </ThemedText>
      </Caja>
    </View>
  ) : null;

  const listaFechas = fechas.length ? (
    <View>
      <Seccion titulo="Fechas" sinRegla />
      {fechas.map((f) => (
        <View key={f.label} style={[styles.filaDato, { borderBottomColor: theme.line }]}>
          <ThemedText type="meta" themeColor="ink2">
            {f.label}
          </ThemedText>
          <ThemedText type="cifra" style={[styles.dato, f.alerta && { color: theme.urgent }]}>
            {diaMesHora(f.ts)}
          </ThemedText>
        </View>
      ))}
    </View>
  ) : null;

  const asignatura = (
    <View>
      <Seccion titulo={e.correccion ? 'Profesor' : 'Asignatura'} sinRegla />
      {e.correccion && info.profesor ? (
        <View style={[styles.fila, styles.cajaEspacio]}>
          <View style={[styles.avatar, { backgroundColor: theme.brandWash }]}>
            <ThemedText type="label" style={{ color: theme.brand, letterSpacing: 0.5 }}>
              {iniciales(info.profesor)}
            </ThemedText>
          </View>
          <ThemedText type="small" style={{ fontWeight: 500 }}>
            {info.profesor}
          </ThemedText>
        </View>
      ) : (
        <View style={[styles.asignatura, { borderLeftColor: info.color }]}>
          <ThemedText type="smallBold">{info.nombre}</ThemedText>
          {info.profesor ? (
            <ThemedText type="meta" themeColor="ink2">
              {info.profesor}
            </ThemedText>
          ) : null}
        </View>
      )}
    </View>
  );

  if (!dos) {
    return (
      <View style={styles.columna}>
        {cabecera}
        {tiraFechas}
        {acciones}
        {correccion}
        {tuEntrega}
        {archivos}
        {enunciado}
        {abrirMoodle ? (
          <View style={styles.bloque}>
            <Button
              title="Abrir en Moodle"
              variant="secondary"
              icono="arrow-up-right"
              onPress={abrirMoodle}
            />
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.dos}>
      <View style={[styles.columna, styles.flex, styles.dosPrincipal]}>
        {cabecera}
        {tiraFechas}
        {acciones}
        {enunciado}
        {archivos}
        {e.correccion ? tuEntrega : null}
      </View>
      <Lateral>
        {e.correccion ? (
          <>
            {correccion}
            {asignatura}
          </>
        ) : (
          <>
            {tuEntrega}
            {listaFechas}
            {asignatura}
          </>
        )}
      </Lateral>
    </View>
  );
}

/**
 * El detalle con su propio scroll, para el panel derecho de Pendientes y la pantalla de la
 * tarea en tableta y escritorio: a sangre, con la columna lateral hasta abajo.
 */
export function PanelTarea({
  entrega,
  nowMs,
  ancho,
}: {
  entrega: Entrega;
  nowMs: number;
  ancho: number;
}) {
  const dos = ancho >= ANCHO_DOS_COLUMNAS;
  return (
    <ScrollView contentContainerStyle={[styles.panel, !dos && styles.panelUna]}>
      <TareaDetalle entrega={entrega} nowMs={nowMs} ancho={dos ? ancho : ancho - 64} />
    </ScrollView>
  );
}

function Lateral({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.lateral, { borderLeftColor: theme.line, backgroundColor: theme.surface2 }]}>
      {children}
    </View>
  );
}

function Nota({ texto, profesor }: { texto: string; profesor?: string }) {
  const theme = useTheme();
  const { nota, sobre } = partirNota(texto);
  return (
    <View style={styles.nota}>
      <ThemedText style={[styles.notaN, { color: theme.ink }]}>{nota}</ThemedText>
      <View style={styles.notaPie}>
        {profesor ? (
          <ThemedText type="meta" themeColor="ink2">
            {profesor}
          </ThemedText>
        ) : null}
        {sobre ? (
          <ThemedText type="meta" themeColor="ink3">
            sobre {sobre}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  columna: { gap: Spacing.three, minWidth: 0 },
  dos: { flex: 1, flexDirection: 'row', alignItems: 'stretch' },
  dosPrincipal: { padding: 32, paddingBottom: 48 },
  lateral: {
    width: 280,
    borderLeftWidth: 1,
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 48,
    gap: Spacing.three,
  },
  panel: { flexGrow: 1 },
  panelUna: { padding: 32, paddingBottom: 48, maxWidth: 720 },
  cabecera: { gap: 6 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titulo: { fontSize: 24, lineHeight: 29, fontWeight: 700, letterSpacing: -0.6 },
  tituloGrande: { fontSize: 26, lineHeight: 31 },
  tira: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1 },
  tiraCol: { flex: 1, paddingVertical: 10, paddingHorizontal: 10, gap: 4 },
  tiraLabel: { fontSize: 9, letterSpacing: 1 },
  bloque: { gap: 8 },
  botones: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  boton: { flexGrow: 1, flexBasis: 170 },
  pista: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  pistaIcono: { marginTop: 2 },
  cajaEspacio: { marginTop: 4, marginBottom: 4 },
  parrafo: { lineHeight: 21 },
  filaDato: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingVertical: 7,
    borderBottomWidth: 1,
  },
  dato: { fontSize: 12 },
  asignatura: { borderLeftWidth: 3, paddingLeft: 10, gap: 2, marginTop: 4 },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nota: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 2 },
  notaN: {
    fontSize: 40,
    lineHeight: 46,
    fontWeight: 700,
    letterSpacing: -1.5,
    fontVariant: ['tabular-nums'],
  },
  notaPie: { gap: 1 },
});
