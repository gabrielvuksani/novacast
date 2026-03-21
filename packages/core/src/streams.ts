import type {
  RankedStream,
  SourceAnalysis,
  Stream,
  StreamFormat,
  StreamPlaybackKind,
} from './types';

function readQualityScore(label: string) {
  if (/2160|4k|uhd/i.test(label)) return { score: 44, label: '4K' };
  if (/1440/i.test(label)) return { score: 34, label: '1440p' };
  if (/1080/i.test(label)) return { score: 26, label: '1080p' };
  if (/720/i.test(label)) return { score: 18, label: '720p' };
  if (/480/i.test(label)) return { score: 10, label: '480p' };
  if (/360/i.test(label)) return { score: 6, label: '360p' };
  return { score: 0, label: undefined };
}

function formatSize(bytes?: number) {
  if (!bytes || !Number.isFinite(bytes) || bytes <= 0) return undefined;
  const gb = bytes / (1024 * 1024 * 1024);
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}

export function getStreamKey(stream: Stream) {
  return stream.url || stream.externalUrl || stream.ytId || stream.infoHash || stream.name || JSON.stringify(stream);
}

export function detectStreamFormat(stream: Stream): StreamFormat {
  if (stream.infoHash) return 'torrent';
  if (stream.externalUrl) return 'external';
  if (stream.ytId) return 'youtube';

  const url = stream.url || '';
  if (/\.m3u8($|\?)/i.test(url)) return 'hls';
  if (/\.mpd($|\?)/i.test(url)) return 'dash';
  if (/\.(mp4|webm|mkv|mov|m4v)($|\?)/i.test(url)) return 'file';
  return stream.url ? 'unknown' : 'unknown';
}

export function isLikelyLiveStream(stream: Stream) {
  return /live|sports|channel|match|event|24\/7/i.test(
    `${stream.name || ''} ${stream.description || ''} ${stream.url || ''}`,
  );
}

export function analyzeStream(stream: Stream): SourceAnalysis {
  const format = detectStreamFormat(stream);
  const hasProxyRequirements = Boolean(
    stream.behaviorHints?.proxyHeaders?.request || stream.behaviorHints?.proxyHeaders?.response,
  );
  const isWebReady = Boolean(
    stream.url
    && !stream.behaviorHints?.notWebReady
    && !hasProxyRequirements
    && format !== 'torrent'
    && format !== 'youtube'
    && format !== 'external',
  );

  let playback: StreamPlaybackKind = 'unsupported';
  if (isWebReady) playback = 'internal';
  else if (stream.externalUrl || stream.ytId) playback = 'external';

  const qualitySource = `${stream.name || ''} ${stream.description || ''} ${stream.behaviorHints?.filename || ''}`;
  const quality = readQualityScore(qualitySource);
  const isLive = isLikelyLiveStream(stream);

  let score = 0;
  if (playback === 'internal') score += 180;
  if (playback === 'external') score += 90;
  if (format === 'hls') score += 52;
  if (format === 'dash') score += 48;
  if (format === 'file') score += 44;
  if (format === 'unknown' && playback === 'internal') score += 30;
  if (isLive && playback === 'internal') score += 22;
  if (stream.subtitles?.length) score += Math.min(stream.subtitles.length * 2, 8);
  if (stream.behaviorHints?.videoSize) score += Math.min(stream.behaviorHints.videoSize / (1024 * 1024 * 1024), 8);
  score += quality.score;
  if (stream.behaviorHints?.notWebReady) score -= 80;
  if (hasProxyRequirements) score -= 60;
  if (stream.behaviorHints?.countryWhitelist?.length) score -= 10;
  if (format === 'torrent') score -= 120;

  const warnings: string[] = [];
  const badges: string[] = [];

  if (isLive) badges.push('LIVE');
  if (quality.label) badges.push(quality.label);
  if (format === 'hls') badges.push('HLS');
  if (format === 'dash') badges.push('DASH');
  if (format === 'file') badges.push('DIRECT');
  if (stream.subtitles?.length) badges.push(`${stream.subtitles.length} SUBS`);
  if (format === 'external') badges.push('EXTERNAL');
  if (format === 'youtube') badges.push('YOUTUBE');
  if (format === 'torrent') badges.push('TORRENT');

  if (stream.behaviorHints?.notWebReady) warnings.push('Marked as not web-ready by the addon.');
  if (hasProxyRequirements) warnings.push('Requires proxy headers that browsers may not honor.');
  if (stream.behaviorHints?.countryWhitelist?.length) warnings.push('Availability may depend on region restrictions.');

  return {
    id: getStreamKey(stream),
    format,
    playback,
    isLive,
    isWebReady,
    requiresProxy: hasProxyRequirements,
    qualityLabel: quality.label,
    sizeLabel: formatSize(stream.behaviorHints?.videoSize),
    score,
    badges,
    warnings,
    primaryLabel:
      stream.name
      || quality.label
      || (playback === 'internal' ? 'Best available source' : playback === 'external' ? 'Open externally' : 'Unsupported source'),
    secondaryLabel: stream.description || undefined,
  };
}

export function compareStreamPriority(left: Stream, right: Stream) {
  return analyzeStream(right).score - analyzeStream(left).score;
}

export function rankStreams(streams: Stream[]): RankedStream[] {
  return streams
    .map((stream, originalIndex) => ({
      ...stream,
      originalIndex,
      analysis: analyzeStream(stream),
    }))
    .sort((left, right) => right.analysis.score - left.analysis.score);
}

export function pickBestStream(streams: Stream[]) {
  return rankStreams(streams)[0] ?? null;
}

export function bucketStream(stream: Stream) {
  const analysis = analyzeStream(stream);
  if (analysis.playback === 'internal') return 'playable';
  if (analysis.playback === 'external') return 'external';
  return 'unsupported';
}