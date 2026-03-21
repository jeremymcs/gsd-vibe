# Phase 4: Headless Mode and Visualizer - Research

**Researched:** 2026-03-21
**Domain:** Tauri 2.x PTY session management, React structured log UX, CSS-only data visualization
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Updated GSD-2 sub-tab order: **Health | Headless | Worktrees | Visualizer | Milestones | Slices | Tasks**
- Both Headless and Visualizer tabs always visible for GSD-2 projects — not conditional
- Headless output: structured log view (not raw text or xterm.js). Each JSON line rendered as `[HH:MM:SS]  {state}    +$X.XXX`
- Pinned snapshot card above the scrolling log showing latest `{ state, next, cost }`
- `next` field only in the snapshot card, NOT per-line
- Log always auto-scrolls to bottom (no smart-scroll)
- Stop action: SIGINT → wait 5s → SIGKILL
- App close: extend `use-close-warning.ts` hook, SIGINT all running sessions, no dialog
- `HeadlessSessionRegistry` tracks session ID → project ID, one session per project
- Visualizer: single scrollable page (Progress Tree, Cost & Tokens, Execution Timeline stacked)
- Visualizer cost charts: pure CSS/Tailwind horizontal bar charts — no recharts/chart.js
- Milestone nodes collapsible, active milestone auto-expanded on load
- Node status icons: ✔ green (done), ▶ amber/pulse (active), ○ gray (pending)
- Three-level tree: Milestone → Slice → Task
- Two cost bar charts: "By Milestone" and "By Model"
- Structured log row: timestamp left-aligned, state middle, cost delta right-aligned

### Claude's Discretion
- Exact Tailwind classes for pulsing active-state animation
- Whether `HeadlessSessionRegistry` lives in `gsd2.rs` or a new `headless.rs` sub-module
- Exact layout of the pinned snapshot card
- How to handle Visualizer empty state when no `.gsd/` metrics exist yet
- Execution timeline entry format (relative vs absolute time display)

### Deferred Ideas (OUT OF SCOPE)
- Multiple concurrent headless sessions (HDLS-07)
- Critical path highlighting in progress tree (VIZ-05)
- Pending captures count badge in visualizer header (VIZ-06)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| HDLS-01 | `gsd2_headless_query` runs `gsd headless --json next` as child process (not PTY), parses JSON, returns `{ state, next, cost }` | Use `std::process::Command` pattern, not TerminalManager — one-shot subprocess |
| HDLS-02 | `gsd2_headless_start` starts full `gsd headless` PTY session via TerminalManager, returns session ID | `TerminalManager::create_session` with `command = Some("gsd headless")` |
| HDLS-03 | `gsd2_headless_stop` sends interrupt to running headless PTY and waits for exit | Write `\x03` (ETX) to PTY writer → poll `is_running()` up to 5s → `kill()` |
| HDLS-04 | Headless session output (JSON lines) streams to frontend via existing `pty:output:{id}` events | Reader thread already emits these events — frontend just subscribes |
| HDLS-05 | `HeadlessSessionRegistry` tracks active sessions, ensures cleanup on app close | New `HashMap<String, i64>` (session_id → project_id) managed as Tauri state |
| HDLS-06 | New Headless tab: session status, start/stop controls, streamed output, last query snapshot | `Gsd2HeadlessTab` component + `useHeadlessSession` hook + `useGsd2HeadlessQuery` |
| VIZ-01 | `gsd2_get_visualizer_data` returns full milestone→slice→task tree with status | Reuse `list_milestones_from_dir` + `walk_milestones_with_tasks` helpers |
| VIZ-02 | Visualizer data includes cost/token metrics aggregated by milestone and by model | Extend `sum_costs_from_metrics` to group by `milestone_id` and `model` fields |
| VIZ-03 | Visualizer data includes chronological timeline (completed slices/tasks with timestamps) | Parse timestamps from PLAN.md/ROADMAP.md completion markers or metrics.json entries |
| VIZ-04 | New Visualizer tab: progress tree, cost/token bar charts, execution timeline | `Gsd2VisualizerTab` component, CSS-only bars, collapsible tree with useState |
</phase_requirements>

