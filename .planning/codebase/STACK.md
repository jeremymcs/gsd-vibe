<!-- GSD VibeFlow - Codebase Map: Technology Stack -->
<!-- Generated: 2026-03-30 -->

# Technology Stack

**Analysis Date:** 2026-03-30

## Languages

**Primary:**
- TypeScript 5.7 - Frontend (React UI, IPC wrappers, query hooks)
- Rust (2021 edition) - Backend (Tauri commands, database, PTY, file system)

**Secondary:**
- CSS/Tailwind - Styling (utility-first with design tokens)
- SQL - Database schema and queries (SQLite via rusqlite)

## Runtime

**Environment:**
- Node.js 22+ (enforced via `engines` in `package.json` and `.nvmrc`)
- Tauri 2.x runtime (WebKit on macOS/Linux, Chromium on Windows)
- Tokio async runtime (multi-threaded, Rust backend)

**Package Manager:**
- pnpm 9 (frontend) - Lockfile: `pnpm-lock.yaml` present
- Cargo (Rust) - Lockfile: `src-tauri/Cargo.lock` present

## Frameworks

**Core:**
- Tauri 2.x - Desktop app framework (Rust backend + WebView frontend)
- React 18.3 - Frontend UI framework
- Vite 6.0 - Frontend build tool and dev server (port 1420)

**Testing:**
- Vitest 4.0 - Unit tests (jsdom environment)
- React Testing Library 16.3 - Component testing
- Playwright 1.58 - E2E testing (Chromium only, web layer)

**Build/Dev:**
- Vite 6.0 - Bundler with HMR, manual chunk splitting
- TypeScript 5.7 - Type checking (`tsc` runs before `vite build`)
- tauri-build 2 - Rust build dependency
- PostCSS + Autoprefixer - CSS processing

## Key Dependencies

**Critical (Frontend):**
- `@tauri-apps/api` ^2.2.0 - IPC bridge between frontend and Rust backend
- `@tanstack/react-query` ^5.62.0 - Server state management, caching, polling
- `react-router-dom` ^7.1.1 - Client-side routing
- `@xterm/xterm` ^6.0.0 - Terminal emulator in browser (with fit, search, serialize, web-links addons)
- `@sentry/react` ^10.38.0 - Error tracking (optional, DSN-gated)

**Critical (Backend / Rust):**
- `tauri` 2 - Core framework, IPC, window management
- `rusqlite` 0.32 (bundled, modern_sqlite) - SQLite database access
- `portable-pty` 0.8 - Pseudo-terminal creation and management
- `keyring` 3 (apple-native, windows-native, sync-secret-service) - OS keychain access
- `tokio` 1 (rt-multi-thread, sync, time, macros, process) - Async runtime
- `reqwest` 0.12 (json) - HTTP client for GitHub API
- `notify` 6 (macos_fsevent on macOS) - File system watching
- `notify-debouncer-mini` 0.4 - Debounced file change events

**UI / Component Libraries:**
- Radix UI primitives - Dialog, dropdown-menu, select, tabs, tooltip, checkbox, switch, popover, alert-dialog, progress, scroll-area, label, slot
- `lucide-react` ^0.468.0 - Icon set
- `class-variance-authority` ^0.7.1 + `clsx` + `tailwind-merge` - shadcn/ui styling utilities
- `cmdk` ^1.1.1 - Command palette
- `sonner` ^2.0.7 - Toast notifications
- `recharts` ^2.15.0 - Charts and data visualization
- `@xyflow/react` ^12.10.0 - Node-based flow diagrams (knowledge graph)
- `@dnd-kit/core` ^6.3.1 + `@dnd-kit/sortable` ^10.0.0 - Drag and drop
- `react-resizable-panels` ^4.6.2 - Resizable split panes
- `react-markdown` ^10.1.0 + `remark-gfm` + `rehype-highlight` - Markdown rendering
- `highlight.js` ^11.11.1 - Syntax highlighting
- `diff` ^8.0.3 - Text diffing
- `date-fns` ^4.1.0 - Date utilities

**Infrastructure (Rust):**
- `serde` 1 + `serde_json` 1 - Serialization/deserialization
- `chrono` 0.4 - Date/time handling
- `uuid` 1 (v4) - ID generation
- `tracing` 0.1 + `tracing-subscriber` 0.3 - Structured logging
- `regex` 1 - Pattern matching
- `dirs` 5 - OS directory paths
- `trash` 5 - Move files to OS trash
- `libc` 0.2 (unix only) - Low-level OS interaction

**Tauri Plugins:**
- `tauri-plugin-dialog` 2 - Native file/folder dialogs
- `tauri-plugin-fs` 2 - File system access
- `tauri-plugin-shell` 2 - Shell command execution, URL opening
- `tauri-plugin-single-instance` 2 (desktop only) - Prevent multiple instances

## Configuration

**Environment:**
- `.env.example` present - template for env vars
- `VITE_SENTRY_DSN` - Optional Sentry DSN (frontend, via `import.meta.env`)
- `VITE_APP_VERSION` - App version for Sentry releases
- `TAURI_ENV_PLATFORM` and `TAURI_ENV_DEBUG` - Build-time Tauri env vars
- Env prefix filter: `VITE_` and `TAURI_` prefixes exposed to frontend

**Build:**
- `vite.config.ts` - Frontend bundler config with path aliases, manual chunks, test config
- `tsconfig.json` - TypeScript strict mode, ES2020 target, path alias `@/*` -> `./src/*`
- `tsconfig.node.json` - Node-side TypeScript config
- `tailwind.config.js` - Tailwind with shadcn/ui theme (HSL CSS variables, dark mode via class)
- `postcss.config.js` - PostCSS with Tailwind and Autoprefixer
- `eslint.config.js` - Flat config ESLint with typescript-eslint, react-hooks, react-refresh, prettier
- `src-tauri/tauri.conf.json` - Tauri app config (window size, CSP, bundle targets, plugins)
- `src-tauri/Cargo.toml` - Rust dependencies and release profile (LTO, strip, panic=abort)

**Vite Manual Chunks (code splitting):**
- `vendor-charts` - recharts
- `vendor-flow` - @xyflow/react
- `vendor-terminal` - xterm and addons
- `vendor-markdown` - react-markdown, remark-gfm, rehype-highlight
- `vendor-dnd` - @dnd-kit packages

## Platform Requirements

**Development:**
- Node.js 22+
- pnpm 9
- Rust stable toolchain
- macOS: Xcode CLT (for WebKit)
- Linux: libwebkit2gtk-4.1-dev, libappindicator3-dev, librsvg2-dev, patchelf, libdbus-1-dev, libgtk-3-dev, libsoup-3.0-dev, javascriptcoregtk-4.1-dev
- Windows: WebView2 (embedded bootstrapper in bundle)

**Production:**
- macOS 10.15+ (minimum system version)
- Windows with WebView2
- Linux with WebKit2GTK 4.1
- SQLite database at OS app data directory (`gsd-vibe.db`)

**CI/CD:**
- GitHub Actions (`.github/workflows/build.yml`)
- Build matrix: macOS ARM64, macOS x64, Windows x64, Linux x64
- Uses `tauri-apps/tauri-action@v0` for building and GitHub release drafts
- Triggered on version tags (`v*`) or manual dispatch

**Release Profile (Rust):**
- `panic = "abort"`, `codegen-units = 1`, `lto = true`, `opt-level = "s"`, `strip = true`

---

*Stack analysis: 2026-03-30*
