import { z } from 'zod';

// ── Manifest Types ──

export const ExtraSchema = z.object({
  name: z.string(),
  isRequired: z.boolean().optional(),
  options: z.array(z.string()).optional(),
  optionsLimit: z.number().optional(),
});

export const ConfigItemSchema = z.object({
  key: z.string(),
  type: z.enum(['text', 'number', 'password', 'checkbox', 'select']).or(z.string()),
  title: z.string().optional(),
  default: z.string().optional(),
  required: z.boolean().optional(),
  options: z.array(z.string()).optional(),
});

export const CatalogSchema = z.object({
  type: z.string(),
  id: z.string(),
  name: z.string().optional(),
  genres: z.array(z.string()).optional(),
  extra: z.array(ExtraSchema).optional(),
  extraSupported: z.array(z.string()).optional(),
  extraRequired: z.array(z.string()).optional(),
});

export const ResourceDescriptorSchema = z.union([
  z.string(),
  z.object({
    name: z.string(),
    types: z.array(z.string()).optional(),
    idPrefixes: z.array(z.string()).optional(),
  }),
]);

export const BehaviorHintsSchema = z.object({
  adult: z.boolean().optional(),
  p2p: z.boolean().optional(),
  configurable: z.boolean().optional(),
  configurationRequired: z.boolean().optional(),
  newEpisodeNotifications: z.boolean().optional(),
}).passthrough();

export const ManifestSchema = z.object({
  id: z.string(),
  version: z.string(),
  name: z.string(),
  description: z.string(),
  logo: z.string().optional(),
  background: z.string().optional(),
  resources: z.array(ResourceDescriptorSchema),
  types: z.array(z.string()),
  idPrefixes: z.array(z.string()).optional(),
  catalogs: z.array(CatalogSchema).optional().default([]),
  addonCatalogs: z.array(CatalogSchema).optional(),
  config: z.array(ConfigItemSchema).optional(),
  behaviorHints: BehaviorHintsSchema.optional(),
  contactEmail: z.string().optional(),
});

export type Extra = z.infer<typeof ExtraSchema>;
export type ConfigItem = z.infer<typeof ConfigItemSchema>;
export type Catalog = z.infer<typeof CatalogSchema>;
export type ResourceDescriptor = z.infer<typeof ResourceDescriptorSchema>;
export type BehaviorHints = z.infer<typeof BehaviorHintsSchema>;
export type Manifest = z.infer<typeof ManifestSchema>;

// ── Player Types ──

export interface PlayerChapter {
  title: string;
  startTime: number;
  endTime: number;
}

export interface PlayerBookmark {
  time: number;
  label: string;
  createdAt: number;
}

// ── Watch Party Types ──

export interface WatchPartyState {
  hostId: string;
  participants: string[];
  syncTime: number;
  isPlaying: boolean;
}

// ── Content Detail Types ──

export interface ContentRating {
  source: string;
  value: string;
}

export interface CastMember {
  name: string;
  character?: string;
  photo?: string;
}

export interface SeasonEpisode {
  season: number;
  episode: number;
  title: string;
  overview?: string;
  thumbnail?: string;
  id: string;
}

// ── User Preferences ──

export interface UserPreferences {
  preferredLanguage?: string;
  subtitleLanguage?: string;
  autoPlayNext?: boolean;
  defaultQuality?: 'auto' | '4k' | '1080p' | '720p' | '480p';
  playerVolume?: number;
  skipIntro?: boolean;
  skipCredits?: boolean;
  parentalRating?: string;
  darkMode?: boolean;
  notifications?: boolean;
}

// ── Meta Types ──

export interface MetaLink {
  name: string;
  category: string;
  url: string;
}

export interface MetaVideo {
  id: string;
  title: string;
  released?: string;
  thumbnail?: string;
  streams?: Stream[];
  overview?: string;
  season?: number;
  episode?: number;
  trailer?: string;
}

export interface MetaPreview {
  id: string;
  type: string;
  name: string;
  poster?: string;
  posterShape?: 'square' | 'landscape' | 'poster';
  background?: string;
  logo?: string;
  description?: string;
  releaseInfo?: string;
  /** IMDB rating – accepts string for backward compat, number for new code */
  imdbRating?: string | number;
  genres?: string[];
  links?: MetaLink[];
}

