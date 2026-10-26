import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Muestra el Markdown de las respuestas de la IA sin librerías: títulos, listas, código,
 * negritas, cursivas y `código`. Las tablas se ven en monoespaciado para que cuadren.
 */
export function TextoMarkdown({ texto }: { texto: string }) {
  const theme = useTheme();
  const bloques = trocear(texto);
  return (
    <View style={styles.col}>
      {bloques.map((b, i) => {
        if (b.tipo === 'codigo' || b.tipo === 'tabla') {
          return (
            <View key={i} style={[styles.codigo, { backgroundColor: theme.backgroundSelected }]}>
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

type Bloque =
  | { tipo: 'parrafo' | 'codigo' | 'tabla'; texto: string }
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
      out.push({ tipo: 'tabla', texto: alinearTabla(filas) });
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

function alinearTabla(filas: string[]) {
  const celdas = filas.map((f) =>
    f
      .replace(/^\||\|$/g, '')
      .split('|')
      .map((c) => c.trim().replace(/\*\*/g, '')),
  );
  const anchos =
    celdas[0]?.map((_, j) => Math.max(...celdas.map((c) => (c[j] ?? '').length))) ?? [];
  return celdas.map((c) => c.map((x, j) => x.padEnd(anchos[j] ?? 0)).join(' │ ')).join('\n');
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
  codigo: { borderRadius: 8, padding: Spacing.two },
  mono: { fontFamily: Fonts.mono, fontSize: 12, lineHeight: 17 },
});
