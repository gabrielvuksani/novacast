import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Radio, Search, Trophy, Tv, X, Zap } from 'lucide-react';
import { summarizeAddonCoverage } from '@novacast/core';
import { EmptyState } from '../components/EmptyState';
import { PosterCard, PosterCardSkeleton } from '../components/PosterCard';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useAddonStore, useCatalogStore, useStores } from '../providers/storeHooks';

type LiveFilter = 'all' | 'sports' | 'channels';

const LIVE_PATTERNS = {
  all: /\b(live|sports?|channels?|match(?:es)?|league|leagues|fixtures?|score|scores|news|24\/7)\b/i,
  sports: /\b(sport|sports|match|matches|league|leagues|football|soccer|basketball|baseball|hockey|mma|ufc|cricket|tennis|golf|formula|f1|motogp|racing|boxing)\b/i,
  channels: /\b(live|channel|channels|news|24\/7|station|stations)\b/i,
} as const;

function matchesPattern(value: string, filter: LiveFilter) {
  return LIVE_PATTERNS[filter].test(value);
}

export function LivePage() {
  const addons = useAddonStore((s) => s.addons);
  const catalogs = useCatalogStore((s) => s.catalogs);
  const loading = useCatalogStore((s) => s.loading);
  const { catalogStore } = useStores();
  const [filter, setFilter] = useState<LiveFilter>('all');
  const [query, setQuery] = useState('');

  useDocumentTitle('Live');

  useEffect(() => {
    if (addons.length > 0) {
      void catalogStore.getState().loadCatalogs(addons);
    }
  }, [addons, catalogStore]);

  const coverage = useMemo(() => summarizeAddonCoverage(addons), [addons]);

  const liveItems = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const sourceMetas = catalogs.flatMap((catalog) =>
      catalog.metas.map((meta) => ({
        meta,
        sourceLabel: `${catalog.catalogName} ${catalog.catalogId} ${catalog.catalogType}`,
      })),
    );

    const filtered = sourceMetas.filter(({ meta, sourceLabel }) => {
      const haystack = `${meta.name} ${(meta.genres ?? []).join(' ')} ${sourceLabel}`;
      if (!matchesPattern(haystack, filter)) return false;
      if (!needle) return true;
      return haystack.toLowerCase().includes(needle);
    });

    return Array.from(new Map(filtered.map(({ meta }) => [meta.id, meta])).values()).slice(0, 120);
  }, [catalogs, filter, query]);

  const highlightedGenres = useMemo(() => {
    const genres = new Set<string>();
    liveItems.forEach((meta) => meta.genres?.forEach((genre) => genres.add(genre)));
    return Array.from(genres).slice(0, 8);
  }, [liveItems]);

  const filterOptions = [
    { id: 'all' as const, label: 'All Live', icon: Radio },
    { id: 'sports' as const, label: 'Sports', icon: Trophy },
    { id: 'channels' as const, label: 'Channels', icon: Tv },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="pt-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-live/15">
            <Zap className="h-5 w-5 text-live" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white font-display sm:text-4xl">
              Live
            </h1>
            <p className="mt-0.5 text-sm text-text-secondary">
              Live channels, sports, and events from your sources.
            </p>
          </div>
        </div>
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex rounded-xl border border-white/8 bg-white/[0.03] p-1">
          {filterOptions.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                filter === id
                  ? 'bg-white text-slate-950 shadow-md'
                  : 'text-text-secondary hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>

        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary pointer-events-none" aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter live content..."
            className="w-full rounded-xl border border-white/8 bg-white/[0.04] pl-9 pr-8 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary transition-all focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/15"
            aria-label="Filter live content"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-white cursor-pointer"
              aria-label="Clear filter"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Genre Quick Filters */}
      {highlightedGenres.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {highlightedGenres.map((genre) => (
            <button
              key={genre}
              onClick={() => setQuery(genre)}
              className="cursor-pointer rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-text-secondary transition-all hover:border-white/14 hover:text-white"
            >
              {genre}
            </button>
          ))}
        </div>
      )}

      {/* Results Count */}
      {liveItems.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <span className="inline-flex h-2 w-2 rounded-full bg-live animate-pulse" />
          <span className="font-medium text-white">{liveItems.length}</span> live items available
        </div>
      )}

      {/* Content Grid */}
      {loading && liveItems.length === 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 18 }).map((_, index) => (
            <PosterCardSkeleton key={index} fillGrid />
          ))}
        </div>
      ) : liveItems.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {liveItems.map((meta) => (
            <PosterCard key={meta.id} meta={meta} fillGrid />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Radio className="h-8 w-8" aria-hidden="true" />}
          title="No live content available"
          description={
            coverage.playback > 0
              ? 'Your sources don\'t have live content. Install sources that provide live channels or sports feeds.'
              : 'Install sources with live channels, sports, or event feeds to see content here.'
          }
          action={
            <Link to="/addons" className="btn-primary">
              Add sources
            </Link>
          }
        />
      )}

      {/* Info Banner */}
      {!coverage.playback && liveItems.length > 0 && (
        <div className="rounded-xl border border-amber/20 bg-amber/8 px-4 py-3 text-sm text-amber">
          <p className="font-medium text-white">Playback source needed</p>
          <p className="mt-1 text-amber/80">
            Install a playback source that returns HLS or DASH streams to watch live content in NovaCast.
          </p>
        </div>
      )}
    </div>
  );
}
