# Samsung TV / Tizen Guide

## Strategy

Samsung TV support reuses the web app and packages it as a Tizen web application.

## Local prerequisites

1. Install Tizen Studio
2. Create a Samsung certificate profile
3. Enable Developer Mode on the TV
4. Connect the TV from Tizen Device Manager

## Project artifacts

- Base web app: `apps/web`
- Tizen packaging files: `apps/web/tizen`

## Recommended validation workflow

1. Run the web build:
   - `pnpm --filter @novacast/web build`
2. Copy or package the build output for the Tizen web container
3. Launch and debug through Tizen Studio
4. Validate remote navigation, focus visibility, back behavior, and fullscreen playback on device

## Important notes

- Emulator testing is useful, but real TV testing is strongly recommended
- Remote key behavior and fullscreen playback should be validated on actual hardware before release
