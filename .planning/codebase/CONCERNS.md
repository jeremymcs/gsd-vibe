<!-- GSD VibeFlow - Codebase Map: Concerns -->
<!-- Generated: 2026-03-30 -->

# Codebase Concerns

**Analysis Date:** 2026-03-30

## Critical Issues

### Unwrap Calls in Non-Test Production Code
- Issue: Multiple `.unwrap()` calls in Rust command handlers can panic and crash the app
- Files:
  - `src-tauri/src/commands/github.rs:178,186` — `strip_prefix().unwrap()` on URL parsing (panics if URL format check is bypassed)
  - `src-tauri/src/commands/gsd2.rs:6770-6771` — `points.last().unwrap()` and `points.first().unwrap()` (panics on empty vec)
  - `src-tauri/src/commands/gsd.rs:134` — `SystemTime::now().duration_since(UNIX_EPOCH).unwrap()` in `gen_id()`
  - `src-tauri/src/commands/gsd.rs:743` — `section_start.unwrap()` without guard
  - `src-tauri/src/commands/gsd.rs:465-475` — Regex capture `.unwrap()` calls
  - `src-tauri/src/commands/filesystem.rs:680-748` — Multiple regex capture `.unwrap()` calls
- Impact: App crash (panic) if unexpected input reaches these paths. Tauri will not catch Rust panics gracefully — the entire backend process terminates.
- Fix approach: Replace `.unwrap()` with `.ok_or_else(|| "descriptive error".to_string())?` or `.unwrap_or_default()` where appropriate. Priority: `gsd2.rs:6770-6771` and `github.rs:178,186` since they handle user-influenced data.

### dangerouslySetInnerHTML Usage
- Issue: Raw HTML injection via `dangerouslySetInnerHTML` in the file browser
- Files: `src/components/project/file-browser.tsx:514`
- Impact: If `highlightedContent` contains unsanitized user content, it is a potential XSS vector. Since this is a desktop app reading local files, risk is lower but still present if a malicious project is opened.
- Current mitigation: Content comes from highlight.js which typically HTML-escapes input
- Fix approach: Verify the highlight.js pipeline always escapes input, or add explicit sanitization (e.g., DOMPurify)

### @ts-nocheck on Entire File
- Issue: `src/components/project/github-panel.tsx` has `@ts-nocheck` suppressing all TypeScript checking (721 lines)
- Files: `src/components/project/github-panel.tsx:1,5`
- Impact: Zero type safety on a 721-line component handling GitHub API data. Any bug introduced here will not be caught at compile time.
- Fix approach: Remove `@ts-nocheck`, add proper types to callback params and API response shapes. This is the only file in the codebase with this directive.

## Technical Debt

### Massive Single-File Modules
- Issue: Several files are excessively large, making them difficult to navigate, test, and maintain
- Files:
  - `src-tauri/src/commands/gsd2.rs` — **8,482 lines**, 43 commands
  - `src-tauri/src/commands/gsd.rs` — **4,427 lines**, 30 commands
  - `src/lib/tauri.ts` — **2,299 lines** (typed invoke wrappers)
  - `src/lib/queries.ts` — **1,833 lines** (TanStack Query hooks)
  - `src-tauri/src/commands/filesystem.rs` — **1,592 lines**, 12 commands
  - `src/components/project/git-status-widget.tsx` — **1,413 lines**
  - `src-tauri/src/db/mod.rs` — **1,318 lines**
- Impact: Difficult to review, high merge conflict risk, slow IDE performance, cognitive overload
- Fix approach: Split `gsd2.rs` into sub-modules (e.g., `gsd2/milestones.rs`, `gsd2/headless.rs`, `gsd2/doctor.rs`, `gsd2/reports.rs`). Split `tauri.ts` and `queries.ts` by domain (git, gsd, projects, etc.).

### Duplicated Code Across Modules
- Issue: Helpers are intentionally copied between `gsd.rs` and `gsd2.rs` with an explicit comment: "Helpers (copied from gsd.rs — do NOT import across module boundary)"
- Files:
  - `src-tauri/src/commands/gsd.rs:28` — `fn get_project_path()`
  - `src-tauri/src/commands/gsd2.rs:32` — `fn get_project_path()` (identical copy)
