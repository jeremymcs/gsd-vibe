<!-- GSD VibeFlow - Codebase Map: Architecture -->
<!-- Generated: 2026-03-30 -->

# Architecture

**Analysis Date:** 2026-03-30

## Pattern Overview

**Overall:** Two-process Tauri desktop application (Rust backend + React frontend) with IPC-based communication

**Key Characteristics:**
- Tauri 2.x native desktop app with a single window
- Frontend renders in a webview; backend runs as a native Rust process
- All data operations go through Tauri `invoke()` IPC -- there is no REST API
- SQLite database with WAL mode and read/write connection pool separation
- React Query (TanStack Query) manages all frontend data fetching, caching, and polling
- Domain-organized command modules on the backend, domain-organized components on the frontend

## Layers

**Frontend UI Layer:**
- Purpose: Render the application UI and handle user interaction
- Location: `src/`
- Contains: React components, pages, hooks, contexts, lib utilities
- Depends on: Tauri IPC bridge (`@tauri-apps/api/core`), TanStack Query, React Router
- Used by: End users via the native desktop window

**IPC Bridge Layer:**
- Purpose: Type-safe communication between frontend and backend
- Location: `src/lib/tauri.ts` (2,299 lines -- typed invoke wrappers), `src/lib/queries.ts` (1,833 lines -- React Query hooks)
- Contains: TypeScript type definitions mirroring Rust models, `invoke()` wrapper functions, TanStack Query hooks with caching/polling config
- Depends on: `@tauri-apps/api/core` for `invoke()`, `@tauri-apps/api/event` for `listen()`
- Used by: All frontend components that need data

**Backend Command Layer:**
- Purpose: Handle IPC requests from the frontend and execute business logic
- Location: `src-tauri/src/commands/` (20 modules)
- Contains: `#[tauri::command]` async functions organized by domain
- Depends on: `DbPool` (database), `TerminalManager` (PTY), `HeadlessSessionRegistry`, `WatcherManager`
- Used by: Tauri IPC dispatcher (registered in `src-tauri/src/lib.rs`)

**Database Layer:**
- Purpose: Persistent data storage with concurrent access
- Location: `src-tauri/src/db/mod.rs`, `src-tauri/src/db/tracing_layer.rs`
- Contains: `DbPool` (1 writer + 4 reader connections), schema definitions, migrations, PRAGMAs
- Depends on: `rusqlite` crate
- Used by: All command modules via `State<Arc<DbPool>>`

**Models Layer:**
- Purpose: Shared data structures serializable between Rust and TypeScript
- Location: `src-tauri/src/models/mod.rs` (1,016 lines)
- Contains: Serde-serializable structs for all domain entities
- Depends on: `serde`, `serde_json`
- Used by: Command modules (return types), frontend (via TypeScript mirror types in `src/lib/tauri.ts`)

**PTY/Terminal Layer:**
- Purpose: Manage pseudo-terminal sessions with optional tmux persistence
- Location: `src-tauri/src/pty/mod.rs`
- Contains: `TerminalManager`, `TerminalSession`, session backend (Native or Tmux)
- Depends on: `portable-pty` crate, system tmux binary
- Used by: PTY commands, headless session commands

## Data Flow

**Standard Read Query (e.g., list projects):**

1. React component calls `useProjects()` hook from `src/lib/queries.ts`
2. TanStack Query checks cache; if stale, calls `api.listProjects()` from `src/lib/tauri.ts`
3. `listProjects()` calls `invoke<Project[]>("list_projects")` via Tauri IPC
4. Rust command handler `commands::projects::list_projects` acquires a read connection from `DbPool`
5. SQLite query executes against one of 4 read-only connections (round-robin)
6. Result serialized to JSON, sent back through IPC to frontend
7. TanStack Query caches result and triggers component re-render

**Standard Write Mutation (e.g., update project):**

1. React component calls `useUpdateProject()` mutation hook
2. Mutation calls `api.updateProject()` which invokes `invoke("update_project", { ... })`
3. Rust handler acquires the single write connection via `pool.write().await`
4. Write executes against the writer connection (serialized -- one write at a time)
5. On success, the mutation's `onSuccess` callback invalidates related query keys
6. TanStack Query automatically refetches stale queries

**Terminal Session Flow:**

1. Frontend creates a PTY session via `pty_create` command
2. Backend spawns a `portable-pty` process (or attaches to tmux session)
3. Output streamed via Tauri events (`pty:output:{session_id}`) to the frontend
4. Frontend writes input via `pty_write` command
5. xterm.js renders terminal output in `src/components/terminal/interactive-terminal.tsx`

