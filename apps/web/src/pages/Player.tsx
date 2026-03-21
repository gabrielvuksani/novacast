import { type CSSProperties, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  analyzeStream,
  addonTransportClient,
  filterAddonsForResource,
  getStreamKey,
} from '@novacast/core';
import {
  AlertTriangle,
  ArrowLeft,
  Cast,
  Check,
  ChevronRight,
  Gauge,
  Keyboard,
  Languages,
  Layers,
  Loader2,
  Maximize,
  Minimize,
  MonitorPlay,
  Pause,
  PictureInPicture2,
  Play,
  Radio,
  Settings,
  SkipBack,
  SkipForward,
  Subtitles,
  Type,
  Volume1,
  Volume2,
  VolumeX,
  X,
  RotateCcw,
  FastForward,
  Rewind,
  ZapOff,
} from 'lucide-react';
import Hls from 'hls.js';
import * as dashjs from 'dashjs';
import { useToast } from '../components/Toast';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useWakeLock } from '../hooks/useWakeLock';
import { useAddonStore, usePlayerStore, useSettingsStore, useStores } from '../providers/storeHooks';

const PLAYBACK_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const CAPTION_SCALES = [0.85, 1, 1.15, 1.3];
const SKIP_INTRO_WINDOW = 120;
const AMBIENT_BLUR = 60;
const AMBIENT_OPACITY = 0.55;

type SettingsPanel = 'main' | 'quality' | 'speed' | 'subtitles' | 'audio' | 'display' | 'source' | null;

interface AudioOption {
  index: number;
  label: string;
  lang?: string;
}

interface SubtitleOption {
  id: string;
  url: string;
  lang: string;
  label: string;
}

type RemotePlaybackStatus = 'unsupported' | 'disconnected' | 'connecting' | 'connected';

interface DoubleTapFeedback {
  side: 'left' | 'right';
  seconds: number;
  key: number;
}