- Impact: Changes to shared logic must be applied in two places. Bug fixes can be missed.
- Fix approach: Extract shared helpers to a common module (e.g., `src-tauri/src/commands/helpers.rs` or `src-tauri/src/utils.rs`) and import from both `gsd.rs` and `gsd2.rs`.

### Duplicated stripAnsi Implementation
- Issue: `stripAnsi` function is implemented twice — once in the shared parser and once locally in the headless session hook
- Files:
  - `src/lib/pty-chat-parser.ts:91` — exported `stripAnsi()` function
  - `src/hooks/use-headless-session.ts:91` — local copy with comment "matches pty-chat-parser's stripAnsi"
- Impact: Two copies to maintain; divergence risk if one is updated but not the other
- Fix approach: Import `stripAnsi` from `@/lib/pty-chat-parser` in `use-headless-session.ts`

### Regex Compilation in Hot Paths
- Issue: `Regex::new()` is called inside functions (not compiled once), creating new regex objects on every invocation
- Files:
  - `src-tauri/src/commands/gsd.rs` — 46 `Regex::new()` calls scattered across functions
  - `src-tauri/src/commands/filesystem.rs` — 4 `Regex::new()` calls
  - `src-tauri/src/commands/projects.rs` — 1 `Regex::new()` call
- Impact: Minor performance cost per call. Regex compilation is not free, especially with 46 instances in `gsd.rs`.
- Fix approach: Use `lazy_static!` or `once_cell::sync::Lazy` to compile regexes once at module level.

### Stub Functions in Headless Session Hook
- Issue: Backend commands for session persistence are stubbed with no-op functions
- Files: `src/hooks/use-headless-session.ts:10-12`
  ```typescript
  const gsd2HeadlessSaveSession = async (_args: any): Promise<void> => {};
  const gsd2HeadlessLoadLastSession = async (_projectId: string): Promise<any | null> => null;
  ```
- Impact: Headless session state is lost between app restarts. The UI calls `loadPersistedSession` and `gsd2HeadlessSaveSession` but they silently do nothing.
- Fix approach: Wire these to actual Tauri commands or remove the persistence UI to avoid misleading users.

### Hooks Called Inside Loops (Rules of Hooks Violation)
- Issue: `useCodebaseDoc` hook is called inside a `.map()` loop, violating React's rules of hooks
- Files: `src/components/project/codebase-tab.tsx:51-55`
  ```typescript
  const probeResults = CODEBASE_DOCS.map((doc) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { data } = useCodebaseDoc(projectPath, doc.filename);
    return { filename: doc.filename, exists: !!data };
  });
  ```
- Impact: If `CODEBASE_DOCS` changes length at runtime, React will crash. The eslint-disable comment masks a real bug risk.
- Fix approach: Create a single `useCodebaseDocs` hook that accepts an array, or use a single query that checks all docs.

## Architecture Concerns

### Monolithic Command Registration
- Issue: All 206+ Tauri commands are registered in a single `generate_handler![]` macro call in `src-tauri/src/lib.rs:120-348`
- Files: `src-tauri/src/lib.rs:120-348`
- Impact: Long compile times, difficult to scan, easy to forget registering new commands
- Fix approach: This is a Tauri limitation — the `generate_handler!` macro requires all commands in one place. Consider grouping with clear section comments (already partially done).

### GSD v1 and v2 Coexistence
- Issue: Two separate GSD systems (`gsd.rs` for `.planning/` directory structure, `gsd2.rs` for `.gsd/` directory structure) coexist with 73 combined commands
- Files:
  - `src-tauri/src/commands/gsd.rs` — 30 commands (v1)
  - `src-tauri/src/commands/gsd2.rs` — 43 commands (v2)
- Impact: Nearly 13,000 lines of Rust code for two planning systems. Maintenance burden is doubled. Frontend must support both code paths.
- Fix approach: If GSD v1 is deprecated, plan a migration path and remove v1 commands. If both are needed long-term, extract shared logic.