**State Management:**
- **Server state:** TanStack Query manages all backend data with caching, polling intervals, and invalidation via `src/lib/query-keys.ts`
- **Terminal state:** React Context (`src/contexts/terminal-context.tsx`) manages terminal tabs, sessions, and persistence across navigation
- **Local UI state:** React `useState` within individual components
- **Theme state:** `use-theme` hook with CSS class strategy (dark mode)

## Key Abstractions

**DbPool:**
- Purpose: Concurrent database access without write contention
- Implementation: `src-tauri/src/db/mod.rs`
- Pattern: 1 write `Mutex<Database>` + 4 read-only `Mutex<Connection>` with round-robin via `AtomicUsize`
- Rule: Use `pool.read()` for SELECT, `pool.write()` for mutations

**Query Key Factory:**
- Purpose: Centralized, type-safe cache key management for TanStack Query
- Implementation: `src/lib/query-keys.ts`
- Pattern: Object with factory functions returning `as const` tuples
- Rule: Always use `queryKeys.xxx()` -- never inline cache key arrays

**Tauri Command Pattern:**
- Purpose: Each backend operation is a typed async function
- Implementation: `src-tauri/src/commands/*.rs`
- Pattern: `#[tauri::command] async fn name(pool: State<'_, Arc<DbPool>>, ...) -> Result<T, String>`
- Rule: Commands receive `State<Arc<...>>` for managed dependencies; return `Result<T, String>`

**Project Views:**
- Purpose: Define all possible views within a project detail page
- Implementation: `src/lib/project-views.ts`
- Pattern: Declarative view definitions with section grouping, conditional visibility (GSD version, user mode)
- Rule: Sidebar renders views from this registry; views are resolved via `?tab=` search param

## Entry Points

**Application Entry (Rust):**
- Location: `src-tauri/src/main.rs`
- Triggers: OS launches the binary
- Responsibilities: Calls `gsd_vibeflow_lib::run()`

**Application Setup (Rust):**
- Location: `src-tauri/src/lib.rs`
- Triggers: Called by `main.rs`
- Responsibilities: Initializes tracing, database pool, terminal manager, headless registry, file watcher; registers all 150+ Tauri commands; starts the Tauri event loop

**Frontend Entry:**
- Location: `src/App.tsx`
- Triggers: Webview loads
- Responsibilities: Sets up React Router, ErrorBoundary, TerminalProvider, onboarding gate, lazy-loaded routes

**Routes:**
- `/` -- Dashboard (`src/pages/dashboard.tsx`)
- `/projects` -- Projects list (`src/pages/projects.tsx`)
- `/projects/:id` -- Project detail (`src/pages/project.tsx`) with `?tab=` view switching
- `/todos` -- Cross-project todos (`src/pages/todos.tsx`)
- `/settings` -- App settings (`src/pages/settings.tsx`)
- `/gsd-preferences` -- GSD workflow preferences (`src/pages/gsd-preferences.tsx`)
- `/terminal` -- Standalone terminal (`src/pages/shell.tsx`)
- `/terminal/:projectId` -- Project terminal (`src/pages/shell.tsx`)
- `/logs` -- Application logs (`src/pages/logs.tsx`)
- `/notifications` -- Notifications center (`src/pages/notifications.tsx`)

## Data Architecture

**Database:** SQLite stored at OS app data directory as `gsd-vibe.db`

**Key Tables:**
- `projects` -- Core entity. All other tables reference via `project_id` FK with CASCADE delete
- `roadmaps` -- Project roadmaps (formerly flight_plans). One project can have multiple roadmaps
- `phases` -- Phases within a roadmap, with status tracking and ordering
- `tasks` -- Tasks within a phase, with file tracking and status
- `activity_log` -- Per-project event log
- `knowledge` -- Persistent knowledge base entries per project
- `decisions` -- Architectural decisions per project
- `costs` -- Token/cost tracking per execution
- `settings` -- Key-value store for app settings
- `app_logs` -- Unified application logging (backend tracing + frontend events)
- `command_history` -- Terminal command history per project
- `snippets` -- Reusable command snippets (global or per-project)
- `auto_commands` -- Auto-run commands on terminal hooks
- `gsd_todos` -- GSD workflow todo items
- `gsd_requirements` -- GSD requirements tracking
- `gsd_debug_sessions` -- Debug session tracking
- `notifications` -- In-app notification queue
- `terminal_sessions` -- Persistent terminal session metadata
- `knowledge_bookmarks` -- Bookmarked knowledge sections
- `cost_thresholds` -- Per-project cost threshold overrides
- `schema_migrations` -- Migration tracking

