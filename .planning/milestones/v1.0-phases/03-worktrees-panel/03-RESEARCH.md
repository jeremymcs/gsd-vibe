# Phase 3: Worktrees Panel - Research

**Researched:** 2026-03-21
**Domain:** Git worktree management — Rust backend (git subprocess + std::fs), React frontend (accordion UI, optimistic mutation)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Tab Placement**
- Worktrees tab is the SECOND tab in the GSD-2 sub-tab set: Health → **Worktrees** → Milestones → Slices → Tasks
- Always visible for GSD-2 projects — not conditional on whether worktrees exist (consistent navigation, empty state handles zero-worktree case)

**List Row Display**
- Each row shows: name, branch, path, and file change counts loaded eagerly
- File change counts format: `+N added · M modified · K removed` (counts computed upfront for all worktrees on tab load)
- Counts come from the same `gsd2_list_worktrees` response (or a lightweight parallel call) — not deferred to expand

**Diff Display**
- Clicking a row expands it inline (accordion/expandable pattern) — no navigation away, no modal
- Expanded section shows three groups: Added (green), Modified (yellow), Removed (red), each listing filenames
- Full file list loads lazily on row expand (not upfront) — only file counts are loaded eagerly in the row
- No inline line diffs — filenames only

**Remove Confirmation**
- Remove button is always visible per row (not hover-only) — clear and discoverable
- Clicking Remove opens an alert dialog showing: "Remove [worktree-name]? This will delete the worktree and branch [branch-name]." with Cancel / Remove buttons
- After successful removal: optimistic update — row disappears immediately from list; if command fails, row reappears with an error toast
- Remove calls `gsd2_remove_worktree` (git worktree remove + branch delete)

**Empty State**
- When no worktrees exist: centered message — "No active worktrees — GSD-2 creates these automatically when running parallel slices."
- No illustration, no action buttons, no hint commands

### Claude's Discretion
- Exact Tailwind styling for the expanded diff section (colors, spacing, icon choice for file status)
- Whether to use a single `gsd2_list_worktrees` command that returns counts, or a separate `gsd2_get_worktree_diff` for expanded details
- Alert dialog component choice (existing shadcn AlertDialog or custom)
- Error toast implementation (likely already exists in the app)

