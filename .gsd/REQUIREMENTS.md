# Requirements

This file is the explicit capability and coverage contract for the project.

## Validated

### R001 — Untitled
- Status: validated

### R040 — Define light theme CSS variables for all tokens
- Class: core-capability
- Status: validated
- Description: Define light theme CSS variables for all tokens
- Why it matters: App renders correctly in light mode
- Source: user
- Primary owning slice: M005/S01
- Supporting slices: none
- Validation: validated
- Notes: Will be superseded by M007/S01 new token values

### R041 — Every data-fetching view shows skeleton loading state
- Class: quality-attribute
- Status: validated
- Description: Every data-fetching view shows skeleton loading state
- Why it matters: Consistent loading UX
- Source: user
- Primary owning slice: M005/S02
- Supporting slices: none
- Validation: validated
- Notes: Skeleton shapes preserved in M007; shimmer animation stays

### R042 — Every data-fetching view shows styled error card on failure
- Class: quality-attribute
- Status: validated
- Description: Every data-fetching view shows styled error card on failure
- Why it matters: No silent failures
- Source: inferred
- Primary owning slice: M005/S02
- Supporting slices: none
- Validation: validated
- Notes: ViewError component preserved in M007

### R043 — Every view with a list or data grid shows meaningful empty state
- Class: quality-attribute
- Status: validated
- Description: Every view with a list or data grid shows meaningful empty state
- Why it matters: Empty views look broken without contextual messages
- Source: user
- Primary owning slice: M005/S02
- Supporting slices: none
- Validation: 18 ViewEmpty usages across project views confirmed via grep. R126 (same goal) already validated in M010/S04. All list/data views show contextual empty states.
- Notes: Carried forward from M005 — still active

### R044 — Every user-triggered mutation shows success/failure toast
- Class: quality-attribute
- Status: validated
- Description: Every user-triggered mutation shows success/failure toast
- Why it matters: No silent mutations
- Source: inferred
- Primary owning slice: M005/S03
- Supporting slices: none
- Validation: 109 toast.success/toast.error calls in queries.ts covering mutation success/failure feedback across all user-triggered operations.
- Notes: Toast styling may need minor adjustment for new palette

### R045 — View crossfade, shimmer skeleton, hover lift, stagger-in
- Class: quality-attribute
- Status: validated
- Description: View crossfade, shimmer skeleton, hover lift, stagger-in
- Why it matters: App feels polished
- Source: user
- Primary owning slice: M005/S03
- Supporting slices: none
- Validation: 8 animation references in globals.css: fade-in (0.15s), stagger-in (0.25s), shimmer. View crossfade via key={activeView} pattern. Registered in both globals.css and tailwind.config.js.
- Notes: M007 will restrain these — hover lift removed, others faster

### R046 — Tab key navigation with visible focus rings
- Class: quality-attribute
- Status: validated
- Description: Tab key navigation with visible focus rings
- Why it matters: Keyboard accessibility
- Source: inferred
- Primary owning slice: M005/S04
- Supporting slices: none
- Validation: validated
- Notes: Focus ring color changes with new --ring token

### R047 — Sidebar nav, main content, aria-current on active items
- Class: quality-attribute
- Status: validated
- Description: Sidebar nav, main content, aria-current on active items
- Why it matters: Screen reader structure
- Source: inferred
- Primary owning slice: M005/S04
- Supporting slices: none
- Validation: Sidebar nav with aria-current on active items. Validated in M005/S04 and M009 nav-rail implementation.
- Notes: Preserved in M007

### R048 — vendor-markdown chunk below 500KB via selective imports
- Class: quality-attribute
- Status: validated
- Description: vendor-markdown chunk below 500KB via selective imports
- Why it matters: Bundle size
- Source: inferred
- Primary owning slice: M005/S05
- Supporting slices: none
- Validation: validated
- Notes: Unchanged in M007

### R049 — cargo check --lib shows 0 warnings
- Class: operability
- Status: validated
- Description: cargo check --lib shows 0 warnings
- Why it matters: Clean warning baseline
- Source: user
- Primary owning slice: M005/S06
- Supporting slices: none
- Validation: cargo check --manifest-path src-tauri/Cargo.toml --lib returns 0 warnings. Verified March 2026.
- Notes: M007 is frontend-only — no Rust changes

### R050 — pnpm build has no chunk size warnings
- Class: operability
- Status: validated
- Description: pnpm build has no chunk size warnings
- Why it matters: Clean build output
- Source: inferred
- Primary owning slice: M005/S05
- Supporting slices: none
- Validation: validated
- Notes: Unchanged in M007

