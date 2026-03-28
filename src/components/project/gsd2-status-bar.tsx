// GSD VibeFlow - GSD-2 Status Bar
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useGsd2VisualizerData } from '@/lib/queries';

interface Gsd2StatusBarProps {
  projectId: string;
}

function useElapsedMs(startMs: number | null): number {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (startMs === null) {
      setElapsed(0);
      return;
    }
    const tick = () => setElapsed(Date.now() - startMs);
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startMs]);

  return elapsed;
}

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

export function Gsd2StatusBar({ projectId }: Gsd2StatusBarProps) {
  // Poll every 5 seconds to update agent state
  const { data } = useGsd2VisualizerData(projectId, true);
  const activity = data?.agent_activity;
  const isActive = activity?.is_active ?? false;
  const currentUnit = activity?.current_unit ?? null;

  // Compute a base timestamp for elapsed tracking
  const startedAtMs = currentUnit?.started_at
    ? new Date(currentUnit.started_at).getTime()
    : null;
  const elapsed = useElapsedMs(isActive ? startedAtMs : null);

  if (!isActive) {
    return (
      <div className="flex items-center gap-2 border-t border-border/40 bg-muted/20 px-4 py-1 text-[11px] text-muted-foreground/60 shrink-0">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
        <span>Agent idle</span>
        {(activity?.completed_units ?? 0) > 0 && (
          <span className="ml-auto tabular-nums">
            {activity!.completed_units} units completed
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      'flex items-center gap-2 border-t border-border/40 px-4 py-1 text-[11px] shrink-0',
      'bg-status-success/5 text-status-success',
    )}>
      <span className="h-1.5 w-1.5 rounded-full bg-status-success animate-pulse" />
      <span className="font-medium">Active</span>
      {currentUnit && (
        <>
          <span className="text-status-success/70">·</span>
          <span className="font-mono truncate max-w-[200px]" title={`${currentUnit.unit_type}/${currentUnit.unit_id}`}>
            {currentUnit.unit_type}/{currentUnit.unit_id}
          </span>
          <span className="text-status-success/70">·</span>
          <span className="tabular-nums">{formatElapsed(elapsed || currentUnit.elapsed_ms)}</span>
        </>
      )}
      <span className="ml-auto tabular-nums text-status-success/60">
        {activity!.completed_units} units done
      </span>
    </div>
  );
}
