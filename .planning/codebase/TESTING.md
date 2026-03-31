<!-- GSD VibeFlow - Codebase Map: Testing Patterns -->
<!-- Generated: 2026-03-30 -->

# Testing Patterns

**Analysis Date:** 2026-03-30

## Test Framework

**Runner:**
- Vitest 4.0.18
- Config: `vite.config.ts` (under `test` key)
- Environment: jsdom
- Globals enabled (`describe`, `it`, `expect`, `vi` available without import)

**Assertion Library:**
- Vitest built-in `expect()` with `@testing-library/jest-dom` matchers (extended in setup)
- React Testing Library for component testing
- Testing Library User Event for realistic user interactions

**Run Commands:**
```bash
pnpm test              # Run all unit tests once
pnpm test:watch        # Watch mode for development
pnpm test:e2e          # Run Playwright E2E tests
pnpm test:e2e:ui       # Interactive Playwright UI
pnpm test:e2e:debug    # Debug E2E with inspector
pnpm lint              # ESLint check
pnpm build             # TypeScript check + Vite build (catches type errors)
```

## Test File Organization

**Location:**
- Co-located with source files as `.test.ts(x)` OR in `__tests__/` subdirectories
- Both patterns coexist; no strict rule

**Naming:**
- Unit/component tests: `*.test.ts` or `*.test.tsx`
- E2E tests: `*.spec.ts` in `e2e/` directory

**Current Test Files (22 total):**
```
src/
├── components/
│   ├── __tests__/
│   │   └── error-boundary.test.tsx
│   ├── knowledge/__tests__/
│   │   └── knowledge-graph-table.test.tsx
│   ├── layout/
│   │   └── main-layout.test.tsx
│   ├── onboarding/__tests__/
│   │   └── first-launch-wizard.test.tsx
│   ├── project/__tests__/
│   │   ├── gsd2-preferences-tab.test.tsx
│   │   ├── gsd2-sessions-tab.test.tsx
│   │   ├── guided-project-view.test.tsx
│   │   └── knowledge-captures-panel.test.tsx
│   ├── projects/__tests__/
│   │   ├── guided-project-wizard.test.tsx
│   │   └── project-wizard-dialog.test.tsx
│   └── settings/__tests__/
│       └── settings-mode-toggle.test.tsx
├── contexts/
│   └── terminal-context.test.tsx
├── hooks/
│   └── use-guided-execution.test.ts
├── lib/
│   ├── __tests__/
│   │   ├── performance.test.ts
│   │   ├── queries-gsd2.test.ts
│   │   ├── query-keys.test.ts
│   │   ├── tauri-gsd2.test.ts
│   │   ├── tauri-onboarding.test.ts
│   │   └── utils.test.ts
│   ├── navigation.test.ts
│   └── project-views.test.ts
├── pages/
│   └── projects.test.tsx
e2e/
├── dashboard.spec.ts
├── guided-flow.spec.ts
├── navigation.spec.ts
├── projects.spec.ts
└── screenshots.spec.ts
```

## Test Setup

**Global Setup File:** `src/test/setup.ts`

Provides these global mocks (applied to ALL unit tests):

1. **Browser API mocks:**
   - `localStorage` (full implementation with get/set/remove/clear)
   - `sessionStorage` (full implementation)
   - `ResizeObserver` (no-op)
   - `IntersectionObserver` (no-op)
   - `Element.prototype.scrollIntoView` (no-op, needed for cmdk)
   - `HTMLCanvasElement.getContext` (stub for xterm/recharts)

2. **Tauri API mocks:**
   - `@tauri-apps/api/core` - `invoke` returns `Promise.resolve(null)`
   - `@tauri-apps/api/event` - `listen` returns unsubscribe fn, `emit` is no-op
   - `@tauri-apps/plugin-shell` - `Command.create` stub
   - `@tauri-apps/plugin-dialog` - `open`, `save`, `message`, `ask`, `confirm` stubs
   - `@tauri-apps/plugin-fs` - `readTextFile`, `writeTextFile`, `exists` stubs
   - `@tauri-apps/api/window` - `getCurrentWindow` with `onCloseRequested` and `close` stubs

