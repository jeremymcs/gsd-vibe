// GSD Vibe - GSD-2 Command Panels
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { useState } from 'react';
import {
  History, Zap, Search, Compass, Undo2, FileOutput,
  GitBranch, AlertTriangle, Copy, Check, GitCommit,
  CheckCircle2, XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  useGsd2History,
  useGsd2Hooks,
  useGsd2Inspect,
  useGsd2SteerContent,
  useGsd2SetSteerContent,
  useGsd2UndoInfo,
  useGsd2ExportProgress,
  useGsd2GitSummary,
  useGsd2RecoveryInfo,
} from '@/lib/queries';
import { formatCost, formatTokenCount, formatDuration } from '@/lib/utils';
import { phaseBadgeClass, classifyPhase, HistorySummaryCards } from './gsd2-shared';

// ─── Shared Loading / Error / Empty helpers ───────────────────────────────────

function PanelLoading() {
  return (
    <div className="p-4 space-y-3">
      {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
    </div>
  );
}

function PanelError({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center p-8 text-center">
      <p className="text-sm text-status-error">{message}</p>
    </div>
  );
}

function PanelEmpty({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <Icon className="h-10 w-10 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

interface PanelProps {
  projectId: string;
  projectPath: string;
}

function PanelWrapper({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border/50 px-4 py-2.5 shrink-0">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-medium">{title}</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

// ─── 1. History Panel ─────────────────────────────────────────────────────────

export function Gsd2HistoryPanel({ projectId }: PanelProps) {
  const { data, isLoading, error } = useGsd2History(projectId);

  if (isLoading) return <PanelLoading />;
  if (error) return <PanelError message={`Failed to load history: ${error}`} />;

  const units = [...(data?.units ?? [])].sort((a, b) => b.started_at - a.started_at);
  if (units.length === 0) return <PanelWrapper title="History" icon={History}><PanelEmpty icon={History} message="No unit history yet." /></PanelWrapper>;

  const totals = data!.totals;

  return (
    <PanelWrapper title="History" icon={History}>
      {/* Totals row */}
      <div className="p-3 pb-0">
        <HistorySummaryCards totals={totals} />
      </div>
      {/* Unit rows */}
      <div className="p-3 space-y-1">
        {units.map((unit) => {
          const phase = classifyPhase(unit.unit_type);
          const duration = unit.finished_at > 0 ? unit.finished_at - unit.started_at : 0;
          return (
            <div key={unit.id} className="flex items-center gap-2 rounded border border-border/40 bg-muted/10 px-2.5 py-1.5 text-xs hover:bg-muted/30 transition-colors">
              <Badge variant="outline" className={`shrink-0 text-[10px] px-1 py-0 ${phaseBadgeClass(phase)}`}>
                {unit.unit_type.split('-')[0]}
              </Badge>
              <span className="flex-1 truncate font-mono text-foreground/80" title={unit.id}>{unit.id}</span>
              <span className="shrink-0 text-muted-foreground tabular-nums">{formatCost(unit.cost)}</span>
              <span className="shrink-0 text-muted-foreground tabular-nums">{formatTokenCount(unit.total_tokens)}</span>
              {duration > 0 && <span className="shrink-0 text-muted-foreground/70 tabular-nums">{formatDuration(duration)}</span>}
            </div>
          );
        })}
      </div>
    </PanelWrapper>
  );
}

// ─── 2. Hooks Panel ───────────────────────────────────────────────────────────

export function Gsd2HooksPanel({ projectId }: PanelProps) {
  const { data, isLoading, error } = useGsd2Hooks(projectId);

  if (isLoading) return <PanelLoading />;
  if (error) return <PanelError message={`Failed to load hooks: ${error}`} />;
  if (!data?.hooks.length) return <PanelWrapper title="Hooks" icon={Zap}><PanelEmpty icon={Zap} message="No hooks configured in preferences.md." /></PanelWrapper>;

  return (
    <PanelWrapper title="Hooks" icon={Zap}>
      <div className="p-3 space-y-2">
        {data.hooks.map((hook, i) => (
          <Card key={i}>
            <CardHeader className="py-2 px-3">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-mono">{hook.name}</CardTitle>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">{hook.hook_type}</Badge>
              </div>
            </CardHeader>
            <CardContent className="px-3 pb-2 space-y-1 text-xs">
              {hook.triggers.length > 0 && (
                <div className="text-muted-foreground">
                  <span className="font-medium">triggers: </span>
                  {hook.triggers.join(', ')}
                </div>
              )}
              {hook.action && (
                <div className="text-muted-foreground">
                  <span className="font-medium">action: </span>{hook.action}
                </div>
              )}
              {hook.artifact && (
                <div className="text-muted-foreground">
                  <span className="font-medium">artifact: </span>{hook.artifact}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </PanelWrapper>
  );
}

// ─── 3. Inspect Panel ────────────────────────────────────────────────────────

export function Gsd2InspectPanel({ projectId }: PanelProps) {
  const { data, isLoading, error } = useGsd2Inspect(projectId);

  if (isLoading) return <PanelLoading />;
  if (error) return <PanelError message={`Failed to load inspect data: ${error}`} />;
  if (!data) return <PanelWrapper title="Inspect" icon={Search}><PanelEmpty icon={Search} message="No project data." /></PanelWrapper>;

  return (
    <PanelWrapper title="Inspect" icon={Search}>
      <div className="p-3 space-y-3">
        {/* Metadata row */}
        <div className="grid grid-cols-3 gap-2">
          <Card>
            <CardContent className="p-2 text-center">
              <p className="text-base font-semibold tabular-nums">{data.decision_count}</p>
              <p className="text-[10px] text-muted-foreground">Decisions</p>
              {!data.decisions_file_exists && <p className="text-[10px] text-status-warning">missing</p>}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2 text-center">
              <p className="text-base font-semibold tabular-nums">{data.requirement_count}</p>
              <p className="text-[10px] text-muted-foreground">Requirements</p>
              {!data.requirements_file_exists && <p className="text-[10px] text-status-warning">missing</p>}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2 text-center">
              <p className="text-xs font-mono text-muted-foreground truncate">{data.schema_version ?? '—'}</p>
              <p className="text-[10px] text-muted-foreground">Schema</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent decisions */}
        {data.recent_decisions.length > 0 && (
          <div>
            <h3 className="text-xs font-medium text-muted-foreground mb-1.5">Recent Decisions</h3>
            <div className="space-y-1">
              {data.recent_decisions.map((d, i) => (
                <div key={i} className="text-xs font-mono bg-muted/30 rounded px-2 py-1 text-foreground/80 truncate" title={d}>{d}</div>
              ))}
            </div>
          </div>
        )}

        {/* Recent requirements */}
        {data.recent_requirements.length > 0 && (
          <div>
            <h3 className="text-xs font-medium text-muted-foreground mb-1.5">Recent Requirements</h3>
            <div className="space-y-1">
              {data.recent_requirements.map((r, i) => (
                <div key={i} className="text-xs font-mono bg-muted/30 rounded px-2 py-1 text-foreground/80 truncate" title={r}>{r}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PanelWrapper>
  );
}

// ─── 4. Steer Panel ──────────────────────────────────────────────────────────

export function Gsd2SteerPanel({ projectId }: PanelProps) {
  const { data, isLoading, error } = useGsd2SteerContent(projectId);
  const setSteer = useGsd2SetSteerContent();
  const [draft, setDraft] = useState<string | null>(null);

  const content = draft ?? data?.content ?? '';
  const isDirty = draft !== null && draft !== (data?.content ?? '');

  const handleSave = () => {
    setSteer.mutate({ projectId, content }, {
      onSuccess: () => {
        toast.success('OVERRIDES.md saved.');
        setDraft(null);
      },
      onError: (err) => toast.error(`Save failed: ${err}`),
    });
  };

  if (isLoading) return <PanelLoading />;
  if (error) return <PanelError message={`Failed to load steer content: ${error}`} />;

  return (
    <PanelWrapper title="Steer" icon={Compass}>
      <div className="flex h-full flex-col p-3 gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">OVERRIDES.md</span>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${data?.exists ? '' : 'text-muted-foreground'}`}>
              {data?.exists ? 'exists' : 'will create'}
            </Badge>
          </div>
          <Button size="sm" className="h-7 text-xs" disabled={!isDirty || setSteer.isPending} onClick={handleSave}>
            {setSteer.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
        <Textarea
          value={content}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="# GSD Steer Overrides&#10;&#10;Add override instructions here that will be read by the agent before each dispatch."
          className="flex-1 min-h-0 font-mono text-xs resize-none"
        />
      </div>
    </PanelWrapper>
  );
}

// ─── 5. Undo Panel ───────────────────────────────────────────────────────────

export function Gsd2UndoPanel({ projectId }: PanelProps) {
  const { data, isLoading, error } = useGsd2UndoInfo(projectId);

  if (isLoading) return <PanelLoading />;
  if (error) return <PanelError message={`Failed to load undo info: ${error}`} />;
  if (!data?.file_exists) return (
    <PanelWrapper title="Undo" icon={Undo2}>
      <PanelEmpty icon={Undo2} message="No completed units found (completed-units.json missing)." />
    </PanelWrapper>
  );

  return (
    <PanelWrapper title="Undo" icon={Undo2}>
      <div className="p-3 space-y-3">
        <Card>
          <CardContent className="p-3 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs">Last unit type</span>
              <span className="font-mono text-xs">{data.last_unit_type ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs">Last unit ID</span>
              <span className="font-mono text-xs">{data.last_unit_id ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs">Last unit cost</span>
              <span className="tabular-nums text-xs">{formatCost(data.last_unit_cost)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-border/40 pt-2">
              <span className="text-muted-foreground text-xs">Completed units</span>
              <span className="tabular-nums text-xs font-semibold">{data.completed_units_count}</span>
            </div>
          </CardContent>
        </Card>
        <p className="text-[11px] text-muted-foreground text-center">
          To undo, run <code className="bg-muted px-1 rounded">/gsd undo</code> in the terminal or chat.
        </p>
      </div>
    </PanelWrapper>
  );
}

// ─── 6. Export Panel ─────────────────────────────────────────────────────────

export function Gsd2ExportPanel({ projectId }: PanelProps) {
  const exportMutation = useGsd2ExportProgress();
  const [copied, setCopied] = useState(false);

  const handleGenerate = () => {
    exportMutation.mutate({ projectId }, {
      onError: (err) => toast.error(`Export failed: ${err}`),
    });
  };

  const handleCopy = async () => {
    if (!exportMutation.data?.content) return;
    await navigator.clipboard.writeText(exportMutation.data.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <PanelWrapper title="Export" icon={FileOutput}>
      <div className="flex h-full flex-col p-3 gap-2">
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" className="h-7 text-xs" onClick={handleGenerate} disabled={exportMutation.isPending}>
            {exportMutation.isPending ? 'Generating…' : 'Generate Export'}
          </Button>
          {exportMutation.data && (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleCopy}>
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          )}
          {exportMutation.data && (
            <Badge variant="outline" className="text-[10px]">{exportMutation.data.format}</Badge>
          )}
        </div>
        {exportMutation.data ? (
          <pre className="flex-1 overflow-auto bg-muted/30 rounded border border-border/40 p-3 text-[11px] font-mono whitespace-pre-wrap break-words text-foreground/80">
            {exportMutation.data.content}
          </pre>
        ) : (
          <div className="flex flex-1 items-center justify-center text-muted-foreground text-sm">
            Click Generate Export to produce a markdown summary.
          </div>
        )}
      </div>
    </PanelWrapper>
  );
}

// ─── 7. Git Panel ────────────────────────────────────────────────────────────

export function Gsd2GitPanel({ projectId }: PanelProps) {
  const { data, isLoading, error } = useGsd2GitSummary(projectId);

  if (isLoading) return <PanelLoading />;
  if (error) return <PanelError message={`Failed to load git summary: ${error}`} />;
  if (!data?.has_git) return (
    <PanelWrapper title="Git" icon={GitBranch}>
      <PanelEmpty icon={GitBranch} message="Not a git repository." />
    </PanelWrapper>
  );

  return (
    <PanelWrapper title="Git" icon={GitBranch}>
      <div className="p-3 space-y-3">
        {/* Status row */}
        <Card>
          <CardContent className="p-3 space-y-1.5 text-xs">
            <div className="flex items-center gap-2">
              <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-mono font-semibold">{data.branch ?? 'HEAD detached'}</span>
              {data.is_dirty && <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-status-warning border-status-warning/30">dirty</Badge>}
            </div>
            <div className="flex gap-3 text-muted-foreground">
              {data.staged_count > 0 && <span>+{data.staged_count} staged</span>}
              {data.unstaged_count > 0 && <span>~{data.unstaged_count} unstaged</span>}
              {data.untracked_count > 0 && <span>?{data.untracked_count} untracked</span>}
              {data.ahead > 0 && <span className="text-status-success">↑{data.ahead}</span>}
              {data.behind > 0 && <span className="text-status-error">↓{data.behind}</span>}
            </div>
          </CardContent>
        </Card>

        {/* Recent commits */}
        {data.recent_commits.length > 0 && (
          <div>
            <h3 className="text-xs font-medium text-muted-foreground mb-1.5">Recent Commits</h3>
            <div className="space-y-1">
              {data.recent_commits.map((c) => (
                <div key={c.hash} className="flex items-start gap-2 text-xs">
                  <GitCommit className="h-3 w-3 text-muted-foreground/50 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <span className="font-mono text-muted-foreground/60 mr-2">{c.hash.slice(0, 7)}</span>
                    <span className="text-foreground/80">{c.message}</span>
                    <div className="text-[10px] text-muted-foreground/60">{c.author} · {c.date}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PanelWrapper>
  );
}

// ─── 8. Recovery Panel ───────────────────────────────────────────────────────

export function Gsd2RecoveryPanel({ projectId }: PanelProps) {
  const { data, isLoading, error } = useGsd2RecoveryInfo(projectId);

  if (isLoading) return <PanelLoading />;
  if (error) return <PanelError message={`Failed to load recovery info: ${error}`} />;

  return (
    <PanelWrapper title="Recovery" icon={AlertTriangle}>
      <div className="p-3 space-y-3">
        {/* Lock file status */}
        <Card>
          <CardContent className="p-3 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Lock file</span>
              {data?.lock_exists ? (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-status-warning border-status-warning/30">found</Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-status-success border-status-success/30">clear</Badge>
              )}
            </div>
            {data?.lock_exists && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Process alive</span>
                  {data.is_process_alive ? (
                    <div className="flex items-center gap-1 text-status-success">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>yes (PID {data.pid})</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-status-error">
                      <XCircle className="h-3 w-3" />
                      <span>no</span>
                    </div>
                  )}
                </div>
                {data.unit_type && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Unit type</span>
                    <span className="font-mono">{data.unit_type}</span>
                  </div>
                )}
                {data.unit_id && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Unit ID</span>
                    <span className="font-mono">{data.unit_id}</span>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Suggested action */}
        <div className={`rounded-md border px-3 py-2.5 text-xs ${data?.lock_exists && !data?.is_process_alive ? 'border-status-warning/40 bg-status-warning/5 text-status-warning' : 'border-border/40 bg-muted/20 text-muted-foreground'}`}>
          <p className="font-medium mb-0.5">Suggested action</p>
          <p>{data?.suggested_action ?? 'No active auto-mode run.'}</p>
        </div>
      </div>
    </PanelWrapper>
  );
}
