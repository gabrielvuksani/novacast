import type {
  Manifest,
  InstalledAddon,
  CatalogResponse,
  MetaResponse,
  StreamResponse,
  SubtitleResponse,
  CatalogRequest,
  ResourceRequest,
  ResourceDescriptor,
} from './types';
import { ManifestSchema } from './types';

function buildExtraPath(extra?: Record<string, string>): string {
  if (!extra || Object.keys(extra).length === 0) return '';
  const parts = Object.entries(extra)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  return `/${parts}`;
}

export function normalizeTransportUrl(url: string): string {
  return url.endsWith('/manifest.json')
    ? url.slice(0, -'/manifest.json'.length)
    : url.replace(/\/$/, '');
}

export class ManifestTransportClient {
  async fetchManifest(transportUrl: string): Promise<Manifest> {
    const url = transportUrl.endsWith('/manifest.json')
      ? transportUrl
      : `${transportUrl.replace(/\/$/, '')}/manifest.json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch manifest: ${res.status}`);
    const data = await res.json();
    return ManifestSchema.parse(data);
  }

  async fetchCatalog(
    transportUrl: string,
    request: CatalogRequest,
  ): Promise<CatalogResponse> {
    const base = normalizeTransportUrl(transportUrl);
    const extraPath = buildExtraPath(request.extra);
    const url = `${base}/catalog/${encodeURIComponent(request.type)}/${encodeURIComponent(request.id)}${extraPath}.json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Catalog fetch failed: ${res.status}`);
    return res.json();
  }

  async fetchMeta(
    transportUrl: string,
    request: ResourceRequest,
  ): Promise<MetaResponse> {
    const base = normalizeTransportUrl(transportUrl);
    const url = `${base}/meta/${encodeURIComponent(request.type)}/${encodeURIComponent(request.id)}.json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Meta fetch failed: ${res.status}`);
    return res.json();
  }

  async fetchStreams(
    transportUrl: string,
    request: ResourceRequest,
  ): Promise<StreamResponse> {
    const base = normalizeTransportUrl(transportUrl);
    const url = `${base}/stream/${encodeURIComponent(request.type)}/${encodeURIComponent(request.id)}.json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Stream fetch failed: ${res.status}`);
    return res.json();
  }

  async fetchSubtitles(
    transportUrl: string,
    request: ResourceRequest,
    extra?: Record<string, string>,
  ): Promise<SubtitleResponse> {
    const base = normalizeTransportUrl(transportUrl);
    const extraPath = buildExtraPath(extra);
    const url = `${base}/subtitles/${encodeURIComponent(request.type)}/${encodeURIComponent(request.id)}${extraPath}.json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Subtitles fetch failed: ${res.status}`);
    return res.json();
  }
}

export class AddonTransportClient extends ManifestTransportClient {}

export class StremioClient extends ManifestTransportClient {}

// ── Addon Filtering ──

function getResourceDescriptor(
  resource: ResourceDescriptor,
): { name: string; types?: string[]; idPrefixes?: string[] } {
  if (typeof resource === 'string') {
    return { name: resource };
  }
  return resource;
}

export function addonSupportsResource(
  addon: InstalledAddon,
  resourceName: string,
  type?: string,
  id?: string,
): boolean {
  const { manifest } = addon;

  const resourceMatch = manifest.resources.some((r) => {
    const desc = getResourceDescriptor(r);
    if (desc.name !== resourceName) return false;
    if (type && desc.types && !desc.types.includes(type)) return false;
    if (id && desc.idPrefixes && !desc.idPrefixes.some((p) => id.startsWith(p))) return false;
    return true;
  });

  if (!resourceMatch) return false;

  if (type && !manifest.types.includes(type)) {
    const hasTypeInResource = manifest.resources.some((r) => {
      const desc = getResourceDescriptor(r);
      return desc.name === resourceName && desc.types?.includes(type);
    });
    if (!hasTypeInResource) return false;
  }

  if (id && manifest.idPrefixes && !manifest.idPrefixes.some((p) => id.startsWith(p))) {
    return false;
  }

  return true;
}

export function filterAddonsForResource(
  addons: InstalledAddon[],
  resourceName: string,
  type?: string,
  id?: string,
): InstalledAddon[] {
  return addons.filter((a) => addonSupportsResource(a, resourceName, type, id));
}

export const addonTransportClient = new AddonTransportClient();
export const manifestTransportClient = addonTransportClient;
export const stremioClient = addonTransportClient;