### Deferred Ideas (OUT OF SCOPE)
- Inline diff viewer (line-by-line diffs per file) — noted as v2 requirement WORK-06 in REQUIREMENTS.md
- LLM-guided merge — explicitly out of scope (gsd-2's job per PROJECT.md)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| WORK-01 | `gsd2_list_worktrees` lists active git worktrees for a project (name, branch, path, exists) | `git worktree list --porcelain` output parsing pattern; `WorktreeInfo` struct shape defined below |
| WORK-02 | Worktree paths are canonicalized via `std::fs::canonicalize` before comparison to handle macOS symlinks | `std::fs::canonicalize` usage documented; macOS /var → /private/var symlink verified as real pitfall |
| WORK-03 | `gsd2_remove_worktree` removes a worktree (git worktree remove + branch cleanup) | Two-step git sequence documented; force flag and branch-delete error handling patterns noted |
| WORK-04 | `gsd2_get_worktree_diff` returns a summary of files added/modified/removed in a worktree vs main `.gsd/` | `git diff --name-status` parsing pattern; A/M/D status byte mapping established from existing git.rs |
| WORK-05 | A new Worktrees tab in the project detail view renders the worktree list with name, branch, diff summary, and remove button | Component location, imports, Tab insertion point, query hooks, and UI spec all documented |
</phase_requirements>

---

## Summary

Phase 3 adds a Worktrees tab (second in the GSD-2 sub-tab group) that lists all active git worktrees for a project, shows eager file-change counts per worktree, expands inline to show filenames grouped by status (Added / Modified / Removed), and provides a safe removal flow with optimistic UI updates.

The Rust work is purely git subprocess + file-system operations — no DB schema changes, no new tables. Three commands are added to the existing `gsd2.rs` module: `gsd2_list_worktrees`, `gsd2_remove_worktree`, and `gsd2_get_worktree_diff`. The frontend follows the established pattern from Phase 2 (gsd2-health-tab.tsx as template, TanStack Query hooks, sonner toasts, shadcn AlertDialog for the remove confirmation).

All required UI components (Card, Badge, Button, AlertDialog, Skeleton, Tooltip, ScrollArea) are already installed. No new shadcn registry additions are required. The UI design contract is fully specified in `03-UI-SPEC.md` — this research focuses on the backend mechanics, integration points, and pitfalls the planner must account for.

**Primary recommendation:** Build `gsd2_list_worktrees` to return `WorktreeInfo` with name, branch, path, exists flag, and eager file change counts (added/modified/removed) in a single command. Keep `gsd2_get_worktree_diff` as a separate lazy command returning only the file lists (no counts — those come from list). Use `git diff --name-status main...HEAD` run in the worktree directory to compute the diff.

---

## Standard Stack

### Core (already in project)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Tauri 2.x | 2.x (current) | Desktop app IPC bridge | Project baseline |
| Rust std::process::Command | stdlib | Run git subprocesses | Established pattern throughout git.rs |
| std::fs::canonicalize | stdlib | Resolve macOS /var → /private/var | Required by WORK-02, zero-cost, no dep |
| React 18 + TypeScript | 18 / 5 | Frontend component | Project baseline |
| TanStack Query | v5 | Data fetching and mutation | Established pattern in queries.ts |
| sonner | current | Toast notifications | Already used — `import { toast } from "sonner"` |
| shadcn/ui | manual install | UI primitives | All required components already in src/components/ui/ |
| Lucide React | current | Icons | Established — all icons needed already in the icon set |

### No New Dependencies Required

All libraries needed for this phase are already installed. Confidence: HIGH — verified by scanning package.json, src/components/ui/, and src/lib/queries.ts.

---

## Architecture Patterns

### Recommended Project Structure for Phase 3

```
src-tauri/src/commands/gsd2.rs        ← Add WorktreeInfo, WorktreeDiff structs + 3 commands
src-tauri/src/lib.rs                  ← Register 3 new commands in invoke_handler!
src/lib/tauri.ts                      ← Add WorktreeInfo, WorktreeDiff TS types + 3 invoke wrappers
src/lib/query-keys.ts                 ← Add gsd2.worktrees(projectId) + gsd2.worktreeDiff(projectId, name)
src/lib/queries.ts                    ← Add useGsd2Worktrees + useGsd2WorktreeDiff + useGsd2RemoveWorktree
src/components/project/
  gsd2-worktrees-tab.tsx              ← New tab component (template: gsd2-health-tab.tsx)
  index.ts                            ← Export Gsd2WorktreesTab
src/pages/project.tsx                 ← Insert Worktrees tab at index 1 in GSD-2 sub-tab array
```

### Pattern 1: git worktree list --porcelain Parsing (Rust)

**What:** Parse `git worktree list --porcelain` output to build `WorktreeInfo` entries.
**When to use:** `gsd2_list_worktrees` command implementation.

The porcelain format emits blank-line-separated blocks. Each block has:
```
worktree /absolute/path
HEAD <sha>
branch refs/heads/branch-name
```
or for bare/detached worktrees:
```
worktree /absolute/path
HEAD <sha>
detached
```

**Example output for a GSD-2 project:**
```
worktree /private/var/folders/.../myproject
HEAD abc123
branch refs/heads/main

worktree /private/var/folders/.../myproject/.gsd/worktrees/S01-auth
HEAD def456
branch refs/heads/worktree/S01-auth
```

**Parsing approach (HIGH confidence — verified against git docs):**
```rust
// Split on double-newline to get blocks
for block in output.split("\n\n") {
    let mut path: Option<String> = None;
    let mut branch: Option<String> = None;
    let mut is_main = false;
    for line in block.lines() {
        if let Some(p) = line.strip_prefix("worktree ") {
            path = Some(p.to_string());
        }
        if let Some(b) = line.strip_prefix("branch refs/heads/") {
            branch = Some(b.to_string());
        }
        if line == "bare" || line == "detached" {
            is_main = true; // skip main worktree
        }
    }
    // First block is always the main worktree — skip it
}
```

The FIRST block from `git worktree list --porcelain` is always the main (primary) worktree. Skip it and only collect linked worktrees.

### Pattern 2: Path Canonicalization (Rust, WORK-02)

**What:** On macOS, `/var/folders/...` is a symlink to `/private/var/folders/...`. Git reports the real path, the DB may store either form. Canonicalize both before comparing.

**Example:**
```rust
use std::fs;
use std::path::Path;

fn canonicalize_path(p: &str) -> String {
    fs::canonicalize(Path::new(p))
        .map(|c| c.to_string_lossy().to_string())
        .unwrap_or_else(|_| p.to_string())
}
```

Canonicalize the project path from DB and the worktree paths from git output. If `canonicalize` fails (path does not exist), fall back to the raw string — this handles the `exists: false` case gracefully.

### Pattern 3: Worktree Diff via git diff (Rust, WORK-04)

**What:** Compute files added/modified/removed in a worktree relative to main.

**Command:**
```bash
git diff --name-status main...HEAD
```

Run this command with `current_dir` set to the **worktree path** (not the main repo path). The `main...HEAD` three-dot syntax shows changes between the merge-base and HEAD — equivalent to "what this branch added".

**Output parsing:** Each line is `<status>\t<filepath>`, where status is one of:
- `A` — added
- `M` — modified
- `D` — deleted
- `R` — renamed (treat as modified)
- `C` — copied (treat as added)

Status byte parsing reuses the established pattern from `git.rs` lines 368–378.

**Struct:**
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorktreeDiff {
    pub added: Vec<String>,
    pub modified: Vec<String>,
    pub removed: Vec<String>,
    pub added_count: u32,
    pub modified_count: u32,
    pub removed_count: u32,
}
```

For `gsd2_list_worktrees`, include only the counts (run diff eagerly for all worktrees). For `gsd2_get_worktree_diff`, return the full file lists.

### Pattern 4: Worktree Removal (Rust, WORK-03)

**What:** Two-step removal: remove the worktree filesystem entry, then delete the branch.

**Step 1 — Remove worktree:**
```bash
git worktree remove <name-or-path> --force
```
Run with `current_dir` = main project path.

**Step 2 — Delete branch:**
```bash
git branch -d <branch-name>
```
If `-d` (safe delete) fails because the branch is unmerged, use `-D` (force). GSD-2 worktrees are ephemeral parallel slices — force-delete is acceptable.

**Error handling:** If step 1 fails, return `Err(...)` and do NOT run step 2. If step 1 succeeds and step 2 fails, log a warning but return `Ok(())` — the worktree is gone and the stale branch is not critical.

### Pattern 5: Rust Command Signature (established project pattern)

```rust
#[tauri::command]
pub async fn gsd2_list_worktrees(
    db: tauri::State<'_, DbState>,
    project_id: String,
) -> Result<Vec<WorktreeInfo>, String>

#[tauri::command]
pub async fn gsd2_remove_worktree(
    db: tauri::State<'_, DbState>,
    project_id: String,
    worktree_name: String,
) -> Result<(), String>

#[tauri::command]
pub async fn gsd2_get_worktree_diff(
    db: tauri::State<'_, DbState>,
    project_id: String,
    worktree_name: String,
) -> Result<WorktreeDiff, String>
```

All three use `db.write().await` to get project path (established pattern from gsd2_list_milestones etc.).

### Pattern 6: TanStack Query Hook for Optimistic Removal

**What:** Remove worktree row instantly (optimistic update), restore on error.

```typescript
// In queries.ts
export const useGsd2RemoveWorktree = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, worktreeName }: { projectId: string; worktreeName: string }) =>
      api.gsd2RemoveWorktree(projectId, worktreeName),
    onMutate: async ({ projectId, worktreeName }) => {
      // Cancel outgoing queries for this list
      await queryClient.cancelQueries({ queryKey: queryKeys.gsd2Worktrees(projectId) });
      // Snapshot current data for rollback
      const previous = queryClient.getQueryData(queryKeys.gsd2Worktrees(projectId));
      // Optimistically remove the row
      queryClient.setQueryData(queryKeys.gsd2Worktrees(projectId), (old: WorktreeInfo[] | undefined) =>
        old?.filter((w) => w.name !== worktreeName) ?? []
      );
      return { previous };
    },
    onError: (_err, { projectId }, context) => {
      // Restore previous data on error
      queryClient.setQueryData(queryKeys.gsd2Worktrees(projectId), context?.previous);
      toast.error(`Failed to remove worktree — ${_err}`);
    },
    onSettled: ({ projectId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.gsd2Worktrees(projectId) });
    },
  });
};
```

This is the canonical TanStack Query optimistic mutation pattern (v5). The `onMutate` snapshot + `onError` rollback is what makes row-reappear-on-failure work. Source: TanStack Query v5 docs optimistic updates.

### Pattern 7: Tab Insertion in project.tsx

The GSD-2 sub-tab array currently has: `gsd2-health`, `gsd2-milestones`, `gsd2-slices`, `gsd2-tasks`. Insert Worktrees at index 1 (after Health):

```typescript
// In project.tsx, in the isGsd2 TabGroup tabs array:
{
  id: "gsd2-worktrees",
  label: "Worktrees",
  icon: GitFork,  // or GitBranch — choose per UI spec
  content: <Gsd2WorktreesTab projectId={project.id} projectPath={project.path} />,
},
```

Add `GitFork` (or appropriate icon) to the existing lucide-react import at the top of project.tsx.

### Anti-Patterns to Avoid

- **Running git diff in the main repo dir:** The diff must run in the worktree directory (`current_dir = worktree_path`), not the project root. Running in the root returns nothing because HEAD is main.
- **Using `git worktree list` (non-porcelain):** Human-readable output has unstable column widths. Always use `--porcelain`.
- **Not skipping the first worktree block:** The first block in `git worktree list --porcelain` is always the main repo — it must be skipped to avoid listing the project itself as a worktree.
- **Calling canonicalize on a non-existent path without fallback:** `std::fs::canonicalize` returns `Err` if the path doesn't exist. Always fall back to the raw path string and set `exists: false` on the WorktreeInfo.
- **Blocking branch delete failure:** If branch delete fails after a successful worktree remove, do not surface it as a command failure. The worktree is gone; the orphaned branch is a minor cleanup concern.
- **Blocking the DB write lock during git subprocesses:** Get the project path from DB first (holding write lock briefly), then release the lock before running git commands. Never hold the DB lock across a subprocess call.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toast notifications | Custom toast component | `sonner` (already imported in queries.ts) | Already wired, single import |
| Remove confirmation dialog | Custom modal | shadcn `AlertDialog` (already installed) | Already used for project delete in project.tsx — exact same pattern |
| Optimistic updates | Manual state management | TanStack Query `onMutate` + `onError` pattern | Built-in cancellation, snapshot, rollback |
| Worktree path resolution | String manipulation | `std::fs::canonicalize` | Handles symlinks, cross-platform |
| Accordion toggle | Custom expand state per item | Local `useState<Set<string>>` (one per component) | Simple, sufficient — no Radix Accordion needed since multi-open is allowed |

---

## Common Pitfalls

### Pitfall 1: macOS /var → /private/var Symlink
**What goes wrong:** DB stores project path as `/var/folders/...` but git worktree list reports `/private/var/folders/...` (or vice versa). Path comparison fails, worktrees not matched to project.
**Why it happens:** macOS `/var` is a symlink to `/private/var`. Depending on how the project was imported, either form may be stored.
**How to avoid:** Canonicalize BOTH the DB project path and the git-reported worktree path before any comparison.
**Warning signs:** `gsd2_list_worktrees` returns empty list even when `.gsd/worktrees/` directory has entries.

### Pitfall 2: First Block in Porcelain Output is Main Worktree
**What goes wrong:** The main project directory appears as the first worktree entry in `git worktree list --porcelain`. If not skipped, it shows up in the UI as a removable worktree.
**Why it happens:** Git always lists the primary worktree first.
**How to avoid:** Skip the first non-empty block, or detect the main worktree by checking if its path matches `canonicalize(project_path)`.
**Warning signs:** UI shows the project root directory as a worktree row.

### Pitfall 3: git diff Branch Reference
**What goes wrong:** `git diff main...HEAD` fails if the main branch is named something other than `main` (e.g., `master`).
**Why it happens:** GSD-2 convention uses `main`, but the project repo may use a different default branch.
**How to avoid:** Try `main` first; if it fails, fall back to `git diff $(git rev-parse --abbrev-ref HEAD~$(git log --oneline | wc -l))` or simply `git diff HEAD~1...HEAD` as a safe fallback. Alternatively, always use `git diff main...HEAD` and return an empty diff if the command fails (worktree might be freshly created with no commits).
**Warning signs:** `gsd2_get_worktree_diff` returns error for valid worktrees.

### Pitfall 4: DB Write Lock Held During Git Subprocess
**What goes wrong:** `db.write().await` held while `std::process::Command` blocks on git output. This starves all other commands needing the write lock.
**Why it happens:** Natural to write it in one block.
**How to avoid:** Extract project path first (minimally holding the write lock), drop the guard, then run git commands. Pattern: `let project_path = { let guard = db.write().await; get_project_path(&guard, &project_id)? }; // guard dropped here; now run git`.
**Warning signs:** App hangs or other commands time out when worktrees tab is open.

