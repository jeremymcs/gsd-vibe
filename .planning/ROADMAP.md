# Roadmap: GSD VibeFlow

## Milestones

- ✅ **v1.0 GSD-2 Integration** — Phases 1-7 (shipped 2026-03-21)
- 🚧 **v1.1 GSD VibeFlow Rebrand** — Phases 8-10 (in progress)

## Phases

<details>
<summary>✅ v1.0 GSD-2 Integration (Phases 1-7) — SHIPPED 2026-03-21</summary>

- [x] Phase 1: GSD-2 Backend Foundation (3/3 plans) — completed 2026-03-20
- [x] Phase 2: Health Widget, Adaptive UI, and Reactive Updates (2/2 plans) — completed 2026-03-21
- [x] Phase 3: Worktrees Panel (2/2 plans) — completed 2026-03-21
- [x] Phase 4: Headless Mode and Visualizer (3/3 plans) — completed 2026-03-21
- [x] Phase 5: GSD-2 Milestones, Slices, and Tasks UI (2/2 plans) — completed 2026-03-21
- [x] Phase 6: Reactive Updates and Headless Session Polish (1/1 plans) — completed 2026-03-21
- [x] Phase 7: Reactive Milestones/Slices/Tasks Invalidation (1/1 plans) — completed 2026-03-21

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

---

### 🚧 v1.1 GSD VibeFlow Rebrand (In Progress)

**Milestone Goal:** Rebrand the app from "Track Your Shit" to "GSD VibeFlow" with a full visual identity refresh matching gsd.build, and audit/remove all dead code.

- [x] **Phase 8: Identity, Strings, and Headers** - Rename everything: metadata, UI strings, and all source file headers (completed 2026-03-21)
- [x] **Phase 9: Visual Identity** - Apply gsd.build palette (black/white/cyan), new app icon, updated design tokens (completed 2026-03-21)
- [ ] **Phase 10: Dead Code Removal and Quality** - Remove unused commands/components/hooks/types, fix test failures, verify clean build

## Phase Details

### Phase 8: Identity, Strings, and Headers
**Goal**: The app is fully renamed — every metadata file, UI string, and source file header reads "GSD VibeFlow"
**Depends on**: Phase 7 (v1.0 complete)
**Requirements**: IDNT-01, IDNT-02, IDNT-04, STRN-01, STRN-02, STRN-03, STRN-04, HDRS-01, HDRS-02
**Success Criteria** (what must be TRUE):
  1. App window title displays "GSD VibeFlow" with no "Track Your Shit" text visible anywhere in the running UI (About dialog deferred -- IDNT-03 moved to future phase)
  2. tauri.conf.json, package.json, and Cargo.toml all declare "GSD VibeFlow" as the app name with the updated bundle identifier
  3. Every .rs and .ts/.tsx source file header reads "GSD VibeFlow - [purpose]" — zero legacy headers remain
  4. README.md and CLAUDE.md describe the app as "GSD VibeFlow" with no legacy name references
  5. A codebase-wide search for "Track Your Shit" returns zero results across all user-facing strings, page titles, and document.title calls
**Plans**: 3 plans

Plans:
- [ ] 08-01-PLAN.md — Update metadata files (tauri.conf.json, package.json, Cargo.toml, bundle identifier, keychain service)
- [ ] 08-02-PLAN.md — Replace all UI strings, page titles, doc comments; update README.md, CLAUDE.md, and website
- [ ] 08-03-PLAN.md — Bulk-update all .rs and .ts/.tsx source file headers; final verification

### Phase 9: Visual Identity
**Goal**: The app looks and feels like gsd.build — black/white/cyan palette, new icon at all sizes, updated CSS design tokens
**Depends on**: Phase 8
**Requirements**: VISL-01, VISL-02, VISL-03, VISL-04
**Success Criteria** (what must be TRUE):
  1. App renders with black background, white primary text, and cyan accent colors consistent with the gsd.build brand
  2. App icon appears correctly at all required sizes on macOS, Windows, and Linux (no placeholder or legacy icon)
  3. CSS design token names contain no references to the old brand; all palette tokens express the new black/white/cyan identity
  4. Splash/loading screen (if present) displays "GSD VibeFlow" branding using the new palette
**Plans**: 2 plans

Plans:
- [ ] 09-01-PLAN.md — Migrate CSS tokens to gsd.build palette, clean up Tailwind config, simplify theme system, sweep 33 files for brand class renames
- [ ] 09-02-PLAN.md — Create new GSD logomark icon SVG and generate all platform icon formats (PNG, ICNS, ICO)

### Phase 10: Dead Code Removal and Quality
**Goal**: The codebase ships clean — no dead code remains, the full test suite passes, and the build is error-free
**Depends on**: Phase 9
**Requirements**: DEAD-01, DEAD-02, DEAD-03, DEAD-04, QLTY-01, QLTY-02
**Success Criteria** (what must be TRUE):
  1. All 4 pre-existing test failures in projects.test.tsx and main-layout.test.tsx are resolved and `pnpm test` reports zero failures
  2. `pnpm build` completes with zero TypeScript errors and zero warnings after all changes
  3. No unused Rust commands remain registered in lib.rs without an active frontend caller
  4. No unused React components, hooks, or TypeScript types/interfaces remain in the source tree
**Plans**: TBD

Plans:
- [ ] 10-01: Audit and remove unused Rust commands (gsd2_detect_version post-import, gsd2_get_roadmap_progress) and orphaned files
- [ ] 10-02: Audit and remove unused React components, hooks, and TypeScript types; fix 4 pre-existing test failures; verify clean build

## Progress

**Execution Order:** 8 → 9 → 10

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. GSD-2 Backend Foundation | v1.0 | 3/3 | Complete | 2026-03-20 |
| 2. Health Widget, Adaptive UI, and Reactive Updates | v1.0 | 2/2 | Complete | 2026-03-21 |
| 3. Worktrees Panel | v1.0 | 2/2 | Complete | 2026-03-21 |
| 4. Headless Mode and Visualizer | v1.0 | 3/3 | Complete | 2026-03-21 |
| 5. GSD-2 Milestones, Slices, and Tasks UI | v1.0 | 2/2 | Complete | 2026-03-21 |
| 6. Reactive Updates and Headless Session Polish | v1.0 | 1/1 | Complete | 2026-03-21 |
| 7. Reactive Milestones/Slices/Tasks Invalidation | v1.0 | 1/1 | Complete | 2026-03-21 |
| 8. Identity, Strings, and Headers | 3/3 | Complete   | 2026-03-21 | - |
| 9. Visual Identity | 2/2 | Complete   | 2026-03-21 | - |
| 10. Dead Code Removal and Quality | v1.1 | 0/2 | Not started | - |
