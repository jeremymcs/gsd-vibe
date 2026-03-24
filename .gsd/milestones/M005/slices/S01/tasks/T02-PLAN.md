---
estimated_steps: 3
estimated_files: 2
skills_used:
  - react-best-practices
  - best-practices
---

# T02: Fix Theme type and provider guard conditions

**Slice:** S01 — Light Theme
**Milestone:** M005

## Description

The `Theme` type is currently `"dark" | "system"` — it excludes `"light"`. The Settings page already renders a "Light" option and calls `setTheme("light")`, but three guard conditions silently reject the value: `getInitialTheme()` discards `"light"` from localStorage, the backend settings sync ignores `"light"` from saved preferences, and TypeScript itself won't accept `"light"` as a valid `Theme`. All three must be fixed together.

## Steps

1. In `src/hooks/use-theme.ts`, change the `Theme` type on line 6 from `export type Theme = "dark" | "system"` to `export type Theme = "dark" | "system" | "light"`. This is the only change in this file.
2. In `src/components/theme/theme-provider.tsx`, fix `getInitialTheme()` (approximately line 55): change the guard `if (stored === "dark" || stored === "system")` to `if (stored === "dark" || stored === "system" || stored === "light")`. This allows `"light"` stored in localStorage to be recognized on app startup.
3. In `src/components/theme/theme-provider.tsx`, fix the backend settings sync (approximately line 194): change `if (validTheme === "dark" || validTheme === "system")` to `if (validTheme === "dark" || validTheme === "system" || validTheme === "light")`. This allows `"light"` from Rust backend settings to be applied. Do NOT touch the DOM manipulation code (`root.classList.remove("light", "dark"); root.classList.add(resolvedTheme)`) — it already handles `"light"` correctly.

## Must-Haves

- [ ] `Theme` type in `use-theme.ts` is `"dark" | "system" | "light"`
- [ ] `getInitialTheme()` accepts `"light"` from localStorage
- [ ] Backend settings sync accepts `"light"` from saved settings
- [ ] DOM manipulation code (`classList.remove/add`) is unchanged
- [ ] `pnpm build` compiles without TypeScript errors

## Verification

- `grep '"light"' src/hooks/use-theme.ts` shows `"light"` in the type union
- `grep -c '"light"' src/components/theme/theme-provider.tsx` returns at least 2 (both guard conditions fixed)
- `pnpm build` succeeds with no type errors

## Observability Impact

- Signals added/changed: The theme-provider's `resolvedTheme` state can now resolve to `"light"`, which causes `document.documentElement.classList` to include `"light"` — previously this was impossible even if the user selected it. The `localStorage` key `gsd-vibeflow-theme` can now persist `"light"` across sessions.
- How a future agent inspects this: Check `localStorage.getItem('gsd-vibeflow-theme')` returns `"light"` after selecting Light in settings. Check `document.documentElement.className` includes `"light"` (not `"dark"`) after theme switch. If it still shows `"dark"` after selecting Light, the guard conditions are still broken.
- Failure state exposed: Selecting "Light" in Settings but seeing dark mode persist indicates a guard rejection — the value was selected but silently overwritten by `getInitialTheme()` or the backend sync fallback.

## Inputs

- `src/hooks/use-theme.ts` — current `Theme` type definition (line 6: `export type Theme = "dark" | "system"`)
- `src/components/theme/theme-provider.tsx` — current `getInitialTheme()` guard at ~line 55 and backend sync guard at ~line 194

## Expected Output

- `src/hooks/use-theme.ts` — modified: `Theme` type extended to include `"light"`
- `src/components/theme/theme-provider.tsx` — modified: two guard conditions fixed to accept `"light"`