function dedupeSubtitles(items: Array<{ id: string; url: string; lang: string }>): SubtitleOption[] {
  const seen = new Set<string>();

  return items
    .filter((item) => item.url)
    .map((item) => ({
      id: item.id || item.url,
      url: item.url,
      lang: item.lang || 'und',
      label: getLanguageLabel(item.lang || 'und'),
    }))
    .filter((item) => {
      const key = `${item.url}::${item.lang}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

function getLanguageLabel(code: string): string {
  const normalized = code || 'und';
  try {
    return new Intl.DisplayNames(['en'], { type: 'language' }).of(normalized) || normalized.toUpperCase();
  } catch {
    return normalized.toUpperCase();
  }
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return 'LIVE';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function getStreamFormat(url: string | null): 'hls' | 'dash' | 'file' | 'unknown' {
  if (!url) return 'unknown';
  if (/\.m3u8($|\?)/i.test(url)) return 'hls';
  if (/\.mpd($|\?)/i.test(url)) return 'dash';
  if (/\.(mp4|webm|mkv|mov)($|\?)/i.test(url)) return 'file';
  return 'unknown';
}

function isLikelyLiveStream(name?: string, description?: string, url?: string | null) {
  return /live|channel|24\/7|sports/i.test(`${name ?? ''} ${description ?? ''} ${url ?? ''}`);
}

function matchesPreferredQuality(label: string, preferredQuality: string) {
  if (preferredQuality === 'auto') return false;
  if (preferredQuality === '4k') return /2160|4k/i.test(label);
  return label.toLowerCase().startsWith(preferredQuality.toLowerCase());
}

function getNextPlayableSource(
  sources: Array<{ id: string; analysis: ReturnType<typeof analyzeStream>; addonName: string; stream: NonNullable<unknown> }>,
  currentSourceId: string | null,
  excludeIds: Set<string>,
) {
  return sources.find(
    (item) => item.analysis.playback === 'internal' && item.id !== currentSourceId && !excludeIds.has(item.id),
  ) || null;
}

function throttle<T extends (...args: never[]) => void>(fn: T, ms: number): T {
  let last = 0;
  return ((...args: Parameters<T>) => {
    const now = Date.now();
    if (now - last >= ms) {
      last = now;
      fn(...args);
    }
  }) as T;
}

export function PlayerPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const seekBarRef = useRef<HTMLDivElement>(null);
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressSaveInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const dashRef = useRef<any>(null);
  const resumeStartTimeRef = useRef(0);
  const attemptedSourceIdsRef = useRef<Set<string>>(new Set());
  const bufferingStartedAtRef = useRef<number | null>(null);
  const ambientCanvasRef = useRef<HTMLCanvasElement>(null);
  const ambientRafRef = useRef<number>(0);
  const lastTapRef = useRef<{ time: number; x: number }>({ time: 0, x: 0 });
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressActiveRef = useRef(false);
  const volumeGestureRef = useRef<{ startY: number; startVolume: number } | null>(null);

  const stream = usePlayerStore((s) => s.stream);
  const playbackType = usePlayerStore((s) => s.type);
  const metaId = usePlayerStore((s) => s.metaId);
  const videoId = usePlayerStore((s) => s.videoId);
  const title = usePlayerStore((s) => s.title);
  const subtitle = usePlayerStore((s) => s.subtitle);
  const poster = usePlayerStore((s) => s.poster);
  const availableSources = usePlayerStore((s) => s.availableSources);
  const playlist = usePlayerStore((s) => s.playlist);
  const playlistIndex = usePlayerStore((s) => s.playlistIndex);
  const initialStartTime = usePlayerStore((s) => s.initialStartTime);
  const paused = usePlayerStore((s) => s.paused);
  const volume = usePlayerStore((s) => s.volume);
  const muted = usePlayerStore((s) => s.muted);
  const buffering = usePlayerStore((s) => s.buffering);
  const playerError = usePlayerStore((s) => s.error);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const buffered = usePlayerStore((s) => s.buffered);
  const playbackRate = usePlayerStore((s) => s.playbackRate);
  const qualityLevels = usePlayerStore((s) => s.qualityLevels);
  const currentQuality = usePlayerStore((s) => s.currentQuality);
  const isPiP = usePlayerStore((s) => s.isPiP);
  const selectedSubtitleId = usePlayerStore((s) => s.selectedSubtitleId);
  const storeSubtitles = usePlayerStore((s) => s.subtitles);
  const settings = useSettingsStore((s) => s.settings);
  const addons = useAddonStore((s) => s.addons);
  const { playerStore, historyStore, settingsStore } = useStores();

  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [settingsPanel, setSettingsPanel] = useState<SettingsPanel>(null);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [hoverTime, setHoverTime] = useState<{ time: number; x: number } | null>(null);
  const [audioTracks, setAudioTracks] = useState<AudioOption[]>([]);
  const [currentAudioTrack, setCurrentAudioTrack] = useState<number>(-1);
  const [bandwidthEstimate, setBandwidthEstimate] = useState<number | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [liveEdgePosition, setLiveEdgePosition] = useState<number | null>(null);
  const [captionScale, setCaptionScale] = useState(settings.defaultCaptionScale);
  const [showUpNext, setShowUpNext] = useState(false);
  const [upNextCountdown, setUpNextCountdown] = useState<number | null>(null);
  const [switchingQueueItem, setSwitchingQueueItem] = useState(false);
  const [recoveringSourceId, setRecoveringSourceId] = useState<string | null>(null);
  const [remotePlaybackAvailable, setRemotePlaybackAvailable] = useState(false);
  const [remotePlaybackState, setRemotePlaybackState] = useState<RemotePlaybackStatus>('unsupported');
  const [showSkipIntro, setShowSkipIntro] = useState(true);
  const [skipIntroDismissed, setSkipIntroDismissed] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [doubleTapFeedback, setDoubleTapFeedback] = useState<DoubleTapFeedback | null>(null);
  const [longPressSpeed, setLongPressSpeed] = useState(false);
  const [ambientEnabled, setAmbientEnabled] = useState(true);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekDragProgress, setSeekDragProgress] = useState<number | null>(null);

  const streamUrl = stream?.url || null;
  const mediaFormat = getStreamFormat(streamUrl);
  const subtitleOptions = useMemo(
    () => dedupeSubtitles([...(storeSubtitles || []), ...(stream?.subtitles || [])]),
    [storeSubtitles, stream?.subtitles],
  );
  const isLivePlayback = isLive || !Number.isFinite(duration) || isLikelyLiveStream(stream?.name, stream?.description, streamUrl);
  const safeDuration = Number.isFinite(duration) ? duration : 0;
  const displayProgress = seekDragProgress !== null ? seekDragProgress : (safeDuration > 0 ? (currentTime / safeDuration) * 100 : 0);
  const bufferedProgress = safeDuration > 0 ? (buffered / safeDuration) * 100 : 0;
  const selectedSubtitleLabel = selectedSubtitleId
    ? subtitleOptions.find((item) => item.id === selectedSubtitleId)?.label || 'Custom'
    : 'Off';
  const containerStyle = {
    cursor: showControls ? 'default' : 'none',
    ['--cue-scale' as '--cue-scale']: String(captionScale),
  } as CSSProperties;
  const normalizedSources = useMemo(
    () =>
      availableSources.map((item) => ({
        ...item,
        analysis: item.analysis || analyzeStream(item.stream),
      })),
    [availableSources],
  );
  const currentSourceKey = stream ? getStreamKey(stream) : null;
  const currentSource = normalizedSources.find((item) => getStreamKey(item.stream) === currentSourceKey) || null;
  const hasMultipleSources = normalizedSources.length > 1;
  const fallbackSource = getNextPlayableSource(normalizedSources as never, currentSource?.id || null, attemptedSourceIdsRef.current);
  const nextQueueItem = playlistIndex >= 0 ? playlist[playlistIndex + 1] || null : null;
  const previousQueueItem = playlistIndex > 0 ? playlist[playlistIndex - 1] || null : null;
  const wakeLock = useWakeLock(Boolean(settings.keepScreenAwake && !paused && !buffering && !playerError));
  const canShowSkipIntro = showSkipIntro && !skipIntroDismissed && currentTime < SKIP_INTRO_WINDOW && currentTime > 3 && !isLivePlayback;

  useDocumentTitle(title ? `${title}` : 'Player');

  // --- Ambient mode: sample video colors onto a blurred canvas behind the player ---
  useEffect(() => {
    if (!ambientEnabled) return;
    const video = videoRef.current;
    const canvas = ambientCanvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: false });
    if (!ctx) return;

    let running = true;

    const draw = () => {
      if (!running) return;
      if (!video.paused && !video.ended && video.readyState >= 2) {
        canvas.width = 16;
        canvas.height = 9;
        ctx.drawImage(video, 0, 0, 16, 9);
      }
      ambientRafRef.current = requestAnimationFrame(draw);
    };

    ambientRafRef.current = requestAnimationFrame(draw);

    return () => {
      running = false;
      cancelAnimationFrame(ambientRafRef.current);
    };
  }, [ambientEnabled, streamUrl]);

  const clearPlaybackEngines = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (dashRef.current) {
      dashRef.current.reset();
      dashRef.current = null;
    }
  }, []);

  const saveProgress = useCallback(() => {
    const state = playerStore.getState();
    if (!state.stream || !state.metaId || !state.videoId || !state.type) return;
    if (!Number.isFinite(state.duration) || state.duration <= 0) return;

    historyStore.getState().updateProgress({
      id: state.metaId,
      type: state.type,
      videoId: state.videoId,
      name: state.title || '',
      poster: state.poster || undefined,
      episodeTitle: state.subtitle || undefined,
      currentTime: state.currentTime,
      duration: state.duration,
    });
  }, [historyStore, playerStore]);

  const handleBack = useCallback(() => {
    saveProgress();
    playerStore.getState().stop();
    navigate(-1);
  }, [navigate, playerStore, saveProgress]);

  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimer.current) {
      clearTimeout(hideControlsTimer.current);
    }
    hideControlsTimer.current = setTimeout(() => {
      if (!paused && !settingsPanel) {
        setShowControls(false);
      }
    }, 3000);
  }, [paused, settingsPanel]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      void video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }, []);

  const seek = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video || isLivePlayback) return;
    video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + seconds));
  }, [isLivePlayback]);

  const seekToLiveEdge = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (liveEdgePosition != null) {
      video.currentTime = liveEdgePosition;
      return;
    }

    if (Number.isFinite(video.duration)) {
      video.currentTime = video.duration;
    }
  }, [liveEdgePosition]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void containerRef.current.requestFullscreen();
    }
  }, []);

  const toggleTheaterMode = useCallback(() => {
    if (document.fullscreenElement) return;
    setIsTheaterMode((prev) => !prev);
  }, []);

  const togglePiP = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
      }
    } catch {
      // PiP not available or denied.
    }
  }, []);

  const toggleRemotePlayback = useCallback(async () => {
    const video = videoRef.current as (HTMLVideoElement & {
      remote?: { prompt?: () => Promise<void> };
    }) | null;
    if (!video?.remote?.prompt) return;

    try {
      await video.remote.prompt();
    } catch {
      // Remote playback prompt was dismissed or unsupported by the source/device.
    }
  }, []);

  const cyclePlaybackRate = useCallback((direction: number) => {
    const currentIndex = PLAYBACK_RATES.indexOf(playbackRate);
    const nextIndex = Math.max(0, Math.min(PLAYBACK_RATES.length - 1, currentIndex + direction));
    const nextRate = PLAYBACK_RATES[nextIndex];

    if (videoRef.current) {
      videoRef.current.playbackRate = nextRate;
    }
    playerStore.getState().setPlaybackRate(nextRate);
  }, [playbackRate, playerStore]);

  const cycleSubtitles = useCallback(() => {
    if (subtitleOptions.length === 0) return;

    const currentIndex = selectedSubtitleId
      ? subtitleOptions.findIndex((item) => item.id === selectedSubtitleId)
      : -1;
    const nextIndex = currentIndex >= subtitleOptions.length - 1 ? -1 : currentIndex + 1;
    playerStore.getState().selectSubtitle(nextIndex === -1 ? null : subtitleOptions[nextIndex].id);
  }, [playerStore, selectedSubtitleId, subtitleOptions]);

  const handleSeekBarClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (isLivePlayback) return;
    const video = videoRef.current;
    const bar = seekBarRef.current;
    if (!video || !bar) return;

    const rect = bar.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    video.currentTime = fraction * (video.duration || 0);
    setSeekDragProgress(null);
    setIsSeeking(false);
  }, [isLivePlayback]);

  const handleSeekBarHover = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (isLivePlayback) return;
    const bar = seekBarRef.current;
    if (!bar) return;

    const rect = bar.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    setHoverTime({
      time: fraction * (safeDuration || 0),
      x: event.clientX - rect.left,
    });
  }, [isLivePlayback, safeDuration]);

  const handleSeekBarMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (isLivePlayback) return;
    const bar = seekBarRef.current;
    if (!bar) return;
    event.preventDefault();
    setIsSeeking(true);

    const rect = bar.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    setSeekDragProgress(fraction * 100);

    const onMouseMove = (moveEvent: MouseEvent) => {
      const r = bar.getBoundingClientRect();
      const f = Math.max(0, Math.min(1, (moveEvent.clientX - r.left) / r.width));
      setSeekDragProgress(f * 100);
      setHoverTime({ time: f * (safeDuration || 0), x: moveEvent.clientX - r.left });
    };

    const onMouseUp = (upEvent: MouseEvent) => {
      const r = bar.getBoundingClientRect();
      const f = Math.max(0, Math.min(1, (upEvent.clientX - r.left) / r.width));
      const video = videoRef.current;
      if (video) {
        video.currentTime = f * (video.duration || 0);
      }
      setSeekDragProgress(null);
      setIsSeeking(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [isLivePlayback, safeDuration]);

  const handleQualityChange = useCallback((levelIndex: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex;
      playerStore.getState().setCurrentQuality(levelIndex);
    }

    if (dashRef.current) {
      if (levelIndex === -1) {
        dashRef.current.updateSettings({ streaming: { abr: { autoSwitchBitrate: { video: true } } } });
      } else {
        dashRef.current.updateSettings({ streaming: { abr: { autoSwitchBitrate: { video: false } } } });
        dashRef.current.setQualityFor?.('video', levelIndex);
      }
      playerStore.getState().setCurrentQuality(levelIndex);
    }

    setSettingsPanel(null);
  }, [playerStore]);

  const handleSpeedChange = useCallback((rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
    playerStore.getState().setPlaybackRate(rate);
    setSettingsPanel(null);
  }, [playerStore]);

  const handleAudioTrackChange = useCallback((trackIndex: number) => {
    if (hlsRef.current) {
      hlsRef.current.audioTrack = trackIndex;
    }

    if (dashRef.current) {
      const nextTrack = dashRef.current.getTracksFor?.('audio')?.[trackIndex];
      if (nextTrack) {
        dashRef.current.setCurrentTrack?.(nextTrack);
      }
    }

    setCurrentAudioTrack(trackIndex);
    setSettingsPanel(null);
  }, []);

  const handleSubtitleChange = useCallback((subtitleId: string | null) => {
    playerStore.getState().selectSubtitle(subtitleId);
    setSettingsPanel(null);
  }, [playerStore]);

  const handleVolumeChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const nextVolume = Number(event.target.value);
    playerStore.getState().setVolume(nextVolume);
    if (nextVolume > 0 && muted) {
      playerStore.getState().setMuted(false);
    }
  }, [muted, playerStore]);

  const toggleMute = useCallback(() => {
    playerStore.getState().setMuted(!muted);
  }, [muted, playerStore]);

  const closeUpNext = useCallback(() => {
    setShowUpNext(false);
    setUpNextCountdown(null);
  }, []);

  const handleCaptionScaleChange = useCallback((scale: number) => {
    setCaptionScale(scale);
    settingsStore.getState().updateSettings({ defaultCaptionScale: scale });
    setSettingsPanel(null);
  }, [settingsStore]);

  const handleSkipIntro = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.min(SKIP_INTRO_WINDOW, video.duration || SKIP_INTRO_WINDOW);
    setSkipIntroDismissed(true);
  }, []);

  const switchToSource = useCallback((
    nextSource: (typeof normalizedSources)[number],
    options?: { startTime?: number; toastMessage?: string; silent?: boolean },
  ) => {
    if (!stream || !playbackType || !metaId || !videoId) return false;

    if (nextSource.analysis.playback === 'external') {
      if (nextSource.stream.externalUrl) {
        window.open(nextSource.stream.externalUrl, '_blank', 'noopener,noreferrer');
      } else if (nextSource.stream.ytId) {
        window.open(`https://www.youtube.com/watch?v=${nextSource.stream.ytId}`, '_blank', 'noopener,noreferrer');
      }
      return true;
    }

    if (nextSource.analysis.playback !== 'internal') {
      toast.info('That source is not directly playable in the browser.');
      return false;
    }

    setRecoveringSourceId(nextSource.id);
    playerStore.getState().setError(null);
    playerStore.getState().play({
      stream: nextSource.stream,
      availableSources: normalizedSources,
      type: playbackType,
      videoId,
      metaId,
      title: title || 'NovaCast',
      subtitle: subtitle || undefined,
      poster: poster || undefined,
      subtitles: dedupeSubtitles([...(storeSubtitles || []), ...(nextSource.stream.subtitles || [])]),
      playlist,
      playlistIndex,
      startTime: options?.startTime ?? (videoRef.current?.currentTime ?? currentTime),
    });

    if (!options?.silent) {
      toast.success(options?.toastMessage || `Switched to ${nextSource.addonName}`);
    }

    setSettingsPanel(null);
    return true;
  }, [currentTime, metaId, normalizedSources, playbackType, playerStore, playlist, playlistIndex, poster, storeSubtitles, stream, subtitle, title, toast, videoId]);

  const attemptSourceFailover = useCallback((reason: string) => {
    if (!settings.autoSourceFailover || !hasMultipleSources || !currentSource) return false;

    attemptedSourceIdsRef.current.add(currentSource.id);
    const nextSource = getNextPlayableSource(normalizedSources as never, currentSource.id, attemptedSourceIdsRef.current);
    if (!nextSource) return false;

    return switchToSource(nextSource as (typeof normalizedSources)[number], {
      startTime: videoRef.current?.currentTime ?? currentTime,
      toastMessage: `${reason} Switched to ${nextSource.addonName}.`,
      silent: false,
    });
  }, [currentSource, currentTime, hasMultipleSources, normalizedSources, settings.autoSourceFailover, switchToSource]);

  const retryCurrentSource = useCallback(() => {
    if (!currentSource) return;
    attemptedSourceIdsRef.current.delete(currentSource.id);
    void switchToSource(currentSource, {
      startTime: videoRef.current?.currentTime ?? currentTime,
      toastMessage: `Retrying ${currentSource.addonName}`,
    });
  }, [currentSource, currentTime, switchToSource]);

  const handleSourceChange = useCallback((sourceId: string) => {
    const nextSource = normalizedSources.find((item) => item.id === sourceId);
    if (!nextSource) return;
    attemptedSourceIdsRef.current.add(currentSource?.id || '');
    void switchToSource(nextSource, {
      startTime: videoRef.current?.currentTime ?? currentTime,
      toastMessage: `Switched to ${nextSource.addonName}`,
    });
  }, [currentSource?.id, currentTime, normalizedSources, switchToSource]);

  const loadQueueItem = useCallback(async (targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= playlist.length || !playbackType || !metaId) return;

    const targetItem = playlist[targetIndex];
    const streamAddons = filterAddonsForResource(addons, 'stream', playbackType, targetItem.videoId);
    if (streamAddons.length === 0) {
      toast.error('No playback addons are available for the next item.');
      return;
    }

    setSwitchingQueueItem(true);

    try {
      const streamResults = await Promise.allSettled(
        streamAddons.map(async (addon) => {
          const result = await addonTransportClient.fetchStreams(addon.transportUrl, {
            type: playbackType,
            id: targetItem.videoId,
          });

          return (result.streams || []).map((item: NonNullable<typeof result.streams>[number]) => ({
            id: `${addon.manifest.id}:${getStreamKey(item)}`,
            addonName: addon.manifest.name,
            stream: item,
            analysis: analyzeStream(item),
          }));
        }),
      );

      const nextSources = streamResults
        .filter((result): result is PromiseFulfilledResult<typeof normalizedSources> => result.status === 'fulfilled')
        .flatMap((result) => result.value)
        .sort((left, right) => right.analysis.score - left.analysis.score);

      const nextPlayable = nextSources.find((item) => item.analysis.playback === 'internal');
      if (!nextPlayable) {
        toast.error('The next item has no browser-playable source.');
        return;
      }

      const subtitleAddons = filterAddonsForResource(addons, 'subtitles', playbackType, targetItem.videoId);
      const subtitleResults = await Promise.allSettled(
        subtitleAddons.map((addon) =>
          addonTransportClient.fetchSubtitles(addon.transportUrl, {
            type: playbackType,
            id: targetItem.videoId,
          }),
        ),
      );

      const nextSubtitles = dedupeSubtitles([
        ...subtitleResults.flatMap((result) =>
          result.status === 'fulfilled' ? result.value.subtitles || [] : [],
        ),
        ...(nextPlayable.stream.subtitles || []),
      ]);

      playerStore.getState().play({
        stream: nextPlayable.stream,
        availableSources: nextSources,
        type: playbackType,
        videoId: targetItem.videoId,
        metaId,
        title: title || 'NovaCast',
        subtitle: targetItem.subtitle ? `${targetItem.subtitle} · ${targetItem.title}` : targetItem.title,
        poster: poster || undefined,
        subtitles: nextSubtitles,
        playlist,
        playlistIndex: targetIndex,
        startTime: 0,
      });

      closeUpNext();
      setSettingsPanel(null);
      setSkipIntroDismissed(false);
      setShowSkipIntro(true);
      toast.success(`Now playing ${targetItem.title}`);
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : 'Failed to load the next item.');
    } finally {
      setSwitchingQueueItem(false);
    }
  }, [addons, closeUpNext, metaId, normalizedSources, playbackType, playerStore, playlist, poster, setSettingsPanel, title, toast]);

  const playNextInQueue = useCallback(() => {
    if (nextQueueItem) {
      void loadQueueItem(playlistIndex + 1);
    }
  }, [loadQueueItem, nextQueueItem, playlistIndex]);

  const playPreviousInQueue = useCallback(() => {
    if (previousQueueItem) {
      void loadQueueItem(playlistIndex - 1);
    }
  }, [loadQueueItem, playlistIndex, previousQueueItem]);

  // --- Double-tap gesture handler for left/right skip ---
  const handleContainerClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (settingsPanel) {
      setSettingsPanel(null);
      return;
    }
    if ((event.target as HTMLElement).closest('[data-no-toggle]')) return;

    const now = Date.now();
    const lastTap = lastTapRef.current;
    const container = containerRef.current;
    if (!container) {
      togglePlay();
      return;
    }

    const rect = container.getBoundingClientRect();
    const relativeX = event.clientX - rect.left;
    const isLeftSide = relativeX < rect.width * 0.35;
    const isRightSide = relativeX > rect.width * 0.65;

    if (now - lastTap.time < 350 && (isLeftSide || isRightSide)) {
      // Double tap detected
      const skipAmount = isLeftSide ? -10 : 10;
      seek(skipAmount);
      setDoubleTapFeedback({
        side: isLeftSide ? 'left' : 'right',
        seconds: Math.abs(skipAmount),
        key: now,
      });
      lastTapRef.current = { time: 0, x: 0 };
      return;
    }

    lastTapRef.current = { time: now, x: relativeX };

    // Delay single-tap toggle to avoid conflict with double-tap
    setTimeout(() => {
      if (lastTapRef.current.time === now) {
        togglePlay();
      }
    }, 350);
  }, [seek, settingsPanel, togglePlay]);

  // --- Long press for 2x speed ---
  const handlePointerDown = useCallback((event: React.PointerEvent) => {
    if ((event.target as HTMLElement).closest('[data-no-toggle]')) return;
    longPressActiveRef.current = false;

    longPressTimerRef.current = setTimeout(() => {
      longPressActiveRef.current = true;
      const video = videoRef.current;
      if (video) {
        video.playbackRate = 2;
        setLongPressSpeed(true);
      }
    }, 500);

    // Volume swipe gesture on right side
    const container = containerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      const relativeX = event.clientX - rect.left;
      if (relativeX > rect.width * 0.7) {
        volumeGestureRef.current = { startY: event.clientY, startVolume: volume };
      }
    }
  }, [volume]);

  const handlePointerUp = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (longPressActiveRef.current) {
      const video = videoRef.current;
      if (video) {
        video.playbackRate = playbackRate;
      }
      setLongPressSpeed(false);
      longPressActiveRef.current = false;
    }
    volumeGestureRef.current = null;
  }, [playbackRate]);

  const handlePointerMove = useCallback((event: React.PointerEvent) => {
    if (volumeGestureRef.current) {
      const deltaY = volumeGestureRef.current.startY - event.clientY;
      const sensitivity = 200;
      const newVolume = Math.max(0, Math.min(1, volumeGestureRef.current.startVolume + deltaY / sensitivity));
      playerStore.getState().setVolume(newVolume);
      if (newVolume > 0 && muted) {
        playerStore.getState().setMuted(false);
      }
    }
  }, [muted, playerStore]);

  // Clear double tap feedback after animation
  useEffect(() => {
    if (!doubleTapFeedback) return;
    const timer = setTimeout(() => setDoubleTapFeedback(null), 700);
    return () => clearTimeout(timer);
  }, [doubleTapFeedback]);

  useEffect(() => {
    if (!stream) {
      navigate('/');
      return;
    }
  }, [navigate, stream]);

  useEffect(() => {
    attemptedSourceIdsRef.current = new Set();
    setRecoveringSourceId(null);
    setSkipIntroDismissed(false);
    setShowSkipIntro(true);
  }, [videoId]);

  useEffect(() => {
    progressSaveInterval.current = setInterval(saveProgress, 10000);
    return () => {
      if (progressSaveInterval.current) {
        clearInterval(progressSaveInterval.current);
      }
      saveProgress();
    };
  }, [saveProgress]);

  useEffect(() => {
    if (subtitleOptions.length === 0) {
      playerStore.getState().selectSubtitle(null);
      return;
    }

    if (selectedSubtitleId && subtitleOptions.some((item) => item.id === selectedSubtitleId)) {
      return;
    }

    if (settings.defaultSubtitleLang) {
      const preferred = subtitleOptions.find((item) =>
        item.lang.toLowerCase().startsWith(settings.defaultSubtitleLang.toLowerCase()),
      );
      playerStore.getState().selectSubtitle(preferred?.id || null);
      return;
    }

    playerStore.getState().selectSubtitle(null);
  }, [playerStore, selectedSubtitleId, settings.defaultSubtitleLang, subtitleOptions]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    clearPlaybackEngines();
    playerStore.getState().setBuffering(true);
    playerStore.getState().setError(null);
    playerStore.getState().setQualityLevels([]);
    playerStore.getState().setCurrentQuality(-1);
    setAudioTracks([]);
    setCurrentAudioTrack(-1);
    setBandwidthEstimate(null);
    const streamLooksLive = isLikelyLiveStream(stream?.name, stream?.description, streamUrl);
    const lowLatencyProfile =
      settings.liveLatencyMode === 'low'
        ? {
            hls: { lowLatencyMode: true, liveSyncDurationCount: 2, liveMaxLatencyDurationCount: 5, maxLiveSyncPlaybackRate: 1.18 },
            dash: { lowLatencyEnabled: true, liveDelay: 4, maxDrift: 0, playbackRate: { min: -0.25, max: 0.4 } },
          }
        : settings.liveLatencyMode === 'balanced'
          ? {
              hls: { lowLatencyMode: false, liveSyncDurationCount: 4, liveMaxLatencyDurationCount: 9, maxLiveSyncPlaybackRate: 1.08 },
              dash: { lowLatencyEnabled: false, liveDelay: 10, maxDrift: 4, playbackRate: { min: -0.1, max: 0.18 } },
            }
          : {
              hls: { lowLatencyMode: streamLooksLive, liveSyncDurationCount: 3, liveMaxLatencyDurationCount: 7, maxLiveSyncPlaybackRate: 1.12 },
              dash: { lowLatencyEnabled: streamLooksLive, liveDelay: 6, maxDrift: 2, playbackRate: { min: -0.18, max: 0.28 } },
            };

    setIsLive(streamLooksLive);
    setLiveEdgePosition(null);

    const preferredQuality = settings.defaultQuality;

    if (mediaFormat === 'hls' && Hls.isSupported()) {
      const hls = new Hls({
        maxBufferLength: 30,
        maxMaxBufferLength: 120,
        enableWorker: true,
        lowLatencyMode: lowLatencyProfile.hls.lowLatencyMode,
        startLevel: -1,
        capLevelToPlayerSize: true,
        liveSyncDurationCount: lowLatencyProfile.hls.liveSyncDurationCount,
        liveMaxLatencyDurationCount: lowLatencyProfile.hls.liveMaxLatencyDurationCount,
        maxLiveSyncPlaybackRate: lowLatencyProfile.hls.maxLiveSyncPlaybackRate,
      });

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        const nextLevels = data.levels.map((level, index) => ({
          index,
          height: level.height,
          bitrate: level.bitrate,
          label: level.height ? `${level.height}p` : `${Math.round(level.bitrate / 1000)} kbps`,
        }));

        playerStore.getState().setQualityLevels(nextLevels);
        setAudioTracks(
          (hls.audioTracks || []).map((track, index) => ({
            index,
            lang: track.lang,
            label: track.name || getLanguageLabel(track.lang || `Track ${index + 1}`),
          })),
        );
        setCurrentAudioTrack(hls.audioTrack ?? -1);

        if (preferredQuality !== 'auto') {
          const preferredLevel = nextLevels.find((level: { label: string }) => matchesPreferredQuality(level.label, preferredQuality));
          if (preferredLevel) {
            hls.currentLevel = preferredLevel.index;
            playerStore.getState().setCurrentQuality(preferredLevel.index);
          }
        }

        void video.play().catch(() => undefined);
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        playerStore.getState().setCurrentQuality(data.level);
        setBandwidthEstimate(Number.isFinite(hls.bandwidthEstimate) ? hls.bandwidthEstimate : null);
        setIsLive(Boolean(hls.latestLevelDetails?.live) || isLikelyLiveStream(stream?.name, stream?.description, streamUrl));
        setLiveEdgePosition(hls.liveSyncPosition ?? null);
      });

      hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (_event, data) => {
        setCurrentAudioTrack(data.id);
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;

        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            hls.startLoad();
            if (data.details?.includes('manifest') && !attemptSourceFailover('Manifest request failed.')) {
              playerStore.getState().setError(`Playback error: ${data.details}`);
              playerStore.getState().setBuffering(false);
            }
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            hls.recoverMediaError();
            break;
          default:
            if (!attemptSourceFailover(`Playback error: ${data.details}.`)) {
              playerStore.getState().setError(`Playback error: ${data.details}`);
              playerStore.getState().setBuffering(false);
            }
            break;
        }
      });

      hlsRef.current = hls;
      return () => clearPlaybackEngines();
    }

    if (mediaFormat === 'dash') {
      const dashPlayer: any = dashjs.MediaPlayer().create();
      dashPlayer.updateSettings({
        streaming: {
          lowLatencyEnabled: lowLatencyProfile.dash.lowLatencyEnabled,
          applyContentSteering: true,
          delay: {
            liveDelay: lowLatencyProfile.dash.liveDelay,
          },
          liveCatchup: {
            maxDrift: lowLatencyProfile.dash.maxDrift,
            playbackRate: lowLatencyProfile.dash.playbackRate,
          },
          abr: {
            autoSwitchBitrate: {
              video: preferredQuality === 'auto',
            },
          },
        },
      });
      dashPlayer.initialize(video, streamUrl, settings.autoplay);

      dashPlayer.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, () => {
        const nextLevels = (dashPlayer.getBitrateInfoListFor?.('video') || []).map((level: any, index: number) => ({
          index,
          height: level.height || 0,
          bitrate: level.bitrate || 0,
          label: level.height ? `${level.height}p` : `${Math.round((level.bitrate || 0) / 1000)} kbps`,
        }));
        const nextAudioTracks = (dashPlayer.getTracksFor?.('audio') || []).map((track: any, index: number) => ({
          index,
          lang: track.lang,
          label: track.labels?.[0]?.text || track.lang || `Track ${index + 1}`,
        }));

        playerStore.getState().setQualityLevels(nextLevels);
        setAudioTracks(nextAudioTracks);

        if (preferredQuality !== 'auto') {
          const preferredLevel = nextLevels.find((level: { label: string }) => matchesPreferredQuality(level.label, preferredQuality));
          if (preferredLevel) {
            dashPlayer.updateSettings({ streaming: { abr: { autoSwitchBitrate: { video: false } } } });
            dashPlayer.setQualityFor?.('video', preferredLevel.index);
            playerStore.getState().setCurrentQuality(preferredLevel.index);
          }
        }

        setBandwidthEstimate(dashPlayer.getAverageThroughput?.('video') ?? null);
      });

      dashPlayer.on(dashjs.MediaPlayer.events.QUALITY_CHANGE_RENDERED, (event: any) => {
        if (event.mediaType === 'video') {
          playerStore.getState().setCurrentQuality(event.newQuality);
          setBandwidthEstimate(dashPlayer.getAverageThroughput?.('video') ?? null);
        }
      });

      dashPlayer.on(dashjs.MediaPlayer.events.ERROR, () => {
        if (!attemptSourceFailover('This DASH source failed.')) {
          playerStore.getState().setError('Failed to play this DASH stream. Try another source.');
          playerStore.getState().setBuffering(false);
        }
      });

      dashRef.current = dashPlayer;
      return () => clearPlaybackEngines();
    }

    video.src = streamUrl;
    if (settings.autoplay) {
      void video.play().catch(() => undefined);
    }

    return () => clearPlaybackEngines();
  }, [
    clearPlaybackEngines,
    mediaFormat,
    attemptSourceFailover,
    playerStore,
    settings.autoplay,
    settings.defaultQuality,
    settings.liveLatencyMode,
    stream?.description,
    stream?.name,
    streamUrl,
  ]);

  // --- Throttled progress update via video events ---
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const throttledTimeUpdate = throttle(() => {
      playerStore.getState().updateTime(video.currentTime, video.duration || 0);
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        playerStore.getState().setBuffered(bufferedEnd);
      }
      if (!Number.isFinite(video.duration)) {
        setIsLive(true);
      }
      if (hlsRef.current) {
        setLiveEdgePosition(hlsRef.current.liveSyncPosition ?? null);
      }
      // Auto-hide skip intro after window
      if (video.currentTime >= SKIP_INTRO_WINDOW) {
        setShowSkipIntro(false);
      }
    }, 250);

    const onLoadedMetadata = () => {
      if (!Number.isFinite(video.duration)) {
        setIsLive(true);
      }

      setRecoveringSourceId(null);
      bufferingStartedAtRef.current = null;

      if (resumeStartTimeRef.current > 0) {
        if (Number.isFinite(video.duration) && video.duration > 0) {
          video.currentTime = Math.min(resumeStartTimeRef.current, Math.max(video.duration - 2, 0));
        } else {
          video.currentTime = resumeStartTimeRef.current;
        }
        resumeStartTimeRef.current = 0;
      }

      closeUpNext();
    };

    const onPlay = () => {
      playerStore.getState().setPaused(false);
      playerStore.getState().setBuffering(false);
      bufferingStartedAtRef.current = null;
      closeUpNext();
    };
    const onPause = () => playerStore.getState().setPaused(true);
    const onWaiting = () => {
      bufferingStartedAtRef.current = Date.now();
      playerStore.getState().setBuffering(true);
    };
    const onPlaying = () => {
      bufferingStartedAtRef.current = null;
      setRecoveringSourceId(null);
      playerStore.getState().setBuffering(false);
    };
    const onCanPlay = () => {
      bufferingStartedAtRef.current = null;
      playerStore.getState().setBuffering(false);
    };
    const onEnded = () => {
      playerStore.getState().setPaused(true);
      if (nextQueueItem) {
        setShowUpNext(true);
        setUpNextCountdown(settings.autoNextEpisode ? 8 : null);
      }
    };
    const onError = () => {
      if (!attemptSourceFailover('This source stopped responding.')) {
        playerStore.getState().setError('Failed to play this stream. Try another source.');
        playerStore.getState().setBuffering(false);
      }
    };
    const onRateChange = () => playerStore.getState().setPlaybackRate(video.playbackRate);

    video.addEventListener('timeupdate', throttledTimeUpdate);
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('ended', onEnded);
    video.addEventListener('error', onError);
    video.addEventListener('ratechange', onRateChange);

    return () => {
      video.removeEventListener('timeupdate', throttledTimeUpdate);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('error', onError);
      video.removeEventListener('ratechange', onRateChange);
    };
  }, [attemptSourceFailover, closeUpNext, nextQueueItem, playerStore, settings.autoNextEpisode]);

  useEffect(() => {
    if (!buffering || paused || playerError) return;

    const interval = setInterval(() => {
      if (!bufferingStartedAtRef.current) return;
      if (Date.now() - bufferingStartedAtRef.current < 12000) return;

      bufferingStartedAtRef.current = Date.now();
      if (!attemptSourceFailover('Playback stalled for too long.')) {
        playerStore.getState().setError('Playback stalled. Try another source or retry the current one.');
        playerStore.getState().setBuffering(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [attemptSourceFailover, buffering, paused, playerError, playerStore]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = volume;
    video.muted = muted;
  }, [muted, volume]);

  useEffect(() => {
    setCaptionScale(settings.defaultCaptionScale);
  }, [settings.defaultCaptionScale]);

  useEffect(() => {
    resumeStartTimeRef.current = initialStartTime;
  }, [initialStartTime, streamUrl]);

  useEffect(() => {
    if (!showUpNext || upNextCountdown === null) return;
    if (upNextCountdown <= 0) {
      playNextInQueue();
      return;
    }

    const timer = setTimeout(() => {
      setUpNextCountdown((value) => (value == null ? null : value - 1));
    }, 1000);

    return () => clearTimeout(timer);
  }, [playNextInQueue, showUpNext, upNextCountdown]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || subtitleOptions.length === 0) return;

    const syncTracks = () => {
      const tracks = Array.from(video.textTracks);
      tracks.forEach((track, index) => {
        const subtitleOption = subtitleOptions[index];
        track.mode = subtitleOption && subtitleOption.id === selectedSubtitleId ? 'showing' : 'disabled';
      });
    };

    const timeout = setTimeout(syncTracks, 0);
    return () => clearTimeout(timeout);
  }, [selectedSubtitleId, subtitleOptions]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const fullscreen = !!document.fullscreenElement;
      setIsFullscreen(fullscreen);
      playerStore.getState().setIsFullscreen(fullscreen);
      if (fullscreen) setIsTheaterMode(false);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [playerStore]);

  useEffect(() => {
    const video = videoRef.current as (HTMLVideoElement & {
      remote?: {
        state?: string;
        prompt?: () => Promise<void>;
        watchAvailability?: (callback: (available: boolean) => void) => Promise<number>;
        cancelWatchAvailability?: (id: number) => void;
        addEventListener?: (type: string, listener: () => void) => void;
        removeEventListener?: (type: string, listener: () => void) => void;
      };
    }) | null;

    const remote = video?.remote;
    if (!remote?.prompt) {
      setRemotePlaybackAvailable(false);
      setRemotePlaybackState('unsupported');
      return;
    }

    let watchId: number | null = null;
    const updateState = () => {
      const nextState = remote.state;
      if (nextState === 'connected' || nextState === 'connecting' || nextState === 'disconnected') {
        setRemotePlaybackState(nextState);
      } else {
        setRemotePlaybackState('disconnected');
      }
    };

    updateState();
    remote.addEventListener?.('connecting', updateState);
    remote.addEventListener?.('connect', updateState);
    remote.addEventListener?.('disconnect', updateState);

    if (remote.watchAvailability) {
      remote.watchAvailability((available: boolean) => {
        setRemotePlaybackAvailable(available);
      }).then((id) => {
        watchId = id;
      }).catch(() => {
        setRemotePlaybackAvailable(true);
      });
    } else {
      setRemotePlaybackAvailable(true);
    }

    return () => {
      if (watchId != null) {
        remote.cancelWatchAvailability?.(watchId);
      }
      remote.removeEventListener?.('connecting', updateState);
      remote.removeEventListener?.('connect', updateState);
      remote.removeEventListener?.('disconnect', updateState);
    };
  }, [streamUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onEnterPiP = () => playerStore.getState().setIsPiP(true);
    const onLeavePiP = () => playerStore.getState().setIsPiP(false);

    video.addEventListener('enterpictureinpicture', onEnterPiP);
    video.addEventListener('leavepictureinpicture', onLeavePiP);

    return () => {
      video.removeEventListener('enterpictureinpicture', onEnterPiP);
      video.removeEventListener('leavepictureinpicture', onLeavePiP);
    };
  }, [playerStore]);

  useEffect(() => {
    if (!stream || !('mediaSession' in navigator)) return;

    if ('MediaMetadata' in window) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: title || 'NovaCast',
        artist: subtitle || stream.name || 'Now Playing',
        album: 'NovaCast',
        artwork: poster
          ? [
              { src: poster, sizes: '256x256', type: 'image/jpeg' },
              { src: poster, sizes: '512x512', type: 'image/jpeg' },
            ]
          : [],
      });
    }

    navigator.mediaSession.playbackState = paused ? 'paused' : 'playing';
    const actionHandlers: Array<[MediaSessionAction, MediaSessionActionHandler | null]> = [
      ['play', () => void videoRef.current?.play()],
      ['pause', () => void videoRef.current?.pause()],
      ['stop', () => handleBack()],
      ['seekbackward', () => seek(-10)],
      ['seekforward', () => seek(10)],
      ['seekto', (details: MediaSessionActionDetails) => {
        if (!videoRef.current || !Number.isFinite(details?.seekTime)) return;
        videoRef.current.currentTime = details.seekTime!;
      }],
      ['previoustrack', previousQueueItem ? () => playPreviousInQueue() : null],
      ['nexttrack', nextQueueItem ? () => playNextInQueue() : null],
    ];

    actionHandlers.forEach(([action, handler]) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // Some actions are not available in all browsers.
      }
    });

    return () => {
      actionHandlers.forEach(([action]) => {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch {
          // Clearing handlers is not consistent across browsers.
        }
      });
    };
  }, [handleBack, nextQueueItem, paused, playNextInQueue, playPreviousInQueue, poster, previousQueueItem, seek, stream, subtitle, title]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    try {
      if (Number.isFinite(duration) && duration > 0) {
        navigator.mediaSession.setPositionState({
          duration,
          playbackRate,
          position: Math.min(currentTime, duration),
        });
      }
      navigator.mediaSession.playbackState = paused ? 'paused' : 'playing';
    } catch {
      // Older implementations may throw for live or unknown durations.
    }
  }, [currentTime, duration, paused, playbackRate]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!videoRef.current) return;
      if (showKeyboardHelp && event.key === 'Escape') {
        setShowKeyboardHelp(false);
        return;
      }

      switch (event.key) {
        case ' ':
        case 'k':
          event.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          seek(event.shiftKey ? -30 : -10);
          break;
        case 'ArrowRight':
          event.preventDefault();
          seek(event.shiftKey ? 30 : 10);
          break;
        case 'ArrowUp':
          event.preventDefault();
          playerStore.getState().setVolume(Math.min(1, volume + 0.05));
          break;
        case 'ArrowDown':
          event.preventDefault();
          playerStore.getState().setVolume(Math.max(0, volume - 0.05));
          break;
        case 'm':
          event.preventDefault();
          playerStore.getState().setMuted(!muted);
          break;
        case 'f':
          event.preventDefault();
          toggleFullscreen();
          break;
        case 't':
          event.preventDefault();
          toggleTheaterMode();
          break;
        case 'p':
          event.preventDefault();
          void togglePiP();
          break;
        case 'j':
          event.preventDefault();
          seek(-10);
          break;
        case 'l':
          event.preventDefault();
          seek(10);
          break;
        case ',':
          if (event.shiftKey) {
            event.preventDefault();
            cyclePlaybackRate(-1);
          }
          break;
        case '.':
          if (event.shiftKey) {
            event.preventDefault();
            cyclePlaybackRate(1);
          }
          break;
        case 'c':
          event.preventDefault();
          cycleSubtitles();
          break;
        case '?':
          event.preventDefault();
          setShowKeyboardHelp((value) => !value);
          break;
        case 'Escape':
          if (settingsPanel) {
            setSettingsPanel(null);
          } else if (document.fullscreenElement) {
            void document.exitFullscreen();
          } else {
            handleBack();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    cyclePlaybackRate,
    cycleSubtitles,
    handleBack,
    muted,
    playerStore,
    seek,
    settingsPanel,
    showKeyboardHelp,
    toggleFullscreen,
    toggleTheaterMode,
    togglePiP,
    togglePlay,
    volume,
  ]);

  useEffect(() => {
    return () => {
      if (hideControlsTimer.current) {
        clearTimeout(hideControlsTimer.current);
      }
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
      cancelAnimationFrame(ambientRafRef.current);
      clearPlaybackEngines();
    };
  }, [clearPlaybackEngines]);

  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  if (!stream || !streamUrl) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black text-white">
        <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-2xl bg-bg-tertiary">
          <Play className="h-7 w-7 text-text-tertiary" />
        </div>
        <p className="text-text-secondary">No stream selected</p>
        <button onClick={handleBack} className="btn-secondary">
          <ArrowLeft className="h-4 w-4" /> Go Back
        </button>
      </div>
    );
  }

  const theaterClass = isTheaterMode && !isFullscreen
    ? 'fixed inset-x-0 top-0 z-[60] h-[75vh] bg-black'
    : 'relative flex min-h-screen items-center justify-center bg-black';

  return (
    <>
      {/* Theater mode backdrop */}
      {isTheaterMode && !isFullscreen && (
        <div className="fixed inset-0 z-[59] bg-black/85 backdrop-blur-sm" />
      )}

      <div
        ref={containerRef}
        className={`player-shell select-none ${theaterClass}`}
        onMouseMove={handleMouseMove}
        onDoubleClick={(event) => {
          // Only toggle fullscreen if double-clicking the center area
          const rect = containerRef.current?.getBoundingClientRect();
          if (!rect) return;
          const relX = event.clientX - rect.left;
          if (relX > rect.width * 0.35 && relX < rect.width * 0.65) {
            toggleFullscreen();
          }
        }}
        onClick={handleContainerClick}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerMove={handlePointerMove}
        style={containerStyle}
      >
        {/* Ambient glow canvas */}
        {ambientEnabled && (
          <canvas
            ref={ambientCanvasRef}
            className="pointer-events-none absolute inset-0 h-full w-full scale-[1.15]"
            style={{
              filter: `blur(${AMBIENT_BLUR}px) saturate(1.6)`,
              opacity: AMBIENT_OPACITY,
              zIndex: 0,
            }}
            aria-hidden="true"
          />
        )}

        <video
          ref={videoRef}
          className="relative z-[1] h-full max-h-screen w-full object-contain"
          playsInline
          preload="auto"
          crossOrigin="anonymous"
          poster={poster || undefined}
        >
          {subtitleOptions.map((item) => (
            <track
              key={item.id}
              kind="subtitles"
              label={item.label}
              src={item.url}
              srcLang={item.lang}
              default={item.id === selectedSubtitleId}
            />
          ))}
        </video>

        {/* Double-tap skip feedback */}
        {doubleTapFeedback && (
          <div
            key={doubleTapFeedback.key}
            className={`pointer-events-none absolute top-1/2 z-[5] flex -translate-y-1/2 items-center gap-2 animate-fade-in ${
              doubleTapFeedback.side === 'left' ? 'left-12' : 'right-12'
            }`}
          >
            <div className="flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2.5 backdrop-blur-md">
              {doubleTapFeedback.side === 'left' ? (
                <Rewind className="h-5 w-5 text-white" />
              ) : (
                <FastForward className="h-5 w-5 text-white" />
              )}
              <span className="text-sm font-semibold text-white">{doubleTapFeedback.seconds}s</span>
            </div>
          </div>
        )}

        {/* Long press 2x speed indicator */}
        {longPressSpeed && (
          <div className="pointer-events-none absolute left-1/2 top-8 z-[5] -translate-x-1/2 animate-fade-in">
            <div className="flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2 backdrop-blur-md">
              <FastForward className="h-4 w-4 text-white" />
              <span className="text-sm font-semibold text-white">2x Speed</span>
            </div>
          </div>
        )}

        {/* Buffering spinner */}
        {buffering && !playerError && (
          <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center">
            <Loader2 className="h-14 w-14 animate-spin text-accent" />
          </div>
        )}

        {switchingQueueItem && (
          <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center bg-black/35 backdrop-blur-sm">
            <div className="rounded-2xl border border-white/10 bg-black/55 px-5 py-4 text-sm text-white shadow-2xl shadow-black/30">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-accent" aria-hidden="true" />
                Loading next item...
              </div>
            </div>
          </div>
        )}

        {recoveringSourceId && !playerError && !switchingQueueItem && (
          <div className="pointer-events-none absolute inset-x-0 top-24 z-[2] flex justify-center px-4">
            <div className="rounded-2xl border border-white/10 bg-black/55 px-4 py-3 text-sm text-white shadow-2xl shadow-black/30 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <Loader2 className="h-4 w-4 animate-spin text-accent" aria-hidden="true" />
                Switching to a healthier source...
              </div>
            </div>
          </div>
        )}

        {/* Error UI - Enhanced with more options */}
        {playerError && (
          <div className="absolute inset-0 z-[10] flex flex-col items-center justify-center gap-5 bg-black/92 backdrop-blur-sm" data-no-toggle onClick={(event) => event.stopPropagation()}>
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-error/10">
              <AlertTriangle className="h-10 w-10 text-error" />
            </div>
            <div className="max-w-lg text-center">
              <h3 className="mb-2 text-lg font-semibold text-white">Playback Error</h3>
              <p className="text-sm leading-relaxed text-white/70">{playerError}</p>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
              <button onClick={retryCurrentSource} className="btn-primary gap-2">
                <RotateCcw className="h-4 w-4" /> Retry Source
              </button>
              {fallbackSource && (
                <button onClick={() => attemptSourceFailover('Manual backup requested.')} className="btn-secondary gap-2">
                  <Layers className="h-4 w-4" /> Try Backup Source
                </button>
              )}
              {hasMultipleSources && (
                <button onClick={() => { playerStore.getState().setError(null); setSettingsPanel('source'); }} className="btn-secondary gap-2">
                  <Settings className="h-4 w-4" /> Pick Source
                </button>
              )}
              <button onClick={handleBack} className="btn-secondary gap-2">
                <ArrowLeft className="h-4 w-4" /> Go Back
              </button>
            </div>
            {normalizedSources.length > 1 && (
              <div className="mt-4 max-w-md">
                <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wider text-white/40">Alternative Sources</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {normalizedSources.filter((s) => s.id !== currentSource?.id && s.analysis.playback === 'internal').map((src) => (
                    <button
                      key={src.id}
                      onClick={() => handleSourceChange(src.id)}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      {src.addonName} {src.analysis.qualityLabel ? `(${src.analysis.qualityLabel})` : ''}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Skip Intro Button */}
        {canShowSkipIntro && !playerError && (
          <div className="absolute bottom-28 right-6 z-[6] animate-fade-in" data-no-toggle>
            <button
              onClick={handleSkipIntro}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/30 bg-black/60 px-5 py-2.5 text-sm font-medium text-white backdrop-blur-md transition-all hover:border-white/50 hover:bg-white/15"
            >
              Skip Intro
              <SkipForward className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Controls overlay */}
        <div className={`absolute inset-0 z-[3] transition-opacity duration-300 ${showControls ? 'opacity-100' : 'pointer-events-none opacity-0'}`} data-no-toggle onClick={(event) => event.stopPropagation()}>
          {/* Top gradient with info */}
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
            <div className="flex items-center gap-4 p-4 pt-5">
              <button onClick={handleBack} className="cursor-pointer rounded-xl p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white" aria-label="Go back">
                <ArrowLeft className="h-5 w-5" />
              </button>

              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <h2 className="truncate text-sm font-semibold text-white">{title}</h2>
                  {isLivePlayback && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-error/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-error">
                      <Radio className="h-3 w-3" /> Live
                    </span>
                  )}
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-white/70">
                    {mediaFormat.toUpperCase()}
                  </span>
                  {currentSource && (
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-white/70">
                      {currentSource.addonName}
                    </span>
                  )}
                  {wakeLock.active && (
                    <span className="rounded-full bg-accent/12 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-accent">
                      Awake
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {subtitle && <p className="truncate text-xs text-white/50">{subtitle}</p>}
                  {currentSource?.analysis.qualityLabel && <span className="text-[11px] text-white/45">{currentSource.analysis.qualityLabel}</span>}
                  {settings.liveLatencyMode !== 'auto' && isLivePlayback && <span className="text-[11px] text-white/45">{settings.liveLatencyMode} latency</span>}
                </div>
              </div>

              <div className="flex items-center gap-1">
                {remotePlaybackState !== 'unsupported' && (remotePlaybackAvailable || remotePlaybackState === 'connected') && (
                  <button onClick={() => void toggleRemotePlayback()} className={`cursor-pointer rounded-xl p-2 transition-colors hover:bg-white/10 hover:text-white ${remotePlaybackState === 'connected' ? 'text-accent' : 'text-white/70'}`} aria-label="Remote playback">
                    <Cast className="h-5 w-5" />
                  </button>
                )}
                {document.pictureInPictureEnabled && (
                  <button onClick={() => void togglePiP()} className={`cursor-pointer rounded-xl p-2 transition-colors hover:bg-white/10 hover:text-white ${isPiP ? 'text-accent' : 'text-white/70'}`} aria-label="Picture in Picture">
                    <PictureInPicture2 className="h-5 w-5" />
                  </button>
                )}
                <button onClick={() => setShowKeyboardHelp(true)} className="cursor-pointer rounded-xl p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white" aria-label="Keyboard shortcuts">
                  <Keyboard className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Center play/pause button */}
          {!buffering && (
            <div className="absolute inset-0 flex items-center justify-center">
              <button onClick={togglePlay} className="group flex h-18 w-18 cursor-pointer items-center justify-center rounded-full bg-white/10 backdrop-blur-sm transition-all hover:scale-110 hover:bg-white/20" aria-label={paused ? 'Play' : 'Pause'}>
                {paused ? (
                  <Play className="ml-1 h-8 w-8 text-white transition-colors group-hover:text-accent" />
                ) : (
                  <Pause className="h-8 w-8 text-white transition-colors group-hover:text-accent" />
                )}
              </button>
            </div>
          )}

          {/* Bottom control bar with glass morphism */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-4 pb-4 pt-20">
            {/* Seek bar */}
            <div
              ref={seekBarRef}
              className={`relative mb-3 ${isLivePlayback ? 'cursor-default' : 'group/progress cursor-pointer'}`}
              onClick={handleSeekBarClick}
              onMouseDown={handleSeekBarMouseDown}
              onMouseMove={handleSeekBarHover}
              onMouseLeave={() => { if (!isSeeking) setHoverTime(null); }}
            >
              <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/15 transition-all group-hover/progress:h-2.5">
                {/* Buffered progress */}
                <div className="absolute left-0 top-0 h-full rounded-full bg-white/20 transition-[width] duration-100" style={{ width: `${bufferedProgress}%` }} />
                {/* Current progress */}
                <div className="absolute left-0 top-0 h-full rounded-full bg-accent transition-[width] duration-100" style={{ width: `${displayProgress}%` }} />
              </div>

              {!isLivePlayback && (
                <>
                  {/* Seek thumb */}
                  <div
                    className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-accent opacity-0 shadow-lg shadow-accent/30 transition-opacity group-hover/progress:opacity-100"
                    style={{ left: `calc(${displayProgress}% - 8px)` }}
                  />
                  {/* Hover time tooltip */}
                  {hoverTime && (
                    <div
                      className="pointer-events-none absolute -top-10 -translate-x-1/2 rounded-lg border border-white/10 bg-black/85 px-3 py-1.5 text-xs font-medium text-white shadow-xl backdrop-blur-md"
                      style={{ left: `${hoverTime.x}px` }}
                    >
                      {formatTime(hoverTime.time)}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Glass control bar */}
            <div className="flex items-center justify-between gap-4 rounded-xl">
              <div className="flex items-center gap-1 sm:gap-1.5">
                {/* Skip backward */}
                <button onClick={() => seek(-10)} disabled={isLivePlayback} className="cursor-pointer rounded-xl p-2.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30" aria-label="Rewind 10 seconds">
                  <SkipBack className="h-5 w-5" />
                </button>

                {/* Previous */}
                {previousQueueItem && (
                  <button onClick={playPreviousInQueue} className="cursor-pointer rounded-xl p-2.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white" aria-label="Previous item">
                    <Layers className="h-5 w-5" />
                  </button>
                )}

                {/* Play/Pause */}
                <button onClick={togglePlay} className="cursor-pointer rounded-xl p-2.5 text-white transition-colors hover:bg-white/10 hover:text-white" aria-label={paused ? 'Play' : 'Pause'}>
                  {paused ? <Play className="h-6 w-6" /> : <Pause className="h-6 w-6" />}
                </button>

                {/* Next */}
                {nextQueueItem && (
                  <button onClick={playNextInQueue} className="cursor-pointer rounded-xl p-2.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white" aria-label="Next item">
                    <ChevronRight className="h-5 w-5" />
                  </button>
                )}

                {/* Skip forward */}
                <button onClick={() => seek(10)} disabled={isLivePlayback} className="cursor-pointer rounded-xl p-2.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30" aria-label="Forward 10 seconds">
                  <SkipForward className="h-5 w-5" />
                </button>

                {/* Volume with vertical popup */}
                <div
                  className="group/vol relative ml-1 flex items-center"
                  onMouseEnter={() => setShowVolumeSlider(true)}
                  onMouseLeave={() => setShowVolumeSlider(false)}
                >
                  <button onClick={toggleMute} className="cursor-pointer rounded-xl p-2.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white" aria-label={muted ? 'Unmute' : 'Mute'}>
                    <VolumeIcon className="h-5 w-5" />
                  </button>

                  {/* Vertical volume slider popup */}
                  <div className={`absolute -top-36 left-1/2 -translate-x-1/2 transition-all duration-200 ${showVolumeSlider ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'}`}>
                    <div className="flex h-28 flex-col items-center rounded-xl border border-white/10 bg-black/80 px-3 py-3 backdrop-blur-xl">
                      <span className="mb-1.5 text-[10px] font-medium text-white/60">{Math.round((muted ? 0 : volume) * 100)}</span>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.02}
                        value={muted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="h-16 w-1.5 cursor-pointer appearance-none rounded-full accent-accent"
                        aria-label="Volume"
                        style={{
                          writingMode: 'vertical-lr' as any,
                          direction: 'rtl',
                        }}
                      />
                    </div>
                    {/* Arrow pointing down */}
                    <div className="mx-auto h-2 w-2 rotate-45 border-b border-r border-white/10 bg-black/80" style={{ marginTop: '-5px' }} />
                  </div>
                </div>

                {/* Time display */}
                <span className="ml-2 whitespace-nowrap text-xs text-white/50 tabular-nums">
                  {isLivePlayback ? `${formatTime(currentTime)} · LIVE` : `${formatTime(currentTime)} / ${formatTime(safeDuration)}`}
                </span>
                {isLivePlayback && (
                  <button onClick={seekToLiveEdge} className="btn-ghost px-2.5 py-1 text-[11px] text-white/80 hover:text-white">
                    Go Live
                  </button>
                )}
              </div>

              {/* Right side controls */}
              <div className="flex items-center gap-1">
                {bandwidthEstimate && (
                  <span className="mr-1 hidden rounded-lg bg-white/10 px-2 py-1 text-xs font-semibold text-white/80 sm:inline-block">
                    {(bandwidthEstimate / 1000000).toFixed(1)} Mbps
                  </span>
                )}
                {playbackRate !== 1 && (
                  <span className="mr-1 rounded-lg bg-accent/10 px-2 py-1 text-xs font-semibold text-accent">
                    {playbackRate}x
                  </span>
                )}
                {/* Theater mode button */}
                {!isFullscreen && (
                  <button
                    onClick={toggleTheaterMode}
                    className={`cursor-pointer rounded-xl p-2.5 transition-colors hover:bg-white/10 hover:text-white ${isTheaterMode ? 'text-accent' : 'text-white/80'}`}
                    aria-label={isTheaterMode ? 'Exit theater mode' : 'Theater mode'}
                  >
                    <MonitorPlay className="h-5 w-5" />
                  </button>
                )}
                {/* Settings button */}
                <button onClick={() => setSettingsPanel(settingsPanel ? null : 'main')} className={`cursor-pointer rounded-xl p-2.5 transition-colors hover:bg-white/10 hover:text-white ${settingsPanel ? 'text-accent' : 'text-white/80'}`} aria-label="Settings">
                  <Settings className="h-5 w-5" />
                </button>
                {/* Fullscreen button */}
                <button onClick={toggleFullscreen} className="cursor-pointer rounded-xl p-2.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white" aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>
                  {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Settings panel with smooth transitions */}
          {settingsPanel && (
            <div
              className="absolute bottom-20 right-4 z-[20] w-72 overflow-hidden rounded-2xl border border-white/15 bg-black/75 shadow-2xl shadow-black/40 backdrop-blur-2xl animate-scale-in"
              onClick={(event) => event.stopPropagation()}
            >
              {settingsPanel === 'main' && (
                <div className="py-2">
                  <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white/40">Playback Controls</p>
                  {hasMultipleSources && (
                    <SettingsMenuItem icon={<Layers className="h-4 w-4" />} label="Source" value={currentSource?.addonName || `${normalizedSources.length} options`} onClick={() => setSettingsPanel('source')} />
                  )}
                  <SettingsMenuItem icon={<Layers className="h-4 w-4" />} label="Quality" value={currentQuality === -1 ? 'Auto' : qualityLevels.find((item) => item.index === currentQuality)?.label || 'Auto'} onClick={() => setSettingsPanel('quality')} />
                  <SettingsMenuItem icon={<Gauge className="h-4 w-4" />} label="Speed" value={`${playbackRate}x`} onClick={() => setSettingsPanel('speed')} />
                  <SettingsMenuItem icon={<Subtitles className="h-4 w-4" />} label="Subtitles" value={selectedSubtitleLabel} onClick={() => setSettingsPanel('subtitles')} />
                  <SettingsMenuItem icon={<Languages className="h-4 w-4" />} label="Audio" value={currentAudioTrack >= 0 ? audioTracks[currentAudioTrack]?.label || 'Default' : audioTracks.length > 0 ? 'Default' : 'None'} onClick={() => setSettingsPanel('audio')} />
                  <SettingsMenuItem icon={<Type className="h-4 w-4" />} label="Captions" value={`${Math.round(captionScale * 100)}%`} onClick={() => setSettingsPanel('display')} />
                  <div className="my-1 border-t border-white/10" />
                  <button
                    onClick={() => setAmbientEnabled((v) => !v)}
                    className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <ZapOff className="h-4 w-4" />
                    <span className="flex-1 text-left">Ambient Glow</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ambientEnabled ? 'bg-accent/15 text-accent' : 'bg-white/10 text-white/50'}`}>
                      {ambientEnabled ? 'ON' : 'OFF'}
                    </span>
                  </button>
                </div>
              )}

              {settingsPanel === 'quality' && (
                <SettingsPanelShell title="Quality" onBack={() => setSettingsPanel('main')}>
                  <SettingsListButton active={currentQuality === -1} onClick={() => handleQualityChange(-1)}>
                    <span>Auto (Adaptive)</span>
                    {currentQuality === -1 && <Check className="h-4 w-4 text-accent" />}
                  </SettingsListButton>
                  {[...qualityLevels].sort((a, b) => b.height - a.height || b.bitrate - a.bitrate).map((level) => (
                    <SettingsListButton key={level.index} active={currentQuality === level.index} onClick={() => handleQualityChange(level.index)}>
                      <div>
                        <div>{level.label}</div>
                        <div className="text-xs text-white/40">{Math.round(level.bitrate / 1000)} kbps</div>
                      </div>
                      {currentQuality === level.index && <Check className="h-4 w-4 text-accent" />}
                    </SettingsListButton>
                  ))}
                </SettingsPanelShell>
              )}

              {settingsPanel === 'speed' && (
                <SettingsPanelShell title="Speed" onBack={() => setSettingsPanel('main')}>
                  {PLAYBACK_RATES.map((rate) => (
                    <SettingsListButton key={rate} active={playbackRate === rate} onClick={() => handleSpeedChange(rate)}>
                      <span>{rate === 1 ? 'Normal' : `${rate}x`}</span>
                      {playbackRate === rate && <Check className="h-4 w-4 text-accent" />}
                    </SettingsListButton>
                  ))}
                </SettingsPanelShell>
              )}

              {settingsPanel === 'subtitles' && (
                <SettingsPanelShell title="Subtitles" onBack={() => setSettingsPanel('main')}>
                  <SettingsListButton active={!selectedSubtitleId} onClick={() => handleSubtitleChange(null)}>
                    <span>Off</span>
                    {!selectedSubtitleId && <Check className="h-4 w-4 text-accent" />}
                  </SettingsListButton>
                  {subtitleOptions.length === 0 ? (
                    <p className="px-4 py-3 text-center text-xs text-white/40">No subtitles available for this stream.</p>
                  ) : (
                    subtitleOptions.map((item) => (
                      <SettingsListButton key={item.id} active={selectedSubtitleId === item.id} onClick={() => handleSubtitleChange(item.id)}>
                        <div>
                          <div>{item.label}</div>
                          <div className="text-xs text-white/40">{item.lang.toUpperCase()}</div>
                        </div>
                        {selectedSubtitleId === item.id && <Check className="h-4 w-4 text-accent" />}
                      </SettingsListButton>
                    ))
                  )}
                </SettingsPanelShell>
              )}

              {settingsPanel === 'audio' && (
                <SettingsPanelShell title="Audio" onBack={() => setSettingsPanel('main')}>
                  {audioTracks.length === 0 ? (
                    <p className="px-4 py-3 text-center text-xs text-white/40">This stream only exposes a single default audio track.</p>
                  ) : (
                    audioTracks.map((item) => (
                      <SettingsListButton key={item.index} active={currentAudioTrack === item.index} onClick={() => handleAudioTrackChange(item.index)}>
                        <div>
                          <div>{item.label}</div>
                          {item.lang && <div className="text-xs text-white/40">{item.lang.toUpperCase()}</div>}
                        </div>
                        {currentAudioTrack === item.index && <Check className="h-4 w-4 text-accent" />}
                      </SettingsListButton>
                    ))
                  )}
                </SettingsPanelShell>
              )}

              {settingsPanel === 'display' && (
                <SettingsPanelShell title="Caption Size" onBack={() => setSettingsPanel('main')}>
                  {CAPTION_SCALES.map((scale) => (
                    <SettingsListButton key={scale} active={captionScale === scale} onClick={() => handleCaptionScaleChange(scale)}>
                      <span>{Math.round(scale * 100)}%</span>
                      {captionScale === scale && <Check className="h-4 w-4 text-accent" />}
                    </SettingsListButton>
                  ))}
                </SettingsPanelShell>
              )}

              {settingsPanel === 'source' && (
                <SettingsPanelShell title="Source" onBack={() => setSettingsPanel('main')}>
                  {normalizedSources.map((item) => (
                    <SettingsListButton key={item.id} active={item.id === currentSource?.id} onClick={() => handleSourceChange(item.id)}>
                      <div>
                        <div>{item.addonName}</div>
                        <div className="text-xs text-white/40">{[item.analysis.qualityLabel, item.analysis.format.toUpperCase()].filter(Boolean).join(' · ')}</div>
                      </div>
                      {item.id === currentSource?.id && <Check className="h-4 w-4 text-accent" />}
                    </SettingsListButton>
                  ))}
                </SettingsPanelShell>
              )}
            </div>
          )}
        </div>

        {/* Diagnostics panel */}
        {settings.showPlaybackDiagnostics && !playerError && (
          <div className="absolute right-4 top-24 z-[4] hidden w-72 rounded-2xl border border-white/10 bg-black/45 p-4 text-xs text-white/80 shadow-2xl shadow-black/30 backdrop-blur-xl lg:block" data-no-toggle>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-accent/80">Diagnostics</p>
            <div className="mt-3 space-y-2">
              <DiagnosticRow label="Source" value={currentSource?.addonName || 'Direct'} />
              <DiagnosticRow label="Format" value={currentSource?.analysis.format.toUpperCase() || mediaFormat.toUpperCase()} />
              <DiagnosticRow label="Quality" value={currentQuality === -1 ? 'Auto' : qualityLevels.find((item) => item.index === currentQuality)?.label || 'Manual'} />
              <DiagnosticRow label="Bandwidth" value={bandwidthEstimate ? `${(bandwidthEstimate / 1000000).toFixed(1)} Mbps` : '---'} />
              <DiagnosticRow label="Latency" value={isLivePlayback ? settings.liveLatencyMode : 'VoD'} />
              <DiagnosticRow label="Failover" value={settings.autoSourceFailover ? 'Automatic' : 'Manual'} />
              <DiagnosticRow label="Remote" value={remotePlaybackState === 'unsupported' ? 'Unsupported' : remotePlaybackState} />
              <DiagnosticRow label="Wake lock" value={wakeLock.supported ? (wakeLock.active ? 'Active' : 'Idle') : 'Unsupported'} />
              <DiagnosticRow label="Subtitle" value={selectedSubtitleLabel} />
              <DiagnosticRow label="Audio" value={currentAudioTrack >= 0 ? audioTracks[currentAudioTrack]?.label || 'Track' : 'Default'} />
              <DiagnosticRow label="Ambient" value={ambientEnabled ? 'On' : 'Off'} />
              <DiagnosticRow label="Theater" value={isTheaterMode ? 'On' : 'Off'} />
            </div>
            {wakeLock.error && <p className="mt-3 text-[11px] text-warning">{wakeLock.error}</p>}
          </div>
        )}

        {/* Up Next overlay - Enhanced with poster and progress bar */}
        {showUpNext && nextQueueItem && (
          <div className="absolute inset-0 z-40 flex items-end justify-end p-4 sm:p-6" data-no-toggle>
            <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-black/65 shadow-2xl shadow-black/30 backdrop-blur-xl">
              {/* Countdown progress bar at top */}
              {upNextCountdown != null && (
                <div className="h-1 w-full bg-white/10">
                  <div
                    className="h-full bg-accent transition-all duration-1000 ease-linear"
                    style={{ width: `${((8 - (upNextCountdown ?? 0)) / 8) * 100}%` }}
                  />
                </div>
              )}
              <div className="p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent/80">Up Next</p>
                <div className="mt-3 flex gap-3">
                  {/* Poster thumbnail for next episode */}
                  {poster && (
                    <div className="h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-white/5">
                      <img src={poster} alt="" className="h-full w-full object-cover opacity-80" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-semibold text-white">{nextQueueItem.title}</h3>
                    {nextQueueItem.subtitle && <p className="mt-0.5 truncate text-sm text-white/60">{nextQueueItem.subtitle}</p>}
                  </div>
                </div>
                <p className="mt-3 text-sm text-white/50">
                  {upNextCountdown != null ? `Playing in ${upNextCountdown}s` : 'Auto-play is off.'}
                </p>
                <div className="mt-4 flex gap-3">
                  <button onClick={playNextInQueue} className="btn-primary flex-1 gap-1.5">
                    <Play className="h-4 w-4" aria-hidden="true" /> Play Now
                  </button>
                  <button onClick={closeUpNext} className="btn-secondary flex-1">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Keyboard shortcuts help - Floating overlay */}
        {showKeyboardHelp && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in" onClick={() => setShowKeyboardHelp(false)}>
            <div className="mx-4 w-full max-w-xl rounded-2xl border border-white/15 bg-black/80 p-6 backdrop-blur-2xl animate-scale-in" onClick={(event) => event.stopPropagation()}>
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Keyboard Shortcuts</h3>
                <button onClick={() => setShowKeyboardHelp(false)} className="cursor-pointer p-1 text-white/40 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">
                {[
                  ['Space / K', 'Play / Pause'],
                  ['\u2190 / \u2192', 'Seek \u00b110s'],
                  ['Shift+\u2190 / \u2192', 'Seek \u00b130s'],
                  ['\u2191 / \u2193', 'Volume'],
                  ['M', 'Mute'],
                  ['C', 'Cycle subtitles'],
                  ['F', 'Fullscreen'],
                  ['T', 'Theater mode'],
                  ['P', 'Picture-in-Picture'],
                  ['< / >', 'Playback speed'],
                  ['J / L', 'Seek \u00b110s'],
                  ['Esc', 'Exit / Back'],
                  ['?', 'Shortcut help'],
                ].map(([key, action]) => (
                  <div key={key} className="flex items-center justify-between py-1.5">
                    <span className="text-xs text-white/50">{action}</span>
                    <kbd className="ml-2 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-xs text-white/70">{key}</kbd>
                  </div>
                ))}
              </div>
              <div className="mt-5 border-t border-white/10 pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/30">Touch / Mouse Gestures</p>
                <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">
                  {[
                    ['Double-tap L/R', 'Skip \u00b110s'],
                    ['Long press', '2x speed'],
                    ['Swipe up (right)', 'Volume up'],
                    ['Swipe down (right)', 'Volume down'],
                  ].map(([gesture, action]) => (
                    <div key={gesture} className="flex items-center justify-between py-1.5">
                      <span className="text-xs text-white/50">{action}</span>
                      <span className="ml-2 text-xs text-white/30">{gesture}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function SettingsPanelShell({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <div className="py-2">
      <button onClick={onBack} className="flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-left text-sm text-white/60 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> {title}
      </button>
      <div className="my-1 border-t border-white/10" />
      {children}
    </div>
  );
}

function SettingsListButton({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button onClick={onClick} className={`flex w-full cursor-pointer items-center justify-between px-4 py-2.5 text-left text-sm transition-colors ${active ? 'bg-accent/10 text-accent' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}>
      {children}
    </button>
  );
}

function SettingsMenuItem({
  icon,
  label,
  value,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white">
      {icon}
      <span className="flex-1 text-left">{label}</span>
      <span className="text-xs text-white/40">{value}</span>
      <ChevronRight className="h-3.5 w-3.5 text-white/30" />
    </button>
  );
}

function DiagnosticRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.04] px-3 py-2">
      <span className="text-white/55">{label}</span>
      <span className="font-medium text-white">{value}</span>
    </div>
  );
}