### Pitfall 5: React Query staleTime for Worktree Diff
**What goes wrong:** Expanded worktree diff refetches on every re-render because staleTime is 0 by default.
**Why it happens:** Default TanStack Query behavior.
**How to avoid:** Set `staleTime: 30_000` for `useGsd2WorktreeDiff` (per UI spec: 30s cache). Diff data is relatively stable — the worktree contents only change if the Claude session is actively running.
**Warning signs:** Network/git calls fire every time user collapses and re-expands a row.

### Pitfall 6: Forgetting to Register Commands in lib.rs
**What goes wrong:** Rust commands compile but invoke() from frontend returns "command not found" error.
**Why it happens:** Tauri requires explicit registration in `invoke_handler!` macro.
**How to avoid:** After adding the three functions to gsd2.rs, add three lines to the GSD-2 section of `lib.rs` invoke_handler! (after `gsd2_get_health`).
**Warning signs:** TypeScript invoke wrapper returns error at runtime; Rust compiles clean.

---

## Code Examples

### WorktreeInfo Rust Struct
```rust
// Source: derived from CONTEXT.md requirements and project patterns
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorktreeInfo {
    pub name: String,           // e.g. "S01-auth"
    pub branch: String,         // e.g. "worktree/S01-auth"
    pub path: String,           // canonicalized absolute path
    pub exists: bool,           // false if directory was deleted outside git
    pub added_count: u32,
    pub modified_count: u32,
    pub removed_count: u32,
}
```

