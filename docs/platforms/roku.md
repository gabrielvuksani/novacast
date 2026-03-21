# Roku Development Guide

## Workspace

The Roku implementation lives in `apps/roku` and uses:
- BrightScript for behavior
- SceneGraph XML for UI

## Local prerequisites

1. Enable developer mode on a Roku device
2. Install the BrightScript VS Code extension
3. Ensure the device and workstation are on the same network
4. Package and sideload the app from the `apps/roku` folder

## Current implementation scope

- App manifest
- Entry point (`source/main.brs`)
- Main scene and view composition
- Addon registry service
- Catalog client foundation using Roku HTTP APIs

## Important constraints

- Firebase browser/mobile SDKs are not used on Roku
- Any auth or sync integration should rely on server-safe APIs or REST endpoints
- Secret values must not be embedded in BrightScript source

## Recommended next steps

- Add a packaging script or CI zip task
- Add BrightScript linting/type-checking via `brighterscript`
- Test sideloading on a physical Roku device
