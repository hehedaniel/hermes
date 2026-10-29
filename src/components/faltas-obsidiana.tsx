/**
 * Calculadora de faltas (diseño Obsidiana): por módulo, cuántas horas has faltado, cuántas
 * puedes faltar aún (10 % o 20 % de las horas) y un registro por días para marcarlas.
 * No sale en el diseño de Stitch: sigue su estética.
 */
import { useHorario } from '@/lib/use-horario';
import Feather from '@expo/vector-icons/Feather';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { fechaEditorial, O, T, useArriba, useMovil, usePadX } from '@/components/obs';
import { useNow } from '@/hooks/use-now';
import { confirmar } from '@/lib/dialogo';
import {
  type Hora,
  LIMITES,
  PERIODOS,
  type Marca,
  resumen,
  type ResumenModulo,
  trimestreDe,
  horasDelDia,
} from '@/lib/faltas';
import { claveDia, FIN_CURSO, INICIO_CURSO, MODULOS, type ModuloId } from '@/lib/horario';
import { useAsignaturas } from '@/lib/store';
import { useFaltas } from '@/lib/use-faltas';

const ORDEN: ModuloId[] = ['MIA', 'SAA', 'BDA', 'PIA', 'SBD'];
const NIVEL = {
  ok: { color: O.green, texto: 'Vas bien' },
  aviso: { color: O.amber, texto: 'Cuidado' },
  pasado: { color: O.red, texto: 'Pasado del límite' },
} as const;

const h = (n: number) => `${n} h`;
const pct = (x: number) => `${(Math.round(x * 1000) / 10).toString().replace('.', ',')} %`;
const dec = (x: number) => (Math.round(x * 10) / 10).toString().replace('.', ',');

function fechaDe(clave: string) {
  const [a, m, d] = clave.split('-').map(Number);
  return new Date(a, m - 1, d, 12);
}
/** Mueve la fecha n días sin salirse del curso (28 de septiembre – fin de curso). */
const sumaDias = (clave: string, n: number) => {
  const d = fechaDe(clave);
  d.setDate(d.getDate() + n);
  const nueva = claveDia(d);
  return nueva < INICIO_CURSO || nueva > FIN_CURSO ? clave : nueva;
};

