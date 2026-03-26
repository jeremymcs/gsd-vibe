# GSD VibeFlow

## What This Is

GSD VibeFlow is a native Tauri desktop application for managing Claude Code projects. It provides project management, terminal sessions (with tmux support), knowledge base browsing, GSD workflow integration, git operations, and more. Built with Tauri 2.x (Rust backend + React 18 frontend).

## Core Value

VibeFlow is the definitive native GUI for gsd-2 — a complete desktop replacement for gsd-2's web dashboard, with full interactive parity (visibility AND command execution) powered by the headless PTY bridge.

## Current State

- **M005 COMPLETE.** Main branch has: Full M001+M002+M003+M004+M005 product. Light theme works across all views (32 CSS tokens, dark: variants on all palette colors). Consistent three-state pattern (skeleton/error/success) on all 12 data-fetching views. Toast feedback on all 18 user-facing mutations. Four CSS animation systems (shimmer skeleton, stagger-in lists, card hover lift, view crossfade) — all respecting prefers-reduced-motion. ARIA landmarks, focus-visible rings, aria-current markers on sidebar nav. Zero build warnings (frontend + backend): `pnpm build` 0 errors/0 chunk warnings, `cargo check --lib` 0 warnings. 146/146 tests pass. vendor-markdown chunk reduced from 1,282 KB to 362 KB via selective highlight.js imports. R040–R050 validated (10 requirements). App feels polished and ready to ship.
- **M007 IN PROGRESS.** Complete visual redesign — stripping the "gamer dashboard" aesthetic (cyan glows, gradient backgrounds, elevated shadow cards) and replacing with a Linear-inspired design language: warm neutral grays, flat surfaces with 1px borders, restrained cyan accent, tighter typography, minimal motion.

## Architecture / Key Patterns

- **Tauri 2.x IPC** — Frontend calls `invoke<T>("command_name", { args })` via `@tauri-apps/api`. Backend exposes `#[tauri::command]` functions with `State<Arc<DbPool>>`.
- **TanStack Query** — All data fetching through query hooks in `lib/queries.ts` with cache/polling/invalidation. Keys in `lib/query-keys.ts`.
- **SQLite (WAL mode)** — DbPool with 1 writer + 4 readers, round-robin distribution. Schema migrations on startup.
- **Styling** — Tailwind CSS + shadcn/ui, HSL CSS variables, dark mode via class strategy. Design tokens in globals.css.
- **PTY sessions** — `portable-pty` crate with optional tmux integration.
- **View routing** — URL `?view=<id>` persists active view; ViewProps interface is the base contract for all view components.
- **Path alias** — `@/*` maps to `./src/*`.

## Capability Contract

See `.gsd/REQUIREMENTS.md` for the explicit capability contract, requirement status, and coverage mapping.

## Milestone Sequence

- [x] M001-xgxgc1: Core Navigation & Daily-Driver Views — NavRail, dashboard, chat, power mode, command surface, roadmap/files/activity views
- [x] M002-45qrht: Diagnostics, Visualizer & Settings Surfaces — 7-tab visualizer, doctor/forensics/skill-health diagnostics, knowledge & captures, settings/prefs/model-routing/budget
- [x] M003-k8v2px: Onboarding, Session Management & Utilities — Onboarding wizard, session browser, export/import, update banner, undo, cleanup/maintenance
- [x] M004: Branch Reconciliation & Integration Verification — Merge diverged worktree branches, close settings gap, verify full wiring (225 tests, 40 gsd2 commands)
- [x] M005: End-to-End Polish — Light theme, consistent state patterns, micro-interactions, accessibility, bundle optimization, Rust cleanup
- [ ] M007: Visual Redesign — Linear-inspired retheme: warm neutral grays, flat surfaces, restrained accent, tighter typography, minimal motion
