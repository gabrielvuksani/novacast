# Mobile and TV Setup

## Mobile (`apps/mobile`)

This workspace is structured for Expo + React Native development.

### Recommended local setup

1. Install Node 20+
2. Install pnpm 9+
3. Run `pnpm install`
4. Fill in Firebase values in the root `.env`
5. Start Expo:
   - `pnpm --filter @novacast/mobile dev`
6. Open on device or simulator via Expo tooling

### Notes

- `EXPO_PUBLIC_*` variables are used for runtime-safe Firebase config
- Shared logic comes from `@novacast/core` and `@novacast/firebase`
- Design tokens and navigation metadata come from `@novacast/ui`

## TV (`apps/tv`)

This workspace is designed for Android TV / Fire TV using a React Native TV shell.

### Recommended local setup

1. Install Android Studio and an Android TV emulator
2. Install the React Native TV-compatible toolchain (`react-native-tvos` downstream)
3. Run `pnpm install`
4. Start Metro or platform-specific run commands as configured for your native environment

### Focus navigation guidance

- Use focusable `Pressable` components
- Prefer deterministic directional layout in rows/grids
- Keep the selected element visually obvious at 10-foot distance
- Reserve the player view for fullscreen playback and remote shortcuts

## Shared architectural guidance

- Do not duplicate addon protocol logic in apps
- Keep addon, search, detail, player, and settings state in shared packages
- Keep platform-specific input handling local to each app shell
