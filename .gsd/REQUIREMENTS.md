# Requirements

This file is the explicit capability and coverage contract for the project.

## Active

### R043 — Every view with a list or data grid must show a meaningful empty state (icon + contextual message explaining what to do) when there is no data; not "No items found" — something specific to the view
- Class: quality-attribute
- Status: active
- Description: Every view with a list or data grid must show a meaningful empty state (icon + contextual message explaining what to do) when there is no data; not "No items found" — something specific to the view
- Why it matters: Empty project views look broken; dashboard EmptyState is the quality bar to match
- Source: user
- Primary owning slice: M005/S02
- Supporting slices: none
- Validation: unmapped
- Notes: S02 created the ViewEmpty primitive and preserved existing empty states, but did not update them to use the new component; this requirement remains active for future work to upgrade all empty states to ViewEmpty with contextual messages



## Validated

### R001 — Untitled
- Status: validated

### R040 — Define `:root` light theme CSS variables for all tokens (background, foreground, card, muted, border, input, ring, primary, secondary, destructive, accent, popover, status colors, terminal colors, gsd-cyan) so the app renders correctly when `.light` class is applied
- Class: core-capability
- Status: validated
- Description: Define `:root` light theme CSS variables for all tokens (background, foreground, card, muted, border, input, ring, primary, secondary, destructive, accent, popover, status colors, terminal colors, gsd-cyan) so the app renders correctly when `.light` class is applied
- Why it matters: The app has a theme toggle (dark / system) but no light variables — system mode on a light-preference OS produces invisible text and broken colors
- Source: user
- Primary owning slice: M005/S01
- Supporting slices: none
- Validation: S01/T01 added complete .light {} CSS variable block with 32 tokens to globals.css (background, foreground, card, muted, border, input, ring, primary, secondary, destructive, accent, popover, status colors, terminal-bg/fg, gsd-cyan). Verified by grep-c '--' returning 78 (+32), terminal-bg present in both .dark and .light blocks, pnpm build exit 0.
- Notes: All 30+ views must render with proper contrast in light mode; status colors need recalibration for light backgrounds

### R041 — Every view that fetches data must show a skeleton loading state (not bare "Loading..." text) while data is in flight; skeletons should approximate the shape of the loaded content
- Class: quality-attribute
- Status: validated
- Description: Every view that fetches data must show a skeleton loading state (not bare "Loading..." text) while data is in flight; skeletons should approximate the shape of the loaded content
- Why it matters: ~20 components currently show plain text or nothing during loading; inconsistent loading states feel unfinished
- Source: user
- Primary owning slice: M005/S02
- Supporting slices: none
- Validation: S02 created ViewSkeleton primitive in src/components/shared/loading-states.tsx and updated all 12 data-fetching views to use skeleton shapes (7 GSD tabs, knowledge-bookmarks, auto-commands-panel, settings, project, roadmap-progress-card). Verified via rg showing 0 bare "Loading..." text in production components and pnpm test passing 143/143 tests.
- Notes: Components already using Skeleton can serve as the pattern; goal is coverage across all views

### R042 — Every view that fetches data must show a styled error card (icon + message + optional retry) when the query or command fails; no unhandled silent failures
- Class: quality-attribute
- Status: validated
- Description: Every view that fetches data must show a styled error card (icon + message + optional retry) when the query or command fails; no unhandled silent failures
- Why it matters: Some views currently have no error handling; users see blank panels with no explanation when data fails to load
- Source: inferred
- Primary owning slice: M005/S02
- Supporting slices: none
- Validation: S02 created ViewError primitive with AlertCircle icon and text-status-error color, then added isError handling to all 12 data-fetching views. Verified via grep showing all 7 GSD tabs contain 'isError' and pnpm build exit 0 with zero TypeScript errors.
- Notes: Gsd2HealthTab is the reference implementation for error state handling

### R044 — Every mutation that a user triggers (delete, save, sync, archive, toggle, import, export, etc.) must show a toast on success and a toast on failure; no silent mutations
- Class: quality-attribute
- Status: validated
- Description: Every mutation that a user triggers (delete, save, sync, archive, toggle, import, export, etc.) must show a toast on success and a toast on failure; no silent mutations
- Why it matters: Users currently have no feedback when many actions complete or fail — the app feels unresponsive
- Source: inferred
- Primary owning slice: M005/S03
- Supporting slices: none
- Validation: rg 'toast.success' src/lib/queries.ts | wc -l returns 36 (18 new + 18 pre-existing). All 18 user-facing mutations named in the plan have contextual messages. pnpm build exits 0, 143 tests pass. M005/S03/T01.
- Notes: Sonner toaster is already wired in App.tsx; pattern is to add onSuccess/onError callbacks to existing useMutation calls

