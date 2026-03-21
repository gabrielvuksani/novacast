// ---------------------------------------------------------------------------
// NovaCast Navigation Definitions
// ---------------------------------------------------------------------------

export type NavIconKey =
  | 'home'
  | 'discover'
  | 'live'
  | 'search'
  | 'addons'
  | 'settings'
  | 'account'
  | 'watchlist'
  | 'downloads';

export interface NavItem {
  to: string;
  label: string;
  icon: NavIconKey;
  description?: string;
  badge?: 'dot' | 'count';
}

// ── Primary sidebar / desktop nav ──────────────────────────────────────────

export const primaryNavItems: NavItem[] = [
  {
    to: '/',
    label: 'Home',
    icon: 'home',
    description: 'Continue watching, featured picks, and personalized rows.',
  },
  {
    to: '/discover',
    label: 'Discover',
    icon: 'discover',
    description: 'Browse movies, series, and genres from your sources.',
  },
  {
    to: '/live',
    label: 'Live',
    icon: 'live',
    description: 'Live channels, sports, and event streams.',
    badge: 'dot',
  },
  {
    to: '/search',
    label: 'Search',
    icon: 'search',
    description: 'Find titles across all installed sources.',
  },
  {
    to: '/watchlist',
    label: 'Watchlist',
    icon: 'watchlist',
    description: 'Saved titles and bookmarked content.',
  },
  {
    to: '/addons',
    label: 'Addons',
    icon: 'addons',
    description: 'Install and manage discovery, playback, and subtitle sources.',
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: 'settings',
    description: 'Player, sync, appearance, and account preferences.',
  },
];

// ── Mobile bottom tab bar ──────────────────────────────────────────────────

export const mobileNavItems: NavItem[] = [
  {
    to: '/',
    label: 'Home',
    icon: 'home',
    description: 'Pick up where you left off.',
  },
  {
    to: '/discover',
    label: 'Discover',
    icon: 'discover',
    description: 'Browse your sources.',
  },
  {
    to: '/live',
    label: 'Live',
    icon: 'live',
    description: 'Live and sports streams.',
  },
  {
    to: '/search',
    label: 'Search',
    icon: 'search',
    description: 'Find anything.',
  },
  {
    to: '/auth',
    label: 'Account',
    icon: 'account',
    description: 'Sign in and sync.',
  },
];

// ── TV / 10-foot nav (simplified for remote control) ───────────────────────

export const tvNavItems: NavItem[] = [
  {
    to: '/',
    label: 'Home',
    icon: 'home',
    description: 'Continue watching and featured content.',
  },
  {
    to: '/discover',
    label: 'Discover',
    icon: 'discover',
    description: 'Browse all genres.',
  },
  {
    to: '/live',
    label: 'Live',
    icon: 'live',
    description: 'Live channels.',
  },
  {
    to: '/search',
    label: 'Search',
    icon: 'search',
    description: 'Search titles.',
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: 'settings',
    description: 'Preferences.',
  },
];
