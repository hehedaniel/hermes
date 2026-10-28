/**
 * Notas en el diseño Obsidiana: una tarjeta por asignatura con su nota, el peso de cada
 * actividad y un pie con lo que queda por corregir. Reproducido del HTML de Stitch.
 */
import Feather from '@expo/vector-icons/Feather';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { O, T, useArriba, useMovil, usePadX } from '@/components/obs';
import type { Entrega } from '@/lib/data';
import { MESES } from '@/lib/format';
import { type ItemNota, type NotasCurso, useNotasMoodle } from '@/lib/notas';
import { useAsignaturas, useMoodle } from '@/lib/store';

const N = { n400: '#A3A3A3', n500: '#737373', n600: '#525252', n200: '#E5E5E5' };

/** «9,00 / 10,00» -> { nota: 9, max: 10 } */
function leerNota(texto?: string): { nota: number; max: number } | null {
  if (!texto) return null;
  const m = texto.match(/(-?\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)/);
  if (!m) {
    const solo = texto.trim().match(/^(-?\d+(?:[.,]\d+)?)$/);
    return solo ? { nota: Number(solo[1].replace(',', '.')), max: 10 } : null;
  }
  const nota = Number(m[1].replace(',', '.'));
  const max = Number(m[2].replace(',', '.'));
  return Number.isFinite(nota) && Number.isFinite(max) && max > 0 ? { nota, max } : null;
}

/** 8 -> «8», 8.5 -> «8,5», 9.25 -> «9,25» */
const fmt = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');
const fechaItem = (ts?: number) => {
  if (!ts) return '—';
  const d = new Date(ts * 1000);
  return `${String(d.getDate()).padStart(2, '0')} ${MESES[d.getMonth()].slice(0, 3)}`;
};
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

type Grupo = {
  cursoId: number;
  items: ItemNota[];
  total?: { nota: number; max: number };
  conPesos: boolean;
  sinCorregir: number;
};

