import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Film,
  Loader2,
  Play,
  Puzzle,
  Share2,
  Star,
  Tv,
} from 'lucide-react';
import {
  analyzeStream,
  getStreamKey,
  summarizeAddonCoverage,
  type PlayerQueueItem,
  type PlayerSourceOption,
  type SourceAnalysis,
  type Stream,
} from '@novacast/core';
import { useToast } from '../components/Toast';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import {
  useAddonStore,
  useDetailStore,
  useStores,
  useWatchHistoryStore,
  useWatchlistStore,
} from '../providers/storeHooks';

interface SourceOption extends PlayerSourceOption {
  analysis: SourceAnalysis;
}

export function DetailPage() {
  const { type, id } = useParams<{ type: string; id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const addons = useAddonStore((s) => s.addons);
  const meta = useDetailStore((s) => s.meta);
  const streams = useDetailStore((s) => s.streams);
  const subtitles = useDetailStore((s) => s.subtitles);
  const loading = useDetailStore((s) => s.loading);
  const streamsLoading = useDetailStore((s) => s.streamsLoading);
  const streamsError = useDetailStore((s) => s.streamsError);
  const error = useDetailStore((s) => s.error);
  const watchlistItems = useWatchlistStore((s) => s.items);
  const historyEntries = useWatchHistoryStore((s) => s.entries);
  const { detailStore, playerStore, watchlistStore } = useStores();
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [expandedDescription, setExpandedDescription] = useState(false);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [sourcesExpanded, setSourcesExpanded] = useState(false);

  useDocumentTitle(meta?.name || 'Loading...');

  const coverage = useMemo(() => summarizeAddonCoverage(addons), [addons]);
  const playbackReady = coverage.playback > 0;
  const isInWatchlist = id ? watchlistItems.some((item) => item.id === id) : false;

  const seriesHistory = useMemo(
    () => historyEntries.filter((entry) => entry.id === id).sort((a, b) => b.updatedAt - a.updatedAt),
    [historyEntries, id],
  );

  const movieVideoId = meta?.behaviorHints?.defaultVideoId || id || null;
  const activeVideoId = meta?.type === 'movie' ? movieVideoId : selectedVideoId;
  const resumeEntry = useMemo(
    () => (activeVideoId ? historyEntries.find((entry) => entry.videoId === activeVideoId) : undefined),
    [activeVideoId, historyEntries],
  );

  const sourceOptions = useMemo<SourceOption[]>(() => {
    return streams
      .flatMap(({ addon, streams: addonStreams }) =>
        addonStreams.map((stream) => ({
          id: `${addon.manifest.id}:${getStreamKey(stream)}`,
          addonName: addon.manifest.name,
          stream,
          analysis: analyzeStream(stream),
        })),
      )
      .sort((left, right) => right.analysis.score - left.analysis.score);
  }, [streams]);

  const groupedSources = useMemo(
    () => ({
      playable: sourceOptions.filter((option) => option.analysis.playback === 'internal'),
      external: sourceOptions.filter((option) => option.analysis.playback === 'external'),
      unsupported: sourceOptions.filter((option) => option.analysis.playback === 'unsupported'),
    }),
    [sourceOptions],
  );

  const bestPlayableSource = groupedSources.playable[0];
  const bestExternalSource = groupedSources.external[0];
  const topSources = groupedSources.playable.slice(0, 3);
  const remainingSources = [
    ...groupedSources.playable.slice(3),
    ...groupedSources.external,
    ...groupedSources.unsupported,
  ];

  const playlist = useMemo<PlayerQueueItem[]>(() => {
    if (!meta?.videos) return [];

    return [...meta.videos]
      .sort((left, right) => {
        const seasonDelta = (left.season ?? 0) - (right.season ?? 0);
        if (seasonDelta !== 0) return seasonDelta;
        return (left.episode ?? 0) - (right.episode ?? 0);
      })
      .map((video) => ({
        videoId: video.id,
        title: video.title,
        subtitle:
          video.season != null && video.episode != null
            ? `S${String(video.season).padStart(2, '0')}E${String(video.episode).padStart(2, '0')}`
            : undefined,
        season: video.season,
        episode: video.episode,
        thumbnail: video.thumbnail,
      }));
  }, [meta?.videos]);

  const currentPlaylistIndex = useMemo(
    () => playlist.findIndex((item) => item.videoId === selectedVideoId),
    [playlist, selectedVideoId],
  );

  const seasons = useMemo(() => {
    if (!meta?.videos) return [];
    return Array.from(new Set(meta.videos.map((video) => video.season).filter((season): season is number => season != null))).sort((a, b) => a - b);
  }, [meta?.videos]);

  const episodesForSeason = meta?.videos?.filter((video) => (video.season ?? 1) === selectedSeason) || [];

  const toggleWatchlist = useCallback(() => {
    if (!meta || !id) return;

    if (isInWatchlist) {
      watchlistStore.getState().removeItem(id);
      toast.info(`Removed "${meta.name}" from watchlist`);
    } else {
      watchlistStore.getState().addItem({
        id,
        type: meta.type,
        name: meta.name,
        poster: meta.poster,
      });
      toast.success(`Added "${meta.name}" to watchlist`);
    }
  }, [id, isInWatchlist, meta, toast, watchlistStore]);

  const handleShare = useCallback(() => {
    const url = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => toast.success('Link copied to clipboard'));
    }
  }, [toast]);

  const handleLoadStreamsForVideo = useCallback(
    (videoId: string) => {
      if (!type) return;
      const nextVideo = meta?.videos?.find((video) => video.id === videoId);
      setSelectedVideoId(videoId);
      setSelectedSeason(nextVideo?.season ?? 1);
      detailStore.getState().loadStreams(addons, type, videoId);
      detailStore.getState().loadSubtitles(addons, type, videoId);
    },
    [addons, detailStore, meta?.videos, type],
  );

  const openSourceExternally = useCallback((stream: Stream) => {
    if (stream.externalUrl) {
      window.open(stream.externalUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    if (stream.ytId) {
      window.open(`https://www.youtube.com/watch?v=${stream.ytId}`, '_blank', 'noopener,noreferrer');
    }
  }, []);

  const handlePlaySource = useCallback(
    (source: SourceOption, startTime = 0) => {
      if (!meta || !type || !id) return;

      if (source.analysis.playback === 'external') {
        openSourceExternally(source.stream);
        return;
      }

      if (source.analysis.playback !== 'internal') {
        toast.info('This source is not directly playable in the browser.');
        return;
      }

      const currentVideo = meta.videos?.find((item) => item.id === activeVideoId);
      const episodeLabel = currentVideo
        ? `S${String(currentVideo.season ?? 0).padStart(2, '0')}E${String(currentVideo.episode ?? 0).padStart(2, '0')} · ${currentVideo.title}`
        : undefined;

      playerStore.getState().play({
        stream: source.stream,
        availableSources: sourceOptions.map(({ id: optionId, addonName, stream, analysis }) => ({
          id: optionId,
          addonName,
          stream,
          analysis,
        })),
        type,
        videoId: activeVideoId || id,
        metaId: id,
        title: meta.name,
        subtitle: episodeLabel,
        poster: meta.poster,
        subtitles: dedupeSubtitles([...(subtitles || []), ...(source.stream.subtitles || [])]),
        playlist,
        playlistIndex: currentPlaylistIndex,
        startTime,
      });
      navigate('/player');
    },
    [activeVideoId, currentPlaylistIndex, id, meta, navigate, openSourceExternally, playerStore, playlist, sourceOptions, subtitles, toast, type],
  );

  useEffect(() => {
    setSelectedSeason(1);
    setExpandedDescription(false);
    setSelectedVideoId(null);

    if (type && id) {
      detailStore.getState().loadMeta(addons, type, id);
    }

    return () => {
      detailStore.getState().clear();
    };
  }, [addons, detailStore, id, type]);

  useEffect(() => {
    if (!meta || !type || !id) return;

    if (meta.type === 'movie') {
      const videoId = meta.behaviorHints?.defaultVideoId || id;
      detailStore.getState().loadStreams(addons, type, videoId);
      detailStore.getState().loadSubtitles(addons, type, videoId);
      return;
    }

    if (meta.videos && meta.videos.length > 0) {
      const resumeVideo = seriesHistory[0]?.videoId
        ? meta.videos.find((video) => video.id === seriesHistory[0]?.videoId)
        : undefined;
      const fallback = meta.videos.find((video) => video.season === 1 && video.episode === 1) || meta.videos[0];
      const targetVideo = resumeVideo || fallback;

      setSelectedVideoId(targetVideo.id);
      setSelectedSeason(targetVideo.season ?? 1);
      detailStore.getState().loadStreams(addons, type, targetVideo.id);
      detailStore.getState().loadSubtitles(addons, type, targetVideo.id);
    }
  }, [addons, detailStore, id, meta, seriesHistory, type]);

  // --- Loading skeleton ---
  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="relative h-[70vh] min-h-[480px] max-h-[720px]">
          <div className="absolute inset-0 skeleton" />
          <div className="absolute bottom-0 left-0 right-0 p-8 sm:p-12">
            <div className="h-10 w-80 rounded skeleton mb-4" />
            <div className="h-5 w-48 rounded skeleton mb-6" />
            <div className="h-14 w-44 rounded-2xl skeleton" />
          </div>
        </div>
        <div className="px-6 sm:px-10 mt-8 space-y-4">
          <div className="h-5 w-full max-w-2xl rounded skeleton" />
          <div className="h-5 w-full max-w-xl rounded skeleton" />
        </div>
      </div>
    );
  }

  // --- Error state ---
  if (error || !meta) {
    return (
      <EmptyDetailState
        title="Content not found"
        description={error || 'Unable to load content details from your current sources.'}
        action={
          <button onClick={() => navigate(-1)} className="btn-secondary">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Go back
          </button>
        }
      />
    );
  }

  const heroImage = meta.background || meta.poster;

  return (
    <div className="animate-fade-in pb-16">
      {/* ================================================================
          CINEMATIC HERO BANNER
          ================================================================ */}
      <section className="relative h-[70vh] min-h-[480px] max-h-[720px] -mx-6 sm:-mx-8 -mt-6 sm:-mt-8 overflow-hidden">
        {/* Backdrop image */}
        {heroImage && (
          <img
            src={heroImage}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-top"
          />
        )}

        {/* Gradient overlays for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-bg-primary/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-bg-primary/90 via-bg-primary/40 to-transparent" />

        {/* Top navigation */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-5 sm:p-8">
          <button onClick={() => navigate(-1)} className="btn-secondary backdrop-blur-xl !py-2.5 !px-4 text-sm">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
          </button>
        </div>

        {/* Hero content overlay */}
        <div className="absolute bottom-0 left-0 right-0 z-10 px-6 sm:px-10 lg:px-14 pb-10 sm:pb-14">
          <div className="max-w-4xl">
            {/* Type badge */}
            <div className="flex items-center gap-2 mb-4">
              {meta.type === 'series' ? (
                <span className="badge"><Tv className="h-3 w-3" aria-hidden="true" /> Series</span>
              ) : (
                <span className="badge"><Film className="h-3 w-3" aria-hidden="true" /> Movie</span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] text-white font-display tracking-tight drop-shadow-lg">
              {meta.name}
            </h1>

            {/* Metadata row */}
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/70">
              {meta.imdbRating && (
                <span className="inline-flex items-center gap-1.5 font-semibold text-rating">
                  <Star className="h-4 w-4 fill-rating text-rating" aria-hidden="true" />
                  {meta.imdbRating}
                </span>
              )}
              {meta.releaseInfo && (
                <span>{meta.releaseInfo}</span>
              )}
              {meta.runtime && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  {meta.runtime}
                </span>
              )}
              {meta.imdbRating && <span className="text-white/30">|</span>}
              {meta.genres && meta.genres.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {meta.genres.map((genre) => (
                    <span
                      key={genre}
                      className="rounded-full border border-white/15 bg-white/10 px-3 py-0.5 text-xs font-medium text-white/80 backdrop-blur-sm"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Action buttons row */}
            <div className="mt-7 flex flex-wrap items-center gap-3">
              {/* Primary play button */}
              {bestPlayableSource && (
                <button
                  onClick={() => handlePlaySource(bestPlayableSource, resumeEntry?.currentTime || 0)}
                  className="btn-primary !text-base !px-8 !py-4"
                >
                  <Play className="h-5 w-5 fill-current" aria-hidden="true" />
                  {resumeEntry && resumeEntry.currentTime > 0
                    ? `Resume from ${formatTime(resumeEntry.currentTime)}`
                    : 'Play'}
                </button>
              )}
              {!bestPlayableSource && bestExternalSource && (
                <button
                  onClick={() => openSourceExternally(bestExternalSource.stream)}
                  className="btn-primary !text-base !px-8 !py-4"
                >
                  <ExternalLink className="h-5 w-5" aria-hidden="true" /> Open externally
                </button>
              )}
              {!bestPlayableSource && !bestExternalSource && !streamsLoading && (
                <Link to="/addons" className="btn-primary !text-base !px-8 !py-4">
                  <Puzzle className="h-5 w-5" aria-hidden="true" /> Setup playback
                </Link>
              )}
              {streamsLoading && !bestPlayableSource && !bestExternalSource && (
                <div className="btn-secondary !text-base !px-8 !py-4 pointer-events-none">
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Loading sources...
                </div>
              )}

              {/* Watchlist button */}
              <button
                onClick={toggleWatchlist}
                className="btn-secondary !py-3.5 !px-5"
                aria-label={isInWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
              >
                {isInWatchlist ? (
                  <BookmarkCheck className="h-5 w-5 text-accent" aria-hidden="true" />
                ) : (
                  <Bookmark className="h-5 w-5" aria-hidden="true" />
                )}
                <span className="hidden sm:inline">{isInWatchlist ? 'In Watchlist' : 'Watchlist'}</span>
              </button>

              {/* Share button */}
              <button onClick={handleShare} className="btn-secondary !py-3.5 !px-5" aria-label="Share">
                <Share2 className="h-5 w-5" aria-hidden="true" />
                <span className="hidden sm:inline">Share</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          CONTENT BODY
          ================================================================ */}
      <div className="px-6 sm:px-10 lg:px-14 mt-8 space-y-10">
        {/* ── Description & Cast ── */}
        <section className="max-w-4xl">
          {meta.description && (
            <div>
              <p className={`text-[15px] leading-7 text-white/75 ${expandedDescription ? '' : 'line-clamp-3'}`}>
                {meta.description}
              </p>
              {meta.description.length > 180 && (
                <button
                  onClick={() => setExpandedDescription((v) => !v)}
                  className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-text-accent hover:text-white transition-colors"
                >
                  {expandedDescription ? (
                    <>Show less <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" /></>
                  ) : (
                    <>Show more <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" /></>
                  )}
                </button>
              )}
            </div>
          )}

          {(meta.director || meta.cast) && (
            <div className="mt-6 space-y-3 text-sm leading-6">
              {meta.director && meta.director.length > 0 && (
                <p>
                  <span className="text-text-tertiary">Director </span>
                  <span className="text-white/80">{meta.director.join(', ')}</span>
                </p>
              )}
              {meta.cast && meta.cast.length > 0 && (
                <p>
                  <span className="text-text-tertiary">Cast </span>
                  <span className="text-white/80">{meta.cast.slice(0, 8).join(', ')}</span>
                </p>
              )}
            </div>
          )}
        </section>

        {/* ================================================================
            SEASON / EPISODE BROWSER (series only)
            ================================================================ */}
        {meta.type === 'series' && seasons.length > 0 && (
          <section>
            <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
              <h2 className="section-title">Episodes</h2>
              {/* Season selector */}
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {seasons.map((season) => (
                  <button
                    key={season}
                    onClick={() => setSelectedSeason(season)}
                    className={`shrink-0 cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                      selectedSeason === season
                        ? 'bg-white text-bg-primary shadow-lg shadow-white/10'
                        : 'border border-white/10 bg-white/[0.04] text-text-secondary hover:bg-white/[0.08] hover:text-white'
                    }`}
                  >
                    Season {season}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3">
              {episodesForSeason.map((episode) => {
                const progress = historyEntries.find((entry) => entry.videoId === episode.id);
                const isSelected = selectedVideoId === episode.id;
                const progressPct =
                  progress && progress.duration > 0
                    ? Math.min((progress.currentTime / progress.duration) * 100, 100)
                    : 0;

                return (
                  <button
                    key={episode.id}
                    onClick={() => handleLoadStreamsForVideo(episode.id)}
                    className={`group flex w-full cursor-pointer items-center gap-4 rounded-2xl border px-4 py-3 text-left transition-all ${
                      isSelected
                        ? 'border-accent/30 bg-accent/[0.06]'
                        : 'border-white/6 bg-white/[0.02] hover:border-white/12 hover:bg-white/[0.04]'
                    }`}
                  >
                    {/* Episode thumbnail */}
                    <div className="relative shrink-0 h-[72px] w-[128px] overflow-hidden rounded-xl bg-white/[0.04]">
                      {episode.thumbnail ? (
                        <img src={episode.thumbnail} alt={episode.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Play className="h-5 w-5 text-text-tertiary" aria-hidden="true" />
                        </div>
                      )}
                      {/* Play overlay on hover */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90">
                          <Play className="h-4 w-4 fill-bg-primary text-bg-primary ml-0.5" aria-hidden="true" />
                        </div>
                      </div>
                      {/* Progress bar at bottom of thumbnail */}
                      {progressPct > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                          <div className="h-full bg-accent" style={{ width: `${progressPct}%` }} />
                        </div>
                      )}
                    </div>

                    {/* Episode info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-white truncate">
                          {episode.episode != null ? `${episode.episode}. ` : ''}
                          {episode.title}
                        </p>
                        {progress && progress.currentTime > 0 && (
                          <span className="shrink-0 text-[11px] font-medium text-accent">
                            {formatTime(progress.currentTime)}
                          </span>
                        )}
                      </div>
                      {episode.overview && (
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-text-tertiary">
                          {episode.overview}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* ================================================================
            SOURCE SELECTION
            ================================================================ */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="section-title">Sources</h2>
              <p className="mt-1 text-sm text-text-secondary">
                {sourceOptions.length} source{sourceOptions.length !== 1 ? 's' : ''} found
                {streamsLoading && ' (still loading...)'}
              </p>
            </div>
            {streamsLoading && (
              <div className="inline-flex items-center gap-2 text-sm text-text-secondary">
                <Loader2 className="h-4 w-4 animate-spin text-accent" aria-hidden="true" /> Searching addons...
              </div>
            )}
          </div>

          {/* Best match sources */}
          {topSources.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-accent/70 mb-3">Best match</p>
              <div className="space-y-2">
                {topSources.map((item, idx) => (
                  <SourceRow
                    key={item.id}
                    item={item}
                    rank={idx + 1}
                    onPlay={handlePlaySource}
                    resumeTime={resumeEntry?.currentTime}
                    isBest={idx === 0}
                  />
                ))}
              </div>
            </div>
          )}

          {/* All other sources */}
          {remainingSources.length > 0 && (
            <div>
              <button
                onClick={() => setSourcesExpanded((v) => !v)}
                className="flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-white transition-colors cursor-pointer mb-3"
              >
                {sourcesExpanded ? (
                  <>Hide {remainingSources.length} more source{remainingSources.length !== 1 ? 's' : ''} <ChevronUp className="h-3.5 w-3.5" /></>
                ) : (
                  <>Show {remainingSources.length} more source{remainingSources.length !== 1 ? 's' : ''} <ChevronDown className="h-3.5 w-3.5" /></>
                )}
              </button>
              {sourcesExpanded && (
                <div className="space-y-2 animate-fade-in">
                  {remainingSources.map((item) => (
                    <SourceRow key={item.id} item={item} onPlay={handlePlaySource} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* No sources state */}
          {!streamsLoading && sourceOptions.length === 0 && streamsError && (
            <EmptyDetailState
              title={playbackReady ? 'No sources found' : 'Playback addons missing'}
              description={streamsError}
              action={
                <Link to="/addons" className="btn-primary">
                  <Puzzle className="h-4 w-4" aria-hidden="true" /> Manage addons
                </Link>
              }
            />
          )}
        </section>

        {/* ================================================================
            MORE LIKE THIS (placeholder)
            ================================================================ */}
        <section>
          <h2 className="section-title mb-5">More Like This</h2>
          <div className="rounded-2xl border border-white/6 bg-white/[0.02] px-6 py-12 text-center">
            <p className="text-sm text-text-tertiary">
              Similar content recommendations will appear here.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SourceRow - compact inline source card
   ══════════════════════════════════════════════════════════════════ */

function SourceRow({
  item,
  rank,
  onPlay,
  resumeTime,
  isBest,
}: {
  item: SourceOption;
  rank?: number;
  onPlay: (source: SourceOption, startTime?: number) => void;
  resumeTime?: number;
  isBest?: boolean;
}) {
  const actionable = item.analysis.playback !== 'unsupported';
  const isExternal = item.analysis.playback === 'external';

  const playbackBadge =
    item.analysis.playback === 'internal'
      ? 'Playable'
      : item.analysis.playback === 'external'
        ? 'External'
        : 'Unsupported';

  const playbackBadgeClass =
    item.analysis.playback === 'internal'
      ? 'badge-success'
      : item.analysis.playback === 'external'
        ? 'badge-warning'
        : 'badge-neutral';

  return (
    <button
      onClick={() => actionable && onPlay(item, isBest && resumeTime ? resumeTime : 0)}
      disabled={!actionable}
      className={`flex w-full items-center gap-4 rounded-xl border px-4 py-3 text-left transition-all ${
        isBest
          ? 'border-accent/20 bg-accent/[0.04] hover:bg-accent/[0.08]'
          : 'border-white/6 bg-white/[0.02] hover:border-white/12 hover:bg-white/[0.04]'
      } disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {/* Rank number or icon */}
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
        isBest ? 'bg-accent/15 text-accent' : 'bg-white/[0.05] text-text-tertiary'
      }`}>
        {rank ? `#${rank}` : isExternal ? <ExternalLink className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </div>

      {/* Source info */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-white truncate">{item.analysis.primaryLabel}</p>
          <span className={playbackBadgeClass}>{playbackBadge}</span>
          {item.analysis.badges.map((badge) => (
            <span key={badge} className="badge-neutral">{badge}</span>
          ))}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-tertiary">
          <span>{item.addonName}</span>
          {item.analysis.secondaryLabel && <span>{item.analysis.secondaryLabel}</span>}
          {item.analysis.sizeLabel && <span>{item.analysis.sizeLabel}</span>}
        </div>
        {item.analysis.warnings.length > 0 && (
          <p className="mt-1.5 text-xs text-warning truncate">
            {item.analysis.warnings[0]}
          </p>
        )}
      </div>

      {/* Play icon hint */}
      {actionable && (
        <div className="shrink-0 text-text-tertiary group-hover:text-white transition-colors">
          {isExternal ? (
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Play className="h-4 w-4" aria-hidden="true" />
          )}
        </div>
      )}
    </button>
  );
}

/* ══════════════════════════════════════════════════════════════════
   EmptyDetailState
   ══════════════════════════════════════════════════════════════════ */

function EmptyDetailState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[28px] border border-white/8 bg-white/[0.03] px-6 py-16 text-center shadow-xl shadow-black/20">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-white/[0.05] text-text-accent">
        <AlertCircle className="h-7 w-7" aria-hidden="true" />
      </div>
      <h2 className="text-xl font-semibold text-white font-display">{title}</h2>
      <p className="mt-2 max-w-lg text-sm leading-6 text-text-secondary">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Utilities
   ══════════════════════════════════════════════════════════════════ */

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function dedupeSubtitles(items: Array<{ id: string; url: string; lang: string }>) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.url}::${item.lang}`;
    if (!item.url || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
