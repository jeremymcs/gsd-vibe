// VCCA - Visualizer Tab Component
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { useState, useEffect, useCallback } from 'react';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import {
  CheckCircle2,
  Circle,
  Play,
  AlertTriangle,
  Clock,
  Download,
  Activity,
  GitBranch,
  ArrowRight,
  BarChart3,
  FileText,
  Bot,
  ChevronRight,
  AlertCircle,
  Layers,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCost, formatRelativeTime, formatDuration, formatTokenCount } from '@/lib/utils';
import { useGsd2VisualizerData } from '@/lib/queries';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import type {
  VisualizerData,
  VisualizerMilestone2,
  VisualizerSlice2,
  VisualizerTask2,
  ChangelogEntry2,
} from '@/lib/tauri';

// ─── Tab definitions ──────────────────────────────────────────────────────────

const TABS = [
  { value: 'progress',  label: 'Progress',      Icon: Layers    },
  { value: 'deps',      label: 'Dependencies',  Icon: GitBranch },
  { value: 'metrics',   label: 'Metrics',       Icon: BarChart3 },
  { value: 'timeline',  label: 'Timeline',      Icon: Clock     },
  { value: 'agent',     label: 'Agent',         Icon: Bot       },
  { value: 'changes',   label: 'Changes',       Icon: Activity  },
  { value: 'export',    label: 'Export',        Icon: Download  },
] as const;

type TabValue = (typeof TABS)[number]['value'];

// ─── Shared Primitives ────────────────────────────────────────────────────────

function statusIcon(status: 'complete' | 'active' | 'pending' | 'done') {
  switch (status) {
    case 'complete':
    case 'done':
      return <CheckCircle2 className="h-4 w-4 shrink-0 text-status-success" />;
    case 'active':
      return <Play className="h-4 w-4 shrink-0 text-status-info" />;
    case 'pending':
      return <Circle className="h-4 w-4 shrink-0 text-muted-foreground/30" />;
  }
}

function taskStatusIcon(task: VisualizerTask2) {
  if (task.done)   return statusIcon('done');
  if (task.status === 'active') return statusIcon('active');
  return statusIcon('pending');
}

function RiskBadge({ risk }: { risk: string | null }) {
  if (!risk) return null;
  const color =
    risk === 'high'
      ? 'bg-destructive/15 text-destructive border-destructive/25'
      : risk === 'medium'
        ? 'bg-status-warning/15 text-status-warning border-status-warning/25'
        : 'bg-status-info/15 text-status-info border-status-info/25';
  return (
    <span
      className={cn(
        'inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-widest',
        color,
      )}
    >
      {risk}
    </span>
  );
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-3.5 w-0.5 rounded-full bg-foreground/25" />
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {children}
      </h3>
    </div>
  );
}

