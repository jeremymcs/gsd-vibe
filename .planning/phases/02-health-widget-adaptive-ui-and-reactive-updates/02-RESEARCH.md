# Phase 2: Health Widget, Adaptive UI, and Reactive Updates - Research

**Researched:** 2026-03-20
**Domain:** Tauri 2.x (Rust) + React 18 + TanStack Query — GSD-2 health data pipeline, adaptive tab rendering, version badge integration
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Health Widget Placement**
- New "Health" sub-tab inside the existing GSD tab group (not on Overview tab)
- Health is the FIRST sub-tab and default landing for GSD-2 projects
- Health tab is only visible for GSD-2 projects (`gsd_version === 'gsd2'`) — hidden entirely for GSD-1 projects

**Health Data Display**
- Budget displayed as a progress bar with dollar amounts: "spent / ceiling" using the existing `formatCost()` utility
- Blockers displayed as a prominent highlighted row with an alert icon (red/amber style) — row is hidden entirely when no blocker exists
- Empty state when no health data: show message "No health data yet — run a GSD-2 session to populate metrics." (no skeleton, no hiding the tab)

**Adaptive Terminology — GSD-2 vs GSD-1 Sub-tabs**
- GSD-2 projects get an entirely different set of sub-tabs — the GSD-1 sub-tabs (Plans, Context, Verification, UAT, Validation, Debug) are hidden entirely
- GSD-2 sub-tab set (in order): Health, Milestones, Slices, Tasks
- GSD-1 sub-tab set: unchanged — Plans, Context, Todos, Validation, UAT, Verification, Milestones, Debug
- `gsd_version` field added to `ProjectWithStats` TypeScript interface and exposed from Rust `get_project` / `get_projects_with_stats` commands — the project page reads `project.gsd_version` to decide which tab set to render

**Version Badges on Project Cards**
- Badge goes in the tech stack row alongside framework/language badges (existing Row 4 in project-card.tsx)
- GSD-2 projects show a "GSD-2" badge; GSD-1 projects show a "GSD-1" badge
- Non-GSD projects (`gsd_version === 'none'` or null) show NO badge — clean omission
- Same badge treatment on the dashboard project cards

### Claude's Discretion
- Exact badge color/variant for GSD-1 vs GSD-2 (suggest distinct colors: GSD-2 gets a standout color like subtle-cyan, GSD-1 gets a neutral muted variant)
- Health widget layout details (grid vs stack, exact spacing)
- Env error/warning count display format within the health widget
- ETA display format (relative time vs absolute)
- Active milestone/slice/task display (just IDs or include titles)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| HLTH-01 | `gsd2_get_health` returns budget spent, budget ceiling (if set), environment error count, environment warning count, active milestone/slice/task, phase, blocker (if any), ETA (if available), and next action | metrics.json schema confirmed (cost per unit, no explicit ceiling field — ceiling comes from STATE.md); STATE.md structure confirmed (markdown-body sections, not frontmatter); parse approach documented below |
| HLTH-02 | Health data is read directly from `.gsd/STATE.md` frontmatter and `.gsd/metrics.json` (never via subprocess) | Confirmed: both files exist in real GSD-2 projects; parse_frontmatter helper already in gsd2.rs; metrics.json is plain JSON; serde_json::from_str works inline |
| HLTH-03 | A new Health tab renders health data with budget bar, env status, active unit display, and M/S/T progress counters | All UI primitives confirmed present: Progress (variant=warning/success), Badge (subtle-cyan, warning, error), formatCost(), formatRelativeTime(), Card pattern from git-status-widget.tsx |
| HLTH-04 | Health display auto-refreshes on `.gsd/` file changes (via watcher) and on a 10s polling interval | Watcher emits `gsd2:file-changed` (from Phase 1 VERS-04); TanStack Query refetchInterval supports 10000ms; useGsdFileWatcher pattern is the template for a new useGsd2FileWatcher hook |
| TERM-01 | Project detail tabs show "Milestones", "Slices", "Tasks" terminology for gsd2 projects | project.tsx already uses `hasPlanning` guard pattern; same conditional branch approach for `gsd_version === 'gsd2'`; existing GSD-2 commands gsd2_list_milestones / gsd2_get_milestone / gsd2_get_slice all exist from Phase 1 |
| TERM-02 | Project detail tabs show existing "Phases", "Plans", "Tasks" terminology for gsd1 projects (unchanged behavior) | GSD-1 tab set is fully implemented; change is purely additive — GSD-1 branch is the current `hasPlanning &&` block, no changes required |
| TERM-03 | Project list / dashboard cards show a "GSD-2" badge for gsd2 projects and "GSD-1" badge for gsd1 projects | gsd_version column confirmed in DB (migration `add_gsd_version_to_projects`); NOT yet in ProjectWithStats Rust model or TypeScript interface — must add to both; badge.tsx has subtle-cyan and secondary variants ready |
</phase_requirements>

---

## Summary

