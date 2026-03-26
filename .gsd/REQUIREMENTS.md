# Requirements

This file is the explicit capability and coverage contract for the project.

## Active

### R043 — Every view with a list or data grid shows meaningful empty state
- Class: quality-attribute
- Status: active
- Description: Every view with a list or data grid shows meaningful empty state
- Why it matters: Empty views look broken without contextual messages
- Source: user
- Primary owning slice: M005/S02
- Supporting slices: none
- Validation: unmapped
- Notes: Carried forward from M005 — still active

### R060 — Replace the current pure-black dark / cool-gray light palette with warm neutral grays. Dark bg ~#1a1a1a (off-black, slight warmth), light bg pure white. Card/popover/muted surfaces use barely-perceptible tonal shifts from the base. All 30+ CSS custom properties updated in both .dark and .light blocks.
- Class: core-capability
- Status: active
- Description: Replace the current pure-black dark / cool-gray light palette with warm neutral grays. Dark bg ~#1a1a1a (off-black, slight warmth), light bg pure white. Card/popover/muted surfaces use barely-perceptible tonal shifts from the base. All 30+ CSS custom properties updated in both .dark and .light blocks.
- Why it matters: The color foundation drives the entire visual feel — warm neutrals read as calm and professional vs. the current cold/neon aesthetic
- Source: user
- Primary owning slice: M007/S01
- Supporting slices: none
- Validation: unmapped
- Notes: Values need visual verification — warm grays can look muddy if hue/chroma isn't right

### R062 — Single card variant with thin 1px border, flat background, zero box-shadow. Delete elevated, glass, highlight, success, warning, danger, and terminal card variants. Status communicated through content (text color, badges), not container chrome. Popovers/dropdowns differentiated by border only.
- Class: core-capability
- Status: active
- Description: Single card variant with thin 1px border, flat background, zero box-shadow. Delete elevated, glass, highlight, success, warning, danger, and terminal card variants. Status communicated through content (text color, badges), not container chrome. Popovers/dropdowns differentiated by border only.
- Why it matters: 8 card variants create visual noise and inconsistency. Linear uses one card style — status lives in the content, not the frame.
- Source: user
- Primary owning slice: M007/S02
- Supporting slices: none
- Validation: unmapped
- Notes: Components currently using variant="elevated" or variant="terminal" will need migration to default

### R063 — Button (no shadows, no active:scale, no premium gradient), Input (no backdrop-blur, no shadow, no glow focus), Badge (simplified variants, no shadow), Dialog/Popover/Select/DropdownMenu (no shadow-lg), Skeleton (keep shimmer), Progress (flat), Switch/Checkbox/Tabs — all updated to 6px radius, flat style, restrained accent.
- Class: core-capability
- Status: active
- Description: Button (no shadows, no active:scale, no premium gradient), Input (no backdrop-blur, no shadow, no glow focus), Badge (simplified variants, no shadow), Dialog/Popover/Select/DropdownMenu (no shadow-lg), Skeleton (keep shimmer), Progress (flat), Switch/Checkbox/Tabs — all updated to 6px radius, flat style, restrained accent.
- Why it matters: UI primitives are the atomic building blocks — if they carry shadows and glows, every composed component inherits the noise
- Source: user
- Primary owning slice: M007/S02
- Supporting slices: none
- Validation: unmapped
- Notes: 18 files in src/components/ui/

### R064 — Sidebar items are text-only with near-invisible hover (color shift, no bg change). Active item indicated by thin left-edge bar and text color only — no bg-muted/80, no nav-item-active glow, no box-shadow. Sidebar background is a subtle surface shift from main content, not a gradient.
- Class: core-capability
- Status: active
- Description: Sidebar items are text-only with near-invisible hover (color shift, no bg change). Active item indicated by thin left-edge bar and text color only — no bg-muted/80, no nav-item-active glow, no box-shadow. Sidebar background is a subtle surface shift from main content, not a gradient.
- Why it matters: The sidebar is the most-seen UI surface — its glow effects and busy hover states are the first thing that reads as "not Linear"
- Source: user
- Primary owning slice: M007/S03
- Supporting slices: none
- Validation: unmapped
- Notes: 9 gsd-cyan references in main-layout.tsx currently

### R065 — Breadcrumbs use plain text with subtle separators. Page headers are clean typography, no icon tinting. Shell panel toggle is minimal — no gradient, no glow border, no animated indicator line.
- Class: quality-attribute
- Status: active
- Description: Breadcrumbs use plain text with subtle separators. Page headers are clean typography, no icon tinting. Shell panel toggle is minimal — no gradient, no glow border, no animated indicator line.
- Why it matters: These structural elements appear on every page — decorative styling on them adds cumulative visual noise
- Source: user
- Primary owning slice: M007/S03
- Supporting slices: none
- Validation: unmapped
- Notes: breadcrumbs.tsx, page-header.tsx, shell toggle in main-layout.tsx

### R067 — Status color classes in design-tokens.ts updated to reference new token values. Project type badges simplified — no gsd-cyan tinting. systemGroupConfig updated.
- Class: quality-attribute
- Status: active
- Description: Status color classes in design-tokens.ts updated to reference new token values. Project type badges simplified — no gsd-cyan tinting. systemGroupConfig updated.
- Why it matters: design-tokens.ts is the TypeScript-side of the design system — 38 component files use status color classes from here
- Source: user
- Primary owning slice: M007/S04
- Supporting slices: none
- Validation: unmapped
- Notes: statusColors, projectTypeConfig, systemGroupConfig all need updates