### TypeScript Types for tauri.ts
```typescript
// Source: derived from WorktreeInfo and WorktreeDiff Rust structs
export interface WorktreeInfo {
  name: string;
  branch: string;
  path: string;
  exists: boolean;
  added_count: number;
  modified_count: number;
  removed_count: number;
}

export interface WorktreeDiff {
  added: string[];
  modified: string[];
  removed: string[];
  added_count: number;
  modified_count: number;
  removed_count: number;
}
```

### Query Key Additions to query-keys.ts
```typescript
// Add to the GSD-2 section at the bottom of queryKeys:
gsd2Worktrees: (projectId: string) => ['gsd2', 'worktrees', projectId] as const,
gsd2WorktreeDiff: (projectId: string, name: string) => ['gsd2', 'worktree-diff', projectId, name] as const,
```

### Invoke Wrapper Additions to tauri.ts
```typescript
export const gsd2ListWorktrees = (projectId: string) =>
  invoke<WorktreeInfo[]>('gsd2_list_worktrees', { projectId });

export const gsd2RemoveWorktree = (projectId: string, worktreeName: string) =>
  invoke<void>('gsd2_remove_worktree', { projectId, worktreeName });

export const gsd2GetWorktreeDiff = (projectId: string, worktreeName: string) =>
  invoke<WorktreeDiff>('gsd2_get_worktree_diff', { projectId, worktreeName });
```