Phase 2 is a well-scoped extension of Phase 1's foundation. It adds one new Rust command (`gsd2_get_health`), exposes `gsd_version` through the project stats pipeline, builds a React health widget component, wires up reactive updates, and makes two surgical UI changes to existing components (adaptive GSD tab set + version badges on cards).

All required infrastructure exists. The database column (`gsd_version`) was added in Phase 1 migration. The file watcher already emits `gsd2:file-changed` events. The parsing helpers (`parse_frontmatter`) are already in `gsd2.rs`. The React Query pattern, TabGroup component, Badge component, Progress component, and utility functions (`formatCost`, `formatRelativeTime`) are all present and verified.

The primary gap is: `gsd_version` is stored in the DB and written at import time, but is NOT yet returned by `get_projects_with_stats` (SQL query reads columns 0–16, none of which is `gsd_version`) and NOT in the `ProjectWithStats` Rust struct or TypeScript interface. This field must be threaded through the entire data pipeline before any frontend conditional rendering can work.

**Primary recommendation:** Thread `gsd_version` through the data pipeline first (Rust model → SQL query → TypeScript interface), then add the Rust health command, then build the React components. These tasks form a dependency chain that must execute in order.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Tauri 2.x | 2.x | IPC bridge between Rust backend and React frontend | Project baseline |
| React 18 | 18.x | Frontend UI framework | Project baseline |
| TanStack Query | 5.x | Data fetching, caching, polling, invalidation | Project baseline |
| Rust serde_json | in Cargo.toml | Parse metrics.json inline | Already used throughout gsd2.rs |
| Rust serde | in Cargo.toml | Serialize/deserialize Rust structs to JSON for IPC | Project baseline |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tauri-apps/api/event `listen` | 2.x | Listen for `gsd2:file-changed` events from watcher | In useGsd2FileWatcher hook |
| lucide-react | current | Icons (Activity, AlertCircle, DollarSign, etc.) | Health widget icon set |
| shadcn/ui Progress | local | Budget progress bar | Health widget budget display |
| shadcn/ui Badge | local | GSD version badges on cards | Variants: subtle-cyan (GSD-2), secondary (GSD-1) |
| shadcn/ui Card | local | Health widget container | Match git-status-widget.tsx card layout |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| 10s polling via refetchInterval | Push-only via watcher events | Polling guarantees freshness even if watcher misses events on macOS |
| Read metrics.json in Rust (serde_json) | Shell out to `jq` | Shell subprocess violates HLTH-02; inline Rust parsing is fast and already proven |

**Installation:** No new packages required — all dependencies are already present.

---

## Architecture Patterns

### Recommended Project Structure

New files to create:
```
src/
├── components/project/
│   ├── gsd2-health-tab.tsx          # Health widget component (new)
│   ├── gsd2-milestones-tab.tsx      # GSD-2 milestones tab (new)
│   └── index.ts                     # Add new exports
src-tauri/src/commands/
└── gsd2.rs                          # Add gsd2_get_health command (existing file)
```

Files to modify:
```
src-tauri/src/
├── models/mod.rs                    # Add gsd_version to ProjectWithStats
├── commands/projects.rs             # Add gsd_version to SQL queries + row mapping
├── lib.rs                           # Register gsd2_get_health in invoke_handler
src/
├── lib/tauri.ts                     # Add gsd_version to ProjectWithStats interface, add gsd2GetHealth wrapper
├── lib/queries.ts                   # Add useGsd2Health hook
├── lib/query-keys.ts                # Add gsd2.health key
├── hooks/use-gsd-file-watcher.ts    # Extend to handle gsd2:file-changed events
├── pages/project.tsx                # Branch on gsd_version for GSD tab set
└── components/projects/project-card.tsx     # Add version badge in Row 4
    components/dashboard/project-card.tsx    # Add version badge
```

### Pattern 1: Threading gsd_version Through the Data Pipeline

**What:** `gsd_version` is in the DB but not in the return types. Must be added at 4 layers.

**Layer 1 — Rust model** (`src-tauri/src/models/mod.rs`):
```rust
// Add to ProjectWithStats struct
pub gsd_version: Option<String>,
```

**Layer 2 — SQL query** (`src-tauri/src/commands/projects.rs`, `get_projects_with_stats`):
```rust
// Add p.gsd_version to the SELECT (after last_activity_at, index 17)
"SELECT
    p.id, p.name, p.path, p.description, p.tech_stack, p.config, p.status,
    p.created_at, p.updated_at, COALESCE(p.is_favorite, 0),
    COALESCE(cost_agg.total_cost, 0),
    fp.total_phases, fp.completed_phases, fp.total_tasks, fp.completed_tasks, fp.status,
    (SELECT MAX(created_at) FROM activity_log WHERE project_id = p.id),
    p.gsd_version
FROM ..."

// Row mapping: add at index 17
let gsd_version: Option<String> = row.get(17)?;

// In Ok(ProjectWithStats { ... }) block:
gsd_version,
```