---

## Summary

Phase 4 adds two GSD-2 sub-tabs: **Headless** and **Visualizer**. Both build on the infrastructure established in Phases 1–3. The entire PTY session management layer (`TerminalManager`, `pty:output:{id}` events, `use-pty-session.ts`) already exists and is production-ready — the Headless tab needs only a thinner session hook that parses JSON lines instead of terminal bytes.

The `HeadlessSessionRegistry` is the only genuinely new Rust state type. It is a small `HashMap<String, i64>` wrapped in `Arc<Mutex<>>` managed by Tauri — the same pattern used for `TerminalManagerState`. The SIGINT → wait → SIGKILL stop sequence uses `session.write(&[0x03])` (ETX byte) then `session.is_running()` polling, then `session.kill()` — all available on `TerminalSession`.

The Visualizer is primarily a read-only data pipeline: extend `sum_costs_from_metrics` to return grouped data, reuse `list_milestones_from_dir` + derive_state helpers already present, then render with collapsible React state and CSS-only bar charts. No new external dependencies required by any locked decision.

**Primary recommendation:** Build in two waves — Wave 1: Headless (HDLS-01 through HDLS-06), Wave 2: Visualizer (VIZ-01 through VIZ-04). The Headless session lifecycle is the only genuinely complex piece.

---

## Standard Stack

### Core (all already present in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Tauri 2.x | current | App framework, PTY IPC | Project baseline |
| portable-pty | current | PTY sessions | Already used for all terminal sessions |
| React 18 | current | UI components | Project baseline |
| TanStack Query | current | Data fetching + caching | Project baseline for all Tauri invocations |
| Tailwind CSS | current | Styling including CSS-only bars | Project baseline; locked decision for charts |
| shadcn/ui | current | Card, Badge, Button, ScrollArea primitives | Used in all existing GSD-2 tabs |
| sonner | current | Toast notifications | Used in worktrees tab for mutations |
| lucide-react | current | Status icons | Used in all existing tabs |

### No New Dependencies
This phase intentionally introduces **zero new npm or Rust crate dependencies**. All required functionality is available in the existing stack:
- Progress bars: CSS `width` percentage on Tailwind divs
- Pulsing animation: `animate-pulse` (Tailwind built-in)
- Collapsible tree: React `useState<Set<string>>`
- JSON parsing: `serde_json` (already in Cargo.toml)
- Child process for query: `std::process::Command` (stdlib)

---

## Architecture Patterns

### Recommended Component Structure
```
src/components/project/
├── gsd2-headless-tab.tsx     # New — Headless tab UI
├── gsd2-visualizer-tab.tsx   # New — Visualizer tab UI
├── gsd2-health-tab.tsx       # Existing (reference)
└── gsd2-worktrees-tab.tsx    # Existing (reference)

src/hooks/
└── use-headless-session.ts   # New — lighter version of use-pty-session

src-tauri/src/commands/
└── gsd2.rs                   # Add 4 new commands here

src-tauri/src/
└── headless.rs               # New — HeadlessSessionRegistry type
   (or fold into gsd2.rs — Claude's discretion)
```

### Pattern 1: HeadlessSessionRegistry as Tauri Managed State
**What:** A `Arc<Mutex<HashMap<String, i64>>>` (session_id → project_id) registered via `app.manage()` in `lib.rs`.
**When to use:** Any command that starts/stops/queries headless sessions.
**Example:**
```rust
// headless.rs (new file) or top of gsd2.rs
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;

pub struct HeadlessSessionRegistry {
    /// session_id → project_id mapping
    pub sessions: HashMap<String, i64>,
}

impl HeadlessSessionRegistry {
    pub fn new() -> Self {
        Self { sessions: HashMap::new() }
    }
    pub fn register(&mut self, session_id: String, project_id: i64) {
        self.sessions.insert(session_id, project_id);
    }
    pub fn unregister(&mut self, session_id: &str) {
        self.sessions.remove(session_id);
    }
    pub fn all_session_ids(&self) -> Vec<String> {
        self.sessions.keys().cloned().collect()
    }
}

pub type HeadlessRegistryState = Arc<Mutex<HeadlessSessionRegistry>>;
```

