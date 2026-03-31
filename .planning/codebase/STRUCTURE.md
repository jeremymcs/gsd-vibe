<!-- GSD VibeFlow - Codebase Map: Structure -->
<!-- Generated: 2026-03-30 -->

# Codebase Structure

**Analysis Date:** 2026-03-30

## Directory Layout

```
gsd-vibe/
├── src/                        # Frontend (React + TypeScript)
│   ├── components/             # UI components organized by domain
│   │   ├── ui/                 # shadcn/ui primitives (18 files)
│   │   ├── layout/             # App shell: sidebar, header, breadcrumbs
│   │   ├── project/            # Project detail views (~60 files)
│   │   ├── projects/           # Projects list page components
│   │   ├── dashboard/          # Dashboard page components
│   │   ├── terminal/           # Terminal/shell components (13 files)
│   │   ├── knowledge/          # Knowledge browser, graph, search (12 files)
│   │   ├── settings/           # Settings page components
│   │   ├── notifications/      # Notification components
│   │   ├── onboarding/         # First-launch wizard
│   │   ├── command-palette/    # Command palette (Cmd+K)
│   │   ├── shared/             # Cross-domain shared components
│   │   ├── theme/              # Theme provider
│   │   └── __tests__/          # Component-level test files
│   ├── pages/                  # Route-level page components (10 files)
│   ├── lib/                    # Utilities and data layer
│   ├── hooks/                  # Custom React hooks (8 files)
│   ├── contexts/               # React contexts (terminal-context)
│   ├── styles/                 # Global CSS / Tailwind
│   └── test/                   # Test setup and utilities
├── src-tauri/                  # Backend (Rust + Tauri 2.x)
│   ├── src/
│   │   ├── commands/           # Tauri command handlers (20 modules)
│   │   ├── db/                 # Database pool, schema, migrations
│   │   ├── models/             # Serde-serializable data models
│   │   ├── pty/                # Terminal session management
│   │   ├── templates/          # Project scaffold templates (10 templates)
│   │   ├── lib.rs              # App setup, command registration
│   │   ├── main.rs             # Binary entry point
│   │   ├── headless.rs         # Headless GSD session registry
│   │   └── security.rs         # Path sanitization utilities
│   ├── capabilities/           # Tauri permission capabilities
│   ├── icons/                  # App icons (macOS, Linux, Windows, iOS, Android)
│   ├── tauri.conf.json         # Tauri configuration
│   └── Cargo.toml              # Rust dependencies
├── e2e/                        # Playwright E2E tests
├── scripts/                    # Build/dev helper scripts
├── public/                     # Static assets
├── website/                    # Marketing website
├── .gsd/                       # GSD workflow data (milestones, todos, etc.)
├── .planning/                  # Codebase analysis docs
└── .plans/                     # Project planning files
```

## Directory Purposes

**`src/components/project/` (largest component directory, ~60 files):**
- Purpose: All views rendered within the project detail page (`/projects/:id`)
- Contains: Tab/view components for overview, files, git, knowledge, dependencies, GSD v1 tabs, GSD v2 tabs, terminal, diagnostics
- Key files:
  - `index.ts` -- Barrel export of all project components
  - `project-header.tsx` -- Project title/status header
  - `project-overview-tab.tsx` -- Overview/landing view
  - `gsd2-tab-groups.tsx` -- Grouped GSD v2 views (Progress, Planning, Metrics, Commands, Diagnostics)
  - `gsd2-headless-tab.tsx` -- Headless GSD session management
  - `gsd2-dashboard-view.tsx` -- GSD v2 dashboard
  - `guided-project-view.tsx` -- Simplified view for guided user mode
  - `git-view.tsx` -- Full git operations panel
  - `gsd2-command-panels.tsx` -- History, hooks, inspect, steer, undo, export, git, recovery panels
- Test directory: `__tests__/`

**`src/components/terminal/` (13 files):**
- Purpose: Terminal rendering and management
- Key files:
  - `interactive-terminal.tsx` -- xterm.js terminal instance with PTY integration
  - `terminal-tabs.tsx` -- Tab bar for multiple terminal sessions
  - `terminal-view.tsx` -- Composite terminal view for project context
  - `shell-view.tsx` -- Standalone shell page view
  - `global-terminals.tsx` -- Cross-project terminal rendering
  - `snippets-panel.tsx` -- Command snippets sidebar
  - `auto-commands-panel.tsx` -- Auto-command configuration

**`src/components/ui/` (18 files):**
- Purpose: shadcn/ui design system primitives
- Contains: `alert-dialog`, `badge`, `button`, `card`, `checkbox`, `dialog`, `dropdown-menu`, `input`, `label`, `popover`, `progress`, `scroll-area`, `select`, `skeleton`, `switch`, `tabs`, `textarea`, `tooltip`
- Pattern: Each file is a self-contained Radix UI + Tailwind component