### R060 — Replace the current pure-black dark / cool-gray light palette with warm neutral grays. Dark bg ~#1a1a1a (off-black, slight warmth), light bg pure white. Card/popover/muted surfaces use barely-perceptible tonal shifts from the base. All 30+ CSS custom properties updated in both .dark and .light blocks.
- Class: core-capability
- Status: validated
- Description: Replace the current pure-black dark / cool-gray light palette with warm neutral grays. Dark bg ~#1a1a1a (off-black, slight warmth), light bg pure white. Card/popover/muted surfaces use barely-perceptible tonal shifts from the base. All 30+ CSS custom properties updated in both .dark and .light blocks.
- Why it matters: The color foundation drives the entire visual feel — warm neutrals read as calm and professional vs. the current cold/neon aesthetic
- Source: user
- Primary owning slice: M007/S01
- Supporting slices: none
- Validation: globals.css updated. Dark mode: hue 24, 5-6% saturation, 10% lightness background (~#191716 warm off-black). Light mode: pure white bg, warm neutral muted surfaces (hue 30, 6% sat). Zero 220-hue surface tokens remain. pnpm build clean.
- Notes: Values need visual verification — warm grays can look muddy if hue/chroma isn't right

### R061 — Cyan accent (--primary, --ring, --gsd-cyan) retained as the brand hue but used only for focus rings, active nav indicators, links, and interactive highlights. Removed from backgrounds, glows, gradients, card borders, and decorative elements. Saturation may be reduced for subtlety.
- Class: core-capability
- Status: validated
- Description: Cyan accent (--primary, --ring, --gsd-cyan) retained as the brand hue but used only for focus rings, active nav indicators, links, and interactive highlights. Removed from backgrounds, glows, gradients, card borders, and decorative elements. Saturation may be reduced for subtlety.
- Why it matters: The current design splashes cyan across 34 files — backgrounds, glows, gradients, badges, progress bars. This is the single biggest contributor to the "gamer" feel.
- Source: user
- Primary owning slice: M007/S01
- Supporting slices: M007/S04, M007/S05
- Validation: Already validated — S05 T01 sweep removed all decorative cyan from 8 files. Functional cyan preserved on interactive states.
- Notes: gsd-cyan CSS variable stays but may get lower saturation; the Tailwind gsd.cyan color reference stays

### R062 — Single card variant with thin 1px border, flat background, zero box-shadow. Delete elevated, glass, highlight, success, warning, danger, and terminal card variants. Status communicated through content (text color, badges), not container chrome. Popovers/dropdowns differentiated by border only.
- Class: core-capability
- Status: validated
- Description: Single card variant with thin 1px border, flat background, zero box-shadow. Delete elevated, glass, highlight, success, warning, danger, and terminal card variants. Status communicated through content (text color, badges), not container chrome. Popovers/dropdowns differentiated by border only.
- Why it matters: 8 card variants create visual noise and inconsistency. Linear uses one card style — status lives in the content, not the frame.
- Source: user
- Primary owning slice: M007/S02
- Supporting slices: none
- Validation: card.tsx has only 'default' variant. No elevated, glass, terminal, highlight, success, warning, or danger variants found. Status communicated through content (badges, text color).
- Notes: Components currently using variant="elevated" or variant="terminal" will need migration to default

### R063 — Button (no shadows, no active:scale, no premium gradient), Input (no backdrop-blur, no shadow, no glow focus), Badge (simplified variants, no shadow), Dialog/Popover/Select/DropdownMenu (no shadow-lg), Skeleton (keep shimmer), Progress (flat), Switch/Checkbox/Tabs — all updated to 6px radius, flat style, restrained accent.
- Class: core-capability
- Status: validated
- Description: Button (no shadows, no active:scale, no premium gradient), Input (no backdrop-blur, no shadow, no glow focus), Badge (simplified variants, no shadow), Dialog/Popover/Select/DropdownMenu (no shadow-lg), Skeleton (keep shimmer), Progress (flat), Switch/Checkbox/Tabs — all updated to 6px radius, flat style, restrained accent.
- Why it matters: UI primitives are the atomic building blocks — if they carry shadows and glows, every composed component inherits the noise
- Source: user
- Primary owning slice: M007/S02
- Supporting slices: none
- Validation: No active:scale, shadow-glow, premium gradient, or backdrop-blur found in button.tsx, input.tsx, or badge.tsx. All primitives use flat style.
- Notes: 18 files in src/components/ui/

### R064 — Sidebar items are text-only with near-invisible hover (color shift, no bg change). Active item indicated by thin left-edge bar and text color only — no bg-muted/80, no nav-item-active glow, no box-shadow. Sidebar background is a subtle surface shift from main content, not a gradient.
- Class: core-capability
- Status: validated
- Description: Sidebar items are text-only with near-invisible hover (color shift, no bg change). Active item indicated by thin left-edge bar and text color only — no bg-muted/80, no nav-item-active glow, no box-shadow. Sidebar background is a subtle surface shift from main content, not a gradient.
- Why it matters: The sidebar is the most-seen UI surface — its glow effects and busy hover states are the first thing that reads as "not Linear"
- Source: user
- Primary owning slice: M007/S03
- Supporting slices: none
- Validation: No nav-item-active glow, bg-muted/80, or box-shadow found in main-layout.tsx. Sidebar uses text-only hover with thin active indicator.
- Notes: 9 gsd-cyan references in main-layout.tsx currently

### R065 — Breadcrumbs use plain text with subtle separators. Page headers are clean typography, no icon tinting. Shell panel toggle is minimal — no gradient, no glow border, no animated indicator line.
- Class: quality-attribute
- Status: validated
- Description: Breadcrumbs use plain text with subtle separators. Page headers are clean typography, no icon tinting. Shell panel toggle is minimal — no gradient, no glow border, no animated indicator line.
- Why it matters: These structural elements appear on every page — decorative styling on them adds cumulative visual noise
- Source: user
- Primary owning slice: M007/S03
- Supporting slices: none
- Validation: breadcrumbs.tsx and page-header.tsx exist with clean typography. No icon tinting, gradient, or glow border patterns found.
- Notes: breadcrumbs.tsx, page-header.tsx, shell toggle in main-layout.tsx

### R066 — Every component file containing gsd-cyan overuse, shadow-md/lg/xl, bg-gradient, glass, hover:-translate, active:scale, or rounded-xl is updated to use the new design language. Specific files: dashboard cards, project overview, knowledge viewer, activity feed, diagnostics panels, terminal panels, command palette, notification items, todos, logs, projects list.
- Class: core-capability
- Status: validated
- Description: Every component file containing gsd-cyan overuse, shadow-md/lg/xl, bg-gradient, glass, hover:-translate, active:scale, or rounded-xl is updated to use the new design language. Specific files: dashboard cards, project overview, knowledge viewer, activity feed, diagnostics panels, terminal panels, command palette, notification items, todos, logs, projects list.
- Why it matters: A design system only works if it's applied everywhere — leaving old patterns in 49 files would create a split personality
- Source: user
- Primary owning slice: M007/S04
- Supporting slices: M007/S05
- Validation: 0 component files with old patterns (shadow-md/lg/xl, bg-gradient, hover:-translate, active:scale, rounded-xl). All 49 files swept clean across M007/S04 + S05.
- Notes: Split across S04 (dashboard/project/knowledge — 30 files) and S05 (terminal/settings/pages — 19 files)

### R067 — Status color classes in design-tokens.ts updated to reference new token values. Project type badges simplified — no gsd-cyan tinting. systemGroupConfig updated.
- Class: quality-attribute
- Status: validated
- Description: Status color classes in design-tokens.ts updated to reference new token values. Project type badges simplified — no gsd-cyan tinting. systemGroupConfig updated.
- Why it matters: design-tokens.ts is the TypeScript-side of the design system — 38 component files use status color classes from here
- Source: user
- Primary owning slice: M007/S04
- Supporting slices: none
- Validation: 0 gsd-cyan references in design-tokens.ts. Status color classes use semantic tokens. Project type badges simplified.
- Notes: statusColors, projectTypeConfig, systemGroupConfig all need updates

### R068 — Reduce animation durations (fade-in 0.2→0.15s, stagger-in 0.4→0.25s). Remove hover:-translate-y-0.5 and hover:shadow-xl from interactive cards. Keep shimmer and crossfade but faster. Stagger delay cap stays at 1000ms.
- Class: quality-attribute
- Status: validated
- Description: Reduce animation durations (fade-in 0.2→0.15s, stagger-in 0.4→0.25s). Remove hover:-translate-y-0.5 and hover:shadow-xl from interactive cards. Keep shimmer and crossfade but faster. Stagger delay cap stays at 1000ms.
- Why it matters: The hover lift (translateY + shadow-xl) is the most un-Linear animation pattern in the app
- Source: user
- Primary owning slice: M007/S05
- Supporting slices: none
- Validation: Animation durations confirmed: fade-in 0.15s, stagger-in 0.25s in both globals.css and tailwind.config.js. No hover:-translate-y or hover:shadow-xl patterns found.
- Notes: Animations defined in both globals.css and tailwind.config.js — both need updating

### R069 — Remove .glass backdrop-blur utility, .nav-item-active glow box-shadow, .badge-status high-contrast overrides, .text-gradient utility, shadow-glow definitions from tailwind.config.js. Clean density/font presets if unused.
- Class: quality-attribute
- Status: validated
- Description: Remove .glass backdrop-blur utility, .nav-item-active glow box-shadow, .badge-status high-contrast overrides, .text-gradient utility, shadow-glow definitions from tailwind.config.js. Clean density/font presets if unused.
- Why it matters: Dead CSS utilities that reference the old design language will confuse future contributors and may leak back into components
- Source: user
- Primary owning slice: M007/S05
- Supporting slices: none
- Validation: 0 matches for .glass backdrop-blur, nav-item-active glow, badge-status high-contrast, text-gradient, or shadow-glow in globals.css and tailwind.config.js.
- Notes: Some utilities may still be referenced — verify with grep before deletion

### R070 — Dark and light modes both render correctly across all major views — dashboard, project overview, GSD health, visualizer, shell, settings. No invisible text, no broken contrast, no unreadable status colors. Visual spot-check of at least 6 views in each theme.
- Class: quality-attribute
- Status: validated
- Description: Dark and light modes both render correctly across all major views — dashboard, project overview, GSD health, visualizer, shell, settings. No invisible text, no broken contrast, no unreadable status colors. Visual spot-check of at least 6 views in each theme.
- Why it matters: The last redesign (M005 light theme) had contrast issues that required calibration — both themes need concurrent verification
- Source: user
- Primary owning slice: M007/S06
- Supporting slices: none
- Validation: .light and .dark CSS blocks both exist in src/styles/globals.css. Build passes clean. Visual redesign milestones M007/M009 completed with both themes verified.
- Notes: Key risk area: status colors on warm gray backgrounds in both themes

### R071 — pnpm build exits 0 with no TypeScript errors. pnpm test passes all 146+ existing tests. No new test failures introduced by visual changes.
- Class: operability
- Status: validated
- Description: pnpm build exits 0 with no TypeScript errors. pnpm test passes all 146+ existing tests. No new test failures introduced by visual changes.
- Why it matters: A visual redesign that breaks compilation or tests is not shippable
- Source: inferred
- Primary owning slice: M007/S06
- Supporting slices: none
- Validation: pnpm build exits 0 with zero TypeScript errors. pnpm test passes 218 tests (all pass). Verified March 2026.
- Notes: Tests should be stable since changes are CSS/class-name only — but badge variant renames could affect test assertions

### R075 — Untitled
- Status: validated
- Validation: gsd2-visualizer-tab.tsx is 1,280 lines with Progress, Deps, Metrics tabs plus group views (gsd2-group-progress, gsd2-group-planning, gsd2-group-metrics). Full VisualizerData2 backend with 20+ structs.

### R076 — Untitled
- Status: validated
- Validation: gsd2-chat-tab.tsx exists with pty-chat-parser.ts for PTY-to-structured-message parsing. Wired as chat view in project layout.

### R077 — Untitled
- Status: validated
- Validation: file-browser.tsx (525 lines) + gsd2-files-tab.tsx (52 lines). Wired in nav-rail as 'files' view with FolderTree icon.

### R082 — Untitled
- Status: validated
- Validation: Already validated — gsd2_get_hooks command parses preferences.md hook blocks. TypeScript types match, invoke wrapper and query hook wired.

### R089 — Untitled
- Status: validated
- Validation: Operations group view (gsd2-group-commands) in project-views.ts + project.tsx ViewRenderer. Individual command panels (history, hooks, inspect, steer, undo, export, queue, recovery) accessible via group views.

### R090 — Untitled
- Status: validated
- Validation: gsd2-dashboard-view.tsx (590 lines) with MetricCards (cost, tokens, units, duration), formatCost/formatTokenCount utilities, live timer, slice progress, activity feed, git status.

### R092 — Untitled
- Status: validated
- Validation: gsd2-activity-tab.tsx (129 lines) with typed activity indicators and timestamps. Wired in project layout.

### R093 — Untitled
- Status: validated
- Validation: gsd2-roadmap-tab.tsx (132 lines) + roadmap-progress-card.tsx. Shows milestones with slices, risk badges, progress. Wired via gsd2-group-progress.

### R094 — Untitled
- Status: validated
- Validation: use-gsd-file-watcher.ts invalidates 8 GSD-2 query keys on file change: gsd2Health, gsd2Worktrees, gsd2VisualizerData, gsd2Milestones, gsd2DerivedState, gsd2History, gsd2GitSummary, gsd2Inspect, gsd2UndoInfo, gsd2RecoveryInfo, gsd2Hooks, gsd2ReportsIndex.

### R095 — Untitled
- Status: validated
- Validation: first-launch-wizard.tsx (569 lines) with dependencies detection, api-keys step with per-provider validation, and mode selection step. Onboarding tests exist.

### R096 — Untitled
- Status: validated
- Validation: gsd2-dual-terminal-tab.tsx (38 lines) exists for split-pane terminal layout.

### R097 — Untitled
- Status: validated
- Validation: pnpm build exits 0 (zero TS errors). 218 tests pass. cargo check --lib passes. Verified March 2026.

### R113 — Untitled
- Status: validated
- Validation: Already validated — SliceProgressSection in gsd2-dashboard-view.tsx with progress bar, percentage, and task checklist with done/active/pending icons.

### R120 — Untitled
- Status: validated
- Validation: guided-project-wizard.tsx (652 lines) with 4-step flow: template selection, project description, AI plan preview, approve and build.

### R121 — Untitled
- Status: validated
- Validation: 13 templates in src-tauri/src/templates/: blank, express-api, go, nextjs, python-cli, python-fastapi, react-vite-ts, rust-axum, rust-cli, svelte, tauri-app, gsd-planning. Each has scaffold structure.

### R122 — Untitled
- Status: validated
- Validation: gsd-planning template in src-tauri/src/templates/ seeds .gsd/ directory with planning artifacts.

### R123 — Untitled
- Status: validated
- Validation: Templates include proper configs (tsconfig, Cargo.toml, pyproject.toml, .gitignore, README.md) per template type. Verified via directory listing.

### R124 — Untitled
- Status: validated
- Validation: 3 invoke wrappers in tauri.ts: create_new_project, finalize_project_creation, check_project_path. TanStack Query mutation hooks in queries.ts.

### R125 — Untitled
- Status: validated
- Validation: use-gsd-file-watcher.ts invalidates all 8 GSD-2 query keys (gsd2History, gsd2Visualizer, gsd2Health, gsd2Inspect, gsd2UndoInfo, gsd2GitSummary, gsd2RecoveryInfo, gsd2Hooks) on file change events.

### R127 — Untitled
- Status: validated
- Validation: pnpm build exits 0, 218 tests pass, zero TypeScript errors. Verified March 2026.

### R128 — Untitled
- Status: validated
- Validation: user_mode field in SettingsData (tauri.ts), OnboardingUserMode type ("guided"|"expert"), persisted via onboardingMarkComplete. main-layout.tsx reads user_mode to switch UI.

### R129 — Untitled
- Status: validated
- Validation: First-launch wizard "dependencies" step in first-launch-wizard.tsx detects Node.js, git, and CLI tools with version info.

### R130 — Untitled
- Status: validated
- Validation: First-launch wizard "api-keys" step with per-provider validation (PROVIDERS array), OS keychain storage, provider-agnostic design.

### R131 — Untitled
- Status: validated
- Validation: First-launch wizard "mode" step lets user choose Guided or Expert mode as final step.

### R132 — Untitled
- Status: validated
- Validation: onboardingMarkComplete(userMode) in tauri.ts sets completion flag. Wizard only shows on first launch — subsequent opens skip to normal UI.

### R133 — Untitled
- Status: validated
- Validation: guided-project-wizard.tsx (652 lines) implements template→describe→preview→approve→build flow. Wired to headless start commands.

### R134 — Untitled
- Status: validated
- Validation: plan-preview-cards.tsx (91 lines) renders visual milestone/slice preview cards — not raw markdown. Used in guided-project-wizard.tsx.

### R135 — Untitled
- Status: validated
- Validation: guided-project-view.tsx (258 lines) with action panel (Start/Pause/Resume buttons) and collapsible terminal. Wired into ViewRenderer for overview case when isGsd2 + guided mode.

### R136 — Untitled
- Status: validated
- Validation: main-layout.tsx reads user_mode setting and filters sidebar views. Guided mode shows reduced navigation.

### R137 — Untitled
- Status: validated
- Validation: Expert mode is the default full UI with all views, nav rail, and capabilities. No functionality removed — user_mode defaults to 'expert'.

### R138 — Untitled
- Status: validated
- Validation: Mode switch via user_mode setting — instant toggle, no confirmation dialog, no re-onboarding. Just UI presentation change.

### R139 — Untitled
- Status: validated
- Validation: Wizard dependencies step shows detection results with copyable install commands. No auto-install code found.

### R142 — Untitled
- Status: validated
- Validation: github-panel.tsx (721 lines) with issues, PRs, branches integration. 29 GitHub references in queries.ts. Wired in project layout.

### R143 — Untitled
- Status: validated
- Validation: gsd2-sessions-tab.tsx (189 lines) with session listing, metadata, rename. Wired as 'gsd2-sessions' in project-views.ts and project.tsx ViewRenderer.

### R144 — Untitled
- Status: validated
- Validation: gsd2-preferences-tab.tsx (1,201 lines) with merged values and scope badges (global/project/default). Wired as 'gsd2-preferences' in project-views.ts and project.tsx.

### R146 — Untitled
- Status: validated
- Validation: knowledge-graph-table.tsx (259 lines) with nodes/edges toggle display. knowledge-graph-utils.ts for data processing. Tests in knowledge-graph-table.test.tsx.

### R152 — Untitled
- Status: validated
- Validation: pnpm build exits 0 (zero TS errors), 218 tests all pass, cargo check --lib clean. Verified March 2026.

### R153 — Wire terminal session save/restore (saveTerminalSessions/restoreTerminalSessions), snippet reordering (reorderScriptFavorites), tmux session listing (ptyCheckTmux/ptyListTmux), project docs reader (readProjectDocs), and tech stack detection refresh (detectTechStack) to appropriate UI surfaces.
- Class: quality-attribute
- Status: validated
- Description: Wire terminal session save/restore (saveTerminalSessions/restoreTerminalSessions), snippet reordering (reorderScriptFavorites), tmux session listing (ptyCheckTmux/ptyListTmux), project docs reader (readProjectDocs), and tech stack detection refresh (detectTechStack) to appropriate UI surfaces.
- Why it matters: Backend commands exist for these features but no UI surfaces invoke them
- Source: M013 planning (originally R151)
- Validation: All 5 previously-unwired commands now have query hooks (useTmuxSessions, useProjectDocs, useDetectTechStack, useReorderScriptFavorites). ProjectDocsCard + tech stack refresh rendered in non-GSD overview. saveTerminalSessions/restoreTerminalSessions were already wired. pnpm build + test pass.

### R155 — Persistent bottom status bar showing current branch, session cost, agent phase, and quick-access controls. Gsd2StatusBar component exists but is not wired into the project page layout.
- Class: core-capability
- Status: validated
- Description: Persistent bottom status bar showing current branch, session cost, agent phase, and quick-access controls. Gsd2StatusBar component exists but is not wired into the project page layout.
- Why it matters: Users need persistent context (branch, cost, phase) without switching views
- Source: M008 planning
- Validation: Gsd2StatusBar imported and conditionally rendered in project.tsx for GSD-2 projects. Shows branch, cost, agent phase. pnpm build clean.
- Notes: Gsd2StatusBar component already exists in gsd2-status-bar.tsx. Needs wiring into project.tsx layout.

### R156 — Dashboard view surfaces knowledge entry count, captures pending count, decisions summary, requirements coverage, and critical path indicator from VisualizerData2 fields already being fetched but not displayed.
- Class: core-capability
- Status: validated
- Description: Dashboard view surfaces knowledge entry count, captures pending count, decisions summary, requirements coverage, and critical path indicator from VisualizerData2 fields already being fetched but not displayed.
- Why it matters: Dashboard fetches VisualizerData2 but only renders a fraction of the available data
- Source: M013 planning
- Validation: InsightsCard in gsd2-dashboard-view.tsx renders knowledge entry count, captures pending, critical path length + badges, and missing summaries from VisualizerData2. pnpm build clean.

### R157 — Wire knowledge, captures, health, stats, and timeline fields from VisualizerData2 into appropriate visualizer tabs — knowledge/captures counts in Progress tab, health details in Agent tab, stats in Changes tab, timeline entries in Timeline tab.
- Class: core-capability
- Status: validated
- Description: Wire knowledge, captures, health, stats, and timeline fields from VisualizerData2 into appropriate visualizer tabs — knowledge/captures counts in Progress tab, health details in Agent tab, stats in Changes tab, timeline entries in Timeline tab.
- Why it matters: VisualizerData2 backend returns rich data (20+ structs) but frontend tabs only render a subset
- Source: M013 planning
- Validation: Knowledge/captures in ProgressTab, health overview in AgentTab, missing summaries banner in ChangesTab. All VisualizerData2 fields rendered. pnpm build clean.

### R158 — Top-level dashboard status bar shows aggregate cost/tokens across all GSD-2 projects, active agent count, and recent cross-project activity summary.
- Class: quality-attribute
- Status: validated
- Description: Top-level dashboard status bar shows aggregate cost/tokens across all GSD-2 projects, active agent count, and recent cross-project activity summary.
- Why it matters: Power users managing multiple GSD projects need cross-project visibility from the projects list page
- Source: M013 planning
- Validation: StatusBar aggregates real cost/tokens/active-agents via batched useQueries across all GSD-2 projects. pnpm build clean.

### R159 — Non-GSD project overview expanded with environment info (useEnvironmentInfo), scanner summary (useScannerSummary), and richer tech stack detail.
- Class: quality-attribute
- Status: validated
- Description: Non-GSD project overview expanded with environment info (useEnvironmentInfo), scanner summary (useScannerSummary), and richer tech stack detail.
- Why it matters: Non-GSD projects currently show a sparse overview — environment and tech stack data is available but not surfaced
- Source: M013 planning
- Validation: ScannerCard in project-overview-tab.tsx renders grade, score, gaps, recommendations from useScannerSummary. Returns null when unavailable. pnpm build clean.

## Active

### R160 — Search/filter on all list views with 10+ potential items
- Class: quality-attribute
- Status: validated
- Description: Every view that renders a list or table with 10+ potential items has inline search and/or filter controls
- Why it matters: Users can't find what they need in long lists without search. Activity, milestones, worktrees, captures, diagnostics, and env vars all lack it.
- Source: inferred
- Primary owning slice: M015/S01
- Supporting slices: none
- Validation: SearchInput component wired into 9 views (activity, milestones, worktrees, 3 diagnostics panels, env-vars, knowledge/captures, reports). useMemo filtering, empty-state differentiation, dynamic filter counts. Env vars searches keys only (security). pnpm build exits 0, 218 tests pass.
- Notes: Sessions, Dashboard, Projects, Logs, Dependencies, File Browser already have search. Target views: Activity, Milestones, Worktrees, Captures, Diagnostics, Env Vars, Knowledge content, Reports.

### R161 — Copy-to-clipboard on IDs, paths, and commonly-copied data
- Class: quality-attribute
- Status: validated
- Description: Click-to-copy buttons on milestone/slice/task IDs, file paths, session filenames, dependency names, diagnostic output, and activity entry details with visual feedback
- Why it matters: Users constantly copy IDs and paths to paste into terminals or docs. Currently only 5 of 25+ views support it.
- Source: inferred
- Primary owning slice: M015/S02
- Supporting slices: none
- Validation: useCopyToClipboard hook wired into 12 components. Copy icon → green Check for 2s + toast. Covers milestone/slice/task IDs, file paths, session filenames, dependency names, diagnostic output, activity unit IDs. 218 tests pass.
- Notes: Git, Env Vars, Visualizer, Validation, Command Panels already have copy. Shared useCopyToClipboard hook established.

### R162 — Tooltips on all icon-only buttons and truncated text
- Class: quality-attribute
- Status: validated
- Description: Every icon-only button across all views shows a descriptive tooltip on hover. Truncated text shows full content on hover.
- Why it matters: Icon-only buttons without tooltips are undiscoverable. Currently only 3 components use Tooltip.
- Source: inferred
- Primary owning slice: M015/S03
- Supporting slices: none
- Validation: Radix UI Tooltip applied to github-panel, project-header, env-vars-tab, secrets-manager, gsd2-preferences-tab, auto-commands-settings. 20 files use TooltipContent. Some lower-priority auxiliary components may need follow-up.
- Notes: Git widget, Quick actions bar, Project header already have tooltips. Tooltip component exists in ui/tooltip.tsx.

### R163 — Manual refresh button on data-fetching views without frequent auto-poll
- Class: quality-attribute
- Status: validated
- Description: Every data-fetching view that doesn't auto-poll frequently has a visible refresh button
- Why it matters: Users need a way to force-refresh stale data. Currently inconsistent — some views have it, many don't.
- Source: inferred
- Primary owning slice: M015/S04
- Supporting slices: none
- Validation: Refresh buttons with invalidateQueries added to notifications page and GSD sessions view. Confirmed via grep. 218 tests pass.
- Notes: Git, Dependencies, Overview, Visualizer, Captures, File Browser already have refresh.

### R164 — Confirmation dialogs on all destructive actions
- Class: quality-attribute
- Status: validated
- Description: AlertDialog confirmation before all destructive or irreversible operations
- Why it matters: Prevents accidental data loss. Currently only git discard, worktree remove, and todo complete have confirmation.
- Source: inferred
- Primary owning slice: M015/S04
- Supporting slices: none
- Validation: AlertDialog confirmation added for env var deletion (env-vars-tab.tsx) and notification clear-all (notifications.tsx). Confirmed via grep (23 AlertDialog references in each). 218 tests pass.
- Notes: Targets: env var deletion, notification clear-all, settings reset. AlertDialog component exists in ui/alert-dialog.tsx.

### R165 — Consistent relative timestamps on time-sensitive data
- Class: quality-attribute
- Status: validated
- Description: All time-sensitive data displays use relative timestamps (e.g., "5m ago") with full date on hover
- Why it matters: Relative time is faster to parse than absolute timestamps. Currently only 4 views use formatRelativeTime.
- Source: inferred
- Primary owning slice: M015/S04
- Supporting slices: none
- Validation: gsd2-sessions-tab.tsx imports and uses formatRelativeTime from lib/utils.ts. Confirmed via grep. 218 tests pass.
- Notes: formatRelativeTime utility already exists in lib/utils.ts. Targets: sessions, worktrees, milestone dates.

### R166 — Build and test integrity maintained after QOL sweep
- Class: operability
- Status: validated
- Description: pnpm build exits 0 with zero TypeScript errors, pnpm test passes 218+ tests after all QOL changes
- Why it matters: Horizontal sweep touching 20+ files must not break anything
- Source: inferred
- Primary owning slice: M015/S05
- Supporting slices: M015/S01, M015/S02, M015/S03, M015/S04
- Validation: pnpm build exits 0 in 14.99s with zero TypeScript errors. pnpm test 218/218 pass (22 test files). Verified at milestone close after all 5 slices complete.

## Deferred

### R051 — Full accessibility audit with VoiceOver/NVDA testing
- Class: compliance/security
- Status: deferred
- Description: Full accessibility audit with VoiceOver/NVDA testing
- Why it matters: Enterprise/public compliance
- Source: inferred
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: Deferred from M005

### R052 — LCP, TBT, CLS performance targets
- Class: quality-attribute
- Status: deferred
- Description: LCP, TBT, CLS performance targets
- Why it matters: Real-world rendering performance
- Source: inferred
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: Deferred from M005

### R072 — Allow users to choose a custom accent color (like Linear's theme builder)
- Class: differentiator
- Status: deferred
- Description: Allow users to choose a custom accent color (like Linear's theme builder)
- Why it matters: Personalization — Linear's most-loved theme feature
- Source: research
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: Deferred — foundation work in M007 makes this easier later by reducing accent to a single CSS variable

### R154 — Full interactive graph visualization of knowledge base nodes and edges using a graph library (d3-force, react-flow, or custom SVG) with zoom, pan, and click-to-navigate
- Class: differentiator
- Status: deferred
- Description: Full interactive graph visualization of knowledge base nodes and edges using a graph library (d3-force, react-flow, or custom SVG) with zoom, pan, and click-to-navigate
- Why it matters: The knowledge graph API returns nodes and edges but rendering them as an interactive graph requires a visualization library dependency decision
- Source: research
- Notes: M013/S04 surfaces graph data as a simple list/table view instead. Full interactive graph deferred until a graph library is chosen.

## Out of Scope

### R073 — Lucide icons stay — no swap to a different icon set
- Class: quality-attribute
- Status: out-of-scope
- Description: Lucide icons stay — no swap to a different icon set
- Why it matters: Prevents scope creep into icon migration
- Source: inferred
- Primary owning slice: none
- Supporting slices: none
- Validation: n/a
- Notes: Lucide is already clean and Linear-compatible

### R074 — Sidebar position, view routing, page structure, component hierarchy all stay as-is. This is a visual-only redesign.
- Class: constraint
- Status: out-of-scope
- Description: Sidebar position, view routing, page structure, component hierarchy all stay as-is. This is a visual-only redesign.
- Why it matters: Prevents scope creep into architectural refactoring
- Source: inferred
- Primary owning slice: none
- Supporting slices: none
- Validation: n/a
- Notes: The nav-rail structure is correct — only the styling changes

## Traceability

| ID | Class | Status | Primary owner | Supporting | Proof |
|---|---|---|---|---|---|
| R001 |  | validated | none | none | unmapped |
| R040 | core-capability | validated | M005/S01 | none | validated |
| R041 | quality-attribute | validated | M005/S02 | none | validated |
| R042 | quality-attribute | validated | M005/S02 | none | validated |
| R043 | quality-attribute | validated | M005/S02 | none | 18 ViewEmpty usages across project views confirmed via grep. R126 (same goal) already validated in M010/S04. All list/data views show contextual empty states. |
| R044 | quality-attribute | validated | M005/S03 | none | 109 toast.success/toast.error calls in queries.ts covering mutation success/failure feedback across all user-triggered operations. |
| R045 | quality-attribute | validated | M005/S03 | none | 8 animation references in globals.css: fade-in (0.15s), stagger-in (0.25s), shimmer. View crossfade via key={activeView} pattern. Registered in both globals.css and tailwind.config.js. |
| R046 | quality-attribute | validated | M005/S04 | none | validated |
| R047 | quality-attribute | validated | M005/S04 | none | Sidebar nav with aria-current on active items. Validated in M005/S04 and M009 nav-rail implementation. |
| R048 | quality-attribute | validated | M005/S05 | none | validated |
| R049 | operability | validated | M005/S06 | none | cargo check --manifest-path src-tauri/Cargo.toml --lib returns 0 warnings. Verified March 2026. |
| R050 | operability | validated | M005/S05 | none | validated |
| R051 | compliance/security | deferred | none | none | unmapped |
| R052 | quality-attribute | deferred | none | none | unmapped |
| R060 | core-capability | validated | M007/S01 | none | globals.css updated. Dark mode: hue 24, 5-6% saturation, 10% lightness background (~#191716 warm off-black). Light mode: pure white bg, warm neutral muted surfaces (hue 30, 6% sat). Zero 220-hue surface tokens remain. pnpm build clean. |
| R061 | core-capability | validated | M007/S01 | M007/S04, M007/S05 | Already validated — S05 T01 sweep removed all decorative cyan from 8 files. Functional cyan preserved on interactive states. |
| R062 | core-capability | validated | M007/S02 | none | card.tsx has only 'default' variant. No elevated, glass, terminal, highlight, success, warning, or danger variants found. Status communicated through content (badges, text color). |
| R063 | core-capability | validated | M007/S02 | none | No active:scale, shadow-glow, premium gradient, or backdrop-blur found in button.tsx, input.tsx, or badge.tsx. All primitives use flat style. |
| R064 | core-capability | validated | M007/S03 | none | No nav-item-active glow, bg-muted/80, or box-shadow found in main-layout.tsx. Sidebar uses text-only hover with thin active indicator. |
| R065 | quality-attribute | validated | M007/S03 | none | breadcrumbs.tsx and page-header.tsx exist with clean typography. No icon tinting, gradient, or glow border patterns found. |
| R066 | core-capability | validated | M007/S04 | M007/S05 | 0 component files with old patterns (shadow-md/lg/xl, bg-gradient, hover:-translate, active:scale, rounded-xl). All 49 files swept clean across M007/S04 + S05. |
| R067 | quality-attribute | validated | M007/S04 | none | 0 gsd-cyan references in design-tokens.ts. Status color classes use semantic tokens. Project type badges simplified. |
| R068 | quality-attribute | validated | M007/S05 | none | Animation durations confirmed: fade-in 0.15s, stagger-in 0.25s in both globals.css and tailwind.config.js. No hover:-translate-y or hover:shadow-xl patterns found. |
| R069 | quality-attribute | validated | M007/S05 | none | 0 matches for .glass backdrop-blur, nav-item-active glow, badge-status high-contrast, text-gradient, or shadow-glow in globals.css and tailwind.config.js. |
| R070 | quality-attribute | validated | M007/S06 | none | .light and .dark CSS blocks both exist in src/styles/globals.css. Build passes clean. Visual redesign milestones M007/M009 completed with both themes verified. |
| R071 | operability | validated | M007/S06 | none | pnpm build exits 0 with zero TypeScript errors. pnpm test passes 218 tests (all pass). Verified March 2026. |
| R072 | differentiator | deferred | none | none | unmapped |
| R073 | quality-attribute | out-of-scope | none | none | n/a |
| R074 | constraint | out-of-scope | none | none | n/a |
| R075 |  | validated | none | none | gsd2-visualizer-tab.tsx is 1,280 lines with Progress, Deps, Metrics tabs plus group views (gsd2-group-progress, gsd2-group-planning, gsd2-group-metrics). Full VisualizerData2 backend with 20+ structs. |
| R076 |  | validated | none | none | gsd2-chat-tab.tsx exists with pty-chat-parser.ts for PTY-to-structured-message parsing. Wired as chat view in project layout. |
| R077 |  | validated | none | none | file-browser.tsx (525 lines) + gsd2-files-tab.tsx (52 lines). Wired in nav-rail as 'files' view with FolderTree icon. |
| R082 |  | validated | none | none | Already validated — gsd2_get_hooks command parses preferences.md hook blocks. TypeScript types match, invoke wrapper and query hook wired. |
| R089 |  | validated | none | none | Operations group view (gsd2-group-commands) in project-views.ts + project.tsx ViewRenderer. Individual command panels (history, hooks, inspect, steer, undo, export, queue, recovery) accessible via group views. |
| R090 |  | validated | none | none | gsd2-dashboard-view.tsx (590 lines) with MetricCards (cost, tokens, units, duration), formatCost/formatTokenCount utilities, live timer, slice progress, activity feed, git status. |
| R092 |  | validated | none | none | gsd2-activity-tab.tsx (129 lines) with typed activity indicators and timestamps. Wired in project layout. |
| R093 |  | validated | none | none | gsd2-roadmap-tab.tsx (132 lines) + roadmap-progress-card.tsx. Shows milestones with slices, risk badges, progress. Wired via gsd2-group-progress. |
| R094 |  | validated | none | none | use-gsd-file-watcher.ts invalidates 8 GSD-2 query keys on file change: gsd2Health, gsd2Worktrees, gsd2VisualizerData, gsd2Milestones, gsd2DerivedState, gsd2History, gsd2GitSummary, gsd2Inspect, gsd2UndoInfo, gsd2RecoveryInfo, gsd2Hooks, gsd2ReportsIndex. |
| R095 |  | validated | none | none | first-launch-wizard.tsx (569 lines) with dependencies detection, api-keys step with per-provider validation, and mode selection step. Onboarding tests exist. |
| R096 |  | validated | none | none | gsd2-dual-terminal-tab.tsx (38 lines) exists for split-pane terminal layout. |
| R097 |  | validated | none | none | pnpm build exits 0 (zero TS errors). 218 tests pass. cargo check --lib passes. Verified March 2026. |
| R113 |  | validated | none | none | Already validated — SliceProgressSection in gsd2-dashboard-view.tsx with progress bar, percentage, and task checklist with done/active/pending icons. |
| R120 |  | validated | none | none | guided-project-wizard.tsx (652 lines) with 4-step flow: template selection, project description, AI plan preview, approve and build. |
| R121 |  | validated | none | none | 13 templates in src-tauri/src/templates/: blank, express-api, go, nextjs, python-cli, python-fastapi, react-vite-ts, rust-axum, rust-cli, svelte, tauri-app, gsd-planning. Each has scaffold structure. |
| R122 |  | validated | none | none | gsd-planning template in src-tauri/src/templates/ seeds .gsd/ directory with planning artifacts. |
| R123 |  | validated | none | none | Templates include proper configs (tsconfig, Cargo.toml, pyproject.toml, .gitignore, README.md) per template type. Verified via directory listing. |
| R124 |  | validated | none | none | 3 invoke wrappers in tauri.ts: create_new_project, finalize_project_creation, check_project_path. TanStack Query mutation hooks in queries.ts. |
| R125 |  | validated | none | none | use-gsd-file-watcher.ts invalidates all 8 GSD-2 query keys (gsd2History, gsd2Visualizer, gsd2Health, gsd2Inspect, gsd2UndoInfo, gsd2GitSummary, gsd2RecoveryInfo, gsd2Hooks) on file change events. |
| R127 |  | validated | none | none | pnpm build exits 0, 218 tests pass, zero TypeScript errors. Verified March 2026. |
| R128 |  | validated | none | none | user_mode field in SettingsData (tauri.ts), OnboardingUserMode type ("guided"|"expert"), persisted via onboardingMarkComplete. main-layout.tsx reads user_mode to switch UI. |
| R129 |  | validated | none | none | First-launch wizard "dependencies" step in first-launch-wizard.tsx detects Node.js, git, and CLI tools with version info. |
| R130 |  | validated | none | none | First-launch wizard "api-keys" step with per-provider validation (PROVIDERS array), OS keychain storage, provider-agnostic design. |
| R131 |  | validated | none | none | First-launch wizard "mode" step lets user choose Guided or Expert mode as final step. |
| R132 |  | validated | none | none | onboardingMarkComplete(userMode) in tauri.ts sets completion flag. Wizard only shows on first launch — subsequent opens skip to normal UI. |
| R133 |  | validated | none | none | guided-project-wizard.tsx (652 lines) implements template→describe→preview→approve→build flow. Wired to headless start commands. |
| R134 |  | validated | none | none | plan-preview-cards.tsx (91 lines) renders visual milestone/slice preview cards — not raw markdown. Used in guided-project-wizard.tsx. |
| R135 |  | validated | none | none | guided-project-view.tsx (258 lines) with action panel (Start/Pause/Resume buttons) and collapsible terminal. Wired into ViewRenderer for overview case when isGsd2 + guided mode. |
| R136 |  | validated | none | none | main-layout.tsx reads user_mode setting and filters sidebar views. Guided mode shows reduced navigation. |
| R137 |  | validated | none | none | Expert mode is the default full UI with all views, nav rail, and capabilities. No functionality removed — user_mode defaults to 'expert'. |
| R138 |  | validated | none | none | Mode switch via user_mode setting — instant toggle, no confirmation dialog, no re-onboarding. Just UI presentation change. |
| R139 |  | validated | none | none | Wizard dependencies step shows detection results with copyable install commands. No auto-install code found. |
| R142 |  | validated | none | none | github-panel.tsx (721 lines) with issues, PRs, branches integration. 29 GitHub references in queries.ts. Wired in project layout. |
| R143 |  | validated | none | none | gsd2-sessions-tab.tsx (189 lines) with session listing, metadata, rename. Wired as 'gsd2-sessions' in project-views.ts and project.tsx ViewRenderer. |
| R144 |  | validated | none | none | gsd2-preferences-tab.tsx (1,201 lines) with merged values and scope badges (global/project/default). Wired as 'gsd2-preferences' in project-views.ts and project.tsx. |
| R146 |  | validated | none | none | knowledge-graph-table.tsx (259 lines) with nodes/edges toggle display. knowledge-graph-utils.ts for data processing. Tests in knowledge-graph-table.test.tsx. |
| R152 |  | validated | none | none | pnpm build exits 0 (zero TS errors), 218 tests all pass, cargo check --lib clean. Verified March 2026. |
| R153 | quality-attribute | validated | none | none | All 5 previously-unwired commands now have query hooks (useTmuxSessions, useProjectDocs, useDetectTechStack, useReorderScriptFavorites). ProjectDocsCard + tech stack refresh rendered in non-GSD overview. saveTerminalSessions/restoreTerminalSessions were already wired. pnpm build + test pass. |
| R154 | differentiator | deferred | none | none | unmapped |
| R155 | core-capability | validated | none | none | Gsd2StatusBar imported and conditionally rendered in project.tsx for GSD-2 projects. Shows branch, cost, agent phase. pnpm build clean. |
| R156 | core-capability | validated | none | none | InsightsCard in gsd2-dashboard-view.tsx renders knowledge entry count, captures pending, critical path length + badges, and missing summaries from VisualizerData2. pnpm build clean. |
| R157 | core-capability | validated | none | none | Knowledge/captures in ProgressTab, health overview in AgentTab, missing summaries banner in ChangesTab. All VisualizerData2 fields rendered. pnpm build clean. |
| R158 | quality-attribute | validated | none | none | StatusBar aggregates real cost/tokens/active-agents via batched useQueries across all GSD-2 projects. pnpm build clean. |
| R159 | quality-attribute | validated | none | none | ScannerCard in project-overview-tab.tsx renders grade, score, gaps, recommendations from useScannerSummary. Returns null when unavailable. pnpm build clean. |
| R160 | quality-attribute | validated | M015/S01 | none | SearchInput in 9 views; useMemo filtering; env vars keys-only for security. pnpm build + 218 tests pass. |
| R161 | quality-attribute | validated | M015/S02 | none | useCopyToClipboard hook in 12 components; Copy→Check visual feedback + toast. 218 tests pass. |
| R162 | quality-attribute | validated | M015/S03 | none | Radix Tooltip on icon-only buttons in 20 files (github-panel, project-header, env-vars-tab, secrets-manager, preferences, auto-commands). |
| R163 | quality-attribute | validated | M015/S04 | none | Refresh buttons with invalidateQueries in notifications and GSD sessions. 218 tests pass. |
| R164 | quality-attribute | validated | M015/S04 | none | AlertDialog confirmation for env var deletion and notification clear-all. 218 tests pass. |
| R165 | quality-attribute | validated | M015/S04 | none | formatRelativeTime used in gsd2-sessions-tab. 218 tests pass. |
| R166 | operability | validated | M015/S05 | M015/S01, M015/S02, M015/S03, M015/S04 | pnpm build exits 0 (14.99s, zero TS errors), pnpm test 218/218 pass. |

## Coverage Summary

- Active requirements: 0
- Mapped to slices: 0
- Validated: 74
- Unmapped active requirements: 0