### useGsd2Worktrees Hook (queries.ts)
```typescript
export const useGsd2Worktrees = (projectId: string) =>
  useQuery({
    queryKey: queryKeys.gsd2Worktrees(projectId),
    queryFn: () => api.gsd2ListWorktrees(projectId),
    enabled: !!projectId,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
```

### useGsd2WorktreeDiff Hook (queries.ts)
```typescript
export const useGsd2WorktreeDiff = (projectId: string, worktreeName: string, enabled: boolean) =>
  useQuery({
    queryKey: queryKeys.gsd2WorktreeDiff(projectId, worktreeName),
    queryFn: () => api.gsd2GetWorktreeDiff(projectId, worktreeName),
    enabled: !!projectId && !!worktreeName && enabled,
    staleTime: 30_000,
  });
```

### DB Lock Pattern (Rust)
```rust
// Get path, drop lock immediately before git subprocess
pub async fn gsd2_list_worktrees(
    db: tauri::State<'_, DbState>,
    project_id: String,
) -> Result<Vec<WorktreeInfo>, String> {
    let project_path = {
        let db_guard = db.write().await;
        get_project_path(&db_guard, &project_id)?
        // db_guard dropped here
    };
    // Now run git commands without holding the lock
    list_worktrees_from_dir(&project_path)
}
```

