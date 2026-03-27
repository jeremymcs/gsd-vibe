// GSD Vibe - Project Row (dashboard list item)
// Compact row with GSD-2 health metrics and progress
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import React from 'react';
import { Link } from 'react-router-dom';
import {
  Star,
  GitBranch,
  Clock,
  AlertTriangle,
  CheckSquare,
  ListTodo,
  Layers,
  Zap,
  CircleDot,
} from 'lucide-react';
import { useToggleFavorite, useGsdTodos, useGsd2Health } from '@/lib/queries';
import { formatRelativeTime, cn, cleanDescription } from '@/lib/utils';
import { getProjectType, projectTypeConfig } from '@/lib/design-tokens';
import type { ProjectWithStats, GitInfo } from '@/lib/tauri';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface ProjectRowProps {
  project: ProjectWithStats;
  gitInfo: GitInfo | null;
}

export const ProjectRow = React.memo(function ProjectRow({
  project,
  gitInfo,
}: ProjectRowProps) {
  const toggleFavorite = useToggleFavorite();
  const isGsd2 = project.gsd_version === 'gsd2';
  const isGsd1 = !!project.tech_stack?.has_planning && !isGsd2;

  const { data: todos } = useGsdTodos(isGsd1 ? project.id : '', 'pending');
  const { data: health } = useGsd2Health(isGsd2 ? project.id : '', isGsd2);

  const handleStar = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite.mutate(project.id);
  };

  const projectType = getProjectType(project.tech_stack, project.gsd_version);
  const typeConfig = projectTypeConfig[projectType];

  // GSD-1 progress
  const fp = project.roadmap_progress;
  const gsd1Pct =
    fp && fp.total_tasks > 0
      ? Math.round((fp.completed_tasks / fp.total_tasks) * 100)
      : null;

  // GSD-2 progress
  const gsd2Pct =
    health && health.slices_total > 0
      ? Math.round((health.slices_done / health.slices_total) * 100)
      : null;

  // GSD-1 stats
  const pendingTodos = todos ?? [];
  const blockerCount = pendingTodos.filter((t) => t.is_blocker).length;
  const todoCount = pendingTodos.length;

  return (
    <Link
      to={`/projects/${project.id}`}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg border bg-card/50 hover:bg-card/80 hover:border-border/80 transition-colors group"
    >
      {/* Star */}
      <button
        onClick={handleStar}
        className={cn(
          'p-0.5 rounded shrink-0',
          project.is_favorite
            ? 'text-gsd-cyan'
            : 'text-muted-foreground/30 hover:text-gsd-cyan',
        )}
        aria-label={project.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Star className={cn('h-3.5 w-3.5', project.is_favorite && 'fill-current')} />
      </button>

      {/* Name + description */}
      <div className="flex flex-col min-w-0 w-[180px] shrink-0">
        <span className="font-medium text-sm text-foreground truncate">{project.name}</span>
        {cleanDescription(project.description) && (
          <span className="text-[10px] text-muted-foreground truncate">{cleanDescription(project.description)}</span>
        )}
      </div>

      {/* Type badge */}
      <span
        className={cn(
          'text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0',
          typeConfig.classes,
        )}
      >
        {typeConfig.label}
      </span>

      {/* GSD-2 active unit */}
      {isGsd2 && health?.active_milestone_id && (
        <div className="flex items-center gap-1 shrink-0 min-w-0 max-w-[160px]">
          <CircleDot className="h-3 w-3 text-status-success shrink-0" />
          <span className="text-[10px] text-foreground/70 truncate">
            {health.active_milestone_id}
            {health.active_slice_id && `/${health.active_slice_id}`}
          </span>
        </div>
      )}

      {/* GSD-2 M/S/T mini counters */}
      {isGsd2 && health && (
        <div className="flex items-center gap-2 shrink-0 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-0.5">
            <Layers className="h-2.5 w-2.5" />
            <span className="tabular-nums">{health.milestones_done}/{health.milestones_total}</span>
          </span>
          <span className="flex items-center gap-0.5">
            <Zap className="h-2.5 w-2.5" />
            <span className="tabular-nums">{health.slices_done}/{health.slices_total}</span>
          </span>
          <span className="flex items-center gap-0.5">
            <CheckSquare className="h-2.5 w-2.5" />
            <span className="tabular-nums">{health.tasks_done}/{health.tasks_total}</span>
          </span>
        </div>
      )}

      {/* GSD-1 stats */}
      {isGsd1 && (
        <div className="flex items-center gap-1.5 shrink-0">
          {blockerCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-status-error bg-status-error/10 border border-status-error/20 rounded px-1.5 py-0.5">
                  <AlertTriangle className="h-2.5 w-2.5" />
                  {blockerCount}
                </span>
              </TooltipTrigger>
              <TooltipContent>{blockerCount} blocking todos</TooltipContent>
            </Tooltip>
          )}
          {todoCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[9px] text-muted-foreground bg-muted/60 border border-border/50 rounded px-1.5 py-0.5">
              <ListTodo className="h-2.5 w-2.5" />
              {todoCount}
            </span>
          )}
          {isGsd2 && !health && (
            <Badge variant="secondary" size="sm" className="text-[9px]">GSD-2</Badge>
          )}
        </div>
      )}

      {/* Progress bar */}
      <div className="flex items-center gap-2 w-[110px] shrink-0">
        {isGsd2 && gsd2Pct !== null ? (
          <>
            <Progress value={gsd2Pct} className="flex-1 h-1.5" />
            <span className="text-[10px] text-muted-foreground tabular-nums whitespace-nowrap">
              {gsd2Pct}%
            </span>
          </>
        ) : gsd1Pct !== null && fp ? (
          <>
            <Progress value={gsd1Pct} className="flex-1 h-1.5" />
            <span className="text-[10px] text-muted-foreground tabular-nums whitespace-nowrap">
              {fp.completed_tasks}/{fp.total_tasks}
            </span>
          </>
        ) : null}
      </div>

      {/* Git */}
      <div className="w-[90px] shrink-0 truncate">
        {gitInfo?.has_git && gitInfo.branch ? (
          <span
            className={cn(
              'inline-flex items-center gap-1 text-xs truncate',
              gitInfo.is_dirty ? 'text-status-warning' : 'text-muted-foreground',
            )}
          >
            <GitBranch className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {gitInfo.branch}
              {gitInfo.is_dirty ? ' *' : ''}
            </span>
          </span>
        ) : null}
      </div>

      {/* Last activity */}
      <div className="ml-auto shrink-0">
        {project.last_activity_at && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
            <Clock className="h-3 w-3 shrink-0" />
            {formatRelativeTime(project.last_activity_at)}
          </span>
        )}
      </div>
    </Link>
  );
});
