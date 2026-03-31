<!-- GSD VibeFlow - Codebase Map: Coding Conventions -->
<!-- Generated: 2026-03-30 -->

# Coding Conventions

**Analysis Date:** 2026-03-30

## File Header Convention

Every file MUST include this two-line header:

```typescript
// GSD VibeFlow - [File Purpose]
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
```

Rust files follow the same pattern:
```rust
// GSD VibeFlow - [File Purpose]
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
```

Some files include an additional description line between the purpose and copyright. Example from `src/components/ui/button.tsx`:
```typescript
// GSD VibeFlow - Button Component
// Enhanced with brand gradients and improved states
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
```

## Naming Patterns

**Files (Frontend):**
- Use **kebab-case** for all `.ts` and `.tsx` files: `use-pty-session.ts`, `project-wizard-dialog.tsx`, `design-tokens.ts`
- Component files match the exported component name in kebab-case: `error-boundary.tsx` exports `ErrorBoundary`
- Hook files are prefixed with `use-`: `use-theme.ts`, `use-close-warning.ts`, `use-keyboard-shortcuts.ts`
- Test files use `.test.ts(x)` suffix, either co-located or in `__tests__/` directories
- E2E test files use `.spec.ts` suffix in the `e2e/` directory

**Files (Backend Rust):**
- Use **snake_case** for all `.rs` files: `projects.rs`, `filesystem.rs`, `gsd2.rs`

**React Components:**
- Use **PascalCase** for component names: `ProjectsPage`, `ErrorBoundary`, `Gsd2HealthTab`
- GSD-2 prefixed components use `Gsd2` (not `GSD2`): `Gsd2SessionsTab`, `Gsd2DashboardView`
- Tab components end with `Tab`: `Gsd2HealthTab`, `KnowledgeTab`
- Panel components end with `Panel`: `ForensicsPanel`, `KnowledgeCapturesPanel`
- Tab group components end with `Group`: `Gsd2ProgressGroup`, `Gsd2PlanningGroup`
- Page components end with `Page`: `ProjectsPage`, `SettingsPage`, `Dashboard` (exception)

**Functions/Variables:**
- Use **camelCase** for functions and variables: `formatCost`, `useProjectsWithStats`, `getErrorMessage`
- Boolean variables use `is`/`has` prefixes: `isLoading`, `hasTerminals`, `isExited`
- State setters follow React convention: `setShowWarning`, `setActiveTab`
- Unused parameters prefixed with `_`: `_component`, `_db`

**Types/Interfaces:**
- Use **PascalCase**: `Project`, `ProjectWithStats`, `Gsd2Health`, `GitInfo`
- Interface props may extend HTML attributes: `interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>`
- Prefer `interface` for object shapes, `type` for unions/aliases/filter values

**Rust Naming:**
- Use **snake_case** for function names (Tauri commands): `list_projects`, `get_settings`
- Use **PascalCase** for struct names: `Project`, `TechStack`, `Settings`
- Type alias pattern declared per-module: `type DbState = Arc<crate::db::DbPool>;`

## Code Style

**Formatting (Prettier):**
- Config: `.prettierrc`
- Semicolons: **yes** (`semi: true`)
- Quotes: **single quotes** (`singleQuote: true`)
- Tab width: **2 spaces** (`tabWidth: 2`)
- Trailing commas: **ES5** (`trailingComma: "es5"`)
- Print width: **100** (`printWidth: 100`)
- Ignore: `node_modules`, `dist`, `src-tauri/target`, `*.md`, lockfiles (see `.prettierignore`)

**Linting (ESLint):**
- Config: `eslint.config.js` (flat config format)
- Base: `@eslint/js` recommended + `typescript-eslint` recommended with type checking
- Plugins: `react-hooks`, `react-refresh`
- `eslint-config-prettier` applied last to disable formatting conflicts
- Key rules:
  - `@typescript-eslint/no-unused-vars`: **error** (prefix unused with `_`)
  - `@typescript-eslint/no-explicit-any`: **warn**
  - `@typescript-eslint/no-floating-promises`: **error**
  - `@typescript-eslint/no-misused-promises`: **error**
  - `react-refresh/only-export-components`: **warn** (allows constant exports)
