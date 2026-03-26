# GSD VibeFlow

## What This Is

GSD VibeFlow is a native desktop application for managing Claude Code / GSD-2 projects. Built with Tauri 2.x (Rust backend + React frontend), it provides project management, terminal sessions (with tmux support), knowledge base browsing, GSD workflow integration, git operations, and more. It aims to be the desktop-native equivalent of the gsd-2 web app (`~/Github/gsd-2/web/`), providing full feature parity with that Next.js application while leveraging Tauri's native capabilities.

## Core Value

A single native desktop app that gives full visibility and control over GSD-2 managed projects — visualizer, chat mode, reports, diagnostics, and all /gsd command surfaces — without requiring the gsd-2 web server to be running.

## Current State

M008 (GSD-2 Feature Parity) partially completed — 3 of 9 slices delivered. The app now has:

- **39+ Rust `gsd2_*` backend commands**: All 10 new M008 commands implemented (inspect, steer read/write, undo, recovery, history, hooks, git summary, export progress, expanded visualizer data, HTML report generation, reports index). All registered in `lib.rs`.
- **Full 7-tab visualizer** (`gsd2-visualizer-tab.tsx`, 1,280 lines): Progress, Dependencies, Metrics, Timeline, Agent, Changes, Export tabs. Complete data shape with critical path (Kahn's BFS), agent activity, changelog entries, by-phase metrics.
- **HTML report generator**: `gsd2_generate_html_report` produces 12-section self-contained HTML (inlined CSS/JS, SVG DAGs). Reports tab accessible from GSD sidebar section.
- **Full TypeScript coverage**: 30+ new interfaces in `tauri.ts`, 11 new TanStack Query hooks in `queries.ts`, 9 new query key factories.
- **Prior functionality**: health, headless, worktrees, milestones, slices, tasks, diagnostics, knowledge/captures, session browsing, onboarding wizard, settings. Linear-inspired flat design (M007).

**Remaining gaps (M008 S04–S09 not executed):**
- Chat mode (PTY parser, message renderer, /gsd command bar) — S04
- Files view, activity feed, roadmap view, dual terminal — S05
- Command panels (history, hooks, inspect, steer, undo, export, git, recovery) — S06, but all backend commands are ready
- Dashboard metrics enhancements, status bar, file-watcher live updates — S07
- Onboarding wizard extensions — S08
- End-to-end integration verification — S09

## Architecture / Key Patterns

- **Two-process model:** React frontend communicates with Rust backend via Tauri `invoke()` IPC
- **Data layer:** Rust commands read `.gsd/` files directly. TanStack Query hooks in `lib/queries.ts` wrap invocations with caching/polling. Query keys in `lib/query-keys.ts`.
- **Nav-rail views:** `src/lib/project-views.ts` defines all views. `ViewRenderer` in `project.tsx` switches between them. Each view is a dedicated component.
- **File watcher:** `use-gsd-file-watcher.ts` detects `.gsd/` changes and can invalidate query caches.
- **Styling:** Tailwind CSS + shadcn/ui. HSL CSS variables. Linear-inspired flat design (M007). Both dark and light themes.
- **Path alias:** `@/*` maps to `./src/*`

## Capability Contract

See `.gsd/REQUIREMENTS.md` for the explicit capability contract, requirement status, and coverage mapping.

## Milestone Sequence

- [x] M005: End-to-End Polish
- [x] M007: Visual Redesign — Linear-Inspired Retheme
- [~] M008: GSD-2 Feature Parity — 3/9 slices complete (S01 backend commands, S02 7-tab visualizer, S03 HTML reports). S04–S09 (chat mode, files, command panels, dashboard, onboarding, integration) remain for next cycle.
- [ ] M009: GSD-2 Feature Parity (Phase 2) — Execute S04–S09: chat mode, files view, command panels, dashboard, onboarding extensions, integration verification
