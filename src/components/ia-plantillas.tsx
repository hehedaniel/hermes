/**
 * Ajustes > Inteligencia artificial: plantillas de entrega y muestra de estilo.
 *  - Plantilla: un documento (PDF, Word o texto) con el formato que debe seguir lo que genere la IA.
 *  - Estilo: un texto escrito por el alumno, para que la IA escriba como él.
 */
import Feather from '@expo/vector-icons/Feather';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { Campo, Etiqueta } from '@/components/ajustes-ui';
import { Caja } from '@/components/anden';
import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { avisar, confirmar } from '@/lib/dialogo';
import { elegirDocumento } from '@/lib/ia/leer-documento';
import { MAX_ESTILO, MAX_PLANTILLA } from '@/lib/ia/plantillas-datos';
import { usePlantillas } from '@/lib/ia/plantillas';

const kb = (n: number) =>
  n < 1000 ? `${n} caracteres` : `${(n / 1000).toFixed(1)} mil caracteres`;

export function IAPlantillas() {
  const theme = useTheme();
  const p = usePlantillas();
  const [ocupado, setOcupado] = useState<'plantilla' | 'estilo' | null>(null);
  const [pegando, setPegando] = useState<'plantilla' | 'estilo' | null>(null);
  const [nombre, setNombre] = useState('');
  const [texto, setTexto] = useState('');

  async function subir(para: 'plantilla' | 'estilo') {
    setOcupado(para);
    try {
      const doc = await elegirDocumento();
      if (!doc) return;
      if (para === 'plantilla')
        p.anadir(doc.nombre.replace(/\.[^.]+$/, ''), doc.texto, doc.nombre, doc.docx);
      else p.cambiarEstilo({ archivo: doc.nombre, texto: doc.texto });
    } catch (e) {
      avisar('No se pudo leer el documento', (e as Error).message);
    } finally {
      setOcupado(null);
    }
  }

  function guardarPegado() {
    if (!texto.trim()) return;
    if (pegando === 'plantilla') p.anadir(nombre, texto);
    else p.cambiarEstilo({ texto });
    setPegando(null);
    setNombre('');
    setTexto('');
  }

  function quitar(id: string, nombre: string) {
    confirmar({
      titulo: 'Quitar plantilla',
      texto: `Se borrará «${nombre}» de todos tus dispositivos.`,
      boton: 'Quitar',
      destructivo: true,
      onOk: () => p.borrar(id),
    });
  }

  const formulario = (
    <View style={styles.bloque}>
      {pegando === 'plantilla' ? (
        <Campo value={nombre} onChangeText={setNombre} placeholder="Nombre de la plantilla" />
      ) : null}
      <Campo
        value={texto}
        onChangeText={setTexto}
        placeholder={
          pegando === 'plantilla'
            ? 'Pega aquí la estructura: portada, apartados, formato…'
            : 'Pega aquí un texto tuyo (un trabajo, un resumen…) con tu forma de escribir.'
        }
        multiline
      />
      <View style={styles.row}>
        <Button title="Guardar" onPress={guardarPegado} compacto disabled={!texto.trim()} />
        <Button
          title="Cancelar"
          variant="ghost"
          compacto
          onPress={() => {
            setPegando(null);
            setTexto('');
            setNombre('');
          }}
        />
      </View>
    </View>
  );

  return (
    <View style={styles.todo}>
      <View style={styles.bloque}>
        <Etiqueta>Plantillas de entrega</Etiqueta>
        <ThemedText type="small" themeColor="ink2">
          Sube el documento con el formato que quieres. Si es un Word (.docx) hecho con estilos
          (Título 1, Título 2…), la app rellena tu propio documento: portada, índice, tipografías,
          pies de página… y la IA solo escribe el contenido. Un PDF o un texto sirven de guía de
          apartados, pero no conservan el formato. Puedes elegir otra distinta en cada tarea.
        </ThemedText>
        {p.datos.plantillas.length ? (
          <Caja style={styles.lista}>
            {p.datos.plantillas.map((pl, i) => {
              const sel = p.datos.defecto === pl.id;
              return (
                <View
                  key={pl.id}
                  style={[styles.fila, i > 0 && { borderTopWidth: 1, borderTopColor: theme.line }]}>
                  <Pressable
                    onPress={() => p.ponerDefecto(sel ? null : pl.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: sel }}
                    accessibilityLabel={`Usar «${pl.nombre}» por defecto`}
                    hitSlop={8}
                    style={[styles.radio, { borderColor: sel ? theme.brand : theme.line2 }]}>
                    {sel ? (
                      <View style={[styles.radioDentro, { backgroundColor: theme.brand }]} />
                    ) : null}
                  </Pressable>
                  <View style={styles.flex}>
                    <ThemedText type="smallBold" numberOfLines={1}>
                      {pl.nombre}
                    </ThemedText>
                    <ThemedText type="meta" themeColor="ink2" numberOfLines={1}>
                      {sel ? 'Por defecto · ' : ''}
                      {pl.docx ? 'Word con tu formato · ' : ''}
                      {pl.archivo ? `${pl.archivo} · ` : ''}
                      {kb(pl.texto.length)}
                      {pl.texto.length > MAX_PLANTILLA ? ' (se usará el principio)' : ''}
                    </ThemedText>
                  </View>
                  <Pressable
                    onPress={() => quitar(pl.id, pl.nombre)}
                    hitSlop={8}
                    accessibilityLabel={`Quitar «${pl.nombre}»`}>
                    <Feather name="trash-2" size={16} color={theme.ink3} />
                  </Pressable>
                </View>
              );
            })}
          </Caja>
        ) : (
          <ThemedText type="small" themeColor="ink3">
            Todavía no has subido ninguna plantilla.
          </ThemedText>
        )}
        {pegando === 'plantilla' ? (
          formulario
        ) : (
          <View style={styles.row}>
            <Button
              title="Subir plantilla"
              icono="upload"
              compacto
              variant="secondary"
              loading={ocupado === 'plantilla'}
              onPress={() => subir('plantilla')}
            />
            <Button
              title="Pegar texto"
              compacto
              variant="ghost"
              onPress={() => setPegando('plantilla')}
            />
          </View>
        )}
      </View>

      <View style={styles.bloque}>
        <Etiqueta>Mi estilo de escritura</Etiqueta>
        <ThemedText type="small" themeColor="ink2">
          Sube algo que hayas escrito tú (un trabajo, un resumen) y la IA copiará tu forma de
          escribir: tono, frases y vocabulario. Cuanto más texto, mejor. Se guarda en tus Archivos
          privados de Moodle para verlo en todos tus dispositivos.
        </ThemedText>
        {p.datos.estilo ? (
          <Caja style={styles.lista}>
            <View style={styles.fila}>
              <Feather name="file-text" size={16} color={theme.brand} />
              <View style={styles.flex}>
                <ThemedText type="smallBold" numberOfLines={1}>
                  {p.datos.estilo.archivo ?? 'Texto pegado'}
                </ThemedText>
                <ThemedText type="meta" themeColor="ink2">
                  {kb(p.datos.estilo.texto.length)}
                  {p.datos.estilo.texto.length > MAX_ESTILO ? ' (se usará el principio)' : ''}
                </ThemedText>
              </View>
              <Pressable
                onPress={() => p.cambiarEstilo(null)}
                hitSlop={8}
                accessibilityLabel="Quitar mi estilo">
                <Feather name="trash-2" size={16} color={theme.ink3} />
              </Pressable>
            </View>
            <View style={[styles.fila, { borderTopWidth: 1, borderTopColor: theme.line }]}>
              <ThemedText type="small" style={styles.flex}>
                Usar mi estilo en las tareas
              </ThemedText>
              <Switch
                value={p.datos.usarEstilo}
                onValueChange={p.ponerUsarEstilo}
                accessibilityLabel="Usar mi estilo en las tareas"
              />
            </View>
          </Caja>
        ) : (
          <ThemedText type="small" themeColor="ink3">
            Todavía no has subido ningún texto tuyo.
          </ThemedText>
        )}
        {pegando === 'estilo' ? (
          formulario
        ) : (
          <View style={styles.row}>
            <Button
              title={p.datos.estilo ? 'Cambiar mi texto' : 'Subir un texto mío'}
              icono="upload"
              compacto
              variant="secondary"
              loading={ocupado === 'estilo'}
              onPress={() => subir('estilo')}
            />
            <Button
              title="Pegar texto"
              compacto
              variant="ghost"
              onPress={() => setPegando('estilo')}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  todo: { gap: Spacing.four },
  flex: { flex: 1, minWidth: 0 },
  bloque: { gap: 10 },
  row: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap', alignItems: 'center' },
  lista: { overflow: 'hidden' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDentro: { width: 8, height: 8, borderRadius: 4 },
});
