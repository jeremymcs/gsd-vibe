# GSD Vibe - Project Knowledge

## Worktree / node_modules Gotcha

Git worktrees do NOT inherit `node_modules` from the main repo. The worktree lives at a real path like `/Users/jeremymcspadden/.gsd/projects/<id>/worktrees/<name>` which has no `node_modules/` directory. Running `pnpm build` or `pnpm test` from the worktree directory fails with "command not found" or "cannot find package 'vite'".

**Fix:** Create a symlink before running any build/test commands from the worktree:
```bash
ln -s /path/to/main-repo/node_modules /path/to/worktree/node_modules
```

The worktree symlink at `.gsd/worktrees/<name>` resolves to the real path under `.gsd/projects/` — these are different filesystem locations so `node_modules` resolution fails by default.

## pnpm run commands must be executed from the worktree with symlink

After creating the symlink, `pnpm build`, `pnpm test`, `pnpm lint` etc. all work correctly from the worktree directory because pnpm finds node_modules via the symlink.

## project.tsx migration pattern

When migrating `project.tsx` from Tabs to a nav rail:
- Remove ALL Tabs/TabsList/TabsTrigger/TabsContent imports from `@/components/ui/tabs`
- Move `useHeadlessSession`, `useGsdFileWatcher`, `watchProjectFiles` useEffect, and auto-sync useEffect into the ProjectWorkspace container — they need access to project state and should survive view switches
- The terminal component (TerminalTabs) must be always-mounted with CSS `hidden` class toggle (NOT conditional rendering) to preserve xterm.js sessions across view changes

## TabsContent forceMount vs CSS hidden

The old code used `<TabsContent forceMount>` pattern. The new pattern is: render `<TerminalTabs>` inside a div with `className={activeView === 'power' ? 'flex-1 ...' : 'hidden'}` placed OUTSIDE the view-switch conditional. This achieves the same always-mounted behavior without Radix Tabs dependency.

## VibeFlow tsconfig is Stricter than gsd-2 — noUnusedLocals

VibeFlow sets `"noUnusedLocals": true` and `"noUnusedParameters": true` in `tsconfig.json`. The upstream gsd-2 project does not. When porting files from gsd-2, private class fields that are assigned but never read (e.g., `_lastInputAt`) will cause TS6133 compile errors. The correct fix is a targeted `// @ts-expect-error TS6133` comment on the field declaration — not removing the field (logic change) and not relaxing the tsconfig. ESLint `@typescript-eslint/no-unused-vars` is separate and does not suppress tsc TS6133.

## react-resizable-panels API: Separator not PanelResizeHandle, orientation not direction

The installed version of `react-resizable-panels` (4.6.2) exports `Separator` as the drag handle — **not** `PanelResizeHandle`. The orientation prop on `Group` is `orientation="horizontal"` — **not** `direction="horizontal"`. Check `node_modules/react-resizable-panels/dist/react-resizable-panels.d.ts` when in doubt. The pattern used in `global-terminals.tsx` is authoritative: `import { Group, Panel, Separator } from "react-resizable-panels"`.

## project-workspace.test.tsx @/lib/queries mock must use importOriginal

The `project-workspace.test.tsx` file renders real view components (`DashboardView`, etc.) that call multiple hooks from `@/lib/queries`. Mocking `@/lib/queries` as a flat object will fail with "No X export defined" errors for every unmocked hook. Always use the `importOriginal` pattern to spread the real module and override only what's needed:
```ts
vi.mock('@/lib/queries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/queries')>();
  return { ...actual, useGsdSync: vi.fn(() => ...) };
});
```

## ViewProps is the base interface for all nav-rail view components

All view components accept `ViewProps` from `src/lib/views.ts` as their base props: `{ projectId: string, projectPath: string }`. Views needing GSD-mode branching extend it with `isGsd2` and `isGsd1` boolean flags (established by DashboardView and RoadmapView). New view components should follow this pattern.

## Canonical command catalog is the single source of truth

`src/lib/gsd-command-catalog.ts` defines all 50 /gsd commands with labels, descriptions, and categories. Both `CommandSurfacePanel` and `ChatView` import from this file. Do NOT define inline command lists — always reference the catalog.

## act() warnings in tests are cosmetic — from TerminalProvider

Many test files show `Warning: An update to TerminalProvider inside a test was not wrapped in act(...)`. These are cosmetic warnings from the `AllProviders` test wrapper mounting `TerminalProvider`, which triggers an async state update. The warnings don't affect test correctness and are safe to ignore. Wrapping in `act()` is non-trivial because the update comes from the provider's initialization, not the test action.

## Gsd2VisualizerTab is the last inline view in project-workspace.tsx

As of M001 completion, the visualizer view slot still renders `Gsd2VisualizerTab` inline in `project-workspace.tsx`. All other 6 view slots have dedicated extracted components. The visualizer extraction is planned for M002.

## metrics.json uses camelCase startedAt/finishedAt, not snake_case completed_at

