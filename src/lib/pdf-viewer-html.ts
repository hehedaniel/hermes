/**
 * Página HTML con pdf.js (el visor de PDF de Firefox) para mostrar PDFs dentro de una WebView.
 * Se carga con baseUrl = cdnjs para que el "worker" de pdf.js sea del mismo origen.
 * La primera vez necesita internet para bajar pdf.js; luego queda en la caché de la WebView.
 *
 * Protocolo con la app:
 *   página -> app: {type:'ready'} cuando pdf.js está cargado (y pide el archivo)
 *   app -> página: el PDF en base64 (postMessage)
 *   página -> app: {type:'loaded', pages} | {type:'error', message}
 */
const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174';

export const PDF_VIEWER_HTML = (fondo: string) => `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=6, user-scalable=yes">
<style>
  html, body { margin: 0; padding: 0; background: ${fondo}; }
  #pages { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 10px 0 40px; }
  .page { position: relative; width: calc(100vw - 16px); background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,.25); }
  .page canvas { width: 100%; height: 100%; display: block; }
  #pill { position: fixed; bottom: 14px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,.65);
          color: #fff; font: 600 13px system-ui, sans-serif; padding: 4px 12px; border-radius: 999px; display: none; }
</style>
<script src="${PDFJS}/pdf.min.js"></script>
</head>
<body>
<div id="pages"></div>
<div id="pill"></div>
<script>
(function () {
  var post = function (o) { window.ReactNativeWebView.postMessage(JSON.stringify(o)); };
  if (!window.pdfjsLib) { post({ type: 'error', message: 'No se pudo cargar el visor (¿sin internet la primera vez?).' }); return; }
  pdfjsLib.GlobalWorkerOptions.workerSrc = '${PDFJS}/pdf.worker.min.js';

  var started = false;
  function onData(ev) {
    if (started || typeof ev.data !== 'string' || ev.data.length < 10) return;
    started = true;
    try {
      var bin = atob(ev.data), bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      render(bytes);
    } catch (e) { post({ type: 'error', message: String(e) }); }
  }
  document.addEventListener('message', onData);
  window.addEventListener('message', onData);
  window.__pedirPdf = function () { if (!started) post({ type: 'ready' }); };

  async function render(bytes) {
    var pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    var cont = document.getElementById('pages'), pill = document.getElementById('pill');
    var dpr = Math.min(window.devicePixelRatio || 1, 2.5), width = window.innerWidth - 16;
    var pages = [];
    for (var n = 1; n <= pdf.numPages; n++) {
      var page = await pdf.getPage(n);
      var vp1 = page.getViewport({ scale: 1 });
      var div = document.createElement('div');
      div.className = 'page';
      div.style.height = (width * vp1.height / vp1.width) + 'px';
      div.dataset.n = n;
      cont.appendChild(div);
      pages.push({ div: div, page: page, done: false });
      if (n === 1) post({ type: 'loaded', pages: pdf.numPages });
    }
    // Solo se pintan las páginas cercanas a la pantalla (ahorra memoria en PDFs largos)
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var p = pages[en.target.dataset.n - 1];
        if (en.isIntersecting && !p.done) {
          p.done = true;
          var vp = p.page.getViewport({ scale: (width / p.page.getViewport({ scale: 1 }).width) * dpr });
          var c = document.createElement('canvas');
          c.width = vp.width; c.height = vp.height;
          p.div.appendChild(c);
          p.page.render({ canvasContext: c.getContext('2d'), viewport: vp });
        }
        if (en.isIntersecting) { pill.style.display = 'block'; pill.textContent = en.target.dataset.n + ' / ' + pdf.numPages; }
      });
    }, { rootMargin: '600px 0px' });
    pages.forEach(function (p) { io.observe(p.div); });
  }
  post({ type: 'ready' });
})();
</script>
</body>
</html>`;
