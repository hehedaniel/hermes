import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Segmented } from '@/components/button';
import { EntregaCard } from '@/components/entrega-card';
import { Screen, SectionTitle } from '@/components/screen';
import { Vacio } from '@/components/vacio';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import type { Entrega } from '@/lib/data';
import { useMoodle } from '@/lib/store';

type Filtro = 'pendientes' | 'todas';
const DIA = 86400;

export default function PendientesScreen() {
  const { client, snapshot, ready } = useMoodle();
  const [filtro, setFiltro] = useState<Filtro>('pendientes');
  const nowMs = useNow();

  const grupos = useMemo(
    () => agrupar(snapshot?.entregas ?? [], filtro, nowMs / 1000),
    [snapshot, filtro, nowMs],
  );

  if (ready && !client) {
    return (
      <Screen title="Pendientes" refreshable={false}>
        <Vacio
          titulo="Conecta tu Moodle"
          texto="Pega tu token en Ajustes para ver aquí todas tus entregas."
          accion={<Button title="Ir a Ajustes" onPress={() => router.navigate('/ajustes')} />}
        />
      </Screen>
    );
  }

  return (
    <Screen title="Pendientes">
      <Resumen entregas={snapshot?.entregas ?? []} nowMs={nowMs} />
      <Segmented
        value={filtro}
        onChange={setFiltro}
        options={[
          { value: 'pendientes', label: 'Por hacer' },
          { value: 'todas', label: 'Todas' },
        ]}
      />
      {snapshot && grupos.every((g) => g.items.length === 0) ? (
        <Vacio
          titulo="Nada pendiente 🎉"
          texto="No tienes entregas por hacer. Tira hacia abajo para actualizar."
        />
      ) : null}
      {grupos.map((g) =>
        g.items.length ? (
          <View key={g.titulo} style={styles.group}>
            <SectionTitle>
              {g.titulo} · {g.items.length}
            </SectionTitle>
            {g.items.map((e) => (
              <EntregaCard key={e.key} entrega={e} nowMs={nowMs} />
            ))}
          </View>
        ) : null,
      )}
    </Screen>
  );
}

function agrupar(entregas: Entrega[], filtro: Filtro, now: number) {
  const abiertas = entregas.filter((e) => e.estado !== 'entregada');
  const g = {
    vencidas: abiertas.filter((e) => e.estado === 'vencida' && e.fecha > now - 30 * DIA),
    semana: abiertas.filter((e) => e.estado !== 'vencida' && e.fecha && e.fecha <= now + 7 * DIA),
    despues: abiertas.filter((e) => e.estado !== 'vencida' && e.fecha > now + 7 * DIA),
    sinFecha: abiertas.filter((e) => !e.fecha),
    entregadas: entregas.filter((e) => e.estado === 'entregada').sort((a, b) => b.fecha - a.fecha),
  };
  const out = [
    { titulo: 'Vencidas sin entregar', items: g.vencidas },
    { titulo: 'Próximos 7 días', items: g.semana },
    { titulo: 'Más adelante', items: g.despues },
    { titulo: 'Sin fecha límite', items: g.sinFecha },
  ];
  if (filtro === 'todas') out.push({ titulo: 'Entregadas', items: g.entregadas });
  return out;
}

function Resumen({ entregas, nowMs }: { entregas: Entrega[]; nowMs: number }) {
  const theme = useTheme();
  const now = nowMs / 1000;
  const abiertas = entregas.filter((e) => e.estado === 'pendiente' || e.estado === 'borrador');
  const stats = [
    {
      n: abiertas.filter((e) => e.fecha && e.fecha - now < 3 * DIA).length,
      label: 'en 3 días',
      color: theme.urgente,
    },
    { n: abiertas.length, label: 'por hacer', color: theme.pendiente },
    {
      n: entregas.filter((e) => e.estado === 'vencida' && e.fecha > now - 30 * DIA).length,
      label: 'vencidas',
      color: theme.vencida,
    },
  ];
  return (
    <View style={styles.stats}>
      {stats.map((s) => (
        <View key={s.label} style={[styles.stat, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText style={[styles.statN, { color: s.n ? s.color : theme.textSecondary }]}>
            {s.n}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {s.label}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: Spacing.two },
  stats: { flexDirection: 'row', gap: Spacing.two, marginBottom: Spacing.two },
  stat: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: Spacing.three - 4,
    alignItems: 'center',
  },
  statN: { fontSize: 28, lineHeight: 34, fontWeight: 700 },
});
