/**
 * Sacar el texto de un PDF en el móvil, para las IA que no leen PDF (DeepSeek, Mistral, Groq).
 * Se usa pdf.js (el mismo del visor) dentro de una WebView invisible, que solo se crea cuando
 * hace falta. <ExtractorPdf /> va montado una vez en el layout raíz.
 * La versión web está en pdf-texto.web.tsx.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { PDFJS } from '../pdf-viewer-html';

type Trabajo = {
  id: number;
  base64: string;
  resolve: (texto: string) => void;
  reject: (e: Error) => void;
};

const cola: Trabajo[] = [];
let siguienteId = 1;
let despertar: (() => void) | null = null;
const MAX_MS = 60_000;

/** Texto de un PDF (en base64), página a página. */
export function extraerTextoPdf(base64: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!despertar) {
      reject(new Error('El lector de PDF no está disponible.'));
      return;
    }
    cola.push({ id: siguienteId++, base64, resolve, reject });
    despertar();
  });
}

const HTML = `<!doctype html><html><head><meta charset="utf-8">
<script src="${PDFJS}/pdf.min.js"></script></head><body><script>
(function () {
  var post = function (o) { window.ReactNativeWebView.postMessage(JSON.stringify(o)); };
  if (!window.pdfjsLib) { post({ type: 'error', message: 'No se pudo cargar el lector de PDF (¿sin internet?).' }); return; }
  pdfjsLib.GlobalWorkerOptions.workerSrc = '${PDFJS}/pdf.worker.min.js';
  async function extraer(id, b64) {
    try {
      var bin = atob(b64), bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      var pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      var partes = [];
      for (var n = 1; n <= Math.min(pdf.numPages, 150); n++) {
        var tc = await (await pdf.getPage(n)).getTextContent();
        var t = tc.items.map(function (it) { return it.str + (it.hasEOL ? '\\n' : ' '); }).join('');
        partes.push('--- Página ' + n + ' ---\\n' + t.replace(/[ \\t]+\\n/g, '\\n').trim());
      }
      post({ type: 'texto', id: id, texto: partes.join('\\n\\n') });
    } catch (e) { post({ type: 'error', id: id, message: String(e && e.message || e) }); }
  }
  function onData(ev) {
    try { var m = JSON.parse(ev.data); if (m && m.id) extraer(m.id, m.base64); } catch (e) {}
  }
  document.addEventListener('message', onData);
  window.addEventListener('message', onData);
  post({ type: 'ready' });
})();
</script></body></html>`;

export function ExtractorPdf() {
  const ref = useRef<WebView>(null);
  const [activo, setActivo] = useState(false);
  const listo = useRef(false);
  const enCurso = useRef(new Map<number, Trabajo & { timer: ReturnType<typeof setTimeout> }>());

  const fallarTodo = useCallback((msg: string) => {
    for (const t of enCurso.current.values()) {
      clearTimeout(t.timer);
      t.reject(new Error(msg));
    }
    enCurso.current.clear();
    for (const t of cola.splice(0)) t.reject(new Error(msg));
  }, []);

  const enviar = useCallback(() => {
    if (!listo.current) return;
    for (const t of cola.splice(0)) {
      const timer = setTimeout(() => {
        enCurso.current.delete(t.id);
        t.reject(new Error('Leer el PDF está tardando demasiado.'));
      }, MAX_MS);
      enCurso.current.set(t.id, { ...t, timer });
      ref.current?.postMessage(JSON.stringify({ id: t.id, base64: t.base64 }));
    }
  }, []);

  useEffect(() => {
    despertar = () => {
      setActivo(true);
      enviar();
    };
    return () => {
      despertar = null;
    };
  }, [enviar]);

  function onMessage(ev: WebViewMessageEvent) {
    let m: { type: string; id?: number; texto?: string; message?: string };
    try {
      m = JSON.parse(ev.nativeEvent.data);
    } catch {
      return;
    }
    if (m.type === 'ready') {
      listo.current = true;
      enviar();
      return;
    }
    if (m.type === 'error' && !m.id) {
      // pdf.js no ha cargado: se cierra la WebView para reintentar la próxima vez
      listo.current = false;
      setActivo(false);
      fallarTodo(m.message ?? 'No se pudo leer el PDF.');
      return;
    }
    const t = m.id ? enCurso.current.get(m.id) : undefined;
    if (!t) return;
    clearTimeout(t.timer);
    enCurso.current.delete(t.id);
    if (m.type === 'texto') t.resolve(m.texto ?? '');
    else t.reject(new Error(m.message ?? 'No se pudo leer el PDF.'));
  }

  if (!activo) return null;
  return (
    <View style={styles.oculto} pointerEvents="none">
      <WebView
        ref={ref}
        source={{ html: HTML, baseUrl: 'https://cdnjs.cloudflare.com/' }}
        originWhitelist={['*']}
        onMessage={onMessage}
        javaScriptEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  oculto: { position: 'absolute', width: 1, height: 1, opacity: 0, left: -10, top: -10 },
});