**`src/components/layout/` (6 files):**
- Purpose: Application shell structure
- Key files:
  - `main-layout.tsx` -- Sidebar + content area; context-aware navigation (global vs project-scoped)
  - `breadcrumbs.tsx` -- Route-aware breadcrumb navigation
  - `keyboard-shortcuts-provider.tsx` -- Global keyboard shortcut handling
  - `keyboard-shortcuts-dialog.tsx` -- Shortcut reference dialog
  - `page-header.tsx` -- Reusable page header component

**`src/components/knowledge/` (12 files):**
- Purpose: Knowledge base browsing, search, and visualization
- Key files:
  - `knowledge-viewer.tsx` -- Markdown file viewer with TOC
  - `knowledge-file-tree.tsx` -- File tree sidebar for knowledge files
  - `knowledge-search.tsx` -- Full-text search across knowledge files
  - `knowledge-graph.tsx` -- Visual knowledge graph
  - `markdown-renderer.tsx` -- Markdown rendering with syntax highlighting

**`src/lib/` (18 files):**
- Purpose: Data layer, utilities, and shared logic
- Key files:
  - `tauri.ts` (2,299 lines) -- All typed `invoke()` wrappers and TypeScript interfaces
  - `queries.ts` (1,833 lines) -- All TanStack Query hooks (useQuery/useMutation)
  - `query-keys.ts` -- Centralized query key factory
  - `navigation.ts` -- Global navigation configuration
  - `project-views.ts` -- Project detail view registry (30+ views)
  - `utils.ts` -- General utilities (`cn()`, `getErrorMessage()`, etc.)
  - `design-tokens.ts` -- CSS custom property definitions
  - `performance.ts` -- Performance monitoring utilities
  - `sentry.ts` -- Sentry error tracking setup
  - `version.ts` -- App version constant
  - `pty-chat-parser.ts` -- Parse PTY output for chat-like display
  - `codebase-parsers.ts` -- Parse tech stack detection results
  - `gsd-plan-utils.ts` -- GSD plan data transformations
  - `knowledge-graph-utils.ts` -- Knowledge graph data processing
  - `recent-searches.ts` -- Recent search term persistence

**`src/hooks/` (8 files):**
- Purpose: Reusable React hooks
- Key files:
  - `use-pty-session.ts` -- PTY lifecycle management (create, write, resize, cleanup)
  - `use-keyboard-shortcuts.ts` -- Global keyboard shortcut registration
  - `use-theme.ts` -- Theme switching (light/dark/system)
  - `use-gsd-file-watcher.ts` -- Watch GSD files for changes, trigger query invalidation
  - `use-close-warning.ts` -- Warn before closing with active terminals
  - `use-headless-session.ts` -- Headless GSD session management
  - `use-guided-execution.ts` -- Step-by-step execution guidance
  - `index.ts` -- Barrel export

**`src/contexts/` (1 file):**
- Purpose: React context providers
- Key file: `terminal-context.tsx` -- Global terminal session state (tabs, sessions, persistence, headless tracking)

**`src/pages/` (10 files):**
- Purpose: Top-level route components
- Pattern: Most are lazy-loaded via `React.lazy()` in `src/App.tsx`
- Files: `dashboard.tsx`, `projects.tsx`, `project.tsx`, `shell.tsx`, `settings.tsx`, `logs.tsx`, `notifications.tsx`, `todos.tsx`, `gsd-preferences.tsx`, `projects.test.tsx`

**`src-tauri/src/commands/` (20 modules):**
- Purpose: All Tauri command handlers, organized by domain
- Each module exports `#[tauri::command]` functions registered in `src-tauri/src/lib.rs`
- Largest: `gsd2.rs` (8,482 lines), `gsd.rs` (4,427 lines)

**`src-tauri/src/templates/` (10 template directories):**
- Purpose: Scaffold templates for new project creation
- Templates: `blank`, `express-api`, `go`, `gsd-planning`, `nextjs`, `python-cli`, `python-fastapi`, `react-vite-ts`, `rust-axum`, `rust-cli`, `svelte`, `tauri-app`

## Key File Locations

**Entry Points:**
- `src-tauri/src/main.rs`: Rust binary entry
- `src-tauri/src/lib.rs`: App setup and command registration (351 lines, 150+ commands)
- `src/App.tsx`: React app root with routing, providers, and onboarding gate
- `src/main.tsx`: React DOM render entry (if exists)

**Configuration:**
- `src-tauri/tauri.conf.json`: Tauri app config (window, CSP, bundle, plugins)
- `src-tauri/Cargo.toml`: Rust dependencies
- `package.json`: Frontend dependencies and scripts
- `vite.config.ts`: Vite + Vitest configuration
- `tsconfig.json`: TypeScript config with `@/*` path alias
- `tailwind.config.ts` or `postcss.config.js`: Tailwind CSS setup
- `playwright.config.ts`: E2E test configuration

