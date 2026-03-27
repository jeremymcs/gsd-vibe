// GSD VibeFlow - Dashboard Status Bar
// Aggregate stats across all projects: counts, GSD-2 totals, active sessions
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import React from 'react';
import { FolderOpen, ListTodo, AlertTriangle, Zap, Activity, GitBranch } from 'lucide-react';
import { useQueries } from '@tanstack/react-query';
import { useProjectsWithStats } from '@/lib/queries';
import { queryKeys } from '@/lib/query-keys';
import * as api from '@/lib/tauri';
import { cn } from '@/lib/utils';

export function StatusBar() {
  const { data: projects } = useProjectsWithStats();

  const gsd2Projects = (projects ?? []).filter((p) => p.gsd_version === 'gsd2');
  const gsd1Projects = (projects ?? []).filter(
    (p) => p.tech_stack?.has_planning && p.gsd_version !== 'gsd2',
  );
  const projectCount = projects?.length ?? 0;

  // Batch health queries for all GSD-2 projects (cheap, already cached by project cards)
  const healthQueries = useQueries({
    queries: gsd2Projects.map((p) => ({
      queryKey: queryKeys.gsd2Health(p.id),
      queryFn: () => api.gsd2GetHealth(p.id),
      enabled: !!p.id,
      staleTime: 5_000,
    })),
  });

  // Aggregate GSD-2 health data
  const gsd2Stats = healthQueries.reduce(
    (acc, q) => {
      const h = q.data;
      if (!h) return acc;
      return {
        milestonesDone: acc.milestonesDone + h.milestones_done,
        milestonesTotal: acc.milestonesTotal + h.milestones_total,
        slicesDone: acc.slicesDone + h.slices_done,
        slicesTotal: acc.slicesTotal + h.slices_total,
        tasksDone: acc.tasksDone + h.tasks_done,
        tasksTotal: acc.tasksTotal + h.tasks_total,
        blockers: acc.blockers + (h.blocker ? 1 : 0),
        active: acc.active + (h.active_milestone_id ? 1 : 0),
      };
    },
    {
      milestonesDone: 0,
      milestonesTotal: 0,
      slicesDone: 0,
      slicesTotal: 0,
      tasksDone: 0,
      tasksTotal: 0,
      blockers: 0,
      active: 0,
    },
  );

  // GSD-1 todos from tech_stack
  const gsd1Todos = gsd1Projects.reduce(
    (sum, p) => sum + (p.tech_stack?.gsd_todo_count ?? 0),
    0,
  );

  const hasGsd2 = gsd2Projects.length > 0;
  const hasGsd1 = gsd1Projects.length > 0;

  return (
    <div className="flex items-center gap-1 px-4 py-2 rounded-lg border bg-card/50 flex-wrap">
      {/* Total projects */}
      <Stat
        icon={<FolderOpen className="h-3.5 w-3.5" />}
        value={projectCount}
        label={projectCount === 1 ? 'project' : 'projects'}
      />

      <Sep />

      {/* GSD-2 project count */}
      {hasGsd2 && (
        <>
          <Stat
            icon={<Activity className="h-3.5 w-3.5" />}
            value={gsd2Projects.length}
            label={`GSD-2 ${gsd2Projects.length === 1 ? 'project' : 'projects'}`}
          />
          <Sep />
          {/* Active GSD-2 projects */}
          {gsd2Stats.active > 0 && (
            <>
              <Stat
                icon={
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-success opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-status-success" />
                  </span>
                }
                value={gsd2Stats.active}
                label={gsd2Stats.active === 1 ? 'active' : 'active'}
                accent="success"
              />
              <Sep />
            </>
          )}
          {/* GSD-2 aggregated progress */}
          {gsd2Stats.milestonesTotal > 0 && (
            <>
              <Stat
                icon={<Zap className="h-3.5 w-3.5" />}
                value={gsd2Stats.slicesDone}
                label={`/ ${gsd2Stats.slicesTotal} slices`}
              />
              <Sep />
              <Stat
                value={gsd2Stats.tasksDone}
                label={`/ ${gsd2Stats.tasksTotal} tasks`}
              />
              {gsd2Stats.blockers > 0 && (
                <>
                  <Sep />
                  <Stat
                    icon={<AlertTriangle className="h-3.5 w-3.5" />}
                    value={gsd2Stats.blockers}
                    label={gsd2Stats.blockers === 1 ? 'blocker' : 'blockers'}
                    accent="error"
                  />
                </>
              )}
              <Sep />
            </>
          )}
        </>
      )}

      {/* GSD-1 */}
      {hasGsd1 && (
        <>
          <Stat
            icon={<GitBranch className="h-3.5 w-3.5" />}
            value={gsd1Projects.length}
            label={`GSD-1 ${gsd1Projects.length === 1 ? 'project' : 'projects'}`}
          />
          {gsd1Todos > 0 && (
            <>
              <Sep />
              <Stat
                icon={<ListTodo className="h-3.5 w-3.5" />}
                value={gsd1Todos}
                label="pending todos"
              />
            </>
          )}
        </>
      )}
    </div>
  );
}

function Stat({
  icon,
  value,
  label,
  accent,
}: {
  icon?: React.ReactNode;
  value: number;
  label: string;
  accent?: 'success' | 'error';
}) {
  return (
    <div className="flex items-center gap-1.5 py-0.5">
      {icon && <span className="text-muted-foreground">{icon}</span>}
      <span
        className={cn(
          'font-semibold text-sm',
          accent === 'success' && 'text-status-success',
          accent === 'error' && 'text-status-error',
        )}
      >
        {value}
      </span>
      <span className="text-muted-foreground text-xs">{label}</span>
    </div>
  );
}

function Sep() {
  return <span className="text-border/60 select-none px-0.5">·</span>;
}