The same change applies to `get_project` (single project query) — add `p.gsd_version` and map it.

**Layer 3 — TypeScript interface** (`src/lib/tauri.ts`):
```typescript
export interface ProjectWithStats {
  // ...existing fields...
  gsd_version: string | null;  // "gsd2" | "gsd1" | "none" | null
}
```

**Layer 4 — Usage** (project.tsx, project-card.tsx, dashboard/project-card.tsx): read `project.gsd_version`.

### Pattern 2: Rust gsd2_get_health Command

**What:** New command in `src-tauri/src/commands/gsd2.rs`.

**Data sources (confirmed from real projects):**

1. `.gsd/metrics.json` — array of unit objects, each with `cost` (f64). Sum all `cost` fields for `budget_spent`. No explicit `budget_ceiling` in the file; ceiling comes from STATE.md body text or is absent.

2. `.gsd/STATE.md` — markdown file with NO YAML frontmatter (confirmed from 2 real projects). Data is in structured markdown sections:
   - `**Active Milestone:** M005 — title`
   - `**Active Slice:** None` or `S01 — title`
   - `**Phase:** complete`
   - `**Requirements Status:** ...`
   - `## Blockers` section followed by bullet list (or "- None")
   - `## Next Action` section
   - `## Milestone Registry` section

   **Key finding:** STATE.md uses markdown body sections, NOT YAML frontmatter. The existing `parse_frontmatter()` helper will NOT extract health fields. A dedicated STATE.md parser is needed.

**Return struct:**
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Gsd2Health {
    pub budget_spent: f64,
    pub budget_ceiling: Option<f64>,
    pub active_milestone_id: Option<String>,
    pub active_milestone_title: Option<String>,
    pub active_slice_id: Option<String>,
    pub active_slice_title: Option<String>,
    pub active_task_id: Option<String>,
    pub active_task_title: Option<String>,
    pub phase: Option<String>,
    pub blocker: Option<String>,
    pub next_action: Option<String>,
    // Progress counters (from derive_state_from_dir which is already implemented)
    pub milestones_done: u32,
    pub milestones_total: u32,
    pub slices_done: u32,
    pub slices_total: u32,
    pub tasks_done: u32,
    pub tasks_total: u32,
    // Env counts: parse from Requirements Status line or defaults to 0
    pub env_error_count: u32,
    pub env_warning_count: u32,
}
```

**STATE.md parsing approach:** Read body sections by searching for `## Blockers` heading. If line after heading is `- None`, blocker is None. Otherwise collect non-empty bullet lines. For active milestone/slice, parse `**Active Milestone:**` bold lines.

**metrics.json parsing approach:** `serde_json::from_str::<serde_json::Value>` on file contents, iterate `.units` array, sum each element's `.cost` as f64. Handle missing file gracefully (budget_spent = 0.0).

**Progress counters:** Reuse existing `derive_state_from_dir()` — it already does the filesystem walk and returns M/S/T counts. Call it for the progress fields to avoid duplicating logic.

**Command implementation:**
```rust
#[tauri::command]
pub async fn gsd2_get_health(
    db: tauri::State<'_, DbState>,
    project_id: String,
) -> Result<Gsd2Health, String> {
    let db_guard = db.write().await;
    let project_path = get_project_path(&db_guard, &project_id)?;
    Ok(get_health_from_dir(&project_path))
}

pub fn get_health_from_dir(project_path: &str) -> Gsd2Health {
    // 1. Sum costs from metrics.json
    // 2. Parse STATE.md body sections
    // 3. Call derive_state_from_dir() for M/S/T counts
    // 4. Merge into Gsd2Health
}
```

### Pattern 3: React Query Hook with 10s Polling + File Watcher Invalidation

**query-keys.ts** — add:
```typescript
gsd2Health: (projectId: string) => ['gsd2', 'health', projectId] as const,
```

**queries.ts** — add:
```typescript
export const useGsd2Health = (projectId: string, enabled = true) =>
  useQuery({
    queryKey: queryKeys.gsd2Health(projectId),
    queryFn: () => api.gsd2GetHealth(projectId),
    enabled: !!projectId && enabled,
    refetchInterval: 10_000,   // HLTH-04: 10-second polling
    staleTime: 5_000,
  });
```

**tauri.ts** — add TypeScript interface and invoke wrapper:
```typescript
export interface Gsd2Health {
  budget_spent: number;
  budget_ceiling: number | null;
  active_milestone_id: string | null;
  active_milestone_title: string | null;
  active_slice_id: string | null;
  active_slice_title: string | null;
  active_task_id: string | null;
  active_task_title: string | null;
  phase: string | null;
  blocker: string | null;
  next_action: string | null;
  milestones_done: number;
  milestones_total: number;
  slices_done: number;
  slices_total: number;
  tasks_done: number;
  tasks_total: number;
  env_error_count: number;
  env_warning_count: number;
}

export const gsd2GetHealth = (projectId: string) =>
  invoke<Gsd2Health>('gsd2_get_health', { projectId });
```