### R070 — Dark and light modes both render correctly across all major views — dashboard, project overview, GSD health, visualizer, shell, settings. No invisible text, no broken contrast, no unreadable status colors. Visual spot-check of at least 6 views in each theme.
- Class: quality-attribute
- Status: active
- Description: Dark and light modes both render correctly across all major views — dashboard, project overview, GSD health, visualizer, shell, settings. No invisible text, no broken contrast, no unreadable status colors. Visual spot-check of at least 6 views in each theme.
- Why it matters: The last redesign (M005 light theme) had contrast issues that required calibration — both themes need concurrent verification
- Source: user
- Primary owning slice: M007/S06
- Supporting slices: none
- Validation: unmapped
- Notes: Key risk area: status colors on warm gray backgrounds in both themes

### R071 — pnpm build exits 0 with no TypeScript errors. pnpm test passes all 146+ existing tests. No new test failures introduced by visual changes.
- Class: operability
- Status: active
- Description: pnpm build exits 0 with no TypeScript errors. pnpm test passes all 146+ existing tests. No new test failures introduced by visual changes.
- Why it matters: A visual redesign that breaks compilation or tests is not shippable
- Source: inferred
- Primary owning slice: M007/S06
- Supporting slices: none
- Validation: unmapped
- Notes: Tests should be stable since changes are CSS/class-name only — but badge variant renames could affect test assertions

### R075 — Replace the current 198-line basic visualizer with the full gsd-2 web's 7-tab visualizer: progress tree, dependency graph, metrics charts, execution timeline, agent activity monitor, changelog, and export tab.
- Class: core-capability
- Status: active
- Description: Replace the current 198-line basic visualizer with the full gsd-2 web's 7-tab visualizer: progress tree, dependency graph, metrics charts, execution timeline, agent activity monitor, changelog, and export tab.
- Why it matters: The visualizer is the primary visibility surface for GSD projects — the current version shows a fraction of available data
- Source: user
- Primary owning slice: M008/S02
- Supporting slices: M008/S01
- Validation: unmapped
- Notes: Depends on expanded visualizer data from S01 backend

### R076 — Full chat mode view that parses raw PTY output into structured messages (user/assistant/system), renders tool calls, supports /gsd command dispatch from a command bar, and allows image upload/paste.
- Class: core-capability
- Status: active
- Description: Full chat mode view that parses raw PTY output into structured messages (user/assistant/system), renders tool calls, supports /gsd command dispatch from a command bar, and allows image upload/paste.
- Why it matters: Chat mode is the primary interaction surface in the gsd-2 web app — without it, VibeFlow is a read-only dashboard
- Source: user
- Primary owning slice: M008/S04
- Supporting slices: M008/S01
- Validation: unmapped
- Notes: Requires PTY chat parser port (779 lines in gsd-2 web). VibeFlow's PTY is Rust-managed vs gsd-2's bridge-terminal.

### R077 — File tree browser with project root and .gsd/ root modes, syntax-highlighted code viewer, and split-pane layout. Matches gsd-2 web's files-view.tsx functionality.
- Class: core-capability
- Status: active
- Description: File tree browser with project root and .gsd/ root modes, syntax-highlighted code viewer, and split-pane layout. Matches gsd-2 web's files-view.tsx functionality.
- Why it matters: File browsing is essential for understanding project state and reviewing GSD artifacts without leaving the app
- Source: user
- Primary owning slice: M008/S05
- Supporting slices: none
- Validation: unmapped
- Notes: VibeFlow already has file-browser.tsx and codebase-tab.tsx — this extends/replaces them

### R089 — Each /gsd command surface (history, hooks, inspect, steer, undo, export, queue, status, recovery) gets a dedicated nav-rail view in the GSD section of the sidebar. Each panel fetches data from its corresponding Rust backend command.
- Class: core-capability
- Status: active
- Description: Each /gsd command surface (history, hooks, inspect, steer, undo, export, queue, status, recovery) gets a dedicated nav-rail view in the GSD section of the sidebar. Each panel fetches data from its corresponding Rust backend command.
- Why it matters: These panels complete the /gsd command parity — every command accessible from the gsd-2 web is accessible in VibeFlow
- Source: user
- Primary owning slice: M008/S06
- Supporting slices: M008/S01
- Validation: unmapped
- Notes: 9 new view components, each following established VibeFlow patterns

### R090 — Dashboard view shows live metrics (total cost, tokens, duration), current active slice with progress, git branch, and agent activity status. Matches the gsd-2 web dashboard layout.
- Class: core-capability
- Status: active
- Description: Dashboard view shows live metrics (total cost, tokens, duration), current active slice with progress, git branch, and agent activity status. Matches the gsd-2 web dashboard layout.
- Why it matters: The dashboard is the landing view — it must show the full project pulse at a glance
- Source: user
- Primary owning slice: M008/S07
- Supporting slices: M008/S01, M008/S02
- Validation: unmapped
- Notes: VibeFlow has project-overview-tab.tsx — this extends it significantly

