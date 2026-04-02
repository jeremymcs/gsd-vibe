// VCCA - Project Card (dashboard grid item)
// Enriched card with stats, git info, progress, costs, and live GSD data
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import React from 'react';
import { Link } from 'react-router-dom';
import {
  Star,
  GitBranch,
  Clock,
  AlertTriangle,
  CheckSquare,
  DollarSign,
  Layers,
  ShieldAlert,
  ExternalLink,
} from 'lucide-react';
import { open as openExternal } from '@tauri-apps/plugin-shell';
import { useDependencyStatus, useToggleFavorite, useGsdTodos } from '@/lib/queries';
import { formatRelativeTime, formatCost, cn } from '@/lib/utils';
import { getTopVulnerability } from '@/lib/dependency-utils';
import {
  getStatusClasses,
  getProjectType,
  projectTypeConfig,
  type Status,
} from '@/lib/design-tokens';
import type { ProjectWithStats, GitInfo } from '@/lib/tauri';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Fixed card height so every card is identical regardless of content
const CARD_HEIGHT = 240;

interface ProjectCardProps {
  project: ProjectWithStats;
  gitInfo: GitInfo | null;
}

export const ProjectCard = React.memo(function ProjectCard({
  project,
  gitInfo,
}: ProjectCardProps) {
  const toggleFavorite = useToggleFavorite();
  const hasGsd = !!project.tech_stack?.has_planning;
  const { data: dependencyStatus } = useDependencyStatus(project.id, project.path);

  // Only fetch GSD todos for GSD projects — no-op for bare projects
  const { data: todos } = useGsdTodos(hasGsd ? project.id : '', 'pending');

  const handleStar = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite.mutate(project.id);
  };

  const projectType = getProjectType(project.tech_stack, project.gsd_version);
  const typeConfig = projectTypeConfig[projectType];

  const fp = project.roadmap_progress;
  const progressPct =
    fp && fp.total_tasks > 0
      ? Math.round((fp.completed_tasks / fp.total_tasks) * 100)
      : null;

  // Derive GSD live stats from todos query (pending only)
  const pendingTodos = todos ?? [];
  const blockerTodos = pendingTodos.filter((t) => t.is_blocker);
  const todoCount = pendingTodos.length;
  const blockerCount = blockerTodos.length;
  const topVulnerability = getTopVulnerability(dependencyStatus?.details ?? null);

  const handleOpenAdvisory = (e: React.MouseEvent, url?: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!url) return;
    void openExternal(url);
  };

  return (
    <Link to={`/projects/${project.id}`} className="block">
      <Card
        className="flex flex-col overflow-hidden"
        style={{ height: CARD_HEIGHT }}
      >
        {/* Header: star + name + status + type badge */}
        <div className="flex items-center gap-2 px-4 pt-4 pb-0">
          <button
            onClick={handleStar}
            className={cn(
              'p-0.5 rounded shrink-0',
              project.is_favorite
                ? 'text-gsd-cyan'
                : 'text-muted-foreground/30 hover:text-gsd-cyan'
            )}
            aria-label={
              project.is_favorite
                ? 'Remove from favorites'
                : 'Add to favorites'
            }
          >
            <Star
              className={cn(
                'h-4 w-4',
                project.is_favorite && 'fill-current'
              )}
            />
          </button>
          <h3 className="font-semibold text-foreground truncate flex-1 text-sm">
            {project.name}
          </h3>
          <span
            className={cn(
              'text-[10px] px-1.5 py-0.5 rounded-full shrink-0',
              getStatusClasses(project.status as Status).combined
            )}
          >
            {project.status}
          </span>
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

        {/* Body: description + stats + progress (flex-1 to fill) */}
        <CardContent className="px-4 pt-2 pb-0 flex-1 flex flex-col gap-2 overflow-hidden">
          {/* Description — always present */}
          <p className="text-xs text-muted-foreground line-clamp-2">
            {project.description || <span className="text-muted-foreground/40">No description</span>}
          </p>

          {/* Tech stack badges */}
          {(project.tech_stack?.framework || project.tech_stack?.language) && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {project.tech_stack.framework && (
                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
                  {project.tech_stack.framework}
                </span>
              )}
              {project.tech_stack.language && (
                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
                  {project.tech_stack.language}
                </span>
              )}
            </div>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {hasGsd ? (
              <>
                {(project.gsd_version === 'gsd2' || project.gsd_version === 'gsd1') && (
                  <Badge
                    variant={project.gsd_version === 'gsd2' ? 'subtle-cyan' : 'secondary'}
                    size="sm"
                  >
                    {project.gsd_version === 'gsd2' ? 'GSD-2' : 'GSD-1'}
                  </Badge>
                )}
                {project.tech_stack?.gsd_phase_count != null && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted/60 border border-border/50 rounded px-1.5 py-0.5">
                    <Layers className="h-2.5 w-2.5" />
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
                    <TooltipContent>
                      {blockerCount} blocking {blockerCount === 1 ? 'todo' : 'todos'} need attention
                    </TooltipContent>
                  </Tooltip>
                )}
                {todoCount > 0 ? (
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/60 border border-border/50 rounded px-1.5 py-0.5">
                    <CheckSquare className="h-2.5 w-2.5" />
                    {todoCount} {todoCount === 1 ? 'todo' : 'todos'}
                  </span>
                ) : blockerCount === 0 ? (
                  <span className="text-[10px] text-muted-foreground/60">No open todos</span>
                ) : null}
                {dependencyStatus && (dependencyStatus.vulnerable_count > 0 || dependencyStatus.outdated_count > 0) && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-status-error bg-status-error/10 border border-status-error/20 rounded px-1.5 py-0.5">
                        <ShieldAlert className="h-2.5 w-2.5" />
                        {dependencyStatus.vulnerable_count > 0
                          ? `${dependencyStatus.vulnerable_count} vuln${dependencyStatus.vulnerable_count === 1 ? '' : 's'}`
                          : `${dependencyStatus.outdated_count} outdated`}
                        {topVulnerability?.vulnerability.url ? (
                          <button
                            type="button"
                            onClick={(e) => handleOpenAdvisory(e, topVulnerability.vulnerability.url)}
                            className="rounded p-0.5 hover:bg-status-error/15"
                            aria-label={`Open advisory for ${topVulnerability.packageName}`}
                          >
                            <ExternalLink className="h-2.5 w-2.5" />
                          </button>
                        ) : null}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      {topVulnerability
                        ? `${topVulnerability.packageName}: ${topVulnerability.vulnerability.title ?? topVulnerability.vulnerability.severity}`
                        : 'Dependency findings detected'}
                    </TooltipContent>
                  </Tooltip>
                )}
              </>
            ) : (
              <span className="text-[10px] text-muted-foreground/60">No planning data</span>
            )}
          </div>

          {/* Progress — tasks + phases */}
          <div className="flex items-center gap-3">
            {progressPct !== null && fp ? (
              <div className="flex-1 flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gsd-cyan rounded-full transition-all"
                    style={{ width: `${Math.min(progressPct, 100)}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                  {fp.completed_tasks}/{fp.total_tasks}
                </span>
                {fp.total_phases > 0 && (
                  <span className="text-[10px] text-muted-foreground/60 whitespace-nowrap tabular-nums">
                    ({fp.completed_phases}/{fp.total_phases} phases)
                  </span>
                )}
              </div>
            ) : (
              <span className="text-xs text-muted-foreground/60">No roadmap</span>
            )}
          </div>
        </CardContent>

        {/* Footer: git + cost + activity — pinned to bottom */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground px-4 pb-3 pt-2 mt-auto">
          {gitInfo?.has_git && gitInfo.branch ? (
            <span
              className={cn(
                'inline-flex items-center gap-1 truncate max-w-[120px]',
                gitInfo.is_dirty && 'text-status-warning'
              )}
            >
              <GitBranch className="h-3 w-3 shrink-0" />
              <span className="truncate">
                {gitInfo.branch}
                {gitInfo.is_dirty ? ' *' : ''}
              </span>
            </span>
          ) : null}

          {project.total_cost > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <DollarSign className="h-3 w-3 shrink-0" />
              {formatCost(project.total_cost)}
            </span>
          )}

          {project.last_activity_at && (
            <span className="inline-flex items-center gap-1 ml-auto">
              <Clock className="h-3 w-3 shrink-0" />
              {formatRelativeTime(project.last_activity_at)}
            </span>
          )}
        </div>
      </Card>
    </Link>
  );
});
