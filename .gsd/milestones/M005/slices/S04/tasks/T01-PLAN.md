---
estimated_steps: 5
estimated_files: 2
skills_used:
  - accessibility
  - test
  - react-best-practices
---

# T01: Add ARIA landmarks, aria-current, and focus rings to main-layout

**Slice:** S04 — Accessibility & Keyboard Nav
**Milestone:** M005

## Description

Add ARIA landmark roles, `aria-current="page"` on active nav items, and visible `focus-visible` ring classes to all sidebar navigation buttons in `main-layout.tsx`. Write new accessibility tests to prove the landmarks and active-item semantics are correct. This single task delivers both R046 (visible focus rings, keyboard nav) and R047 (ARIA landmarks, aria-current).

## Steps

1. **Add `aria-label` to `<nav>`**: Find the `<nav>` element (has className starting with `"flex-1 overflow-y-auto"`). Add `aria-label={isProjectRoute ? "Project navigation" : "Sidebar navigation"}` as a prop. The `isProjectRoute` variable is already in scope.

2. **Add `role="main"` to the main content wrapper**: Find the `<div>` with className `"flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-background to-muted/10"` — this is the main content area next to the `<aside>`. Add `role="main"` to this div. Do NOT change it to a `<main>` element (keep it a `<div>` to avoid any layout risk).

3. **Add `aria-current` to global nav buttons**: In the global navigation section, find the `<button>` that renders each nav item (has `onClick={() => void navigate(item.href)}`). Add `aria-current={isActive ? "page" : undefined}` as a prop. The `isActive` variable is already computed right above it.

4. **Add `aria-current` to project view nav buttons**: In the project-scoped navigation section, find the `<button>` for each view item (has `onClick={() => goToView(view.id)}`). Add `aria-current={isActive ? "page" : undefined}` as a prop. The `isActive` variable (`resolvedView === view.id`) is already in scope.

5. **Add focus-visible ring classes to ALL sidebar nav buttons**: For each of the following button groups, append these classes to the className string: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`
   - **Global nav buttons**: The `<button>` with `onClick={() => void navigate(item.href)}` — add to the `cn()` call's base classes (the first string argument).
   - **Project view buttons**: The `<button>` with `onClick={() => goToView(view.id)}` — add to the `cn()` call's base classes.
   - **Recent project buttons**: The `<button>` with `onClick={() => void navigate(`/projects/${rp.id}`)}` — add to the `cn()` call's base classes.
   - **Command palette trigger**: The `<button>` with `onClick={() => setSearchOpen(true)}` — add to the `cn()` call's base classes.
   - Do NOT touch the collapse toggle button or the shell panel toggle — those already use different patterns.

6. **Write accessibility tests**: Add a new `describe("Accessibility")` block to the existing test file `src/components/layout/main-layout.test.tsx`. Add these tests:
   - `it("has a main content region")` — asserts `screen.getByRole("main")` exists
   - `it("has a named navigation landmark")` — asserts `screen.getByRole("navigation", { name: "Sidebar navigation" })` exists
   - `it("marks active nav item with aria-current=page")` — render with the default route (`/`), find the Home button, assert it has `aria-current="page"`; find a non-active item and assert it does NOT have `aria-current` attribute
   - Import nothing new — `describe`, `it`, `expect`, `render`, `screen` are already imported.

## Must-Haves

- [ ] `<nav>` has dynamic `aria-label` ("Sidebar navigation" or "Project navigation")
- [ ] Main content wrapper has `role="main"`
- [ ] Active global nav buttons have `aria-current="page"`, inactive have no `aria-current`
- [ ] Active project view buttons have `aria-current="page"`, inactive have no `aria-current`
- [ ] All sidebar nav buttons have `focus-visible:ring-2` in their className
- [ ] `<aside>` does NOT have `role="navigation"` (must keep implicit `complementary` role)
- [ ] All 143 existing tests still pass
- [ ] 3+ new accessibility tests pass

## Verification

- `pnpm test --run` — 146+ tests pass (143 existing + 3 new)
- `pnpm build` — exits 0
- `grep -c 'aria-current' src/components/layout/main-layout.tsx` returns ≥ 2
- `grep -c 'aria-label.*navigation' src/components/layout/main-layout.tsx` returns ≥ 1
- `grep -c 'role="main"' src/components/layout/main-layout.tsx` returns 1
- `grep -c 'focus-visible:ring-2' src/components/layout/main-layout.tsx` returns ≥ 2

## Inputs

- `src/components/layout/main-layout.tsx` — the layout component to modify (535 lines, contains sidebar nav, main content div, global nav buttons, project view buttons)
- `src/components/layout/main-layout.test.tsx` — existing 11 tests in a "Collapsible Sidebar" describe block; add a new "Accessibility" describe block
- `src/components/ui/button.tsx` — reference only: shows the focus-visible ring pattern used by shadcn Button (`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`)

## Expected Output

- `src/components/layout/main-layout.tsx` — modified with aria-label on nav, role="main" on content div, aria-current on active buttons, focus-visible ring classes on all nav buttons
- `src/components/layout/main-layout.test.tsx` — modified with 3+ new accessibility tests in a new describe("Accessibility") block
