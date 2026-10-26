import { type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Muestra el Markdown de las respuestas de la IA sin librerías: títulos, listas, código,
 * negritas, cursivas, `código` y tablas.
 */
export function TextoMarkdown({ texto }: { texto: string }) {
  const theme = useTheme();
  const bloques = trocear(texto);
  return (
    <View style={styles.col}>
      {bloques.map((b, i) => {
        if (b.tipo === 'tabla') {
          return <Tabla key={i} filas={b.filas} />;
        }
        if (b.tipo === 'codigo') {
          return (
            <View
              key={i}
              style={[styles.codigo, { backgroundColor: theme.paper2, borderColor: theme.line }]}>
              <ThemedText style={styles.mono} selectable>
                {b.texto}
              </ThemedText>
            </View>
          );
        }
        if (b.tipo === 'titulo') {
          return (
            <ThemedText key={i} style={b.nivel === 1 ? styles.h1 : styles.h2} selectable>
              {enLinea(b.texto)}
            </ThemedText>
          );
        }
        if (b.tipo === 'lista') {
          return (
            <View key={i} style={[styles.item, { paddingLeft: 4 + b.nivel * 14 }]}>
              <ThemedText type="small" style={styles.vineta}>
                {b.marca}
              </ThemedText>
              <ThemedText type="small" style={styles.flex} selectable>
                {enLinea(b.texto)}
              </ThemedText>
            </View>
          );
        }
        return (
          <ThemedText key={i} type="small" style={styles.parrafo} selectable>
            {enLinea(b.texto)}
          </ThemedText>
        );
      })}
    </View>
  );
}

/** Tabla de verdad: cabecera en versalitas, filas separadas por reglas y cifras alineadas. */
function Tabla({ filas }: { filas: string[][] }) {
  const theme = useTheme();
  const [cabecera, ...cuerpo] = filas;
  if (!cabecera) return null;
  const columnas = cabecera.length;
  const tabla = (
    <View style={[styles.tabla, columnas > 3 && { minWidth: columnas * 120 }]}>
      <View style={[styles.filaTabla, { borderBottomColor: theme.line2 }]}>
        {cabecera.map((c, j) => (
          <ThemedText key={j} type="label" themeColor="ink3" style={styles.celda}>
            {c}
          </ThemedText>
        ))}
      </View>
      {cuerpo.map((f, i) => (
        <View
          key={i}
          style={[styles.filaTabla, i < cuerpo.length - 1 && { borderBottomColor: theme.line }]}>
          {cabecera.map((_, j) => (
            <ThemedText key={j} type="small" style={styles.celda} selectable>
              {enLinea(f[j] ?? '')}
            </ThemedText>
          ))}
        </View>
      ))}
    </View>
  );
  return columnas > 3 ? (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {tabla}
    </ScrollView>
  ) : (
    tabla
  );
}

type Bloque =
  | { tipo: 'parrafo' | 'codigo'; texto: string }
  | { tipo: 'tabla'; filas: string[][] }
  | { tipo: 'titulo'; texto: string; nivel: number }
  | { tipo: 'lista'; texto: string; nivel: number; marca: string };

function trocear(md: string): Bloque[] {
  const out: Bloque[] = [];
  const lineas = md.replace(/\r/g, '').split('\n');
  let parrafo: string[] = [];
  const cerrarParrafo = () => {
    if (parrafo.length) out.push({ tipo: 'parrafo', texto: parrafo.join('\n') });
    parrafo = [];
  };
  for (let i = 0; i < lineas.length; i++) {
    const l = lineas[i];
    if (/^\s*```/.test(l)) {
      cerrarParrafo();
      const codigo: string[] = [];
      while (++i < lineas.length && !/^\s*```/.test(lineas[i])) codigo.push(lineas[i]);
      out.push({ tipo: 'codigo', texto: codigo.join('\n') });
      continue;
    }
    if (/^\s*\|/.test(l)) {
      cerrarParrafo();
      const filas: string[] = [];
      for (; i < lineas.length && /^\s*\|/.test(lineas[i]); i++) {
        if (!/^\s*\|[\s:|-]+\|\s*$/.test(lineas[i])) filas.push(lineas[i].trim());
      }
      i--;
      out.push({ tipo: 'tabla', filas: celdasDe(filas) });
      continue;
    }
    const titulo = l.match(/^(#{1,6})\s+(.*)$/);
    if (titulo) {
      cerrarParrafo();
      out.push({ tipo: 'titulo', texto: titulo[2], nivel: titulo[1].length });
      continue;
    }
    const lista = l.match(/^(\s*)([-*•]|\d+[.)])\s+(.*)$/);
    if (lista) {
      cerrarParrafo();
      const marca = /\d/.test(lista[2]) ? lista[2].replace(')', '.') : '•';
      out.push({ tipo: 'lista', texto: lista[3], nivel: Math.floor(lista[1].length / 2), marca });
      continue;
    }
    if (!l.trim()) cerrarParrafo();
    else if (/^\s*(---|\*\*\*|___)\s*$/.test(l)) cerrarParrafo();
    else parrafo.push(l.replace(/^>\s?/, ''));
  }
  cerrarParrafo();
  return out;
}

function celdasDe(filas: string[]) {
  return filas.map((f) =>
    f
      .replace(/^\||\|$/g, '')
      .split('|')
      .map((c) => c.trim()),
  );
}

/** **negrita**, *cursiva* / _cursiva_ y `código` dentro de una línea. */
function enLinea(texto: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g;
  let ultimo = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(texto))) {
    if (m.index > ultimo) out.push(texto.slice(ultimo, m.index));
    const t = m[0];
    if (t.startsWith('**') || t.startsWith('__'))
      out.push(
        <ThemedText key={k++} type="smallBold">
          {t.slice(2, -2)}
        </ThemedText>,
      );
    else if (t.startsWith('`'))
      out.push(
        <ThemedText key={k++} type="code">
          {t.slice(1, -1)}
        </ThemedText>,
      );
    else
      out.push(
        <ThemedText key={k++} type="small" style={styles.cursiva}>
          {t.slice(1, -1)}
        </ThemedText>,
      );
    ultimo = m.index + t.length;
  }
  if (ultimo < texto.length) out.push(texto.slice(ultimo));
  return out;
}

const styles = StyleSheet.create({
  col: { gap: Spacing.two },
  flex: { flex: 1 },
  h1: { fontSize: 18, lineHeight: 24, fontWeight: 700 },
  h2: { fontSize: 15.5, lineHeight: 22, fontWeight: 700 },
  parrafo: { lineHeight: 21 },
  item: { flexDirection: 'row', gap: 6 },
  vineta: { minWidth: 14 },
  cursiva: { fontStyle: 'italic' },
  codigo: { borderRadius: 8, borderWidth: 1, padding: 10 },
  tabla: { alignSelf: 'stretch' },
  filaTabla: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'transparent' },
  celda: { flex: 1, paddingVertical: 6, paddingRight: 10, fontVariant: ['tabular-nums'] },
  mono: { fontFamily: Fonts.mono, fontSize: 12, lineHeight: 17 },
});