Registration in `lib.rs` setup closure:
```rust
app.manage(Arc::new(Mutex::new(
    crate::headless::HeadlessSessionRegistry::new()
)));
```

### Pattern 2: gsd2_headless_query (Subprocess, not PTY)
**What:** One-shot `std::process::Command` invocation — does NOT use TerminalManager.
**When to use:** Polling for current state without starting a full session.
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HeadlessSnapshot {
    pub state: String,
    pub next: Option<String>,
    pub cost: f64,
}

#[tauri::command]
pub async fn gsd2_headless_query(
    project_id: String,
    pool: tauri::State<'_, DbState>,
) -> Result<HeadlessSnapshot, String> {
    let project_path = {
        let db = pool.read().await;
        get_project_path(&db, &project_id)?
    };
    let output = std::process::Command::new("gsd")
        .args(["headless", "--json", "next"])
        .current_dir(&project_path)
        .output()
        .map_err(|e| format!("Failed to run gsd headless: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    // Parse the last valid JSON line from stdout
    let snapshot: serde_json::Value = stdout
        .lines()
        .filter(|l| !l.trim().is_empty())
        .last()
        .and_then(|l| serde_json::from_str(l).ok())
        .ok_or_else(|| "No valid JSON output from gsd headless".to_string())?;

    Ok(HeadlessSnapshot {
        state: snapshot["state"].as_str().unwrap_or("unknown").to_string(),
        next: snapshot["next"].as_str().map(|s| s.to_string()),
        cost: snapshot["cost"].as_f64().unwrap_or(0.0),
    })
}
```

### Pattern 3: gsd2_headless_start (PTY Session)
**What:** Delegates to existing `TerminalManager::create_session` — same pattern as `pty_create`.
```rust
#[tauri::command]
pub async fn gsd2_headless_start(
    app: tauri::AppHandle,
    project_id: String,
    pool: tauri::State<'_, DbState>,
    terminal_manager: tauri::State<'_, crate::pty::TerminalManagerState>,
    registry: tauri::State<'_, HeadlessRegistryState>,
) -> Result<String, String> {
    let project_path = {
        let db = pool.read().await;
        get_project_path(&db, &project_id)?
    };
    let session_id = uuid::Uuid::new_v4().to_string();
    {
        let mut manager = terminal_manager.lock().await;
        manager.create_session(
            &app,
            session_id.clone(),
            &project_path,
            Some("gsd headless"),
            80,
            24,
        )?;
    }
    {
        let mut reg = registry.lock().await;
        let pid: i64 = project_id.parse().unwrap_or(0);
        reg.register(session_id.clone(), pid);
    }
    Ok(session_id)
}
```

### Pattern 4: gsd2_headless_stop (SIGINT → SIGKILL)
```rust
#[tauri::command]
pub async fn gsd2_headless_stop(
    session_id: String,
    terminal_manager: tauri::State<'_, crate::pty::TerminalManagerState>,
    registry: tauri::State<'_, HeadlessRegistryState>,
) -> Result<(), String> {
    {
        let mut manager = terminal_manager.lock().await;
        // Send SIGINT (ETX byte = Ctrl-C)
        let _ = manager.write(&session_id, &[0x03]);
    }
    // Wait up to 5s for clean exit
    for _ in 0..25 {
        tokio::time::sleep(std::time::Duration::from_millis(200)).await;
        let still_running = {
            let mut manager = terminal_manager.lock().await;
            manager.is_active(&session_id)
        };
        if !still_running {
            break;
        }
    }
    // Force kill if still running
    {
        let mut manager = terminal_manager.lock().await;
        if manager.is_active(&session_id) {
            let _ = manager.close(&tauri::AppHandle::clone(&/* app */), &session_id);
        }
    }
    {
        let mut reg = registry.lock().await;
        reg.unregister(&session_id);
    }
    Ok(())
}
```

**Note:** `gsd2_headless_stop` needs `AppHandle` to call `manager.close()`. Add `app: tauri::AppHandle` as first parameter — same as `pty_close` pattern in `commands/pty.rs`.

### Pattern 5: Frontend useHeadlessSession Hook
**What:** Lighter version of `use-pty-session.ts` — subscribes to `pty:output:{id}` events but parses JSON lines instead of passing bytes to xterm.
```typescript
// Accumulates partial JSON lines across multiple pty:output events
const bufferRef = useRef('');

const handlePtyOutput = useCallback((event: PtyOutputEvent) => {
    const text = new TextDecoder().decode(new Uint8Array(event.data));
    bufferRef.current += text;
    // Split on newlines, process complete lines
    const lines = bufferRef.current.split('\n');
    bufferRef.current = lines.pop() ?? ''; // keep incomplete last line
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
            const parsed = JSON.parse(trimmed) as HeadlessOutputLine;
            onLine?.(parsed);
        } catch {
            // Non-JSON line (startup messages) — skip or log as raw
        }
    }
}, [onLine]);
```

### Pattern 6: CSS-Only Bar Chart
**What:** Percentage-width Tailwind divs — already established in project.
```tsx
// Source: gsd2-health-tab.tsx Progress pattern + CONTEXT.md
function CostBar({ label, cost, maxCost }: { label: string; cost: number; maxCost: number }) {
    const pct = maxCost > 0 ? Math.round((cost / maxCost) * 100) : 0;
    return (
        <div className="flex items-center gap-2 text-xs">
            <span className="w-24 truncate text-right text-muted-foreground">{label}</span>
            <div className="flex-1 bg-muted rounded h-2 overflow-hidden">
                <div className="h-full bg-primary rounded" style={{ width: `${pct}%` }} />
            </div>
            <span className="w-16 text-right">{formatCost(cost)}</span>
        </div>
    );
}
```

### Pattern 7: Collapsible Tree with useState
```tsx
const [expanded, setExpanded] = useState<Set<string>>(() => {
    // Auto-expand active milestone on mount
    return new Set(activeMilestoneId ? [activeMilestoneId] : []);
});

