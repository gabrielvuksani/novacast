import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Loader2, Search, SearchX, Sparkles, Trash2, X } from 'lucide-react';
import { EmptyState } from '../components/EmptyState';
import { PosterCard, PosterCardSkeleton } from '../components/PosterCard';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import {
  useAddonStore,
  useRecentSearchStore,
  useSearchStore,
  useSettingsStore,
  useStores,
} from '../providers/storeHooks';

export function SearchPage() {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const addons = useAddonStore((s) => s.addons);
  const results = useSearchStore((s) => s.results);
  const loading = useSearchStore((s) => s.loading);
  const error = useSearchStore((s) => s.error);
  const recentSearches = useRecentSearchStore((s) => s.items);
  const rememberRecentSearches = useSettingsStore((s) => s.settings.rememberRecentSearches);
  const { searchStore, recentSearchStore } = useStores();

  useDocumentTitle(query ? `Search: ${query}` : 'Search');

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    const timer = setTimeout(() => {
      if (trimmed.length >= 2) {
        searchStore.getState().search(addons, trimmed);
        if (rememberRecentSearches) {
          recentSearchStore.getState().addQuery(trimmed);
        }
      } else {
        searchStore.getState().clear();
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [query, addons, rememberRecentSearches, recentSearchStore, searchStore]);

  const groupedResults = useMemo(() => {
    const byType = new Map<string, typeof results>();
    for (const result of results) {
      const bucket = byType.get(result.type) || [];
      bucket.push(result);
      byType.set(result.type, bucket);
    }
    return Array.from(byType.entries());
  }, [results]);

  const hasQuery = query.trim().length >= 2;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Search Header */}
      <div className="pt-2">
        <h1 className="text-3xl font-bold tracking-tight text-white font-display sm:text-4xl">
          Search
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Find movies, series, and more across all your sources.
        </p>
      </div>

      {/* Search Input */}
      <div className="relative max-w-2xl">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-tertiary pointer-events-none" aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search for movies, series, anime, documentaries..."
          className="w-full rounded-2xl border border-white/8 bg-white/[0.04] pl-12 pr-12 py-4 text-base text-text-primary placeholder:text-text-tertiary backdrop-blur-xl transition-all duration-200 focus:outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/15 focus:bg-white/[0.06]"
          aria-label="Search content"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="btn-icon absolute right-2 top-1/2 -translate-y-1/2"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {loading && (
          <Loader2 className="absolute right-12 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-accent" aria-hidden="true" />
        )}
      </div>

      {/* Recent Searches */}
      {recentSearches.length > 0 && !hasQuery && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              Recent searches
            </div>
            <button
              onClick={() => recentSearchStore.getState().clear()}
              className="inline-flex cursor-pointer items-center gap-1 text-xs text-text-tertiary transition-colors hover:text-white"
            >
              <Trash2 className="h-3 w-3" /> Clear all
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((item) => (
              <button
                key={`${item.query}-${item.createdAt}`}
                onClick={() => setQuery(item.query)}
                className="cursor-pointer rounded-full border border-white/8 bg-white/[0.03] px-3.5 py-1.5 text-sm text-text-secondary transition-all hover:border-white/14 hover:bg-white/[0.06] hover:text-white"
              >
                {item.query}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {!hasQuery ? (
        <EmptyState
          icon={<Search className="h-8 w-8" aria-hidden="true" />}
          title="Start typing to search"
          description="Search across all your connected sources instantly."
        />
      ) : loading && results.length === 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, index) => (
            <PosterCardSkeleton key={index} fillGrid />
          ))}
        </div>
      ) : error ? (
        <EmptyState
          icon={<SearchX className="h-8 w-8" aria-hidden="true" />}
          title="Search unavailable"
          description={error}
          action={
            <Link to="/addons" className="btn-primary">
              Manage sources
            </Link>
          }
        />
      ) : results.length > 0 ? (
        <div className="space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-text-secondary">
              <span className="font-semibold text-white">{results.length}</span> result{results.length !== 1 ? 's' : ''} for &ldquo;{query.trim()}&rdquo;
            </p>
            <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
              <Sparkles className="h-3.5 w-3.5 text-accent" aria-hidden="true" /> Searching all sources
            </div>
          </div>

          {groupedResults.map(([type, metas]) => (
            <section key={type} className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold capitalize text-white font-display">{type}s</h2>
                <span className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1 text-xs font-medium text-text-tertiary">
                  {metas.length}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {metas.map((meta) => (
                  <PosterCard key={meta.id} meta={meta} fillGrid />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<SearchX className="h-8 w-8" aria-hidden="true" />}
          title="No results found"
          description={`Nothing matched "${query.trim()}". Try a different search or install more sources.`}
        />
      )}
    </div>
  );
}
