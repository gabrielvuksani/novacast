// ---------------------------------------------------------------------------
// NovaCast Design System — Theme Tokens
// A premium, cinematic design language for a next-generation streaming client.
// ---------------------------------------------------------------------------

// ── Color Palette ──────────────────────────────────────────────────────────

export const colorTokens = {
  // Backgrounds — warm-tinted deep navy, NOT pure cold blue
  bgCanvas: '#06080f',
  bgPrimary: '#0c101c',
  bgSecondary: '#131828',
  bgTertiary: '#1a2035',
  bgElevated: '#212942',
  bgHover: '#2a3352',
  bgOverlay: 'rgba(6, 8, 15, 0.82)',
  bgScrim: 'rgba(6, 8, 15, 0.60)',

  // Primary accent — cyan (signature NovaCast color)
  accent: '#67e8f9',
  accentHover: '#93f0ff',
  accentPressed: '#4dd8eb',
  accentSoft: 'rgba(103, 232, 249, 0.12)',
  accentMuted: 'rgba(103, 232, 249, 0.06)',
  accentGlow: 'rgba(103, 232, 249, 0.22)',

  // Secondary accent — warm violet
  secondary: '#a78bfa',
  secondaryHover: '#c4b5fd',
  secondarySoft: 'rgba(167, 139, 250, 0.14)',

  // Tertiary accent — coral rose
  tertiary: '#fb7185',
  tertiarySoft: 'rgba(251, 113, 133, 0.14)',

  // Warm highlight — amber gold
  warm: '#fbbf24',
  warmSoft: 'rgba(251, 191, 36, 0.14)',

  // Text
  textPrimary: '#f1f3f9',
  textSecondary: '#a8b2cc',
  textTertiary: '#6b7694',
  textDisabled: '#4a5268',
  textAccent: '#b6f5ff',
  textInverse: '#0c101c',

  // Borders
  border: '#1e2740',
  borderSubtle: '#171d30',
  borderHover: '#344163',
  borderFocus: '#67e8f9',

  // Semantic
  success: '#34d399',
  successSoft: 'rgba(52, 211, 153, 0.14)',
  warning: '#fbbf24',
  warningSoft: 'rgba(251, 191, 36, 0.14)',
  error: '#f87171',
  errorSoft: 'rgba(248, 113, 113, 0.14)',
  info: '#67e8f9',
  infoSoft: 'rgba(103, 232, 249, 0.12)',

  // Contextual
  live: '#ff5f7a',
  livePulse: 'rgba(255, 95, 122, 0.35)',
  rating: '#fbbf24',
  ratingHalf: '#b88a12',
  badge: '#a78bfa',
} as const;

// ── Aurora & Gradient System ───────────────────────────────────────────────

export const gradients = {
  // Signature gradients
  primary: 'linear-gradient(135deg, #67e8f9 0%, #a78bfa 100%)',
  hero: 'linear-gradient(135deg, #67e8f9 0%, #a78bfa 45%, #fb7185 100%)',
  warm: 'linear-gradient(135deg, #fbbf24 0%, #fb7185 100%)',
  sunset: 'linear-gradient(135deg, #fb7185 0%, #a78bfa 100%)',
  ocean: 'linear-gradient(180deg, #67e8f9 0%, #3b82f6 100%)',

  // Aurora overlays (for page backgrounds)
  auroraFull:
    'radial-gradient(ellipse at 20% 0%, rgba(103, 232, 249, 0.15) 0%, transparent 50%), ' +
    'radial-gradient(ellipse at 80% 10%, rgba(167, 139, 250, 0.12) 0%, transparent 45%), ' +
    'radial-gradient(ellipse at 50% 100%, rgba(251, 113, 133, 0.08) 0%, transparent 50%)',
  auroraSubtle:
    'radial-gradient(ellipse at 25% 0%, rgba(103, 232, 249, 0.08) 0%, transparent 50%), ' +
    'radial-gradient(ellipse at 75% 5%, rgba(167, 139, 250, 0.06) 0%, transparent 40%)',
  auroraCyan:
    'radial-gradient(ellipse at 30% 0%, rgba(103, 232, 249, 0.14) 0%, transparent 55%)',
  auroraViolet:
    'radial-gradient(ellipse at 70% 0%, rgba(167, 139, 250, 0.12) 0%, transparent 50%)',

  // Card & surface overlays
  cardSheen: 'linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(6, 8, 15, 0.90) 100%)',
  cardHover: 'linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, rgba(6, 8, 15, 0.85) 100%)',
  shimmer: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.04) 50%, transparent 100%)',

  // Text gradients (use with background-clip: text)
  textPrimary: 'linear-gradient(135deg, #67e8f9, #a78bfa)',
  textHero: 'linear-gradient(135deg, #67e8f9, #a78bfa, #fb7185)',
} as const;

// ── Spacing Scale ──────────────────────────────────────────────────────────

export const spacing = {
  px: 1,
  '0.5': 2,
  '1': 4,
  '1.5': 6,
  '2': 8,
  '3': 12,
  '4': 16,
  '5': 20,
  '6': 24,
  '8': 32,
  '10': 40,
  '12': 48,
  '16': 64,
  '20': 80,
  '24': 96,
  // Named aliases for backward compatibility
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/** Flat numeric spacing array for indexed access. */
export const spacingScale = [0, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96] as const;

// ── Typography ─────────────────────────────────────────────────────────────

export const fontFamilies = {
  sans: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  display: '"Plus Jakarta Sans", Inter, system-ui, sans-serif',
  mono: '"JetBrains Mono", "Fira Code", "SF Mono", Consolas, monospace',
} as const;

export const fontWeights = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
} as const;

