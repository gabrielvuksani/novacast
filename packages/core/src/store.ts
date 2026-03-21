import { createStore } from 'zustand/vanilla';
import type {
  AddonManifestPreview,
  Catalog,
  InstalledAddon,
  Meta,
  MetaPreview,
  PlayerQueueItem,
  PlayerSourceOption,
  RecentSearch,
  Stream,
  Subtitle,
} from './types';
import { addonTransportClient, filterAddonsForResource, normalizeTransportUrl } from './client';
import {
  getCatalogDisplayName,
  isSearchOnlyCatalog,
  resolveCatalogExtra,
} from './defaults';
import { compareStreamPriority } from './streams';
import { summarizeAddonCapabilities } from './addons';

// ── Addon Store ──

export interface AddonState {
  addons: InstalledAddon[];
  installing: boolean;
  error: string | null;
}

export interface AddonActions {
  installAddon: (transportUrl: string) => Promise<void>;
  previewAddon: (transportUrl: string) => Promise<AddonManifestPreview>;
  uninstallAddon: (transportUrl: string) => void;
  loadAddons: (addons: InstalledAddon[]) => void;
  clearError: () => void;
}

export type AddonStore = AddonState & AddonActions;

export const createAddonStore = (initialAddons: InstalledAddon[] = []) =>
  createStore<AddonStore>((set, get) => ({
    addons: initialAddons,
    installing: false,
    error: null,

    installAddon: async (transportUrl: string) => {
      set({ installing: true, error: null });
      try {
        const normalizedTransportUrl = normalizeTransportUrl(transportUrl);
        const manifest = await addonTransportClient.fetchManifest(normalizedTransportUrl);
        const existing = get().addons;
        if (existing.some((a) => a.manifest.id === manifest.id)) {
          set({
            addons: existing.map((a) =>
              a.manifest.id === manifest.id ? { transportUrl: normalizedTransportUrl, manifest } : a,
            ),
            installing: false,
          });
        } else {
          set({
            addons: [...existing, { transportUrl: normalizedTransportUrl, manifest }],
            installing: false,
          });
        }
      } catch (e) {
        set({
          error: e instanceof Error ? e.message : 'Failed to install addon',
          installing: false,
        });
      }
    },

    previewAddon: async (transportUrl: string) => {
      const normalizedTransportUrl = normalizeTransportUrl(transportUrl);
      const manifest = await addonTransportClient.fetchManifest(normalizedTransportUrl);
      const capabilities = summarizeAddonCapabilities({ transportUrl: normalizedTransportUrl, manifest });

      const likelyLiveCatalogs = (manifest.catalogs ?? []).filter((catalog) =>
        /live|tv|channel|event|sports/i.test(`${catalog.id} ${catalog.name ?? ''} ${(catalog.genres ?? []).join(' ')}`),
      ).length;
      const likelySportsCatalogs = (manifest.catalogs ?? []).filter((catalog) =>
        /sport|match|league|football|soccer|basketball|baseball|hockey|mma|ufc|cricket|tennis|f1|formula/i.test(
          `${catalog.id} ${catalog.name ?? ''} ${(catalog.genres ?? []).join(' ')}`,
        ),
      ).length;

      return {
        transportUrl: normalizedTransportUrl,
        manifest,
        capabilities,
        likelyLiveCatalogs,
        likelySportsCatalogs,
        supportsLivePlayback: capabilities.hasStream && (likelyLiveCatalogs > 0 || likelySportsCatalogs > 0),
      };
    },

    uninstallAddon: (transportUrl: string) => {
      const normalizedTransportUrl = normalizeTransportUrl(transportUrl);
      set({
        addons: get().addons.filter((a) => a.transportUrl !== normalizedTransportUrl),
      });
    },

    loadAddons: (addons: InstalledAddon[]) => {
      const next = addons.map((addon) => ({
        ...addon,
        transportUrl: normalizeTransportUrl(addon.transportUrl),
      }));
      set({ addons: next });
    },

    clearError: () => set({ error: null }),
  }));

// ── Catalog Store ──