export interface Meta extends MetaPreview {
  videos?: MetaVideo[];
  runtime?: string;
  language?: string;
  country?: string;
  awards?: string;
  website?: string;
  year?: string;
  /** @deprecated Use castMembers for structured data; kept for backward compat */
  cast?: string[];
  castMembers?: CastMember[];
  director?: string[];
  writer?: string[];
  rating?: number;
  votes?: number;
  certification?: string;
  trailer?: string;
  trailers?: { source: string; type: string }[];
  contentRatings?: ContentRating[];
  seasons?: SeasonEpisode[];
  behaviorHints?: {
    defaultVideoId?: string;
    hasScheduledVideos?: boolean;
  };
}

// ── Stream Types ──

export interface StreamSubtitle {
  id: string;
  url: string;
  lang: string;
}

export interface Stream {
  url?: string;
  ytId?: string;
  infoHash?: string;
  fileIdx?: number;
  externalUrl?: string;
  name?: string;
  description?: string;
  subtitles?: StreamSubtitle[];
  sources?: string[];
  behaviorHints?: {
    notWebReady?: boolean;
    bingeGroup?: string;
    countryWhitelist?: string[];
    proxyHeaders?: { request?: Record<string, string>; response?: Record<string, string> };
    videoHash?: string;
    videoSize?: number;
    filename?: string;
  };
}

export type StreamFormat = 'hls' | 'dash' | 'file' | 'external' | 'youtube' | 'torrent' | 'unknown';
export type StreamPlaybackKind = 'internal' | 'external' | 'unsupported';

export interface SourceAnalysis {
  id: string;
  format: StreamFormat;
  playback: StreamPlaybackKind;
  isLive: boolean;
  isWebReady: boolean;
  requiresProxy: boolean;
  qualityLabel?: string;
  sizeLabel?: string;
  score: number;
  badges: string[];
  warnings: string[];
  primaryLabel: string;
  secondaryLabel?: string;
}

export interface RankedStream extends Stream {
  originalIndex: number;
  analysis: SourceAnalysis;
}

export interface PlayerSourceOption {
  id: string;
  addonName: string;
  stream: Stream;
  analysis?: SourceAnalysis;
}

export interface AddonManifestPreview {
  transportUrl: string;
  manifest: Manifest;
  capabilities: AddonCapabilitySummary;
  likelyLiveCatalogs: number;
  likelySportsCatalogs: number;
  supportsLivePlayback: boolean;
}

export interface PlayerQueueItem {
  videoId: string;
  title: string;
  subtitle?: string;
  season?: number;
  episode?: number;
  thumbnail?: string;
}

export interface RecentSearch {
  query: string;
  createdAt: number;
}

// ── Subtitle Types ──

export interface Subtitle {
  id: string;
  url: string;
  lang: string;
}

// ── Addon Types ──

export interface InstalledAddon {
  transportUrl: string;
  manifest: Manifest;
  flags?: {
    official?: boolean;
    protected?: boolean;
  };
}

export type AddonRole = 'discovery' | 'playback' | 'captions' | 'hybrid' | 'utility';

export interface AddonCapabilitySummary {
  addonId: string;
  name: string;
  role: AddonRole;
  hasCatalog: boolean;
  hasMeta: boolean;
  hasStream: boolean;
  hasSubtitles: boolean;
  searchable: boolean;
  configurable: boolean;
  resources: string[];
  types: string[];
  catalogs: number;
  official: boolean;
  protected: boolean;
  /** Specialized content flags detected from manifest */
  isLikelyLive: boolean;
  isLikelySports: boolean;
  isLikelyAnime: boolean;
  isLikelyDocumentary: boolean;
  /** Total capability score used for sorting */
  capabilityScore: number;
}

export interface AddonHealthStatus {
  transportUrl: string;
  reachable: boolean;
  latencyMs: number | null;
  checkedAt: number;
  error?: string;
}

// ── Catalog Response ──

export interface CatalogResponse {
  metas: MetaPreview[];
}

export interface MetaResponse {
  meta: Meta;
}

export interface StreamResponse {
  streams: Stream[];
}

export interface SubtitleResponse {
  subtitles: Subtitle[];
}

// ── Request Types ──

export interface CatalogRequest {
  type: string;
  id: string;
  extra?: Record<string, string>;
}

export interface ResourceRequest {
  type: string;
  id: string;
}