### Pattern 4: Extending the File Watcher for GSD-2 Events

The existing `useGsdFileWatcher` hook only listens to `gsd:file-changed`. For GSD-2, the watcher emits `gsd2:file-changed` (added in Phase 1, VERS-04). Two approaches:

**Option A (recommended):** Extend `useGsdFileWatcher` to accept an additional `onGsd2Change` callback and listen to both `gsd:file-changed` AND `gsd2:file-changed`. The `gsd2:file-changed` listener invalidates `queryKeys.gsd2Health(projectId)`.

**Option B:** Create a separate `useGsd2FileWatcher` hook. Cleaner separation but adds complexity.

For this phase, Option A minimizes surface area. The project page already calls `useGsdFileWatcher` — adding a second listener hook in the same component would require careful cleanup to avoid duplicate listeners.

Implementation addition to `useGsdFileWatcher`:
```typescript
// Add optional parameter
onGsd2HealthRefresh?: () => void

// Add second listener inside the effect:
listen<{ project_path: string }>('gsd2:file-changed', (event) => {
  if (event.payload.project_path !== projectPath) return;
  void queryClient.invalidateQueries({ queryKey: queryKeys.gsd2Health(projectId) });
  onGsd2HealthRefresh?.();
}).then((fn) => { unlisten2 = fn; });
```

### Pattern 5: Adaptive GSD Tab Set in project.tsx

**Current pattern:** `{hasPlanning && (<TabsContent value="gsd">...<TabGroup defaultTab="gsd-plans" tabs={[...GSD-1 tabs...]} /></TabsContent>)}`

**New pattern:** Branch on `gsd_version` inside the same GSD TabsContent:
```tsx
const isGsd2 = project.gsd_version === 'gsd2';
const isGsd1 = project.gsd_version === 'gsd1' || (hasPlanning && !isGsd2);

{(isGsd2 || isGsd1) && (
  <TabsTrigger value="gsd" className="gap-2">
    <CheckSquare className="h-4 w-4" />
    GSD
  </TabsTrigger>
)}

{/* In TabsContent value="gsd": */}
{isGsd2 && (
  <TabGroup
    defaultTab="gsd2-health"
    tabs={[
      { id: "gsd2-health", label: "Health", icon: Activity, content: <Gsd2HealthTab projectId={project.id} /> },
      { id: "gsd2-milestones", label: "Milestones", icon: Flag, content: <Gsd2MilestonesTab projectId={project.id} /> },
      // Slices and Tasks tabs TBD (these may reuse existing GSD-2 commands from Phase 1)
    ]}
  />
)}
{isGsd1 && (
  <TabGroup
    defaultTab="gsd-plans"
    tabs={[/* existing GSD-1 tabs unchanged */]}
  />
)}
```

**Key detail:** The existing `hasPlanning` guard currently controls both whether the GSD tab appears in the top-level tabs bar AND its content. For GSD-2, `project.gsd_version === 'gsd2'` is the guard — not `hasPlanning` (GSD-2 projects use `.gsd/` not `.planning/`, so `has_planning` may be false for them). The `gsd_version` field from the database is the authoritative source.

### Pattern 6: Version Badge on Project Cards

Both `src/components/projects/project-card.tsx` (Row 4) and `src/components/dashboard/project-card.tsx` need the badge.

**project-card.tsx Row 4** (already has framework/language badges in `<span className="text-xs bg-muted ...">` elements):
```tsx
{/* Add after git branch badge */}
{(project.gsd_version === 'gsd2' || project.gsd_version === 'gsd1') && (
  <Badge
    variant={project.gsd_version === 'gsd2' ? 'subtle-cyan' : 'secondary'}
    size="sm"
  >
    {project.gsd_version === 'gsd2' ? 'GSD-2' : 'GSD-1'}
  </Badge>
)}
```

**dashboard/project-card.tsx** — same badge, placed in the GSD live stats row or as a standalone chip near the project type badge in the header area.

### Anti-Patterns to Avoid

