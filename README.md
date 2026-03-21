# NovaCast

**Your universe of entertainment.**

NovaCast is a premium, cross-platform streaming client that unifies your favorite content sources into one seamless, cinematic experience. Browse movies, TV shows, and live sports from addon-based providers — all rendered through an advanced, feature-rich video player.

NovaCast does **not** host, distribute, or index any media content. Users bring their own sources and are responsible for compliance with applicable laws.

![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)
![React](https://img.shields.io/badge/React-19-61dafb)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4.0-38bdf8)
![License](https://img.shields.io/badge/License-Private-gray)

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Detailed Setup Guide](#detailed-setup-guide)
- [Project Structure](#project-structure)
- [Workspaces](#workspaces)
- [Configuration](#configuration)
- [Adding Content Sources](#adding-content-sources)
- [Video Player](#video-player)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Themes](#themes)
- [Authentication & Sync](#authentication--sync)
- [Platform Support](#platform-support)
- [Build & Development](#build--development)
- [Tech Stack](#tech-stack)
- [Legal](#legal)

---

## Features

### Streaming & Playback
- **Adaptive bitrate streaming** — HLS (`.m3u8`) via hls.js and MPEG-DASH (`.mpd`) via dash.js
- **Direct file playback** — MP4, WebM, and other browser-native formats
- **Ambient glow mode** — YouTube-style color-reactive background that samples the video frame
- **Theater mode** — Expanded player without going fullscreen
- **Picture-in-picture** — Continue watching while browsing
- **Quality selection** — Manual bitrate switching across all adaptive formats
- **Audio track selection** — Switch between multiple audio streams
- **Playback speed** — 0.25x to 2x with 8 presets
- **Subtitle support** — External VTT/SRT loading, manual upload, caption size scaling
- **Live stream awareness** — Real-time indicators, DVR controls, "Go Live" button
- **Auto source failover** — Automatically tries the next source if one fails
- **Resume playback** — Remembers your position across sessions
- **Wake lock** — Prevents screen sleep during playback
- **Media Session API** — Hardware media key integration (play/pause/skip from keyboard or OS)
- **Remote playback / Cast** — Chromecast and remote playback device support

### Content Discovery
- **Unified catalog** — Browse content from all your installed sources in one view
- **Smart search** — Instant cross-source search with recent query memory
- **Genre filtering** — Browse by genre with dynamic genre detection
- **Continue Watching** — Resume row with progress bars
- **My List** — Personal watchlist synced across devices
- **Live section** — Dedicated view for live channels, sports, and event feeds
- **Content detail pages** — Cinematic backdrop hero, metadata, season/episode browser
- **Stream ranking** — Intelligent scoring algorithm that prioritizes quality, format, and playability

### Design & UX
- **Cinematic dark UI** — Premium glass-morphism design with aurora gradient accents
- **3 theme variants** — Nova Dark, Midnight, OLED Black
- **Responsive layout** — Desktop sidebar, tablet collapsed, mobile bottom nav
- **Skeleton loading** — Content-shaped placeholders during data fetches
- **Empty states** — Helpful messaging when content isn't available yet
- **Toast notifications** — Non-blocking feedback for user actions
- **Accessibility** — ARIA labels, keyboard navigation, focus management, screen reader support

### Cross-Platform
- **Web** — Primary runtime (React 19 + Vite 6)
- **Mobile** — iOS & Android via Expo / React Native
- **TV** — Android TV / Fire TV with focus-driven 10-foot UI
- **Samsung TV** — Tizen packaging from the web build
- **Roku** — BrightScript / SceneGraph native shell

---

## Architecture

NovaCast is built as a **pnpm + Turborepo monorepo** with shared packages:

```
┌─────────────────────────────────────────────────┐
│                  Platform Shells                │
│  ┌───────┐ ┌────────┐ ┌──────┐ ┌────────────┐  │
│  │  Web  │ │ Mobile │ │  TV  │ │    Roku    │  │
│  └───┬───┘ └───┬────┘ └──┬───┘ └─────┬──────┘  │
│      │         │         │            │         │
│      └─────────┼─────────┘            │         │
│                ▼                      │         │
│  ┌─────────────────────────┐          │         │
│  │    @novacast/core       │◄─────────┘         │
│  │  stores, types, client  │                    │
│  └────────────┬────────────┘                    │
│               │                                 │
│  ┌────────────┴────────────┐                    │
│  │   @novacast/firebase    │                    │
│  │   auth + Firestore sync │                    │
│  └─────────────────────────┘                    │
│                                                 │
│  ┌─────────────────────────┐                    │
│  │     @novacast/ui        │                    │
│  │  theme, brand, nav      │                    │
│  └─────────────────────────┘                    │
└─────────────────────────────────────────────────┘
```

---

## Quick Start

```bash
# 1. Clone the repository
git clone <repo-url> novacast
cd novacast

# 2. Install dependencies
pnpm install

# 3. Set up environment
cp .env.example .env
# Edit .env with your Firebase credentials (optional)

# 4. Start the web app
pnpm --filter @novacast/web dev

# 5. Open in browser
open http://localhost:3000
```

---

## Detailed Setup Guide

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | >= 20 | JavaScript runtime |
| **pnpm** | >= 9.15 | Package manager (monorepo workspaces) |
| **Git** | Any | Version control |

#### Install pnpm (if not installed)

```bash
# Using npm
npm install -g pnpm

# Or using Homebrew (macOS)
brew install pnpm

# Or using Corepack (built into Node.js 16+)
corepack enable
corepack prepare pnpm@latest --activate
```

### Step 1: Clone and Install

```bash
git clone <repo-url> novacast
cd novacast
pnpm install
```

This installs all dependencies across every workspace (web, mobile, TV, Roku, core, firebase, ui).

### Step 2: Environment Configuration

```bash
cp .env.example .env
```

Open `.env` and configure:

```env
# ── Firebase (Optional) ──────────────────────────
# Required only if you want cross-device sync.
# NovaCast works fully offline without Firebase.

VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# ── Default Sources ──────────────────────────────
# Comma-separated manifest URLs seeded on first launch.
VITE_NOVACAST_DEFAULT_ADDONS=https://v3-cinemeta.strem.io/manifest.json,https://opensubtitles-v3.strem.io/manifest.json

# ── Feature Flags ────────────────────────────────
NOVACAST_ENABLE_FIREBASE_AUTH=false
```

> **Note:** NovaCast works without Firebase. All data (addons, settings, watchlist, history) persists to `localStorage` by default. Firebase adds optional cross-device sync.

### Step 3: Start Development

```bash
# Start the web app (primary runtime)
pnpm --filter @novacast/web dev
```

The dev server starts at **http://localhost:3000** with hot module replacement.

### Step 4: Add Content Sources

1. Open NovaCast in your browser
2. Navigate to **Sources** (puzzle icon in sidebar)
3. Click **Add Source**
4. Paste a manifest URL (e.g., `https://v3-cinemeta.strem.io/manifest.json`)
5. Click **Validate** to preview capabilities, then **Install**

For the best experience, install:
- **Discovery source** — provides content catalogs (movies, series, channels)
- **Playback source** — returns HLS, DASH, or direct video URLs
- **Subtitle source** — provides subtitle files (VTT/SRT)

### Step 5: Start Watching

1. Go to **Home** or **Discover**
2. Browse catalogs or search for content
3. Click a title to see its detail page
4. Select a stream source and click **Play**

### Step 6: Build for Production

```bash
# Build all workspaces
pnpm build

# Or build just the web app
pnpm --filter @novacast/web build
```

The production build outputs to `apps/web/dist/` — deploy it to any static hosting (Vercel, Netlify, Cloudflare Pages, etc.).

---

## Project Structure

```
novacast/
├── apps/
│   ├── web/                    # React 19 + Vite web app (primary)
│   │   ├── src/
│   │   │   ├── pages/          # Route pages (Home, Discover, Search, Detail, Player, Live, Addons, Settings, Auth)
│   │   │   ├── components/     # Shared UI (Layout, PosterCard, ContentRow, Toast, EmptyState, etc.)
│   │   │   ├── providers/      # React context (Auth, Store, hooks)
│   │   │   ├── hooks/          # Custom hooks (useDocumentTitle, useWakeLock)
│   │   │   ├── lib/            # Firebase initialization
│   │   │   ├── App.tsx         # Route definitions with code splitting
│   │   │   ├── main.tsx        # React DOM entry
│   │   │   └── index.css       # Tailwind + NovaCast design system
│   │   ├── public/             # Static assets
│   │   ├── tizen/              # Samsung TV packaging
│   │   └── vite.config.ts      # Bundler config
│   ├── mobile/                 # Expo / React Native (iOS + Android)
│   ├── tv/                     # React Native TV (Android TV / Fire TV)
│   └── roku/                   # BrightScript / SceneGraph
├── packages/
│   ├── core/                   # Shared business logic
│   │   ├── src/
│   │   │   ├── types.ts        # TypeScript types (Manifest, Meta, Stream, etc.)
│   │   │   ├── store.ts        # Zustand stores (addon, catalog, search, detail, player, settings, watchlist, history)
│   │   │   ├── client.ts       # Addon HTTP transport client
│   │   │   ├── streams.ts      # Stream ranking & analysis algorithm
│   │   │   ├── addons.ts       # Addon capability analysis, health checking
│   │   │   └── defaults.ts     # Default addon URLs, catalog helpers
│   ├── firebase/               # Firebase auth + Firestore sync
│   └── ui/                     # Design tokens, brand, navigation
│       ├── src/
│       │   ├── theme.ts        # Colors, gradients, spacing, typography, shadows, animations
│       │   ├── brand.ts        # App identity, taglines, feature highlights
│       │   ├── navigation.ts   # Nav items for web, mobile, and TV
│       │   └── platforms.ts    # Platform workspace metadata
├── docs/                       # Platform-specific guides
├── plan/                       # Implementation plans
├── .env.example                # Environment template
├── package.json                # Root workspace config
├── pnpm-workspace.yaml         # Workspace definitions
├── turbo.json                  # Build orchestration
└── tsconfig.json               # Root TypeScript config
```

---

## Workspaces

| Workspace | Package Name | Description |
|-----------|-------------|-------------|
| `apps/web` | `@novacast/web` | Primary web app — React 19, Vite 6, Tailwind 4 |
| `apps/mobile` | `@novacast/mobile` | Expo / React Native mobile shell |
| `apps/tv` | `@novacast/tv` | React Native TV shell (10-foot UI) |
| `apps/roku` | `@novacast/roku` | Roku SceneGraph / BrightScript shell |
| `packages/core` | `@novacast/core` | Addon protocol, stores, types, stream analysis |
| `packages/firebase` | `@novacast/firebase` | Firebase auth + Firestore sync wrappers |
| `packages/ui` | `@novacast/ui` | Design system tokens, brand identity, navigation |

---

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_FIREBASE_API_KEY` | No | Firebase Web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | No | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | No | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | No | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | No | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | No | Firebase web app ID |
| `VITE_NOVACAST_DEFAULT_ADDONS` | No | Comma-separated manifest URLs for first-launch seeding |
| `NOVACAST_ENABLE_FIREBASE_AUTH` | No | Enable/disable Firebase auth (`true`/`false`) |

All Firebase variables are optional. NovaCast works fully offline using `localStorage`.

---

## Adding Content Sources

NovaCast uses a **manifest-based addon protocol** compatible with Stremio addons. Each addon exposes:

| Endpoint | Purpose |
|----------|---------|
| `/manifest.json` | Addon metadata, capabilities, catalog definitions |
| `/catalog/{type}/{id}` | Content catalogs (movie, series, channel lists) |
| `/meta/{type}/{id}` | Detailed metadata for a single title |
| `/stream/{type}/{id}` | Playable stream URLs for a title |
| `/subtitles/{type}/{id}` | Subtitle files for a title |

### Source Roles

| Role | What it provides | Example |
|------|-----------------|---------|
| **Discovery** | Catalogs + metadata | Cinemeta |
| **Playback** | Stream URLs (HLS, DASH, direct) | Any stream-returning addon |
| **Captions** | Subtitle files | OpenSubtitles |
| **Hybrid** | Discovery + playback | Addons that do both |

### Playback Compatibility

For in-app streaming, sources must return browser-playable URLs:

| Format | Support | Library |
|--------|---------|---------|
| HLS (`.m3u8`) | Full | hls.js |
| DASH (`.mpd`) | Full | dash.js |
| MP4 / WebM | Native | HTML5 video |
| External URLs | Opens in new tab | — |
| Torrent magnet links | Displayed, not playable | — |

---

## Video Player

The NovaCast player is a custom-built, full-featured streaming player with:

### Controls
- Play/pause, seek (10s/30s skip), volume with vertical slider popup
- Quality picker, speed selector, audio track switcher
- Subtitle selection with caption size scaling (85%–130%)
- Source switcher when multiple streams are available
- Fullscreen, theater mode, and picture-in-picture toggles

### Advanced Features
- **Ambient Glow** — Canvas-based color sampling creates a reactive glow behind the video
- **Theater Mode** — Wider player without fullscreen, toggled with `T`
- **Auto Next Episode** — Countdown overlay with poster thumbnail when an episode ends
- **Buffering Detection** — Spinner with automatic recovery and fallback to next source
- **Diagnostics Panel** — Real-time bandwidth, format, quality, and latency info (toggle in Settings)

### Touch Gestures
- Double-tap left/right sides to skip 10 seconds
- Long press for 2x speed boost
- Swipe up/down on right side for volume

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` / `K` | Play / Pause |
| `←` / `→` | Seek ±10 seconds |
| `Shift+←` / `Shift+→` | Seek ±30 seconds |
| `↑` / `↓` | Volume up / down |
| `M` | Mute / unmute |
| `F` | Toggle fullscreen |
| `T` | Toggle theater mode |
| `P` | Toggle picture-in-picture |
| `C` | Cycle subtitles |
| `J` / `L` | Seek ±10 seconds (alt) |
| `<` / `>` | Decrease / increase speed |
| `?` | Show keyboard shortcuts overlay |
| `Esc` | Exit fullscreen / close panel |

---

## Themes

NovaCast includes 3 dark theme variants:

| Theme | Description |
|-------|-------------|
| **Nova Dark** | Default — balanced contrast with deep navy backgrounds |
| **Midnight** | Deeper blacks for low-light viewing |
| **OLED Black** | Pure black backgrounds optimized for OLED displays |

Switch themes in **Settings > Appearance**.

---

## Authentication & Sync

NovaCast supports optional Firebase authentication for cross-device sync:

### What syncs
- Installed sources (addons)
- User preferences (theme, quality, etc.)
- Watchlist
- Watch history with playback progress

### Sync behavior
- **No Firebase:** Everything persists to `localStorage` on the current device
- **With Firebase:** Two-way sync between `localStorage` and Firestore, with conflict prevention
- **Auth methods:** Email/password and Google sign-in

### Setup
1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Authentication (Email/Password and Google providers)
3. Create a Firestore database
4. Copy your web app config values into `.env`
5. Set `NOVACAST_ENABLE_FIREBASE_AUTH=true`

---

## Platform Support

### Web (Primary)
The web app is the primary, fully validated runtime. Deploy to any static hosting.

```bash
pnpm --filter @novacast/web build
# Output: apps/web/dist/
```

### Mobile (Expo)
```bash
cd apps/mobile
npx expo start
```

### TV (Android TV / Fire TV)
```bash
cd apps/tv
npx expo start
```

### Samsung TV (Tizen)
```bash
pnpm --filter @novacast/web build:tizen
# Copies build to apps/web/tizen/ for Tizen Studio packaging
```

### Roku
See `docs/platforms/roku.md` for sideloading instructions.

---

## Build & Development

### Commands

| Command | Description |
|---------|-------------|
| `pnpm install` | Install all workspace dependencies |
| `pnpm dev` | Start all dev servers via Turborepo |
| `pnpm build` | Build all workspaces |
| `pnpm typecheck` | Type-check all workspaces |
| `pnpm clean` | Remove all build artifacts |
| `pnpm --filter @novacast/web dev` | Start only the web app |
| `pnpm --filter @novacast/web build` | Build only the web app |
| `pnpm --filter @novacast/core build` | Build only the core package |

### Build Pipeline

Turborepo handles build ordering automatically:

```
@novacast/ui     ─┐
@novacast/core   ─┤── @novacast/web
@novacast/firebase┘   @novacast/mobile
                      @novacast/tv
```

Shared packages build first, then platform shells build in parallel.

### Code Splitting

The web app uses Vite's code splitting with manual chunks:

| Chunk | Contents |
|-------|----------|
| `react-vendor` | React, React DOM, React Router |
| `hls` | hls.js library |
| `Player` | Player page (lazy loaded) |
| `Detail` | Detail page (lazy loaded) |
| Other pages | Each page is a separate lazy-loaded chunk |

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Language** | TypeScript | 5.7 |
| **Web Framework** | React | 19 |
| **Bundler** | Vite | 6 |
| **Styling** | Tailwind CSS | 4.0 |
| **State** | Zustand | 5.0 |
| **Routing** | React Router | 7 |
| **HLS** | hls.js | 1.5 |
| **DASH** | dash.js | 5.1 |
| **Validation** | Zod | 3.24 |
| **Auth** | Firebase | 11 |
| **Icons** | Lucide React | 0.460 |
| **Mobile** | Expo + React Native | 54 / 0.81 |
| **Monorepo** | Turborepo + pnpm | 2.4 / 9.15 |

---

## Legal

NovaCast is a **client application**. It does not host, distribute, or index any media content, addons, or streams. Users bear sole responsibility for the sources they connect and must comply with all applicable laws in their jurisdiction.

---

Built with care by the NovaCast team.
