/**
 * Después de `expo export -p web`: convierte dist/ en una web instalable (PWA).
 *  - Etiquetas para "Añadir a pantalla de inicio" en iPhone y Android, y respetar el notch.
 *  - manifest.webmanifest con nombre, colores e iconos.
 *  - 404.html = index.html, para que GitHub Pages sirva bien rutas como /curso/123.
 *
 * La ruta base sale de EXPO_BASE_URL (p. ej. "/hermes" en GitHub Pages).
 */
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';

const dist = 'dist';
const base = (process.env.EXPO_BASE_URL ?? '').replace(/\/+$/, '');
/** Colores del tema «Andén»: papel en claro, papel oscuro en oscuro. */
const PAPEL = '#F7F4ED';
const PAPEL_OSCURO = '#0E1112';

const head = `
    <link rel="manifest" href="${base}/manifest.webmanifest" />
    <link rel="apple-touch-icon" href="${base}/apple-touch-icon.png" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="Hermes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="theme-color" content="${PAPEL}" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="${PAPEL_OSCURO}" media="(prefers-color-scheme: dark)" />
    <meta name="description" content="Entregas, apuntes, novedades y horario del Moodle de la FP a distancia." />
  </head>`;

let html = readFileSync(`${dist}/index.html`, 'utf8');
if (!html.includes('rel="manifest"')) html = html.replace('</head>', head);
html = html
  .replace(/<html lang="[^"]*"/, '<html lang="es"')
  .replace(/<title>[^<]*<\/title>/, '<title>Hermes</title>')
  // viewport-fit=cover: sin esto el iPhone deja franjas en el notch y la barra de inicio
  .replace(/(<meta name="viewport" content=")([^"]*)"/, (_, a, c) =>
    c.includes('viewport-fit') ? `${a}${c}"` : `${a}${c}, viewport-fit=cover"`,
  );
writeFileSync(`${dist}/index.html`, html);
copyFileSync(`${dist}/index.html`, `${dist}/404.html`);
writeFileSync(`${dist}/.nojekyll`, '');

const manifest = {
  name: 'Hermes',
  short_name: 'Hermes',
  description: 'Entregas, apuntes, novedades y horario del Moodle de la FP a distancia.',
  lang: 'es',
  start_url: `${base}/`,
  scope: `${base}/`,
  display: 'standalone',
  orientation: 'portrait',
  background_color: PAPEL,
  theme_color: PAPEL,
  icons: [
    { src: `${base}/icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
    { src: `${base}/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
  ],
};
writeFileSync(`${dist}/manifest.webmanifest`, JSON.stringify(manifest, null, 2));
console.log(`PWA lista en ${dist}/ (base "${base || '/'}")`);