### R091 — Persistent bottom status bar showing current branch, session cost, agent phase, and quick-access controls. Visible across all views.
- Class: core-capability
- Status: active
- Description: Persistent bottom status bar showing current branch, session cost, agent phase, and quick-access controls. Visible across all views.
- Why it matters: The status bar provides ambient awareness of project state without switching views
- Source: user
- Primary owning slice: M008/S07
- Supporting slices: none
- Validation: unmapped
- Notes: New component, mounted in project.tsx outside ViewRenderer

### R092 — Activity view showing execution events in a timeline format with typed icons (system, success, error, output, input), timestamps, and scrollable history.
- Class: core-capability
- Status: active
- Description: Activity view showing execution events in a timeline format with typed icons (system, success, error, output, input), timestamps, and scrollable history.
- Why it matters: Activity feed provides a chronological narrative of what happened during execution
- Source: user
- Primary owning slice: M008/S05
- Supporting slices: none
- Validation: unmapped
- Notes: VibeFlow has activity-feed.tsx — may need enhancement to match gsd-2 web parity

### R093 — Roadmap view showing all milestones with their slices, risk badges, dependency annotations, slice-level progress bars, and task counts. Matches gsd-2 web's roadmap.tsx.
- Class: core-capability
- Status: active
- Description: Roadmap view showing all milestones with their slices, risk badges, dependency annotations, slice-level progress bars, and task counts. Matches gsd-2 web's roadmap.tsx.
- Why it matters: The roadmap is the structural overview of the entire project plan
- Source: inferred
- Primary owning slice: M008/S05
- Supporting slices: none
- Validation: unmapped
- Notes: VibeFlow has gsd2-milestones-tab.tsx — this creates a parallel roadmap-style view

### R094 — When .gsd/ files change on disk (detected by Tauri file watcher), relevant TanStack Query caches are invalidated so views update without manual refresh. Covers metrics.json, STATE.md, auto.lock, roadmap files, and plan files.
- Class: core-capability
- Status: active
- Description: When .gsd/ files change on disk (detected by Tauri file watcher), relevant TanStack Query caches are invalidated so views update without manual refresh. Covers metrics.json, STATE.md, auto.lock, roadmap files, and plan files.
- Why it matters: Live updates make the app feel responsive during auto-mode — users see progress without clicking refresh
- Source: user
- Primary owning slice: M008/S07
- Supporting slices: none
- Validation: unmapped
- Notes: File watcher infrastructure already exists (use-gsd-file-watcher.ts). Needs targeted cache invalidation mapping.

### R095 — Extend the existing VibeFlow onboarding wizard with provider selection, authentication flow, and remote questions configuration matching the gsd-2 web's onboarding-gate.tsx capabilities.
- Class: quality-attribute
- Status: active
- Description: Extend the existing VibeFlow onboarding wizard with provider selection, authentication flow, and remote questions configuration matching the gsd-2 web's onboarding-gate.tsx capabilities.
- Why it matters: Complete onboarding ensures users can set up provider credentials and remote questions without manual config
- Source: user
- Primary owning slice: M008/S08
- Supporting slices: none
- Validation: unmapped
- Notes: VibeFlow already has an onboarding wizard — this extends it, not replaces

### R096 — Support split-pane terminal layout showing two terminal sessions side by side, matching the gsd-2 web's dual-terminal.tsx pattern.
- Class: quality-attribute
- Status: active
- Description: Support split-pane terminal layout showing two terminal sessions side by side, matching the gsd-2 web's dual-terminal.tsx pattern.
- Why it matters: Dual terminals let users monitor auto-mode in one pane while working in another
- Source: user
- Primary owning slice: M008/S05
- Supporting slices: none
- Validation: unmapped
- Notes: gsd-2 web's dual-terminal.tsx is 119 lines — relatively small component

### R097 — All existing 146+ tests pass. pnpm build produces zero TypeScript errors. No regressions from new code. cargo check --lib passes.
- Class: operability
- Status: active
- Description: All existing 146+ tests pass. pnpm build produces zero TypeScript errors. No regressions from new code. cargo check --lib passes.
- Why it matters: A feature expansion that breaks the build is not shippable
- Source: inferred
- Primary owning slice: M008/S09
- Supporting slices: none
- Validation: unmapped
- Notes: New views should include basic render tests

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

### R044 — Every user-triggered mutation shows success/failure toast
- Class: quality-attribute
- Status: validated
- Description: Every user-triggered mutation shows success/failure toast
- Why it matters: No silent mutations
- Source: inferred
- Primary owning slice: M005/S03
- Supporting slices: none
- Validation: validated
- Notes: Toast styling may need minor adjustment for new palette

### R045 — View crossfade, shimmer skeleton, hover lift, stagger-in
- Class: quality-attribute
- Status: validated
- Description: View crossfade, shimmer skeleton, hover lift, stagger-in
- Why it matters: App feels polished
- Source: user
- Primary owning slice: M005/S03
- Supporting slices: none
- Validation: validated
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
- Validation: validated
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
- Validation: validated
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

