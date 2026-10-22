import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { Button } from '@/components/button';
import { SectionTitle } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  AVISOS_DISPONIBLES,
  AVISOS_POR_DEFECTO,
  avisoDePrueba,
  guardarPreferencias,
  leerPreferencias,
  pedirPermiso,
  permisoConcedido,
  type PreferenciasAvisos,
  programarRecordatorios,
} from '@/lib/avisos';
import { ejecutarSegundoPlanoYa, simularNovedades } from '@/lib/pruebas-dev';
import { useMoodle } from '@/lib/store';

const OPCIONES: { clave: keyof PreferenciasAvisos; titulo: string; texto: string }[] = [
  { clave: 'notas', titulo: 'Notas', texto: 'Cuando te publican la nota de una entrega.' },
  {
    clave: 'novedades',
    titulo: 'Novedades',
    texto: 'Apuntes nuevos o actualizados, entregas nuevas y cambios de fecha.',
  },
  {
    clave: 'recordatorios',
    titulo: 'Recordatorios',
    texto: '1 día y 2 horas antes de cada entrega pendiente.',
  },
];

/** Ajustes > Notificaciones. En la web no aparece (no hay notificaciones). */
export function AvisosSettings() {
  const theme = useTheme();
  const { snapshot } = useMoodle();
  const [prefs, setPrefs] = useState<PreferenciasAvisos>(AVISOS_POR_DEFECTO);
  const [permiso, setPermiso] = useState<boolean | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    leerPreferencias().then(setPrefs);
    permisoConcedido().then(setPermiso);
  }, []);

  if (!AVISOS_DISPONIBLES) return null;

  async function cambiar(clave: keyof PreferenciasAvisos, valor: boolean) {
    const nuevas = { ...prefs, [clave]: valor };
    setPrefs(nuevas);
    await guardarPreferencias(nuevas);
    if (clave === 'recordatorios') programarRecordatorios(snapshot);
  }

  async function activar() {
    const ok = await pedirPermiso();
    setPermiso(ok);
    if (ok) programarRecordatorios(snapshot);
    else Linking.openSettings(); // ya lo denegó: solo se puede activar desde los ajustes del móvil
  }

  async function probar() {
    const ok = await avisoDePrueba();
    setPermiso(ok);
    setMsg(ok ? 'Enviada. Debería salirte arriba en un momento.' : null);
  }

  return (
    <>
      <SectionTitle>Notificaciones</SectionTitle>
      {permiso === false ? (
        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="small">
            Las notificaciones están desactivadas para Hermes. Actívalas para que te avise de notas,
            novedades y entregas.
          </ThemedText>
          <Button title="Activar notificaciones" onPress={activar} />
        </View>
      ) : null}
      <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
        {OPCIONES.map((o) => (
          <View key={o.clave} style={styles.opcion}>
            <View style={styles.flex}>
              <ThemedText type="smallBold">{o.titulo}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {o.texto}
              </ThemedText>
            </View>
            <Switch
              value={prefs[o.clave]}
              onValueChange={(v) => cambiar(o.clave, v)}
              trackColor={{ true: theme.accent, false: theme.backgroundSelected }}
              thumbColor="#ffffff"
            />
          </View>
        ))}
      </View>
      <Button title="Probar una notificación" variant="secondary" onPress={probar} />
      {msg ? (
        <ThemedText type="small" style={{ color: theme.accent }}>
          {msg}
        </ThemedText>
      ) : null}
      <ThemedText type="small" themeColor="textSecondary">
        Hermes mira Moodle cada media hora más o menos, aunque la app esté cerrada. En Xiaomi, para
        que no se lo corte el ahorro de batería: Ajustes del móvil → Apps → Hermes → Ahorro de
        batería → Sin restricciones, y activa Inicio automático.
      </ThemedText>

      {/* Solo en Hermes Dev (cargando el código desde el PC): herramientas para probar los avisos */}
      {__DEV__ ? (
        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="smallBold">Pruebas (solo Hermes Dev)</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            1. «Simular novedades». 2. Cierra la app. 3. Vuelve y pulsa «Ejecutar el segundo plano
            ya», o tira para sincronizar.
          </ThemedText>
          <Button
            title="Simular novedades"
            variant="secondary"
            onPress={async () => setMsg(await simularNovedades())}
          />
          <Button
            title="Ejecutar el segundo plano ya"
            variant="secondary"
            onPress={async () => setMsg(await ejecutarSegundoPlanoYa())}
          />
          {msg ? (
            <ThemedText type="small" style={{ color: theme.accent }}>
              {msg}
            </ThemedText>
          ) : null}
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, padding: Spacing.three, gap: Spacing.three },
  opcion: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  flex: { flex: 1, gap: 2 },
});
