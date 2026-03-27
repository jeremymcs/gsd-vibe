// GSD VibeFlow - GSD-2 Roadmap Tab
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { useState } from 'react';
import { Map, ChevronRight, ChevronDown, CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useGsd2VisualizerData } from '@/lib/queries';

interface Gsd2RoadmapTabProps {
  projectId: string;
  projectPath: string;
}

function StatusIcon({ status }: { status: 'done' | 'active' | 'pending' }) {
  if (status === 'done')   return <CheckCircle2 className="h-3.5 w-3.5 text-status-success shrink-0" />;
  if (status === 'active') return <Loader2 className="h-3.5 w-3.5 text-status-warning animate-spin shrink-0" />;
  return <Circle className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />;
}

function riskBadgeClass(risk: string | null): string {
  if (!risk) return 'bg-muted text-muted-foreground border-border';
  switch (risk.toLowerCase()) {
    case 'high':   return 'bg-status-error/15 text-status-error border-status-error/30';
    case 'medium': return 'bg-status-warning/15 text-status-warning border-status-warning/30';
    case 'low':    return 'bg-status-success/15 text-status-success border-status-success/30';
    default:       return 'bg-muted text-muted-foreground border-border';
  }
}

export function Gsd2RoadmapTab({ projectId }: Gsd2RoadmapTabProps) {
  const { data, isLoading, error } = useGsd2VisualizerData(projectId);
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set());

  const toggleMilestone = (id: string) => {
    setExpandedMilestones((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <p className="text-sm text-status-error">Failed to load roadmap: {String(error)}</p>
      </div>
    );
  }

  const milestones = data?.milestones ?? [];

  if (milestones.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center p-8">
        <Map className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No milestones found.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {milestones.map((m) => {
          const doneCount = m.slices.filter((s) => s.done).length;
          const totalCount = m.slices.length;
          const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
          const expanded = expandedMilestones.has(m.id);

          return (
            <div key={m.id} className="rounded-md border border-border/40 bg-muted/10 overflow-hidden">
              {/* Milestone row */}
              <button
                onClick={() => toggleMilestone(m.id)}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left hover:bg-muted/30 transition-colors"
              >
                {expanded ? (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                )}
                <StatusIcon status={m.status} />
                <span className="text-xs font-mono text-muted-foreground shrink-0 w-16">{m.id}</span>
                <span className="flex-1 text-sm font-medium text-foreground truncate">{m.title}</span>
                <span className="text-xs text-muted-foreground tabular-nums shrink-0">{doneCount}/{totalCount}</span>
                <div className="w-20 shrink-0">
                  <Progress value={pct} className="h-1.5" />
                </div>
              </button>

              {/* Slices (expanded) */}
              {expanded && totalCount > 0 && (
                <div className="border-t border-border/30 bg-muted/5 divide-y divide-border/20">
                  {m.slices.map((s) => (
                    <div
                      key={s.id}
                      className={cn(
                        'flex items-center gap-2 px-5 py-2 text-xs',
                        s.status === 'active' && 'bg-status-warning/5',
                      )}
                    >
                      <StatusIcon status={s.status} />
                      <span className="font-mono text-muted-foreground shrink-0 w-8">{s.id}</span>
                      <span className="flex-1 text-foreground/80 truncate">{s.title}</span>
                      {s.risk && (
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 shrink-0 ${riskBadgeClass(s.risk)}`}>
                          {s.risk}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