- Ignored: test files (`*.test.ts`, `*.test.tsx`, `*.spec.*`), `src/test/`, config files

**TypeScript:**
- Config: `tsconfig.json`
- Target: ES2020, strict mode enabled
- `noUnusedLocals: true`, `noUnusedParameters: true`, `noFallthroughCasesInSwitch: true`
- Path alias: `@/*` maps to `./src/*` (configured in both `tsconfig.json` and `vite.config.ts`)
- Test files excluded from main compilation via `exclude` in `tsconfig.json`

## Import Organization

**Order (follow this pattern):**
1. React/framework imports: `react`, `react-dom`, `react-router-dom`
2. Third-party libraries: `@tanstack/react-query`, `sonner`, `lucide-react`, `@radix-ui/*`
3. Internal imports using `@/` path alias: `@/components/ui/button`, `@/lib/queries`
4. Relative imports for sibling/child files: `./utils`, `../error-boundary`

**Path Alias:**
- Always use `@/` for imports from `src/`: `import { Button } from "@/components/ui/button"`
- Use relative imports only for files in the same directory or `__tests__/` importing parent

**Example:**
```typescript
import { useState, useMemo } from "react";
import { Plus, FolderOpen, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProjectsWithStats, useSettings } from "@/lib/queries";
import { getProjectType, type ProjectType } from "@/lib/design-tokens";
```

**Barrel Exports:**
- Domain component directories export via `index.ts`:
  - `src/components/project/index.ts` (70+ exports)
  - `src/components/projects/index.ts`
  - `src/hooks/index.ts`
- Import from barrel: `import { ProjectWizardDialog, GuidedProjectWizard } from "@/components/projects"`
- UI primitives do NOT have barrel exports; import directly: `import { Button } from "@/components/ui/button"`

## Component Patterns

**Functional Components Only:**
- Use function declarations for page/feature components:
  ```typescript
  export function ProjectsPage() { ... }
  export function Dashboard() { ... }
  ```
- Use `React.forwardRef` for UI primitives that need ref forwarding:
  ```typescript
  const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => { ... }
  );
  Button.displayName = "Button";
  ```

**Props Pattern:**
- Extend HTML attributes for UI primitives: `interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>`
- Use `VariantProps<typeof variants>` for CVA variant props
- Destructure props in function signature
- Optional props with defaults: `asChild = false`, `loading = false`

**Component Structure (typical page):**
```typescript
// 1. State declarations
const [searchQuery, setSearchQuery] = useState("");
const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

// 2. Data hooks
const { data: projects, isLoading } = useProjectsWithStats();
const { data: settings } = useSettings();

// 3. Derived/memoized values
const filteredProjects = useMemo(() => { ... }, [projects, statusFilter, searchQuery]);

// 4. Mutation hooks
const updateProject = useUpdateProject();

// 5. JSX return
return ( ... );
```

**Hooks Usage:**
- State: `useState` for local UI state
- Data: TanStack Query hooks from `@/lib/queries` (never call `invoke` directly in components)
- Mutations: `useMutation` with `onSuccess` for toast notifications and query invalidation
- Memoization: `useMemo` for filtered/computed lists
- Side effects: `useEffect` for subscriptions, cleanup

**State Management:**
- No global state library (no Redux/Zustand)
- TanStack Query for server/backend state (cache, refetching, polling)
- React Context for cross-cutting UI state: `TerminalProvider` in `src/contexts/terminal-context.tsx`
- Local `useState` for page-level UI state (search, filters, selections)

## Styling

- **Tailwind CSS** utility classes inline on elements
- `cn()` helper from `@/lib/utils.ts` for conditional/merged classes:
  ```typescript
  import { cn } from "@/lib/utils";
  <div className={cn("flex items-center", isActive && "bg-primary")} />
  ```
