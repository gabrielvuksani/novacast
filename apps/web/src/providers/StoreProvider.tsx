import { useEffect, useRef, type ReactNode } from 'react';
import {
  readDefaultAddonUrlsFromRecord,
  type InstalledAddon,
  type AppSettings,
  createAddonStore,
  createCatalogStore,
  createSearchStore,
  createDetailStore,
  createPlayerStore,
  createRecentSearchStore,
  createSettingsStore,
  createWatchlistStore,
  createWatchHistoryStore,
  type RecentSearch,
  type WatchlistItem,
  type WatchHistoryEntry,
} from '@novacast/core';
import {
  onAddonsChange,
  onUserPreferencesChange,
  onWatchlistChange,
  onWatchHistoryChange,
  removeInstalledAddon,
  saveInstalledAddon,
  saveUserPreferences,
  addToWatchlist as fbAddToWatchlist,
  removeFromWatchlist as fbRemoveFromWatchlist,
  updateWatchHistory as fbUpdateWatchHistory,
} from '@novacast/firebase';
import { useAuth } from './useAuth';
import { NOVACAST_STORAGE_KEYS, StoreContext, type StoreContextValue } from './storeContext';

function safeRead<T>(key: string): { value: T | null; exists: boolean } {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return { value: null, exists: false };
    return { value: JSON.parse(raw) as T, exists: true };
  } catch {
    return { value: null, exists: false };
  }
}

