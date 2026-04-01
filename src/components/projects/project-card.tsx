// VCCA - Shared Project Card Component
// Enriched card with stats, git info, progress, costs, todos, and favorites
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Link, useNavigate } from 'react-router-dom';
import {
  Star,
  Terminal,
  Map,
  GitBranch,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckSquare,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useGitInfo, useToggleFavorite, useGsdTodos } from '@/lib/queries';
import { formatCost, formatRelativeTime, truncatePath, cn } from '@/lib/utils';
import {
  getStatusClasses,
  getProjectType,
  projectTypeConfig,
  type Status,
} from '@/lib/design-tokens';
import type { ProjectWithStats } from '@/lib/tauri';

interface ProjectCardProps {
  project: ProjectWithStats;
  showDescription?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}

export function ProjectCard({ project, showDescription, selected, onToggleSelect }: ProjectCardProps) {
  const navigate = useNavigate();
  const { data: gitInfo } = useGitInfo(project.path);
  const toggleFavorite = useToggleFavorite();
  const hasGsd = !!project.tech_stack?.has_planning;

  // Live GSD todos for blocker/todo counts
  const { data: todos } = useGsdTodos(hasGsd ? project.id : '', 'pending');
  const pendingTodos = todos ?? [];
  const blockerCount = pendingTodos.filter((t) => t.is_blocker).length;
  const todoCount = pendingTodos.length;

  const handleQuickAction = (
    e: React.MouseEvent,
    action: 'shell' | 'plan'
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (action === 'shell') {
      void navigate(`/projects/${project.id}?view=shell`);
    } else {
      void navigate(`/projects/${project.id}?view=gsd`);
    }
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite.mutate(project.id);
  };

  const handleCheckboxChange = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleSelect?.();
  };

  const projectType = getProjectType(project.tech_stack, project.gsd_version);
  const typeConfig = projectTypeConfig[projectType];

  const fp = project.roadmap_progress;
  const progressPct =
    fp && fp.total_tasks > 0
      ? Math.round(
          (fp.completed_tasks / fp.total_tasks) * 100
        )
      : 0;

  return (
    <Link
      to={`/projects/${project.id}`}
      className="block p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors group"
    >
      {/* Row 1: Name + Running indicator */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Checkbox for selection */}
          {onToggleSelect && (
            <div onClick={handleCheckboxChange} className="shrink-0">
              <Checkbox checked={selected} aria-label="Select project" />
            </div>
          )}

          {/* Favorite star */}
          <Button
            variant="ghost"
            size="icon-xs"
            className={cn(
              'h-6 w-6 shrink-0',
              project.is_favorite
                ? 'text-gsd-cyan hover:text-gsd-cyan/80'
                : 'text-muted-foreground/40 hover:text-gsd-cyan opacity-0 group-hover:opacity-100'
            )}
            onClick={handleToggleFavorite}
            aria-label={
              project.is_favorite ? 'Remove from favorites' : 'Add to favorites'
            }
          >
            <Star
              className={cn('h-3.5 w-3.5', project.is_favorite && 'fill-current')}
            />
          </Button>

          <h3 className="font-semibold truncate">
            {project.name}
          </h3>

          {/* Project type badge */}
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  'text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0',
                  typeConfig.classes
                )}
              >
                {typeConfig.label}
              </span>
            </TooltipTrigger>
            <TooltipContent>{typeConfig.tooltip}</TooltipContent>
          </Tooltip>
        </div>

        {/* Quick Actions + Status */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon-xs"
              className="h-7 w-7 rounded-md hover:bg-muted hover:text-foreground"
              onClick={(e) => handleQuickAction(e, 'shell')}
              title="Open Shell"
              aria-label="Open Shell"
            >
              <Terminal className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              className="h-7 w-7 rounded-md hover:bg-muted hover:text-foreground"
              onClick={(e) => handleQuickAction(e, 'plan')}
              title="View Plan"
              aria-label="View Plan"
            >
              <Map className="h-3.5 w-3.5" />
            </Button>
          </div>

          <span
            className={cn(
              'text-xs px-2 py-1 rounded-full',
              getStatusClasses(project.status as Status).combined
            )}
          >
            {project.status}
          </span>
        </div>
      </div>

      {/* Row 2: Path */}
      <p className="text-sm text-muted-foreground truncate mt-1 ml-8">
        {truncatePath(project.path)}
      </p>

      {/* Row 3: Description (optional) */}
      {showDescription && project.description && (
        <p className="text-sm text-muted-foreground/80 truncate mt-1 ml-8">
          {project.description}
        </p>
      )}

      {/* Row 4: Tech stack badges + Git branch + GSD info */}
      <div className="flex items-center gap-2 mt-2 ml-8 flex-wrap">
        {project.tech_stack?.framework && (
          <span className="text-xs bg-muted px-2 py-0.5 rounded">
            {project.tech_stack.framework}
          </span>
        )}
        {project.tech_stack?.language && (
          <span className="text-xs bg-muted px-2 py-0.5 rounded">
            {project.tech_stack.language}
          </span>
        )}
        {gitInfo?.has_git && gitInfo.branch && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  'text-xs px-2 py-0.5 rounded inline-flex items-center gap-1',
                  gitInfo.is_dirty
                    ? 'bg-status-warning/10 text-status-warning border border-status-warning/20'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                <GitBranch className="h-3 w-3" />
                {gitInfo.branch}
                {gitInfo.is_dirty && ' *'}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {gitInfo.is_dirty
                ? 'Uncommitted changes'
                : `On branch ${gitInfo.branch}`}
            </TooltipContent>
          </Tooltip>
        )}
        {(project.gsd_version === 'gsd2' || project.gsd_version === 'gsd1') && (
          <Badge
            variant={project.gsd_version === 'gsd2' ? 'subtle-cyan' : 'secondary'}
            size="sm"
          >
            {project.gsd_version === 'gsd2' ? 'GSD-2' : 'GSD-1'}
          </Badge>
        )}
        {project.tech_stack?.gsd_phase_count != null && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/60 border border-border/50 rounded px-2 py-0.5">
            <Layers className="h-3 w-3" />
            {project.tech_stack.gsd_phase_count}{' '}
            {project.tech_stack.gsd_phase_count === 1 ? 'phase' : 'phases'}
          </span>
        )}
        {blockerCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-status-error bg-status-error/10 border border-status-error/20 rounded px-2 py-0.5">
                <AlertTriangle className="h-3 w-3" />
                {blockerCount} {blockerCount === 1 ? 'blocker' : 'blockers'}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {blockerCount} blocking {blockerCount === 1 ? 'todo' : 'todos'} need attention
            </TooltipContent>
          </Tooltip>
        )}
        {todoCount > 0 && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/60 border border-border/50 rounded px-2 py-0.5">
            <CheckSquare className="h-3 w-3" />
            {todoCount} {todoCount === 1 ? 'todo' : 'todos'}
          </span>
        )}
      </div>

      {/* Row 5: Progress bar + Cost + Last activity */}
      <div className="flex items-center gap-3 mt-2.5 ml-8">
        {/* Roadmap progress — tasks + phases */}
        {fp && fp.total_tasks > 0 && (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Progress
              value={progressPct}
              variant="default"
              size="sm"
              className="flex-1 max-w-[140px]"
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
              {fp.completed_tasks}/{fp.total_tasks} tasks
            </span>
            {fp.total_phases > 0 && (
              <span className="text-[10px] text-muted-foreground/60 whitespace-nowrap tabular-nums">
                ({fp.completed_phases}/{fp.total_phases} phases)
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 ml-auto shrink-0">
          {/* Cost badge */}
          {project.total_cost > 0 && (
            <Badge variant="subtle-cyan" size="sm">
              <DollarSign className="h-3 w-3 mr-0.5" />
              {formatCost(project.total_cost)}
            </Badge>
          )}

          {/* Last activity */}
          {project.last_activity_at && (
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatRelativeTime(project.last_activity_at)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