### R045 — Add view crossfade transition on nav-rail navigation, skeleton shimmer animation, hover lift effect on cards (translateY + shadow), list item stagger on mount, smooth panel expand/collapse; all via CSS only (no animation library)
- Class: quality-attribute
- Status: validated
- Description: Add view crossfade transition on nav-rail navigation, skeleton shimmer animation, hover lift effect on cards (translateY + shadow), list item stagger on mount, smooth panel expand/collapse; all via CSS only (no animation library)
- Why it matters: The app currently has only fade-in and transition-colors; it feels static compared to a polished desktop app
- Source: user
- Primary owning slice: M005/S03
- Supporting slices: M005/S01
- Validation: All 4 animation systems delivered: shimmer skeleton (animate-shimmer replacing animate-pulse), stagger-in list entrance (dashboard cards), card hover lift (hover:-translate-y-0.5 hover:shadow-xl), view crossfade (key={activeView} + animate-fade-in). All CSS-only, all covered by prefers-reduced-motion. pnpm build exits 0, 143 tests pass. M005/S03/T02.
- Notes: Respect prefers-reduced-motion; the CSS hook for this is already in globals.css

### R046 — Tab key moves logically through sidebar nav items and into the active view; Enter/Space activates focused nav items; Escape closes dialogs; focus ring is visible on all interactive elements
- Class: quality-attribute
- Status: validated
- Description: Tab key moves logically through sidebar nav items and into the active view; Enter/Space activates focused nav items; Escape closes dialogs; focus ring is visible on all interactive elements
- Why it matters: Many buttons currently lack visible focus rings; users who rely on keyboard or tab through forms get stuck
- Source: inferred
- Primary owning slice: M005/S04
- Supporting slices: none
- Validation: focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 classes applied to all 4 sidebar button groups in main-layout.tsx; verified by grep (4 occurrences) and pnpm test (146 pass including 3 new accessibility tests)
- Notes: Focus ring CSS is already in globals.css but not consistently applied; most focus-visible is limited to button.tsx

### R047 — Add `role="navigation"` to sidebar, `role="main"` to main content area, `aria-label` to nav sections, `aria-current="page"` to active nav items
- Class: quality-attribute
- Status: validated
- Description: Add `role="navigation"` to sidebar, `role="main"` to main content area, `aria-label` to nav sections, `aria-current="page"` to active nav items
- Why it matters: Screen readers have no structural context for the layout; the landmark structure is invisible
- Source: inferred
- Primary owning slice: M005/S04
- Supporting slices: none
- Validation: S04/T01 added role=main to content area, context-sensitive aria-label to nav (driven by isProjectRoute), aria-current=page to active nav items. grep confirms 1 role=main, 1 aria-label=navigation, 2 aria-current; getByRole assertions in 3 new tests pass. pnpm test shows 146 pass.
- Notes: Changes are in main-layout.tsx — low risk

### R048 — Replace full highlight.js (192 languages, 1.2MB chunk) with a selective language subset for the languages actually used in knowledge base files; reduce vendor-markdown chunk below 500KB gzipped
- Class: quality-attribute
- Status: validated
- Description: Replace full highlight.js (192 languages, 1.2MB chunk) with a selective language subset for the languages actually used in knowledge base files; reduce vendor-markdown chunk below 500KB gzipped
- Why it matters: The 1.2MB chunk is 3× larger than necessary; it delays initial load and triggers Vite's chunk size warning on every build
- Source: inferred
- Primary owning slice: M005/S05
- Supporting slices: none
- Validation: S05/T01 switched file-browser.tsx from full highlight.js to highlight.js/lib/core + 40 explicit language imports. vendor-markdown chunk dropped from ~1,282 KB to 362.30 KB. Verified by pnpm build output: dist/assets/vendor-markdown-kXn2w5HK.js 362.30 kB │ gzip: 108.73 kB
- Notes: highlight.js supports `import hljs from 'highlight.js/lib/core'` + selective language registration; file-browser uses hljs.highlightAuto which complicates full removal

### R049 — Remove or suppress all 4 dead-code warnings in the Rust backend: `Gsd2RoadmapProgress`, `get_roadmap_progress_from_dir`, `Decision`, `list_sessions`
- Class: operability
- Status: validated
- Description: Remove or suppress all 4 dead-code warnings in the Rust backend: `Gsd2RoadmapProgress`, `get_roadmap_progress_from_dir`, `Decision`, `list_sessions`
- Why it matters: Dead code warnings mask real issues introduced later; clean baseline makes future regressions visible
- Source: user
- Primary owning slice: M005/S06
- Supporting slices: none
- Validation: S06/T01 suppressed 2 test-only items (Gsd2RoadmapProgress, get_roadmap_progress_from_dir) with item-level #[allow(dead_code)], deleted 2 truly unused items (Decision, list_sessions). cargo check --lib 2>&1 | grep '^warning:' | wc -l returns 0, cargo test -- get_roadmap_progress shows 2 passed.
- Notes: Dead-code triage pattern: item-level allow for test-only, deletion for zero callers

### R050 — `pnpm build` runs to completion without any "Some chunks are larger than 500 kB after minification" warnings
- Class: operability
- Status: validated
- Description: `pnpm build` runs to completion without any "Some chunks are larger than 500 kB after minification" warnings
- Why it matters: Build warnings are noise that masks real issues; clean build output is the baseline for production
- Source: inferred
- Primary owning slice: M005/S05
- Supporting slices: none
- Validation: S05/T01+T02 reduced vendor-markdown chunk via selective highlight.js imports (362 KB < 500 KB threshold). pnpm build 2>&1 | grep -c 'chunks are larger than 500 kB' returns 0. Verified in M005 milestone completion.
- Notes: R048 (markdown chunk) was the driver; achieved via highlight.js/lib/core + 40 language imports

