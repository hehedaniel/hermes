import assert from 'node:assert/strict';
import { test } from 'node:test';

import { launchUrl, normalizeUrl, parseToken } from '@/lib/moodle';

const TOKEN = 'abc123abc123abc123abc123abc123ab';
const b64 = Buffer.from(`firma:::${TOKEN}:::privado`).toString('base64');

test('parseToken acepta el enlace moodlemobile://token=…', () => {
  assert.deepEqual(parseToken(`moodlemobile://token=${b64}`), {
    token: TOKEN,
    privateToken: 'privado',
  });
});

test('parseToken acepta la línea roja entera de la consola de Chrome', () => {
  const linea = `Failed to launch 'moodlemobile://token=${b64}' because the scheme does not have a registered handler.`;
  assert.equal(parseToken(linea).token, TOKEN);
});

test('parseToken acepta el token en claro y la línea del .env', () => {
  assert.equal(parseToken(TOKEN).token, TOKEN);
  assert.equal(parseToken(`MOODLE_TOKEN=${TOKEN}`).token, TOKEN);
  assert.equal(parseToken(`  "${TOKEN}"  `).token, TOKEN);
});

test('parseToken rechaza lo que no es un token', () => {
  assert.throws(() => parseToken('hola'), /no parece un token/);
  assert.throws(() => parseToken(`moodlemobile://token=${Buffer.from('nada').toString('base64')}`));
});

test('normalizeUrl deja la dirección base', () => {
  const base = 'https://educacionadistancia.juntadeandalucia.es/centros/huelva';
  assert.equal(normalizeUrl(`${base}/my/`), base);
  assert.equal(normalizeUrl(`${base}/login/index.php?x=1`), base);
  assert.equal(normalizeUrl(`${base}//`), base);
  assert.equal(normalizeUrl('  '), normalizeUrl(''));
});

test('launchUrl pide el token para la app de Moodle', () => {
  const url = launchUrl('https://ejemplo.es/moodle/');
  assert.match(url, /^https:\/\/ejemplo\.es\/moodle\/admin\/tool\/mobile\/launch\.php\?/);
  assert.match(url, /service=moodle_mobile_app/);
  assert.match(url, /urlscheme=moodlemobile/);
});
