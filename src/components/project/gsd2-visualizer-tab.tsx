// GSD VibeFlow - Visualizer Tab Component
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { useGsd2VisualizerData } from '@/lib/queries';
import { formatCost, formatRelativeTime } from '@/lib/utils';
import type { VisualizerNode, CostByKey, TimelineEntry } from '@/lib/tauri';

interface Gsd2VisualizerTabProps {
  projectId: string;
  projectPath: string;
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'done') {
    return <span className="text-status-success">✔</span>;
  }
  if (status === 'active') {
    return <span className="text-yellow-600 dark:text-yellow-500 animate-pulse">▶</span>;
  }
  return <span className="text-muted-foreground">○</span>;
}

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

export function Gsd2VisualizerTab({ projectId }: Gsd2VisualizerTabProps) {
  const { data, isLoading, error } = useGsd2VisualizerData(projectId);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (data && !initialized) {
      const activeId = data.tree.find((m: VisualizerNode) => m.status === 'active')?.id;
      setExpanded(new Set(activeId ? [activeId] : []));
      setInitialized(true);
    }
  }, [data, initialized]);

  const toggle = (id: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h3 className="text-sm font-semibold mb-4">Progress</h3>
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-8 w-1/2" />
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold mb-4">Cost &amp; Tokens</h3>
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-8 w-1/2" />
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold mb-4">Execution Timeline</h3>
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-8 w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Failed to load visualizer data — check that .gsd/ files are readable.
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const maxMilestoneCost = Math.max(...data.cost_by_milestone.map((c: CostByKey) => c.cost), 0);
  const maxModelCost = Math.max(...data.cost_by_model.map((c: CostByKey) => c.cost), 0);

  return (
    <div className="space-y-8">
      {/* Progress Tree */}
      <div>
        <h3 className="text-sm font-semibold mb-4">Progress</h3>
        {data.tree.map((milestone: VisualizerNode) => (
          <div key={milestone.id}>
            <div
              className="flex items-center gap-2 py-2 cursor-pointer hover:bg-muted/30 rounded px-2"
              onClick={() => toggle(milestone.id)}
            >
              {expanded.has(milestone.id) ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <StatusIcon status={milestone.status} />
              <span className="text-sm font-semibold">{milestone.id} — {milestone.title}</span>
            </div>
            {expanded.has(milestone.id) && milestone.children.map((slice: VisualizerNode) => (
              <div key={slice.id}>
                <div className="flex items-center gap-2 py-1.5 ml-6">
                  <StatusIcon status={slice.status} />
                  <span className="text-sm">{slice.id} — {slice.title}</span>
                </div>
                {slice.children.map((task: VisualizerNode) => (
                  <div key={task.id} className="flex items-center gap-2 py-1 ml-12">
                    <StatusIcon status={task.status} />
                    <span className="text-xs text-muted-foreground">{task.id} — {task.title}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Cost & Tokens */}
      <div>
        <h3 className="text-sm font-semibold mb-4">Cost &amp; Tokens</h3>
        {data.cost_by_milestone.length === 0 && data.cost_by_model.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm font-semibold text-muted-foreground">No metrics yet</p>
              <p className="text-xs text-muted-foreground mt-1">Run a headless session to populate cost and timeline data.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">By Milestone</h4>
              <div className="space-y-2">
                {data.cost_by_milestone.map((c: CostByKey) => (
                  <CostBar key={c.key} label={c.key} cost={c.cost} maxCost={maxMilestoneCost} />
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">By Model</h4>
              <div className="space-y-2">
                {data.cost_by_model.map((c: CostByKey) => (
                  <CostBar key={c.key} label={c.key} cost={c.cost} maxCost={maxModelCost} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Execution Timeline */}
      {data.timeline.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-4">Execution Timeline</h3>
          {data.timeline.map((entry: TimelineEntry) => (
            <div
              key={entry.id}
              className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0 text-xs"
            >
              <span className="w-24 text-muted-foreground shrink-0">
                {entry.completed_at ? formatRelativeTime(entry.completed_at) : '—'}
              </span>
              <span className="flex-1 truncate">{entry.id} — {entry.title}</span>
              <span className="text-right text-muted-foreground shrink-0">{formatCost(entry.cost)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
