import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { type ColorValue, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useMoodle } from '@/lib/store';

type Icono = ComponentProps<typeof MaterialIcons>['name'];
function icono(name: Icono) {
  function TabIcon({ color }: { color: ColorValue }) {
    return <MaterialIcons name={name} size={24} color={color as string} />;
  }
  return TabIcon;
}

/** En web no hay pestañas nativas: se usan las de JavaScript, abajo y con iconos como en el móvil. */
export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { noLeidas } = useMoodle();
  // Altura fija: la que trae por defecto en web deja la etiqueta cortada. + la barra de inicio del iPhone
  const { bottom } = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          height: 58 + bottom,
          paddingTop: 6,
          paddingBottom: 6 + bottom,
        },
        tabBarLabelStyle: { fontSize: 11, lineHeight: 14, minHeight: 14, fontWeight: '600' },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Pendientes', tabBarIcon: icono('checklist') }} />
      <Tabs.Screen
        name="novedades"
        options={{
          title: 'Novedades',
          tabBarIcon: icono('notifications'),
          tabBarBadge: noLeidas || undefined,
        }}
      />
      <Tabs.Screen
        name="calendario"
        options={{ title: 'Calendario', tabBarIcon: icono('calendar-month') }}
      />
      <Tabs.Screen name="cursos" options={{ title: 'Asignaturas', tabBarIcon: icono('school') }} />
      <Tabs.Screen name="ajustes" options={{ title: 'Ajustes', tabBarIcon: icono('settings') }} />
    </Tabs>
  );
}
