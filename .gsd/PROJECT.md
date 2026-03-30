# GSD VibeFlow

## What This Is

GSD VibeFlow is a native desktop application for managing Claude Code / GSD-2 projects. Built with Tauri 2.x (Rust backend + React frontend), it provides project management, terminal sessions (with tmux support), knowledge base browsing, GSD workflow integration, git operations, and more. It aims to be the desktop-native equivalent of the gsd-2 web app (`~/Github/gsd-2/web/`), providing full feature parity with that Next.js application while leveraging Tauri's native capabilities.

## Core Value

A single native desktop app that gives full visibility and control over GSD-2 managed projects — visualizer, chat mode, reports, diagnostics, and all /gsd command surfaces — without requiring the gsd-2 web server to be running.

## Current State

Full GSD-2 feature parity across data and UI layers is complete (M008 + M006). The app has 40+ Rust backend commands, a 7-tab visualizer (1,280 lines), HTML report generator, chat mode with PTY parsing (790-line parser), 15 sidebar views for GSD-2 projects with 5 tab-groups nesting ~26 total views, persistent status bar, file watcher, and all prior functionality (health, headless, worktrees, milestones, slices, tasks, diagnostics, knowledge/captures, session browsing, settings).

Visual redesign complete (M009): cool-blue 220° palette, desaturated status colors, flat single-variant cards, thin-border sidebar with text-only nav, tightened animations, dead CSS cleanup. Both dark and light themes calibrated.

M010 complete: Full 6-section project-pulse dashboard (active unit with live timer, 4 metric cards, slice progress, phase breakdown, activity feed, git status). 11 project templates with multi-step creation wizard (template → GSD planning → details → scaffold → auto-import). Rust markdown stripping (bold/italic/code/underline) and one-liner extraction from SUMMARY.md body. Consistent ViewEmpty empty states across all GSD-2 tabs. File watcher invalidates all GSD-2 query keys on .gsd/ changes.

M012 complete (Guided Mode): guided/expert toggle in settings, first-launch setup wizard with parallel dependency detection (8 CLI tools), provider API key validation/storage via OS keychain, and Guided/Expert mode selection. App startup gates on onboarding completion flag.

M013 in progress (Feature Coverage Maximization): Systematic audit of every page/view to surface all available backend capabilities. Major targets: GitHub integration (967-line Rust backend fully implemented but never registered), GSD-2 session browser and preferences editor, dashboard/visualizer data expansion, knowledge tab search/bookmarks, GSD-1 view expansion, and wiring all 16 unused hooks.

## Architecture / Key Patterns

- **Two-process model:** React frontend communicates with Rust backend via Tauri `invoke()` IPC
- **Data layer:** Rust commands read `.gsd/` files directly. TanStack Query hooks in `lib/queries.ts` wrap invocations with caching/polling. Query keys in `lib/query-keys.ts`.
- **Nav-rail views:** `src/lib/project-views.ts` defines all views. `ViewRenderer` in `project.tsx` switches between them. Each view is a dedicated component.
- **Tab groups:** 5 group containers (`gsd2-tab-groups.tsx`) nest related sub-views: Progress (visualizer/dashboard/roadmap/activity), Planning (milestones/slices/tasks), Metrics (history/export/reports), Commands (inspect/steer/hooks/undo/git/recovery), Diagnostics (doctor/forensics/skills/knowledge).
- **File watcher:** `use-gsd-file-watcher.ts` detects `.gsd/` changes and invalidates query caches.
- **Styling:** Tailwind CSS + shadcn/ui. HSL CSS variables (31 custom properties across `.dark` and `.light` blocks). Cool-blue 220° hue foundation. 6px (0.375rem) border radius globally.
- **Path alias:** `@/*` maps to `./src/*`

## Capability Contract

See `.gsd/REQUIREMENTS.md` for the explicit capability contract, requirement status, and coverage mapping.

## Milestone Sequence

- [x] M005: End-to-End Polish
- [x] M007: Visual Redesign — Linear-Inspired Retheme
- [x] M008: GSD-2 Feature Parity (Data Layer)
- [x] M006: GSD-2 Feature Parity (Interactive Surfaces)
- [x] M009: Visual Redesign & Navigation Overhaul
- [x] M010: Feature Maximization — Dashboard, Templates & Rendering Fixes
- [x] M012: Guided Mode — Wizard-Driven Experience for New Users
- [ ] M013: Feature Coverage Maximization — Surface Every Available Capability
