import type { Catalog } from './types';

export const DEFAULT_ADDON_URLS = [
  'https://v3-cinemeta.strem.io/manifest.json',
  'https://webstreamr.hayd.uk/manifest.json',
  'https://nuviostreams.hayd.uk/manifest.json',
  'https://flixnest.app/flix-streams/manifest.json',
  'https://thepiratebay-plus.strem.fun/manifest.json',
  'https://torrentio.strem.fun/manifest.json',
  'https://848b3516657c-usatv.baby-beamup.club/manifest.json',
  'https://5a0d1888fa64-orion.baby-beamup.club/eyJhcGkiOiJGNzZIOE1BRUxURTZTRE1YOU5HS1ZTQTMyOERXR0U5RiIsImxpbmtMaW1pdCI6IjEwIiwic29ydFZhbHVlIjoiYmVzdCIsImF1ZGlvY2hhbm5lbHMiOiIyLDYsOCIsInZpZGVvcXVhbGl0eSI6ImhkOGssaGQ2ayxoZDRrLGhkMmssaGQxMDgwLGhkNzIwLHNkLHNjcjEwODAsc2NyNzIwLHNjcixjYW0xMDgwLGNhbTcyMCxjYW0iLCJsaXN0T3B0IjoidG9ycmVudCIsImRlYnJpZHNlcnZpY2VzIjpbXSwiYXVkaW9sYW5ndWFnZXMiOltdLCJhZGRpdGlvbmFsUGFyYW1ldGVycyI6IiJ9/manifest.json',
] as const;

export const NOVACAST_DEFAULT_ADDON_ENV_KEYS = [
  'VITE_NOVACAST_DEFAULT_ADDONS',
  'VITE_DEFAULT_ADDONS',
  'STREAMIO_DEFAULT_ADDONS',
] as const;

// ── URL Helpers ──

/** Normalise a single addon URL (trim, strip trailing slashes, ensure manifest.json) */
export function normalizeAddonUrl(url: string): string {
  let cleaned = url.trim().replace(/\/+$/, '');
  if (cleaned && !cleaned.endsWith('/manifest.json')) {
    cleaned = `${cleaned}/manifest.json`;
  }
  return cleaned;
}

/** Validate that a URL looks like a valid addon manifest URL */
export function isValidAddonUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (parsed.protocol === 'https:' || parsed.protocol === 'http:')
      && parsed.pathname.endsWith('/manifest.json');
  } catch {
    return false;
  }
}

export function getDefaultAddonUrls(source?: string | null): string[] {
  if (!source?.trim()) return [...DEFAULT_ADDON_URLS];

  const urls = source
    .split(',')
    .map((value) => normalizeAddonUrl(value))
    .filter((url) => url.length > 0 && isValidAddonUrl(url));

  return urls.length > 0 ? urls : [...DEFAULT_ADDON_URLS];
}

export function readDefaultAddonUrlsFromRecord(
  source: Record<string, string | undefined>,
  keys: readonly string[] = NOVACAST_DEFAULT_ADDON_ENV_KEYS,
) {
  const resolved = keys
    .map((key) => source[key])
    .find((value): value is string => Boolean(value?.trim()));

  return getDefaultAddonUrls(resolved);
}

/** Deduplicate addon URLs (by normalised form) while preserving order */
export function deduplicateAddonUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const url of urls) {
    const normalised = normalizeAddonUrl(url);
    if (normalised && !seen.has(normalised)) {
      seen.add(normalised);
      result.push(normalised);
    }
  }
  return result;
}

/** Merge user addon URLs with defaults, deduplicating */
export function mergeWithDefaults(userUrls: string[]): string[] {
  return deduplicateAddonUrls([...DEFAULT_ADDON_URLS, ...userUrls]);
}

// ── Catalog Helpers ──

export function isSearchOnlyCatalog(catalog: Catalog): boolean {
  return catalog.extra?.some((item) => item.name === 'search' && item.isRequired) ?? false;
}

/** Check if a catalog supports genre filtering */
export function supportsGenreFilter(catalog: Catalog): boolean {
  const hasGenreExtra = catalog.extra?.some((item) => item.name === 'genre') ?? false;
  const hasGenres = (catalog.genres?.length ?? 0) > 0;
  return hasGenreExtra || hasGenres;
}

/** Check if a catalog supports pagination via skip */
export function supportsPagination(catalog: Catalog): boolean {
  return catalog.extra?.some((item) => item.name === 'skip') ?? false;
}

export function resolveCatalogExtra(
  catalog: Catalog,
  suppliedExtra?: Record<string, string>,
): Record<string, string> | null {
  const nextExtra: Record<string, string> = { ...(suppliedExtra ?? {}) };
  const requiredNames = new Set<string>(catalog.extraRequired ?? []);

  for (const extra of catalog.extra ?? []) {
    if (extra.isRequired) {
      requiredNames.add(extra.name);
    }
  }

  for (const requiredName of requiredNames) {
    if (nextExtra[requiredName]) continue;

    if (requiredName === 'skip') {
      nextExtra.skip = '0';
      continue;
    }

    if (requiredName === 'search') {
      return null;
    }

    const extraConfig = catalog.extra?.find((item) => item.name === requiredName);
    const fallbackOption =
      extraConfig?.options?.[0]
      ?? (requiredName === 'genre' ? catalog.genres?.[0] : undefined);

    if (typeof fallbackOption !== 'string' || fallbackOption.length === 0) {
      return null;
    }

    nextExtra[requiredName] = fallbackOption;
  }

  return nextExtra;
}

export function getCatalogDisplayName(
  catalog: Catalog,
  extra?: Record<string, string>,
): string {
  const baseName = catalog.name || catalog.id;
  const primaryFacet = extra?.genre || extra?.search;
  return primaryFacet ? `${baseName} · ${primaryFacet}` : baseName;
}

/** Get a unique key for a catalog (useful for React keys / map lookups) */
export function getCatalogKey(catalog: Catalog): string {
  return `${catalog.type}:${catalog.id}`;
}
