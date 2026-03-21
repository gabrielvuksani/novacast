import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bookmark,
  ChevronRight,
  Check,
  Film,
  Play,
  Plus,
  Puzzle,
  Radio,
  Search,
  Sparkles,
  Subtitles,
} from 'lucide-react';
import { summarizeAddonCoverage } from '@novacast/core';
import { appBrand } from '@novacast/ui';
import { ContentRow } from '../components/ContentRow';
import { BrandMark } from '../components/BrandMark';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { ContinueWatchingCard, PosterCard } from '../components/PosterCard';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import {
  useAddonStore,
  useCatalogStore,
  useStores,
  useWatchHistoryStore,
  useWatchlistStore,
} from '../providers/storeHooks';

export function HomePage() {
  const addons = useAddonStore((s) => s.addons);
  const catalogs = useCatalogStore((s) => s.catalogs);
  const loading = useCatalogStore((s) => s.loading);
  const watchlistItems = useWatchlistStore((s) => s.items);
  const historyEntries = useWatchHistoryStore((s) => s.entries);
  const { catalogStore } = useStores();
  const navigate = useNavigate();
  const [heroIndex, setHeroIndex] = useState(0);

  useDocumentTitle('Home');

  useEffect(() => {
    if (addons.length > 0) {
      catalogStore.getState().loadCatalogs(addons);
    }
  }, [addons, catalogStore]);

  const coverage = useMemo(() => summarizeAddonCoverage(addons), [addons]);
  const playbackReady = coverage.playback > 0;

  const continueWatching = useMemo(
    () =>
      historyEntries
        .filter((entry) => {
          if (entry.duration <= 0) return false;
          const progress = entry.currentTime / entry.duration;
          return progress > 0.02 && progress < 0.95;
        })
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 20),
    [historyEntries],
  );

  const mergedCatalogs = useMemo(() => {
    const byKey = new Map<string, typeof catalogs[number]>();

    for (const catalog of catalogs) {
      const key = `${catalog.catalogType}:${catalog.catalogName}`;
      const existing = byKey.get(key);

      if (!existing) {
        byKey.set(key, {
          ...catalog,
          metas: [...catalog.metas],
        });
        continue;
      }

      const mergedMetas = Array.from(
        new Map([...existing.metas, ...catalog.metas].map((meta) => [meta.id, meta])).values(),
      );

      byKey.set(key, {
        ...existing,
        metas: mergedMetas,
        loading: existing.loading || catalog.loading,
        hasMore: existing.hasMore || catalog.hasMore,
      });
    }

    return Array.from(byKey.values());
  }, [catalogs]);

  const heroItems = useMemo(() => {
    const items = mergedCatalogs
      .flatMap((catalog) => catalog.metas)
      .filter((meta) => meta.poster || meta.background);

    return Array.from(new Map(items.map((item) => [item.id, item])).values()).slice(0, 12);
  }, [mergedCatalogs]);

  const heroMeta = heroItems[heroIndex] || null;

  const spotlightGenres = useMemo(() => {
    const genres = new Set<string>();
    for (const catalog of mergedCatalogs) {
      for (const meta of catalog.metas) {
        meta.genres?.forEach((genre) => genres.add(genre));
      }
    }
    return Array.from(genres).slice(0, 8);
  }, [mergedCatalogs]);

  const liveRadar = useMemo(() => {
    const items = mergedCatalogs
      .flatMap((catalog) => catalog.metas)
      .filter((meta) =>
        /live|sports|sport|channel|tv|event|match|league|news|24\/7/i.test(
          `${meta.name} ${meta.description ?? ''} ${(meta.genres ?? []).join(' ')}`,
        ),
      );

    return Array.from(new Map(items.map((item) => [item.id, item])).values()).slice(0, 12);
  }, [mergedCatalogs]);

  const trendingCatalog = mergedCatalogs[0];

  useEffect(() => {
    if (heroItems.length <= 1) return;
    const interval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroItems.length);
    }, 9000);
    return () => clearInterval(interval);
  }, [heroItems.length]);

  const isNewUser = addons.length === 0 && !loading && mergedCatalogs.length === 0;

  return (
    <div className="space-y-10 pb-12 animate-fade-in">
      {/* Minimal page header */}
      <PageHeader
        title={appBrand.name}
        description={appBrand.heroSubtitle}
        actions={(
          <>
            <Link to="/search" className="btn-secondary">
              <Search className="h-4 w-4" aria-hidden="true" /> Search
            </Link>
            <Link to="/addons" className="btn-secondary">
              <Puzzle className="h-4 w-4" aria-hidden="true" /> Sources
            </Link>
          </>
        )}
      />

      {/* Hero Spotlight */}
      <section className="relative min-h-[480px] overflow-hidden rounded-3xl">
        {heroMeta && (heroMeta.background || heroMeta.poster) ? (
          <>
            <img
              src={heroMeta.background || heroMeta.poster}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700"
            />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(3,6,17,0.95)_0%,rgba(3,6,17,0.7)_40%,rgba(3,6,17,0.1)_100%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(3,6,17,0.95)_0%,rgba(3,6,17,0.3)_40%,transparent_100%)]" />
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(103,232,249,0.12),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(139,124,255,0.15),transparent_50%)]" />
            <div className="absolute inset-0 bg-surface/80" />
          </>
        )}

        <div className="relative flex h-full min-h-[480px] flex-col justify-end p-8 sm:p-12">
          {heroMeta ? (
            <div className="max-w-2xl">
              {heroMeta.genres && heroMeta.genres.length > 0 && (
                <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-widest text-white/50">
                  {heroMeta.genres.slice(0, 3).map((genre, i) => (
                    <span key={genre} className="flex items-center gap-2">
                      {i > 0 && <span className="text-white/20">|</span>}
                      {genre}
                    </span>
                  ))}
                </div>
              )}

              <h2 className="text-4xl font-bold leading-tight text-white sm:text-5xl font-display">
                {heroMeta.name}
              </h2>

              {heroMeta.description && (
                <p className="mt-4 max-w-xl text-base leading-7 text-white/60 line-clamp-3">
                  {heroMeta.description}
                </p>
              )}

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  to={`/detail/${heroMeta.type}/${heroMeta.id}`}
                  className="btn-glow inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold"
                >
                  <Play className="h-5 w-5" aria-hidden="true" fill="currentColor" /> Watch Now
                </Link>
                <Link
                  to={`/detail/${heroMeta.type}/${heroMeta.id}`}
                  className="btn-secondary inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold"
                >
                  <Plus className="h-5 w-5" aria-hidden="true" /> More Info
                </Link>
              </div>
            </div>
          ) : (
            <div className="max-w-2xl">
              <h2 className="text-4xl font-bold leading-tight text-white sm:text-5xl font-display">
                {appBrand.tagline}
              </h2>
              <p className="mt-4 max-w-xl text-base leading-7 text-white/60">
                {appBrand.description}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {appBrand.heroHighlights.map((item) => (
                  <span key={item} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/60">
                    {item}
                  </span>
                ))}
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link to="/discover/movie" className="btn-glow inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold">
                  <Film className="h-5 w-5" aria-hidden="true" /> Explore Catalog
                </Link>
                <Link to="/search" className="btn-secondary inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold">
                  <Search className="h-5 w-5" aria-hidden="true" /> Search
                </Link>
              </div>
            </div>
          )}

          {/* Carousel indicators */}
          {heroItems.length > 1 && (
            <div className="mt-8 flex items-center gap-1.5">
              {heroItems.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => setHeroIndex(index)}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    index === heroIndex
                      ? 'w-8 bg-white'
                      : 'w-1 bg-white/25 hover:bg-white/40'
                  }`}
                  aria-label={`Show title ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* New user onboarding card */}
      {isNewUser && (
        <section className="rounded-3xl border border-white/8 bg-white/[0.02] p-8 sm:p-10">
          <div className="mx-auto max-w-2xl text-center">
            <BrandMark />
            <h2 className="mt-6 text-2xl font-bold text-white font-display">
              Welcome to {appBrand.name}
            </h2>
            <p className="mt-3 text-base leading-7 text-text-secondary">
              Get started by adding your first source. Sources provide movies, series, live channels, and more from the services you already use.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link to="/addons" className="btn-glow inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold">
                <Plus className="h-5 w-5" aria-hidden="true" /> Add Your First Source
              </Link>
              <Link to="/discover" className="btn-secondary inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold">
                Browse Catalog
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Getting Started sidebar-style card (inline for non-new users who aren't fully set up) */}
      {!isNewUser && !playbackReady && (
        <section className="rounded-2xl border border-white/8 bg-white/[0.02] px-6 py-5">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Finish setting up {appBrand.name}</h3>
              <p className="mt-1 text-sm leading-6 text-text-secondary">
                Add a playback source to start watching content directly in the app.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-4">
              <div className="flex items-center gap-3 text-sm">
                <span className={`inline-flex items-center gap-1.5 ${coverage.discovery > 0 ? 'text-success' : 'text-text-tertiary'}`}>
                  {coverage.discovery > 0 ? <Check className="h-3.5 w-3.5" /> : <Film className="h-3.5 w-3.5" />}
                  Discovery
                </span>
                <span className={`inline-flex items-center gap-1.5 ${coverage.playback > 0 ? 'text-success' : 'text-text-tertiary'}`}>
                  {coverage.playback > 0 ? <Check className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  Playback
                </span>
                <span className={`inline-flex items-center gap-1.5 ${coverage.captions > 0 ? 'text-success' : 'text-text-tertiary'}`}>
                  {coverage.captions > 0 ? <Check className="h-3.5 w-3.5" /> : <Subtitles className="h-3.5 w-3.5" />}
                  Captions
                </span>
              </div>
              <Link to="/addons" className="btn-primary shrink-0 rounded-full px-5 py-2 text-sm">
                <Puzzle className="h-4 w-4" aria-hidden="true" /> Add Sources
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Continue Watching */}
      {continueWatching.length > 0 && (
        <section aria-label="Continue Watching">
          <div className="mb-5 flex items-center justify-between px-1">
            <h2 className="section-title flex items-center gap-2">
              <Play className="h-5 w-5 text-accent" aria-hidden="true" /> Continue Watching
            </h2>
            <Link to="/settings" className="btn-ghost text-sm">
              History <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto px-1 pb-2 scrollbar-hide fade-edges-x sm:gap-4">
            {continueWatching.map((entry) => (
              <ContinueWatchingCard key={entry.videoId} entry={entry} />
            ))}
          </div>
        </section>
      )}

      {/* Trending Now (first catalog) */}
      {trendingCatalog && trendingCatalog.metas.length > 0 && (
        <section aria-label="Trending Now">
          <div className="mb-5 flex items-center justify-between px-1">
            <h2 className="section-title flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" aria-hidden="true" /> Trending Now
            </h2>
            <button
              onClick={() =>
                navigate(
                  `/discover/${trendingCatalog.catalogType}?catalog=${trendingCatalog.catalogId}&addon=${trendingCatalog.addonId}`,
                )
              }
              className="btn-ghost text-sm"
            >
              See All <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto px-1 pb-2 scrollbar-hide fade-edges-x sm:gap-4">
            {trendingCatalog.metas.slice(0, 20).map((meta) => (
              <PosterCard key={meta.id} meta={meta} />
            ))}
          </div>
        </section>
      )}

      {/* My List */}
      {watchlistItems.length > 0 && (
        <section aria-label="My List">
          <div className="mb-5 flex items-center justify-between px-1">
            <h2 className="section-title flex items-center gap-2">
              <Bookmark className="h-5 w-5 text-accent" aria-hidden="true" /> My List
            </h2>
            <Link to="/discover" className="btn-ghost text-sm">
              Discover More <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto px-1 pb-2 scrollbar-hide fade-edges-x sm:gap-4">
            {watchlistItems.map((item) => (
              <PosterCard
                key={item.id}
                meta={{
                  id: item.id,
                  type: item.type,
                  name: item.name,
                  poster: item.poster,
                }}
              />
            ))}
          </div>
        </section>
      )}

      {/* Live Now */}
      {liveRadar.length > 0 && (
        <section aria-label="Live Now">
          <div className="mb-5 flex items-center justify-between px-1">
            <h2 className="section-title flex items-center gap-2">
              <Radio className="h-5 w-5 text-accent" aria-hidden="true" /> Live Now
            </h2>
            <Link to="/live" className="btn-ghost text-sm">
              View All <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto px-1 pb-2 scrollbar-hide fade-edges-x sm:gap-4">
            {liveRadar.map((meta) => (
              <PosterCard key={meta.id} meta={meta} />
            ))}
          </div>
        </section>
      )}

      {/* Genre Quick Links */}
      {spotlightGenres.length > 0 && (
        <section aria-label="Browse by Genre">
          <div className="mb-5 px-1">
            <h2 className="section-title">Browse by Genre</h2>
          </div>
          <div className="flex flex-wrap gap-2 px-1">
            {spotlightGenres.map((genre) => (
              <button
                key={genre}
                onClick={() => navigate(`/discover/movie?genre=${encodeURIComponent(genre)}`)}
                className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-white/70 transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
              >
                {genre}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Remaining catalogs (skip first since it's used as Trending) */}
      {mergedCatalogs.slice(1).map((catalog) => (
        <ContentRow
          key={`${catalog.catalogType}-${catalog.catalogName}`}
          title={catalog.catalogName}
          metas={catalog.metas.slice(0, 20)}
          loading={catalog.loading}
          onSeeAll={() =>
            navigate(
              `/discover/${catalog.catalogType}?catalog=${catalog.catalogId}&addon=${catalog.addonId}`,
            )
          }
        />
      ))}

      {/* Empty state for users with addons but no catalogs loaded yet */}
      {!loading && mergedCatalogs.length === 0 && addons.length > 0 && (
        <EmptyState
          icon={<Film className="h-8 w-8" aria-hidden="true" />}
          title="No content available yet"
          description="Your sources are connected but haven't returned any catalogs. Try refreshing or check your addon configuration."
          action={(
            <Link to="/addons" className="btn-glow">
              Manage Sources
            </Link>
          )}
        />
      )}
    </div>
  );
}