- **CVA** (`class-variance-authority`) for component variant definitions (see `src/components/ui/button.tsx`)
- HSL CSS variables for theme colors: `hsl(var(--primary))`, `hsl(var(--muted))`
- Dark mode via `class` strategy on `<html>` element
- Design tokens in `src/lib/design-tokens.ts` for status colors, project types
- Custom color tokens: `status-*`, `brand-*`, `terminal-*` (defined in `tailwind.config.js`)

## Backend Patterns

**Tauri Command Structure:**
```rust
type DbState = Arc<crate::db::DbPool>;

#[tauri::command]
pub async fn command_name(
    db: tauri::State<'_, DbState>,
    // additional params from frontend
) -> Result<ReturnType, String> {
    let conn = db.read().await;  // for SELECT queries
    // or
    let db = db.write().await;   // for mutations
    let conn = db.conn();
    // ... logic
    Ok(result)
}
```

- Commands organized by domain in `src-tauri/src/commands/` (one `.rs` file per domain)
- All modules registered in `src-tauri/src/commands/mod.rs`
- Commands registered in `src-tauri/src/lib.rs` via `tauri::Builder::invoke_handler`
- Error handling: map errors to `String` with `.map_err(|e| e.to_string())?`
- Use `db.read()` for SELECT queries (returns pooled reader)
- Use `db.write()` for INSERT/UPDATE/DELETE (returns exclusive writer)

**Frontend IPC Layer (three tiers):**

1. **Typed wrappers** in `src/lib/tauri.ts`:
   ```typescript
   export async function listProjects(): Promise<Project[]> {
     return invoke<Project[]>("list_projects");
   }
   ```

2. **TanStack Query hooks** in `src/lib/queries.ts`:
   ```typescript
   export const useProjects = () =>
     useQuery({
       queryKey: queryKeys.projects(),
       queryFn: api.listProjects,
     });
   ```

3. **Query key factory** in `src/lib/query-keys.ts`:
   ```typescript
   export const queryKeys = {
     projects: () => ["projects"] as const,
     project: (id: string) => ["project", id] as const,
     gitInfo: (path: string) => ["git-info", path] as const,
   };
   ```

- Mutation hooks use `useQueryClient().invalidateQueries()` on success
- Toast notifications via `sonner` for user feedback in mutation callbacks:
  ```typescript
  onSuccess: () => { toast.success('Pushed successfully'); },
  onError: (error) => { toast.error('Failed', { description: getErrorMessage(error) }); },
  ```

## Error Handling

**Frontend:**
- `ErrorBoundary` component in `src/components/error-boundary.tsx` wraps app and pages
- Supports `inline` prop for section-level error catching, `label` prop for identification
- Logs errors to Tauri backend via `invoke("log_frontend_error", ...)`
- `getErrorMessage()` utility in `src/lib/utils.ts` normalizes unknown errors to strings
- Sentry integration for production error tracking (`src/lib/sentry.ts`)

**Backend:**
- All Tauri commands return `Result<T, String>`
- Errors converted to strings at the boundary: `.map_err(|e| e.to_string())?`

## Logging

**Frontend:** `console` methods; performance logging via `src/lib/performance.ts`
**Backend:** `tracing` crate with custom `SqliteLayer` for persistent structured logs

## Lazy Loading

Page-level components use `React.lazy()` with dynamic imports in `src/App.tsx`:
```typescript
const ProjectPage = lazy(() =>
  import("./pages/project").then(m => ({ default: m.ProjectPage }))
);
```
- Wrapped in `<Suspense fallback={<PageLoader />}>`
- Dashboard is NOT lazy-loaded (it is the default landing page)

## Git Conventions

**Commit Message Format:**
- Prefix with type: `fix:`, `feat:`, `Restore`
- Short description in imperative mood
- Examples: `fix: restore 329ea14 sidebar structure`, `feat: Feature Coverage Maximization`

---

*Convention analysis: 2026-03-30*