**FTS5 Full-Text Search:** Optional (graceful fallback to LIKE if unavailable). Indexes projects, knowledge, decisions, and activity.

**Connection Pool:**
- 1 writer connection (WAL mode, busy_timeout 5s, synchronous NORMAL)
- 4 read-only connections (round-robin distribution)
- PRAGMAs: cache_size 8MB (writer) / 4MB (readers), mmap_size 128MB, temp_store MEMORY

## Error Handling

**Strategy:** Result-based error handling throughout

**Frontend Patterns:**
- `ErrorBoundary` component wraps the entire app and individual pages (`src/components/error-boundary.tsx`)
- TanStack Query `onError` callbacks show toast notifications via `sonner`
- `getErrorMessage()` utility in `src/lib/utils.ts` normalizes error objects to strings

**Backend Patterns:**
- All Tauri commands return `Result<T, String>` -- errors are stringified for IPC transport
- Database errors mapped to descriptive strings
- Tracing (`tracing::info/warn/error`) for structured backend logging
- `SqliteLayer` custom tracing layer writes logs to the `app_logs` table

## Cross-Cutting Concerns

**Logging:**
- Backend: `tracing` crate with env-filter + fmt + custom SQLite layer
- Frontend: `log_frontend_error` and `log_frontend_event` commands send to backend `app_logs` table
- Viewable: Logs page at `/logs` with filtering by level, source, and project

**Security:**
- OS keychain integration via `keyring` crate for secret storage (`src-tauri/src/commands/secrets.rs`)
- CSP policy configured in `src-tauri/tauri.conf.json`
- Path traversal protection in `src-tauri/src/security.rs` (`safe_join`, `shell_escape_path`)
- Single-instance enforcement on desktop via `tauri-plugin-single-instance`

**Monitoring:**
- Sentry integration for production error tracking (`src/lib/sentry.ts`)
- In-app notification system with unread count badge

## Module Boundaries

**Backend Command Modules (20 total in `src-tauri/src/commands/`):**

| Module | Lines | Purpose |
|--------|-------|---------|
| `gsd2.rs` | 8,482 | GSD v2 workflow: milestones, slices, tasks, headless sessions, worktrees, diagnostics |
| `gsd.rs` | 4,427 | GSD v1 workflow: plans, todos, verification, research, milestones |
| `filesystem.rs` | 1,592 | File operations, tech stack detection, knowledge file scanning |
| `github.rs` | 967 | GitHub API integration: PRs, issues, releases, check runs |
| `projects.rs` | 945 | Project CRUD, import, enhanced import, stats |
| `templates.rs` | 648 | Project templates and scaffolding |
| `knowledge.rs` | 550 | Knowledge base CRUD, search, bookmarks |
| `git.rs` | 469 | Git operations: status, push, pull, stage, commit, stash |
| `onboarding.rs` | 429 | First-launch wizard: dependency detection, API key validation |
| `data.rs` | 412 | Export/clear data operations |
| `snippets.rs` | 401 | Command snippets and auto-commands |
| `logs.rs` | 325 | Application log queries and frontend log capture |
| `terminal.rs` | 315 | Command history, script favorites, session persistence |
| `secrets.rs` | 251 | OS keychain operations |
| `dependencies.rs` | 251 | Dependency outdated/vulnerable scanning |
| `settings.rs` | 247 | App settings CRUD |
| `watcher.rs` | 228 | File system watcher for project changes |
| `notifications.rs` | 199 | Notification CRUD and unread counts |
| `search.rs` | 165 | Global cross-entity search |
| `pty.rs` | 152 | PTY session lifecycle (create, write, resize, close, attach) |

**Frontend has no circular dependencies between domains.** Components import from `@/lib/queries` and `@/lib/tauri` for data; from `@/components/ui/` for primitives.

## Deployment Architecture

**Build:**
- Frontend: Vite builds to `dist/` (TypeScript check + bundle)
- Backend: Cargo builds the Rust binary
- Combined: `pnpm tauri build` produces native installers

**Platform Targets:**
- macOS (minimum 10.15) -- `.dmg` / `.app`
- Linux -- AppImage
- Windows -- MSI with embedded WebView2 bootstrapper

**Bundle ID:** `io.gsd.vibeflow`
**App Version:** 0.1.1

---

*Architecture analysis: 2026-03-30*