- **Calling `gsd2_derive_state` inside `gsd2_get_health` via IPC:** Call the `derive_state_from_dir()` helper directly inside `get_health_from_dir()`. Two IPC hops for one logical operation adds unnecessary latency.
- **Parsing STATE.md with `parse_frontmatter`:** STATE.md in real GSD-2 projects uses markdown body sections (bold `**Key:**` lines), not YAML frontmatter. The existing frontmatter parser will return an empty map.
- **Adding budget_ceiling to metrics.json search:** The metrics.json schema (version 1) only has `cost` per unit, no ceiling field. Ceiling must come from STATE.md body text (a `budget_ceiling:` line if present, or null).
- **Using `hasPlanning` as the GSD-2 guard:** GSD-2 projects set `.gsd/` not `.planning/`. `has_planning` (which detects `.planning/`) will be false for GSD-2 projects. Always use `gsd_version` from DB.
- **Mutating the GSD-1 tab set:** TERM-02 requires GSD-1 tabs to remain unchanged. The new code branch must be purely additive.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Budget progress bar | Custom div with width% | `<Progress variant="warning" />` | Already handles animation, accessibility, dark mode |
| Dollar formatting | Custom formatter | `formatCost()` in `src/lib/utils.ts` | Already used throughout the app, consistent format |
| Relative time formatting | Custom date logic | `formatRelativeTime()` in `src/lib/utils.ts` | Already present, handles edge cases |
| Polling + cache invalidation | Custom setTimeout | TanStack Query `refetchInterval: 10_000` | Race condition free, integrates with existing cache keys |
| File change listening | Custom fs polling | Tauri `listen('gsd2:file-changed', ...)` | Watcher already built in Phase 1 |
| Tab conditional rendering | Custom tab system | Existing `TabGroup` component with conditional `tabs` array | Handles active state, keyboard nav, styling |
| JSON cost aggregation | SQL aggregation | Inline Rust sum of metrics.json `cost` field | metrics.json is file-based, not in DB |

---

## Common Pitfalls

### Pitfall 1: STATE.md Has No YAML Frontmatter
**What goes wrong:** Developer passes STATE.md content to `parse_frontmatter()` expecting to get `active_milestone`, `blocker`, etc. — gets empty HashMap.
**Why it happens:** GSD-1 `.planning/STATE.md` uses YAML frontmatter. GSD-2 `.gsd/STATE.md` uses markdown body sections (`**Active Milestone:** M001 — Title`).
**How to avoid:** Write a dedicated `parse_gsd2_state_md()` function that searches for bold-key lines and heading sections.
**Warning signs:** All health fields return None/null despite STATE.md having data.

### Pitfall 2: gsd_version Missing from ProjectWithStats Breaks Conditional Rendering
**What goes wrong:** Frontend reads `project.gsd_version` but it's undefined because the Rust struct and TypeScript interface don't include it yet.
**Why it happens:** `gsd_version` is in the DB and written at import time, but the `get_projects_with_stats` SQL only selects columns 0–16 — `gsd_version` is not in the SELECT.
**How to avoid:** Add `p.gsd_version` to the SQL, add the field to `ProjectWithStats` Rust struct, and add to TypeScript interface — all three must happen together.
**Warning signs:** TypeScript type errors on `project.gsd_version`, or badges/tab sets don't render even for known GSD-2 projects.

### Pitfall 3: metrics.json Missing or Empty
**What goes wrong:** `gsd2_get_health` panics or errors when `.gsd/metrics.json` doesn't exist (project hasn't run a session yet).
**Why it happens:** metrics.json is only created when GSD-2 runs a task for the first time.
**How to avoid:** Treat missing/empty metrics.json gracefully — return `budget_spent: 0.0`. The empty state message ("No health data yet...") handles the UI.
**Warning signs:** Health command returns error for new GSD-2 projects.

### Pitfall 4: GSD Tab Trigger Not Shown for GSD-2 Projects
**What goes wrong:** GSD-2 project opens, no GSD tab in the top-level tab bar. Widget and adaptive tabs are unreachable.
**Why it happens:** Current code guards GSD tab on `hasPlanning` (detects `.planning/`). GSD-2 projects have `.gsd/` not `.planning/`, so `has_planning` is false.
**How to avoid:** Add a second condition: `const showGsdTab = hasPlanning || project.gsd_version === 'gsd2';` and use `showGsdTab` for the TabsTrigger guard.
**Warning signs:** GSD tab is invisible on GSD-2 projects.

### Pitfall 5: File Watcher Listener Leak
**What goes wrong:** Multiple `listen('gsd2:file-changed', ...)` calls accumulate without cleanup, causing duplicate health refreshes.
**Why it happens:** If the watcher listener is registered inside a useEffect without returning the unlisten function, each render adds a new listener.
**How to avoid:** Follow the exact cleanup pattern in `use-gsd-file-watcher.ts` — store the unlisten fn and call it in the effect cleanup return.

### Pitfall 6: Slices/Tasks Tabs for GSD-2 Need Existing Phase 1 Commands
**What goes wrong:** GSD-2 Milestones/Slices/Tasks tabs try to invoke GSD-1 commands (gsd_list_milestones) which now return explicit errors for GSD-2 projects (VERS-03).
**Why it happens:** The adaptive tab set for GSD-2 must use the new Phase 1 `gsd2_list_milestones`, `gsd2_get_milestone`, `gsd2_get_slice` commands — not the GSD-1 versions.
**How to avoid:** New GSD-2 tab components must import from the `gsd2*` invoke wrappers added in Phase 1. Do not reuse existing GSD-1 tab components.

---

## Code Examples

