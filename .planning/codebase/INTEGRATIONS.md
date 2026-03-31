<!-- GSD VibeFlow - Codebase Map: External Integrations -->
<!-- Generated: 2026-03-30 -->

# External Integrations

**Analysis Date:** 2026-03-30

## APIs & External Services

**GitHub API:**
- Used for: Repository info, pull requests (list/create), issues (list/create), PR reviews, check runs, releases, repo notifications
- SDK/Client: `reqwest` 0.12 (Rust HTTP client with JSON support)
- Auth: GitHub personal access token stored in OS keychain under key `GITHUB_TOKEN`
- Implementation: `src-tauri/src/commands/github.rs`
- Token can be imported from `gh` CLI or manually saved via UI
- Headers: Custom `User-Agent`, Bearer token auth

**Sentry (Error Tracking):**
- Used for: Frontend error tracking and performance monitoring
- SDK/Client: `@sentry/react` ^10.38.0
- Auth: DSN via `VITE_SENTRY_DSN` environment variable
- Implementation: `src/lib/sentry.ts`
- Optional - disabled when DSN is not configured
- Traces sample rate: 100% in dev, 10% in production
- Replay on error: enabled in production only
- Strips `Authorization` headers from events before sending

**Claude Code CLI:**
- Used for: GSD-2 headless sessions, model listing, plan generation, worktree management
- Integration: Invokes `claude` CLI binary via shell commands from Rust backend
- Implementation: `src-tauri/src/commands/gsd2.rs`
- No API key needed directly (Claude CLI handles its own auth)

## Data Storage

**SQLite Database:**
- File: `gsd-vibe.db` in OS app data directory (platform-specific path via `dirs` crate)
- Engine: rusqlite 0.32 with bundled modern_sqlite
- Mode: WAL (Write-Ahead Logging) for concurrent reads
- Connection pool: `src-tauri/src/db/mod.rs` - 1 write connection + 4 read connections (round-robin)
- Migrations: Run on startup within `DbPool::new()`
- Tables include: projects, settings, terminal_sessions, knowledge entries, notifications, activity log, command history, snippets, auto commands, app logs
- Read path: `pool.read()` returns a round-robin reader connection
- Write path: `pool.write()` returns the serialized writer connection

**File System (Project Data):**
- Reads project directories for tech stack detection: `src-tauri/src/commands/filesystem.rs`
- Reads/writes files within project paths (knowledge files, GSD planning files)
- Indexes markdown files from project directories
- Builds knowledge graphs from project markdown

**OS Keychain:**
- Provider: `keyring` crate v3 (macOS Keychain, Windows Credential Manager, Linux Secret Service)
- Service identifier: `io.gsd.vibeflow`
- Implementation: `src-tauri/src/commands/secrets.rs`
- Stores: API keys, tokens, and other secrets
- Key index: Maintained as a JSON array in a special meta-key (`__track_your_shit_key_index__`) because the keyring API has no "list all" capability
- Predefined key slots: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GITHUB_TOKEN`, `OPENROUTER_API_KEY`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`

**File Storage:**
- Local filesystem only - no cloud storage
- Database file: OS app data directory
- Project files: User-specified project paths

**Caching:**
- TanStack Query (frontend) - In-memory query cache with configurable stale times
- Dependency scanner has invalidatable cache: `src-tauri/src/commands/dependencies.rs`
- No external cache service

## Authentication & Identity

**Auth Provider:**
- No user authentication - single-user desktop application
- API keys stored in OS keychain for external service access
- GitHub token for GitHub API integration

## Monitoring & Observability

**Error Tracking:**
- Sentry (frontend only, optional via DSN)
- Frontend errors logged to backend: `src-tauri/src/commands/logs.rs` (`log_frontend_error`, `log_frontend_event`)

**Logging:**
- Backend: `tracing` + `tracing-subscriber` with env-filter + fmt + custom SQLite layer
- SQLite tracing layer: `src-tauri/src/db/tracing_layer.rs` - persists log entries to database
- Log levels configurable via `RUST_LOG` env var (defaults to `info`)
- Frontend: `console.*` + Sentry capture + backend log forwarding
- App logs queryable via: `get_app_logs`, `get_app_log_stats`, `get_log_levels`, `clear_app_logs`

## CI/CD & Deployment

**Hosting:**
- Desktop application - distributed as native installers (DMG, MSI, AppImage, deb)
- No server hosting required

**CI Pipeline:**
- GitHub Actions: `.github/workflows/build.yml`
- Triggers: Git tags matching `v*` pattern, manual dispatch
- Build matrix: macOS ARM64, macOS x64, Windows x64, Linux x64
- Steps: Checkout, install Rust (stable), Rust cache, install pnpm 9, setup Node 22, install platform deps, pnpm install, Tauri build
- Output: Draft GitHub Release with platform-specific binaries
- Uses `tauri-apps/tauri-action@v0` for the build step