**Core Logic:**
- `src/lib/tauri.ts`: All IPC wrapper functions and TypeScript interfaces
- `src/lib/queries.ts`: All React Query hooks
- `src/lib/query-keys.ts`: Cache key definitions
- `src-tauri/src/db/mod.rs`: Database pool, schema, migrations
- `src-tauri/src/models/mod.rs`: All Rust data models
- `src-tauri/src/pty/mod.rs`: Terminal session management
- `src-tauri/src/headless.rs`: Headless session registry

**Testing:**
- `src/test/setup.ts`: Vitest global setup
- `src/test/test-utils.tsx`: Testing utilities and custom render
- `e2e/`: Playwright E2E test files

## Naming Conventions

**Files:**
- React components: `kebab-case.tsx` (e.g., `project-overview-tab.tsx`)
- Hooks: `use-kebab-case.ts` (e.g., `use-pty-session.ts`)
- Utilities: `kebab-case.ts` (e.g., `query-keys.ts`)
- Tests: `*.test.ts(x)` co-located or in `__tests__/` directories
- Rust modules: `snake_case.rs` (e.g., `mod.rs`, `gsd2.rs`)

**Directories:**
- Frontend: `kebab-case` (e.g., `command-palette/`, `knowledge/`)
- Backend: `snake_case` (e.g., `commands/`, `models/`)

**Exports:**
- Components use barrel files (`index.ts`) in most directories
- Named exports preferred over default exports (except pages for lazy loading)

## Where to Add New Code

**New Page/Route:**
1. Create page component in `src/pages/{name}.tsx`
2. Add lazy import and `<Route>` in `src/App.tsx`
3. Add navigation entry in `src/lib/navigation.ts`

**New Project Detail View/Tab:**
1. Create component in `src/components/project/{view-name}.tsx`
2. Export from `src/components/project/index.ts`
3. Add view definition in `src/lib/project-views.ts` (with section, icon, visibility flags)
4. Add rendering case in `src/pages/project.tsx`

**New Backend Command:**
1. Add function in appropriate `src-tauri/src/commands/{domain}.rs` module
2. If new domain, create module and add `pub mod {domain};` to `src-tauri/src/commands/mod.rs`
3. Register command in `src-tauri/src/lib.rs` invoke_handler
4. Add TypeScript wrapper in `src/lib/tauri.ts`
5. Add React Query hook in `src/lib/queries.ts`
6. Add query key in `src/lib/query-keys.ts`

**New Data Model:**
1. Add Rust struct in `src-tauri/src/models/mod.rs`
2. Add corresponding TypeScript interface in `src/lib/tauri.ts`
3. If persisted, add table in `SCHEMA` constant in `src-tauri/src/db/mod.rs`
4. If migrating existing DB, add migration in `run_migrations()` method

**New UI Primitive:**
- Add to `src/components/ui/` following shadcn/ui patterns (Radix UI + Tailwind)

**New Hook:**
- Create in `src/hooks/use-{name}.ts`
- Export from `src/hooks/index.ts`

**New Utility:**
- Add to `src/lib/utils.ts` or create `src/lib/{name}.ts` for larger utilities

## Special Directories

**`.gsd/`:**
- Purpose: GSD workflow data for this project (milestones, todos, activity, reports)
- Generated: Yes (by GSD CLI tools)
- Committed: Partially (structure tracked, runtime data may be ignored)

**`.planning/`:**
- Purpose: Codebase analysis documents consumed by GSD planning commands
- Generated: Yes (by codebase mapping agents)
- Committed: Yes

**`.plans/`:**
- Purpose: Human-written project planning documents
- Generated: No
- Committed: Yes

**`src-tauri/target/`:**
- Purpose: Rust build output
- Generated: Yes
- Committed: No (gitignored)

**`dist/`:**
- Purpose: Vite frontend build output
- Generated: Yes
- Committed: No (gitignored)

**`website/`:**
- Purpose: Marketing/landing page (separate from the app)
- Contains: `.vercel/` config, `screenshots/`
- Committed: Yes

## File Counts and Size

**Frontend (src/):**
- ~170 TypeScript/TSX source files (excluding tests)
- ~22 test files
- Largest: `src/lib/tauri.ts` (2,299 lines), `src/lib/queries.ts` (1,833 lines)

**Backend (src-tauri/src/):**
- ~34 Rust source files
- Largest: `src-tauri/src/commands/gsd2.rs` (8,482 lines), `src-tauri/src/commands/gsd.rs` (4,427 lines), `src-tauri/src/models/mod.rs` (1,016 lines)

**Total IPC surface:** 150+ registered Tauri commands across 20 command modules

---

*Structure analysis: 2026-03-30*