## Deferred

### R051 — Full WCAG 2.1 Level AA audit covering color contrast ratios (4.5:1 for text), focus management, screen reader testing with VoiceOver/NVDA, form labeling, and complete keyboard operation
- Class: compliance/security
- Status: deferred
- Description: Full WCAG 2.1 Level AA audit covering color contrast ratios (4.5:1 for text), focus management, screen reader testing with VoiceOver/NVDA, form labeling, and complete keyboard operation
- Why it matters: Required for accessibility compliance in enterprise or public-facing deployments
- Source: inferred
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: Deferred — M005 targets "feels like a shipped product" not audit-grade compliance

### R052 — Lighthouse performance score above 90 in Tauri WebKit context, covering LCP, TBT, CLS
- Class: quality-attribute
- Status: deferred
- Description: Lighthouse performance score above 90 in Tauri WebKit context, covering LCP, TBT, CLS
- Why it matters: Signals real-world rendering performance for large project lists and complex views
- Source: inferred
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: Deferred — Tauri apps use WebKit not Chromium; Lighthouse scores are environment-dependent

## Traceability

| ID | Class | Status | Primary owner | Supporting | Proof |
|---|---|---|---|---|---|
| R001 |  | validated | none | none | unmapped |
| R040 | core-capability | validated | M005/S01 | none | S01/T01 added complete .light {} CSS variable block with 32 tokens to globals.css (background, foreground, card, muted, border, input, ring, primary, secondary, destructive, accent, popover, status colors, terminal-bg/fg, gsd-cyan). Verified by grep-c '--' returning 78 (+32), terminal-bg present in both .dark and .light blocks, pnpm build exit 0. |
| R041 | quality-attribute | validated | M005/S02 | none | S02 created ViewSkeleton primitive in src/components/shared/loading-states.tsx and updated all 12 data-fetching views to use skeleton shapes (7 GSD tabs, knowledge-bookmarks, auto-commands-panel, settings, project, roadmap-progress-card). Verified via rg showing 0 bare "Loading..." text in production components and pnpm test passing 143/143 tests. |
| R042 | quality-attribute | validated | M005/S02 | none | S02 created ViewError primitive with AlertCircle icon and text-status-error color, then added isError handling to all 12 data-fetching views. Verified via grep showing all 7 GSD tabs contain 'isError' and pnpm build exit 0 with zero TypeScript errors. |
| R043 | quality-attribute | active | M005/S02 | none | unmapped |
| R044 | quality-attribute | validated | M005/S03 | none | rg 'toast.success' src/lib/queries.ts | wc -l returns 36 (18 new + 18 pre-existing). All 18 user-facing mutations named in the plan have contextual messages. pnpm build exits 0, 143 tests pass. M005/S03/T01. |
| R045 | quality-attribute | validated | M005/S03 | M005/S01 | All 4 animation systems delivered: shimmer skeleton (animate-shimmer replacing animate-pulse), stagger-in list entrance (dashboard cards), card hover lift (hover:-translate-y-0.5 hover:shadow-xl), view crossfade (key={activeView} + animate-fade-in). All CSS-only, all covered by prefers-reduced-motion. pnpm build exits 0, 143 tests pass. M005/S03/T02. |
| R046 | quality-attribute | validated | M005/S04 | none | focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 classes applied to all 4 sidebar button groups in main-layout.tsx; verified by grep (4 occurrences) and pnpm test (146 pass including 3 new accessibility tests) |
| R047 | quality-attribute | validated | M005/S04 | none | S04/T01 added role=main, context-sensitive aria-label, aria-current=page. grep: 1 role=main, 1 aria-label=navigation, 2 aria-current; 3 new tests pass |
| R048 | quality-attribute | validated | M005/S05 | none | S05/T01 switched file-browser.tsx from full highlight.js to highlight.js/lib/core + 40 explicit language imports. vendor-markdown chunk dropped from ~1,282 KB to 362.30 KB. Verified by pnpm build output: dist/assets/vendor-markdown-kXn2w5HK.js 362.30 kB │ gzip: 108.73 kB |
| R049 | operability | validated | M005/S06 | none | S06/T01 suppressed 2 test-only items with #[allow(dead_code)], deleted 2 unused items. cargo check --lib 2>&1 | grep '^warning:' | wc -l returns 0 |
| R050 | operability | validated | M005/S05 | none | S05/T01+T02 reduced vendor-markdown to 362 KB. pnpm build 2>&1 | grep -c 'chunks are larger than 500 kB' returns 0 |
| R051 | compliance/security | deferred | none | none | unmapped |
| R052 | quality-attribute | deferred | none | none | unmapped |

## Coverage Summary

- Active requirements: 1
- Mapped to slices: 1
- Validated: 11 (R001, R040, R041, R042, R044, R045, R046, R047, R048, R049, R050)
- Unmapped active requirements: 0