## OS Integration

**Pseudo-Terminal (PTY):**
- Library: `portable-pty` 0.8
- Implementation: `src-tauri/src/pty/mod.rs`
- Supports two backends: Native PTY and tmux-backed sessions
- tmux integration: Optional persistent terminal sessions that survive app restarts
- Frontend rendering: xterm.js (`@xterm/xterm` ^6.0.0) with fit, search, serialize, web-links addons
- IPC events: `pty:output`, `pty:exit`, `pty:error` emitted from Rust to frontend

**File System Watching:**
- Library: `notify` 6 + `notify-debouncer-mini` 0.4
- Implementation: `src-tauri/src/commands/watcher.rs`
- macOS uses FSEvents backend (`macos_fsevent` feature)
- Watches project directories for markdown and `.planning/` file changes
- Emits events: `knowledge:file-changed`, `gsd:file-changed`

**Native Dialogs:**
- Plugin: `tauri-plugin-dialog` 2
- Used for: Folder picker (`pick_folder` command), confirmations

**Shell Access:**
- Plugin: `tauri-plugin-shell` 2
- Used for: Opening URLs in default browser, executing shell commands

**File System Access:**
- Plugin: `tauri-plugin-fs` 2
- Used for: Reading/writing files from frontend when needed

**Single Instance:**
- Plugin: `tauri-plugin-single-instance` 2 (desktop platforms only, excluded on Android/iOS)
- Prevents multiple app windows from launching

**Trash:**
- Library: `trash` 5
- Used for: Moving deleted files to OS trash instead of permanent deletion

**Git Operations:**
- Implementation: `src-tauri/src/commands/git.rs`
- Executes git CLI commands via `tokio::process::Command`
- Operations: status, push, pull, fetch, stage, commit, stash, log, branches, tags, diff, remote URL
- No libgit2 dependency - shells out to system `git`

## Environment Configuration

**Required env vars:**
- None strictly required for basic operation (desktop app)

**Optional env vars:**
- `VITE_SENTRY_DSN` - Enables Sentry error tracking
- `VITE_APP_VERSION` - App version reported to Sentry
- `RUST_LOG` - Controls backend log verbosity (default: `info`)

**Secrets location:**
- OS keychain via `keyring` crate (service: `io.gsd.vibeflow`)
- `.env.example` exists as a template reference

## Webhooks & Callbacks

**Incoming:**
- None - desktop application, no server endpoints

**Outgoing:**
- Sentry error reports (when DSN configured)
- GitHub API calls (when token configured)

## Third-Party Libraries (Critical)

**Hard to replace (Frontend):**
- `@tauri-apps/api` - Core IPC mechanism; every backend call goes through this
- `@tanstack/react-query` - Deep integration in `src/lib/queries.ts`; all data fetching uses query hooks
- `@xterm/xterm` - Terminal rendering; significant integration in `src/hooks/use-pty-session.ts` and terminal components
- `react-router-dom` - All routing; pages lazy-loaded via React.lazy
- Radix UI primitives - Foundation of all UI components in `src/components/ui/`

**Hard to replace (Backend):**
- `rusqlite` - All data persistence; schema, migrations, and queries throughout commands
- `portable-pty` - Core terminal functionality; `src-tauri/src/pty/mod.rs`
- `keyring` - Secret storage; `src-tauri/src/commands/secrets.rs` and `src-tauri/src/commands/github.rs`
- `notify` - File watching; `src-tauri/src/commands/watcher.rs`
- `reqwest` - GitHub API client; `src-tauri/src/commands/github.rs`

**Significant API surface:**
- `@xyflow/react` - Knowledge graph visualization
- `recharts` - Dashboard charts and data visualization
- `@dnd-kit` - Drag and drop for reordering
- `react-markdown` + `remark-gfm` + `rehype-highlight` - Markdown rendering throughout knowledge and GSD views
- `cmdk` - Command palette UI
- `sonner` - Toast notification system used across all mutations

## Tauri IPC Events (Internal)

**Backend -> Frontend:**
- `app:tmux-status` - tmux availability info on startup
- `pty:output` / `pty:exit` / `pty:error` - Terminal session events
- `knowledge:file-changed` - Markdown file changes detected
- `gsd:file-changed` - GSD planning file changes detected

**Frontend -> Backend:**
- All communication via `invoke()` IPC calls to `#[tauri::command]` handlers
- Command modules: projects, filesystem, activity, settings, onboarding, data, pty, knowledge, search, logs, git, github, notifications, terminal, snippets, dependencies, watcher, gsd, gsd2, secrets, templates

---

*Integration audit: 2026-03-30*