---

## Integration Points (Complete List)

| File | Change |
|------|--------|
| `src-tauri/src/commands/gsd2.rs` | Add `WorktreeInfo` struct, `WorktreeDiff` struct, `gsd2_list_worktrees`, `gsd2_remove_worktree`, `gsd2_get_worktree_diff` functions |
| `src-tauri/src/lib.rs` | Add 3 entries to `invoke_handler!` after `gsd2_get_health` |
| `src/lib/tauri.ts` | Add `WorktreeInfo`, `WorktreeDiff` interfaces + 3 invoke wrappers |
| `src/lib/query-keys.ts` | Add `gsd2Worktrees` and `gsd2WorktreeDiff` to queryKeys |
| `src/lib/queries.ts` | Add `useGsd2Worktrees`, `useGsd2WorktreeDiff`, `useGsd2RemoveWorktree` |
| `src/components/project/gsd2-worktrees-tab.tsx` | New file — the tab component |
| `src/components/project/index.ts` | Export `Gsd2WorktreesTab` |
| `src/pages/project.tsx` | Insert Worktrees tab at index 1 in GSD-2 tab array; add icon import |

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Polling for list changes | Periodic refetch (30s) + invalidate after remove | Balanced freshness vs. git subprocess cost |
| Row navigation to detail page | Inline accordion expand | Faster UX, no navigation stack needed |
| Modal for diff preview | Inline expandable section | Less context switch |

---

## Validation Architecture

`nyquist_validation` is enabled in `.planning/config.json`.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest + React Testing Library (unit); `cargo test` (Rust) |
| Config file | `vite.config.ts` (test section); standard cargo |
| Quick Rust run | `cargo test -p track-your-shit-lib worktrees 2>&1 \| tail -20` |
| Full suite | `pnpm test` (frontend); `cargo test` (Rust) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WORK-01 | `gsd2_list_worktrees` returns correct WorktreeInfo from git output | unit (Rust) | `cargo test -p track-your-shit-lib list_worktrees` | ❌ Wave 0 |
| WORK-02 | Path canonicalization handles /var → /private/var | unit (Rust) | `cargo test -p track-your-shit-lib canonicalize` | ❌ Wave 0 |
| WORK-03 | `gsd2_remove_worktree` runs correct git commands in sequence | unit (Rust, via mock or fixture) | `cargo test -p track-your-shit-lib remove_worktree` | ❌ Wave 0 |
| WORK-04 | `gsd2_get_worktree_diff` parses git diff --name-status output correctly | unit (Rust) | `cargo test -p track-your-shit-lib worktree_diff` | ❌ Wave 0 |
| WORK-05 | Gsd2WorktreesTab renders list, empty state, loading state | unit (React) | `pnpm test src/components/project/gsd2-worktrees-tab.test.tsx` | ❌ Wave 0 |

