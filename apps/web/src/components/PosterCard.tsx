import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, Film } from 'lucide-react';
import type { MetaPreview } from '@novacast/core';

interface PosterCardProps {
  meta: MetaPreview;
  size?: 'sm' | 'md' | 'lg';
  fillGrid?: boolean;
}

const sizeClasses = {
  sm: 'w-[120px] sm:w-[130px]',
  md: 'w-[140px] sm:w-[155px]',
  lg: 'w-[160px] sm:w-[185px]',
};

export function PosterCard({ meta, size = 'md', fillGrid }: PosterCardProps) {
  const [imgError, setImgError] = useState(false);
  const genreLabel = meta.genres?.[0];

  return (
    <Link
      to={`/detail/${meta.type}/${meta.id}`}
      className={`${fillGrid ? 'w-full' : sizeClasses[size]} group block shrink-0 text-left`}
    >
      <div className="relative mb-3 aspect-[2/3] overflow-hidden rounded-[24px] border border-white/8 bg-bg-tertiary shadow-xl shadow-black/20 transition-all duration-300 group-hover:-translate-y-1 group-hover:border-white/14 group-hover:shadow-2xl group-hover:shadow-accent/10">
        {meta.poster && !imgError ? (
          <img
            src={meta.poster}
            alt={meta.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            decoding="async"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-text-tertiary gap-2">
            <Film className="w-8 h-8 opacity-30" />
            <span className="text-xs font-medium opacity-50">No Poster</span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#030611]/95 via-[#030611]/18 to-transparent opacity-90" />
        {meta.imdbRating && (
          <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full border border-black/15 bg-black/45 px-2 py-1 text-[11px] font-semibold text-rating backdrop-blur-md">
            <Star className="w-3 h-3 fill-rating text-rating" aria-hidden="true" />
            {meta.imdbRating}
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 p-3">
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">
              <span className="inline-flex rounded-full border border-white/10 bg-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80 backdrop-blur-md">
                {meta.type}
              </span>
              {genreLabel && (
                <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-white/55">{genreLabel}</p>
              )}
            </div>
            {meta.releaseInfo && (
              <span className="rounded-full bg-black/35 px-2 py-1 text-[11px] font-medium text-white/70 backdrop-blur-md">
                {meta.releaseInfo}
              </span>
            )}
          </div>
        </div>
      </div>
      <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-text-primary transition-colors duration-200 group-hover:text-white">
        {meta.name}
      </h3>
      {(meta.description || meta.releaseInfo) && (
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-text-tertiary">
          {meta.description || meta.releaseInfo}
        </p>
      )}
    </Link>
  );
}

export function PosterCardSkeleton({ size = 'md', fillGrid }: { size?: 'sm' | 'md' | 'lg'; fillGrid?: boolean }) {
  return (
    <div className={`${fillGrid ? 'w-full' : sizeClasses[size]} shrink-0`} aria-hidden="true">
      <div className="mb-3 aspect-[2/3] skeleton rounded-[24px]" />
      <div className="h-4 skeleton rounded w-3/4 mb-1.5" />
      <div className="h-3 skeleton rounded w-1/2" />
    </div>
  );
}

// Horizontal card for "Continue Watching" rows
export function ContinueWatchingCard({
  entry,
}: {
  entry: { id: string; type: string; videoId: string; name: string; poster?: string; episodeTitle?: string; currentTime: number; duration: number };
}) {
  const [imgError, setImgError] = useState(false);
  const progress = entry.duration > 0 ? (entry.currentTime / entry.duration) * 100 : 0;

  return (
    <Link
      to={`/detail/${entry.type}/${entry.id}`}
      className="group block w-[220px] shrink-0 sm:w-[260px]"
    >
      <div className="relative mb-3 aspect-video overflow-hidden rounded-[24px] border border-white/8 bg-bg-tertiary shadow-xl shadow-black/20 transition-all duration-300 group-hover:-translate-y-1 group-hover:border-white/14 group-hover:shadow-2xl group-hover:shadow-accent/10">
        {entry.poster && !imgError ? (
          <img
            src={entry.poster}
            alt={entry.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            decoding="async"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-bg-tertiary">
            <Film className="w-8 h-8 text-text-tertiary opacity-30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#030611]/95 via-[#030611]/18 to-transparent" />
        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/10">
          <div
            className="h-full bg-accent rounded-full transition-all duration-300"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <div className="absolute inset-x-0 bottom-4 px-4">
          <div className="inline-flex rounded-full border border-white/10 bg-black/35 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70 backdrop-blur-md">
            Resume
          </div>
        </div>
      </div>
      <h3 className="line-clamp-1 text-sm font-semibold text-text-primary transition-colors duration-200 group-hover:text-white">
        {entry.name}
      </h3>
      {entry.episodeTitle && (
        <p className="mt-1 line-clamp-1 text-xs text-text-tertiary">{entry.episodeTitle}</p>
      )}
    </Link>
  );
}
