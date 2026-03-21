import { createContext } from 'react';
import type {
  createAddonStore,
  createCatalogStore,
  createSearchStore,
  createDetailStore,
  createPlayerStore,
  createRecentSearchStore,
  createSettingsStore,
  createWatchlistStore,
  createWatchHistoryStore,
} from '@novacast/core';

export interface StoreContextValue {
  addonStore: ReturnType<typeof createAddonStore>;
  catalogStore: ReturnType<typeof createCatalogStore>;
  searchStore: ReturnType<typeof createSearchStore>;
  detailStore: ReturnType<typeof createDetailStore>;
  playerStore: ReturnType<typeof createPlayerStore>;
  recentSearchStore: ReturnType<typeof createRecentSearchStore>;
  settingsStore: ReturnType<typeof createSettingsStore>;
  watchlistStore: ReturnType<typeof createWatchlistStore>;
  historyStore: ReturnType<typeof createWatchHistoryStore>;
}

export const NOVACAST_STORAGE_KEYS = [
  'novacast_addons',
  'novacast_settings',
  'novacast_watchlist',
  'novacast_history',
  'novacast_recent_searches',
] as const;

export const StoreContext = createContext<StoreContextValue | null>(null);