export interface CatalogEntry {
  addonId: string;
  transportUrl: string;
  catalogId: string;
  catalogType: string;
  catalogName: string;
  requestExtra?: Record<string, string>;
  metas: MetaPreview[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
}

export interface CatalogState {
  catalogs: CatalogEntry[];
  loading: boolean;
}

export interface CatalogActions {
  loadCatalogs: (addons: InstalledAddon[]) => Promise<void>;
  loadMoreCatalog: (addonId: string, catalogId: string) => Promise<void>;
  invalidate: () => void;
}

export type CatalogStore = CatalogState & CatalogActions;

const PAGE_SIZE = 100;

export const createCatalogStore = () =>
  createStore<CatalogStore>((set, get) => ({
    catalogs: [],
    loading: false,

    loadCatalogs: async (addons: InstalledAddon[]) => {
      const existing = get().catalogs;
      if (existing.length > 0 && existing.some((c) => c.metas.length > 0)) {
        return;
      }

      set({ loading: true });

      const catalogEntries: CatalogEntry[] = [];

      for (const addon of addons) {
        for (const catalog of addon.manifest.catalogs || []) {
          if (isSearchOnlyCatalog(catalog)) continue;

          const requestExtra = resolveCatalogExtra(catalog as Catalog);
          if (requestExtra === null) continue;

          catalogEntries.push({
            addonId: addon.manifest.id,
            transportUrl: addon.transportUrl,
            catalogId: catalog.id,
            catalogType: catalog.type,
            catalogName: getCatalogDisplayName(catalog as Catalog, requestExtra),
            requestExtra,
            metas: [],
            loading: true,
            error: null,
            hasMore: true,
          });
        }
      }

      set({ catalogs: catalogEntries });

      const promises = catalogEntries.map(async (entry) => {
        try {
          const result = await addonTransportClient.fetchCatalog(entry.transportUrl, {
            type: entry.catalogType,
            id: entry.catalogId,
            extra: entry.requestExtra,
          });
          return {
            ...entry,
            metas: result.metas || [],
            loading: false,
            hasMore: (result.metas?.length || 0) >= PAGE_SIZE,
          };
        } catch (e) {
          return {
            ...entry,
            loading: false,
            error: e instanceof Error ? e.message : 'Failed to load catalog',
            hasMore: false,
          };
        }
      });

      const results = await Promise.allSettled(promises);
      const resolved = results
        .filter((r): r is PromiseFulfilledResult<CatalogEntry> => r.status === 'fulfilled')
        .map((r) => r.value);

      set({ catalogs: resolved, loading: false });
    },

    loadMoreCatalog: async (addonId: string, catalogId: string) => {
      const catalogs = get().catalogs;
      const idx = catalogs.findIndex(
        (c) => c.addonId === addonId && c.catalogId === catalogId,
      );
      if (idx === -1) return;

      const entry = catalogs[idx];
      if (entry.loading || !entry.hasMore) return;

      const updated = [...catalogs];
      updated[idx] = { ...entry, loading: true };
      set({ catalogs: updated });

      try {
        const result = await addonTransportClient.fetchCatalog(entry.transportUrl, {
          type: entry.catalogType,
          id: entry.catalogId,
          extra: {
            ...(entry.requestExtra ?? {}),
            skip: String(entry.metas.length),
          },
        });
        const newMetas = result.metas || [];
        const updated2 = [...get().catalogs];
        updated2[idx] = {
          ...entry,
          metas: [...entry.metas, ...newMetas],
          loading: false,
          hasMore: newMetas.length >= PAGE_SIZE,
        };
        set({ catalogs: updated2 });
      } catch (e) {
        const updated2 = [...get().catalogs];
        updated2[idx] = {
          ...entry,
          loading: false,
          error: e instanceof Error ? e.message : 'Load more failed',
        };
        set({ catalogs: updated2 });
      }
    },

    invalidate: () => {
      set({ catalogs: [], loading: false });
    },
  }));

// ── Search Store (separate from browse catalogs) ──

export interface SearchState {
  results: MetaPreview[];
  loading: boolean;
  query: string;
  error: string | null;
}

export interface SearchActions {
  search: (addons: InstalledAddon[], query: string) => Promise<void>;
  clear: () => void;
}

export type SearchStore = SearchState & SearchActions;

export const createSearchStore = () => {
  let currentRequestId = 0;

  return createStore<SearchStore>((set) => ({
    results: [],
    loading: false,
    query: '',
    error: null,

    search: async (addons: InstalledAddon[], query: string) => {
      const requestId = ++currentRequestId;

      if (!query.trim()) {
        set({ results: [], loading: false, query: '', error: null });
        return;
      }

      set({ loading: true, query, error: null });

      const searchableAddons = addons.filter((addon) =>
        addon.manifest.catalogs?.some((c) =>
          c.extra?.some((e) => e.name === 'search'),
        ),
      );

      if (searchableAddons.length === 0) {
        set({ results: [], loading: false, error: 'No searchable addons installed' });
        return;
      }

      const promises: Promise<MetaPreview[]>[] = [];

      for (const addon of searchableAddons) {
        for (const catalog of addon.manifest.catalogs || []) {
          const hasSearch = catalog.extra?.some((e) => e.name === 'search');
          if (!hasSearch) continue;

          const resolvedExtra = resolveCatalogExtra(catalog as Catalog, { search: query });
          if (resolvedExtra === null) continue;

          promises.push(
            addonTransportClient
              .fetchCatalog(addon.transportUrl, {
                type: catalog.type,
                id: catalog.id,
                extra: resolvedExtra,
              })
              .then((result) => result.metas || [])
              .catch(() => [] as MetaPreview[]),
          );
        }
      }

      const results = await Promise.allSettled(promises);

      if (requestId !== currentRequestId) return;

      const allMetas = results
        .filter((r): r is PromiseFulfilledResult<MetaPreview[]> => r.status === 'fulfilled')
        .flatMap((r) => r.value);

      const uniqueMetas = Array.from(
        new Map(allMetas.map((m) => [m.id, m])).values(),
      );

      set({ results: uniqueMetas, loading: false });
    },

    clear: () => {
      currentRequestId++;
      set({ results: [], loading: false, query: '', error: null });
    },
  }));
};

// ── Detail Store ──

export interface DetailState {
  meta: Meta | null;
  streams: { addon: InstalledAddon; streams: Stream[] }[];
  subtitles: Subtitle[];
  loading: boolean;
  streamsLoading: boolean;
  streamsError: string | null;
  error: string | null;
}

export interface DetailActions {
  loadMeta: (addons: InstalledAddon[], type: string, id: string) => Promise<void>;
  loadStreams: (addons: InstalledAddon[], type: string, videoId: string) => Promise<void>;
  loadSubtitles: (addons: InstalledAddon[], type: string, id: string) => Promise<void>;
  clear: () => void;
}

export type DetailStore = DetailState & DetailActions;

export const createDetailStore = () =>
  createStore<DetailStore>((set) => ({
    meta: null,
    streams: [],
    subtitles: [],
    loading: false,
    streamsLoading: false,
    streamsError: null,
    error: null,

    loadMeta: async (addons: InstalledAddon[], type: string, id: string) => {
      set({ loading: true, error: null, meta: null, streams: [], subtitles: [], streamsError: null });

      const metaAddons = filterAddonsForResource(addons, 'meta', type, id);
      const results = await Promise.allSettled(
        metaAddons.map((a) =>
          addonTransportClient.fetchMeta(a.transportUrl, { type, id }),
        ),
      );

      for (const r of results) {
        if (r.status === 'fulfilled' && r.value.meta) {
          set({ meta: r.value.meta, loading: false });
          return;
        }
      }

      set({ loading: false, error: 'No metadata found' });
    },

    loadStreams: async (addons: InstalledAddon[], type: string, videoId: string) => {
      set({ streamsLoading: true, streams: [], streamsError: null });

      const streamAddons = filterAddonsForResource(addons, 'stream', type, videoId);

      if (streamAddons.length === 0) {
        set({
          streamsLoading: false,
          streams: [],
          streamsError: 'No stream addons installed. Install a stream addon to watch content.',
        });
        return;
      }

      const results = await Promise.allSettled(
        streamAddons.map(async (addon) => {
          const result = await addonTransportClient.fetchStreams(addon.transportUrl, {
            type,
            id: videoId,
          });
          return {
            addon,
            streams: [...(result.streams || [])].sort(compareStreamPriority),
          };
        }),
      );

      const streams = results
        .filter(
          (r): r is PromiseFulfilledResult<{ addon: InstalledAddon; streams: Stream[] }> =>
            r.status === 'fulfilled' && r.value.streams.length > 0,
        )
        .map((r) => r.value);

      const allFailed = results.every((r) => r.status === 'rejected');

      set({
        streams,
        streamsLoading: false,
        streamsError: allFailed
          ? 'Failed to load streams from all addons'
          : streams.length === 0
            ? 'No streams found for this content'
            : null,
      });
    },

    loadSubtitles: async (addons: InstalledAddon[], type: string, id: string) => {
      const subAddons = filterAddonsForResource(addons, 'subtitles', type, id);
      const results = await Promise.allSettled(
        subAddons.map((a) =>
          addonTransportClient.fetchSubtitles(a.transportUrl, { type, id }),
        ),
      );

      const subtitles = results
        .filter(
          (r): r is PromiseFulfilledResult<{ subtitles: Subtitle[] }> =>
            r.status === 'fulfilled',
        )
        .flatMap((r) => r.value.subtitles || []);

      set({ subtitles });
    },

    clear: () =>
      set({
        meta: null,
        streams: [],
        subtitles: [],
        loading: false,
        streamsLoading: false,
        streamsError: null,
        error: null,
      }),
  }));

// ── Player Store ──

export interface PlayerState {
  stream: Stream | null;
  type: string | null;
  videoId: string | null;
  metaId: string | null;
  title: string | null;
  subtitle: string | null;
  poster: string | null;
  subtitles: Subtitle[];
  availableSources: PlayerSourceOption[];
  playlist: PlayerQueueItem[];
  playlistIndex: number;
  initialStartTime: number;
  currentTime: number;
  duration: number;
  buffered: number;
  paused: boolean;
  volume: number;
  muted: boolean;
  buffering: boolean;
  error: string | null;
  selectedSubtitleId: string | null;
  playbackRate: number;
  qualityLevels: { index: number; height: number; bitrate: number; label: string }[];
  currentQuality: number;
  isPiP: boolean;
  isFullscreen: boolean;
  showControls: boolean;
}

export interface PlayerActions {
  play: (params: {
    stream: Stream;
    type: string;
    videoId: string;
    metaId: string;
    title: string;
    subtitle?: string;
    poster?: string;
    subtitles?: Subtitle[];
    availableSources?: PlayerSourceOption[];
    playlist?: PlayerQueueItem[];
    playlistIndex?: number;
    startTime?: number;
  }) => void;
  updateTime: (currentTime: number, duration: number) => void;
  setBuffered: (buffered: number) => void;
  setPaused: (paused: boolean) => void;
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  setBuffering: (buffering: boolean) => void;
  setError: (error: string | null) => void;
  selectSubtitle: (id: string | null) => void;
  setPlaybackRate: (rate: number) => void;
  setQualityLevels: (levels: PlayerState['qualityLevels']) => void;
  setCurrentQuality: (index: number) => void;
  setIsPiP: (isPiP: boolean) => void;
  setIsFullscreen: (isFullscreen: boolean) => void;
  setShowControls: (show: boolean) => void;
  stop: () => void;
}

export type PlayerStore = PlayerState & PlayerActions;

export const createPlayerStore = () =>
  createStore<PlayerStore>((set) => ({
    stream: null,
    type: null,
    videoId: null,
    metaId: null,
    title: null,
    subtitle: null,
    poster: null,
    subtitles: [],
    availableSources: [],
    playlist: [],
    playlistIndex: -1,
    initialStartTime: 0,
    currentTime: 0,
    duration: 0,
    buffered: 0,
    paused: true,
    volume: 1,
    muted: false,
    buffering: false,
    error: null,
    selectedSubtitleId: null,
    playbackRate: 1,
    qualityLevels: [],
    currentQuality: -1,
    isPiP: false,
    isFullscreen: false,
    showControls: true,

    play: (params) =>
      set({
        stream: params.stream,
        type: params.type,
        videoId: params.videoId,
        metaId: params.metaId,
        title: params.title,
        subtitle: params.subtitle || null,
        poster: params.poster || null,
        subtitles: params.subtitles || [],
        availableSources: params.availableSources || [],
        playlist: params.playlist || [],
        playlistIndex: params.playlistIndex ?? -1,
        initialStartTime: params.startTime ?? 0,
        currentTime: 0,
        duration: 0,
        buffered: 0,
        paused: false,
        buffering: true,
        error: null,
        selectedSubtitleId: null,
        playbackRate: 1,
        qualityLevels: [],
        currentQuality: -1,
      }),

    updateTime: (currentTime, duration) => set({ currentTime, duration }),
    setBuffered: (buffered) => set({ buffered }),
    setPaused: (paused) => set({ paused }),
    setVolume: (volume) => set({ volume }),
    setMuted: (muted) => set({ muted }),
    setBuffering: (buffering) => set({ buffering }),
    setError: (error) => set({ error }),
    selectSubtitle: (id) => set({ selectedSubtitleId: id }),
    setPlaybackRate: (rate) => set({ playbackRate: rate }),
    setQualityLevels: (levels) => set({ qualityLevels: levels }),
    setCurrentQuality: (index) => set({ currentQuality: index }),
    setIsPiP: (isPiP) => set({ isPiP }),
    setIsFullscreen: (isFullscreen) => set({ isFullscreen }),
    setShowControls: (show) => set({ showControls: show }),
    stop: () =>
      set({
        stream: null,
        type: null,
        videoId: null,
        metaId: null,
        title: null,
        subtitle: null,
        poster: null,
        subtitles: [],
        availableSources: [],
        playlist: [],
        playlistIndex: -1,
        initialStartTime: 0,
        currentTime: 0,
        duration: 0,
        buffered: 0,
        paused: true,
        buffering: false,
        error: null,
        selectedSubtitleId: null,
        playbackRate: 1,
        qualityLevels: [],
        currentQuality: -1,
        isPiP: false,
        isFullscreen: false,
        showControls: true,
      }),
  }));

// ── Settings Store ──

export interface AppSettings {
  posterSize: 'sm' | 'md' | 'lg';
  autoplay: boolean;
  autoSourceFailover: boolean;
  defaultSubtitleLang: string;
  playbackRate: number;
  hardwareAcceleration: boolean;
  autoNextEpisode: boolean;
  skipIntroOutro: boolean;
  defaultQuality: 'auto' | '4k' | '1080p' | '720p' | '480p' | '360p';
  keepScreenAwake: boolean;
  showPlaybackDiagnostics: boolean;
  liveLatencyMode: 'auto' | 'low' | 'balanced';
  rememberRecentSearches: boolean;
  defaultCaptionScale: number;
  theme: 'dark' | 'midnight' | 'amoled';
}

export interface SettingsState {
  settings: AppSettings;
}

export interface SettingsActions {
  updateSettings: (partial: Partial<AppSettings>) => void;
  loadSettings: (settings: Partial<AppSettings>) => void;
}

export type SettingsStore = SettingsState & SettingsActions;

const DEFAULT_SETTINGS: AppSettings = {
  posterSize: 'md',
  autoplay: true,
  autoSourceFailover: true,
  defaultSubtitleLang: '',
  playbackRate: 1,
  hardwareAcceleration: true,
  autoNextEpisode: true,
  skipIntroOutro: false,
  defaultQuality: 'auto',
  keepScreenAwake: true,
  showPlaybackDiagnostics: false,
  liveLatencyMode: 'auto',
  rememberRecentSearches: true,
  defaultCaptionScale: 1,
  theme: 'dark',
};

export const createSettingsStore = (initial?: Partial<AppSettings>) =>
  createStore<SettingsStore>((set, get) => ({
    settings: { ...DEFAULT_SETTINGS, ...initial },

    updateSettings: (partial: Partial<AppSettings>) => {
      set({ settings: { ...get().settings, ...partial } });
    },

    loadSettings: (settings: Partial<AppSettings>) => {
      set({ settings: { ...DEFAULT_SETTINGS, ...settings } });
    },
  }));

// ── Recent Search Store ──

export interface RecentSearchState {
  items: RecentSearch[];
}

export interface RecentSearchActions {
  addQuery: (query: string) => void;
  removeQuery: (query: string) => void;
  loadItems: (items: RecentSearch[]) => void;
  clear: () => void;
}

export type RecentSearchStore = RecentSearchState & RecentSearchActions;

const MAX_RECENT_SEARCHES = 8;

export const createRecentSearchStore = (initialItems: RecentSearch[] = []) =>
  createStore<RecentSearchStore>((set, get) => ({
    items: initialItems,

    addQuery: (query) => {
      const normalized = query.trim();
      if (normalized.length < 2) return;

      const nextItems = [
        { query: normalized, createdAt: Date.now() },
        ...get().items.filter((item) => item.query.toLowerCase() !== normalized.toLowerCase()),
      ].slice(0, MAX_RECENT_SEARCHES);

      set({ items: nextItems });
    },

    removeQuery: (query) => {
      set({ items: get().items.filter((item) => item.query.toLowerCase() !== query.trim().toLowerCase()) });
    },

    loadItems: (items) => {
      set({
        items: items
          .slice()
          .sort((left, right) => right.createdAt - left.createdAt)
          .slice(0, MAX_RECENT_SEARCHES),
      });
    },

    clear: () => set({ items: [] }),
  }));

// ── Watchlist Store ──

export interface WatchlistItem {
  id: string;
  type: string;
  name: string;
  poster?: string;
  addedAt: number;
}

export interface WatchlistState {
  items: WatchlistItem[];
}

export interface WatchlistActions {
  addItem: (item: Omit<WatchlistItem, 'addedAt'>) => void;
  removeItem: (id: string) => void;
  isInWatchlist: (id: string) => boolean;
  loadItems: (items: WatchlistItem[]) => void;
  clear: () => void;
}

export type WatchlistStore = WatchlistState & WatchlistActions;

export const createWatchlistStore = (initialItems: WatchlistItem[] = []) =>
  createStore<WatchlistStore>((set, get) => ({
    items: initialItems,

    addItem: (item) => {
      const existing = get().items;
      if (existing.some((i) => i.id === item.id)) return;
      set({ items: [{ ...item, addedAt: Date.now() }, ...existing] });
    },

    removeItem: (id) => {
      set({ items: get().items.filter((i) => i.id !== id) });
    },

    isInWatchlist: (id) => {
      return get().items.some((i) => i.id === id);
    },

    loadItems: (items) => {
      set({ items: items.sort((a, b) => b.addedAt - a.addedAt) });
    },

    clear: () => set({ items: [] }),
  }));

// ── Watch History Store ──

export interface WatchHistoryEntry {
  id: string;
  type: string;
  videoId: string;
  name: string;
  poster?: string;
  episodeTitle?: string;
  season?: number;
  episode?: number;
  currentTime: number;
  duration: number;
  updatedAt: number;
}

export interface WatchHistoryState {
  entries: WatchHistoryEntry[];
}

export interface WatchHistoryActions {
  updateProgress: (entry: Omit<WatchHistoryEntry, 'updatedAt'>) => void;
  getProgress: (videoId: string) => WatchHistoryEntry | undefined;
  getContinueWatching: () => WatchHistoryEntry[];
  removeEntry: (videoId: string) => void;
  loadEntries: (entries: WatchHistoryEntry[]) => void;
  clear: () => void;
}

export type WatchHistoryStore = WatchHistoryState & WatchHistoryActions;

export const createWatchHistoryStore = (initialEntries: WatchHistoryEntry[] = []) =>
  createStore<WatchHistoryStore>((set, get) => ({
    entries: initialEntries,

    updateProgress: (entry) => {
      const existing = get().entries;
      const idx = existing.findIndex((e) => e.videoId === entry.videoId);
      const newEntry = { ...entry, updatedAt: Date.now() };

      if (idx >= 0) {
        const updated = [...existing];
        updated[idx] = newEntry;
        set({ entries: updated });
      } else {
        set({ entries: [newEntry, ...existing] });
      }
    },

    getProgress: (videoId) => {
      return get().entries.find((e) => e.videoId === videoId);
    },

    getContinueWatching: () => {
      return get()
        .entries.filter((e) => {
          if (e.duration <= 0) return false;
          const progress = e.currentTime / e.duration;
          return progress > 0.02 && progress < 0.95;
        })
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 20);
    },

    removeEntry: (videoId) => {
      set({ entries: get().entries.filter((e) => e.videoId !== videoId) });
    },

    loadEntries: (entries) => {
      set({ entries: entries.sort((a, b) => b.updatedAt - a.updatedAt) });
    },

    clear: () => set({ entries: [] }),
  }));
