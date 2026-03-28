// GSD Vibe - Project Card (dashboard grid item)
// Rich card with GSD-2 health metrics, progress, git, and activity
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import React from 'react';
import { Link } from 'react-router-dom';
import {
  Star,
  GitBranch,
  Clock,
  AlertTriangle,
  CheckSquare,
  Layers,
  Zap,
  ListTodo,
  CircleDot,
  Activity,
} from 'lucide-react';
import { useToggleFavorite, useGsdTodos, useGsd2Health } from '@/lib/queries';
import { formatRelativeTime, cn, cleanDescription } from '@/lib/utils';
import { getProjectType, projectTypeConfig } from '@/lib/design-tokens';
import type { ProjectWithStats, GitInfo } from '@/lib/tauri';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';

interface ProjectCardProps {
  project: ProjectWithStats;
  gitInfo: GitInfo | null;
}

export const ProjectCard = React.memo(function ProjectCard({
  project,
  gitInfo,
}: ProjectCardProps) {
  const toggleFavorite = useToggleFavorite();
  const isGsd2 = project.gsd_version === 'gsd2';
  const isGsd1 = project.tech_stack?.has_planning && !isGsd2;
  const hasGsd = !!project.tech_stack?.has_planning;

  // GSD-1: fetch todos. GSD-2: fetch health (includes M/S/T progress + active unit)
  const { data: todos } = useGsdTodos(isGsd1 ? project.id : '', 'pending');
  const { data: health } = useGsd2Health(isGsd2 ? project.id : '', isGsd2);

  const handleStar = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite.mutate(project.id);
  };

  const projectType = getProjectType(project.tech_stack, project.gsd_version);
  const typeConfig = projectTypeConfig[projectType];

  // GSD-1 progress from roadmap_progress
  const fp = project.roadmap_progress;
  const gsd1ProgressPct =
    fp && fp.total_tasks > 0
      ? Math.round((fp.completed_tasks / fp.total_tasks) * 100)
      : null;

  // GSD-2 progress from health
  const gsd2SlicesPct =
    health && health.slices_total > 0
      ? Math.round((health.slices_done / health.slices_total) * 100)
      : null;
  const gsd2TasksPct =
    health && health.tasks_total > 0
      ? Math.round((health.tasks_done / health.tasks_total) * 100)
      : null;

  // GSD-1 live stats
  const pendingTodos = todos ?? [];
  const blockerCount = pendingTodos.filter((t) => t.is_blocker).length;
  const todoCount = pendingTodos.length;

  return (
    <Link to={`/projects/${project.id}`} className="block w-full">
      <Card className="h-full hover:border-border/80 transition-colors">
        {/* Header */}
        <div className="flex items-start gap-2 p-4 pb-0">
          <button
            onClick={handleStar}
            className={cn(
              'p-0.5 rounded shrink-0 mt-0.5',
              project.is_favorite
                ? 'text-gsd-cyan'
                : 'text-muted-foreground/30 hover:text-gsd-cyan',
            )}
            aria-label={project.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Star className={cn('h-4 w-4', project.is_favorite && 'fill-current')} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground truncate text-sm flex-1">
                {project.name}
              </h3>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className={cn(
                      'text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0',
                      typeConfig.classes,
                    )}
                  >
                    {typeConfig.label}
                  </span>
                </TooltipTrigger>
                <TooltipContent>{typeConfig.tooltip}</TooltipContent>
              </Tooltip>
            </div>
            {/* Description */}
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1 min-h-[2rem]">
              {cleanDescription(project.description) ?? <span className="italic opacity-50">No description</span>}
            </p>
          </div>
        </div>

        <CardContent className="p-4 pt-3 space-y-3">
          {/* ── GSD-2 block ── */}
          {isGsd2 && health && (
            <>
              {/* Active unit pill */}
              {health.active_milestone_id ? (
                <div className="flex items-center gap-2 flex-wrap">
                  {health.active_milestone_id && (
                    <div className="flex items-center gap-1.5">
                      <CircleDot className="h-3 w-3 text-status-success" />
                      <span className="text-[10px] font-medium text-foreground/80 truncate max-w-[180px]">
                        {health.active_milestone_id}
                        {health.active_slice_id && (
                          <span className="text-muted-foreground"> / {health.active_slice_id}</span>
                        )}
                      </span>
                    </div>
                  )}
                  {health.phase && (
                    <Badge variant="secondary" size="sm" className="text-[9px] uppercase tracking-wide">
                      {health.phase}
                    </Badge>
                  )}
                  {health.blocker && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-status-error bg-status-error/10 border border-status-error/20 rounded px-1.5 py-0.5">
                          <AlertTriangle className="h-2.5 w-2.5" />
                          blocker
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[200px]">{health.blocker}</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Badge variant="secondary" size="sm">GSD-2</Badge>
                  {health.phase && (
                    <span className="text-[10px] text-muted-foreground">{health.phase}</span>
                  )}
                </div>
              )}

              {/* M / S / T counters */}
              <div className="grid grid-cols-3 gap-2">
                <StatCounter
                  icon={<Layers className="h-3 w-3" />}
                  done={health.milestones_done}
                  total={health.milestones_total}
                  label="M"
                />
                <StatCounter
                  icon={<Zap className="h-3 w-3" />}
                  done={health.slices_done}
                  total={health.slices_total}
                  label="S"
                />
                <StatCounter
                  icon={<CheckSquare className="h-3 w-3" />}
                  done={health.tasks_done}
                  total={health.tasks_total}
                  label="T"
                />
              </div>

              {/* Slice progress bar */}
              {gsd2SlicesPct !== null && health.slices_total > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Slices</span>
                    <span className="tabular-nums">{gsd2SlicesPct}%</span>
                  </div>
                  <Progress
                    value={gsd2SlicesPct}
                    className="h-1"
                    indicatorClassName={cn(
                      gsd2SlicesPct >= 66
                        ? 'bg-status-success'
                        : gsd2SlicesPct >= 33
                          ? 'bg-status-warning'
                          : 'bg-muted-foreground/40',
                    )}
                  />
                  {gsd2TasksPct !== null && health.tasks_total > 0 && (
                    <Progress
                      value={gsd2TasksPct}
                      className="h-0.5 opacity-40"
                    />
                  )}
                </div>
              )}
            </>
          )}

          {/* ── GSD-2 no-health skeleton ── */}
          {isGsd2 && !health && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" size="sm">GSD-2</Badge>
              <span className="text-[10px] text-muted-foreground">Loading…</span>
            </div>
          )}

          {/* ── GSD-1 block ── */}
          {isGsd1 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" size="sm">GSD-1</Badge>

                {project.tech_stack?.gsd_phase_count != null && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/60 border border-border/50 rounded px-1.5 py-0.5">
                    {project.tech_stack.gsd_phase_count}{' '}
                    {project.tech_stack.gsd_phase_count === 1 ? 'phase' : 'phases'}
                  </span>
                )}

                {blockerCount > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-status-error bg-status-error/10 border border-status-error/20 rounded px-1.5 py-0.5">
                        <AlertTriangle className="h-2.5 w-2.5" />
                        {blockerCount} {blockerCount === 1 ? 'blocker' : 'blockers'}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{blockerCount} blocking todos</TooltipContent>
                  </Tooltip>
                )}

                {todoCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/60 border border-border/50 rounded px-1.5 py-0.5">
                    <ListTodo className="h-2.5 w-2.5" />
                    {todoCount} {todoCount === 1 ? 'todo' : 'todos'}
                  </span>
                )}
              </div>

              {gsd1ProgressPct !== null && fp && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Tasks</span>
                    <span className="tabular-nums">{fp.completed_tasks}/{fp.total_tasks}</span>
                  </div>
                  <Progress value={gsd1ProgressPct} className="h-1" />
                </div>
              )}
            </div>
          )}

          {/* ── bare project ── */}
          {!hasGsd && (
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <Activity className="h-3 w-3" />
              <span>No GSD workflow</span>
            </div>
          )}

          {/* Info row: git + last activity */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground pt-0.5 border-t border-border/30 flex-wrap">
            {gitInfo?.has_git && gitInfo.branch ? (
              <span
                className={cn(
                  'inline-flex items-center gap-1 truncate max-w-[130px]',
                  gitInfo.is_dirty && 'text-status-warning',
                )}
              >
                <GitBranch className="h-3 w-3 shrink-0" />
                <span className="truncate">
                  {gitInfo.branch}
                  {gitInfo.is_dirty ? ' *' : ''}
                </span>
              </span>
            ) : (
              <span className="text-muted-foreground/40 text-[10px]">no git</span>
            )}
            {project.last_activity_at && (
              <span className="inline-flex items-center gap-1 ml-auto whitespace-nowrap">
                <Clock className="h-3 w-3 shrink-0" />
                {formatRelativeTime(project.last_activity_at)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
});

// ── helper ──

function StatCounter({
  icon,
  done,
  total,
  label,
}: {
  icon: React.ReactNode;
  done: number;
  total: number;
  label: string;
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-0.5 rounded-md bg-muted/40 border border-border/30 px-2 py-1.5">
      <div className="flex items-center gap-1 text-muted-foreground">
        {icon}
        <span className="text-[9px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-xs font-semibold tabular-nums">
        {done}
        <span className="text-muted-foreground font-normal">/{total}</span>
      </div>
      <div className="h-0.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            pct === 100 ? 'bg-status-success' : pct > 0 ? 'bg-primary' : 'bg-muted-foreground/20',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
