import Feather from '@expo/vector-icons/Feather';
import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { FilaAjuste, Interruptor } from '@/components/ajustes-ui';
import { Caja, Seccion } from '@/components/anden';
import { Button } from '@/components/button';
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
import {
  comprobarComoSegundoPlano,
  diagnosticoSegundoPlano,
  lanzarAlSalir,
  simularNovedades,
} from '@/lib/pruebas-dev';
import { useMoodle } from '@/lib/store';

type ClaveAviso = 'notas' | 'novedades' | 'recordatorios';

const OPCIONES: { clave: ClaveAviso; titulo: string; texto: string }[] = [
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
  const [diagnostico, setDiagnostico] = useState<string | null>(null);

  useEffect(() => {
    leerPreferencias().then(setPrefs);
    permisoConcedido().then(setPermiso);
    if (__DEV__) diagnosticoSegundoPlano().then(setDiagnostico);
  }, []);

  if (!AVISOS_DISPONIBLES) return null;

  async function cambiar(clave: ClaveAviso, valor: boolean) {
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
    <View>
      <Seccion titulo="Notificaciones" sinRegla />
      {permiso === false ? (
        <View style={[styles.aviso, { backgroundColor: theme.urgentWash }]}>
          <Feather name="bell-off" size={15} color={theme.urgent} style={styles.icono} />
          <View style={styles.flex}>
            <ThemedText type="small" style={{ color: theme.urgent }}>
              Las notificaciones están desactivadas para Hermes. Actívalas para que te avise de
              notas, novedades y entregas.
            </ThemedText>
            <View style={styles.boton}>
              <Button title="Activar notificaciones" compacto onPress={activar} />
            </View>
          </View>
        </View>
      ) : null}
      {OPCIONES.map((o) => (
        <FilaAjuste
          key={o.clave}
          titulo={o.titulo}
          texto={o.texto}
          derecha={<Interruptor value={prefs[o.clave]} onValueChange={(v) => cambiar(o.clave, v)} />}
        />
      ))}
      <FilaAjuste
        icono="send"
        titulo="Probar una notificación"
        texto={msg ?? undefined}
        onPress={probar}
        chevron
      />
      <ThemedText type="meta" themeColor="ink3" style={styles.nota}>
        Hermes mira Moodle cada media hora más o menos, aunque la app esté cerrada. En Xiaomi, para
        que no se lo corte el ahorro de batería: Ajustes del móvil → Apps → Hermes → Ahorro de
        batería → Sin restricciones, y activa Inicio automático.
      </ThemedText>

      {/* Solo en Hermes Dev (cargando el código desde el PC): herramientas para probar los avisos */}
      {__DEV__ ? (
        <Caja style={styles.pruebas}>
          <ThemedText type="smallBold">Pruebas (solo Hermes Dev)</ThemedText>
          <ThemedText type="meta" themeColor="ink2">
            Primero «Simular novedades». Luego «Comprobar ahora» (lo mismo que hace el segundo
            plano, al momento) o «Lanzar al salir» y sal de la app con el botón de inicio.
          </ThemedText>
          {diagnostico ? (
            <ThemedText type="meta" themeColor="ink2">
              {diagnostico}
            </ThemedText>
          ) : null}
          <Button
            title="Simular novedades"
            variant="secondary"
            compacto
            onPress={async () => setMsg(await simularNovedades())}
          />
          <Button
            title="Comprobar ahora (como en segundo plano)"
            variant="secondary"
            compacto
            onPress={async () => {
              setMsg('Comprobando Moodle…');
              setMsg(await comprobarComoSegundoPlano());
            }}
          />
          <Button
            title="Lanzar el segundo plano al salir de la app"
            variant="secondary"
            compacto
            onPress={() => setMsg(lanzarAlSalir())}
          />
          <Button
            title="Actualizar diagnóstico"
            variant="secondary"
            compacto
            onPress={async () => setDiagnostico(await diagnosticoSegundoPlano())}
          />
          {msg ? (
            <ThemedText type="small" style={{ color: theme.brand }}>
              {msg}
            </ThemedText>
          ) : null}
        </Caja>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 8 },
  aviso: { flexDirection: 'row', gap: 10, borderRadius: 8, padding: 12, marginVertical: 6 },
  icono: { marginTop: 2 },
  boton: { alignSelf: 'flex-start' },
  nota: { paddingTop: 10 },
  pruebas: { marginTop: Spacing.three, gap: 8 },
});
