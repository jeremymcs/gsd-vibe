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

### R044 — Every user-triggered mutation shows success/failure toast
- Class: quality-attribute
- Status: active
- Description: Every user-triggered mutation shows success/failure toast
- Why it matters: No silent mutations
- Source: inferred
- Primary owning slice: M005/S03
- Supporting slices: none
- Validation: S03 established MetricCard patterns for dashboard widgets with consistent loading skeleton, error card, and empty states. S02, S04, S05 applied same patterns across new components. Pattern documentation exists in KNOWLEDGE.md. Pending: deployment and real-world verification under slow network/error conditions.
- Notes: Toast styling may need minor adjustment for new palette

### R045 — View crossfade, shimmer skeleton, hover lift, stagger-in
- Class: quality-attribute
- Status: active
- Description: View crossfade, shimmer skeleton, hover lift, stagger-in
- Why it matters: App feels polished
- Source: user
- Primary owning slice: M005/S03
- Supporting slices: none
- Validation: All new components (S02-S06) use existing design system primitives (MetricCard, SectionLabel, StatCard, ProgressBar) with Tailwind CSS and HSL color tokens. Dark mode support verified via existing CSS variable strategy. Pending: deployment verification across light/dark modes and responsive breakpoints.
- Notes: M007 will restrain these — hover lift removed, others faster

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

### R061 — Cyan accent (--primary, --ring, --gsd-cyan) retained as the brand hue but used only for focus rings, active nav indicators, links, and interactive highlights. Removed from backgrounds, glows, gradients, card borders, and decorative elements. Saturation may be reduced for subtlety.
- Class: core-capability
- Status: active
- Description: Cyan accent (--primary, --ring, --gsd-cyan) retained as the brand hue but used only for focus rings, active nav indicators, links, and interactive highlights. Removed from backgrounds, glows, gradients, card borders, and decorative elements. Saturation may be reduced for subtlety.
- Why it matters: The current design splashes cyan across 34 files — backgrounds, glows, gradients, badges, progress bars. This is the single biggest contributor to the "gamer" feel.
- Source: user
- Primary owning slice: M007/S01
- Supporting slices: M007/S04, M007/S05
- Validation: unmapped
- Notes: gsd-cyan CSS variable stays but may get lower saturation; the Tailwind gsd.cyan color reference stays

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

### R066 — Every component file containing gsd-cyan overuse, shadow-md/lg/xl, bg-gradient, glass, hover:-translate, active:scale, or rounded-xl is updated to use the new design language. Specific files: dashboard cards, project overview, knowledge viewer, activity feed, diagnostics panels, terminal panels, command palette, notification items, todos, logs, projects list.
- Class: core-capability
- Status: active
- Description: Every component file containing gsd-cyan overuse, shadow-md/lg/xl, bg-gradient, glass, hover:-translate, active:scale, or rounded-xl is updated to use the new design language. Specific files: dashboard cards, project overview, knowledge viewer, activity feed, diagnostics panels, terminal panels, command palette, notification items, todos, logs, projects list.
- Why it matters: A design system only works if it's applied everywhere — leaving old patterns in 49 files would create a split personality
- Source: user
- Primary owning slice: M007/S04
- Supporting slices: M007/S05
- Validation: unmapped
- Notes: Split across S04 (dashboard/project/knowledge — 30 files) and S05 (terminal/settings/pages — 19 files)

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

### R068 — Reduce animation durations (fade-in 0.2→0.15s, stagger-in 0.4→0.25s). Remove hover:-translate-y-0.5 and hover:shadow-xl from interactive cards. Keep shimmer and crossfade but faster. Stagger delay cap stays at 1000ms.
- Class: quality-attribute
- Status: active
- Description: Reduce animation durations (fade-in 0.2→0.15s, stagger-in 0.4→0.25s). Remove hover:-translate-y-0.5 and hover:shadow-xl from interactive cards. Keep shimmer and crossfade but faster. Stagger delay cap stays at 1000ms.
- Why it matters: The hover lift (translateY + shadow-xl) is the most un-Linear animation pattern in the app
- Source: user
- Primary owning slice: M007/S05
- Supporting slices: none
- Validation: unmapped
- Notes: Animations defined in both globals.css and tailwind.config.js — both need updating

### R069 — Remove .glass backdrop-blur utility, .nav-item-active glow box-shadow, .badge-status high-contrast overrides, .text-gradient utility, shadow-glow definitions from tailwind.config.js. Clean density/font presets if unused.
- Class: quality-attribute
- Status: active
- Description: Remove .glass backdrop-blur utility, .nav-item-active glow box-shadow, .badge-status high-contrast overrides, .text-gradient utility, shadow-glow definitions from tailwind.config.js. Clean density/font presets if unused.
- Why it matters: Dead CSS utilities that reference the old design language will confuse future contributors and may leak back into components
- Source: user
- Primary owning slice: M007/S05
- Supporting slices: none
- Validation: unmapped
- Notes: Some utilities may still be referenced — verify with grep before deletion

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
| R044 | quality-attribute | active | M005/S03 | none | S03 established MetricCard patterns for dashboard widgets with consistent loading skeleton, error card, and empty states. S02, S04, S05 applied same patterns across new components. Pattern documentation exists in KNOWLEDGE.md. Pending: deployment and real-world verification under slow network/error conditions. |
| R045 | quality-attribute | active | M005/S03 | none | All new components (S02-S06) use existing design system primitives (MetricCard, SectionLabel, StatCard, ProgressBar) with Tailwind CSS and HSL color tokens. Dark mode support verified via existing CSS variable strategy. Pending: deployment verification across light/dark modes and responsive breakpoints. |
| R046 | quality-attribute | validated | M005/S04 | none | validated |
| R047 | quality-attribute | validated | M005/S04 | none | validated |
| R048 | quality-attribute | validated | M005/S05 | none | validated |
| R049 | operability | validated | M005/S06 | none | validated |
| R050 | operability | validated | M005/S05 | none | validated |
| R051 | compliance/security | deferred | none | none | unmapped |
| R052 | quality-attribute | deferred | none | none | unmapped |
| R060 | core-capability | active | M007/S01 | none | unmapped |
| R061 | core-capability | active | M007/S01 | M007/S04, M007/S05 | unmapped |
| R062 | core-capability | active | M007/S02 | none | unmapped |
| R063 | core-capability | active | M007/S02 | none | unmapped |
| R064 | core-capability | active | M007/S03 | none | unmapped |
| R065 | quality-attribute | active | M007/S03 | none | unmapped |
| R066 | core-capability | active | M007/S04 | M007/S05 | unmapped |
| R067 | quality-attribute | active | M007/S04 | none | unmapped |
| R068 | quality-attribute | active | M007/S05 | none | unmapped |
| R069 | quality-attribute | active | M007/S05 | none | unmapped |
| R070 | quality-attribute | active | M007/S06 | none | unmapped |
| R071 | operability | active | M007/S06 | none | unmapped |
| R072 | differentiator | deferred | none | none | unmapped |
| R073 | quality-attribute | out-of-scope | none | none | n/a |
| R074 | constraint | out-of-scope | none | none | n/a |

## Coverage Summary

- Active requirements: 15
- Mapped to slices: 15
- Validated: 9 (R001, R040, R041, R042, R046, R047, R048, R049, R050)
- Unmapped active requirements: 0
