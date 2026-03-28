# Phase 3: Worktrees Panel - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a "Worktrees" tab inside the GSD-2 tab group on the project detail page. The tab lists all active git worktrees for the project, shows a per-worktree diff summary (files added/modified/removed vs main), and allows safe removal (git worktree remove + branch delete). GSD-1 projects are unaffected.

</domain>

<decisions>
## Implementation Decisions

### Tab Placement
- Worktrees tab is the SECOND tab in the GSD-2 sub-tab set: Health → **Worktrees** → Milestones → Slices → Tasks
- Always visible for GSD-2 projects — not conditional on whether worktrees exist (consistent navigation, empty state handles zero-worktree case)

### List Row Display
- Each row shows: name, branch, path, and file change counts loaded eagerly
- File change counts format: `+N added · M modified · K removed` (counts computed upfront for all worktrees on tab load)
- Counts come from the same `gsd2_list_worktrees` response (or a lightweight parallel call) — not deferred to expand

### Diff Display
- Clicking a row expands it inline (accordion/expandable pattern) — no navigation away, no modal
- Expanded section shows three groups: **Added** (green), **Modified** (yellow), **Removed** (red), each listing filenames
- Full file list loads lazily on row expand (not upfront) — only file counts are loaded eagerly in the row
- No inline line diffs — filenames only

### Remove Confirmation
- Remove button is always visible per row (not hover-only) — clear and discoverable
- Clicking Remove opens an alert dialog showing: "Remove [worktree-name]? This will delete the worktree and branch [branch-name]." with Cancel / Remove buttons
- After successful removal: optimistic update — row disappears immediately from list; if command fails, row reappears with an error toast
- Remove calls `gsd2_remove_worktree` (git worktree remove + branch delete)

### Empty State
- When no worktrees exist: centered message — "No active worktrees — GSD-2 creates these automatically when running parallel slices."
- No illustration, no action buttons, no hint commands

### Claude's Discretion
- Exact Tailwind styling for the expanded diff section (colors, spacing, icon choice for file status)
- Whether to use a single `gsd2_list_worktrees` command that returns counts, or a separate `gsd2_get_worktree_diff` for expanded details
- Alert dialog component choice (existing shadcn AlertDialog or custom)
- Error toast implementation (likely already exists in the app)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Frontend — Project Page and Tab Structure
- `src/pages/project.tsx` — GSD-2 tab group (lines ~240–270); add Worktrees tab between Health and Milestones
- `src/components/project/tab-group.tsx` — TabGroup component pattern used for sub-tabs
- `src/components/project/gsd2-health-tab.tsx` — Reference for a GSD-2-specific tab component structure

### Frontend — Reusable UI
- `src/components/project/git-status-widget.tsx` — Reference layout for a git-flavored info card
- `src/components/ui/badge.tsx` — Badge component for branch name display
- `src/lib/tauri.ts` — invoke wrapper pattern; add `gsd2ListWorktrees`, `gsd2RemoveWorktree`, `gsd2GetWorktreeDiff` here
- `src/lib/queries.ts` — React Query hooks; add `useGsd2Worktrees` and `useGsd2WorktreeDiff` here
- `src/lib/query-keys.ts` — Query key factory; add `gsd2.worktrees(projectId)` and `gsd2.worktreeDiff(projectId, name)` keys

### Rust Backend
- `src-tauri/src/commands/gsd2.rs` — Add `gsd2_list_worktrees`, `gsd2_remove_worktree`, `gsd2_get_worktree_diff` here
- `src-tauri/src/commands/git.rs` — Reference for existing git command patterns (worktree byte parsing at lines ~59–67, ~369–377)
- `src-tauri/src/commands/watcher.rs` — `.gsd/worktrees/` already excluded from watcher events (lines ~73–75)

### Requirements
- `.planning/REQUIREMENTS.md` — WORK-01 through WORK-05 (all in scope for this phase)

### GSD-2 Worktree Structure
- Worktrees live at `.gsd/worktrees/<name>/` with `worktree/<name>` branches (per PROJECT.md)
- `std::fs::canonicalize` required on paths to handle macOS /var → /private/var symlink (WORK-02)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `TabGroup` (`src/components/project/tab-group.tsx`) — Add Worktrees tab entry in project.tsx GSD-2 tab array, same pattern as Health tab
- `gsd2-health-tab.tsx` — Use as template for the new `gsd2-worktrees-tab.tsx` component structure
- `git-status-widget.tsx` — Reference for a compact git info widget layout
- `Badge` component — For branch name display in each row
- Existing alert dialog (shadcn `AlertDialog`) — For the remove confirmation

### Established Patterns
- GSD-2 tabs: `isGsd2 && <TabGroup tabs={[...]} />` in project.tsx — add Worktrees tab at index 1 (after Health)
- Tauri IPC: `invoke<T>("gsd2_command", { projectId })` → React Query hook → component
- Rust command: `#[tauri::command] async fn gsd2_list_worktrees(project_id: i64, pool: State<Arc<DbPool>>) -> Result<Vec<WorktreeInfo>, String>`
- Optimistic updates: useMutation + queryClient.setQueryData pattern (check existing usages in queries.ts)

### Integration Points
- `src/pages/project.tsx` — Insert Worktrees tab at position 1 in GSD-2 tab array
- `src-tauri/src/commands/gsd2.rs` — Three new commands: list, remove, get_diff
- `src-tauri/src/lib.rs` — Register new commands in invoke_handler! macro
- `src/lib/tauri.ts` — Three new invoke wrappers + `WorktreeInfo` / `WorktreeDiff` TypeScript types

</code_context>

<specifics>
## Specific Ideas

- The diff section groups files by status (Added / Modified / Removed) — same grouping model as a git status output, presented as a clean list
- Optimistic removal: row disappears immediately on confirm click, error toast if Rust command fails

</specifics>

<deferred>
## Deferred Ideas

- Inline diff viewer (line-by-line diffs per file) — noted as v2 requirement WORK-06 in REQUIREMENTS.md
- LLM-guided merge — explicitly out of scope (gsd-2's job per PROJECT.md)

</deferred>

---

*Phase: 03-worktrees-panel*
*Context gathered: 2026-03-21*
