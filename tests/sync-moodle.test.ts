/**
 * Prueba el ciclo completo de sincronización contra un «Moodle» simulado: lo mismo que se
 * comprobó a mano con el Moodle real (leer, borrar la copia vieja del borrador, subir, guardar).
 */
import assert from 'node:assert/strict';
import Module from 'node:module';
import test from 'node:test';

// El módulo de archivos del móvil no existe en Node: se sustituye por uno vacío
const cargar = (Module as unknown as { _load: (...a: unknown[]) => unknown })._load;
(Module as unknown as { _load: unknown })._load = function (this: unknown, ...a: unknown[]) {
  if (a[0] === 'expo-file-system') return { Directory: class {}, File: class {}, Paths: {} };
  return cargar.apply(this, a);
};

const CTX = 110814;
const BASE = 'https://moodle.test/centros/x';

/** Un Moodle mínimo: archivos privados + un borrador por preparación. */
function moodleFalso() {
  let privados: Record<string, string> = {};
  const borradores = new Map<number, Record<string, string>>();
  let siguiente = 1000;
  const llamadas: string[] = [];

  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    const u = String(url);
    if (u.startsWith(`${BASE}/webservice/rest/server.php`)) {
      const p = new URLSearchParams(String(init?.body));
      const fn = p.get('wsfunction') ?? '';
      llamadas.push(fn);
      const j = (x: unknown) => new Response(JSON.stringify(x));
      if (fn === 'core_user_prepare_private_files_for_edition') {
        const id = siguiente++;
        borradores.set(id, { ...privados });
        return j({ draftitemid: id });
      }
      if (fn === 'core_files_delete_draft_files') {
        const d = borradores.get(Number(p.get('draftitemid')))!;
        delete d[p.get('files[0][filename]') ?? ''];
        return j([]);
      }
      if (fn === 'core_user_add_user_private_files') {
        privados = { ...borradores.get(Number(p.get('draftid')))! };
        return j(null);
      }
    }
    if (u === `${BASE}/webservice/upload.php`) {
      const form = init!.body as FormData;
      const d = borradores.get(Number(form.get('itemid')))!;
      const f = form.get('file_1') as Blob & { name?: string };
      const nombre = (f as unknown as File).name;
      if (nombre in d)
        return new Response(JSON.stringify([{ errortype: 'filenameexist', error: 'ya existe' }]));
      d[nombre] = await f.text();
      return new Response(
        JSON.stringify([{ contextid: CTX, itemid: Number(form.get('itemid')), filename: nombre }]),
      );
    }
    if (u.startsWith(`${BASE}/webservice/pluginfile.php/${CTX}/user/private/`)) {
      const nombre = decodeURIComponent(u.split('/private/')[1].split('?')[0]);
      return nombre in privados
        ? new Response(privados[nombre])
        : new Response('no', { status: 404 });
    }
    return new Response('?', { status: 500 });
  }) as typeof fetch;

  const client = {
    base: BASE,
    token: 'tok',
    call: async (fn: string, params: Record<string, unknown> = {}) => {
      const body = new URLSearchParams({ wsfunction: fn });
      const plano = (o: unknown, pre: string) => {
        if (o && typeof o === 'object')
          for (const [k, v] of Object.entries(o)) plano(v, pre ? `${pre}[${k}]` : k);
        else body.set(pre, String(o));
      };
      plano(params, '');
      return (
        await fetch(`${BASE}/webservice/rest/server.php`, { method: 'POST', body: body.toString() })
      ).json();
    },
  };
  return { client, privados: () => privados, llamadas };
}

test('guardar y leer: crea el archivo, lo lee y lo actualiza sin duplicarlo', async () => {
  // El almacenamiento del móvil, en memoria
  const mem = new Map<string, string>();
  const AS = (await import('@react-native-async-storage/async-storage')).default;
  AS.getItem = async (k: string) => mem.get(k) ?? null;
  AS.setItem = async (k: string, v: string) => void mem.set(k, v);
  // FormData con Blob (como en la web)
  const sa = await import('../src/lib/sync-archivo.web');
  const Mod = Module as unknown as { _load: (...a: unknown[]) => unknown };
  const previo = Mod._load;
  Mod._load = function (this: unknown, ...a: unknown[]) {
    if (typeof a[0] === 'string' && a[0].endsWith('/sync-archivo')) return sa;
    return previo.apply(this, a);
  };

  const { guardarRemoto, leerRemoto, ARCHIVO_DATOS } = await import('../src/lib/sync-moodle');
  const m = moodleFalso();

  assert.equal(await leerRemoto(m.client), null); // todavía no hay nada
  await guardarRemoto(m.client, { a: { v: 1, t: 5 } });
  assert.deepEqual(await leerRemoto(m.client), { a: { v: 1, t: 5 } });
  await guardarRemoto(m.client, { a: { v: 2, t: 9 } });
  assert.deepEqual(await leerRemoto(m.client), { a: { v: 2, t: 9 } });
  assert.deepEqual(Object.keys(m.privados()), [ARCHIVO_DATOS]); // un solo archivo
  assert.ok(m.llamadas.includes('core_files_delete_draft_files'));
});
