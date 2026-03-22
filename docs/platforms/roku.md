# NovaCast Roku — Setup & Deployment Guide

## Overview

The NovaCast Roku app is a full SceneGraph application that provides:
- **Home screen** with content rows (RowList) and hero banner
- **Detail screen** with metadata, genres, and stream source selection
- **Video player** with HLS, DASH, and MP4 playback via Roku's native Video node
- **Search** with keyboard input and poster grid results
- **Sources screen** showing installed addons with capabilities
- **Remote control navigation** with focus management and back-stack

## Prerequisites

1. **Roku device** with Developer Mode enabled
2. **Same Wi-Fi network** for your Roku and computer
3. **Node.js 20+** and **pnpm** installed

## Enable Developer Mode on Roku

1. Using your Roku remote, press: **Home 3x, Up 2x, Right, Left, Right, Left, Right**
2. A Developer Settings screen appears
3. **Enable the installer** and set a password
4. Note the **IP address** shown on screen (e.g., `192.168.1.100`)

## Install Dependencies

```bash
cd apps/roku
pnpm install
```

## Build the App

```bash
pnpm build
```

This compiles with BrighterScript and copies files to the `out/` staging directory.

## Deploy to Your Roku (Method 1: Browser Upload)

1. Build the app: `pnpm build`
2. Create the zip: `pnpm package` (creates `novacast-roku.zip`)
3. Open your browser and go to `http://<ROKU_IP>` (e.g., `http://192.168.1.100`)
4. Log in with username `rokudev` and the password you set
5. Click **Upload** and select `novacast-roku.zip`
6. Click **Install**

The app appears on your Roku home screen as "NovaCast".

## Deploy to Your Roku (Method 2: Command Line)

Set your Roku device credentials as environment variables:

```bash
export ROKU_HOST=192.168.1.100
export ROKU_PASSWORD=your_password
```

Then deploy:

```bash
pnpm deploy
```

This uses `roku-deploy` to automatically package and sideload the app.

## Using the App

### Remote Control Mapping

| Button | Action |
|--------|--------|
| **OK** | Select content / Play stream |
| **Back** | Go back to previous screen |
| **Play/Pause** | Play first available stream (on detail screen) |
| **Options (*)** | Open Sources screen |
| **Left/Right** | Navigate content rows |
| **Up/Down** | Navigate between rows / Move focus |

### Workflow

1. **Launch** — App loads default addons (Cinemeta + OpenSubtitles) and fetches catalogs
2. **Browse** — Navigate content rows on the home screen. The hero banner updates as you browse.
3. **Select** — Press OK on any title to see its detail page with metadata
4. **Play** — If playback sources are available, select one and press OK to start streaming
5. **Back** — Press Back to return to the previous screen

### Adding Playback Sources

The default addons (Cinemeta, OpenSubtitles) provide discovery and subtitles but not streams.
To actually play content, you need a playback addon that returns HLS/DASH/MP4 URLs.

The Roku app currently uses hardcoded default addon URLs in `AddonRegistry.brs`. To add your own:

1. Edit `apps/roku/source/services/AddonRegistry.brs`
2. Add your playback addon URL to the `defaultAddonUrls` array
3. Rebuild and redeploy

## Project Structure

```
apps/roku/
├── manifest                          # Roku app manifest (title, icons, version)
├── images/                           # Channel icons and splash screen
│   ├── icon_focus_hd.png            # 336x210 - focused channel icon
│   ├── icon_focus_sd.png            # 248x140 - SD focused icon
│   ├── icon_side_hd.png            # 108x69 - side channel icon
│   ├── icon_side_sd.png            # 80x46 - SD side icon
│   ├── splash_hd.png               # 1920x1080 - HD splash screen
│   └── splash_sd.png               # 720x480 - SD splash screen
├── source/
│   ├── main.brs                     # Entry point
│   └── services/
│       ├── HttpClient.brs           # HTTP GET with HTTPS certs and timeout
│       ├── AddonRegistry.brs        # Addon loading and capability parsing
│       ├── CatalogClient.brs        # Catalog API client
│       └── StreamClient.brs         # Stream, meta, and subtitle API client
├── components/
│   ├── MainScene.xml                # UI layout (home, detail, search, sources, player)
│   └── MainScene.brs                # App logic, navigation, playback
├── bsconfig.json                    # BrighterScript compiler config
└── package.json                     # Build scripts and dependencies
```

## Supported Stream Formats

| Format | Roku Support |
|--------|-------------|
| HLS (.m3u8) | Native — best compatibility |
| DASH (.mpd) | Native — requires firmware 7.6+ |
| MP4 (.mp4) | Native |
| WebM | Not supported on Roku |
| Torrent | Not supported on Roku |

HLS is the recommended format for Roku. Most addons that support web playback will also work on Roku.

## Troubleshooting

### App doesn't appear on home screen
- Make sure the zip contains files at the root level (manifest should be at the top, not inside a subfolder)
- Check that all icon images exist in the `images/` folder

### App crashes on launch
- Connect to Roku debug console: `telnet <ROKU_IP> 8085`
- Check for BrightScript errors in the console output
- Verify the manifest has all required icon entries

### No content loads
- Check that your Roku has internet access
- The default addons (Cinemeta) require HTTPS — verify SSL certificates work on your Roku firmware
- Try updating your Roku to the latest firmware

### Video won't play
- Ensure the stream URL returns HLS (.m3u8) or DASH (.mpd) format
- Roku requires HTTPS for video streams on newer firmware
- Check the debug console for playback errors

## Important Notes

- **No developer fee** — Sideloading to your own Roku is free
- **Sideloaded apps expire** after a reboot in some cases — just re-upload the zip
- **Publishing to the Roku Channel Store** requires a free Roku developer account and passing certification
- Firebase/cloud sync is not available on Roku — the app works independently with its hardcoded addon list
