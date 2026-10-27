const RELEASE_API = 'https://api.github.com/repos/hehedaniel/hermes/releases/latest';
const RELEASE_DOWNLOAD_PREFIX = 'https://github.com/hehedaniel/hermes/releases/download/';

type Version = [number, number, number];

export type AppRelease = {
  version: string;
  downloadUrl: string;
};

function parseVersion(version: string): Version | null {
  const match = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(version);
  if (!match) return null;
  const parsed: Version = [Number(match[1]), Number(match[2]), Number(match[3])];
  return parsed.every(Number.isSafeInteger) ? parsed : null;
}

export function versionIsNewer(candidate: string, installed: string): boolean {
  const latest = parseVersion(candidate);
  const current = parseVersion(installed);
  if (!latest || !current) return false;

  for (let i = 0; i < latest.length; i += 1) {
    if (latest[i] !== current[i]) return latest[i] > current[i];
  }
  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export async function fetchLatestAppRelease(fetcher: typeof fetch = fetch): Promise<AppRelease> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  let response: Response;
  try {
    response = await fetcher(RELEASE_API, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) {
    throw new Error(`GitHub respondió ${response.status} al consultar la última versión.`);
  }

  const data: unknown = await response.json();
  if (!isRecord(data) || typeof data.tag_name !== 'string' || !parseVersion(data.tag_name)) {
    throw new Error('La release más reciente de GitHub no tiene una etiqueta de versión válida.');
  }

  if (!Array.isArray(data.assets)) {
    throw new Error('La release más reciente de GitHub no contiene una lista de descargas.');
  }

  const apk = data.assets.find(
    (asset: unknown) =>
      isRecord(asset) &&
      typeof asset.name === 'string' &&
      asset.name.toLowerCase().endsWith('.apk') &&
      typeof asset.browser_download_url === 'string' &&
      asset.browser_download_url.startsWith(RELEASE_DOWNLOAD_PREFIX),
  );
  if (!isRecord(apk) || typeof apk.browser_download_url !== 'string') {
    throw new Error('La release más reciente de GitHub no contiene un APK descargable.');
  }

  return {
    version: data.tag_name.replace(/^v/, ''),
    downloadUrl: apk.browser_download_url,
  };
}