The live `.gsd/metrics.json` format (as written by GSD-2's agent harness) uses camelCase field names: `startedAt`, `finishedAt`, `toolCalls`, `assistantMessages`, `userMessages`, `cacheRead`, `cacheWrite`. The old Rust parser (pre-M002 T01) incorrectly read `completed_at` and `milestone_id` — those don't exist. Always use camelCase field names when parsing metrics.json in Rust. The `timeline.completed_at` backwards-compat field in VisualizerData now stores the finishedAt float as a string.

## cargo check --lib is needed to avoid pre-existing main.rs binary breakage

The binary target `src-tauri/src/main.rs` references `track_your_shit_lib::run()` — an old crate name. `cargo check` (full) fails with E0433 on this file. Use `cargo check --manifest-path src-tauri/Cargo.toml --lib` to verify the library target only. The binary target breakage is pre-existing and unrelated to M002 work.

## Worktree tests must be verified by temporarily copying files to main repo

When writing tests for worktree-only components (files only on the feature branch), running `pnpm test` from the main repo only tests main-branch files. To verify tests pass: (1) copy the worktree's modified files to the main repo's `src/`, (2) run `pnpm test` from main repo, (3) restore with `git checkout HEAD -- <files>`. This is the only reliable way to verify vitest tests in a worktree context without full node_modules symlink setup.

## ForensicCrashLock struct uses snake_case serde keys (not camelCase from auto.lock)

`ForensicCrashLock` derives serde `Deserialize` with default snake_case field names. The actual `.gsd/auto.lock` file from the GSD runtime uses camelCase keys (`startedAt`, `unitType`, `unitId`, `completedUnits`, `sessionFile`). When the Forensics command reads `auto.lock`, it extracts fields manually via `serde_json::Value` key lookups (camelCase), not by deserializing directly into `ForensicCrashLock`. The struct is used for frontend serialization output (snake_case → TypeScript), not for parsing the raw lock file.

## pid_is_alive uses `kill -0` shell subprocess, not libc

The codebase avoids a `libc` crate dependency by spawning `std::process::Command::new("kill").args(["-0", pid])` to check process liveness. `kill -0` on Unix returns exit code 0 if the PID exists, non-zero otherwise. This works on macOS and Linux without unsafe code or native bindings.


## Vitest in worktrees fails with "@testing-library/jest-dom/vitest" resolution error

Running vitest directly from the worktree (even with the nested `node_modules/node_modules/.bin/vitest`) fails because vite's internal module resolver can't find `@testing-library/jest-dom/vitest` from the pnpm virtual store path. This affects ALL 10 existing test files — it's a pre-existing env limitation, not introduced by any single task. The only verified way to run tests is from the main repo: copy worktree source files to `~/Github/gsd-vibe/src/`, run `pnpm test`, restore files. The `pnpm test -- -t "DiagnosticsPanel"` slice verification check must be run from the main repo context.

## diagnostics-panels.tsx Badge TS2322 errors are pre-existing environment artifacts

The TS2322 "not assignable to BadgeProps" errors in `diagnostics-panels.tsx` (and `dependencies-tab.tsx`) appear when running `tsc --noEmit` against the worktree's global node_modules. These are false positives caused by the missing React JSX types in the global node_modules. The same badge usage pattern (`variant={severityBadgeVariant(...)}`) exists in `dependencies-tab.tsx` with identical errors. These resolve in the actual Vite/pnpm build environment.

## Skill names in SkillHealthPanel appear multiple times — use getAllByText

In `SkillHealthPanel`, a skill name like "accessibility" renders in 3 places when it's both a table row AND in the stale/declining skills sections AND in suggestions. Using `getByText("accessibility")` fails with "Found multiple elements". Always use `getAllByText(name).length >= 1` when testing skill name presence in SkillHealthPanel tests, or scope with `within()` to a specific container.

## Worktree tsc resolution: run from main project root, not worktree root

The worktree's `node_modules/` directory is a stub with a symlink: `node_modules/node_modules → /Users/jeremymcspadden/Github/gsd-vibe/node_modules`. Running `pnpm build` or `tsc` directly in the worktree fails because `tsc` is not on PATH at the worktree level. Always run TypeScript type checks from `/Users/jeremymcspadden/Github/gsd-vibe/` (the main project root) using the binary at `node_modules/.bin/tsc`. Similarly, `pnpm test` works from the worktree via pnpm but test setup files that import `@testing-library/jest-dom/vitest` will fail to resolve in the worktree environment — run tests from the main project root.

## Rust borrow-checker: clone capture_id in CaptureResolveResult error paths

When a Rust function receives `capture_id: String` as a parameter and constructs a `CaptureResolveResult { capture_id, error: Some(format!("... {}", capture_id)) }`, the compiler rejects this because `capture_id` is moved into the struct field before `format!` can borrow it. Fix: use `capture_id: capture_id.clone()` in the struct literal so the original value remains available for the format string.

## gsd2.rs parsing convention: avoid regex, use manual string splitting

The file contains an explicit note at line ~471: "We avoid the regex crate — use manual string parsing." All parsers in gsd2.rs should use `str::split()`, `str::find()`, `str::contains()`, and similar stdlib methods rather than `regex::Regex`. The regex crate is available in Cargo.toml but is not to be used in gsd2.rs per this established convention.

## Worktree-to-main sync: new files must be both in worktree AND main src/ tree

When executor tasks write source files to the worktree (`/gsd-vibe/.gsd/worktrees/M002-45qrht/src/...`), those files are NOT automatically present in the main project (`/gsd-vibe/src/...`). A component that compiles in the worktree context may cause `pnpm build` failures in the main project if its data layer dependencies (types, hooks, query keys) haven't been synced. Closer agents must check the main project's `pnpm build` separately and copy or re-apply any worktree-only additions.

## Orphan component files cause silent TS errors on missing hook names

The main project can accumulate orphan `gsd2-*-tab.tsx` files that reference hook names which were renamed or replaced. If these files aren't imported anywhere (not in `index.ts`, not in `project.tsx`), TypeScript still type-checks them during `pnpm build` and reports errors for the missing exports. Check for orphan files with `grep -rn "import" src/components/project/*.tsx` before concluding that a TS error is in an actively-used file.

## serde_yaml::Value is the right intermediate for dynamic YAML frontmatter

When parsing YAML files that may have partial, missing, or versioned fields (like gsd-2's preferences.md), use `serde_yaml::Value` as an intermediate representation instead of deriving `Deserialize` on a typed struct. Extract fields via helper functions (`yaml_str`, `yaml_f64`, `yaml_bool`, etc.) that return defaults when keys are absent. Direct `serde_yaml::from_str::<TypedStruct>()` requires every field to be `Option<T>` or have `#[serde(default)]`, which creates noisy code and still doesn't handle YAML value type mismatches gracefully.

## Plan spec types lag behind actual Rust implementation — always read tauri.ts before building UI

S04 plan spec described `tier_models (light/standard/heavy)`, `budget_pressure`, `timeout_minutes`, and `poll_interval_seconds` — none of which exist in the actual T01 types. The T02 executor had to rebuild the component against the real `tauri.ts` interfaces. For any multi-task slice where T01 defines types and T02 builds UI: read `src/lib/tauri.ts` at the start of T02 — it's always the authoritative source, never the plan spec.

## pnpm test --testPathPattern fails for worktree files; use full suite run for count verification

`pnpm test -- --testPathPattern="settings-panels"` (or similar path-based filters) does not find tests in worktree files when run from the main repo root — vitest resolves includes from the main src/ tree, not the worktree path. Use `pnpm test` (full suite) and verify by test count delta (e.g., 135 → 143 = 8 new tests added). The full suite run does pick up worktree test files through the git worktree path resolution.

## Atomic YAML write-back pattern: tmp.{pid} → rename

When writing back to any structured config file (preferences.md, CAPTURES.md, etc.), always follow: (1) write to `{original_path}.tmp.{process_id}`, (2) `std::fs::rename()` to replace. Never write directly to the target path. The PID suffix prevents collisions from concurrent operations. This pattern is established in gsd2_save_preferences and gsd2_resolve_capture — use it for all future file write-back commands.

## SettingsData.scopes hashmap drives per-field scope badges without extra API calls

The merge_preferences() function annotates each field with its origin scope (global/project/merged/default) and returns it in SettingsData.scopes as HashMap<String, String>. The frontend uses `settings.scopes["field_name"]` to render colored scope badges on each field. This eliminates the need for a separate scope-query API call. Future settings surfaces should follow the same pattern: return merged values + scope map together in a single SettingsData-shaped response.

## M002 Cross-Cutting Lessons

### gsd2.rs is growing — consider module split at M003

After M002, `gsd2.rs` contains 24+ structs, 10+ helpers, and 10 commands across 5 domains (visualizer, diagnostics, knowledge/captures, settings, core state). At M003 planning, evaluate splitting into `gsd2/mod.rs` with submodules. The current single-file approach still compiles quickly but is hard to navigate.

### 48 new tests in one milestone is sustainable but test isolation matters

M002 added 48 frontend + 17 Rust tests without any cross-test interference. The key: each test file mocks `@/lib/queries` with `importOriginal` spread (never flat-replace), and Rust tests use pure helper functions over `&serde_json::Value` (no Tauri State dependency). These patterns keep tests independent and fast.

### The worktree → main sync gap is the biggest operational risk

Every slice in M002 hit the same issue: files written to the worktree's `src/` tree aren't automatically present in the main project's `src/`. The closer for each slice had to manually sync files to validate `pnpm build` and `pnpm test`. Future milestones should consider a pre-close sync check as a formal task or automation step.

### serde_yaml 0.9 is deprecated — watch for breakage

`serde_yaml = "0.9"` was added in S04. The crate has been deprecated in favor of alternatives. Monitor for compilation issues in future Rust toolchain updates. If it breaks, consider `serde_yml` or `yaml-rust2` as replacements.

### GSD worktrees have their own package.json but no node_modules — install before running tests

Git worktrees under `.gsd/worktrees/` each have their own `package.json` and `pnpm-lock.yaml` copied from the source tree, but no `node_modules` directory. Running `pnpm test` or `pnpm build` in a fresh worktree will fail with `vitest: command not found`. Run `pnpm install --frozen-lockfile` once in the worktree before any test or build commands. This is expected behavior — pnpm does not automatically share node_modules across git worktrees unless symlinked.

## cargo test must be run with --manifest-path from outside the worktree symlink path

Running `cargo test` from `/Users/jeremymcspadden/.gsd/projects/<id>/worktrees/<name>` (the symlink path) fails with "could not find `Cargo.toml` in ... or any parent directory". This is because `cargo` resolves the manifest from the *real* filesystem path, not the symlink target's path. Always use `cargo test --manifest-path /path/to/main/repo/src-tauri/Cargo.toml --lib` when running Rust tests for worktrees. The working directory in GSD auto-mode is the symlink path — so cargo commands require the explicit `--manifest-path` flag.

## reqwest HTTP pattern for Tauri commands: builder → timeout → get → send → json

The proven reqwest pattern for outbound HTTP calls from a Tauri async command:
```rust
let client = reqwest::Client::builder()
    .timeout(Duration::from_secs(10))
    .build()
    .map_err(|e| format!("Failed to build HTTP client: {}", e))?;
let resp = client.get(url).send().await.map_err(|e| format!("Request failed: {}", e))?;
let data: SomeStruct = resp.json().await.map_err(|e| format!("JSON parse failed: {}", e))?;
```
Always use 10s timeout. Always map errors to descriptive `String` for the `Result<T, String>` Tauri return type. This pattern is established in `gsd2_check_update` and is the template for S05's `gsd2_validate_provider_key`.

## TanStack Query hook pattern for background polling that should fail silently

For periodic background checks (update detection, status polling) that should not surface error toasts:
```ts
useQuery({
  queryKey: queryKeys.someKey(id),
  queryFn: () => api.someCall(id),
  staleTime: 60 * 60 * 1000,      // 1h — don't refetch on focus within this window
  refetchInterval: 60 * 60 * 1000, // 1h — background refetch
  retry: false,                     // don't retry on failure — fail silently
})
```
`retry: false` is critical for network-dependent checks. Without it, TanStack Query retries 3× on failure with exponential backoff, causing noisy failure behavior for checks that should degrade gracefully. Established in `useGsd2UpdateCheck`.

## Mock @/lib/queries module by targeting the hook directly, not the entire module

When testing a component that calls a single hook (e.g., `UpdateBanner` calling `useGsd2UpdateCheck`), mock just the hook rather than the entire queries module:
```ts
vi.mock('@/lib/queries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/queries')>();
  return { ...actual, useGsd2UpdateCheck: vi.fn() };
});
```
This avoids breaking all other components in the test environment that depend on different hooks from the same module. The `importOriginal` spread pattern (established in KNOWLEDGE.md from M002) is required here too.


## ~/.gsd/sessions/ JSONL format: line 1 is the session header, not a message

Session JSONL files at `~/.gsd/sessions/<project-dir>/<uuid>.jsonl` have line 1 as a JSON object with `{"type":"session","id":"...","timestamp":"...","cwd":"..."}`. This is NOT a message. Messages appear on subsequent lines as `{"type":"message","message":{"role":"user"|"assistant",...}}`. Session renames are appended as `{"type":"session_info","name":"..."}` — the last such line wins. Never assume line 1 is a message when parsing session files.

## derive_session_dir_name: colon in path becomes a single dash (no deduplication)

The `derive_session_dir_name(cwd)` function strips the leading `/`, then replaces each of `/`, `\`, `:` with `-`. `C:\Users\foo` → `--C--Users-foo--` NOT `--C-Users-foo--`. Two consecutive dashes appear because the colon → dash and the backslash → dash are independent replacements. The plan spec had this wrong. Always verify against the actual Rust implementation (or real on-disk directory names) rather than the plan doc.

## Session rename uses append semantics, not atomic rewrite

`gsd2_rename_session` opens the file in append mode and writes `\n{"type":"session_info","name":"..."}`. It does NOT use a temp-file-then-rename pattern. The reason: `parse_session_jsonl` scans for `session_info` entries and uses the **last** one found. This matches gsd-2's own session rename behavior. Do NOT change this to atomic rewrite without also updating the parser to handle a single canonical line.

## Option<bool> IPC pattern: pass undefined (not false) for "no filter" cases

When a Rust Tauri command accepts `Option<bool>` (e.g., `named_only: Option<bool>`), pass `undefined` from TypeScript when you want `None`. Passing `false` deserializes to `Some(false)` which has distinct semantics ("match items where the bool is false") — a subtle but important distinction. Always use `undefined` for "unset" and `true`/`false` for explicit values. This pattern is established in `useGsd2SessionBrowser` and `gsd2_list_session_browser`.

## Hover-reveal rename pattern: opacity-0 group-hover:opacity-100

To show an action button only on hover without causing layout shift, use the Tailwind group pattern on the card container and `opacity-0 group-hover:opacity-100 transition-opacity` on the button. This is used in `SessionCard` for the pencil rename button. The button still occupies space (no layout shift) but is invisible until hover. Use `focus-within:opacity-100` if the card needs to remain visible when focused for keyboard accessibility.

## useRef<HTMLInputElement> for focus-on-open in inline edits

When an inline edit input appears on user action (like clicking a rename pencil icon), it should auto-focus. The pattern: define `const inputRef = useRef<HTMLInputElement>(null)`, pass it to the input element as `ref={inputRef}`, and call `inputRef.current?.focus()` inside a `useEffect` that depends on the rename active state. Avoid calling `.focus()` directly in the click handler — React hasn't rendered the input yet. This pattern is established in `SessionCard`.

## Testing AlertDialog content: avoid getByText(/<number>/) due to ambiguity

When writing tests for a Radix UI AlertDialog that displays a count (like "1 branch", "2 snapshots") in `<strong>N</strong>` nodes, `getByText(/N/)` will match multiple DOM elements — branch names in the background panel that happen to contain the digit are still in the DOM (aria-hidden) and still match. Instead, verify dialog presence via: (1) the dialog title text, (2) `getByRole('button', { name: /^delete$/i })` (AlertDialogAction renders with role="button"), and (3) unique prose only inside the dialog like `getByText(/this action cannot be undone/i)`. Applies to CleanupPanel and any similar confirmation pattern.

## TanStack Query mutation mock: full field set required

When mocking `useGsd2ExecuteCleanup` (or any useMutation hook) with `vi.mocked(...).mockReturnValue(stub)`, TypeScript requires the stub to match the full `UseMutationResult` shape. Include all fields: `mutate`, `mutateAsync`, `isPending`, `isError`, `isSuccess`, `isIdle`, `error`, `data`, `reset`, `variables`, `context`, `failureCount`, `failureReason`, `status`, `submittedAt`. Casting `as ReturnType<typeof useGsd2ExecuteCleanup>` after a partial stub object will satisfy the type checker but hiding fields can cause subtle undefined access errors. Define a `defaultMutation` const with all required fields set to their idle defaults.


## run_git_command: returns empty string on non-zero exit, not an error

`run_git_command(cwd, &["branch", "--list", "gsd/*"])` returns `""` when git exits non-zero (e.g., no matching refs). Callers treat empty string as "no data" — this is intentional. Never change this to return `Err(...)` without also updating every caller that relies on the empty-string convention. Users with no GSD branches or snapshots should see an empty panel, not an error toast.

## completed-units.json split: use split_once('/'), not split('/')[..2]

Each entry in `completed-units.json` is a string like `"execute-task/M003-k8v2px/S01/T01"`. The unit type is the part before the first `/`. The unit ID is everything after. Use `s.split_once('/')` or `s.splitn(2, '/')`. Never use `s.split('/').collect()[1]` — the unit ID contains slashes and you'll get a truncated value. This is established in `parse_completed_units_json` in `commands/gsd2.rs`.

## Testing AlertDialog confirmation: use role="button" name + unique prose, not getByText(/<count>/)

When a Radix UI AlertDialog displays a numeric count (e.g., "1 branch", "2 snapshots"), `getByText(/1/)` matches multiple DOM nodes — branch names, snapshot names, and the `<strong>1</strong>` nodes in the dialog body are all present in the DOM (aria-hidden still matches). Instead, verify dialog presence with: (1) dialog title text, (2) `getByRole('button', { name: /^delete$/i })` (AlertDialogAction renders with role="button"), (3) unique prose like `getByText(/this action cannot be undone/i)`. This pattern is established in `cleanup-panel.test.tsx`.

## TanStack Query mutation mock: full UseMutationResult shape required

When mocking a `useMutation`-based hook return value with `vi.mocked(...).mockReturnValue(stub)`, define a `defaultMutation` const that includes ALL `UseMutationResult` fields: `mutate`, `mutateAsync`, `isPending`, `isError`, `isSuccess`, `isIdle`, `error`, `data`, `reset`, `variables`, `context`, `failureCount`, `failureReason`, `status`, `submittedAt`. Cast the object `as ReturnType<typeof useGsd2ExecuteCleanup>`. A partial stub silently produces `undefined` for missing fields accessed in the component, causing hard-to-trace test failures. This pattern is established in `cleanup-panel.test.tsx` as `defaultMutation`.

## ptyWrite dispatch from React: always use TextEncoder for string → Uint8Array

When dispatching a command string to `ptyWrite(sessionId, data: Uint8Array)`, encode via `new TextEncoder().encode('/gsd undo --force\n')`. Do not construct a manual byte array or use `Buffer.from`. TextEncoder is available in all browser/jsdom environments. This is established in `undo-panel.tsx` and verified in `undo-panel.test.tsx` by asserting on `Uint8Array` byte equality.

## cargo test filter naming: use gsd2_{section}_ prefix for all M003 slice tests

The slice plan verification commands use `cargo test gsd2_export`, `cargo test gsd2_cleanup`, etc. as filter strings. If you name tests `test_classify_unit_phase_*` (the plan's original suggestion), those tests will NOT match the filter. Always prefix all tests in a new S0x section with `gsd2_{section_name}_` — e.g., S04 uses `gsd2_export_`, S03 uses `gsd2_cleanup_` and `gsd2_undo_`. The filter string in the verification command is the authoritative source; rename tests to match the filter, not vice versa.

## aggregate_by_model sort: match existing visualizer sort, not alphabetical

When adding or extending metrics aggregation functions, `aggregate_by_model` (and any cost-ranking output) must sort by cost descending to match `gsd2_get_visualizer_data`'s `cost_by_model` output. Users see the visualizer and the export side-by-side — inconsistent ordering causes confusion. Always sort by cost descending for model/phase aggregations unless explicitly specified otherwise.

## ExportPanel wiring location: inside tab component, not project.tsx

When adding a new panel that logically "belongs with" an existing tab (e.g., ExportPanel belongs with the Visualizer), wire it inside the tab component (e.g., `gsd2-visualizer-tab.tsx`), not in `project.tsx`. This keeps the export co-located with the data it operates on, avoids touching page-level routing code, and ensures the panel migrates atomically with the tab during the future nav-rail migration.

## aria-pressed Button toggle: simpler and more testable than ToggleGroup for 2-option format selectors

When a component needs a 2-option format/mode toggle (e.g., Markdown/JSON), prefer two Button components with `aria-pressed` state over ToggleGroup. Reasons: (1) no additional shadcn/ui component needed, (2) `toHaveAttribute('aria-pressed', 'true')` is directly testable in RTL without querying by role or data attribute, (3) screen readers announce the pressed state natively. Pattern: `variant={format === 'x' ? 'default' : 'outline'}` + `aria-pressed={format === 'x'}`. Use ToggleGroup if 3+ options are needed.

## `getByLabelText` regex vs exact string when input and button share label words

**Context:** S05 T04 — onboarding-wizard tests

`getByLabelText(/API Key/i)` matched two elements: the `<label>API Key</label>` (associated with the input via `htmlFor="api-key-input"`) AND the `<button aria-label="Validate API key">` (Radix/testing-library treats `aria-label` as a label). The regex matched both because "API key" appears in both.

**Fix:** Use exact string `getByLabelText("API Key")` — lowercase "key" in the button's aria-label ("Validate API key") does not match the exact "API Key" label text.

**Rule:** When a step component has both a `<label>` and a button with an `aria-label` containing similar words, prefer exact string selectors in tests to avoid false multi-matches.

## Automatic JSX transform + noUnusedLocals: never write `import React from 'react'`

**Context:** S05 T02 — every new component file

VibeFlow uses the automatic JSX transform (`"jsx": "react-jsx"` in tsconfig) combined with `"noUnusedLocals": true`. Writing `import React from 'react'` at the top of a component file causes TS6133 "declared but never read" because the JSX transform doesn't need the explicit React import. Only import named exports you actually use: `import { useState, useEffect, type Dispatch, type SetStateAction } from 'react'`. If you need a type-only import (e.g., `SetStateAction`) and it's not used as a value, use `import type { ... }` to avoid the noUnusedLocals error even further. This rule is enforced at compile time — `pnpm build` will fail, not just lint.

## Mutation hook inline mock pattern: call onSuccess/onError synchronously in mockImplementation

When testing a component that calls `mutation.mutate(vars, { onSuccess, onError })`, mock the `mutate` function to call the callbacks synchronously:

```ts
mutate: vi.fn().mockImplementation((_vars, callbacks) => {
  callbacks?.onSuccess?.({ ok: true, message: '' });
}),
```

This pattern avoids needing `waitFor`/`act` in tests because the state update happens synchronously in the same tick as the `fireEvent.click`. Established in onboarding-wizard.test.tsx for testing validation success/error states.

## Provider endpoint pure function pattern: extract (url, headers) construction before reqwest call

When implementing a Tauri command that makes HTTP calls to multiple provider endpoints, extract the URL + header construction into a pure `provider_endpoint(id, key) -> Option<(String, HeaderMap)>` function. This enables unit tests that verify URL/header construction without mocking reqwest — just call the pure function and assert on the returned values. The actual `reqwest::Client::get().headers().send()` logic stays in the command body. This pattern is established in `gsd2_validate_provider_key` and its `gsd2_onboarding_provider_endpoint_map` test.

## M003 cross-cutting: append-only file patterns merge cleanly across worktrees

M003 slices all appended new code to `gsd2.rs`, `tauri.ts`, `queries.ts`, `query-keys.ts`, and `project.tsx`. Because all additions are append-only (new sections at the end of the file), intra-milestone slice merges were conflict-free. When multiple milestones modify the same files (e.g. M002 and M003 both add to `gsd2.rs`), append-only additions to different sections merge cleanly as long as no slice modifies existing code in the same region. This is the reason M003 deliberately avoided modifying M002-added sections.

## Atomic file writes for security-sensitive files: temp + rename + chmod

For files containing secrets (like `auth.json`), always write to a PID-suffixed temp file first, then `fs::rename` atomically, then `chmod 0600`. This prevents partial writes from being readable and ensures the file is never world-readable even briefly. Pattern established in S05's `gsd2_write_onboarding_config`.

## mutateAsync + try/finally for deterministic UI state cleanup

When a TanStack Query mutation needs to clear UI state (like selected checkboxes) after completion regardless of success/failure, use `await mutateAsync(...)` in a `try { } finally { clearState() }` block — not the `onSuccess`/`onError` callbacks. The callbacks only fire on their respective paths; `finally` always runs. This is the canonical pattern for any mutation where stale UI state after an error is worse than no state. Established in S03's CleanupPanel (D029).

## M003 branch was merged to main — reconstruct from slice summaries

When the M003-k8v2px branch is referenced in M004 task plans (via `git show milestone/M003-k8v2px:...`), the branch no longer exists. The complete implementation was reconstructed from the M003 milestone's slice task summaries in `.gsd/milestones/M003-k8v2px/slices/S01-S05/tasks/T01-PLAN.md` and `T01-SUMMARY.md` files. These artifacts contain exact struct definitions, function signatures, algorithms, and test expectations needed to reproduce the code from scratch.

**Pattern:** When a referenced branch is gone, check `.gsd/milestones/<ID>/slices/*/tasks/*-SUMMARY.md` for implementation details. The `provides:` and `key_decisions:` frontmatter fields capture the essential design decisions.

## Python heredoc for large Rust code insertions

When inserting 500+ line blocks into Rust files, the `Edit` tool's `oldText` parameter hits character limits. Use `python3 -c` or `python3 - << 'PYEOF'...PYEOF` with `str.replace()` targeting a short unique anchor. The Python approach handles arbitrary unicode and escaping correctly.

## Rust escape sequences in Python-generated code

When generating Rust code via Python heredocs:
- Unicode em-dash: write the actual UTF-8 character `—` not `\u2014` — Rust requires `\u{2014}` form but the UTF-8 literal works directly
- Backslash in string literals: Python `\\\\` becomes Rust `\\` which represents a literal backslash `\`
- Use raw strings `r"..."` in Rust test assertions when testing Windows-style paths with backslashes

## queries.ts: Never use inline import type in file body — use api.TypeName instead

When appending new TanStack Query hooks to `queries.ts`, do NOT add inline `import type { SomeType } from './tauri'` statements inside the file body. The file already has `import * as api from './tauri'` at the top. TypeScript's `noUnusedLocals` strict mode (TS6133/TS6192) flags body-level import type statements as errors when the imported type is only used in a return type position that TypeScript infers from the `api.*` wrapper call.

**Wrong (causes TS6133):**
```typescript
import type { OnboardingConfig } from './tauri';
export const useGsd2WriteOnboardingConfig = (...) => {
  return useMutation<..., api.WriteResult, OnboardingConfig>(...)
```

**Correct:**
```typescript
export const useGsd2WriteOnboardingConfig = (...) => {
  return useMutation<..., api.WriteResult, api.OnboardingConfig>(...)
```

All types from tauri.ts are accessible as `api.TypeName` — no additional imports needed in queries.ts.

## pnpm install --frozen-lockfile is required in new worktrees before build/test

Git worktrees created by GSD do NOT have `node_modules`. The KNOWLEDGE.md entry above describes using a symlink. An alternative that avoids the symlink is running `pnpm install --frozen-lockfile` from within the worktree directory — this installs all packages (590 packages, ~4s) without modifying `pnpm-lock.yaml`. Both approaches work; the symlink is faster for repeated runs but `--frozen-lockfile` is cleaner for CI-like environments where you want an isolated install.

## Radix Checkbox state is read via data-state="checked", not .checked

Radix UI's `<Checkbox>` component does NOT behave like a native HTML checkbox. It overrides the native element and sets a custom `data-state` attribute instead of the standard `.checked` property.

**Wrong (will always be false):**
```typescript
expect(checkbox).toBeChecked() // fails — native .checked is not set
```

**Correct:**
```typescript
expect(checkbox).toHaveAttribute('data-state', 'checked')
```

This applies to all Radix `@radix-ui/react-checkbox` usages. The `data-state` attribute is always "checked" or "unchecked".

## Avoid closure-in-loop pattern in sequential React test steps

When writing tests that must navigate through multi-step flows (e.g., an onboarding wizard), avoid defining step-action closures in an array and executing them in a loop. The closures capture stale references to screen objects that were valid when the closure was defined but may be stale by the time the loop executes them.

**Wrong (closures capture stale screen):**
```typescript
const steps = [
  async () => { await screen.findByText('Step 1'); ... },
  async () => { await screen.findByText('Step 2'); ... }, // may execute before step 2 renders
];
for (const step of steps) { await act(step); }
```

**Correct (inline sequential calls):**
```typescript
// Step 1
await act(async () => { fireEvent.click(screen.getByText('Next →')); });
// Step 2 — screen is now fresh
await act(async () => { expect(screen.getByText('Step 2')).toBeInTheDocument(); });
```

Each `await act(async () => {...})` call flushes React state updates before the next closure executes, ensuring the screen reference is current.

## gsd2-sessions and gsd2-maintenance are GSD Section views, not Diagnostics

When extending the project nav-rail with new GSD-2 workflow views, insert them in the `GSD` section (alongside gsd2-tasks, gsd2-slices) — not in the `Diagnostics` section (doctor, forensics, skill-health). Session browsing and maintenance are workflow utilities, not diagnostic tools. The `projectViews` array in `src/lib/project-views.ts` uses group labels to separate sections.

## SessionBrowserEntry has no is_thread_session field

The `SessionBrowserEntry` TypeScript interface (from `src/lib/tauri.ts`) and the `SessionCard` component do NOT have an `is_thread_session` field or "Thread" badge feature. The M003 plan mentioned thread sessions but the actual Rust struct and TS type were never extended to include this. Do not write tests expecting a Thread badge — the field does not exist on the type.

## BSD sed \U uppercase escape is silently broken — use awk for camelCase

The slice plan wiring audit uses `sed -r 's/_([a-z])/\U\1/g'` to convert snake_case command names to camelCase. This works on GNU/Linux sed but **silently fails on macOS BSD sed** — the `\U` is not supported and is treated as a literal backslash-U, producing corrupted output like `gsd2UgetUhealth` instead of `gsd2GetHealth`.

**Correct BSD-compatible awk alternative:**
```bash
camel=$(echo "$cmd" | awk -F_ '{out=$1; for(i=2;i<=NF;i++){out=out toupper(substr($i,1,1)) substr($i,2)} print out}')
```

Any CI/wiring-audit script that needs snake_case → camelCase on macOS must use awk (or a short Python/Node one-liner).

## gsd2_headless_start_with_model returns void, not session ID

Unlike `gsd2_headless_start` (which returns `String` — the session ID), `gsd2_headless_start_with_model` returns `()` (void). Do not try to use the mutation return value as a session ID. Instead, recover the session ID after the mutation resolves by calling `gsd2HeadlessGetSession` — the same mount-effect pattern the headless tab already uses. This asymmetry exists because `gsd2_headless_start_with_model` was added later and follows a fire-and-check pattern rather than a create-and-return pattern.

## TypeScript narrowing inside {isIdle && ...} blocks rejects 'running' status check

If you need to check `status === 'running'` inside a `{isIdle && ...}` JSX conditional, TypeScript's control-flow narrowing will reject it because `isIdle` being true implies `status` cannot be `'running'`. Fix by hoisting the check before the conditional:

```tsx
const isRunning = status === 'running';  // evaluated before narrowing
// ...
{isIdle && (
  <Button disabled={isRunning}>Start with Model</Button>
)}
```

## Clean Stale vs Merge/Remove: confirmation dialog threshold

In the worktrees tab, "Clean Stale" (bulk operation on all stale worktrees) intentionally has **no confirmation dialog** — it operates only on stale/already-finished worktrees. The per-row "Merge" and "Remove" buttons both require AlertDialog confirmation because they mutate live worktrees by name. If extending with new bulk operations, apply the same heuristic: bulk-on-stale = no dialog, destructive-by-name = dialog.

## getByText fails when fixture data reuses the same string across multiple fields

When a test fixture assigns the same model name (e.g., `"claude-opus-4-5"`) to multiple config fields (e.g., both `orchestrator` and `large`), `getByText("claude-opus-4-5")` throws "Found multiple elements with the text". Switch to `getAllByText("claude-opus-4-5")` and assert `.length >= 1`. This is common in settings/config panels where multiple roles share the same default model. The same pattern applies to any panel that renders the same string in multiple output locations.

## gsd2_get_settings token redaction: only expose token_configured bool over IPC

The `gsd2_get_settings` command NEVER returns the actual keychain token over the IPC bridge — only `token_configured: bool`. The TypeScript `RemoteQuestionsConfig` interface reflects this: `token: undefined` (absent), `token_configured: boolean`. The UI reads `token_configured` to show "Configured"/"Not configured" status. The only time a token crosses the IPC bridge is in the write direction via `gsd2_save_remote_token`. Future commands that access credentials must follow the same bool-exposure pattern for read paths.

## Collapsible UI without shadcn/Collapsible: useState + conditional render is sufficient

The shadcn/ui `Collapsible` primitive is not installed by default. For collapsible sections in settings or config panels, `useState<boolean>` with `{expanded && <Content />}` plus a ChevronDown/ChevronUp icon toggle is a lightweight equivalent. No new dependency required. Only install `@radix-ui/react-collapsible` (the shadcn primitive's backing) if you need animation or advanced ARIA roles — plain useState handles the common case fine.

## Task summary files are sufficient to reconstruct code when git branch is gone

When a git branch has been deleted from all local and remote repositories, `.gsd/milestones/*/slices/*/tasks/*-SUMMARY.md` files contain sufficient detail (exact field names, function signatures, struct shapes, test cases) to reconstruct code that is functionally identical to what git merge would have produced. During M004/S01, the entire M003-k8v2px branch (~2,900 lines of new Rust code + 133 lines of TypeScript) was reconstructed exclusively from task summary files. No information was lost.

**Implication:** Task summaries are not just documentation — they are recovery artifacts. Write them with enough precision to serve as a code reconstruction source.

## pnpm install --frozen-lockfile required in each fresh worktree

Git worktrees do not share node_modules with the main checkout. Any build, test, or lint command run in a fresh worktree will fail with module-not-found errors until `pnpm install --frozen-lockfile` is run. This should be the first command in any worktree setup step. Omitting it is a common source of confusing build failures that look like import errors or TypeScript path issues.

## Phantom-validated requirements: prior "validated" status does not mean code exists

M002 documented R015 and R016 as "validated" (settings panels). However, M004 discovery confirmed the code never existed on any branch — the worktree was lost before merge. When planning a milestone, do not assume prior-milestone "validated" requirements have code in the repository. Always grep or ls to confirm. Requirements can have ghost validation that needs real implementation.

## R034 wiring architecture: three distinct patterns for integrating feature components

When wiring a feature component into the nav-rail project layout, choose the appropriate pattern:
1. **Overlay** (UpdateBanner, OnboardingWizard): Rendered outside and above `<ViewRenderer>`, conditional on `isGsd2` or similar guard. Always visible regardless of active view.
2. **ViewRenderer case** (SessionBrowser, MaintenanceTab, SettingsPanel): Full-panel view. Add a `case 'view-id':` in the ViewRenderer switch and a nav entry in `project-views.ts`.
3. **Embedded** (ExportPanel): Inserted inside an existing view component (e.g., gsd2-visualizer-tab.tsx) because it contextually belongs with that data. No separate nav entry needed.

Future gsd-2 feature additions should choose based on: "Is this always-on context? (overlay)" vs "Is this a top-level destination? (ViewRenderer)" vs "Is this a sub-feature of an existing view? (embedded)".

## Command registration lifecycle in lib.rs: deregister superseded commands, keep function bodies

When Tauri commands become superseded (e.g., replaced by a more capable variant), remove them from `generate_handler![]` in lib.rs to prevent dead IPC surface — but keep the function bodies in gsd2.rs if Rust unit tests reference them. Attempting to remove the bodies will break `cargo test`. The 6 pre-existing dead_code warnings in M004 are intentional and stable; suppress them with `#[allow(dead_code)]` only if the warning count becomes a signal-to-noise problem.

## Settings IPC: credential read paths must return only bool, never credential value

For any command that reads stored secrets (OS keychain, env vars, config files with tokens): return only a `bool` (e.g., `token_configured: bool`) over the IPC bridge. Never serialize the actual credential into the response struct. The write path may accept credentials as input but must never echo them in return values or log them. This is an architectural constraint, not just a logging hygiene concern — a TS type that includes a token field creates accidental exposure risk even if the value is currently empty.

## Light theme uses `.light {}` CSS class selector, NOT `:root`

The ThemeProvider adds a `light` class to `<html>` when light theme is active. The CSS variable block for light mode must be `.light {}` inside `@layer base` — NOT `:root {}`. Using `:root {}` would apply those variables regardless of the active theme class, overriding dark-mode variables for users who never selected light. The existing `.dark {}` block is the authoritative pattern to mirror.

## Theme type union — "light" was missing until M005/S01

Before M005/S01, the `Theme` type in `src/hooks/use-theme.ts` was `"dark" | "system"` only. Both `getInitialTheme()` in theme-provider.tsx and the `getSettings()` useEffect guard silently rejected `"light"` and fell back to dark. Future additions to the theme system must update BOTH guard conditions, not just the type union, or users will silently get the wrong theme.

## Light mode status/semantic color calibration: -600/-700 dark:-400 pattern

Raw Tailwind `-400` palette colors are tuned for dark backgrounds (~60% contrast on dark, < 3:1 on white). For light mode: use `text-{color}-600 dark:text-{color}-400` for most colors. For yellow/amber specifically use `text-yellow-700 dark:text-yellow-400` — yellow-600 is only ~2.1:1 on white (fails WCAG AA), yellow-700 achieves ~3.5:1 (passes AA for large/bold text). The exception for small `-500` indicators (e.g., GSD-2 `▶`): `text-yellow-600 dark:text-yellow-500`.

## Status color lightness shift between dark and light mode: ~16 percentage points

Dark mode status colors sit at 52–68% HSL lightness (bright enough to pop on near-black backgrounds). Light mode status colors shift to 36–50% lightness (darker, to maintain legibility on white). When adding new status tokens in the future, follow this 16% shift rule between `.dark {}` and `.light {}` blocks.

## --terminal-bg and --terminal-fg were undefined until M005/S01

`card.tsx`'s `variant="terminal"` referenced `--terminal-bg` and `--terminal-fg` but these tokens were never defined in the `.dark {}` block. Terminal cards were transparent/invisible in dark mode. M005/S01/T01 added them to both `.dark {}` (0 0% 4% / 0 0% 95%) and `.light {}` (240 5.9% 96% / 240 5.9% 10%). Any future CSS variable referenced in a component must be defined in BOTH blocks.

## `pnpm build` chunk size warnings are pre-existing — scoped to S05

The `vendor-markdown` chunk (1,282 kB) produces a chunk size warning on every build. This is a known pre-existing issue targeted by M005/S05 (Bundle Optimization via selective highlight.js imports). Do not treat this warning as a failure in S01–S04 or S06 — it is expected and will be fixed in S05.

## Shimmer skeleton: remove bg-muted when switching from animate-pulse

The `.animate-shimmer` CSS class supplies its own gradient background using `hsl(var(--muted))` and `hsl(var(--muted-foreground) / 0.1)` tokens via the `background` shorthand. If `bg-muted` (or any background class) remains on the skeleton element, it masks the gradient and the shimmer becomes invisible. Always remove the Tailwind background utility when applying `.animate-shimmer`.

## CSS animation registration: globals.css AND tailwind.config.js are both required

Custom animation classes defined only in globals.css will work for the specific keyframe but Tailwind JIT will purge them from the production bundle if they're not also registered in `tailwind.config.js` under `theme.extend.keyframes` and `theme.extend.animation`. Always add new animation keyframes to both files. The authoritative pattern is established in S03: shimmer and stagger-in registered in both.

## View crossfade: key={activeView} on wrapper div, not on ViewRenderer

The fade-in crossfade on project view navigation works by placing `key={activeView}` on the wrapper div (the one with `animate-fade-in`). This forces React to unmount/remount the div on every view switch, restarting the keyframe. Placing `key` on the ViewRenderer component itself doesn't work because ViewRenderer has no animation class. The terminal view must remain OUTSIDE this keyed wrapper (always mounted via CSS hide/show) to preserve xterm.js sessions.

## S04: Component Sweep Pattern — Icon Tint Removal at Scale

When systematically removing decorative icon colors across dozens of files (dashboard, projects, project/ components):

1. **Classify uses upfront** — distinguish functional (stars, progress bars, active indicators, links, semantic status colors) from decorative (card header icons, empty state icons). The classification rules (D032/D033/D038 for M007) are the authority.

2. **Icon tint removal is purely CSS** — no logic changes. Use sed for multi-line patterns or Edit for surgical single-file changes. No behavioral risk, only visual.

3. **Empty state neutralization pattern** — `bg-gsd-cyan/10 text-gsd-cyan` becomes `bg-muted text-muted-foreground` universally for "no data" states across pages, panels, and components. This is consistent enough to establish as a pattern.

4. **Status color segregation** — Functional status colors (in_progress, success, error, warning) remain in their semantic map entries; secondary-tier priorities (e.g., MoSCoW "could") migrate to their own semantic color (e.g., bg-status-info for blue). This keeps status meaning tied to color intent, not just visual highlight.

5. **Design system path resolution** — When a hardcoded gsd-cyan value on a button/interactive element can't be removed entirely (because it serves a functional purpose like active state), migrate from hardcoded `bg-gsd-cyan text-black` to design-system tokens `bg-primary text-primary-foreground`. This maintains the same visual result today while decoupling from the specific color value — future theme changes won't break the token resolution.

6. **Terminal/CLI edit tools — use sed for multi-instance patterns** — The Edit tool's oldText matching is precise but can fail if surrounding context has similar lines. For cases where you need to replace the same pattern N times in one file (e.g., project-terminal-tab.tsx with 2 active-button instances), sed's line-based substitution is safer than trying to construct unique oldText anchors.

## S04: Design Tokens as the First Domino

Changes to `design-tokens.ts` cascade across 38+ component files that import status color classes or badge variants from that file. Updating design-tokens.ts first (T01) ensures that all downstream components (T02, T03) can reference clean, neutral values without residual cyan tinting baked into the token-driven defaults. This is why T01 had to complete before T02/T03 could verify correctly.

## S04: Verification Across File Groups is Non-Trivial

The slice verification spans 4 distinct component hierarchies (dashboard/, projects/, knowledge/, project/), each with its own functional-use expectations. Verification commands must be written carefully:

- `grep -c 'gsd-cyan' file.tsx` checks for exact zero count — useful for broad neutralization
- `rg 'pattern' file.tsx | grep -v "keep_pattern"` excludes functional uses — needed when the file has both decorative and functional cyan
- `rg 'bg-gradient|shadow-md' dir/` across multiple dirs needs anchoring — the directory structure must be correct

A single wrong verification command (misplaced characters, missing quotes) can produce false positives that block a slice from completing. Always test verification commands manually first before committing them to the plan.

## aria-current pattern: use undefined not false for inactive nav items

When adding `aria-current` to nav buttons, use `aria-current={isActive ? "page" : undefined}` — NOT `aria-current={isActive ? "page" : false}`. Setting `aria-current={false}` renders `aria-current="false"` in the DOM, which is technically valid but confusing to screen readers and a lint smell. Setting it to `undefined` causes React to omit the attribute entirely for inactive items, which is the correct ARIA spec pattern.

## ARIA landmark nesting: nav inside aside is correct, do not add role="navigation" to aside

The sidebar `<aside>` has implicit role `complementary`. The `<nav>` inside it carries `role="navigation"`. Do NOT add `role="navigation"` to the `<aside>` — this would override its complementary role and break any test or screen reader expectation using `getByRole("complementary")`. Nesting a named `<nav>` inside `<aside>` is valid ARIA and produces both landmarks independently.

## highlight.js selective import: `highlight.js/lib/core` + explicit language registrations cuts 900 KB

The full `import hljs from 'highlight.js'` bundles all 192 languages (~1.2 MB). Switching to `import hljs from 'highlight.js/lib/core'` and importing only the required language modules cuts the bundle to ~360 KB.

**Key requirements:**
1. Import from `highlight.js/lib/core` (not `highlight.js`)
2. Import each language: `import javascript from 'highlight.js/lib/languages/javascript'`
3. Register each: `hljs.registerLanguage('javascript', javascript)`
4. `highlightAuto()` is NOT available on the core bundle — replace any `hljs.highlightAuto(code).value` fallback with `return code` (core's `getLanguage()` guard handles the else branch)
5. Languages `hcl` and `solidity` do NOT exist in highlight.js — map `tf` to `'ini'` and drop `sol` (falls to `'plaintext'`)
6. `noUnusedLocals: true` enforces that every imported language variable must appear in a `registerLanguage()` call — missing one is a compile error, not a silent bug

**Verification:** `pnpm build 2>&1 | grep vendor-markdown` — size drops below 500 KB raw.

## M005 Cross-Cutting Lessons: Light Theme, Animations, Bundle Optimization

### Light theme calibration is harder than implementing dark mode

Status colors designed for dark backgrounds (~52-68% lightness) produce invisible or illegible text on white. The calibration pattern that emerged: shift semantic colors down ~16 percentage points (to 36-50% lightness) for light mode. Yellow/amber colors are especially tricky — yellow-600 is only ~2.1:1 contrast on white (fails WCAG AA), yellow-700 achieves ~3.5:1 (passes AA for large text only). Future color additions should be tested in both themes from day one, not retrofitted.

### CSS animation registration requires two files: globals.css AND tailwind.config.js

A keyframe animation defined only in `globals.css` works during dev but Tailwind JIT purges it from the production bundle if it's not also registered in `tailwind.config.js` under `theme.extend.keyframes` and `theme.extend.animation`. Missing either side causes silent no-ops. The pattern: define `@keyframes shimmer { ... }` in globals.css, then add `shimmer: { ... }` to both `theme.extend.keyframes` (keyframe definition) and `theme.extend.animation` (utility class definition) in tailwind.config.js.

### prefers-reduced-motion must include opacity:1 for animations starting from opacity:0

The `prefers-reduced-motion` block in globals.css must include `opacity: 1 !important` alongside `animation: none !important` for any animation that starts from `opacity: 0` (e.g., stagger-in). Without it, content is permanently hidden for users with motion preferences enabled — the animation is suppressed but the initial opacity:0 remains. This is a critical accessibility pattern that's easy to miss during visual testing.

### Toast placement matters: put toast.success first in onSuccess, not last

Placing `toast.success` as the first statement in a mutation's `onSuccess` callback (before `queryClient.invalidateQueries`) ensures the toast fires even if cache invalidation throws. This is a defensive pattern for mutation feedback reliability — cache operations can fail in edge cases (network interruptions, race conditions) and users should still see success confirmation if the backend accepted the mutation.

### highlight.js tree-shaking requires core import + selective language registration

Importing the full `highlight.js` package pulls all 192 languages (1.2 MB uncompressed) and bypasses Rollup's tree-shaking entirely. The tree-shakeable pattern: `import hljs from 'highlight.js/lib/core'` + individual imports like `import typescript from 'highlight.js/lib/languages/typescript'` + `hljs.registerLanguage('typescript', typescript)`. Also remove any corresponding `manualChunks` entry for `'highlight.js'` — otherwise Rollup redundantly bundles the full module.

### Dead-code triage pattern in Rust: item-level #[allow(dead_code)] for test-only, deletion for zero callers

When resolving Rust dead-code warnings: items used exclusively by unit tests get `#[allow(dead_code)]` at item level (struct or fn), not file-level `#![allow(dead_code)]`. Items with zero callers anywhere (confirmed by codebase-wide grep) should be deleted outright. Deletion is the strongest signal code is not needed; suppression implies "intentionally kept for test coverage." File-level suppression masks future regressions.

### Test count verification when --testPathPattern doesn't work in worktrees

`pnpm test -- --testPathPattern="pattern"` fails to find tests in worktree files when run from the main repo root (vitest resolves paths from main `src/`, not worktree path). Use `pnpm test` (full suite) and verify by test count delta (e.g., 143 → 146 = 3 new tests). The full suite run does pick up worktree tests through git worktree path resolution.

### Terminal token gap: --terminal-bg/--terminal-fg must be in BOTH .dark {} and .light {} blocks

card.tsx's `variant="terminal"` references `--terminal-bg` and `--terminal-fg` but these were never defined before M005/S01. Terminal cards were transparent in both themes. When adding new CSS variable tokens, they must be defined in BOTH `.dark {}` and `.light {}` blocks — CSS variables are not inherited across theme class scopes. Missing tokens produce invisible/broken components in the undefine theme.

### Tailwind dark: variant for palette colors is not automatic — must be applied manually

Even after adding a complete `.light {}` CSS variable block, hardcoded Tailwind palette colors like `text-green-400` or `text-yellow-500` will produce inadequate contrast in light mode because Tailwind's palette values are fixed, not theme-aware. Every instance must be manually updated to `text-green-600 dark:text-green-400` (or equivalent). The `dark:` variant is opt-in, not automatic.

### Stagger animation delay cap prevents infinite accumulation on large lists

When implementing stagger-in entrance animations on list items, always cap the delay: `animationDelay: Math.min(index * 50, 1000)ms`. Without the cap, item 100 would have a 5-second delay (unusable). The 1000ms cap means items beyond position 20 all enter at the same time — acceptable trade-off for large lists.

### view crossfade requires key={activeView} on wrapper div, not ViewRenderer

For smooth view crossfades on project navigation: place `key={activeView}` on the wrapper div (the one with `animate-fade-in`), not on the `ViewRenderer` component. React remounts the keyed div on every view change, restarting the fade-in keyframe. The terminal view must be OUTSIDE this wrapper (always-mounted via CSS hide/show) to preserve xterm.js sessions.

### HTML-generating Rust code requires r##"..."## raw strings — not r#"..."#

Any Rust raw string template that contains HTML `href="#section"` attributes or JavaScript `querySelector('.toc a[href="#"+id]')` patterns contains the `"#` sequence (double-quote followed by hash), which prematurely terminates `r#"..."#` single-hash raw string delimiters. **Always use `r##"..."##` double-hash delimiters** for HTML/CSS/JS template constants in gsd2.rs. Using single-hash delimiters causes a compile error that only appears when the affected string is evaluated, not where the raw string literal begins — the error message points to an unexpected token far from the actual problem.

### section_html() helper pattern: section IDs appear as string args, not template attributes

The `generate_html_report_string` function delegates to a `section_html(id: &str, title: &str, body: &str) -> String` helper that wraps content in `<section id="...">` tags. Because the ID is a runtime argument rather than a hard-coded attribute, `grep 'section id=.summary'` won't find it. The correct audit grep is: `grep -o 'section_html("[a-z]*"' gsd2.rs | sort -u`. This pattern is cleaner (avoids repeating the boilerplate per section) but requires a non-obvious grep to enumerate all sections during verification.

### epoch_to_date() via Howard Hinnant's calendar algorithm for timestamp formatting without chrono

When needing to format Unix epoch milliseconds as human-readable dates in gsd2.rs without adding the chrono crate: the Howard Hinnant calendar algorithm converts epoch-seconds to (year, month, day) in ~15 lines of integer arithmetic. Divide epoch_ms by 1000 to get seconds, apply the algorithm, then extract hour/min/sec from `seconds % 86400`. This is the established pattern in gsd2.rs (function: `fn epoch_to_date(epoch_ms: i64) -> (i32, u32, u32, u32, u32, u32)`).

### VisualizerMilestone2.status uses 'done' not 'complete' — check Rust struct field names when porting

When porting visualizer components from gsd-2 web (TypeScript) to VibeFlow (Rust+TS), milestone terminal state in VibeFlow's Rust backend is serialized as the string `"done"`, not `"complete"`. All status comparisons in frontend components must use `status === 'done'` not `status === 'complete'`. Similarly, slice and task status use `"done"` as the terminal state. This mismatch is a common source of status indicators rendering incorrectly in ported code.

### Kahn's BFS for critical path: verify by_phase is exposed in VisualizerData2

The `gsd2_get_visualizer_data` Rust command returned `by_phase` via `let _ = by_phase_raw` in the initial S01 implementation (discarding the value). S02 T01 caught this and added `by_phase: Vec<PhaseAggregate>` to the VisualizerData2 struct and exposed it in the command return. When expanding large structs, always grep for `let _ =` assignments after implementation — they silently drop computed values that may be needed downstream.

### cargo test returning "0 tests" is expected for Tauri binary crates

Running `cargo test --manifest-path src-tauri/Cargo.toml` on a Tauri app returns `0 passed; 0 failed` because Tauri app tests require the full Tauri runtime context. This is not a test regression — the correct build verification is `cargo build` (exits 0) + `pnpm build` (exits 0 with zero TypeScript errors). Unit tests for Tauri commands are typically run via integration test harness, not standard cargo test.

### Large milestone scope risks partial delivery — cap to ~3-5 slices per execution cycle

M008 targeted 9 slices. Only 3 were executed. The data layer (S01) and two major surfaces (S02, S03) were completed in one cycle. Six slices representing interactive features (chat, files, command panels, dashboard, onboarding, integration) were planned but not executed. For future milestones, cap scope to what can realistically be completed: a foundation slice + 2-3 surface slices is a sustainable cycle. Use explicit phase milestones (e.g., "Feature Parity — Data Layer", "Feature Parity — Interactive Surfaces") instead of one large milestone covering the full scope.

### Backend-first sequencing eliminates frontend blockers

S01 (10 Rust commands) was completed before S02 (visualizer) and S03 (reports). As a result, S02 and S03 had no backend blockers — all required data was available via typed Tauri invoke calls. This backend-first sequencing pattern should be maintained: build all data commands in one slice, then build UI slices that consume them in parallel without waiting for each other.

### by_phase field ordering in VisualizerData2 — expose before by_slice for logical grouping

When adding fields to VisualizerData2 struct, place `by_phase` before `by_slice` in the struct definition. Phase-level aggregation is a higher-level summary than slice-level; this ordering matches the logical hierarchy and is how the Metrics tab displays data (phase breakdown above slice table).

## M006 Cross-Cutting Lessons: Interactive Surfaces

### Parser-in-useRef pattern for PTY-to-React streaming

When subscribing a stateful parser (like PtyChatParser) to a PTY event stream:
1. Create the parser once in `useRef` (not useState — avoids re-renders on creation)
2. Subscribe `parser.onMessage((msg) => setMessages(prev => updateOrAppend(prev, msg)))` in the same effect
3. Wire to `onPtyOutput(sessionId, (event) => parser.feed(decode(event.data)))` in `useEffect([sessionId])`
4. Call `parser.reset()` and `setMessages([])` when sessionId changes (new session)
5. Unlisten on cleanup

This is the canonical pattern for any PTY-to-React streaming component. The `updateOrAppend` helper matches by message ID for streaming updates vs new message detection.

### FileBrowser wrapper pattern: key= for root switch

When building a view that needs to show a different directory in an existing file browser (e.g., project root vs .gsd/), wrap the existing component and pass `key={activePath}`. This forces React to unmount/remount the component on path change, resetting its internal state (selected file, scroll position, etc.) cleanly. No need to modify the existing component.

### All command panels in one file with shared helpers

When building many similar panels (8 in this case), put them all in one file with shared PanelWrapper, PanelLoading, PanelError, PanelEmpty components. Each panel is then ~30-50 lines of data-rendering code. This avoids 8-file proliferation and makes the shared UI contract obvious.

### Local setInterval + useState for live elapsed time

For a status bar or live counter that must update every 1 second without over-fetching: compute elapsed from a start timestamp using a local `setInterval` + `useState`. The interval runs on its own 1s tick, completely decoupled from TanStack Query's polling interval. Pattern: `useEffect([startMs]) → setInterval(tick, 1000) → clearInterval cleanup`.

### DualTerminalTab: InteractiveTerminal directly, not global terminal context

Two side-by-side terminal panels for a "split terminal" view should use InteractiveTerminal directly (not the global terminal context/registry). The global context is for the main project terminal tabs that persist across navigation. Split-view sessions are ephemeral and independent — they don't need broadcast mode, persistence across view navigation, or the tmux reconnect infrastructure.

### Always grep the actual codebase before assuming prior art exists

S05 was planned to "extend the existing onboarding wizard" but no wizard existed. The M003 wizard in KNOWLEDGE.md referred to the gsd-2 CLI project, not VibeFlow. Always run `grep -rn 'feature-name'` in the actual target codebase before writing a plan that extends existing code.