### metrics.json Real Schema (confirmed from production GSD-2 projects)
```json
{
  "version": 1,
  "projectStartedAt": 1773236234159,
  "units": [
    {
      "type": "execute-task",
      "id": "M001/S01/T01",
      "model": "claude-sonnet-4-6",
      "startedAt": 1773236234179,
      "finishedAt": 1773236477188,
      "tokens": { "input": 53, "output": 9544, "cacheRead": 2326223, "cacheWrite": 33532, "total": 2369352 },
      "cost": 0.9669309,
      "toolCalls": 0,
      "assistantMessages": 51,
      "userMessages": 0
    }
  ]
}
```
**Key fields:** `units[].cost` (f64) — sum all for `budget_spent`. No `budget_ceiling` in metrics.json — this comes from STATE.md or is absent.

### STATE.md Real Structure (confirmed from production GSD-2 projects)
```markdown
# GSD State

**Active Milestone:** M005 — End-to-End Testing
**Active Slice:** None
**Phase:** complete
**Requirements Status:** 11 active · 22 validated · 7 deferred · 1 out of scope

## Milestone Registry
- ✅ **M001:** Infrastructure & Correctness Hardening

## Recent Decisions
- None recorded

## Blockers
- None

## Next Action
All milestones complete.
```
**No YAML frontmatter.** Parse using line-by-line markdown section detection.

### Rust: Parse Costs from metrics.json
```rust
// Source: confirmed from real metrics.json schema above
fn sum_costs_from_metrics(project_path: &str) -> f64 {
    let metrics_path = Path::new(project_path).join(".gsd").join("metrics.json");
    let content = match std::fs::read_to_string(&metrics_path) {
        Ok(c) => c,
        Err(_) => return 0.0,
    };
    let json: serde_json::Value = match serde_json::from_str(&content) {
        Ok(v) => v,
        Err(_) => return 0.0,
    };
    json.get("units")
        .and_then(|u| u.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|unit| unit.get("cost").and_then(|c| c.as_f64()))
                .sum()
        })
        .unwrap_or(0.0)
}
```

### Rust: Parse STATE.md Body
```rust
// Source: confirmed from real STATE.md structure above
fn parse_gsd2_state_md(content: &str) -> (Option<String>, Option<String>, Option<String>, Option<String>) {
    // Returns (active_milestone, active_slice, phase, blocker, next_action)
    let mut active_milestone: Option<String> = None;
    let mut active_slice: Option<String> = None;
    let mut phase: Option<String> = None;
    let mut blocker: Option<String> = None;
    let mut in_blockers_section = false;
    let mut in_next_action_section = false;
    let mut next_action: Option<String> = None;

    for line in content.lines() {
        let trimmed = line.trim();

        // Handle section transitions
        if trimmed.starts_with("## ") {
            in_blockers_section = trimmed == "## Blockers";
            in_next_action_section = trimmed == "## Next Action";
            continue;
        }

        // Parse bold key lines: **Active Milestone:** M001 — Title
        if trimmed.starts_with("**Active Milestone:**") {
            let val = trimmed.trim_start_matches("**Active Milestone:**").trim();
            if val != "None" && !val.is_empty() {
                active_milestone = Some(val.to_string());
            }
        } else if trimmed.starts_with("**Active Slice:**") {
            let val = trimmed.trim_start_matches("**Active Slice:**").trim();
            if val != "None" && !val.is_empty() {
                active_slice = Some(val.to_string());
            }
        } else if trimmed.starts_with("**Phase:**") {
            let val = trimmed.trim_start_matches("**Phase:**").trim();
            if !val.is_empty() {
                phase = Some(val.to_string());
            }
        }

        // Blockers section: collect non-"None" bullet items
        if in_blockers_section && trimmed.starts_with("- ") {
            let val = trimmed[2..].trim();
            if val != "None" && !val.is_empty() {
                blocker = Some(val.to_string()); // use first blocker
                in_blockers_section = false;
            }
        }

        // Next Action section
        if in_next_action_section && !trimmed.is_empty() && !trimmed.starts_with('#') {
            next_action = Some(trimmed.to_string());
            in_next_action_section = false;
        }
    }

    (active_milestone, active_slice, phase, blocker)
}
```

### TypeScript: Conditional GSD Tab in project.tsx
```typescript
// Source: project.tsx structural pattern, extended for gsd_version
const hasPlanning = project?.tech_stack?.has_planning ?? false;
const isGsd2 = project?.gsd_version === 'gsd2';
const isGsd1 = hasPlanning && !isGsd2;
const showGsdTab = isGsd2 || isGsd1;

// In TabsList:
{showGsdTab && (
  <TabsTrigger value="gsd" className="gap-2">
    <CheckSquare className="h-4 w-4" />
    GSD
  </TabsTrigger>
)}

// In TabsContent:
{showGsdTab && (
  <TabsContent value="gsd" className="flex-1 min-h-0">
    {isGsd2 ? (
      <TabGroup
        defaultTab="gsd2-health"
        tabs={[
          { id: "gsd2-health", label: "Health", icon: Activity,
            content: <Gsd2HealthTab projectId={project.id} projectPath={project.path} /> },
          { id: "gsd2-milestones", label: "Milestones", icon: Flag,
            content: <Gsd2MilestonesTab projectId={project.id} /> },
        ]}
      />
    ) : (
      <TabGroup defaultTab="gsd-plans" tabs={[/* existing GSD-1 tabs */]} />
    )}
  </TabsContent>
)}
```