export function NotasObsidiana() {
  const { snapshot, client } = useMoodle();
  const info = useAsignaturas();
  const movil = useMovil();
  const arriba = useArriba();
  const cursos = useMemo(
    () => (snapshot?.courses ?? []).filter((c) => !/punto de encuentro/i.test(c.fullname)),
    [snapshot?.courses],
  );
  const { datos } = useNotasMoodle(
    client,
    snapshot?.site.userid,
    cursos.map((c) => c.id),
  );

  const grupos: Grupo[] = useMemo(() => {
    return cursos.map((c) => {
      const entregas = (snapshot?.entregas ?? []).filter((e) => e.cursoId === c.id);
      const moodle: NotasCurso | null | undefined = datos[c.id];
      const porNombre = new Map<string, Entrega>(entregas.map((e) => [norm(e.nombre), e]));
      if (moodle && moodle.items.length) {
        const items = moodle.items.map((i) => ({
          ...i,
          fecha: porNombre.get(norm(i.nombre))?.fecha || i.fecha,
        }));
        const conPesos = items.some((i) => i.peso);
        return {
          cursoId: c.id,
          items,
          total: moodle.total,
          conPesos,
          sinCorregir: items.filter((i) => i.nota === undefined).length,
        };
      }
      // Sin libro de calificaciones: las notas que traen las entregas
      const items: ItemNota[] = entregas
        .filter((e) => e.tipo !== 'scorm')
        .sort((a, b) => (a.fecha || 0) - (b.fecha || 0))
        .map((e) => {
          const n = leerNota(e.nota);
          return {
            nombre: e.nombre,
            cmid: e.cmid,
            nota: n?.nota,
            max: n?.max ?? 10,
            fecha: e.fecha,
          };
        });
      const corregidas = items.filter((i) => i.nota !== undefined);
      const total = corregidas.length
        ? {
            nota:
              (corregidas.reduce((a, i) => a + (i.nota as number) / i.max, 0) / corregidas.length) *
              10,
            max: 10,
          }
        : undefined;
      return {
        cursoId: c.id,
        items,
        total,
        conPesos: false,
        sinCorregir: items.length - corregidas.length,
      };
    });
  }, [cursos, datos, snapshot?.entregas]);

  const conNota = grupos.filter((g) => g.total).length;
  const [abiertas, setAbiertas] = useState<Record<number, boolean>>({});
  const primero = grupos.find((g) => g.items.length)?.cursoId;
  const abierta = (g: Grupo) => abiertas[g.cursoId] ?? g.cursoId === primero;
  const padX = usePadX(64);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#0B0B0D' }}
      contentContainerStyle={{
        paddingHorizontal: padX,
        paddingTop: (movil ? 28 : 40) + arriba,
        paddingBottom: 40,
      }}>
      <View style={{ width: '100%', maxWidth: 1140, alignSelf: 'center', gap: movil ? 28 : 40 }}>
        <View
          style={{
            flexDirection: movil ? 'column' : 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: movil ? 18 : 0,
            borderBottomWidth: 1,
            borderBottomColor: '#17171C',
            paddingBottom: movil ? 24 : 36,
          }}>
          <View style={{ flex: movil ? undefined : 1 }}>
            <T w={500} up s={10.5} ls={0.24} c={N.n500} style={{ marginBottom: 8 }}>
              Evaluación
            </T>
            <T k="serif" s={movil ? 36 : 42} lh={movil ? 44 : 52} c="#F5F0E8">
              Notas
            </T>
            <T s={13} lh={21} c={N.n400} style={{ marginTop: 14, maxWidth: 672 }}>
              Los pesos son provisionales: cambian a medida que se corrigen las actividades que
              quedan abiertas.
            </T>
          </View>
          <View
            style={{ alignItems: movil ? 'flex-start' : 'flex-end', paddingTop: movil ? 0 : 8 }}>
            <T w={500} up s={10} ls={0.22} c={N.n500} style={{ marginBottom: 4 }}>
              Con nota disponible
            </T>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <T k="serif" w={500} s={34} lh={34} c={O.white}>
                {conNota}
              </T>
              <T w={300} s={14} c={N.n500}>
                de {grupos.length}
              </T>
            </View>
          </View>
        </View>

        <View style={{ gap: movil ? 16 : 24 }}>
          {grupos.map((g) => {
            const a = info(g.cursoId);
            const total = g.total;
            const oficial = !!total && g.sinCorregir === 0 && g.items.length > 0;
            const abiertaG = abierta(g);
            return (
              <View
                key={g.cursoId}
                style={{
                  backgroundColor: O.card,
                  borderWidth: 1,
                  borderColor: '#1D1D23',
                  borderRadius: 12,
                  overflow: 'hidden',
                }}>
                <View
                  style={{
                    padding: movil ? 20 : 28,
                    paddingBottom: abiertaG ? 20 : movil ? 20 : 28,
                    flexDirection: movil ? 'column' : 'row',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: movil ? 18 : 24,
                  }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      gap: 14,
                      flex: movil ? undefined : 1,
                      maxWidth: movil ? undefined : 560,
                      width: movil ? '100%' : undefined,
                    }}>
                    <View
                      style={{
                        width: 3,
                        height: 36,
                        borderRadius: 99,
                        backgroundColor: a.color,
                        marginTop: 2,
                      }}
                    />
                    <View style={{ flex: 1 }}>
                      <T w={600} s={16} c={O.white} ls={-0.025}>
                        {a.nombre}
                      </T>
                      <T up s={10.5} w={500} ls={0.2} c={N.n500} style={{ marginTop: 4 }}>
                        {a.profesor ?? ''}
                      </T>
                      {!oficial && total ? (
                        <T s={13} lh={21} c={N.n400} style={{ marginTop: 14 }}>
                          {g.conPesos
                            ? 'La media es una estimación con los pesos actuales y puede variar cuando se corrijan las actividades pendientes.'
                            : 'Moodle no da aquí los pesos de esta asignatura: la media es una estimación simple de las notas que ya tienes.'}
                        </T>
                      ) : null}
                      {g.items.length ? (
                        <Pressable
                          onPress={() => setAbiertas((p) => ({ ...p, [g.cursoId]: !abiertaG }))}
                          style={{
                            marginTop: 16,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                          }}>
                          <T up s={10.5} w={500} ls={0.16} c={N.n400}>
                            {abiertaG ? 'Ocultar actividades' : 'Ver actividades'}
                          </T>
                          <Feather
                            name={abiertaG ? 'chevron-up' : 'chevron-down'}
                            size={12}
                            color={N.n400}
                          />
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                  <View
                    style={{
                      alignItems: movil ? 'flex-start' : 'flex-end',
                      paddingLeft: movil ? 17 : 0,
                    }}>
                    {total ? (
                      <>
                        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                          <T k="serif" w={500} s={38} lh={38} c={O.white} ls={-0.025}>
                            {oficial ? '' : '≈ '}
                            {fmt(oficial ? total.nota : Math.round(total.nota * 10) / 10)}
                          </T>
                          <T w={300} s={14} c={N.n500}>
                            / {fmt(total.max)}
                          </T>
                        </View>
                        <View
                          style={{
                            marginTop: 10,
                            paddingHorizontal: 12,
                            paddingVertical: 4,
                            borderRadius: 99,
                            borderWidth: 1,
                            borderColor: oficial ? 'rgba(133,80,24,0.5)' : 'rgba(120,53,15,0.6)',
                            backgroundColor: oficial ? '#251B11' : '#24170D',
                          }}>
                          <T up s={10} w={600} ls={0.16} c="#D97706">
                            {oficial ? 'Nota oficial' : 'Estimación'}
                          </T>
                        </View>
                        {!oficial && g.conPesos ? (
                          <T up s={9.5} w={500} ls={0.2} c={N.n500} style={{ marginTop: 10 }}>
                            Media ponderada provisional
                          </T>
                        ) : null}
                      </>
                    ) : (
                      <T up s={10} w={500} ls={0.2} c={N.n500}>
                        Sin notas todavía
                      </T>
                    )}
                  </View>
                </View>

                {abiertaG && g.items.length ? (
                  <>
                    <View
                      style={{
                        paddingHorizontal: movil ? 20 : 28,
                        paddingBottom: 16,
                        paddingTop: 8,
                      }}>
                      {movil ? null : (
                        <View
                          style={{
                            flexDirection: 'row',
                            borderBottomWidth: 1,
                            borderBottomColor: '#1B1B22',
                            paddingBottom: 12,
                          }}>
                          <T up s={10} w={500} ls={0.2} c={N.n500} style={{ flex: 1 }}>
                            Actividad
                          </T>
                          <T
                            up
                            s={10}
                            w={500}
                            ls={0.2}
                            c={N.n500}
                            style={{ width: 110, textAlign: 'right' }}>
                            Fecha
                          </T>
                          {g.conPesos ? (
                            <T
                              up
                              s={10}
                              w={500}
                              ls={0.2}
                              c={N.n500}
                              style={{ width: 90, textAlign: 'right' }}>
                              Peso
                            </T>
                          ) : null}
                          <T
                            up
                            s={10}
                            w={500}
                            ls={0.2}
                            c={N.n500}
                            style={{ width: 110, textAlign: 'right' }}>
                            Nota
                          </T>
                        </View>
                      )}
                      {g.items.map((i, idx) => {
                        const corregida = i.nota !== undefined;
                        return (
                          <View
                            key={`${i.nombre}-${idx}`}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              paddingVertical: 14,
                              borderTopWidth: idx === 0 ? 0 : 1,
                              borderTopColor: '#17171D',
                            }}>
                            {movil ? (
                              <View style={{ flex: 1, paddingRight: 12 }}>
                                <T w={corregida ? 500 : 400} s={13} c={corregida ? N.n200 : N.n400}>
                                  {i.nombre}
                                </T>
                                <T k="mono" s={10.5} c={N.n500} style={{ marginTop: 3 }}>
                                  {[
                                    fechaItem(i.fecha),
                                    g.conPesos && i.peso
                                      ? i.peso.replace(',00', '').replace(/\s+%/, '%')
                                      : null,
                                  ]
                                    .filter(Boolean)
                                    .join(' · ')}
                                </T>
                              </View>
                            ) : (
                              <>
                                <T
                                  w={corregida ? 500 : 400}
                                  s={13}
                                  c={corregida ? N.n200 : N.n400}
                                  style={{ flex: 1 }}
                                  numberOfLines={1}>
                                  {i.nombre}
                                </T>
                                <T
                                  w={300}
                                  s={13}
                                  c={i.fecha ? N.n400 : N.n600}
                                  style={{ width: 110, textAlign: 'right' }}>
                                  {fechaItem(i.fecha)}
                                </T>
                              </>
                            )}
                            {g.conPesos && !movil ? (
                              <T
                                k="mono"
                                s={12.5}
                                c={N.n400}
                                style={{ width: 90, textAlign: 'right' }}>
                                {i.peso ? i.peso.replace(',00', '').replace(/\s+%/, '%') : '—'}
                              </T>
                            ) : null}
                            <View
                              style={{ width: movil ? undefined : 110, alignItems: 'flex-end' }}>
                              {corregida ? (
                                <Text2 nota={i.nota as number} max={i.max} />
                              ) : (
                                <T up s={11} w={500} ls={0.1} c={N.n500}>
                                  Pendiente
                                </T>
                              )}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                    <View
                      style={{
                        paddingHorizontal: movil ? 20 : 28,
                        paddingVertical: 12,
                        borderTopWidth: 1,
                        borderTopColor: '#17171D',
                        backgroundColor: '#0E0E11',
                        flexDirection: movil ? 'column' : 'row',
                        gap: movil ? 4 : 0,
                        justifyContent: 'space-between',
                      }}>
                      <T up s={10} w={500} ls={0.2} c={N.n500}>
                        {g.conPesos
                          ? 'Pesos provisionales · pueden cambiar'
                          : 'Sin pesos: media simple'}
                      </T>
                      <T up s={10} w={500} ls={0.2} c={N.n500}>
                        {g.sinCorregir === 0 ? 'Todo corregido' : `${g.sinCorregir} sin corregir`}
                      </T>
                    </View>
                  </>
                ) : null}
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

function Text2({ nota, max }: { nota: number; max: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
      <T w={600} s={13} c={O.white}>
        {fmt(nota)}
      </T>
      <T w={300} s={13} c={N.n500}>
        {' '}
        / {fmt(max)}
      </T>
    </View>
  );
}