3. **Cleanup:** `beforeEach` clears localStorage, sessionStorage, and all mocks via `vi.clearAllMocks()`

**Custom Render Utility:** `src/test/test-utils.tsx`

Wraps components with all required providers:
```typescript
import { render } from "@/test/test-utils";

// Provides: QueryClientProvider + TerminalProvider + MemoryRouter
render(<MyComponent />);

// With options:
render(<MyComponent />, {
  routerProps: { initialEntries: ["/projects/123"] },
  queryClient: createTestQueryClient(),
});
```

- Re-exports all `@testing-library/react` utilities
- Creates a test QueryClient with `retry: false` and `gcTime: 0`

## Test Patterns

**Suite Organization:**
```typescript
describe("ComponentName", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("feature group", () => {
    it("specific behavior description", () => {
      // Arrange, Act, Assert
    });
  });
});
```

**Component Testing:**
```typescript
// Use custom render for component tests (includes providers)
import { render, screen } from "@/test/test-utils";
import userEvent from "@testing-library/user-event";

it("handles user interaction", async () => {
  const user = userEvent.setup();
  render(<MyComponent />);

  await user.click(screen.getByText("Submit"));
  expect(screen.getByText("Success")).toBeInTheDocument();
});
```

**Hook Testing:**
```typescript
import { renderHook, act } from "@testing-library/react";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TerminalProvider>{children}</TerminalProvider>
);

const { result } = renderHook(() => useTerminalContext(), { wrapper });

act(() => {
  result.current.addTab("project-1", "shell");
});

expect(result.current.getProjectTerminals("project-1").tabs).toHaveLength(1);
```

**Pure Function Testing:**
```typescript
import { describe, it, expect } from "vitest";
import { formatCost, cn, getErrorMessage } from "../utils";

describe("formatCost", () => {
  it("formats positive amounts correctly", () => {
    expect(formatCost(1.2345)).toBe("$1.2345");
  });
});
```

## Mocking

**Module Mocking (most common pattern):**
```typescript
// Mock entire module before imports
vi.mock("@/lib/queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/queries")>();
  return {
    ...actual,
    useGsd2Sessions: vi.fn(),
  };
});

import { useGsd2Sessions } from "@/lib/queries";

// In test:
(useGsd2Sessions as Mock).mockReturnValue({
  data: MOCK_SESSIONS,
  isLoading: false,
  isError: false,
});
```

**Component Mocking:**
```typescript
// Mock complex child components to simplify tests
vi.mock("@/components/projects", () => ({
  ProjectWizardDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="import-dialog">Add Project Dialog</div> : null,
  ProjectCard: ({ project }: { project: { name: string } }) => (
    <span>{project.name}</span>
  ),
}));
```

**Tauri Invoke Mocking:**
```typescript
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";

// In test:
vi.mocked(invoke).mockResolvedValue(undefined);

// Verify:
expect(invoke).toHaveBeenCalledWith("gsd2_list_milestones", { projectId: "proj-1" });
```

**Console Suppression (for error boundary tests):**
```typescript
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});
```

**What to Mock:**
- Tauri IPC calls (`invoke`, `listen`, `emit`)
- Browser APIs unavailable in jsdom (ResizeObserver, Canvas, etc.)
- Complex child components that have their own test suites
- Query hooks when testing presentation logic

**What NOT to Mock:**
- Component internal state and behavior
- React Router (use MemoryRouter from test-utils)
- React Query client (use test QueryClient with retry:false)
- Utility functions being tested

## Test Data / Fixtures

Test data is defined inline at the top of test files as constants:

```typescript
const MOCK_SESSIONS = [
  {
    filename: "2026-01-15T12:00:00Z-abc.jsonl",
    timestamp: "2026-01-15T12:00:00Z",
    name: "Fix login bug",
    message_count: 24,
    // ...
  },
];

const mockProjects: ProjectWithStats[] = [
  {
    id: "1",
    name: "GSD VibeFlow",
    path: "/users/test/track-your-shit",
    // ... full object shape matching the type
  },
];
```