const toggle = (id: string) =>
    setExpanded(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });
```

### Pattern 8: Pulsing Active Node
```tsx
// Active milestone/slice indicator — pure Tailwind
const StatusIcon = ({ status }: { status: 'done' | 'active' | 'pending' }) => {
    if (status === 'done') return <span className="text-status-success">✔</span>;
    if (status === 'active') return <span className="text-yellow-500 animate-pulse">▶</span>;
    return <span className="text-muted-foreground">○</span>;
};
```

### Anti-Patterns to Avoid
- **Starting PTY session on tab mount:** Always check if a session already exists for this project in the registry before calling `gsd2_headless_start`. One session per project.
- **Using `TerminalManager` for `gsd2_headless_query`:** The query command is a one-shot subprocess — use `std::process::Command`, not a full PTY session.
- **Killing session on tab unmount:** The Headless session must survive navigation. Only the event listeners should be cleaned up on unmount, not the PTY session itself.
- **Reading `TerminalManager.sessions` directly for headless state:** The registry is the source of truth for which sessions belong to headless. Do not scan `TerminalManager` for headless sessions.
- **Locking both `terminal_manager` and `registry` simultaneously:** Deadlock risk. Always release one lock before acquiring the other.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON line streaming | Custom line buffering from scratch | Accumulate in `bufferRef`, split on `\n` | PTY emits arbitrary-sized chunks; lines may span multiple events |
| PTY process management | Custom process spawner | `TerminalManager::create_session` | All PTY lifecycle (reader thread, exit monitor, event emission) already handled |
| Progress bars / charts | Bring in recharts/chart.js | CSS `width` percentage divs | Locked decision; already proven in health tab |
| Session ID generation | Custom UUID | `uuid::Uuid::new_v4()` | Already used in pty_create |
| Cost formatting | Custom formatter | `formatCost()` in `src/lib/utils.ts` | Already handles all edge cases |
| Milestone tree data | New filesystem walker | `list_milestones_from_dir()` + `walk_milestones_with_tasks()` | Already implemented and tested |

**Key insight:** The most dangerous mistake in this phase is re-implementing PTY session logic. `TerminalManager` already handles the full session lifecycle. The Headless tab needs only a JSON-aware wrapper around the existing PTY infrastructure.

---

## Common Pitfalls

### Pitfall 1: Concurrent Lock Acquisition (Deadlock)
**What goes wrong:** `gsd2_headless_stop` acquires `terminal_manager` lock while holding `registry` lock (or vice versa).
**Why it happens:** Tokio `Mutex::lock().await` in async context — if both locks are held by different tasks, neither can proceed.
**How to avoid:** Always use separate lock scopes with explicit drop or short-lived blocks. Never `await` while holding a `Mutex` guard.
**Warning signs:** App hangs on Stop button click.

### Pitfall 2: app.clone() Unavailable in gsd2_headless_stop
**What goes wrong:** `manager.close(app, session_id)` requires `AppHandle` but the stop command may not always receive it.
**Why it happens:** Tauri commands must explicitly declare `app: AppHandle` as a parameter to receive it.
**How to avoid:** Add `app: tauri::AppHandle` as first parameter to `gsd2_headless_stop`. Pattern established in `commands/pty.rs::pty_close`.

### Pitfall 3: Missing can_safely_close / force_close_all Backend
**What goes wrong:** `use-close-warning.ts` calls `canSafelyClose()` and `forceCloseAll()` which invoke `"can_safely_close"` and `"force_close_all"` — these Tauri commands are referenced in `tauri.ts` but NOT implemented in the Rust backend or registered in `lib.rs`.
**Why it happens:** The close-warning hook was built speculatively; the backend was never implemented.
**How to avoid:** This phase must either implement `can_safely_close` / `force_close_all` as new Rust commands, OR extend the hook differently (emit a custom Tauri event instead). Since the hook already calls these invocations, the cleanest path is to add stub implementations that check `HeadlessRegistryState` and `TerminalManagerState`.
**Warning signs:** App close silently fails or throws on close-requested event.

### Pitfall 4: Partial JSON Lines from PTY Output
**What goes wrong:** A JSON object emitted by `gsd headless` arrives split across two `pty:output` events.
**Why it happens:** PTY reader uses a 4096-byte buffer (`buf = [0u8; 4096]`) — a long JSON line may be split.
**How to avoid:** Always accumulate bytes in a string buffer and split on `\n`. Process only complete lines. Keep the incomplete last segment in the buffer.

### Pitfall 5: Visualizer Empty State Without Metrics
**What goes wrong:** `gsd2_get_visualizer_data` returns an empty cost/model breakdown when `metrics.json` doesn't exist yet.
**Why it happens:** New projects have no metrics before any headless session completes.
**How to avoid:** Return well-typed empty arrays/objects (not errors) for missing metrics. Frontend checks `data.cost_by_milestone.length === 0` and shows a friendly empty state card.

### Pitfall 6: Tab Insertion Index Off-by-One
**What goes wrong:** Inserting Headless at index 1 and Visualizer at index 3 fails if array indices are calculated wrong after the first insert.
**Why it happens:** Inserting element at index 1 shifts Worktrees to index 2; Visualizer must go at index 3 (after Worktrees).
**How to avoid:** Build the full tab array literal in order:
`[Health, Headless, Worktrees, Visualizer, Milestones, Slices, Tasks]`
Do not use `.splice()` — just rewrite the array literal in `project.tsx`.

### Pitfall 7: metrics.json Schema Unknown Beyond `units[].cost`
**What goes wrong:** VIZ-02 requires `cost` aggregated by milestone and by model. The current `sum_costs_from_metrics` only reads `units[].cost` — it is unknown whether `milestone_id` and `model` fields exist in `metrics.json`.
**Why it happens:** metrics.json full schema has not been characterized (noted in STATE.md blockers).
**How to avoid:** The new `gsd2_get_visualizer_data` command must defensively access optional fields. Use `unit.get("milestone_id").and_then(|v| v.as_str())` with fallback to `"unknown"`. If fields are absent, group everything under a single bucket rather than returning an error.

---

## Code Examples

### TypeScript Types to Add in tauri.ts
```typescript
// Source: CONTEXT.md + requirement definitions
export interface HeadlessSnapshot {
    state: string;
    next: string | null;
    cost: number;
}

