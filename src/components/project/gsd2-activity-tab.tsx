// GSD Vibe - GSD-2 Activity Tab
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ViewEmpty } from '@/components/shared/loading-states';
import { useGsd2History } from '@/lib/queries';
import { formatCost, formatTokenCount, formatDuration } from '@/lib/utils';
import { phaseBadgeClass, classifyPhase, HistorySummaryCards } from './gsd2-shared';

interface Gsd2ActivityTabProps {
  projectId: string;
  projectPath: string;
}

export function Gsd2ActivityTab({ projectId }: Gsd2ActivityTabProps) {
  const { data, isLoading, error } = useGsd2History(projectId);

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-md bg-muted/40 animate-pulse" />
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-10 w-full rounded-md bg-muted/40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <p className="text-sm text-status-error">Failed to load activity: {String(error)}</p>
      </div>
    );
  }

  const totals = data?.totals;
  const units = [...(data?.units ?? [])].sort((a, b) => b.started_at - a.started_at);

  if (!totals || units.length === 0) {
    return (
      <ViewEmpty
        icon={<Activity className="h-8 w-8" />}
        message="No unit history yet"
        description="Activity will appear here after a GSD-2 session runs"
      />
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Summary cards */}
      <div className="p-3 pb-0 shrink-0">
        <HistorySummaryCards totals={totals} responsive />
      </div>

      {/* Unit list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {units.map((unit) => {
          const phase = classifyPhase(unit.unit_type);
          const duration = unit.finished_at > 0 ? unit.finished_at - unit.started_at : 0;
          return (
            <div
              key={unit.id}
              className="flex items-center gap-2 rounded-md border border-border/40 bg-muted/20 px-3 py-2 text-xs hover:bg-muted/40 transition-colors"
            >
              <Badge variant="outline" className={`shrink-0 text-[10px] px-1.5 py-0 ${phaseBadgeClass(phase)}`}>
                {phase}
              </Badge>
              <span className="flex-1 truncate font-mono text-foreground/80" title={unit.id}>
                {unit.id}
              </span>
              <span className="shrink-0 text-muted-foreground tabular-nums">{formatCost(unit.cost)}</span>
              <span className="shrink-0 text-muted-foreground tabular-nums">{formatTokenCount(unit.total_tokens)}</span>
              {duration > 0 && (
                <span className="shrink-0 text-muted-foreground/70 tabular-nums">{formatDuration(duration)}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