### Error Handling via String
- Issue: All Tauri commands return `Result<T, String>` with `.map_err(|e| e.to_string())?` throughout
- Files: All files in `src-tauri/src/commands/` (pervasive pattern)
- Impact: Error context is lost — callers cannot distinguish between error types (DB error vs. file not found vs. validation error). Frontend gets opaque error strings.
- Fix approach: Define a proper error enum (using `thiserror` which is already a dependency) and implement `Into<InvokeError>` for structured error handling.

## Developer Experience Issues

### Low Test Coverage
- Issue: 22 test files covering ~170 source files (roughly 13% file coverage)
- Test file locations:
  - `src/components/settings/__tests__/` — 1 test
  - `src/components/projects/__tests__/` — 2 tests
  - `src/components/project/__tests__/` — 4 tests
  - `src/components/__tests__/` — 1 test
  - `src/components/knowledge/__tests__/` — 1 test
  - `src/components/onboarding/__tests__/` — 1 test
  - `src/lib/__tests__/` — 6 tests
  - Plus 6 co-located test files
- Impact: Large areas of the codebase have zero test coverage, especially:
  - No tests for `src/components/terminal/interactive-terminal.tsx` (683 lines)
  - No tests for most pages in `src/pages/` (except `projects.test.tsx`)
  - Rust backend tests exist only in `gsd2.rs` and `templates.rs`
- Fix approach: Prioritize tests for data layer (`queries.ts`), terminal context, and critical UI flows

### eslint-disable Comments for react-hooks/exhaustive-deps
- Issue: 11 `eslint-disable` comments suppressing hook dependency warnings
- Files:
  - `src/pages/project.tsx:136`
  - `src/pages/settings.tsx:32`
  - `src/pages/dashboard.tsx:64`
  - `src/contexts/terminal-context.tsx:232`
  - `src/components/terminal/terminal-view.tsx:261`
  - `src/components/terminal/interactive-terminal.tsx:207,570,608`
  - `src/components/project/codebase-tab.tsx:52`
  - `src/components/project/guided-project-view.tsx:49`
  - `src/components/project/gsd2-headless-tab.tsx:56`
  - `src/components/knowledge/knowledge-viewer.tsx:74`
  - `src/components/theme/theme-provider.tsx:202`
- Impact: Potential stale closure bugs. Effects may not re-run when dependencies change, leading to subtle UI inconsistencies.
- Fix approach: Audit each suppression. Use `useCallback` to stabilize function references, or restructure effects to correctly declare dependencies.

### Swallowed Errors in .catch(() => {})
- Issue: Multiple places catch and silently discard errors
- Files:
  - `src/contexts/terminal-context.tsx:260,292,533` — terminal session save errors silently ignored
  - `src/components/terminal/interactive-terminal.tsx:231,239,255` — PTY resize/detach errors silently ignored
  - `src/components/theme/theme-provider.tsx:199,214`
  - `src/components/project/gsd-validation-plan-tab.tsx:105` — clipboard write error ignored
- Impact: Failures are invisible to both users and developers. Debugging becomes harder when operations fail silently.
- Fix approach: At minimum, log errors to console or the app's log system. For user-facing operations, show a toast.

## Dependency Risks

### npm Audit Vulnerabilities
- Issue: 22 known vulnerabilities (8 moderate, 14 high) in the dependency tree
- Packages affected:
  - `minimatch` (ReDoS via repeated wildcards) — via `eslint` and `typescript-eslint`
  - `picomatch` (method injection in POSIX character classes) — via `tailwindcss`
- Impact: These are all in devDependencies (eslint, tailwindcss tooling) so they do not affect production builds. However, they could affect the development environment.
- Fix approach: Update `eslint` and `tailwindcss` to versions with patched transitive dependencies, or wait for upstream fixes.

### portable-pty Version
- Issue: `portable-pty = "0.8"` — this crate has had sporadic maintenance
- Files: `src-tauri/Cargo.toml`
- Impact: If bugs are found in PTY handling (especially on macOS), fixes may be slow. PTY is critical for the terminal feature.
- Fix approach: Monitor for alternatives or forks. Consider `alacritty_terminal` or `ptyprocess` if maintenance stalls.

## Improvement Opportunities

### Quick Wins (Low Effort, High Impact)

1. **Extract shared `stripAnsi`** — Import from `pty-chat-parser.ts` instead of duplicating in `use-headless-session.ts`. One-line import change.

