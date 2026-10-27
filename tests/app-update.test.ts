import assert from 'node:assert/strict';
import { test } from 'node:test';

import { fetchLatestAppRelease, versionIsNewer } from '@/lib/app-update';

test('compara versiones semánticas por mayor, menor y parche', () => {
  assert.equal(versionIsNewer('v3.0.0', '2.9.9'), true);
  assert.equal(versionIsNewer('2.1.0', '2.0.9'), true);
  assert.equal(versionIsNewer('2.0.1', '2.0.0'), true);
  assert.equal(versionIsNewer('2.0.0', '2.0.0'), false);
  assert.equal(versionIsNewer('1.9.9', '2.0.0'), false);
});

test('ignora etiquetas que no son versiones estables X.Y.Z', () => {
  assert.equal(versionIsNewer('main', '2.0.0'), false);
  assert.equal(versionIsNewer('2.1.0-rc.1', '2.0.0'), false);
  assert.equal(versionIsNewer('2.1', '2.0.0'), false);
});

test('obtiene la versión y el APK de la última release de GitHub', async () => {
  const release = await fetchLatestAppRelease(async () =>
    new Response(
      JSON.stringify({
        tag_name: 'v2.1.0',
        assets: [
          {
            name: 'Hermes-v2.1.0.apk',
            browser_download_url:
              'https://github.com/hehedaniel/hermes/releases/download/v2.1.0/Hermes-v2.1.0.apk',
          },
        ],
      }),
      { status: 200 },
    ),
  );

  assert.deepEqual(release, {
    version: '2.1.0',
    downloadUrl:
      'https://github.com/hehedaniel/hermes/releases/download/v2.1.0/Hermes-v2.1.0.apk',
  });
});

test('rechaza releases sin APK válido', async () => {
  await assert.rejects(
    fetchLatestAppRelease(async () =>
      new Response(JSON.stringify({ tag_name: 'v2.1.0', assets: [] }), { status: 200 }),
    ),
    /no contiene un APK descargable/,
  );
});
