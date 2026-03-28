// GSD VibeFlow - GSD-2 Dashboard View
// Full project-pulse landing: current unit, metrics, slice progress, activity, git, health
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { useEffect, useState } from 'react';
import {
  DollarSign,
  Zap,
  Activity,
  Clock,
  GitBranch,
  CheckCircle2,
  Play,
  Circle,
  ArrowUp,
  ArrowDown,
  GitCommit,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ActivityFeed } from './activity-feed';
import { ViewEmpty } from '@/components/shared/loading-states';
import { useGsd2History, useGsd2VisualizerData, useGsd2GitSummary } from '@/lib/queries';
import { formatCost, formatTokenCount, formatDuration, cn } from '@/lib/utils';
import type { VisualizerMilestone2, VisualizerSlice2, VisualizerTask2 } from '@/lib/tauri';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Gsd2DashboardViewProps {
  projectId: string;
  projectPath: string; // Keep for interface compatibility — currently unused
}

// ---------------------------------------------------------------------------
// Section 1 — Current Active Unit
// ---------------------------------------------------------------------------

interface ActiveUnitCardProps {
  isActive: boolean;
  unitType: string | null;
  unitId: string | null;
  elapsedMs: number;
  completedUnits: number;
  totalSlices: number;
}

function ActiveUnitCard({
  isActive,
  unitType,
  unitId,
  elapsedMs,
  completedUnits,
  totalSlices,
}: ActiveUnitCardProps) {
  const [elapsed, setElapsed] = useState(elapsedMs);

  // Seed elapsed from server value whenever the active unit changes
  useEffect(() => {
    setElapsed(elapsedMs);
  }, [elapsedMs, unitId]);

  // Tick while running
  useEffect(() => {
    if (!isActive) return;
    const id = setInterval(() => {
      setElapsed((prev) => prev + 1000);
    }, 1000);
    return () => clearInterval(id);
  }, [isActive, unitId]); // reset timer when unit changes

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Current Unit
          </span>
          <Badge
            variant={isActive ? 'default' : 'secondary'}
            className={cn(
              'text-[10px] font-semibold',
              isActive && 'bg-status-success/20 text-status-success border-status-success/30'
            )}
          >
            {isActive ? '● Running' : 'Idle'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {isActive && unitType && unitId ? (
          <>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              {unitType}
            </div>
            <div className="font-mono text-sm font-medium truncate">{unitId}</div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
              <span className="tabular-nums">{formatDuration(elapsed)}</span>
              <span>{completedUnits} units done</span>
              <span>{totalSlices} slices total</span>
            </div>
          </>
        ) : (
          <div className="text-xs text-muted-foreground py-1">
            No active unit — {completedUnits} units completed across {totalSlices} slices
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Section 2 — Metric Cards
// ---------------------------------------------------------------------------

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}

function MetricCard({ icon, label, value }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <span className="h-4 w-4 shrink-0">{icon}</span>
          <span className="text-xs">{label}</span>
        </div>
        <div className="text-lg font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Section 3 — Slice Progress + Task Checklist
// ---------------------------------------------------------------------------

interface SliceProgressCardProps {
  activeMilestone: VisualizerMilestone2 | null;
  activeSlice: VisualizerSlice2 | null;
}

function SliceProgressCard({ activeMilestone, activeSlice }: SliceProgressCardProps) {
  if (!activeMilestone) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Slice Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground py-2 text-center">No active milestone</p>
        </CardContent>
      </Card>
    );
  }

  const tasks: VisualizerTask2[] = activeSlice?.tasks ?? [];
  const doneTasks = tasks.filter((t) => t.status === 'done').length;
  const totalTasks = tasks.length;
  const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const progressVariant = pct < 33 ? 'default' : pct < 66 ? 'warning' : 'success';

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>Slice Progress</span>
          {activeSlice && (
            <span className="text-xs font-normal text-muted-foreground">
              {doneTasks}/{totalTasks} tasks
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Milestone + Slice IDs */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-[10px] font-mono">
              {activeMilestone.id}
            </Badge>
            <span className="text-xs text-muted-foreground truncate">{activeMilestone.title}</span>
          </div>
          {activeSlice && (
            <div className="flex items-center gap-1.5 pl-2">
              <Badge variant="secondary" className="text-[10px] font-mono">
                {activeSlice.id}
              </Badge>
              <span className="text-xs truncate">{activeSlice.title}</span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {activeSlice && (
          <div className="space-y-1">
            <Progress value={pct} variant={progressVariant} size="sm" />
            <div className="text-[10px] text-muted-foreground text-right tabular-nums">{pct}%</div>
          </div>
        )}

        {/* Task checklist */}
        {tasks.length > 0 && (
          <div className="space-y-1 max-h-[160px] overflow-y-auto">
            {tasks.map((task) => {
              const isDone = task.status === 'done';
              const isRunning = task.status === 'active';
              return (
                <div
                  key={task.id}
                  className={cn(
                    'flex items-center gap-2 text-xs py-0.5',
                    isDone && 'text-muted-foreground line-through',
                    isRunning && 'text-foreground font-medium'
                  )}
                >
                  {isDone ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-status-success" />
                  ) : isRunning ? (
                    <Play className="h-3.5 w-3.5 shrink-0 text-gsd-cyan" />
                  ) : (
                    <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                  )}
                  <span className="truncate">{task.title}</span>
                  <span className="text-[10px] text-muted-foreground font-mono ml-auto shrink-0">
                    {task.id}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Section 4 — Phase Breakdown
// ---------------------------------------------------------------------------

interface PhaseBreakdownCardProps {
  byPhase: Array<{ phase: string; units: number; cost: number; tokens: number; duration_ms: number }>;
}

const PHASE_ORDER = ['execution', 'completion', 'planning', 'research', 'reassessment'];

function PhaseBreakdownCard({ byPhase }: PhaseBreakdownCardProps) {
  const maxCost = Math.max(...byPhase.map((p) => p.cost), 0.0001);

  const ordered = PHASE_ORDER.map((phase) => byPhase.find((p) => p.phase === phase)).filter(
    (p): p is NonNullable<typeof p> => !!p && p.units > 0
  );

  const remaining = byPhase.filter(
    (p) => !PHASE_ORDER.includes(p.phase) && p.units > 0
  );

  const rows = [...ordered, ...remaining];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Phase Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">No phase data yet</p>
        ) : (
          <div className="space-y-2">
            {rows.map((p) => {
              const barWidth = (p.cost / maxCost) * 100;
              return (
                <div key={p.phase} className="space-y-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="capitalize text-muted-foreground">{p.phase}</span>
                    <div className="flex items-center gap-2 text-[10px] tabular-nums">
                      <span>{formatCost(p.cost)}</span>
                      <span className="text-muted-foreground/60">{p.units}u</span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary/70 rounded-full transition-all duration-500"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Section 6 — Git + Health
// ---------------------------------------------------------------------------

interface GitHealthCardProps {
  branch: string | null;
  isDirty: boolean;
  ahead: number;
  behind: number;
  hasGit: boolean;
  recentCommits: Array<{ hash: string; message: string; author: string; date: string }>;
  health: {
    milestones_done: number;
    milestones_total: number;
    slices_done: number;
    slices_total: number;
    tasks_done: number;
    tasks_total: number;
    active_milestone_id: string | null;
    active_slice_id: string | null;
    active_task_id: string | null;
  };
}

function GitHealthCard({
  branch,
  isDirty,
  ahead,
  behind,
  hasGit,
  recentCommits,
  health,
}: GitHealthCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Git &amp; Health</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Git mini-widget */}
        {hasGit ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs">
                <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-mono font-medium truncate max-w-[120px]">
                  {branch ?? 'detached'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px]',
                    isDirty
                      ? 'border-status-warning/40 text-status-warning'
                      : 'border-status-success/40 text-status-success'
                  )}
                >
                  {isDirty ? 'dirty' : 'clean'}
                </Badge>
                {(ahead > 0 || behind > 0) && (
                  <span className="flex items-center gap-0.5 text-[10px] tabular-nums text-muted-foreground">
                    {ahead > 0 && (
                      <>
                        <ArrowUp className="h-3 w-3" />
                        {ahead}
                      </>
                    )}
                    {behind > 0 && (
                      <>
                        <ArrowDown className="h-3 w-3" />
                        {behind}
                      </>
                    )}
                  </span>
                )}
              </div>
            </div>
            {recentCommits.slice(0, 2).map((commit) => (
              <div key={commit.hash} className="flex items-start gap-2 text-xs">
                <GitCommit className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground/60" />
                <div className="min-w-0">
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {commit.hash.slice(0, 7)}
                  </span>{' '}
                  <span className="truncate">{commit.message.slice(0, 60)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No git repository</p>
        )}

        {/* Divider */}
        <div className="border-t border-border/50" />

        {/* Health summary */}
        <div className="space-y-1.5">
          {[
            { label: 'Milestones', done: health.milestones_done, total: health.milestones_total },
            { label: 'Slices', done: health.slices_done, total: health.slices_total },
            { label: 'Tasks', done: health.tasks_done, total: health.tasks_total },
          ].map(({ label, done, total }) => {
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            return (
              <div key={label} className="space-y-0.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="tabular-nums text-[10px]">
                    {done}/{total}
                  </span>
                </div>
                <Progress value={pct} size="sm" variant={pct >= 66 ? 'success' : 'default'} />
              </div>
            );
          })}
          {(health.active_milestone_id || health.active_slice_id || health.active_task_id) && (
            <div className="pt-1 space-y-0.5 text-[10px] text-muted-foreground font-mono">
              {health.active_milestone_id && <div>M: {health.active_milestone_id}</div>}
              {health.active_slice_id && <div>S: {health.active_slice_id}</div>}
              {health.active_task_id && <div>T: {health.active_task_id}</div>}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function Gsd2DashboardView({ projectId, projectPath: _projectPath }: Gsd2DashboardViewProps) {
  const vizQuery = useGsd2VisualizerData(projectId);
  const historyQuery = useGsd2History(projectId);
  const gitQuery = useGsd2GitSummary(projectId);

  const isLoading = vizQuery.isLoading || historyQuery.isLoading;

  const vizData = vizQuery.data;
  const history = historyQuery.data;
  const git = gitQuery.data;

  // Derive active milestone + slice from vizData.milestones
  const activeMilestone: VisualizerMilestone2 | null =
    vizData?.milestones.find((m) => m.status === 'active') ?? null;
  const activeSlice: VisualizerSlice2 | null =
    activeMilestone?.slices.find((s) => s.status === 'active') ?? null;

  // Empty state check
  const noActivity =
    !isLoading &&
    (history?.totals.units ?? 0) === 0 &&
    !(vizData?.agent_activity.is_active ?? false) &&
    !activeMilestone;

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-28 w-full rounded-lg" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Skeleton className="h-52 rounded-lg" />
          <Skeleton className="h-52 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
      </div>
    );
  }

  if (noActivity) {
    return (
      <div className="p-4">
        <ViewEmpty
          message="No GSD-2 activity yet — run a session to populate the dashboard."
          description="Start an auto-mode run to see metrics, phase breakdowns, and live agent activity."
        />
      </div>
    );
  }

  // Safe defaults for when data is partially available
  const activity = vizData?.agent_activity ?? {
    is_active: false,
    pid: null,
    current_unit: null,
    completed_units: 0,
    total_slices: 0,
  };

  const totals = history?.totals ?? {
    units: 0,
    total_cost: 0,
    total_tokens: 0,
    duration_ms: 0,
    tool_calls: 0,
  };

  const byPhase = history?.by_phase ?? [];

  const health = vizData?.health ?? {
    active_milestone_id: null,
    active_slice_id: null,
    active_task_id: null,
    milestones_done: 0,
    milestones_total: 0,
    slices_done: 0,
    slices_total: 0,
    tasks_done: 0,
    tasks_total: 0,
  };

  return (
    <div className="p-4 space-y-4">
      {/* Section 1 — Current Active Unit */}
      <ActiveUnitCard
        isActive={activity.is_active}
        unitType={activity.current_unit?.unit_type ?? null}
        unitId={activity.current_unit?.unit_id ?? null}
        elapsedMs={activity.current_unit?.elapsed_ms ?? 0}
        completedUnits={activity.completed_units}
        totalSlices={activity.total_slices}
      />

      {/* Section 2 — 4 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          icon={<DollarSign className="h-4 w-4" />}
          label="Total Cost"
          value={formatCost(totals.total_cost)}
        />
        <MetricCard
          icon={<Zap className="h-4 w-4" />}
          label="Tokens Used"
          value={formatTokenCount(totals.total_tokens)}
        />
        <MetricCard
          icon={<Activity className="h-4 w-4" />}
          label="Units Run"
          value={totals.units}
        />
        <MetricCard
          icon={<Clock className="h-4 w-4" />}
          label="Duration"
          value={formatDuration(totals.duration_ms)}
        />
      </div>

      {/* Section 3 + Section 4 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Section 3 — Slice Progress + Task Checklist */}
        <SliceProgressCard activeMilestone={activeMilestone} activeSlice={activeSlice} />

        {/* Section 4 — Phase Breakdown */}
        <PhaseBreakdownCard byPhase={byPhase} />
      </div>

      {/* Section 5 + Section 6 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Section 5 — Activity Feed */}
        <ActivityFeed projectId={projectId} limit={8} />

        {/* Section 6 — Git Status + Health Summary */}
        <GitHealthCard
          branch={git?.branch ?? null}
          isDirty={git?.is_dirty ?? false}
          ahead={git?.ahead ?? 0}
          behind={git?.behind ?? 0}
          hasGit={git?.has_git ?? false}
          recentCommits={git?.recent_commits ?? []}
          health={health}
        />
      </div>
    </div>
  );
}
