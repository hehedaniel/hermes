import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Vacio } from '@/components/vacio';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatoTamano, useDownloads } from '@/lib/downloads';
import { MODULOS, moduloDe } from '@/lib/horario';
import { useCourseColors, useMoodle } from '@/lib/store';

export default function CursosScreen() {
  const { snapshot, client } = useMoodle();
  const { resumen } = useDownloads();
  const theme = useTheme();
  const colorOf = useCourseColors();

  if (!client) {
    return (
      <Screen title="Asignaturas" refreshable={false}>
        <Vacio
          titulo="Conecta tu Moodle"
          texto="Pega tu token en Ajustes para ver tus asignaturas."
        />
      </Screen>
    );
  }

  const cursos = [...(snapshot?.courses ?? [])].sort((a, b) =>
    a.fullname.localeCompare(b.fullname, 'es'),
  );
  const pendientesDe = (id: number) =>
    (snapshot?.entregas ?? []).filter(
      (e) => e.cursoId === id && (e.estado === 'pendiente' || e.estado === 'borrador'),
    ).length;

  return (
    <Screen title="Asignaturas">
      {resumen.archivos ? (
        <ThemedText type="small" themeColor="textSecondary">
          {resumen.archivos} archivos descargados en el móvil · {formatoTamano(resumen.bytes)}
        </ThemedText>
      ) : null}
      {cursos.map((c) => {
        const n = pendientesDe(c.id);
        return (
          <Pressable
            key={c.id}
            onPress={() =>
              router.push({
                pathname: '/curso/[id]',
                params: { id: String(c.id), nombre: c.fullname },
              })
            }
            style={({ pressed }) => [
              styles.card,
              {
                backgroundColor: theme.backgroundElement,
                opacity: pressed ? 0.7 : 1,
              },
            ]}>
            <View style={[styles.avatar, { backgroundColor: colorOf(c.id) }]}>
              <ThemedText style={styles.avatarText}>{iniciales(c.fullname)}</ThemedText>
            </View>
            <View style={styles.body}>
              <ThemedText type="smallBold" numberOfLines={2}>
                {c.fullname}
              </ThemedText>
              {profesorDe(c.fullname) ? (
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  numberOfLines={1}
                  style={styles.profe}>
                  {profesorDe(c.fullname)}
                </ThemedText>
              ) : null}
              <ThemedText
                type="small"
                themeColor={n ? undefined : 'textSecondary'}
                style={n ? { color: theme.urgente } : undefined}>
                {n
                  ? `${n} ${n === 1 ? 'entrega pendiente' : 'entregas pendientes'}`
                  : 'Nada pendiente'}
              </ThemedText>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={theme.textSecondary} />
          </Pressable>
        );
      })}
    </Screen>
  );
}

const profesorDe = (nombreCurso: string) => {
  const m = moduloDe(nombreCurso);
  return m ? MODULOS[m].profesor : null;
};

/** "Sistemas de Big Data" -> "SBD"; "S A A (Sistemas de...)" -> "SAA" */
function iniciales(nombre: string) {
  const limpio = nombre.replace(/\(.*?\)/g, '').replace(/[-–].*$/, '');
  const palabras = limpio.split(/\s+/).filter((p) => p && !/^(de|del|la|el|y|a|en)$/i.test(p));
  return palabras
    .slice(0, 3)
    .map((p) => p[0].toUpperCase())
    .join('');
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    borderRadius: 14,
    padding: Spacing.three - 4,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: 700, fontSize: 15 },
  body: { flex: 1, gap: 2 },
  profe: { fontSize: 12, lineHeight: 16 },
});