function safeParse<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const storesRef = useRef<StoreContextValue | null>(null);
  const syncingFromRemoteRef = useRef(false);
  const hadPersistedAddonsRef = useRef(false);
  const { user, firebaseEnabled } = useAuth();
  const envRecord = import.meta.env as Record<string, string | undefined>;
  const defaultAddonUrls = readDefaultAddonUrlsFromRecord(envRecord);

  if (!storesRef.current) {
    const persistedAddons = safeRead<InstalledAddon[]>(NOVACAST_STORAGE_KEYS[0]);
    hadPersistedAddonsRef.current = persistedAddons.exists;
    const initialAddons = persistedAddons.value ?? [];
    const initialSettings = safeParse(NOVACAST_STORAGE_KEYS[1], {});
    const initialWatchlist = safeParse<WatchlistItem[]>(NOVACAST_STORAGE_KEYS[2], []);
    const initialHistory = safeParse<WatchHistoryEntry[]>(NOVACAST_STORAGE_KEYS[3], []);
    const initialRecentSearches = safeParse<RecentSearch[]>(NOVACAST_STORAGE_KEYS[4], []);

    const addonStore = createAddonStore(initialAddons);
    const catalogStore = createCatalogStore();
    const searchStore = createSearchStore();
    const detailStore = createDetailStore();
    const playerStore = createPlayerStore();
    const recentSearchStore = createRecentSearchStore(initialRecentSearches);
    const settingsStore = createSettingsStore(initialSettings);
    const watchlistStore = createWatchlistStore(initialWatchlist);
    const historyStore = createWatchHistoryStore(initialHistory);

    // Persist addons to localStorage
    addonStore.subscribe((state) => {
      localStorage.setItem(NOVACAST_STORAGE_KEYS[0], JSON.stringify(state.addons));
    });

    // Persist settings to localStorage
    settingsStore.subscribe((state) => {
      localStorage.setItem(NOVACAST_STORAGE_KEYS[1], JSON.stringify(state.settings));
    });

    // Persist watchlist to localStorage
    watchlistStore.subscribe((state) => {
      localStorage.setItem(NOVACAST_STORAGE_KEYS[2], JSON.stringify(state.items));
    });

    // Persist watch history to localStorage
    historyStore.subscribe((state) => {
      localStorage.setItem(NOVACAST_STORAGE_KEYS[3], JSON.stringify(state.entries));
    });

    recentSearchStore.subscribe((state) => {
      localStorage.setItem(NOVACAST_STORAGE_KEYS[4], JSON.stringify(state.items));
    });

    // When addons change, invalidate catalog cache
    addonStore.subscribe(() => {
      catalogStore.getState().invalidate();
    });

    settingsStore.subscribe((state) => {
      const theme = state.settings.theme || 'dark';
      document.documentElement.dataset.theme = theme;
      document.body.dataset.theme = theme;
    });

    document.documentElement.dataset.theme = settingsStore.getState().settings.theme;
    document.body.dataset.theme = settingsStore.getState().settings.theme;

    storesRef.current = {
      addonStore,
      catalogStore,
      searchStore,
      detailStore,
      playerStore,
      recentSearchStore,
      settingsStore,
      watchlistStore,
      historyStore,
    };
  }

  useEffect(() => {
    if (!storesRef.current || hadPersistedAddonsRef.current) return;

    const { addonStore } = storesRef.current;
    if (addonStore.getState().addons.length > 0) return;

    let cancelled = false;

    const seedDefaultAddons = async () => {
      for (const transportUrl of defaultAddonUrls) {
        if (cancelled) break;
        await addonStore.getState().installAddon(transportUrl);
      }
    };

    void seedDefaultAddons();

    return () => {
      cancelled = true;
    };
  }, [defaultAddonUrls]);

  useEffect(() => {
    if (!storesRef.current || !user || !firebaseEnabled) return;

    const { addonStore, settingsStore, watchlistStore, historyStore } = storesRef.current;

    const queueSyncFlagReset = () => {
      queueMicrotask(() => {
        syncingFromRemoteRef.current = false;
      });
    };

    const hydrateAddons = (records: Array<{ transportUrl: string; manifest?: unknown }>) => {
      const hydrated = records
        .filter((record): record is { transportUrl: string; manifest: NonNullable<typeof record.manifest> } => !!record.manifest)
        .map((record) => ({
          transportUrl: record.transportUrl,
          manifest: record.manifest as InstalledAddon['manifest'],
        } satisfies InstalledAddon));

      if (hydrated.length > 0) {
        syncingFromRemoteRef.current = true;
        addonStore.getState().loadAddons(hydrated);
        queueSyncFlagReset();
      } else if (addonStore.getState().addons.length > 0) {
        for (const addon of addonStore.getState().addons) {
          void saveInstalledAddon(user.uid, {
            transportUrl: addon.transportUrl,
            addonId: addon.manifest.id,
            name: addon.manifest.name,
            version: addon.manifest.version,
            manifest: addon.manifest,
            installedAt: new Date().toISOString(),
          });
        }
      }
    };

    const unsubscribeRemoteAddons = onAddonsChange(user.uid, hydrateAddons);
    const unsubscribeRemotePreferences = onUserPreferencesChange(
      user.uid,
      (preferences: Record<string, unknown> & { updatedAt?: unknown }) => {
      const { updatedAt: _updatedAt, ...nextSettings } = preferences;
      if (Object.keys(nextSettings).length > 0) {
        syncingFromRemoteRef.current = true;
        settingsStore.getState().loadSettings(nextSettings as Partial<AppSettings>);
        queueSyncFlagReset();
      } else {
        void saveUserPreferences(user.uid, settingsStore.getState().settings as unknown as Record<string, unknown>);
      }
      },
    );

    const unsubscribeLocalAddons = addonStore.subscribe((state, prevState) => {
      if (syncingFromRemoteRef.current) return;

      const currentByUrl = new Map(state.addons.map((addon) => [addon.transportUrl, addon]));
      const previousByUrl = new Map(prevState.addons.map((addon) => [addon.transportUrl, addon]));

      for (const addon of state.addons) {
        const previous = previousByUrl.get(addon.transportUrl);
        if (!previous || previous.manifest.version !== addon.manifest.version) {
          void saveInstalledAddon(user.uid, {
            transportUrl: addon.transportUrl,
            addonId: addon.manifest.id,
            name: addon.manifest.name,
            version: addon.manifest.version,
            manifest: addon.manifest,
            installedAt: new Date().toISOString(),
          });
        }
      }

      for (const previous of prevState.addons) {
        if (!currentByUrl.has(previous.transportUrl)) {
          void removeInstalledAddon(user.uid, previous.manifest.id);
        }
      }
    });

    const unsubscribeLocalSettings = settingsStore.subscribe((state, prevState) => {
      if (syncingFromRemoteRef.current) return;
      if (JSON.stringify(state.settings) !== JSON.stringify(prevState.settings)) {
        void saveUserPreferences(user.uid, state.settings as unknown as Record<string, unknown>);
      }
    });

    // Sync watchlist from Firebase
    const unsubscribeRemoteWatchlist = onWatchlistChange(user.uid, (items) => {
      syncingFromRemoteRef.current = true;
      watchlistStore.getState().loadItems(
        items.map((i) => ({
          id: i.id,
          type: i.type,
          name: i.name,
          poster: i.poster,
          addedAt: typeof i.addedAt === 'number' ? i.addedAt : Date.now(),
        })),
      );
      queueSyncFlagReset();
    });

    // Sync watchlist to Firebase on local changes
    const unsubscribeLocalWatchlist = watchlistStore.subscribe((state, prevState) => {
      if (syncingFromRemoteRef.current) return;
      const currentIds = new Set(state.items.map((i) => i.id));
      const previousIds = new Set(prevState.items.map((i) => i.id));

      for (const item of state.items) {
        if (!previousIds.has(item.id)) {
          void fbAddToWatchlist(user.uid, { id: item.id, type: item.type, name: item.name, poster: item.poster });
        }
      }
      for (const item of prevState.items) {
        if (!currentIds.has(item.id)) {
          void fbRemoveFromWatchlist(user.uid, item.id, item.type);
        }
      }
    });

    // Sync watch history from Firebase
    const unsubscribeRemoteHistory = onWatchHistoryChange(user.uid, (items) => {
      syncingFromRemoteRef.current = true;
      historyStore.getState().loadEntries(
        items.map((i) => ({
          id: i.id,
          type: i.type,
          videoId: i.videoId,
          name: i.name,
          poster: i.poster,
          currentTime: i.currentTime,
          duration: i.duration,
          updatedAt: typeof i.updatedAt === 'number' ? i.updatedAt : Date.now(),
        })),
      );
      queueSyncFlagReset();
    });

    // Sync watch history to Firebase on local changes
    const unsubscribeLocalHistory = historyStore.subscribe((state, prevState) => {
      if (syncingFromRemoteRef.current) return;
      for (const entry of state.entries) {
        const prev = prevState.entries.find((e) => e.videoId === entry.videoId);
        if (!prev || prev.currentTime !== entry.currentTime) {
          void fbUpdateWatchHistory(user.uid, {
            id: entry.id,
            type: entry.type,
            videoId: entry.videoId,
            name: entry.name,
            poster: entry.poster,
            currentTime: entry.currentTime,
            duration: entry.duration,
          });
        }
      }
    });

    return () => {
      unsubscribeRemoteAddons();
      unsubscribeRemotePreferences();
      unsubscribeRemoteWatchlist();
      unsubscribeRemoteHistory();
      unsubscribeLocalAddons();
      unsubscribeLocalSettings();
      unsubscribeLocalWatchlist();
      unsubscribeLocalHistory();
    };
  }, [firebaseEnabled, user]);

  return (
    <StoreContext.Provider value={storesRef.current}>
      {children}
    </StoreContext.Provider>
  );
}
