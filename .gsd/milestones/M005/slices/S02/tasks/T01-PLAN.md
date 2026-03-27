---
estimated_steps: 3
estimated_files: 1
skills_used:
  - react-best-practices
---

# T01: Create shared loading-state primitives

**Slice:** S02 — Consistent State Patterns
**Milestone:** M005

## Description

Create `src/components/shared/loading-states.tsx` with three exported components — `ViewSkeleton`, `ViewError`, `ViewEmpty` — that establish the visual pattern for all loading/error/empty states across the app. These primitives are consumed by T02 to replace bare "Loading..." text and add error handling to ~12 data-fetching views.

The design follows the reference implementation in `gsd2-health-tab.tsx` and the existing `Skeleton` primitive from `@/components/ui/skeleton`. All colors use CSS variables for automatic light/dark theme compatibility (established in S01).

## Steps

1. Create `src/components/shared/loading-states.tsx` with the file header convention:
   ```
   // GSD Vibe - Shared Loading State Primitives
   // Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
   ```

2. Implement three components with these signatures and behaviors:

   **`ViewSkeleton`** — Renders configurable skeleton placeholder lines:
   ```tsx
   export function ViewSkeleton({ lines = 3, className }: { lines?: number; className?: string })
   ```
   - Renders a `<div className="space-y-3">` with `lines` number of `Skeleton` elements
   - First line: `h-4 w-2/3` (simulates a title), remaining lines: `h-8 w-full` (simulates content rows)
   - Import `Skeleton` from `@/components/ui/skeleton`
   - Import `cn` from `@/lib/utils`

   **`ViewError`** — Renders a styled error card with icon and message:
   ```tsx
   export function ViewError({ message, icon, className }: { message: string; icon?: ReactNode; className?: string })
   ```
   - Wraps content in `<Card>` + `<CardContent className="py-8 text-center">`
   - Default icon: `<AlertCircle className="h-8 w-8 text-status-error mx-auto mb-3" />` from lucide-react
   - If custom `icon` prop provided, render it inside `<div className="text-status-error mx-auto mb-3 w-fit">`
   - Message rendered as `<p className="text-sm text-status-error">`
   - Import `Card`, `CardContent` from `@/components/ui/card`
   - Import `AlertCircle` from `lucide-react`

   **`ViewEmpty`** — Renders a contextual empty state with icon, message, and optional description:
   ```tsx
   export function ViewEmpty({ icon, message, description, className }: { icon?: ReactNode; message: string; description?: string; className?: string })
   ```
   - Wraps in `<Card>` + `<CardContent className="py-8 text-center text-muted-foreground">`
   - Icon rendered inside `<div className="mx-auto mb-2 opacity-50 w-fit">`
   - Message: `<p className="text-sm">`
   - Description: `<p className="text-xs mt-1 opacity-70">` (only if provided)

3. Verify with `pnpm build` — must exit 0 with zero TypeScript errors. Also confirm exports: `grep 'export function View' src/components/shared/loading-states.tsx` returns exactly 3 lines.

## Must-Haves

- [ ] `ViewSkeleton` exported with `lines` and `className` props
- [ ] `ViewError` exported with `message`, `icon`, and `className` props; default AlertCircle icon
- [ ] `ViewEmpty` exported with `icon`, `message`, `description`, and `className` props
- [ ] All colors use CSS variables (`text-status-error`, `text-muted-foreground`, `bg-card`) — no hardcoded Tailwind palette colors
- [ ] File includes copyright header
- [ ] `pnpm build` exits 0

## Verification

- `pnpm build` exits 0 with zero TypeScript errors
- `grep -c 'export function View' src/components/shared/loading-states.tsx` returns 3

## Inputs

- `src/components/ui/skeleton.tsx` — existing Skeleton primitive to import
- `src/components/ui/card.tsx` — Card/CardContent for error and empty state wrappers
- `src/components/project/gsd2-health-tab.tsx` — reference implementation showing the three-state pattern (lines 20–48)

## Expected Output

- `src/components/shared/loading-states.tsx` — new file with ViewSkeleton, ViewError, ViewEmpty exports

## Observability Impact

**What signals change:** Before this task, failed or loading queries silently rendered nothing or showed bare text. After this task, consuming components (in T02) will render structured `ViewError` / `ViewSkeleton` / `ViewEmpty` nodes — making loading and failure states visually identifiable in the UI.

**How a future agent inspects this:** 
- `grep 'ViewError\|ViewSkeleton\|ViewEmpty' src/components/project/*.tsx` — confirms which tabs have adopted the primitives.
- `grep 'isError' src/components/project/*.tsx` — confirms error-path coverage.
- TanStack Query devtools in browser DevTools will show the underlying query state; rendered component confirms the visual branch.

**What failure state becomes visible:**
- `ViewError` renders whenever `isError: true` — previously these views would silently render nothing or show stale content. The error card surface makes silent failures visible to end users and to agents inspecting the DOM.
- `ViewEmpty` makes it clear when a query succeeded with no data, distinguishing from a loading state that never resolved.
- `ViewSkeleton` provides deterministic skeleton shape during loading — agents can assert `.animate-pulse` elements are present during data fetches.