### TypeScript: Health Widget Component Skeleton
```typescript
// gsd2-health-tab.tsx
// Source: git-status-widget.tsx as layout reference
export function Gsd2HealthTab({ projectId, projectPath }: { projectId: string; projectPath: string }) {
  const { data: health, isLoading } = useGsd2Health(projectId);

  if (isLoading) {
    return <Card><CardContent><Skeleton className="h-4 w-2/3" /></CardContent></Card>;
  }

  if (!health || (health.budget_spent === 0 && !health.active_milestone_id)) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No health data yet — run a GSD-2 session to populate metrics.
        </CardContent>
      </Card>
    );
  }

  const budgetPct = health.budget_ceiling
    ? Math.round((health.budget_spent / health.budget_ceiling) * 100)
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4" /> GSD Health
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Budget row */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span>Budget</span>
            <span>{formatCost(health.budget_spent)}{health.budget_ceiling ? ` / ${formatCost(health.budget_ceiling)}` : ''}</span>
          </div>
          {budgetPct !== null && (
            <Progress
              value={budgetPct}
              variant={budgetPct > 80 ? 'warning' : 'brand'}
              size="sm"
            />
          )}
        </div>

        {/* Blocker row — hidden when no blocker */}
        {health.blocker && (
          <div className="flex items-center gap-2 p-2 rounded border border-status-error/20 bg-status-error/10">
            <AlertCircle className="h-4 w-4 text-status-error flex-shrink-0" />
            <span className="text-sm text-status-error">{health.blocker}</span>
          </div>
        )}

        {/* Progress counters */}
        <div className="grid grid-cols-3 gap-2 text-xs text-center">
          <div>
            <div className="font-semibold">{health.milestones_done}/{health.milestones_total}</div>
            <div className="text-muted-foreground">Milestones</div>
          </div>
          <div>
            <div className="font-semibold">{health.slices_done}/{health.slices_total}</div>
            <div className="text-muted-foreground">Slices</div>
          </div>
          <div>
            <div className="font-semibold">{health.tasks_done}/{health.tasks_total}</div>
            <div className="text-muted-foreground">Tasks</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single `gsd_version === null` for non-GSD projects | `"gsd2" \| "gsd1" \| "none" \| null` typed enum from DB | Phase 1 (complete) | Frontend can now safely branch on version |
| GSD tab guarded by `hasPlanning` (.planning/ detection) | Guard extends to include `gsd_version === 'gsd2'` | This phase | GSD-2 projects gain GSD tab access |
| No health data surface | `gsd2_get_health` command + Health sub-tab | This phase | GSD-2 projects show live session health |

**Deprecated/outdated:**
- Using `hasPlanning` alone as the GSD guard: still correct for GSD-1, insufficient for GSD-2.

---

## Open Questions

1. **Slices and Tasks sub-tabs for GSD-2**
   - What we know: Phase 1 commands `gsd2_list_milestones`, `gsd2_get_milestone`, `gsd2_get_slice` all exist.
   - What's unclear: CONTEXT.md lists "Milestones, Slices, Tasks" in the GSD-2 sub-tab set but only a Health tab component is explicitly scoped. Do Slices and Tasks need full UI implementations in Phase 2?
   - Recommendation: Build Milestones tab as a simple list view. Slices and Tasks tabs can be read-only list views that drill into existing Phase 1 data. Keep them simple — the planner should scope these as light components (no editing, no create/delete).

2. **budget_ceiling source**
   - What we know: metrics.json has no ceiling field. STATE.md body was checked in 2 completed projects — neither showed a ceiling value (both were complete projects with no active budget tracking).
   - What's unclear: Does an in-progress GSD-2 project's STATE.md include a `budget_ceiling:` line? The GSD-2 CLI may inject this into STATE.md during session setup.
   - Recommendation: Parse STATE.md for a line matching `budget_ceiling:` or `**Budget Ceiling:**` pattern; return null if not present. The widget handles null ceiling gracefully (shows spend only, no progress bar denominator).

3. **Env error/warning counts**
   - What we know: HLTH-01 requires env error/warning counts. CONTEXT.md mentions "environment error/warning counts" as a health field.
   - What's unclear: Where does GSD-2 store env error/warning counts? Neither STATE.md nor metrics.json (confirmed schema) contains these fields. The `**Requirements Status:**` line in STATE.md shows requirement counts, not env errors.
   - Recommendation: Return `env_error_count: 0, env_warning_count: 0` as defaults unless a source is identified. Document as a known gap. If GSD-2 stores env counts in a separate file, that can be a follow-up addition.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest + React Testing Library |
| Config file | `vite.config.ts` (under `test` key) |
| Quick run command | `pnpm test` |
| Full suite command | `pnpm test` (single run) + `pnpm test:e2e` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HLTH-01 | `gsd2_get_health` returns correct budget/state from fixture files | unit (Rust) | `cargo test -p track-your-shit-lib gsd2 -- --nocapture` | ❌ Wave 0 |
| HLTH-02 | Health data read from .gsd/STATE.md and metrics.json, not subprocess | unit (Rust) | `cargo test -p track-your-shit-lib get_health_from_dir` | ❌ Wave 0 |
| HLTH-03 | Gsd2HealthTab renders budget bar, blocker row, counters | unit (React) | `pnpm test src/components/project/gsd2-health-tab.test.tsx` | ❌ Wave 0 |
| HLTH-04 | Health query has refetchInterval=10000 | unit (React) | `pnpm test src/lib/queries.test.ts` | ❌ Wave 0 |
| TERM-01 | GSD-2 project renders Milestones/Slices/Tasks tabs | unit (React) | `pnpm test src/pages/project.test.tsx` | ❌ Wave 0 |
| TERM-02 | GSD-1 project still renders Plans/Context/Todos tabs | unit (React) | `pnpm test src/pages/project.test.tsx` | ❌ Wave 0 |
| TERM-03 | GSD-2 badge renders on project card; none badge for bare projects | unit (React) | `pnpm test src/components/projects/project-card.test.tsx` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test`
- **Per wave merge:** `pnpm test && cargo test -p track-your-shit-lib gsd2`
- **Phase gate:** Full suite green + `pnpm build` succeeds before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/components/project/gsd2-health-tab.test.tsx` — covers HLTH-03
- [ ] `src/lib/queries.test.ts` (or add to existing) — covers HLTH-04 refetchInterval
- [ ] `src/pages/project.test.tsx` — covers TERM-01, TERM-02
- [ ] `src/components/projects/project-card.test.tsx` — covers TERM-03
- [ ] Rust test fixtures for `get_health_from_dir` — covers HLTH-01, HLTH-02 (follow existing `make_fixture_project` pattern in gsd2.rs tests)

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection of `src-tauri/src/commands/gsd2.rs` — existing command structure, parse_frontmatter helper, derive_state_from_dir
- Direct code inspection of `src-tauri/src/commands/projects.rs` — get_projects_with_stats SQL and ProjectWithStats row mapping
- Direct code inspection of `src-tauri/src/models/mod.rs` — ProjectWithStats struct missing gsd_version
- Direct code inspection of `src-tauri/src/db/mod.rs` — migration `add_gsd_version_to_projects` confirmed
- Direct file inspection of `/Users/jeremymcspadden/Github/nebula/.gsd/metrics.json` — confirmed metrics.json schema (version=1, units[].cost)
- Direct file inspection of `/Users/jeremymcspadden/Github/nebula/.gsd/STATE.md` — confirmed STATE.md uses markdown body (not frontmatter)
- Direct file inspection of `/Users/jeremymcspadden/Github/registry-one/.gsd/STATE.md` — cross-confirmed STATE.md markdown format
- Direct code inspection of `src/hooks/use-gsd-file-watcher.ts` — watcher pattern for extending to gsd2 events
- Direct code inspection of `src/components/project/git-status-widget.tsx` — Card/CardContent layout reference
- Direct code inspection of `src/components/ui/badge.tsx` — confirmed variants: subtle-cyan, secondary, warning, error
- Direct code inspection of `src/components/ui/progress.tsx` — confirmed variants: brand, warning, success

### Secondary (MEDIUM confidence)
- `src/lib/query-keys.ts` — query key factory patterns for new gsd2.health key
- `src/lib/queries.ts` — refetchInterval usage patterns (15min for dependency, 30s for git)
- `src-tauri/src/lib.rs` — command registration pattern; gsd2 commands at lines 282–287

### Tertiary (LOW confidence)
- budget_ceiling source: unverified — no in-progress GSD-2 STATE.md sample available; recommendation is defensive fallback to null
- env_error_count source: unverified — neither confirmed STATE.md nor metrics.json contains env error fields; defaulting to 0 pending clarification

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed present in codebase
- Architecture: HIGH — all patterns confirmed from direct code inspection
- GSD-2 file schemas: HIGH — confirmed from 2 real production GSD-2 projects
- STATE.md structure: HIGH — confirmed markdown-body (not frontmatter) from 2 samples
- Pitfalls: HIGH — all identified from direct code gaps (missing gsd_version in ProjectWithStats, hasPlanning vs gsd_version guard)
- env_error_count source: LOW — no confirmed storage location found

**Research date:** 2026-03-20
**Valid until:** 2026-04-20 (stable Tauri/React stack; GSD-2 file format may evolve)