export interface HeadlessSession {
    session_id: string;
    project_id: string;
    status: 'idle' | 'running' | 'complete' | 'failed';
    started_at: string | null;
}

export interface VisualizerNode {
    id: string;
    title: string;
    status: 'done' | 'active' | 'pending';
    slices?: VisualizerNode[];
    tasks?: VisualizerNode[];
}

export interface CostByKey {
    key: string;  // milestone ID or model name
    cost: number;
}

export interface TimelineEntry {
    id: string;
    title: string;
    type: 'slice' | 'task';
    completed_at: string | null;
    cost: number;
}

export interface VisualizerData {
    tree: VisualizerNode[];
    cost_by_milestone: CostByKey[];
    cost_by_model: CostByKey[];
    timeline: TimelineEntry[];
}
```

### Query Keys to Add in query-keys.ts
```typescript
// GSD-2 headless and visualizer keys
gsd2HeadlessSession: (projectId: string) => ['gsd2', 'headless', 'session', projectId] as const,
gsd2HeadlessQuery: (projectId: string) => ['gsd2', 'headless', 'query', projectId] as const,
gsd2VisualizerData: (projectId: string) => ['gsd2', 'visualizer', projectId] as const,
```

### React Query Hooks to Add in queries.ts
```typescript
export const useGsd2HeadlessQuery = (projectId: string) =>
    useQuery({
        queryKey: queryKeys.gsd2HeadlessQuery(projectId),
        queryFn: () => api.gsd2HeadlessQuery(projectId),
        enabled: !!projectId,
        staleTime: 5000,
        refetchInterval: 10000, // poll when tab is open
    });