function EmptyState({
  message,
  icon: Icon = AlertCircle,
}: {
  message: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border/60 py-16 text-center">
      <div className="rounded-full border border-border/60 bg-muted/40 p-4">
        <Icon className="h-6 w-6 text-muted-foreground/50" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">{message}</p>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: 'sky' | 'emerald' | 'amber' | 'default';
}) {
  const accentClasses = {
    sky:     'from-status-info/8 border-status-info/20',
    emerald: 'from-status-success/8 border-status-success/20',
    amber:   'from-status-warning/8 border-status-warning/20',
    default: 'from-transparent border-border',
  }[accent ?? 'default'];

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border bg-gradient-to-br to-transparent p-5',
        accentClasses,
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold tabular-nums leading-none tracking-tight">{value}</p>
      {sub && <p className="mt-1.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function ProgressBar({
  value,
  max,
  color = 'sky',
  animated = false,
}: {
  value: number;
  max: number;
  color?: 'sky' | 'emerald' | 'amber';
  animated?: boolean;
}) {
  const pct = max > 0 ? Math.max(1, (value / max) * 100) : 0;
  const barColor = {
    sky:     'bg-status-info',
    emerald: 'bg-status-success',
    amber:   'bg-status-warning',
  }[color];
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
      <div
        className={cn('h-full rounded-full transition-all duration-700', barColor, animated && 'animate-pulse')}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ─── Progress Tab ─────────────────────────────────────────────────────────────

function ProgressTab({ data }: { data: VisualizerData }) {
  if (data.milestones.length === 0) {
    return <EmptyState message="No milestones defined yet." icon={Layers} />;
  }

  const allSlices = data.milestones.flatMap((m: VisualizerMilestone2) => m.slices);
  const riskCounts = { low: 0, medium: 0, high: 0 };
  for (const sl of allSlices) {
    if (sl.risk === 'high') riskCounts.high++;
    else if (sl.risk === 'medium') riskCounts.medium++;
    else riskCounts.low++;
  }

  return (
    <div className="space-y-6">
      {/* Risk Heatmap */}
      {allSlices.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6">
          <SectionLabel>Risk Heatmap</SectionLabel>
          <div className="mt-5 space-y-3">
            {data.milestones
              .filter((m: VisualizerMilestone2) => m.slices.length > 0)
              .map((ms: VisualizerMilestone2) => (
                <div key={ms.id} className="flex items-center gap-4">
                  <span className="w-16 shrink-0 font-mono text-xs font-medium text-muted-foreground">
                    {ms.id}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {ms.slices.map((sl: VisualizerSlice2) => (
                      <div
                        key={sl.id}
                        title={`${sl.id}: ${sl.title} (${sl.risk ?? 'low'})`}
                        className={cn(
                          'h-6 w-6 rounded cursor-default transition-transform hover:scale-125',
                          sl.risk === 'high'
                            ? 'bg-destructive'
                            : sl.risk === 'medium'
                              ? 'bg-status-warning'
                              : 'bg-status-success',
                        )}
                      />
                    ))}
                  </div>
                </div>
              ))}
          </div>
          <div className="mt-5 flex items-center gap-5 text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-status-success" />
              Low ({riskCounts.low})
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-status-warning" />
              Medium ({riskCounts.medium})
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-destructive" />
              High ({riskCounts.high})
            </span>
          </div>
        </div>
      )}

      {/* Milestone tree */}
      <div className="space-y-4">
        {data.milestones.map((ms: VisualizerMilestone2) => (
          <div key={ms.id} className="overflow-hidden rounded-xl border border-border bg-card">
            {/* Milestone header */}
            <div className="flex items-center justify-between border-b border-border bg-muted/20 px-5 py-4">
              <div className="flex items-center gap-3">
                {statusIcon(ms.status)}
                <span className="font-mono text-xs font-semibold text-muted-foreground">{ms.id}</span>
                <span className="text-sm font-semibold">{ms.title}</span>
              </div>
              <span
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-semibold uppercase tracking-wider',
                  ms.status === 'done'
                    ? 'bg-status-success/15 text-status-success'
                    : ms.status === 'active'
                      ? 'bg-status-info/15 text-status-info'
                      : 'bg-muted text-muted-foreground',
                )}
              >
                {ms.status}
              </span>
            </div>

            {ms.status === 'pending' && ms.dependencies.length > 0 && (
              <div className="px-5 py-2.5 text-xs text-muted-foreground border-b border-border/50">
                Depends on {ms.dependencies.join(', ')}
              </div>
            )}

            {/* Slices */}
            {ms.slices.length > 0 && (
              <div className="divide-y divide-border/50">
                {ms.slices.map((sl: VisualizerSlice2) => {
                  const doneTasks = sl.tasks.filter((t: VisualizerTask2) => t.done).length;
                  const slStatus = sl.done ? 'done' : sl.status === 'active' ? 'active' : 'pending';
                  return (
                    <div key={sl.id} className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {statusIcon(slStatus)}
                        <span className="font-mono text-xs font-medium text-muted-foreground">{sl.id}</span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{sl.title}</span>
                        <div className="flex shrink-0 items-center gap-2.5">
                          {sl.dependencies.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              deps: {sl.dependencies.join(', ')}
                            </span>
                          )}
                          {sl.tasks.length > 0 && (
                            <span className="font-mono text-xs font-medium text-muted-foreground">
                              {doneTasks}/{sl.tasks.length}
                            </span>
                          )}
                          <RiskBadge risk={sl.risk} />
                        </div>
                      </div>

                      {/* Tasks — shown for active or partially-done slices */}
                      {(sl.status === 'active' || sl.tasks.some((t: VisualizerTask2) => t.status === 'active')) &&
                        sl.tasks.length > 0 && (
                          <div className="ml-7 mt-3 space-y-1">
                            {sl.tasks.map((task: VisualizerTask2) => (
                              <div
                                key={task.id}
                                className={cn(
                                  'flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors',
                                  task.status === 'active'
                                    ? 'bg-status-info/8 border border-status-info/20'
                                    : 'hover:bg-muted/40',
                                )}
                              >
                                {taskStatusIcon(task)}
                                <span className="font-mono text-xs font-medium text-muted-foreground">
                                  {task.id}
                                </span>
                                <span
                                  className={cn(
                                    'text-sm',
                                    task.done && 'text-muted-foreground/50 line-through',
                                    task.status === 'active' && 'font-semibold text-status-info',
                                    !task.done && task.status !== 'active' && 'text-muted-foreground',
                                  )}
                                >
                                  {task.title}
                                </span>
                                {task.status === 'active' && (
                                  <span className="ml-auto rounded-md bg-status-info/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-status-info">
                                    running
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Knowledge & Captures summary */}
      {(data.knowledge.entry_count > 0 || data.captures.pending_count > 0) && (
        <div className="rounded-xl border border-border bg-card p-6">
          <SectionLabel>Knowledge &amp; Captures</SectionLabel>
          <div className="mt-4 flex gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Knowledge entries:</span>
              <span className="font-medium tabular-nums">{data.knowledge.entry_count}</span>
            </div>
            {data.captures.pending_count > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Captures pending:</span>
                <Badge variant="outline" className="text-xs tabular-nums">{data.captures.pending_count}</Badge>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Deps Tab ─────────────────────────────────────────────────────────────────

function DepsTab({ data }: { data: VisualizerData }) {
  // VCCA critical path: path[] are qualified slice IDs like "M001/S01"
  const cp = data.critical_path;

  // Derive milestone path from unique milestone prefixes
  const milestonePath = [...new Set(cp.path.map((p: string) => p.split('/')[0]))];

  // Build slack lookup from slack_map array
  const slackLookup = Object.fromEntries(cp.slack_map.map((e) => [e.id, e.slack]));

  // Slice path = the full qualified IDs on the critical path
  const slicePath = cp.path;

  const activeMs = data.milestones.find((m: VisualizerMilestone2) => m.status === 'active');
  const milestoneDeps = data.milestones.filter(
    (m: VisualizerMilestone2) => m.dependencies.length > 0,
  );

  return (
    <div className="space-y-6">
      {/* Milestone Dependencies */}
      <div className="rounded-xl border border-border bg-card p-6">
        <SectionLabel>Milestone Dependencies</SectionLabel>
        <div className="mt-5">
          {milestoneDeps.length === 0 ? (
            <p className="text-sm text-muted-foreground">No milestone dependencies configured.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {milestoneDeps.flatMap((ms: VisualizerMilestone2) =>
                ms.dependencies.map((dep: string) => (
                  <div key={`${dep}-${ms.id}`} className="flex items-center gap-3">
                    <span className="rounded-lg border border-status-info/25 bg-status-info/10 px-3 py-1.5 font-mono text-sm font-semibold text-status-info">
                      {dep}
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
                    <span className="rounded-lg border border-border bg-muted/40 px-3 py-1.5 font-mono text-sm font-medium">
                      {ms.id}
                    </span>
                    <span className="text-sm text-muted-foreground">{ms.title}</span>
                  </div>
                )),
              )}
            </div>
          )}
        </div>
      </div>

      {/* Slice Dependencies — Active Milestone */}
      <div className="rounded-xl border border-border bg-card p-6">
        <SectionLabel>Slice Dependencies — Active Milestone</SectionLabel>
        <div className="mt-5">
          {!activeMs ? (
            <p className="text-sm text-muted-foreground">No active milestone.</p>
          ) : (
            (() => {
              const slDeps = activeMs.slices.filter(
                (s: VisualizerSlice2) => s.dependencies.length > 0,
              );
              if (slDeps.length === 0)
                return (
                  <p className="text-sm text-muted-foreground">
                    No slice dependencies in {activeMs.id}.
                  </p>
                );
              return (
                <div className="flex flex-col gap-3">
                  {slDeps.flatMap((sl: VisualizerSlice2) =>
                    sl.dependencies.map((dep: string) => (
                      <div key={`${dep}-${sl.id}`} className="flex items-center gap-3">
                        <span className="rounded-lg border border-status-info/25 bg-status-info/10 px-3 py-1.5 font-mono text-sm font-semibold text-status-info">
                          {dep}
                        </span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
                        <span className="rounded-lg border border-border bg-muted/40 px-3 py-1.5 font-mono text-sm font-medium">
                          {sl.id}
                        </span>
                        <span className="text-sm text-muted-foreground">{sl.title}</span>
                      </div>
                    )),
                  )}
                </div>
              );
            })()
          )}
        </div>
      </div>

      {/* Critical Path */}
      <div className="rounded-xl border border-border bg-card p-6">
        <SectionLabel>Critical Path</SectionLabel>
        <div className="mt-5">
          {milestonePath.length === 0 ? (
            <p className="text-sm text-muted-foreground">No critical path data.</p>
          ) : (
            <div className="space-y-7">
              {/* Milestone chain */}
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Milestone Chain
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {milestonePath.map((id: string, i: number) => (
                    <span key={id} className="flex items-center gap-2">
                      <span className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-1.5 font-mono text-sm font-bold text-destructive">
                        {id}
                      </span>
                      {i < milestonePath.length - 1 && (
                        <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                      )}
                    </span>
                  ))}
                </div>
              </div>

              {/* Milestone slack — milestones NOT on the critical path */}
              {Object.keys(slackLookup).length > 0 && (
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Slack
                  </p>
                  <div className="flex flex-col gap-2">
                    {data.milestones
                      .filter((m: VisualizerMilestone2) => !milestonePath.includes(m.id))
                      .map((m: VisualizerMilestone2) => (
                        <div
                          key={m.id}
                          className="flex items-center gap-4 rounded-lg bg-muted/30 px-4 py-2.5"
                        >
                          <span className="w-16 font-mono text-sm font-semibold">{m.id}</span>
                          <span className="text-sm text-muted-foreground">{m.title}</span>
                          <span className="ml-auto font-mono text-xs text-muted-foreground">
                            slack: {slackLookup[m.id] ?? 0}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Slice critical path */}
              {slicePath.length > 0 && (
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Slice Critical Path
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {slicePath.map((id: string, i: number) => (
                      <span key={id} className="flex items-center gap-2">
                        <span className="rounded-lg border border-status-warning/30 bg-status-warning/10 px-3 py-1.5 font-mono text-sm font-semibold text-status-warning">
                          {id}
                        </span>
                        {i < slicePath.length - 1 && (
                          <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                        )}
                      </span>
                    ))}
                  </div>
                  {/* Bottleneck warnings — slices on critical path not yet started */}
                  {activeMs && (
                    <div className="mt-3 space-y-2">
                      {slicePath
                        .map((sid: string) =>
                          activeMs.slices.find((s: VisualizerSlice2) => sid.endsWith(s.id)),
                        )
                        .filter(
                          (sl): sl is VisualizerSlice2 =>
                            sl != null && !sl.done && sl.status !== 'active',
                        )
                        .map((sl: VisualizerSlice2) => (
                          <div
                            key={sl.id}
                            className="flex items-center gap-2.5 rounded-lg border border-status-warning/20 bg-status-warning/8 px-4 py-2.5 text-sm text-status-warning"
                          >
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            <span className="font-mono font-semibold">{sl.id}</span>
                            <span>is on the critical path but not yet started</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* Slice slack from slack_map */}
              {cp.slack_map.length > 0 && (
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Slice Slack
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {cp.slack_map.map((entry) => (
                      <span
                        key={entry.id}
                        className="rounded-lg border border-border bg-muted/40 px-3 py-1.5 font-mono text-xs text-muted-foreground"
                      >
                        {entry.id}: {entry.slack}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Metrics Tab ──────────────────────────────────────────────────────────────

function MetricsTab({ data }: { data: VisualizerData }) {
  if (!data.totals) {
    return <EmptyState message="No metrics data available." icon={BarChart3} />;
  }

  const totals = data.totals;

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Execution Units" value={String(totals.units)} accent="default" />
        <StatCard label="Total Cost"      value={formatCost(totals.total_cost)}           accent="emerald" />
        <StatCard label="Duration"        value={formatDuration(totals.duration_ms)}      accent="sky" />
        <StatCard
          label="Total Tokens"
          value={formatTokenCount(totals.total_tokens)}
          accent="amber"
        />
      </div>

      {/* By Phase */}
      {data.by_phase.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6">
          <SectionLabel>Cost by Phase</SectionLabel>
          <div className="mt-5 space-y-5">
            {data.by_phase.map((phase) => {
              const pct = totals.total_cost > 0 ? (phase.cost / totals.total_cost) * 100 : 0;
              return (
                <div key={phase.phase}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold">{phase.phase}</span>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="font-mono font-medium text-foreground">
                        {formatCost(phase.cost)}
                      </span>
                      <span>{pct.toFixed(1)}%</span>
                      <span>{formatTokenCount(phase.tokens)} tok</span>
                      <span>{phase.units} units</span>
                    </div>
                  </div>
                  <ProgressBar value={pct} max={100} color="sky" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* By Model */}
      {data.by_model.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6">
          <SectionLabel>Cost by Model</SectionLabel>
          <div className="mt-5 space-y-5">
            {data.by_model.map((model) => {
              const pct = totals.total_cost > 0 ? (model.cost / totals.total_cost) * 100 : 0;
              return (
                <div key={model.model}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-mono text-sm font-medium">{model.model}</span>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="font-mono font-medium text-foreground">
                        {formatCost(model.cost)}
                      </span>
                      <span>{pct.toFixed(1)}%</span>
                      <span>{formatTokenCount(model.tokens)} tok</span>
                      <span>{model.units} units</span>
                    </div>
                  </div>
                  <ProgressBar value={pct} max={100} color="emerald" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* By Slice */}
      {data.by_slice.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6">
          <SectionLabel>Cost by Slice</SectionLabel>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  <th className="pb-3 pr-5">Slice</th>
                  <th className="pb-3 pr-5 text-right">Units</th>
                  <th className="pb-3 pr-5 text-right">Cost</th>
                  <th className="pb-3 pr-5 text-right">Duration</th>
                  <th className="pb-3 text-right">Tokens</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {data.by_slice.map((sl) => (
                  <tr key={sl.slice_id} className="transition-colors hover:bg-muted/30">
                    <td className="py-3 pr-5 font-mono text-xs font-semibold">{sl.slice_id}</td>
                    <td className="py-3 pr-5 text-right tabular-nums text-muted-foreground">
                      {sl.units}
                    </td>
                    <td className="py-3 pr-5 text-right tabular-nums font-medium">
                      {formatCost(sl.cost)}
                    </td>
                    <td className="py-3 pr-5 text-right tabular-nums text-muted-foreground">
                      {formatDuration(sl.duration_ms)}
                    </td>
                    <td className="py-3 text-right tabular-nums text-muted-foreground">
                      {formatTokenCount(sl.tokens)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Timeline Tab ─────────────────────────────────────────────────────────────

function TimelineTab({ data }: { data: VisualizerData }) {
  const sorted = [...data.units].sort((a, b) => a.started_at - b.started_at);
  const recent = sorted.slice(-30);
  const hasRunningUnit = recent.some((u) => !u.finished_at || u.finished_at <= 0);
  const [runningNow, setRunningNow] = useState(() => Date.now());

  useEffect(() => {
    if (!hasRunningUnit) return;
    const interval = window.setInterval(() => {
      setRunningNow(Date.now());
    }, 1000);
    return () => window.clearInterval(interval);
  }, [hasRunningUnit]);

  const referenceNow = hasRunningUnit ? runningNow : 0;
  const durationForUnit = useCallback(
    (unit: VisualizerData['units'][number]) =>
      (unit.finished_at > 0 ? unit.finished_at : referenceNow) - unit.started_at,
    [referenceNow],
  );

  if (data.units.length === 0) {
    return <EmptyState message="No execution history yet." icon={Clock} />;
  }

  const maxDuration = Math.max(...recent.map(durationForUnit), 1);

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {/* Header */}
        <div className="border-b border-border bg-muted/20 px-6 py-4">
          <SectionLabel>Execution Timeline</SectionLabel>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Showing {recent.length} of {data.units.length} units — most recent first
          </p>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-[3.5rem_1.5rem_5rem_8rem_1fr_4.5rem_5rem] items-center gap-3 border-b border-border/50 px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <span>Time</span>
          <span />
          <span>Type</span>
          <span>ID</span>
          <span>Duration</span>
          <span className="text-right">Time</span>
          <span className="text-right">Cost</span>
        </div>

        <div className="divide-y divide-border/40">
          {[...recent].reverse().map((unit, i) => {
            const duration = durationForUnit(unit);
            const pct = (duration / maxDuration) * 100;
            const isRunning = !unit.finished_at || unit.finished_at <= 0;
            return (
              <div
                key={`${unit.id}-${unit.started_at}-${i}`}
                className="grid grid-cols-[3.5rem_1.5rem_5rem_8rem_1fr_4.5rem_5rem] items-center gap-3 px-6 py-3.5 transition-colors hover:bg-muted/30"
              >
                <span className="font-mono text-xs text-muted-foreground">
                  {formatTime(unit.started_at)}
                </span>
                {isRunning ? (
                  <Play className="h-3.5 w-3.5 shrink-0 text-status-info" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-status-success" />
                )}
                <span className="truncate text-xs font-medium">{unit.unit_type}</span>
                <span className="truncate font-mono text-xs text-muted-foreground">{unit.id}</span>
                <div className="hidden sm:block">
                  <ProgressBar value={pct} max={100} color="sky" animated={isRunning} />
                </div>
                <span className="text-right font-mono text-xs tabular-nums text-muted-foreground">
                  {formatDuration(duration)}
                </span>
                <span className="text-right font-mono text-xs tabular-nums font-medium">
                  {formatCost(unit.cost)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Agent Tab ────────────────────────────────────────────────────────────────

function AgentTab({ data }: { data: VisualizerData }) {
  const activity = data.agent_activity;

  if (!activity) {
    return <EmptyState message="No agent activity data available." icon={Bot} />;
  }

  const completed = activity.completed_units;
  const total = Math.max(completed, activity.total_slices);
  const pct = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;

  return (
    <div className="space-y-6">
      {/* Status card */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'relative flex h-10 w-10 items-center justify-center rounded-full',
                activity.is_active ? 'bg-status-success/15' : 'bg-muted/60',
              )}
            >
              {activity.is_active && (
                <div className="absolute inset-0 animate-ping rounded-full bg-status-success/20" />
              )}
              <div
                className={cn(
                  'h-3 w-3 rounded-full',
                  activity.is_active ? 'bg-status-success' : 'bg-muted-foreground/30',
                )}
              />
            </div>
            <div>
              <p className="text-xl font-bold">{activity.is_active ? 'Active' : 'Idle'}</p>
              <p className="text-sm text-muted-foreground">
                {activity.is_active ? 'Agent is running' : 'Waiting for next task'}
              </p>
            </div>
          </div>
          {activity.is_active && activity.current_unit && (
            <div className="text-right">
              <p className="font-mono text-lg font-bold">
                {formatDuration(activity.current_unit.elapsed_ms)}
              </p>
              <p className="text-xs text-muted-foreground">elapsed</p>
            </div>
          )}
        </div>

        {activity.current_unit && (
          <div className="mt-5 flex items-center gap-3 rounded-xl border border-status-info/20 bg-status-info/8 px-5 py-3.5">
            <Play className="h-4 w-4 shrink-0 text-status-info" />
            <div>
              <p className="text-xs text-muted-foreground">Currently executing</p>
              <p className="mt-0.5 font-mono text-sm font-semibold text-status-info">
                {activity.current_unit.unit_type} — {activity.current_unit.unit_id}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Completion progress */}
      {total > 0 && (
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <SectionLabel>Completion Progress</SectionLabel>
            <span className="font-mono text-sm text-muted-foreground">
              {completed} / {total} slices
            </span>
          </div>
          <ProgressBar value={completed} max={total} color="emerald" />
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>{pct}% complete</span>
            <span>{total - completed} remaining</span>
          </div>
        </div>
      )}

      {/* Stats grid — completionRate/sessionCost/sessionTokens not in VCCA type → show "—" */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Completion Rate"  value="—"                              accent="sky" />
        <StatCard label="Session Cost"     value="—"                              accent="emerald" />
        <StatCard label="Session Tokens"   value="—"                              accent="amber" />
        <StatCard label="Completed Units"  value={String(activity.completed_units)} />
      </div>

      {/* Recent completed units */}
      {data.units.filter((u) => u.finished_at > 0).length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border bg-muted/20 px-6 py-4">
            <SectionLabel>Recent Completed Units</SectionLabel>
          </div>
          <div className="divide-y divide-border/40">
            {data.units
              .filter((u) => u.finished_at > 0)
              .slice(-5)
              .reverse()
              .map((u, i) => (
                <div
                  key={`${u.id}-${i}`}
                  className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-muted/30"
                >
                  <span className="w-12 font-mono text-xs text-muted-foreground">
                    {formatTime(u.started_at)}
                  </span>
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-status-success" />
                  <span className="flex-1 truncate text-sm font-medium">{u.unit_type}</span>
                  <span className="font-mono text-xs text-muted-foreground">{u.id}</span>
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {formatDuration(u.finished_at - u.started_at)}
                  </span>
                  <span className="font-mono text-xs tabular-nums font-semibold">
                    {formatCost(u.cost)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Health overview */}
      {data.health && (data.health.milestones_total > 0 || data.health.slices_total > 0) && (
        <div className="rounded-xl border border-border bg-card p-6">
          <SectionLabel>Health Overview</SectionLabel>
          <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Milestones</p>
              <p className="font-medium tabular-nums">{data.health.milestones_done}/{data.health.milestones_total}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Slices</p>
              <p className="font-medium tabular-nums">{data.health.slices_done}/{data.health.slices_total}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Tasks</p>
              <p className="font-medium tabular-nums">{data.health.tasks_done}/{data.health.tasks_total}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Changes Tab ──────────────────────────────────────────────────────────────

interface ChangeEntry {
  milestoneId: string;
  sliceId: string;
  title: string;
  oneLiner: string;
  filesModified: ChangelogEntry2['files_modified'];
  completedAt: string | null;
}

function ChangesTab({ data }: { data: VisualizerData }) {
  const missingSummaries = data.stats.milestones_missing_summary + data.stats.slices_missing_summary;

  // Build changelog from milestones tree
  const entries: ChangeEntry[] = data.milestones.flatMap((ms: VisualizerMilestone2) =>
    ms.slices.flatMap((sl: VisualizerSlice2) =>
      sl.changelog.map((e: ChangelogEntry2) => ({
        milestoneId: ms.id,
        sliceId: e.slice_id,
        title: sl.title,
        oneLiner: e.one_liner,
        filesModified: e.files_modified,
        completedAt: e.completed_at,
      })),
    ),
  );

  if (entries.length === 0 && missingSummaries === 0) {
    return <EmptyState message="No completed slices yet." icon={Activity} />;
  }

  // Sort by completedAt descending
  const sorted = [...entries].sort((a, b) => {
    if (!a.completedAt && !b.completedAt) return 0;
    if (!a.completedAt) return 1;
    if (!b.completedAt) return -1;
    return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
  });

  return (
    <div className="space-y-4">
      {missingSummaries > 0 && (
        <div className="rounded-lg border border-status-warning/30 bg-status-warning/5 px-4 py-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{missingSummaries}</span> {missingSummaries === 1 ? 'summary' : 'summaries'} missing
          ({data.stats.milestones_missing_summary > 0 && `${data.stats.milestones_missing_summary} milestone`}
          {data.stats.milestones_missing_summary > 0 && data.stats.slices_missing_summary > 0 && ', '}
          {data.stats.slices_missing_summary > 0 && `${data.stats.slices_missing_summary} slice`})
        </div>
      )}
      {sorted.map((entry, i) => (
        <div
          key={`${entry.milestoneId}-${entry.sliceId}-${i}`}
          className="overflow-hidden rounded-xl border border-border bg-card"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-muted/20 px-6 py-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-status-success" />
              <span className="font-mono text-xs font-bold text-status-success">
                {entry.milestoneId}/{entry.sliceId}
              </span>
              <span className="text-sm font-semibold">{entry.title}</span>
            </div>
            {entry.completedAt && (
              <span className="text-xs text-muted-foreground">
                {formatRelativeTime(entry.completedAt)}
              </span>
            )}
          </div>

          <div className="space-y-5 px-6 py-5">
            {/* One-liner */}
            {entry.oneLiner && (
              <p className="border-l-2 border-muted pl-4 text-sm italic leading-relaxed text-muted-foreground">
                &ldquo;{entry.oneLiner}&rdquo;
              </p>
            )}

            {/* Files modified */}
            {entry.filesModified.length > 0 && (
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Files Modified
                </p>
                <div className="space-y-2">
                  {entry.filesModified.map((f, fi) => (
                    <div
                      key={fi}
                      className="flex items-start gap-3 rounded-lg bg-muted/30 px-4 py-2.5"
                    >
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-status-success/70" />
                      <span className="font-mono text-xs font-medium text-muted-foreground">
                        {f.path}
                      </span>
                      {f.description && (
                        <span className="ml-1 text-xs text-muted-foreground/60">
                          — {f.description}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Export Tab ───────────────────────────────────────────────────────────────

function ExportTab({ data }: { data: VisualizerData }) {
  const [jsonCopied, setJsonCopied] = useState(false);
  const [mdCopied, setMdCopied] = useState(false);
  const { copyToClipboard: copy } = useCopyToClipboard({ showToast: false });

  const generateMarkdown = useCallback(() => {
    const lines: string[] = [];
    lines.push('# GSD Workflow Report');
    lines.push('');
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');
    lines.push('## Milestones');
    lines.push('');
    for (const ms of data.milestones) {
      const icon = ms.status === 'done' ? '✓' : ms.status === 'active' ? '▸' : '○';
      lines.push(`### ${icon} ${ms.id}: ${ms.title} (${ms.status})`);
      if (ms.dependencies.length > 0) lines.push(`Depends on: ${ms.dependencies.join(', ')}`);
      lines.push('');
      for (const sl of ms.slices) {
        const slIcon = sl.done ? '✓' : sl.status === 'active' ? '▸' : '○';
        lines.push(`- ${slIcon} **${sl.id}**: ${sl.title} [risk: ${sl.risk ?? 'low'}]`);
        for (const t of sl.tasks) {
          const tIcon = t.done ? '✓' : t.status === 'active' ? '▸' : '○';
          lines.push(`  - ${tIcon} ${t.id}: ${t.title}`);
        }
      }
      lines.push('');
    }
    if (data.totals) {
      lines.push('## Metrics Summary');
      lines.push('');
      lines.push('| Metric | Value |');
      lines.push('|--------|-------|');
      lines.push(`| Units | ${data.totals.units} |`);
      lines.push(`| Total Cost | ${formatCost(data.totals.total_cost)} |`);
      lines.push(`| Duration | ${formatDuration(data.totals.duration_ms)} |`);
      lines.push(`| Tokens | ${formatTokenCount(data.totals.total_tokens)} |`);
      lines.push('');
    }
    if (data.critical_path.path.length > 0) {
      lines.push('## Critical Path');
      lines.push('');
      const mPath = [...new Set(data.critical_path.path.map((p: string) => p.split('/')[0]))];
      lines.push(`Milestone: ${mPath.join(' → ')}`);
      if (data.critical_path.path.length > 0) {
        lines.push(`Slices: ${data.critical_path.path.join(' → ')}`);
      }
      lines.push('');
    }
    // Changelog from milestones
    const changeEntries = data.milestones.flatMap((ms: VisualizerMilestone2) =>
      ms.slices.flatMap((sl: VisualizerSlice2) =>
        sl.changelog.map((e: ChangelogEntry2) => ({
          header: `${ms.id}/${e.slice_id}: ${sl.title}`,
          oneLiner: e.one_liner,
          files: e.files_modified,
          completedAt: e.completed_at,
        })),
      ),
    );
    if (changeEntries.length > 0) {
      lines.push('## Changelog');
      lines.push('');
      for (const entry of changeEntries) {
        lines.push(`### ${entry.header}`);
        if (entry.oneLiner) lines.push(`> ${entry.oneLiner}`);
        if (entry.files.length > 0) {
          lines.push('Files:');
          for (const f of entry.files) lines.push(`- \`${f.path}\` — ${f.description}`);
        }
        if (entry.completedAt) lines.push(`Completed: ${entry.completedAt}`);
        lines.push('');
      }
    }
    return lines.join('\n');
  }, [data]);

  const copyToClipboard = useCallback(
    async (text: string, setCopied: (v: boolean) => void) => {
      const success = await copy(text);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    },
    [copy],
  );

  const handleCopyJson = () =>
    copyToClipboard(JSON.stringify(data, null, 2), setJsonCopied);
  const handleCopyMarkdown = () =>
    copyToClipboard(generateMarkdown(), setMdCopied);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6">
        <SectionLabel>Export Project Data</SectionLabel>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Copy the current visualizer data to your clipboard. Markdown includes milestones,
          metrics, critical path, and changelog in a readable format. JSON contains the full
          raw data payload.
        </p>

        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          {/* Markdown copy */}
          <button
            onClick={handleCopyMarkdown}
            className="group flex items-center gap-5 rounded-xl border border-border bg-muted/20 p-5 text-left transition-all hover:border-status-info/40 hover:bg-status-info/5"
          >
            <div className="rounded-xl border border-status-info/20 bg-status-info/10 p-4 transition-colors group-hover:bg-status-info/15">
              <FileText className="h-6 w-6 text-status-info" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold transition-colors group-hover:text-status-info">
                {mdCopied ? 'Copied!' : 'Copy Markdown'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Human-readable report with tables and structure
              </p>
            </div>
            <Download className="h-4 w-4 shrink-0 text-muted-foreground/0 transition-all group-hover:text-status-info/70" />
          </button>

          {/* JSON copy */}
          <button
            onClick={handleCopyJson}
            className="group flex items-center gap-5 rounded-xl border border-border bg-muted/20 p-5 text-left transition-all hover:border-status-success/40 hover:bg-status-success/5"
          >
            <div className="rounded-xl border border-status-success/20 bg-status-success/10 p-4 transition-colors group-hover:bg-status-success/15">
              <Download className="h-6 w-6 text-status-success" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold transition-colors group-hover:text-status-success">
                {jsonCopied ? 'Copied!' : 'Copy JSON'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Full raw data payload for tooling and automation
              </p>
            </div>
            <Download className="h-4 w-4 shrink-0 text-muted-foreground/0 transition-all group-hover:text-status-success/70" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function Gsd2VisualizerTab({
  projectId,
}: {
  projectId: string;
  projectPath: string;
}) {
  const { data, isLoading, error, refetch } = useGsd2VisualizerData(projectId);
  const [activeTab, setActiveTab] = useState<TabValue>('progress');

  // Loading state
  if (isLoading && !data) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading visualizer data…</p>
        </div>
      </div>
    );
  }

  // Error state (no cached data)
  if (error && !data) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="rounded-full border border-status-warning/20 bg-status-warning/10 p-4">
            <AlertTriangle className="h-6 w-6 text-status-warning" />
          </div>
          <div>
            <p className="text-sm font-semibold">Failed to load visualizer</p>
            <p className="mt-1.5 max-w-sm text-xs text-muted-foreground">
              {error instanceof Error ? error.message : String(error)}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="mt-1 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => setActiveTab(v as TabValue)}
      className="flex h-full flex-col overflow-hidden"
    >
      {/* Tab bar */}
      <TabsList
        className={cn(
          'sticky top-0 z-10 flex h-auto w-full justify-center',
          'rounded-none border-b border-border bg-background px-6 py-0',
          '-mt-6 -mx-6 w-[calc(100%+3rem)]',
        )}
      >
        {TABS.map(({ value, label, Icon }) => (
          <TabsTrigger
            key={value}
            value={value}
            className={cn(
              'group relative flex items-center gap-2 px-4 py-3.5 text-sm font-medium outline-none',
              'rounded-none text-muted-foreground transition-colors duration-150',
              'hover:text-foreground',
              'data-[state=active]:text-foreground data-[state=active]:shadow-none',
            )}
          >
            {/* Active bottom border indicator */}
            <span
              className={cn(
                'pointer-events-none absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full',
                'bg-foreground opacity-0 transition-opacity duration-150',
                'group-data-[state=active]:opacity-100',
              )}
            />
            <Icon className="relative h-4 w-4 shrink-0" />
            <span className="relative">{label}</span>
          </TabsTrigger>
        ))}
      </TabsList>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-7 py-7">
          <TabsContent value="progress">
            <ProgressTab data={data} />
          </TabsContent>
          <TabsContent value="deps">
            <DepsTab data={data} />
          </TabsContent>
          <TabsContent value="metrics">
            <MetricsTab data={data} />
          </TabsContent>
          <TabsContent value="timeline">
            <TimelineTab data={data} />
          </TabsContent>
          <TabsContent value="agent">
            <AgentTab data={data} />
          </TabsContent>
          <TabsContent value="changes">
            <ChangesTab data={data} />
          </TabsContent>
          <TabsContent value="export">
            <ExportTab data={data} />
          </TabsContent>
        </div>
      </div>
    </Tabs>
  );
}