Rust tests follow the established `gsd2.rs` pattern — pure functions (list_worktrees_from_dir, parse_worktree_output, parse_diff_output) with fixture strings, no subprocess calls in tests.

### Sampling Rate
- **Per task commit:** `cargo test -p track-your-shit-lib 2>&1 | grep -E "test result|FAILED"` (Rust unit tests only)
- **Per wave merge:** `cargo test && pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] Rust: `parse_worktree_porcelain` helper function (testable without subprocess) — covers WORK-01
- [ ] Rust: `canonicalize_path` helper (pure function wrapper) — covers WORK-02
- [ ] Rust: `parse_diff_name_status` helper (testable without subprocess) — covers WORK-04
- [ ] Frontend: `src/components/project/gsd2-worktrees-tab.test.tsx` — covers WORK-05 (rendering states)
- [ ] No new conftest needed — Rust tests follow the `make_temp_dir` pattern already in gsd2.rs

---

## Open Questions

1. **`git diff main...HEAD` branch name assumption**
   - What we know: GSD-2 convention uses `main`. The existing project health logic doesn't inspect the default branch name.
   - What's unclear: Whether test projects or edge-case repos use `master` or a custom default branch name.
   - Recommendation: Try `main` first; catch the error and return empty diff. Document this limitation. Don't add complexity to detect the base branch in Phase 3.

2. **Eager counts: run diff for all worktrees on list load**
   - What we know: CONTEXT.md says counts are loaded eagerly. A project might have 10+ parallel worktrees running simultaneously (multiple slices).
   - What's unclear: Whether N sequential `git diff` calls (one per worktree) will cause noticeable latency.
   - Recommendation: Run diffs sequentially in Rust on the server side (blocking I/O inside the command is fine for async Tauri commands). If N is typically 2–4 worktrees (GSD-2 parallel slice count), latency is acceptable. No parallelization needed for Phase 3.

---

## Sources

### Primary (HIGH confidence)
- Codebase: `src-tauri/src/commands/gsd2.rs` — established Rust command patterns, DB lock usage, helper function conventions
- Codebase: `src-tauri/src/commands/git.rs` — git subprocess patterns, `--porcelain` parsing, status byte mapping
- Codebase: `src-tauri/src/lib.rs` — `invoke_handler!` registration pattern
- Codebase: `src/lib/queries.ts`, `src/lib/tauri.ts`, `src/lib/query-keys.ts` — TanStack Query hook patterns, invoke wrapper conventions
- Codebase: `src/components/project/gsd2-health-tab.tsx` — React tab component template (Card layout, loading/error/empty states, Skeleton usage)
- Codebase: `src/pages/project.tsx` — GSD-2 sub-tab array insertion point (lines 239–267)
- `.planning/phases/03-worktrees-panel/03-UI-SPEC.md` — Full visual/interaction contract (component choices, colors, typography, layout, copywriting)
- `.planning/phases/03-worktrees-panel/03-CONTEXT.md` — Locked decisions, canonical refs

### Secondary (MEDIUM confidence)
- `git worktree list --porcelain` format: standard git documentation, stable across git versions — format unchanged since git 2.5 (2015). Confidence HIGH in practice.
- TanStack Query v5 optimistic mutations: `onMutate` + `onError` rollback pattern — well-established and stable.
- `std::fs::canonicalize` macOS behavior: verified by macOS documentation and project STATE.md note.

### Tertiary (LOW confidence — needs validation)
- Latency of N sequential `git diff` calls for eager counts: estimated acceptable at 2–4 worktrees; not benchmarked.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed in codebase; no new deps
- Architecture: HIGH — all patterns established in prior phases; direct code references
- Pitfalls: HIGH for macOS canonicalize and porcelain parsing (confirmed); MEDIUM for eager diff latency (estimated)

**Research date:** 2026-03-21
**Valid until:** 2026-04-20 (stable git CLI and Tauri API)