export const useGsd2VisualizerData = (projectId: string) =>
    useQuery({
        queryKey: queryKeys.gsd2VisualizerData(projectId),
        queryFn: () => api.gsd2GetVisualizerData(projectId),
        enabled: !!projectId,
        staleTime: 15000,
        refetchInterval: 30000,
    });
```

### Rust VisualizerData Struct
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CostByKey {
    pub key: String,
    pub cost: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimelineEntry {
    pub id: String,
    pub title: String,
    pub entry_type: String, // "slice" or "task"
    pub completed_at: Option<String>,
    pub cost: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VisualizerNode {
    pub id: String,
    pub title: String,
    pub status: String, // "done" | "active" | "pending"
    pub slices: Vec<VisualizerNode>,
    pub tasks: Vec<VisualizerNode>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VisualizerData {
    pub tree: Vec<VisualizerNode>,
    pub cost_by_milestone: Vec<CostByKey>,
    pub cost_by_model: Vec<CostByKey>,
    pub timeline: Vec<TimelineEntry>,
}
```

### Structured Log Row Component
```tsx
// Source: CONTEXT.md specifics
interface HeadlessLogRow {
    timestamp: string; // "HH:MM:SS"
    state: string;
    cost_delta: number;
}

function LogRow({ row }: { row: HeadlessLogRow }) {
    return (
        <div className="flex items-center text-xs font-mono py-0.5 hover:bg-muted/30">
            <span className="w-20 text-muted-foreground shrink-0">[{row.timestamp}]</span>
            <span className="flex-1 truncate px-2">{row.state}</span>
            <span className="w-20 text-right text-status-success shrink-0">
                +{formatCost(row.cost_delta)}
            </span>
        </div>
    );
}
```

---

## Integration Points Checklist

### Rust Backend (gsd2.rs or headless.rs)
- [ ] `HeadlessSnapshot` struct (state, next, cost)
- [ ] `VisualizerData` struct (tree, cost_by_milestone, cost_by_model, timeline)
- [ ] `gsd2_headless_query` command (subprocess, not PTY)
- [ ] `gsd2_headless_start` command (PTY via TerminalManager, registry.register)
- [ ] `gsd2_headless_stop` command (SIGINT → wait → kill, registry.unregister)
- [ ] `gsd2_get_visualizer_data` command (reuse milestone walkers + metrics.json)
- [ ] `can_safely_close` command (check TerminalManager.active_count() + registry)
- [ ] `force_close_all` command (registry.all_session_ids → stop each, then close_all)

