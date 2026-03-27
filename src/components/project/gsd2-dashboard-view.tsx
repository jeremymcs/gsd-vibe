// GSD VibeFlow - GSD-2 Dashboard View
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { LayoutDashboard } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useGsd2History } from '@/lib/queries';
import { formatCost, formatTokenCount, formatDuration } from '@/lib/utils';

interface Gsd2DashboardViewProps {
  projectId: string;
  projectPath: string;
}

const PHASE_ORDER = ['execution', 'completion', 'planning', 'research', 'reassessment'];

function phaseColor(phase: string): string {
  switch (phase) {
    case 'execution':    return 'text-status-success';
    case 'completion':   return 'text-status-info';
    case 'planning':     return 'text-status-warning';
    case 'research':     return 'text-primary';
    case 'reassessment': return 'text-muted-foreground';
    default:             return 'text-muted-foreground';
  }
}

export function Gsd2DashboardView({ projectId }: Gsd2DashboardViewProps) {
  const { data, isLoading, error } = useGsd2History(projectId);

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-40" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <p className="text-sm text-status-error">Failed to load dashboard: {String(error)}</p>
      </div>
    );
  }

  const totals = data?.totals;
  const byPhase = data?.by_phase ?? [];
  const byModel = (data?.by_model ?? []).slice(0, 5);

  if (!totals || totals.units === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <LayoutDashboard className="h-10 w-10 text-muted-foreground/40" />
        <div>
          <p className="text-sm font-medium text-foreground">No execution history yet</p>
          <p className="text-xs text-muted-foreground mt-1">Start a headless auto-mode run to populate metrics.</p>
        </div>
      </div>
    );
  }

  // Sort phases in canonical order
  const sortedPhases = [...byPhase].sort((a, b) => {
    const ai = PHASE_ORDER.indexOf(a.phase);
    const bi = PHASE_ORDER.indexOf(b.phase);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4 space-y-4">
      {/* Top stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Total Cost', formatCost(totals.total_cost)],
          ['Tokens', formatTokenCount(totals.total_tokens)],
          ['Units', String(totals.units)],
          ['Duration', formatDuration(totals.duration_ms)],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-semibold tabular-nums">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Phase breakdown */}
      {sortedPhases.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-xs font-medium text-muted-foreground mb-3">Cost by Phase</h3>
            <div className="space-y-2">
              {sortedPhases.map((p) => {
                const pct = totals.total_cost > 0 ? (p.cost / totals.total_cost) * 100 : 0;
                return (
                  <div key={p.phase} className="flex items-center gap-2 text-xs">
                    <span className={`w-24 shrink-0 capitalize ${phaseColor(p.phase)}`}>{p.phase}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary/40 transition-all"
                        style={{ width: `${Math.max(pct, 0.5)}%` }}
                      />
                    </div>
                    <span className="w-16 text-right tabular-nums text-muted-foreground">{formatCost(p.cost)}</span>
                    <span className="w-8 text-right tabular-nums text-muted-foreground/60">{p.units}u</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Model breakdown */}
      {byModel.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-xs font-medium text-muted-foreground mb-3">Top Models by Cost</h3>
            <div className="space-y-1.5">
              {byModel.map((m) => (
                <div key={m.model} className="flex items-center gap-2 text-xs">
                  <span className="flex-1 truncate font-mono text-foreground/80">{m.model}</span>
                  <span className="tabular-nums text-muted-foreground">{formatCost(m.cost)}</span>
                  <span className="tabular-nums text-muted-foreground/60">{formatTokenCount(m.tokens)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
