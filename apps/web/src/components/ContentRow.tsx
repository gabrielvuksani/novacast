import { useRef, useState } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import type { MetaPreview } from '@novacast/core';
import { PosterCard, PosterCardSkeleton } from './PosterCard';

interface ContentRowProps {
  title: string;
  metas: MetaPreview[];
  loading?: boolean;
  onSeeAll?: () => void;
}

export function ContentRow({ title, metas, loading, onSeeAll }: ContentRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  if (!loading && metas.length === 0) return null;

  const updateScrollState = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.75;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  };

  return (
    <section className="group/row mb-10" aria-label={title}>
      <div className="mb-4 flex items-center justify-between gap-3 px-1 sm:px-1 lg:px-1">
        <div>
          <h2 className="section-title text-white">{title}</h2>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-text-tertiary">
            {loading ? 'Preparing rail' : `${metas.length} picks in orbit`}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {canScrollLeft && (
            <button
              onClick={() => scroll('left')}
              className="btn-icon hidden rounded-2xl border border-white/8 bg-white/[0.03] opacity-0 transition-opacity group-hover/row:opacity-100 sm:flex"
              aria-label={`Scroll ${title} left`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          {canScrollRight && (
            <button
              onClick={() => scroll('right')}
              className="btn-icon hidden rounded-2xl border border-white/8 bg-white/[0.03] opacity-0 transition-opacity group-hover/row:opacity-100 sm:flex"
              aria-label={`Scroll ${title} right`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
          {onSeeAll && (
            <button
              onClick={onSeeAll}
              className="inline-flex items-center gap-1 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:border-white/14 hover:bg-white/[0.05] hover:text-white"
            >
              See All <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
      <div
        ref={scrollRef}
        onScroll={updateScrollState}
        className="flex gap-3 overflow-x-auto px-1 pb-2 scrollbar-hide fade-edges-x sm:gap-4"
      >
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <PosterCardSkeleton key={i} />
            ))
          : metas.map((meta) => (
              <PosterCard key={meta.id} meta={meta} />
            ))}
      </div>
    </section>
  );
}