### lib.rs
- [ ] `app.manage(Arc::new(Mutex::new(HeadlessSessionRegistry::new())))` in setup
- [ ] Register all 4 new gsd2 commands in invoke_handler!
- [ ] Register `can_safely_close` and `force_close_all`

### Frontend — tauri.ts
- [ ] `HeadlessSnapshot`, `HeadlessSession`, `VisualizerData` TypeScript types
- [ ] `gsd2HeadlessQuery`, `gsd2HeadlessStart`, `gsd2HeadlessStop`, `gsd2GetVisualizerData` invoke wrappers

### Frontend — query-keys.ts
- [ ] `gsd2HeadlessSession`, `gsd2HeadlessQuery`, `gsd2VisualizerData` key factory entries

### Frontend — queries.ts
- [ ] `useGsd2HeadlessQuery`, `useGsd2VisualizerData` hooks

### Frontend — hooks/use-headless-session.ts (new file)
- [ ] JSON line accumulation from `pty:output:{id}` events
- [ ] Session lifecycle state: idle/running/complete/failed
- [ ] Session persistence across tab navigation (don't close on unmount)

### Frontend — use-close-warning.ts (extend)
- [ ] Call `gsd2HeadlessStop` on all active sessions from registry before window destroy
- [ ] This requires `can_safely_close` and `force_close_all` to be implemented in Rust

### Frontend — project.tsx
- [ ] Insert `Gsd2HeadlessTab` at index 1 (after Health)
- [ ] Insert `Gsd2VisualizerTab` at index 3 (after Worktrees)
- [ ] Import both new tab components

### Frontend — components/project/index.ts (barrel)
- [ ] Export `Gsd2HeadlessTab` and `Gsd2VisualizerTab`

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| Custom process management | Reuse TerminalManager | PTY infrastructure already complete |
| recharts/chart.js for cost bars | CSS-only Tailwind bars | Locked decision; zero new deps |
| xterm.js for headless output | Structured log rows (parsed JSON) | Locked decision; lighter UX |

---

## Open Questions

1. **metrics.json full schema for VIZ-02**
   - What we know: `{ "units": [{ "cost": 0.05 }] }` — the health code reads `units[].cost`
   - What's unclear: Whether `milestone_id`, `model`, and `completed_at` fields exist per unit entry
   - Recommendation: `gsd2_get_visualizer_data` must use defensive optional access. If fields are absent, group all costs as "unattributed" rather than returning an error. Plan for this graceful fallback explicitly.

2. **`can_safely_close` and `force_close_all` missing from Rust**
   - What we know: Both are called by `use-close-warning.ts` but have no Rust implementation
   - What's unclear: Were these always missing or recently removed?
   - Recommendation: Phase 4 MUST implement these two commands. They are straightforward: `can_safely_close` checks `terminal_manager.active_count() + registry.sessions.len()`, `force_close_all` kills everything. Include them in Wave 1.

3. **gsd headless --json next exact CLI interface**
   - What we know: CONTEXT.md specifies this command; HDLS-01 uses it
   - What's unclear: Exact JSON output schema (field names, whether `cost` is cumulative or per-call)
   - Recommendation: Treat `state`, `next`, and `cost` as optional fields with fallbacks. The headless query result should never error on unexpected schema.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (configured in vite.config.ts) + React Testing Library |
| Config file | `vite.config.ts` (test section) |
| Quick run command | `pnpm test` |
| Full suite command | `pnpm test` |
| Test setup | `src/test/setup.ts` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HDLS-01 | HeadlessSnapshot type is correct | unit | `pnpm test src/lib/__tests__/tauri.test.ts` | ❌ Wave 0 |
| HDLS-02 | gsd2HeadlessStart invoke wrapper | unit | `pnpm test src/lib/__tests__/tauri.test.ts` | ❌ Wave 0 |
| HDLS-04 | JSON line accumulation in useHeadlessSession | unit | `pnpm test src/hooks/__tests__/use-headless-session.test.ts` | ❌ Wave 0 |
| HDLS-06 | Headless tab renders status indicators | unit | `pnpm test src/components/__tests__/gsd2-headless-tab.test.tsx` | ❌ Wave 0 |
| VIZ-01 | VisualizerData tree structure typed correctly | unit | `pnpm test src/lib/__tests__/tauri.test.ts` | ❌ Wave 0 |
| VIZ-04 | Visualizer tab renders tree and bar charts | unit | `pnpm test src/components/__tests__/gsd2-visualizer-tab.test.tsx` | ❌ Wave 0 |
| HDLS-03 | Stop lifecycle (SIGINT→SIGKILL) | manual-only | Manual: Start session, click Stop, verify clean exit | — |
| HDLS-05 | Registry cleanup on app close | manual-only | Manual: Start session, quit app, verify no auto.lock orphan | — |
| VIZ-02 | Cost grouping by milestone/model | manual-only | Manual: View visualizer after a headless run | — |
| VIZ-03 | Timeline populated with timestamps | manual-only | Manual: View visualizer after a headless run | — |

### Sampling Rate
- **Per task commit:** `pnpm test`
- **Per wave merge:** `pnpm test && pnpm build`
- **Phase gate:** Full suite green + manual session lifecycle validation before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/__tests__/tauri.test.ts` — type-level tests for new gsd2 wrappers (HeadlessSnapshot, VisualizerData)
- [ ] `src/hooks/__tests__/use-headless-session.test.ts` — JSON line accumulation logic (pure function, no Tauri needed)
- [ ] `src/components/__tests__/gsd2-headless-tab.test.tsx` — status indicator rendering
- [ ] `src/components/__tests__/gsd2-visualizer-tab.test.tsx` — tree collapse/expand, empty state

---

## Sources

### Primary (HIGH confidence)
- Code: `src-tauri/src/pty/mod.rs` — Full `TerminalManager` API verified by reading source
- Code: `src-tauri/src/commands/pty.rs` — PTY command patterns (AppHandle, TerminalManagerState)
- Code: `src-tauri/src/commands/gsd2.rs` — Existing helpers: `sum_costs_from_metrics`, `get_health_from_dir`, `list_milestones_from_dir`
- Code: `src/hooks/use-pty-session.ts` — setupListeners pattern, cleanupListeners, event subscription
- Code: `src/hooks/use-close-warning.ts` — `canSafelyClose`/`forceCloseAll` calls confirmed
- Code: `src/lib/tauri.ts` — Confirmed `can_safely_close`/`force_close_all` have NO Rust implementation
- Code: `src/lib/query-keys.ts` — Existing gsd2 keys, insertion points for new keys
- Code: `src/pages/project.tsx` — Confirmed current tab array (Health, Worktrees, Milestones, Slices, Tasks)
- Code: `src/components/project/gsd2-health-tab.tsx` — Pinned card + scrollable body pattern
- Code: `src/components/project/gsd2-worktrees-tab.tsx` — Mutation + optimistic update pattern

### Secondary (MEDIUM confidence)
- `.planning/phases/04-headless-mode-and-visualizer/04-CONTEXT.md` — User decisions, tab ordering, UI specs
- `.planning/STATE.md` — Known blocker: metrics.json full schema uncharacterized

### Tertiary (LOW confidence)
- `gsd headless --json next` CLI interface — assumed based on CONTEXT.md; exact JSON schema unverified

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified by reading existing source files
- Architecture patterns: HIGH — all patterns derived from existing working code in the project
- Pitfalls: HIGH for PTY/lock issues (verified by reading TerminalManager); MEDIUM for metrics.json schema (noted as uncharacterized in STATE.md)
- `can_safely_close` gap: HIGH — confirmed missing by searching entire src-tauri/src directory

**Research date:** 2026-03-21
**Valid until:** 2026-04-21 (stable codebase, no fast-moving external deps)
