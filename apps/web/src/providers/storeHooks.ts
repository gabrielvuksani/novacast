import { useContext } from 'react';
import { useStore } from 'zustand';
import type {
  AddonStore,
  CatalogStore,
  SearchStore,
  DetailStore,
  PlayerStore,
  RecentSearchStore,
  SettingsStore,
  WatchHistoryStore,
  WatchlistStore,
} from '@novacast/core';
import { StoreContext } from './storeContext';

function useStoreContext() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStoreContext must be used within StoreProvider');
  return ctx;
}

export function useAddonStore<T>(selector: (state: AddonStore) => T): T {
  const { addonStore } = useStoreContext();
  return useStore(addonStore, selector);
}

export function useCatalogStore<T>(selector: (state: CatalogStore) => T): T {
  const { catalogStore } = useStoreContext();
  return useStore(catalogStore, selector);
}

export function useSearchStore<T>(selector: (state: SearchStore) => T): T {
  const { searchStore } = useStoreContext();
  return useStore(searchStore, selector);
}

export function useDetailStore<T>(selector: (state: DetailStore) => T): T {
  const { detailStore } = useStoreContext();
  return useStore(detailStore, selector);
}

export function usePlayerStore<T>(selector: (state: PlayerStore) => T): T {
  const { playerStore } = useStoreContext();
  return useStore(playerStore, selector);
}

export function useRecentSearchStore<T>(selector: (state: RecentSearchStore) => T): T {
  const { recentSearchStore } = useStoreContext();
  return useStore(recentSearchStore, selector);
}

export function useSettingsStore<T>(selector: (state: SettingsStore) => T): T {
  const { settingsStore } = useStoreContext();
  return useStore(settingsStore, selector);
}

export function useWatchlistStore<T>(selector: (state: WatchlistStore) => T): T {
  const { watchlistStore } = useStoreContext();
  return useStore(watchlistStore, selector);
}

export function useWatchHistoryStore<T>(selector: (state: WatchHistoryStore) => T): T {
  const { historyStore } = useStoreContext();
  return useStore(historyStore, selector);
}

export function useStores() {
  return useStoreContext();
}