No shared fixture files or factory functions exist beyond `createTestQueryClient()`.

## E2E Tests (Playwright)

**Config:** `playwright.config.ts`
- Single browser: Chromium (Desktop Chrome)
- Base URL: `http://localhost:1420`
- Web server: auto-starts `pnpm exec vite --port 1420`
- Screenshots: only on failure
- Traces: on first retry
- Reporter: HTML
- CI: `forbidOnly`, 2 retries, 1 worker
- Local: parallel workers, reuses existing server

**E2E Test Files (5):**
- `e2e/navigation.spec.ts` - Route navigation, sidebar collapse/expand
- `e2e/dashboard.spec.ts` - Dashboard rendering, search, view toggles, dialogs
- `e2e/projects.spec.ts` - Project page functionality
- `e2e/guided-flow.spec.ts` - Guided mode with Tauri IPC mocking
- `e2e/screenshots.spec.ts` - Visual screenshots

**E2E Tauri Mocking Pattern:**
```typescript
async function installTauriMock(page: Page, initialMode: UserMode) {
  await page.addInitScript((mode: UserMode) => {
    const g = window as typeof window & {
      __TAURI_INTERNALS__?: Record<string, unknown>;
    };
    g.__TAURI_INTERNALS__ = g.__TAURI_INTERNALS__ || {};
    // ... mock invoke responses based on command name
  }, mode);
}
```

**Limitations:**
- E2E tests run against Vite dev server (web layer only)
- No native Tauri API testing (PTY, filesystem, keychain)
- Full Tauri E2E with `tauri-driver` noted as future work

## Coverage

**Tool:** `@vitest/coverage-v8` (installed as devDependency)
**Thresholds:** None enforced
**Command:**
```bash
pnpm test -- --coverage
```

## Coverage Gaps

**Areas with NO test coverage (high impact):**
- `src/pages/project.tsx` - Main project detail page (the primary view)
- `src/pages/dashboard.tsx` - Dashboard page (only E2E coverage)
- `src/pages/settings.tsx` - Settings page
- `src/pages/shell.tsx` - Terminal/shell page
- `src/pages/todos.tsx` - Todos page
- `src/pages/notifications.tsx` - Notifications page
- `src/pages/logs.tsx` - Logs page
- `src/App.tsx` - Root app component, routing setup

**Areas with NO test coverage (components):**
- `src/components/project/gsd2-*.tsx` - Most GSD-2 tab components (only `gsd2-sessions-tab` and `gsd2-preferences-tab` tested)
- `src/components/terminal/` - Terminal components (xterm integration)
- `src/components/command-palette/` - Command palette
- `src/components/dashboard/` - Dashboard sub-components
- `src/components/notifications/` - Notification components
- `src/components/shared/` - Shared components

**Areas with NO test coverage (lib):**
- `src/lib/tauri.ts` - Only GSD-2 and onboarding wrappers tested (vast majority untested)
- `src/lib/queries.ts` - Query hooks not directly tested
- `src/lib/codebase-parsers.ts`, `src/lib/gsd-plan-utils.ts`, `src/lib/knowledge-graph-utils.ts`
- `src/lib/pty-chat-parser.ts`, `src/lib/recent-searches.ts`, `src/lib/sentry.ts`

**Areas with NO test coverage (hooks):**
- `src/hooks/use-pty-session.ts` - PTY session management
- `src/hooks/use-keyboard-shortcuts.ts` - Keyboard shortcut handler
- `src/hooks/use-gsd-file-watcher.ts` - File watcher hook
- `src/hooks/use-close-warning.ts` - Close warning hook
- `src/hooks/use-theme.ts` - Theme hook
- `src/hooks/use-headless-session.ts` - Headless session hook

**Backend (Rust):**
- No Rust unit tests detected in `src-tauri/src/`

**Coverage Summary:**
- ~170 source files, ~22 test files
- Estimated coverage: ~13% of source files have dedicated tests
- Well-tested: utility functions, error boundary, terminal context, navigation, query keys
- Untested: most pages, most GSD-2 tabs, terminal integration, all Rust commands

---

*Testing analysis: 2026-03-30*
