// ---------------------------------------------------------------------------
// NovaCast Brand Identity
// ---------------------------------------------------------------------------

export const appBrand = {
  name: 'NovaCast',
  shortName: 'Nova',
  tagline: 'Your universe of entertainment.',
  description:
    'NovaCast is a premium streaming client that unifies your favorite sources into one seamless, cinematic experience across every screen you own.',
  heroSubtitle: 'One app. Every source. Infinite possibilities.',
  legalBoundary:
    'NovaCast is a client application. It does not host, distribute, or index any media content, addons, or streams. Users bear sole responsibility for the sources they connect and must comply with all applicable laws in their jurisdiction.',
  heroHighlights: [
    'Adaptive playback engine',
    'Bring your own sources',
    'Cross-device sync',
    'Cinematic interface',
  ],
} as const;

export const featureHighlights = [
  {
    id: 'unified-library',
    icon: 'library',
    title: 'Unified Library',
    description: 'All your sources in one place. Browse a single catalog built from every addon you install.',
  },
  {
    id: 'adaptive-player',
    icon: 'play',
    title: 'Adaptive Player',
    description: 'Multi-format playback engine with HLS, DASH, and direct stream support. Automatic quality switching.',
  },
  {
    id: 'cross-device',
    icon: 'devices',
    title: 'Watch Everywhere',
    description: 'Seamless handoff between phone, tablet, desktop, and TV. Pick up right where you left off.',
  },
  {
    id: 'smart-search',
    icon: 'search',
    title: 'Smart Search',
    description: 'Search across all installed discovery sources at once. Find anything in seconds.',
  },
  {
    id: 'live-channels',
    icon: 'live',
    title: 'Live & Linear',
    description: 'Tune into live channels, sports feeds, and event streams from compatible sources.',
  },
  {
    id: 'personalized',
    icon: 'sparkle',
    title: 'Made for You',
    description: 'Continue watching, smart recommendations, and watchlist sync tailored to your viewing habits.',
  },
] as const;

export const themeOptions = [
  {
    id: 'dark',
    label: 'Nova Dark',
    description: 'The signature NovaCast experience with balanced contrast and aurora accents.',
  },
  {
    id: 'midnight',
    label: 'Midnight Orbit',
    description: 'Deeper tones optimized for living-room and low-light viewing.',
  },
  {
    id: 'amoled',
    label: 'OLED Void',
    description: 'True black surfaces for maximum vibrancy on OLED and MicroLED panels.',
  },
] as const;

export const addonWorkflowPillars = [
  {
    id: 'discovery',
    icon: 'compass',
    label: 'Discovery',
    description: 'Catalog and metadata addons that power browsing, search, and recommendations.',
  },
  {
    id: 'playback',
    icon: 'play-circle',
    label: 'Playback',
    description: 'Stream resolver addons that return HLS, DASH, or direct video sources.',
  },
  {
    id: 'captions',
    icon: 'subtitles',
    label: 'Captions',
    description: 'Subtitle addons for multilingual playback, accessibility, and forced narratives.',
  },
] as const;

export const versionInfo = {
  current: '0.1.0',
  codename: 'Aurora',
  releaseChannel: 'alpha' as const,
} as const;

export const communityLinks = {
  website: 'https://novacast.app',
  github: 'https://github.com/novacast',
  discord: 'https://discord.gg/novacast',
  twitter: 'https://x.com/novacast',
  docs: 'https://docs.novacast.app',
} as const;

export type FeatureHighlight = (typeof featureHighlights)[number];
export type ThemeOption = (typeof themeOptions)[number];
export type AddonPillar = (typeof addonWorkflowPillars)[number];
