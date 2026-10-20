import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { useMoodle } from '@/lib/store';

/** En web no hay pestañas nativas: se usan las de JavaScript (abajo, como en el móvil). */
export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { noLeidas } = useMoodle();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
        tabBarIconStyle: { display: 'none' },
        tabBarLabelStyle: { fontSize: 14, fontWeight: '600' },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Pendientes' }} />
      <Tabs.Screen
        name="novedades"
        options={{ title: 'Novedades', tabBarBadge: noLeidas || undefined }}
      />
      <Tabs.Screen name="calendario" options={{ title: 'Calendario' }} />
      <Tabs.Screen name="cursos" options={{ title: 'Asignaturas' }} />
      <Tabs.Screen name="ajustes" options={{ title: 'Ajustes' }} />
    </Tabs>
  );
}