export const typography = {
  fontFamily: fontFamilies.sans,
  displayFamily: fontFamilies.display,

  // Display — hero banners, splash screens
  displayLg: { fontSize: 48, lineHeight: 56, fontWeight: fontWeights.extrabold, letterSpacing: -0.5 },
  displaySm: { fontSize: 36, lineHeight: 44, fontWeight: fontWeights.bold, letterSpacing: -0.3 },

  // Headings
  h1: { fontSize: 30, lineHeight: 38, fontWeight: fontWeights.bold, letterSpacing: -0.2 },
  h2: { fontSize: 24, lineHeight: 32, fontWeight: fontWeights.semibold, letterSpacing: 0 },
  h3: { fontSize: 20, lineHeight: 28, fontWeight: fontWeights.semibold, letterSpacing: 0 },
  h4: { fontSize: 17, lineHeight: 24, fontWeight: fontWeights.semibold, letterSpacing: 0 },

  // Body
  bodyLg: { fontSize: 16, lineHeight: 24, fontWeight: fontWeights.regular, letterSpacing: 0 },
  body: { fontSize: 14, lineHeight: 20, fontWeight: fontWeights.regular, letterSpacing: 0 },
  bodySm: { fontSize: 13, lineHeight: 18, fontWeight: fontWeights.regular, letterSpacing: 0 },

  // UI
  label: { fontSize: 13, lineHeight: 16, fontWeight: fontWeights.medium, letterSpacing: 0.2 },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: fontWeights.medium, letterSpacing: 0.1 },
  overline: { fontSize: 11, lineHeight: 14, fontWeight: fontWeights.semibold, letterSpacing: 0.8 },
  badge: { fontSize: 10, lineHeight: 12, fontWeight: fontWeights.bold, letterSpacing: 0.4 },
} as const;

// ── Shadows ────────────────────────────────────────────────────────────────

export const shadows = {
  none: 'none',
  subtle: '0 1px 2px rgba(0, 0, 0, 0.25)',
  sm: '0 2px 4px rgba(0, 0, 0, 0.30)',
  md: '0 4px 12px rgba(0, 0, 0, 0.35)',
  lg: '0 8px 24px rgba(0, 0, 0, 0.40)',
  xl: '0 16px 48px rgba(0, 0, 0, 0.50)',
  inner: 'inset 0 1px 3px rgba(0, 0, 0, 0.30)',
  glow: '0 0 20px rgba(103, 232, 249, 0.25)',
  glowSm: '0 0 10px rgba(103, 232, 249, 0.15)',
  glowViolet: '0 0 20px rgba(167, 139, 250, 0.20)',
  glowWarm: '0 0 20px rgba(251, 113, 133, 0.18)',
} as const;

// ── Border Radius ──────────────────────────────────────────────────────────

export const radius = {
  none: 0,
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
} as const;

// ── Animation & Transitions ────────────────────────────────────────────────

export const animation = {
  duration: {
    instant: 75,
    fast: 150,
    normal: 250,
    slow: 400,
    slower: 600,
    entrance: 350,
    exit: 200,
  },
  easing: {
    default: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.27, 1.55)',
  },
  transition: {
    fast: '150ms cubic-bezier(0.25, 0.1, 0.25, 1)',
    normal: '250ms cubic-bezier(0.25, 0.1, 0.25, 1)',
    slow: '400ms cubic-bezier(0.25, 0.1, 0.25, 1)',
    color: '200ms ease',
    transform: '250ms cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
} as const;

// ── Z-Index Scale ──────────────────────────────────────────────────────────

export const zIndex = {
  hide: -1,
  base: 0,
  raised: 1,
  dropdown: 100,
  sticky: 200,
  overlay: 300,
  modal: 400,
  popover: 500,
  toast: 600,
  tooltip: 700,
  max: 9999,
} as const;

// ── Breakpoints ────────────────────────────────────────────────────────────

export const breakpoints = {
  xs: 0,
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
  tv: 1920,
} as const;

export const mediaQueries = {
  sm: `(min-width: ${breakpoints.sm}px)`,
  md: `(min-width: ${breakpoints.md}px)`,
  lg: `(min-width: ${breakpoints.lg}px)`,
  xl: `(min-width: ${breakpoints.xl}px)`,
  '2xl': `(min-width: ${breakpoints['2xl']}px)`,
  tv: `(min-width: ${breakpoints.tv}px)`,
  mobile: `(max-width: ${breakpoints.md - 1}px)`,
  tablet: `(min-width: ${breakpoints.md}px) and (max-width: ${breakpoints.lg - 1}px)`,
  desktop: `(min-width: ${breakpoints.lg}px)`,
  reducedMotion: '(prefers-reduced-motion: reduce)',
} as const;

// ── Opacity ────────────────────────────────────────────────────────────────

export const opacity = {
  transparent: 0,
  dim: 0.08,
  faint: 0.15,
  muted: 0.30,
  medium: 0.50,
  visible: 0.70,
  high: 0.85,
  opaque: 1,
} as const;

// ── Unified Theme Object ──────────────────────────────────────────────────

export const appTheme = {
  colors: colorTokens,
  gradients,
  spacing,
  spacingScale,
  typography,
  fontFamilies,
  fontWeights,
  shadows,
  radius,
  animation,
  zIndex,
  breakpoints,
  mediaQueries,
  opacity,
} as const;

export type AppTheme = typeof appTheme;
export type ColorTokens = typeof colorTokens;
export type Gradients = typeof gradients;
export type Shadows = typeof shadows;
export type Radius = typeof radius;
export type Animation = typeof animation;
export type ZIndex = typeof zIndex;
export type Breakpoints = typeof breakpoints;
export type Opacity = typeof opacity;