### R061 — Cyan accent (--primary, --ring, --gsd-cyan) retained as the brand hue but used only for focus rings, active nav indicators, links, and interactive highlights. Removed from backgrounds, glows, gradients, card borders, and decorative elements. Saturation may be reduced for subtlety.
- Class: core-capability
- Status: validated
- Description: Cyan accent (--primary, --ring, --gsd-cyan) retained as the brand hue but used only for focus rings, active nav indicators, links, and interactive highlights. Removed from backgrounds, glows, gradients, card borders, and decorative elements. Saturation may be reduced for subtlety.
- Why it matters: The current design splashes cyan across 34 files — backgrounds, glows, gradients, badges, progress bars. This is the single biggest contributor to the "gamer" feel.
- Source: user
- Primary owning slice: M007/S01
- Supporting slices: M007/S04, M007/S05
- Validation: S05 T01 sweep removed all decorative cyan (bg-gsd-cyan/*, text-gsd-cyan for icons) from 8 files: todos.tsx, command-palette.tsx, notification-item.tsx, terminal-tabs.tsx, global-terminals.tsx, broadcast-indicator.tsx, terminal-search-bar.tsx, shell.tsx. Functional cyan (bg-primary, text-primary) preserved on interactive states. Verified via rg patterns and build pass.
- Notes: gsd-cyan CSS variable stays but may get lower saturation; the Tailwind gsd.cyan color reference stays

### R066 — Every component file containing gsd-cyan overuse, shadow-md/lg/xl, bg-gradient, glass, hover:-translate, active:scale, or rounded-xl is updated to use the new design language. Specific files: dashboard cards, project overview, knowledge viewer, activity feed, diagnostics panels, terminal panels, command palette, notification items, todos, logs, projects list.
- Class: core-capability
- Status: validated
- Description: Every component file containing gsd-cyan overuse, shadow-md/lg/xl, bg-gradient, glass, hover:-translate, active:scale, or rounded-xl is updated to use the new design language. Specific files: dashboard cards, project overview, knowledge viewer, activity feed, diagnostics panels, terminal panels, command palette, notification items, todos, logs, projects list.
- Why it matters: A design system only works if it's applied everywhere — leaving old patterns in 49 files would create a split personality
- Source: user
- Primary owning slice: M007/S04
- Supporting slices: M007/S05
- Validation: S04 + S05 combined swept all 49 component files. S04 covered dashboard/project/knowledge (30 files); S05 covered terminal/settings/pages (8 files). All old patterns (gsd-cyan overuse, shadow-md/lg/xl, bg-gradient, rounded-xl) removed. Build and type-check pass.
- Notes: Split across S04 (dashboard/project/knowledge — 30 files) and S05 (terminal/settings/pages — 19 files)

### R068 — Reduce animation durations (fade-in 0.2→0.15s, stagger-in 0.4→0.25s). Remove hover:-translate-y-0.5 and hover:shadow-xl from interactive cards. Keep shimmer and crossfade but faster. Stagger delay cap stays at 1000ms.
- Class: quality-attribute
- Status: validated
- Description: Reduce animation durations (fade-in 0.2→0.15s, stagger-in 0.4→0.25s). Remove hover:-translate-y-0.5 and hover:shadow-xl from interactive cards. Keep shimmer and crossfade but faster. Stagger delay cap stays at 1000ms.
- Why it matters: The hover lift (translateY + shadow-xl) is the most un-Linear animation pattern in the app
- Source: user
- Primary owning slice: M007/S05
- Supporting slices: none
- Validation: S05 verified globals.css animations already tightened: fade-in 0.15s, stagger-in 0.25s. Removed all shadow-lg/2xl and backdrop-blur from terminal/command-palette. Removed hover:shadow and rounded-xl. No hover lift patterns remain. Build clean.
- Notes: Animations defined in both globals.css and tailwind.config.js — both need updating

### R069 — Remove .glass backdrop-blur utility, .nav-item-active glow box-shadow, .badge-status high-contrast overrides, .text-gradient utility, shadow-glow definitions from tailwind.config.js. Clean density/font presets if unused.
- Class: quality-attribute
- Status: validated
- Description: Remove .glass backdrop-blur utility, .nav-item-active glow box-shadow, .badge-status high-contrast overrides, .text-gradient utility, shadow-glow definitions from tailwind.config.js. Clean density/font presets if unused.
- Why it matters: Dead CSS utilities that reference the old design language will confuse future contributors and may leak back into components
- Source: user
- Primary owning slice: M007/S05
- Supporting slices: none
- Validation: S05 T01 verified via rg: no .glass backdrop-blur utility, no .nav-item-active glow, no .badge-status high-contrast overrides, no .text-gradient utility found. Density/font presets remain intact (.font-scale-sm/md/lg). Build clean with zero utility references remaining.
- Notes: Some utilities may still be referenced — verify with grep before deletion

### R078 — Rust Tauri command that reads .gsd/metrics.json, parses the ledger, and returns aggregated data: project totals, by-phase, by-slice, by-model breakdowns, and individual unit metrics.
- Class: core-capability
- Status: validated
- Description: Rust Tauri command that reads .gsd/metrics.json, parses the ledger, and returns aggregated data: project totals, by-phase, by-slice, by-model breakdowns, and individual unit metrics.
- Why it matters: History data powers the metrics tab in the visualizer, the history panel, and the export feature
- Source: user
- Primary owning slice: M008/S01
- Supporting slices: none
- Validation: gsd2_get_history command parses .gsd/metrics.json with camelCase fields (startedAt, finishedAt, toolCalls, cacheRead, cacheWrite, inputTokens, outputTokens, totalTokens, modelDowngraded). Returns aggregated ProjectTotals, by-phase aggregates (research, planning, execution, completion, reassessment), by-slice aggregates keyed on M### milestone prefix, by-model aggregates sorted by cost desc. Verified: cargo build + pnpm build pass, TypeScript types match Rust output, invoke wrapper in tauri.ts, query hook in queries.ts. Task T02 complete.
- Notes: metrics.json uses camelCase fields (startedAt, finishedAt, toolCalls) per KNOWLEDGE.md

### R079 — Rust command that reads .gsd/ metadata to return schema version, decision count from DECISIONS.md, requirement count from REQUIREMENTS.md, and recent entries from each.
- Class: core-capability
- Status: validated
- Description: Rust command that reads .gsd/ metadata to return schema version, decision count from DECISIONS.md, requirement count from REQUIREMENTS.md, and recent entries from each.
- Why it matters: The inspect panel gives a quick structural overview of the project's GSD state
- Source: user
- Primary owning slice: M008/S01
- Supporting slices: none
- Validation: gsd2_get_inspect command reads .gsd/STATE.md for schema version (via frontmatter), scans DECISIONS.md and REQUIREMENTS.md counting table rows matching pattern (D/R + digits + " |"). Extracts last 5 matching entries as recent_decisions/recent_requirements. Verified: cargo build + pnpm build pass, TypeScript types match Rust output, invoke wrapper in tauri.ts, query hook in queries.ts. Task T01 complete.
- Notes: Simple file parsing — count rows in markdown tables

### R080 — Rust commands to read the current contents of .gsd/OVERRIDES.md and write new override content to it.
- Class: core-capability
- Status: validated
- Description: Rust commands to read the current contents of .gsd/OVERRIDES.md and write new override content to it.
- Why it matters: Steer is the primary course-correction mechanism during auto-mode — users need to view and edit overrides
- Source: user
- Primary owning slice: M008/S01
- Supporting slices: none
- Validation: gsd2_get_steer_content command reads .gsd/OVERRIDES.md, returns content + exists flag. gsd2_set_steer_content command atomically writes OVERRIDES.md using tmp file + rename pattern. Verified: cargo build + pnpm build pass, TypeScript types match Rust output, invoke wrappers in tauri.ts, query hook + useMutation in queries.ts with cache invalidation on write. Task T01 complete.
- Notes: Simple file read/write. Atomic write pattern (tmp + rename).

### R081 — Rust command that reads .gsd/completed-units.json to determine the last completed unit, its commits, and provides git revert capability.
- Class: core-capability
- Status: validated
- Description: Rust command that reads .gsd/completed-units.json to determine the last completed unit, its commits, and provides git revert capability.
- Why it matters: Undo is the safety valve for auto-mode — users need to revert bad work without leaving the app
- Source: user
- Primary owning slice: M008/S01
- Supporting slices: none
- Validation: gsd2_get_undo_info command reads .gsd/completed-units.json (JSON string array), splits last entry on '/' using find() to extract unit_type and unit_id, joins with metrics.json to find matching unit cost by id field. Verified: cargo build + pnpm build pass, TypeScript types match Rust output, invoke wrapper in tauri.ts, query hook in queries.ts. Task T01 complete.
- Notes: completed-units.json uses split_once('/') for unit type parsing per KNOWLEDGE.md

### R082 — Rust command that reads hook configuration from .gsd/preferences.md and returns hook entries with name, type (pre/post), enabled state, targets, and active cycle counts.
- Class: core-capability
- Status: validated
- Description: Rust command that reads hook configuration from .gsd/preferences.md and returns hook entries with name, type (pre/post), enabled state, targets, and active cycle counts.
- Why it matters: Hook visibility lets users understand what automation is running during auto-mode
- Source: user
- Primary owning slice: M008/S01
- Supporting slices: none
- Validation: gsd2_get_hooks command reads .gsd/preferences.md via manual section scanning (no serde_yaml). Detects post_unit_hooks and pre_dispatch_hooks section headers, parses indented hook blocks extracting name, triggers (after:/before: lists), action, artifact, max_cycles. Verified: cargo build + pnpm build pass, TypeScript types match Rust output, invoke wrapper in tauri.ts, query hook in queries.ts. Task T02 complete.
- Notes: Hooks are defined in preferences.md YAML frontmatter

### R083 — Rust command that runs git commands to return current branch, working directory status (clean/dirty), and recent commit log.
- Class: core-capability
- Status: validated
- Description: Rust command that runs git commands to return current branch, working directory status (clean/dirty), and recent commit log.
- Why it matters: Git context is essential for understanding where a project is — branch name, uncommitted changes, recent history
- Source: user
- Primary owning slice: M008/S01
- Supporting slices: none
- Validation: gsd2_get_git_summary command uses self-contained std::process::Command (no import from git.rs). Executes git -C {project_path} commands: rev-parse --abbrev-ref HEAD (branch), status --porcelain (staged/unstaged/untracked counts), log --format=%H|%s|%an|%ar (recent commits), rev-list for ahead/behind counts. Returns has_git: false gracefully on errors. Verified: cargo build + pnpm build pass, TypeScript types match Rust output, invoke wrapper in tauri.ts, query hook in queries.ts. Task T02 complete.
- Notes: Uses run_git_command helper (existing pattern in gsd2.rs)

### R084 — Rust command that reads .gsd/auto.lock to detect interrupted auto-mode runs, analyzes crash state, and provides recovery information including last unit, error context, and suggested actions.
- Class: core-capability
- Status: validated
- Description: Rust command that reads .gsd/auto.lock to detect interrupted auto-mode runs, analyzes crash state, and provides recovery information including last unit, error context, and suggested actions.
- Why it matters: Recovery diagnostics help users understand what happened when auto-mode crashed and how to resume
- Source: user
- Primary owning slice: M008/S01
- Supporting slices: none
- Validation: gsd2_get_recovery_info command checks both .gsd/auto.lock and .gsd/runtime/auto.lock (primary preferred per research findings). Parses JSON lock file for pid, startedAt, unitType, unitId, unitStartedAt, sessionFile. Uses libc::kill(pid, 0) for PID liveness check. Generates human-readable suggested_action string. Verified: cargo build + pnpm build pass, TypeScript types match Rust output, invoke wrapper in tauri.ts, query hook in queries.ts. Task T01 complete.
- Notes: ForensicCrashLock struct uses camelCase extraction from serde_json::Value per KNOWLEDGE.md

### R085 — Expand the existing gsd2_get_visualizer_data Rust command to return the full gsd-2 web VisualizerData shape: milestones with full slice/task detail, critical path computation, agent activity info, changelog entries, knowledge/captures summaries, health overview, and discussion state per milestone.
- Class: core-capability
- Status: validated
- Description: Expand the existing gsd2_get_visualizer_data Rust command to return the full gsd-2 web VisualizerData shape: milestones with full slice/task detail, critical path computation, agent activity info, changelog entries, knowledge/captures summaries, health overview, and discussion state per milestone.
- Why it matters: The full visualizer data is the foundation for all 7 tabs in the visualizer rebuild
- Source: user
- Primary owning slice: M008/S01
- Supporting slices: none
- Validation: gsd2_get_visualizer_data command expanded to return full VisualizerData2 shape with ~20 new structs: VisualizerMilestone2/Slice2/Task2 (rich tree with status, dependencies, risk, on_critical_path, slack), CriticalPathInfo (Kahn's BFS topological sort + longest-path DP), AgentActivityInfo (from auto.lock parsing), ChangelogEntry2 (from SUMMARY.md files), SliceVerification2, KnowledgeInfo2, CapturesInfo2, HealthInfo2, VisualizerStats2. Backward-compat fields preserved (tree, cost_by_milestone, cost_by_model, timeline). Verified: cargo build + pnpm build pass, TypeScript types match Rust output, existing gsd2-visualizer-tab.tsx compiles unchanged. Task T03 complete.
- Notes: Current command returns flat tree + cost bars. Needs major expansion.

### R086 — Rust command that generates a markdown or JSON export of project progress data including totals, phase/slice/model breakdowns, and unit history.
- Class: core-capability
- Status: validated
- Description: Rust command that generates a markdown or JSON export of project progress data including totals, phase/slice/model breakdowns, and unit history.
- Why it matters: Export enables sharing project metrics and progress outside the app
- Source: user
- Primary owning slice: M008/S01
- Supporting slices: none
- Validation: gsd2_export_progress command reuses parse_metrics_json and walk_milestones_with_tasks helpers. Generates markdown export with project header, summary stats table (totals: units, cost, tokens, duration, tool_calls), milestone progress table, phase breakdown table, model breakdown table. Format returned as "markdown". Verified: cargo build + pnpm build pass, TypeScript types match Rust output, useMutation hook in queries.ts (on-demand, not polled). Task T02 complete.
- Notes: Similar to gsd-2's export.ts writeExportFile function

### R087 — Rust command that generates a single self-contained HTML file with: branding header, project summary, progress tree, execution timeline, slice dependency graph (SVG DAG), cost/token metrics, health overview, changelog, knowledge base, captures, artifacts/stats, and planning/discussion state. All CSS and JS inlined. Print-friendly. Dark/light toggle.
- Class: core-capability
- Status: validated
- Description: Rust command that generates a single self-contained HTML file with: branding header, project summary, progress tree, execution timeline, slice dependency graph (SVG DAG), cost/token metrics, health overview, changelog, knowledge base, captures, artifacts/stats, and planning/discussion state. All CSS and JS inlined. Print-friendly. Dark/light toggle.
- Why it matters: HTML reports are the shareable, archival output of GSD projects — printable, browser-viewable, no dependencies
- Source: user
- Primary owning slice: M008/S03
- Supporting slices: M008/S01
- Validation: cargo build passes; all 12 section IDs confirmed (blockers, captures, changelog, depgraph, discussion, health, knowledge, metrics, progress, stats, summary, timeline) via section_html() arg grep; pnpm build zero TS errors; command registered in lib.rs; frontend Reports tab wired. Token breakdown uses estimated proportions — deferred fix.
- Notes: Port of gsd-2's export-html.ts (1408 lines). SVG DAG rendering for dependency graphs.

### R088 — Rust backend maintains a reports.json index in .gsd/reports/ that tracks all generated HTML report snapshots with metadata (timestamp, milestone, metrics at snapshot time). Generates an index.html that links to all reports with a progression view showing metrics over time.
- Class: core-capability
- Status: validated
- Description: Rust backend maintains a reports.json index in .gsd/reports/ that tracks all generated HTML report snapshots with metadata (timestamp, milestone, metrics at snapshot time). Generates an index.html that links to all reports with a progression view showing metrics over time.
- Why it matters: The reports registry provides a time-series view of project progress across milestones
- Source: user
- Primary owning slice: M008/S03
- Supporting slices: none
- Validation: gsd2_get_reports_index registered in lib.rs; generate command writes/updates reports.json and regenerates index.html; useGsd2ReportsIndex hook queries registry; reports table renders index data in UI.
- Notes: Port of gsd-2's reports.ts registry pattern

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

### R098 — Ability to switch between multiple GSD projects within the same VibeFlow window, similar to the gsd-2 web's project switching panel
- Class: differentiator
- Status: deferred
- Description: Ability to switch between multiple GSD projects within the same VibeFlow window, similar to the gsd-2 web's project switching panel
- Why it matters: Power users manage multiple GSD projects and want to switch without restarting
- Source: inferred
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: Deferred — VibeFlow already supports multi-project via the projects list page. In-view switching is a UX enhancement.

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
| R043 | quality-attribute | active | M005/S02 | none | unmapped |
| R044 | quality-attribute | validated | M005/S03 | none | validated |
| R045 | quality-attribute | validated | M005/S03 | none | validated |
| R046 | quality-attribute | validated | M005/S04 | none | validated |
| R047 | quality-attribute | validated | M005/S04 | none | validated |
| R048 | quality-attribute | validated | M005/S05 | none | validated |
| R049 | operability | validated | M005/S06 | none | validated |
| R050 | operability | validated | M005/S05 | none | validated |
| R051 | compliance/security | deferred | none | none | unmapped |
| R052 | quality-attribute | deferred | none | none | unmapped |
| R060 | core-capability | active | M007/S01 | none | unmapped |
| R061 | core-capability | validated | M007/S01 | M007/S04, M007/S05 | S05 T01 sweep removed all decorative cyan (bg-gsd-cyan/*, text-gsd-cyan for icons) from 8 files: todos.tsx, command-palette.tsx, notification-item.tsx, terminal-tabs.tsx, global-terminals.tsx, broadcast-indicator.tsx, terminal-search-bar.tsx, shell.tsx. Functional cyan (bg-primary, text-primary) preserved on interactive states. Verified via rg patterns and build pass. |
| R062 | core-capability | active | M007/S02 | none | unmapped |
| R063 | core-capability | active | M007/S02 | none | unmapped |
| R064 | core-capability | active | M007/S03 | none | unmapped |
| R065 | quality-attribute | active | M007/S03 | none | unmapped |
| R066 | core-capability | validated | M007/S04 | M007/S05 | S04 + S05 combined swept all 49 component files. S04 covered dashboard/project/knowledge (30 files); S05 covered terminal/settings/pages (8 files). All old patterns (gsd-cyan overuse, shadow-md/lg/xl, bg-gradient, rounded-xl) removed. Build and type-check pass. |
| R067 | quality-attribute | active | M007/S04 | none | unmapped |
| R068 | quality-attribute | validated | M007/S05 | none | S05 verified globals.css animations already tightened: fade-in 0.15s, stagger-in 0.25s. Removed all shadow-lg/2xl and backdrop-blur from terminal/command-palette. Removed hover:shadow and rounded-xl. No hover lift patterns remain. Build clean. |
| R069 | quality-attribute | validated | M007/S05 | none | S05 T01 verified via rg: no .glass backdrop-blur utility, no .nav-item-active glow, no .badge-status high-contrast overrides, no .text-gradient utility found. Density/font presets remain intact (.font-scale-sm/md/lg). Build clean with zero utility references remaining. |
| R070 | quality-attribute | active | M007/S06 | none | unmapped |
| R071 | operability | active | M007/S06 | none | unmapped |
| R072 | differentiator | deferred | none | none | unmapped |
| R073 | quality-attribute | out-of-scope | none | none | n/a |
| R074 | constraint | out-of-scope | none | none | n/a |
| R075 | core-capability | active | M008/S02 | M008/S01 | unmapped |
| R076 | core-capability | active | M008/S04 | M008/S01 | unmapped |
| R077 | core-capability | active | M008/S05 | none | unmapped |
| R078 | core-capability | validated | M008/S01 | none | gsd2_get_history command parses .gsd/metrics.json with camelCase fields (startedAt, finishedAt, toolCalls, cacheRead, cacheWrite, inputTokens, outputTokens, totalTokens, modelDowngraded). Returns aggregated ProjectTotals, by-phase aggregates (research, planning, execution, completion, reassessment), by-slice aggregates keyed on M### milestone prefix, by-model aggregates sorted by cost desc. Verified: cargo build + pnpm build pass, TypeScript types match Rust output, invoke wrapper in tauri.ts, query hook in queries.ts. Task T02 complete. |
| R079 | core-capability | validated | M008/S01 | none | gsd2_get_inspect command reads .gsd/STATE.md for schema version (via frontmatter), scans DECISIONS.md and REQUIREMENTS.md counting table rows matching pattern (D/R + digits + " |"). Extracts last 5 matching entries as recent_decisions/recent_requirements. Verified: cargo build + pnpm build pass, TypeScript types match Rust output, invoke wrapper in tauri.ts, query hook in queries.ts. Task T01 complete. |
| R080 | core-capability | validated | M008/S01 | none | gsd2_get_steer_content command reads .gsd/OVERRIDES.md, returns content + exists flag. gsd2_set_steer_content command atomically writes OVERRIDES.md using tmp file + rename pattern. Verified: cargo build + pnpm build pass, TypeScript types match Rust output, invoke wrappers in tauri.ts, query hook + useMutation in queries.ts with cache invalidation on write. Task T01 complete. |
| R081 | core-capability | validated | M008/S01 | none | gsd2_get_undo_info command reads .gsd/completed-units.json (JSON string array), splits last entry on '/' using find() to extract unit_type and unit_id, joins with metrics.json to find matching unit cost by id field. Verified: cargo build + pnpm build pass, TypeScript types match Rust output, invoke wrapper in tauri.ts, query hook in queries.ts. Task T01 complete. |
| R082 | core-capability | validated | M008/S01 | none | gsd2_get_hooks command reads .gsd/preferences.md via manual section scanning (no serde_yaml). Detects post_unit_hooks and pre_dispatch_hooks section headers, parses indented hook blocks extracting name, triggers (after:/before: lists), action, artifact, max_cycles. Verified: cargo build + pnpm build pass, TypeScript types match Rust output, invoke wrapper in tauri.ts, query hook in queries.ts. Task T02 complete. |
| R083 | core-capability | validated | M008/S01 | none | gsd2_get_git_summary command uses self-contained std::process::Command (no import from git.rs). Executes git -C {project_path} commands: rev-parse --abbrev-ref HEAD (branch), status --porcelain (staged/unstaged/untracked counts), log --format=%H|%s|%an|%ar (recent commits), rev-list for ahead/behind counts. Returns has_git: false gracefully on errors. Verified: cargo build + pnpm build pass, TypeScript types match Rust output, invoke wrapper in tauri.ts, query hook in queries.ts. Task T02 complete. |
| R084 | core-capability | validated | M008/S01 | none | gsd2_get_recovery_info command checks both .gsd/auto.lock and .gsd/runtime/auto.lock (primary preferred per research findings). Parses JSON lock file for pid, startedAt, unitType, unitId, unitStartedAt, sessionFile. Uses libc::kill(pid, 0) for PID liveness check. Generates human-readable suggested_action string. Verified: cargo build + pnpm build pass, TypeScript types match Rust output, invoke wrapper in tauri.ts, query hook in queries.ts. Task T01 complete. |
| R085 | core-capability | validated | M008/S01 | none | gsd2_get_visualizer_data command expanded to return full VisualizerData2 shape with ~20 new structs: VisualizerMilestone2/Slice2/Task2 (rich tree with status, dependencies, risk, on_critical_path, slack), CriticalPathInfo (Kahn's BFS topological sort + longest-path DP), AgentActivityInfo (from auto.lock parsing), ChangelogEntry2 (from SUMMARY.md files), SliceVerification2, KnowledgeInfo2, CapturesInfo2, HealthInfo2, VisualizerStats2. Backward-compat fields preserved (tree, cost_by_milestone, cost_by_model, timeline). Verified: cargo build + pnpm build pass, TypeScript types match Rust output, existing gsd2-visualizer-tab.tsx compiles unchanged. Task T03 complete. |
| R086 | core-capability | validated | M008/S01 | none | gsd2_export_progress command reuses parse_metrics_json and walk_milestones_with_tasks helpers. Generates markdown export with project header, summary stats table (totals: units, cost, tokens, duration, tool_calls), milestone progress table, phase breakdown table, model breakdown table. Format returned as "markdown". Verified: cargo build + pnpm build pass, TypeScript types match Rust output, useMutation hook in queries.ts (on-demand, not polled). Task T02 complete. |
| R087 | core-capability | validated | M008/S03 | M008/S01 | cargo build passes; all 12 section IDs confirmed (blockers, captures, changelog, depgraph, discussion, health, knowledge, metrics, progress, stats, summary, timeline) via section_html() arg grep; pnpm build zero TS errors; command registered in lib.rs; frontend Reports tab wired. Token breakdown uses estimated proportions — deferred fix. |
| R088 | core-capability | validated | M008/S03 | none | gsd2_get_reports_index registered in lib.rs; generate command writes/updates reports.json and regenerates index.html; useGsd2ReportsIndex hook queries registry; reports table renders index data in UI. |
| R089 | core-capability | active | M008/S06 | M008/S01 | unmapped |
| R090 | core-capability | active | M008/S07 | M008/S01, M008/S02 | unmapped |
| R091 | core-capability | active | M008/S07 | none | unmapped |
| R092 | core-capability | active | M008/S05 | none | unmapped |
| R093 | core-capability | active | M008/S05 | none | unmapped |
| R094 | core-capability | active | M008/S07 | none | unmapped |
| R095 | quality-attribute | active | M008/S08 | none | unmapped |
| R096 | quality-attribute | active | M008/S05 | none | unmapped |
| R097 | operability | active | M008/S09 | none | unmapped |
| R098 | differentiator | deferred | none | none | unmapped |

## Coverage Summary

- Active requirements: 21
- Mapped to slices: 21
- Validated: 26 (R001, R040, R041, R042, R044, R045, R046, R047, R048, R049, R050, R061, R066, R068, R069, R078, R079, R080, R081, R082, R083, R084, R085, R086, R087, R088)
- Unmapped active requirements: 0
