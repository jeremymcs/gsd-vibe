# GSD Vibe
<!-- Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net> -->

A native desktop application for managing [Claude Code](https://claude.ai/code) projects. Built with Tauri 2 (Rust + React).

Surfaces everything you need in one place — terminal sessions, GSD workflow tracking, git status, project health, visualizer, and more — without leaving your desktop.

---

## Features

- **Project Management** — Import and manage multiple Claude Code projects with automatic tech-stack detection
- **Terminal Sessions** — Integrated PTY terminal with optional tmux support and session persistence
- **GSD Workflow** — Full GSD integration: milestones, slices, tasks, roadmap, diagnostics, and headless-mode control
- **Visualizer** — Cost, token, and timeline metrics for GSD sessions with phase and model breakdowns
- **Git Operations** — Status, diffs, branches, commit history, worktree management, and cleanup tools
- **Knowledge Base** — Browse and search project documentation with markdown rendering
- **Activity Feed** — Real-time activity tracking and decision history
- **Command Palette** — Fast keyboard-driven navigation and actions
- **Light & Dark Themes** — Full WCAG AA-calibrated light and dark modes
- **Native Performance** — Tauri keeps the binary small and memory usage low

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| UI | shadcn/ui + Tailwind CSS + Lucide |
| State | TanStack Query |
| Backend | Rust + Tauri 2.x |
| Database | SQLite (rusqlite, WAL mode) |
| Terminal | xterm.js + portable-pty |

---

## Development

### Prerequisites

- Node.js 22+
- Rust (latest stable)
- pnpm

### Setup

```bash
pnpm install
pnpm tauri dev       # full stack (frontend + Rust, hot reload)
pnpm dev             # frontend only (port 1420, no Tauri backend)
```

### Build

```bash
pnpm tauri build     # production app bundle
pnpm build           # TypeScript check + Vite build only
```

### Testing

```bash
pnpm test            # Vitest unit tests (single run)
pnpm test:watch      # watch mode
pnpm test:e2e        # Playwright E2E tests
pnpm test:e2e:ui     # Playwright with UI
```

### Lint & Format

```bash
pnpm lint
pnpm lint:fix
pnpm format
pnpm format:check
```

---

## Architecture

Two-process Tauri model:

- **Frontend** (`src/`) — React + TypeScript. Communicates with the backend via Tauri `invoke()`.
- **Backend** (`src-tauri/`) — Rust. Manages SQLite, PTY sessions, file watching, git, OS keychain, and all GSD integration.

Data fetching uses TanStack Query hooks (`src/lib/queries.ts`) wrapping typed `invoke()` calls (`src/lib/tauri.ts`). The database uses a reader/writer pool (`DbPool`) — 1 writer + 4 readers with WAL mode for concurrent access.

---

## License

MIT