2. **Fix `get_project_path` duplication** — Extract to a shared `helpers.rs` module. ~10 minutes of work, eliminates divergence risk.

3. **Add error logging to `.catch(() => {})` blocks** — Replace empty catches with `catch((e) => console.warn('operation failed:', e))`. Quick find-and-replace.

4. **Remove `@ts-nocheck` from `github-panel.tsx`** — Add proper types to the component. Prevents silent type regressions.

### Medium-Term Improvements

1. **Split `gsd2.rs` into sub-modules** — Group the 43 commands by domain (milestones, headless, doctor, reports, preferences). Reduces file from 8,482 lines to ~5 files of 1,500-2,000 lines each.

2. **Split `tauri.ts` and `queries.ts` by domain** — Create `lib/tauri/git.ts`, `lib/tauri/gsd.ts`, `lib/queries/gsd.ts`, etc. with barrel re-exports.

3. **Introduce a proper Rust error type** — Use `thiserror` to create `AppError` enum, replacing `Result<T, String>` throughout. Enables structured error handling on the frontend.

4. **Wire headless session persistence** — Implement the Tauri commands for `gsd2HeadlessSaveSession` and `gsd2HeadlessLoadLastSession`, or remove the dead persistence code.

### Long-Term Architectural Changes

1. **Deprecate or migrate GSD v1** — If `.planning/` based workflow (gsd.rs, 4,427 lines) is superseded by `.gsd/` based workflow (gsd2.rs), plan a migration path and remove v1 to cut ~4,400 lines of backend code and associated frontend code.

2. **Compile regexes statically** — Use `once_cell::sync::Lazy` for all `Regex::new()` calls in `gsd.rs` (46 instances) and other command modules.

3. **Increase test coverage** — Target critical paths: terminal session management, GSD state derivation, PTY lifecycle, and the query layer.

## Raw Findings

### TODO Comments
- `src-tauri/src/commands/gsd2.rs:4340` — `// TODO: GSD-2 guard not possible without DB state — no project_id parameter`

### FIXME Comments
- None found.

### HACK/WORKAROUND Comments
- None found.

### @ts-nocheck / @ts-ignore Directives
- `src/components/project/github-panel.tsx:1` — `@ts-nocheck` (entire 721-line file)

### eslint-disable Directives (16 total)
- `src/pages/project.tsx:136` — `react-hooks/exhaustive-deps`
- `src/pages/settings.tsx:32` — `react-hooks/set-state-in-effect`
- `src/pages/dashboard.tsx:64` — `react-hooks/exhaustive-deps`
- `src/contexts/terminal-context.tsx:232` — `react-hooks/exhaustive-deps`
- `src/components/terminal/terminal-view.tsx:261` — `react-hooks/exhaustive-deps`
- `src/components/terminal/interactive-terminal.tsx:207` — `react-hooks/exhaustive-deps`
- `src/components/terminal/interactive-terminal.tsx:570` — `react-hooks/exhaustive-deps`
- `src/components/terminal/interactive-terminal.tsx:608` — `react-hooks/exhaustive-deps`
- `src/components/project/codebase-tab.tsx:52` — `react-hooks/rules-of-hooks` (violation)
- `src/components/project/guided-project-view.tsx:49` — `react-hooks/exhaustive-deps`
- `src/components/project/gsd2-headless-tab.tsx:56` — `react-hooks/exhaustive-deps`
- `src/hooks/use-headless-session.ts:10` — `@typescript-eslint/no-explicit-any`
- `src/components/knowledge/knowledge-viewer.tsx:74` — `react-hooks/exhaustive-deps`
- `src/components/theme/theme-provider.tsx:202` — `react-hooks/exhaustive-deps`

### Console.log/warn/error in Production Code
- `src/lib/sentry.ts:9` — `console.log` for missing DSN
- `src/lib/performance.ts:68,104` — `console.warn` for slow invocations (intentional monitoring)
- `src/hooks/use-close-warning.ts:58` — `console.warn` for terminal save failure
- `src/components/settings/secrets-manager.tsx:114` — `console.error` for secrets load failure
- `src/components/project/env-vars-tab.tsx:95` — `console.error` for env vars load failure

---

*Concerns audit: 2026-03-30*
