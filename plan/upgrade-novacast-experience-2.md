---
goal: Upgrade NovaCast into a polished, production-ready streaming client with stronger branding, source workflows, and advanced playback
version: 2.0
date_created: 2026-03-21
last_updated: 2026-03-21
owner: GitHub Copilot
status: Completed
tags: [upgrade, web, player, architecture, design, streaming, branding]
---

# Introduction

![Status: Completed](https://img.shields.io/badge/status-Completed-brightgreen)

This plan upgrades NovaCast from a capable prototype into a cohesive product release. The work keeps the existing route structure intact while improving shared contracts, stream analysis, addon onboarding, search memory, playback ergonomics, branding consistency, and the overall product feel across web-first surfaces and platform shells.

## 1. Requirements & Constraints

- **REQ-001**: Keep the existing `apps/web` runtime buildable and route-compatible.
- **REQ-002**: Preserve support for user-provided Stremio-compatible manifests without bundling infringing sources.
- **REQ-003**: Make NovaCast branding consistent across shared packages, web, mobile, TV, Roku, docs, and environment naming.
- **REQ-004**: Improve the advanced player with source selection, live diagnostics, wake lock support, and stronger next-episode behavior.
- **REQ-005**: Add user-facing workflows for missing playback addons, recent searches, and addon capability clarity.
- **REQ-006**: Keep state and heuristics centralized in `packages/core` wherever practical.
- **SEC-001**: Do not commit or expose real secrets.
- **SEC-002**: Do not recommend or hardcode unlawful or infringing addon sources.
- **CON-001**: Device-specific mobile, TV, Roku, and Tizen validation remains limited in this environment.
- **CON-002**: Live playback behavior varies by browser and stream implementation; features must degrade gracefully.
- **GUD-001**: Favor backwards-compatible migrations for legacy `STREAMIO_*` and `Stremio*` names.
- **PAT-001**: Keep routes stable and upgrade the internals of the current flows rather than restructuring the whole app.

## 2. Implementation Steps

### Implementation Phase 1

- **GOAL-001**: Complete the audit, external research, and product-direction definition.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Audit all relevant web, shared package, and platform-shell source files. | ✅ | 2026-03-21 |
| TASK-002 | Research HLS.js, dash.js, Media Session, Wake Lock, and addon protocol capabilities. | ✅ | 2026-03-21 |
| TASK-003 | Define a practical rollout that preserves existing routes and shared contracts. | ✅ | 2026-03-21 |

### Implementation Phase 2

- **GOAL-002**: Upgrade the shared NovaCast foundation in `packages/ui` and `packages/core`.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-004 | Add shared NovaCast brand metadata and richer design tokens in `packages/ui/src/brand.ts` and `packages/ui/src/theme.ts`. | ✅ | 2026-03-21 |
| TASK-005 | Add addon capability summaries and source analysis utilities in `packages/core/src/addons.ts` and `packages/core/src/streams.ts`. | ✅ | 2026-03-21 |
| TASK-006 | Extend shared types and defaults for player sources, queue items, recent searches, and compatibility env handling. | ✅ | 2026-03-21 |
| TASK-007 | Expand shared stores for recent searches, richer settings, and advanced player context in `packages/core/src/store.ts`. | ✅ | 2026-03-21 |

### Implementation Phase 3

- **GOAL-003**: Redesign the web shell and navigation experience around NovaCast branding.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-008 | Replace the current shell styling with a more distinctive NovaCast visual system in `apps/web/src/index.css`. | ✅ | 2026-03-21 |
| TASK-009 | Refresh the layout, identity, nav chrome, and shell messaging in `apps/web/src/components/Layout.tsx`. | ✅ | 2026-03-21 |
| TASK-010 | Add shared web UI primitives for branding and page structure where they reduce page duplication. | ✅ | 2026-03-21 |

### Implementation Phase 4

- **GOAL-004**: Improve browse, search, addon onboarding, and detail workflows.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-011 | Redesign `Home` to surface onboarding, playback readiness, hero content, and continue-watching value. | ✅ | 2026-03-21 |
| TASK-012 | Upgrade `Discover` and `Search` with recent searches, better filtering, and stronger empty states. | ✅ | 2026-03-21 |
| TASK-013 | Rework `Addons` into a lawful, capability-driven workflow for discovery, playback, and captions. | ✅ | 2026-03-21 |
| TASK-014 | Upgrade `Detail` with best-source ranking, grouped playback options, and missing-stream-addon guidance. | ✅ | 2026-03-21 |

### Implementation Phase 5

- **GOAL-005**: Ship the advanced production player pass.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-015 | Add wake lock lifecycle support and diagnostics-aware playback status in `apps/web/src/pages/Player.tsx`. | ✅ | 2026-03-21 |
| TASK-016 | Add source switching, better source analysis, and stronger live playback diagnostics in the player. | ✅ | 2026-03-21 |
| TASK-017 | Add playlist-aware next/previous episode behavior and up-next UI for episodic playback. | ✅ | 2026-03-21 |
| TASK-018 | Wire settings like quality, caption scale, diagnostics, latency mode, and automatic source failover into runtime playback behavior. | ✅ | 2026-03-21 |

### Implementation Phase 6

- **GOAL-006**: Clean up product naming, docs, and platform-shell consistency.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-019 | Remove legacy Streamio/Stremio branding from docs, env files, and visible platform metadata. | ✅ | 2026-03-21 |
| TASK-020 | Align mobile, TV, Roku, and packaging metadata to the NovaCast brand system. | ✅ | 2026-03-21 |
| TASK-021 | Validate builds, diagnostics, and final polish across the repo. | ✅ | 2026-03-21 |

### Implementation Phase 7

- **GOAL-007**: Future-proof lawful streaming workflows with live discovery and resilient playback recovery.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-022 | Add a dedicated `Live` route and navigation surface for live channels, event feeds, and sports-friendly catalogs. | ✅ | 2026-03-21 |
| TASK-023 | Add manifest validation previews and workflow blueprints to `apps/web/src/pages/Addons.tsx`. | ✅ | 2026-03-21 |
| TASK-024 | Add automatic source failover, manual retry, and remote playback hooks in `apps/web/src/pages/Player.tsx`. | ✅ | 2026-03-21 |

## 3. Alternatives

- **ALT-001**: Replace the player stack with a third-party UI/player framework. Rejected because the current custom player already has strong foundations and the existing HLS.js + dash.js stack is sufficient.
- **ALT-002**: Introduce a completely new route architecture for browse, library, and live TV. Rejected for this pass to reduce migration risk and keep the current flows stable.
- **ALT-003**: Add feature parity across mobile, TV, and Roku during the same pass. Rejected because the validated runtime is the web app and shell-level consistency is safer than device-specific rewrites here.

## 4. Dependencies

- **DEP-001**: `hls.js` for advanced HLS playback and low-latency/live data.
- **DEP-002**: `dash.js` v5 for MPEG-DASH playback and future content-steering support.
- **DEP-003**: Browser support for Media Session APIs, where available.
- **DEP-004**: Browser support for Screen Wake Lock APIs, where available.
- **DEP-005**: Stremio-compatible addon manifests supplied by users or trusted lawful providers.

## 5. Files

- **FILE-001**: `packages/ui/src/brand.ts` — shared NovaCast product metadata and theme options.
- **FILE-002**: `packages/ui/src/theme.ts` — expanded semantic brand tokens.
- **FILE-003**: `packages/core/src/addons.ts` — addon capability summaries.
- **FILE-004**: `packages/core/src/streams.ts` — stream/source analysis and ranking helpers.
- **FILE-005**: `packages/core/src/store.ts` — recent searches, richer player state, expanded settings.
- **FILE-006**: `apps/web/src/index.css` — redesigned NovaCast visual language.
- **FILE-007**: `apps/web/src/components/Layout.tsx` — shell/navigation redesign.
- **FILE-008**: `apps/web/src/pages/Home.tsx` — onboarding, readiness, and personalization upgrades.
- **FILE-009**: `apps/web/src/pages/Search.tsx` — recent search and search UX improvements.
- **FILE-010**: `apps/web/src/pages/Addons.tsx` — capability-driven addon management workflow.
- **FILE-011**: `apps/web/src/pages/Detail.tsx` — grouped source selection and playback conversion flow.
- **FILE-012**: `apps/web/src/pages/Player.tsx` — advanced player overhaul.
- **FILE-013**: `.env`, `.env.example`, `README.md`, `apps/roku/manifest` — naming cleanup and product metadata.
- **FILE-014**: `apps/web/src/pages/Live.tsx` — dedicated live/sports browsing surface.
- **FILE-015**: `apps/web/src/pages/Addons.tsx` — manifest validation previews and lawful setup blueprints.

## 6. Testing

- **TEST-001**: Typecheck all shared packages after the new types/store/state changes.
- **TEST-002**: Build the web app and verify route-level compile safety.
- **TEST-003**: Smoke test addon install, search, detail, and player workflows in the browser.
- **TEST-004**: Verify wake lock, Media Session, and low-latency features fail gracefully when unsupported.
- **TEST-005**: Validate recent-search persistence and local storage migrations.
- **TEST-006**: Verify automatic source failover and manual retry controls in the player.
- **TEST-007**: Validate the dedicated live discovery route compiles and renders from the web build.

## 7. Risks & Assumptions

- **RISK-001**: Player regressions are the highest-risk surface because source switching, auto-next, and runtime diagnostics touch the existing playback engine.
- **RISK-002**: Some addon streams may advertise web-ready playback but still require server behavior browsers cannot honor.
- **RISK-003**: Next-episode automation depends on addons returning consistent episode metadata.
- **ASSUMPTION-001**: Web remains the flagship runtime for this upgrade and receives the deepest implementation work.
- **ASSUMPTION-002**: Users provide lawful addon manifests and understand NovaCast does not host content.
- **ASSUMPTION-003**: Legacy names should remain readable for one compatibility window even if user-facing branding is fully switched to NovaCast.

## 8. Related Specifications / Further Reading

- `plan/upgrade-cross-platform-foundation-1.md`
- `docs/platforms/mobile-tv.md`
- `docs/platforms/roku.md`
- `docs/platforms/samsung-tizen.md`
- HLS.js API documentation
- dash.js documentation and feature overview
- MDN Media Session API documentation
- MDN Screen Wake Lock API documentation
