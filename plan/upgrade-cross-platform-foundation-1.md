---
goal: Cross-platform monorepo foundation and product hardening for NovaCast
version: 1.0
date_created: 2026-03-21
last_updated: 2026-03-21
owner: GitHub Copilot
status: In progress
tags: [upgrade, architecture, feature, mobile, tv, roku, web, firebase]
---

# Introduction

![Status: In progress](https://img.shields.io/badge/status-In_progress-yellow)

This plan upgrades the repository from a web-first prototype into a cross-platform monorepo with shared contracts, shared UI primitives, Firebase environment wiring, and platform-specific app shells for mobile, Android TV, Samsung TV reuse, and Roku. The plan is intentionally executable in phases while preserving the already-working web application.

## 1. Requirements & Constraints

- **REQ-001**: Keep the existing `apps/web` application working and buildable.
- **REQ-002**: Add missing workspaces from the approved product plan: `apps/mobile`, `apps/tv`, `apps/roku`, and `packages/ui`.
- **REQ-003**: Establish a root environment contract for Firebase with safe placeholders.
- **REQ-004**: Provide production-grade repository documentation for local development and platform packaging.
- **REQ-005**: Reuse `packages/core` and `packages/firebase` for all platform app shells.
- **REQ-006**: Keep the monorepo scalable with explicit workspace ownership and platform boundaries.
- **SEC-001**: Do not commit real Firebase credentials.
- **SEC-002**: Avoid embedding secrets in Roku or TV source files.
- **CON-001**: Native platform SDKs, signing certificates, and physical devices are not available in this environment.
- **CON-002**: Store submission, Tizen packaging, Expo EAS builds, and Roku sideload validation cannot be executed end-to-end here.
- **GUD-001**: Prefer deterministic, typed configuration and shared design tokens.
- **PAT-001**: Keep platform-specific UI in app workspaces and shared logic in packages.

## 2. Implementation Steps

### Implementation Phase 1

- **GOAL-001**: Document the repo, environment contract, and platform architecture.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Create `/plan/upgrade-cross-platform-foundation-1.md` with atomic execution steps. | ✅ | 2026-03-21 |
| TASK-002 | Add root `.env` and `.env.example` placeholders for Firebase and platform configuration. |  |  |
| TASK-003 | Add `README.md` with workspace overview, run instructions, and platform notes. |  |  |
| TASK-004 | Add Samsung/Tizen and Roku developer documentation under `/docs/`. |  |  |

### Implementation Phase 2

- **GOAL-002**: Establish shared UI and configuration primitives.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-005 | Create `packages/ui` with shared theme tokens, navigation models, and platform metadata. |  |  |
| TASK-006 | Update `apps/web` to consume shared navigation metadata from `packages/ui`. |  |  |
| TASK-007 | Export shared platform constants for web, mobile, TV, and Roku shells. |  |  |

### Implementation Phase 3

- **GOAL-003**: Scaffold mobile and Android TV applications with shared architecture.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-008 | Create `apps/mobile` Expo-compatible shell with typed screens, navigation, and shared data hooks. |  |  |
| TASK-009 | Create `apps/tv` React Native TV shell with focus-aware home, detail, and player views. |  |  |
| TASK-010 | Add workspace package manifests and TypeScript configs for both apps. |  |  |
| TASK-011 | Add platform-specific setup docs for Expo mobile and React Native TV. |  |  |

### Implementation Phase 4

- **GOAL-004**: Scaffold Roku application and Samsung TV packaging artifacts.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-012 | Create `apps/roku` with `manifest`, `source/`, and `components/` SceneGraph shell. |  |  |
| TASK-013 | Implement BrightScript addon registry and minimal catalog client foundations. |  |  |
| TASK-014 | Add Tizen packaging files under `apps/web/tizen/`. |  |  |
| TASK-015 | Document sideload and certification-oriented workflows for Roku and Samsung TV. |  |  |

### Implementation Phase 5

- **GOAL-005**: Harden shared services and validate builds.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-016 | Harden `packages/firebase` initialization and collection keying behavior. |  |  |
| TASK-017 | Add environment-driven Firebase config helpers for the web app. |  |  |
| TASK-018 | Run typecheck/build validation for all buildable workspaces in this environment. |  |  |
| TASK-019 | Run browser validation against the local web app. |  |  |

## 3. Alternatives

- **ALT-001**: Delay creating missing workspaces until after Firebase auth is fully wired. Rejected because the repo would still not match the approved monorepo architecture.
- **ALT-002**: Create empty placeholder folders only. Rejected because it would not produce review-ready platform foundations.
- **ALT-003**: Attempt full native build pipelines for iOS, Android TV, Tizen, and Roku in this environment. Rejected because the required SDKs, certificates, and devices are unavailable.

## 4. Dependencies

- **DEP-001**: `pnpm` workspaces and `turbo` task orchestration
- **DEP-002**: `@novacast/core` for catalog, detail, player, and settings logic
- **DEP-003**: `@novacast/firebase` for auth and sync wrappers
- **DEP-004**: Expo / React Native / Roku SceneGraph platform toolchains for downstream local validation

## 5. Files

- **FILE-001**: `/README.md`
- **FILE-002**: `/.env`
- **FILE-003**: `/.env.example`
- **FILE-004**: `/packages/ui/**`
- **FILE-005**: `/apps/mobile/**`
- **FILE-006**: `/apps/tv/**`
- **FILE-007**: `/apps/roku/**`
- **FILE-008**: `/apps/web/tizen/**`
- **FILE-009**: `/packages/firebase/src/**`
- **FILE-010**: `/apps/web/src/**`

## 6. Testing

- **TEST-001**: Root `pnpm build` remains green for all buildable workspaces.
- **TEST-002**: Root `pnpm typecheck` remains green for all buildable workspaces.
- **TEST-003**: `apps/web` passes browser smoke validation for navigation, search, detail, player, addons, and settings.
- **TEST-004**: Newly added workspace manifests, configs, and docs resolve correctly in the monorepo.

## 7. Risks & Assumptions

- **RISK-001**: Native platform source can be review-ready without being runnable in this environment because SDK-specific setup is external.
- **RISK-002**: Roku code can be statically validated and documented here, but full device certification is out of scope.
- **ASSUMPTION-001**: Web remains the primary validated runtime in this environment.
- **ASSUMPTION-002**: Firebase credentials will be supplied later via environment files and store/platform secrets.

## 8. Related Specifications / Further Reading

- `/plan/upgrade-cross-platform-foundation-1.md`
- Attached product plan from chat session memory
- Expo docs: https://docs.expo.dev/get-started/start-developing/
- React Native TV docs: https://github.com/react-native-tvos/react-native-tvos
- Roku developer docs: https://developer.roku.com/docs/developer-program/getting-started/roku-dev-prog.md
- Samsung TV device docs: https://developer.samsung.com/smarttv/develop/getting-started/using-sdk/tv-device.html