export function FaltasObsidiana() {
  const movil = useMovil();
  const arriba = useArriba();
  const padX = usePadX(64);
  const info = useAsignaturas();
  const versionHorario = useHorario();
  const nowMs = useNow();
  const ahora = useMemo(() => new Date(nowMs), [nowMs]);
  const hoy = claveDia(ahora);
  const { marcas, limite, setLimite, marcar, marcarVarias, borrarTodo } = useFaltas();

  const [trimId, setTrimId] = useState<number | string | null>(null);
  const [dia, setDia] = useState(hoy);
  const trimestre = PERIODOS.find((t) => t.id === (trimId ?? trimestreDe(hoy).id)) ?? PERIODOS[0];
  const datos = useMemo(() => {
    void versionHorario; // se recalcula cuando llega un horario nuevo
    return resumen(marcas, trimestre, ahora, limite);
  }, [marcas, trimestre, ahora, limite, versionHorario]);
  const horas = useMemo(() => {
    void versionHorario;
    return horasDelDia(dia, marcas);
  }, [dia, marcas, versionHorario]);

  const total = ORDEN.reduce((a, m) => a + datos[m].faltadas, 0);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#0B0B0D' }}
      contentContainerStyle={{
        paddingHorizontal: padX,
        paddingTop: (movil ? 28 : 40) + arriba,
        paddingBottom: 40,
      }}>
      <View style={{ width: '100%', maxWidth: 1140, alignSelf: 'center', gap: movil ? 24 : 32 }}>
        <View
          style={{
            flexDirection: movil ? 'column' : 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: movil ? 18 : 0,
            borderBottomWidth: 1,
            borderBottomColor: '#17171C',
            paddingBottom: movil ? 24 : 32,
          }}>
          <View style={{ flex: movil ? undefined : 1 }}>
            <T w={500} up s={10.5} ls={0.24} c="#737373" style={{ marginBottom: 8 }}>
              Asistencia
            </T>
            <T k="serif" s={movil ? 36 : 42} lh={movil ? 44 : 52} c="#F5F0E8">
              Faltas
            </T>
            <T s={13} lh={21} c="#A3A3A3" style={{ marginTop: 14, maxWidth: 640 }}>
              Puedes faltar hasta el {Math.round(limite * 100)} % de las horas del{' '}
              {trimestre.id === 'curso' ? 'curso' : 'trimestre'}. Las horas sin clase (festivos,
              falta del profesor) no cuentan y bajan ese total, y con él las faltas permitidas.
            </T>
          </View>
          <View
            style={{ alignItems: movil ? 'flex-start' : 'flex-end', paddingTop: movil ? 0 : 8 }}>
            <T w={500} up s={10} ls={0.22} c="#737373" style={{ marginBottom: 4 }}>
              Horas faltadas
            </T>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <T k="serif" w={500} s={34} lh={34} c={O.white}>
                {total}
              </T>
              <T w={300} s={14} c="#737373">
                {trimestre.id === 'curso' ? 'en el curso' : 'en este trimestre'}
              </T>
            </View>
          </View>
        </View>

        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {PERIODOS.map((t) => (
              <Chip
                key={t.id}
                texto={t.nombre}
                activo={t.id === trimestre.id}
                onPress={() => setTrimId(t.id)}
              />
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            <T k="mono" up s={10} ls={0.14} c="#6B6B77" style={{ marginRight: 4 }}>
              Calcular sobre el
            </T>
            {LIMITES.map((l) => (
              <Chip
                key={l}
                texto={`${Math.round(l * 100)} %`}
                activo={l === limite}
                onPress={() => setLimite(l)}
              />
            ))}
          </View>
          {Object.keys(marcas).length ? (
            <View style={{ flexDirection: 'row' }}>
              <Mini
                texto="Borrar todas mis marcas"
                onPress={() =>
                  confirmar({
                    titulo: 'Borrar todas las marcas',
                    texto:
                      'Se quitan todas tus faltas y horas sin clase marcadas, también en tus otros dispositivos al sincronizar.',
                    boton: 'Borrar',
                    destructivo: true,
                    onOk: borrarTodo,
                  })
                }
              />
            </View>
          ) : null}
        </View>

        <View
          style={{ flexDirection: movil ? 'column' : 'row', alignItems: 'flex-start', gap: 24 }}>
          <View style={{ flex: movil ? undefined : 1, width: movil ? '100%' : undefined, gap: 14 }}>
            {ORDEN.map((m) => (
              <TarjetaModulo
                key={m}
                r={datos[m]}
                limite={limite}
                periodo={trimestre.id === 'curso' ? 'del curso' : 'del trimestre'}
                color={info(0, MODULOS[m].nombre).color}
                movil={movil}
              />
            ))}
          </View>

          <View
            style={{
              width: movil ? '100%' : 380,
              borderWidth: 1,
              borderColor: '#1F1F26',
              borderRadius: 16,
              padding: 20,
              backgroundColor: 'rgba(15,15,19,0.6)',
              gap: 16,
            }}>
            <T w={600} up s={9.5} ls={0.2} c="#737373">
              Registrar
            </T>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Flecha
                icono="chevron-left"
                apagada={dia <= INICIO_CURSO}
                onPress={() => setDia(sumaDias(dia, -1))}
              />
              <View style={{ flex: 1 }}>
                <T k="serif" w={500} s={20} lh={26} c="#F4F4F5">
                  {fechaEditorial(fechaDe(dia))}
                </T>
              </View>
              <Flecha
                icono="chevron-right"
                apagada={dia >= FIN_CURSO}
                onPress={() => setDia(sumaDias(dia, 1))}
              />
            </View>
            {dia !== hoy ? (
              <Pressable onPress={() => setDia(hoy)} accessibilityRole="button">
                <T k="mono" up s={10.5} w={600} ls={0.05} c={O.lime}>
                  Ir a hoy
                </T>
              </Pressable>
            ) : null}

            {horas.length === 0 ? (
              <T s={13} lh={19} c="#868694">
                No hay clase este día (fin de semana o fuera de curso).
              </T>
            ) : horas.every((x) => x.automatica) && horas[0].automatica ? (
              <T s={13} lh={19} c="#868694">
                Sin clase: {horas[0].automatica}.
              </T>
            ) : (
              <View style={{ gap: 10 }}>
                {horas.map((x) => (
                  <FilaHora
                    key={x.franja}
                    x={x}
                    color={info(0, MODULOS[x.modulo].nombre).color}
                    marcar={(m) => marcar(x.fecha, x.franja, m)}
                  />
                ))}
                {horas.some((x) => !x.automatica) ? (
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                    <Mini
                      texto="Falté todo el día"
                      onPress={() =>
                        marcarVarias(
                          dia,
                          horas.filter((x) => !x.automatica).map((x) => x.franja),
                          'f',
                        )
                      }
                    />
                    <Mini
                      texto="Limpiar el día"
                      onPress={() =>
                        marcarVarias(
                          dia,
                          horas.map((x) => x.franja),
                          null,
                        )
                      }
                    />
                  </View>
                ) : null}
              </View>
            )}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function TarjetaModulo({
  r,
  color,
  movil,
  limite,
  periodo,
}: {
  r: ResumenModulo;
  color: string;
  movil: boolean;
  limite: number;
  periodo: string;
}) {
  const m = MODULOS[r.modulo];
  const n = NIVEL[r.nivel];
  const llena = r.permitidas > 0 ? Math.min(1, r.faltadas / r.permitidas) : r.faltadas ? 1 : 0;
  return (
    <View
      style={{
        backgroundColor: '#111114',
        borderWidth: 1,
        borderColor: '#1F1F26',
        borderLeftWidth: 3.5,
        borderLeftColor: color,
        borderRadius: 14,
        padding: movil ? 16 : 20,
        gap: 14,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <T w={500} s={14.5} lh={20} c="#F4F4F5">
            {m.nombre}
          </T>
          <T k="mono" up s={10} ls={0.05} c="#6B6B77" style={{ marginTop: 3 }}>
            {r.dadas} de {r.total} h dadas{r.sinClase ? ` · ${r.sinClase} h sin clase` : ''}
          </T>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
            <T k="serif" w={500} s={28} lh={30} c={r.nivel === 'ok' ? O.white : n.color}>
              {r.faltadas}
            </T>
            <T w={300} s={13} c="#737373">
              / {r.permitidas} h
            </T>
          </View>
          <T k="mono" up s={9.5} w={600} ls={0.1} c={n.color}>
            {n.texto}
          </T>
        </View>
      </View>

      <View style={{ height: 5, borderRadius: 3, backgroundColor: '#1D1D22', overflow: 'hidden' }}>
        <View style={{ height: 5, width: `${llena * 100}%`, backgroundColor: n.color }} />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
        <Dato
          etiqueta={r.exceso ? 'Te has pasado' : 'Te quedan'}
          valor={r.exceso ? h(r.exceso) : h(r.restantes)}
          color={r.exceso ? O.red : undefined}
        />
        <Dato etiqueta={`Máximo (${Math.round(limite * 100)} %)`} valor={`${dec(r.limite)} h`} />
        <Dato etiqueta={`Faltado ${periodo}`} valor={pct(r.pctTotal)} />
      </View>
    </View>
  );
}

function Dato({ etiqueta, valor, color }: { etiqueta: string; valor: string; color?: string }) {
  return (
    <View>
      <T k="mono" up s={9} ls={0.12} c="#6B6B77">
        {etiqueta}
      </T>
      <T w={500} s={14} c={color ?? '#E2E2E8'} style={{ marginTop: 2 }}>
        {valor}
      </T>
    </View>
  );
}

const OPCIONES: { id: Marca | null; texto: string; color: string }[] = [
  { id: null, texto: 'Asistí', color: O.green },
  { id: 'f', texto: 'Falté', color: O.red },
  { id: 's', texto: 'Sin clase', color: O.amber },
];

function FilaHora({
  x,
  color,
  marcar,
}: {
  x: Hora;
  color: string;
  marcar: (m: Marca | null) => void;
}) {
  const m = MODULOS[x.modulo];
  return (
    <View
      style={{
        backgroundColor: '#15151A',
        borderWidth: 1,
        borderColor: '#23232C',
        borderLeftWidth: 3.5,
        borderLeftColor: color,
        borderRadius: 12,
        padding: 12,
        gap: 10,
      }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
        <T w={500} s={12.5} lh={17} c="#F4F4F5" style={{ flex: 1 }} numberOfLines={1}>
          {m.corto}
        </T>
        <T k="mono" s={10} c="#6B6B77">
          {x.inicio} – {x.fin}
        </T>
      </View>
      {x.automatica ? (
        <T k="mono" up s={9.5} ls={0.05} c={O.amber}>
          Sin clase · {x.automatica}
        </T>
      ) : (
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {OPCIONES.map((o) => {
            const activa = (x.marca ?? null) === o.id;
            return (
              <Pressable
                key={o.texto}
                onPress={() => marcar(o.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: activa }}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  paddingVertical: 7,
                  borderRadius: 8,
                  borderWidth: 1,
                  backgroundColor: activa ? '#1B1B21' : 'transparent',
                  borderColor: activa ? o.color : '#26262E',
                }}>
                <T k="mono" up s={10} w={600} ls={0.04} c={activa ? o.color : '#868694'}>
                  {o.texto}
                </T>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

function Chip({ texto, activo, onPress }: { texto: string; activo: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: activo }}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 99,
        borderWidth: 1,
        backgroundColor: activo ? O.limeWash : '#121215',
        borderColor: activo ? O.limeLine : '#212126',
      }}>
      <T k="mono" up s={11} w={600} ls={0.05} c={activo ? O.lime : '#868694'}>
        {texto}
      </T>
    </Pressable>
  );
}

function Mini({ texto, onPress }: { texto: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={{
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#26262E',
      }}>
      <T k="mono" up s={10} w={600} ls={0.04} c="#A3A3A3">
        {texto}
      </T>
    </Pressable>
  );
}

function Flecha({
  icono,
  apagada,
  onPress,
}: {
  icono: 'chevron-left' | 'chevron-right';
  apagada?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={apagada}
      accessibilityRole="button"
      hitSlop={8}
      style={{
        opacity: apagada ? 0.3 : 1,
        width: 32,
        height: 32,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#26262E',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Feather name={icono} size={16} color="#A3A3A3" />
    </Pressable>
  );
}
