# S04: Accessibility & Keyboard Nav

**Goal:** Tab key navigates the full sidebar, focus rings are visible on all nav buttons, ARIA landmarks label the layout regions, and `aria-current="page"` marks the active nav item.
**Demo:** Pressing Tab moves focus through sidebar nav items with visible ring outlines; a screen reader announces "Sidebar navigation" / "Project navigation" landmarks and reports "current page" on the active item; `getByRole("main")` and `getByRole("navigation")` resolve in tests.

## Must-Haves

- `<nav>` has `aria-label="Sidebar navigation"` in global mode and `aria-label="Project navigation"` in project mode
- Main content wrapper has `role="main"`
- Active global nav buttons have `aria-current="page"`; inactive ones do not
- Active project view buttons have `aria-current="page"`; inactive ones do not
- All sidebar nav buttons have `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` classes
- `<aside>` does NOT get `role="navigation"` (would break existing `getByRole("complementary")` tests)
- All 143 existing tests still pass
- New accessibility tests assert `role="main"`, named navigation landmark, and `aria-current` on active items

## Verification

- `pnpm test --run` — all existing 143 tests pass plus 3+ new accessibility tests (146+ total)
- `pnpm build` — exits 0 with zero TypeScript errors
- `grep -c 'aria-current' src/components/layout/main-layout.tsx` — returns ≥ 2 (global + project nav)
- `grep -c 'aria-label.*navigation' src/components/layout/main-layout.tsx` — returns ≥ 1
- `grep -c 'role="main"' src/components/layout/main-layout.tsx` — returns 1
- `grep -c 'focus-visible:ring-2' src/components/layout/main-layout.tsx` — returns ≥ 2

## Tasks

- [x] **T01: Add ARIA landmarks, aria-current, and focus rings to main-layout** `est:45m`
  - Why: Delivers R046 (focus rings + keyboard nav) and R047 (ARIA landmarks + aria-current) in a single pass — all changes are in one component file plus its test file
  - Files: `src/components/layout/main-layout.tsx`, `src/components/layout/main-layout.test.tsx`
  - Do: (1) Add `aria-label={isProjectRoute ? "Project navigation" : "Sidebar navigation"}` to the `<nav>` element. (2) Add `role="main"` to the main content outer `<div>`. (3) Add `aria-current={isActive ? "page" : undefined}` to both global nav `<button>` elements and project view `<button>` elements. (4) Append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` to the className of all sidebar nav buttons (global nav, project nav, and recent project buttons). (5) Add a `describe("Accessibility")` block to the test file with tests for `role="main"`, navigation landmark with name, and `aria-current` on the active item. Do NOT add `role="navigation"` to `<aside>` — it must keep its implicit `complementary` role.
  - Verify: `pnpm test --run` passes 146+ tests; `pnpm build` exits 0; grep confirms aria attributes present
  - Done when: all 143 existing tests pass, 3+ new accessibility tests pass, build succeeds, grep checks confirm landmarks/aria-current/focus-rings are applied

## Files Likely Touched

- `src/components/layout/main-layout.tsx`
- `src/components/layout/main-layout.test.tsx`
