import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Film, Grid3x3, Loader2, LayoutGrid, Tv, X } from 'lucide-react';
import { EmptyState } from '../components/EmptyState';
import { PosterCard, PosterCardSkeleton } from '../components/PosterCard';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useAddonStore, useCatalogStore, useStores } from '../providers/storeHooks';

const TYPES = [
  { value: 'movie', label: 'Movies', icon: Film },
  { value: 'series', label: 'Series', icon: Tv },
] as const;

type ViewMode = 'grid' | 'compact';

export function DiscoverPage() {
  const { type: paramType } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const focusAddon = searchParams.get('addon');
  const focusCatalog = searchParams.get('catalog');
  const genreFromUrl = searchParams.get('genre') || '';
  const [activeType, setActiveType] = useState(paramType || 'movie');
  const [selectedGenre, setSelectedGenre] = useState<string>(genreFromUrl);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  useDocumentTitle(activeType === 'movie' ? 'Discover Movies' : 'Discover Series');

  const addons = useAddonStore((s) => s.addons);
  const catalogs = useCatalogStore((s) => s.catalogs);
  const loading = useCatalogStore((s) => s.loading);
  const { catalogStore } = useStores();

  useEffect(() => {
    if (paramType && paramType !== activeType) {
      setActiveType(paramType);
    }
  }, [activeType, paramType]);

  useEffect(() => {
    setSelectedGenre(genreFromUrl);
  }, [genreFromUrl]);

  useEffect(() => {
    if (addons.length > 0) {
      catalogStore.getState().loadCatalogs(addons);
    }
  }, [addons, catalogStore]);

  const filteredCatalogs = useMemo(
    () => catalogs.filter((catalog) => catalog.catalogType === activeType),
    [activeType, catalogs],
  );

  const relevantCatalogs = useMemo(() => {
    if (focusAddon && focusCatalog) {
      return filteredCatalogs.filter(
        (catalog) => catalog.addonId === focusAddon && catalog.catalogId === focusCatalog,
      );
    }
    return filteredCatalogs;
  }, [filteredCatalogs, focusAddon, focusCatalog]);

  const allMetas = useMemo(() => {
    const metas = relevantCatalogs.flatMap((catalog) => catalog.metas);
    const unique = Array.from(new Map(metas.map((meta) => [meta.id, meta])).values());

    if (selectedGenre) {
      return unique.filter((meta) =>
        meta.genres?.some((genre) => genre.toLowerCase() === selectedGenre.toLowerCase()),
      );
    }
    return unique;
  }, [relevantCatalogs, selectedGenre]);

  const genres = useMemo(() => {
    const genreSet = new Set<string>();
    filteredCatalogs.flatMap((catalog) => catalog.metas).forEach((meta) => {
      meta.genres?.forEach((genre) => genreSet.add(genre));
    });
    return Array.from(genreSet).sort();
  }, [filteredCatalogs]);

  const focusCatalogName = relevantCatalogs[0]?.catalogName;

  const handleTypeChange = (type: string) => {
    setActiveType(type);
    setSelectedGenre('');
    navigate(`/discover/${type}`, { replace: true });
  };

  const gridCols = viewMode === 'compact'
    ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10'
    : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="pt-2">
        <h1 className="text-3xl font-bold tracking-tight text-white font-display sm:text-4xl">
          {focusCatalogName || (activeType === 'movie' ? 'Movies' : 'Series')}
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Browse and discover content across all your connected sources.
        </p>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Type Toggle */}
        <div className="flex rounded-xl border border-white/8 bg-white/[0.03] p-1">
          {TYPES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => handleTypeChange(value)}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                activeType === value
                  ? 'bg-white text-slate-950 shadow-md'
                  : 'text-text-secondary hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>

        <div className="h-6 w-px bg-white/8 hidden sm:block" />

        {/* View Mode Toggle */}
        <div className="flex rounded-xl border border-white/8 bg-white/[0.03] p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`btn-icon rounded-lg ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-text-tertiary'}`}
            aria-label="Grid view"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('compact')}
            className={`btn-icon rounded-lg ${viewMode === 'compact' ? 'bg-white/10 text-white' : 'text-text-tertiary'}`}
            aria-label="Compact view"
          >
            <Grid3x3 className="h-4 w-4" />
          </button>
        </div>

        {/* Results Count */}
        <div className="ml-auto flex items-center gap-2 text-sm text-text-secondary">
          {loading && <Loader2 className="h-4 w-4 animate-spin text-accent" aria-hidden="true" />}
          <span className="font-medium text-white">{allMetas.length}</span> titles
        </div>
      </div>

      {/* Genre Chips */}
      {genres.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedGenre('')}
            className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
              selectedGenre === ''
                ? 'bg-white text-slate-950 shadow-md'
                : 'border border-white/8 bg-white/[0.03] text-text-secondary hover:border-white/14 hover:text-white'
            }`}
          >
            All
          </button>
          {genres.slice(0, 20).map((genre) => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre === selectedGenre ? '' : genre)}
              className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                selectedGenre === genre
                  ? 'bg-white text-slate-950 shadow-md'
                  : 'border border-white/8 bg-white/[0.03] text-text-secondary hover:border-white/14 hover:text-white'
              }`}
            >
              {genre}
            </button>
          ))}
          {selectedGenre && (
            <button
              onClick={() => setSelectedGenre('')}
              className="inline-flex cursor-pointer items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-text-tertiary transition-colors hover:text-white"
            >
              <X className="h-3 w-3" /> Clear filter
            </button>
          )}
        </div>
      )}

      {/* Content Grid */}
      {loading && allMetas.length === 0 ? (
        <div className={`grid gap-4 ${gridCols}`}>
          {Array.from({ length: 21 }).map((_, index) => (
            <PosterCardSkeleton key={index} fillGrid size={viewMode === 'compact' ? 'sm' : 'md'} />
          ))}
        </div>
      ) : allMetas.length > 0 ? (
        <div className={`grid gap-4 ${gridCols}`}>
          {allMetas.map((meta) => (
            <PosterCard
              key={meta.id}
              meta={meta}
              fillGrid
              size={viewMode === 'compact' ? 'sm' : 'md'}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Film className="h-8 w-8" aria-hidden="true" />}
          title={selectedGenre ? 'No matches found' : 'Nothing to discover yet'}
          description={
            selectedGenre
              ? `No ${activeType === 'movie' ? 'movies' : 'series'} match "${selectedGenre}". Try another genre.`
              : 'Install discovery sources to fill your catalog with content.'
          }
        />
      )}
    </div>
  );
}
