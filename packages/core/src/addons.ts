import type {
  AddonCapabilitySummary,
  AddonHealthStatus,
  AddonRole,
  InstalledAddon,
  ResourceDescriptor,
} from './types';

// ── Keyword sets for specialized content detection ──

const LIVE_KEYWORDS = /\b(live|iptv|tv|television|channel|broadcast|linear)\b/i;
const SPORTS_KEYWORDS = /\b(sport|football|soccer|nba|nfl|mlb|nhl|cricket|tennis|f1|racing|ufc|boxing|wrestling)\b/i;
const ANIME_KEYWORDS = /\b(anime|manga|crunchyroll|funimation|anilist|kitsu|myanimelist|mal)\b/i;
const DOCUMENTARY_KEYWORDS = /\b(documentary|docu|documentaries|national.?geographic|discovery|bbc.?earth|nature|history)\b/i;

function getResourceName(resource: ResourceDescriptor) {
  return typeof resource === 'string' ? resource : resource.name;
}

function resolveAddonRole(summary: Pick<AddonCapabilitySummary, 'hasCatalog' | 'hasMeta' | 'hasStream' | 'hasSubtitles'>): AddonRole {
  if ((summary.hasCatalog || summary.hasMeta) && (summary.hasStream || summary.hasSubtitles)) {
    return 'hybrid';
  }

  if (summary.hasStream) return 'playback';
  if (summary.hasSubtitles) return 'captions';
  if (summary.hasCatalog || summary.hasMeta) return 'discovery';
  return 'utility';
}

/** Build a searchable text blob from addon manifest for keyword matching */
function buildAddonSearchText(addon: InstalledAddon): string {
  const parts: string[] = [
    addon.manifest.id,
    addon.manifest.name,
    addon.manifest.description,
  ];
  for (const catalog of addon.manifest.catalogs ?? []) {
    parts.push(catalog.id, catalog.type);
    if (catalog.name) parts.push(catalog.name);
    if (catalog.genres) parts.push(...catalog.genres);
  }
  parts.push(...addon.manifest.types);
  return parts.join(' ');
}

function detectSpecialization(searchText: string) {
  return {
    isLikelyLive: LIVE_KEYWORDS.test(searchText),
    isLikelySports: SPORTS_KEYWORDS.test(searchText),
    isLikelyAnime: ANIME_KEYWORDS.test(searchText),
    isLikelyDocumentary: DOCUMENTARY_KEYWORDS.test(searchText),
  };
}

/** Compute a numeric score reflecting how many capabilities this addon provides */
function computeCapabilityScore(summary: Omit<AddonCapabilitySummary, 'role' | 'capabilityScore'>): number {
  let score = 0;
  if (summary.hasCatalog) score += 2;
  if (summary.hasMeta) score += 2;
  if (summary.hasStream) score += 3;
  if (summary.hasSubtitles) score += 1;
  if (summary.searchable) score += 1;
  score += summary.catalogs;
  if (summary.isLikelyLive) score += 1;
  if (summary.isLikelySports) score += 1;
  if (summary.isLikelyAnime) score += 1;
  if (summary.isLikelyDocumentary) score += 1;
  if (summary.official) score += 2;
  return score;
}

export function summarizeAddonCapabilities(addon: InstalledAddon): AddonCapabilitySummary {
  const resources = addon.manifest.resources.map(getResourceName);
  const uniqueResources = Array.from(new Set(resources));
  const catalogs = addon.manifest.catalogs?.length ?? 0;
  const searchable =
    addon.manifest.catalogs?.some((catalog) =>
      catalog.extra?.some((extra) => extra.name === 'search'),
    ) ?? false;

  const searchText = buildAddonSearchText(addon);
  const specialization = detectSpecialization(searchText);

  const baseSummary = {
    addonId: addon.manifest.id,
    name: addon.manifest.name,
    hasCatalog: uniqueResources.includes('catalog') || catalogs > 0,
    hasMeta: uniqueResources.includes('meta'),
    hasStream: uniqueResources.includes('stream'),
    hasSubtitles: uniqueResources.includes('subtitles'),
    searchable,
    configurable:
      addon.manifest.behaviorHints?.configurable === true
      || addon.manifest.behaviorHints?.configurationRequired === true
      || (addon.manifest.config?.length ?? 0) > 0,
    resources: uniqueResources,
    types: Array.from(new Set(addon.manifest.types)),
    catalogs,
    official: addon.flags?.official === true,
    protected: addon.flags?.protected === true,
    ...specialization,
  };

  const capabilityScore = computeCapabilityScore(baseSummary);

  return {
    ...baseSummary,
    role: resolveAddonRole(baseSummary),
    capabilityScore,
  };
}

export function summarizeAddonCoverage(addons: InstalledAddon[]) {
  const summaries = addons.map(summarizeAddonCapabilities);

  return {
    summaries,
    discovery: summaries.filter((item) => item.hasCatalog || item.hasMeta).length,
    playback: summaries.filter((item) => item.hasStream).length,
    captions: summaries.filter((item) => item.hasSubtitles).length,
    searchable: summaries.filter((item) => item.searchable).length,
    configurable: summaries.filter((item) => item.configurable).length,
    live: summaries.filter((item) => item.isLikelyLive).length,
    sports: summaries.filter((item) => item.isLikelySports).length,
    anime: summaries.filter((item) => item.isLikelyAnime).length,
    documentary: summaries.filter((item) => item.isLikelyDocumentary).length,
  };
}

// ── Addon Sorting ──

const ROLE_PRIORITY: Record<AddonRole, number> = {
  hybrid: 0,
  playback: 1,
  discovery: 2,
  captions: 3,
  utility: 4,
};

/** Sort addon summaries by role priority then by capability score descending */
export function sortAddonsByRelevance(summaries: AddonCapabilitySummary[]): AddonCapabilitySummary[] {
  return [...summaries].sort((a, b) => {
    const roleDiff = ROLE_PRIORITY[a.role] - ROLE_PRIORITY[b.role];
    if (roleDiff !== 0) return roleDiff;
    return b.capabilityScore - a.capabilityScore;
  });
}

// ── Addon Health Checking ──

/**
 * Ping an addon's transport URL to measure latency and reachability.
 * Works in both browser (fetch) and Node (also fetch in modern runtimes).
 */
export async function checkAddonHealth(
  transportUrl: string,
  timeoutMs = 8000,
): Promise<AddonHealthStatus> {
  const checkedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const start = performance.now();
    const response = await fetch(transportUrl, {
      method: 'HEAD',
      signal: controller.signal,
    });
    const latencyMs = Math.round(performance.now() - start);

    return {
      transportUrl,
      reachable: response.ok,
      latencyMs,
      checkedAt,
      error: response.ok ? undefined : `HTTP ${response.status}`,
    };
  } catch (err) {
    return {
      transportUrl,
      reachable: false,
      latencyMs: null,
      checkedAt,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Check health of multiple addons in parallel */
export async function checkAddonsHealth(
  addons: InstalledAddon[],
  timeoutMs = 8000,
): Promise<AddonHealthStatus[]> {
  return Promise.all(
    addons.map((addon) => checkAddonHealth(addon.transportUrl, timeoutMs)),
  );
}
