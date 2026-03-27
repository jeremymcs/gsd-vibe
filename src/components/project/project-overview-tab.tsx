// GSD VibeFlow - Project Overview Tab Component
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ActivityFeed } from '@/components/project';
import { QuickActionsBar } from './quick-actions-bar';
import { GitStatusWidget } from './git-status-widget';
import { DependencyAlertsCard } from './dependency-alerts-card';
import { RequirementsCard } from './requirements-card';
import { VisionCard } from './vision-card';
import { RoadmapProgressCard } from './roadmap-progress-card';
import type { Project } from '@/lib/tauri';
import { useGsdState, useGsdTodos, useGsdConfig, useGsdSync } from '@/lib/queries';
import { formatRelativeTime } from '@/lib/utils';
import {
  CheckSquare,
  AlertTriangle,
  Crosshair,
  Settings2,
  Gauge,
  Timer,
  GitBranch,
  FolderOpen,
  Calendar,
  Code2,
  Database,
  Package,
  TestTube,
  Layers,
} from 'lucide-react';

interface ProjectOverviewTabProps {
  project: Project;
  onOpenShell: () => void;
}

export function ProjectOverviewTab({
  project,
  onOpenShell,
}: ProjectOverviewTabProps) {
  const gsdSync = useGsdSync();
  const hasPlanning = project.tech_stack?.has_planning ?? false;
  const isGsd1 = hasPlanning && project.gsd_version !== 'gsd2';

  return (
    <div className="space-y-4 pb-4">
      {/* Quick Actions */}
      <QuickActionsBar
        onOpenShell={onOpenShell}
        onSyncGsd={isGsd1 ? () => gsdSync.mutate(project.id) : undefined}
        isSyncingGsd={gsdSync.isPending}
        hasPlanning={isGsd1}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ── GSD-1 cards ── */}
        {isGsd1 && <GsdStateCard projectId={project.id} />}
        {isGsd1 && <RoadmapProgressCard projectId={project.id} />}
        {isGsd1 && <VisionCard projectPath={project.path} />}
        {isGsd1 && <RequirementsCard projectId={project.id} />}

        {/* ── always-present cards ── */}
        <GitStatusWidget projectPath={project.path} />
        <DependencyAlertsCard projectId={project.id} projectPath={project.path} />
        <ActivityFeed projectId={project.id} limit={15} />

        {/* ── Project snapshot card ── */}
        <ProjectSnapshotCard project={project} />
      </div>
    </div>
  );
}

// ── Project Snapshot Card ───────────────────────────────────────────────────
// Rich at-a-glance card replacing the old "Project Details" table.

function ProjectSnapshotCard({ project }: { project: Project }) {
  const ts = project.tech_stack;
  // roadmap_progress only exists on ProjectWithStats, not Project — omit progress bar here

  const stackItems = [
    ts?.language && { icon: <Code2 className="h-3.5 w-3.5" />, label: 'Language', value: ts.language },
    ts?.framework && { icon: <Layers className="h-3.5 w-3.5" />, label: 'Framework', value: ts.framework },
    ts?.package_manager && { icon: <Package className="h-3.5 w-3.5" />, label: 'Package manager', value: ts.package_manager },
    ts?.database && { icon: <Database className="h-3.5 w-3.5" />, label: 'Database', value: ts.database },
    ts?.test_framework && { icon: <TestTube className="h-3.5 w-3.5" />, label: 'Test framework', value: ts.test_framework },
  ].filter(Boolean) as { icon: React.ReactNode; label: string; value: string }[];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
          Project Snapshot
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Status + GSD version badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="capitalize">{project.status}</Badge>
          {project.gsd_version && (
            <Badge variant="outline" className="text-[10px]">
              {project.gsd_version === 'gsd2' ? 'GSD-2' : project.gsd_version === 'gsd1' ? 'GSD-1' : project.gsd_version}
            </Badge>
          )}
          {project.is_favorite && (
            <Badge variant="outline" className="text-[10px] text-gsd-cyan border-gsd-cyan/30">
              ★ Favorite
            </Badge>
          )}
        </div>

        {/* Description */}
        {project.description && (
          <p className="text-sm text-muted-foreground">{project.description}</p>
        )}

        {/* Roadmap progress — only if overview receives ProjectWithStats in future */}

        {/* Tech stack grid */}
        {stackItems.length > 0 && (
          <div className="border-t pt-3 grid grid-cols-2 gap-x-4 gap-y-2">
            {stackItems.map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <span className="text-muted-foreground shrink-0">{item.icon}</span>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground/70 leading-none">{item.label}</p>
                  <p className="text-xs font-medium truncate">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Timestamps */}
        <div className="border-t pt-3 flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Added
            </span>
            <span className="text-muted-foreground tabular-nums">
              {formatRelativeTime(project.created_at)}
            </span>
          </div>
        </div>

        {/* Path */}
        <div className="border-t pt-2">
          <p className="text-[10px] text-muted-foreground/60 font-mono truncate" title={project.path}>
            {project.path}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ── GSD State Card ──────────────────────────────────────────────────────────

function GsdStateCard({ projectId }: { projectId: string }) {
  const { data: state } = useGsdState(projectId);
  const { data: todos } = useGsdTodos(projectId);
  const { data: config } = useGsdConfig(projectId);

  const pendingCount = (todos ?? []).filter((t) => t.status === 'pending').length;
  const blockerCount = (todos ?? []).filter((t) => t.is_blocker && t.status === 'pending').length;
  const pos = state?.current_position;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Crosshair className="h-4 w-4 text-muted-foreground" />
          GSD State
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {pos && (
          <div className="space-y-1.5">
            {pos.milestone && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Milestone</span>
                <span className="font-medium">{pos.milestone}</span>
              </div>
            )}
            {pos.phase && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Phase</span>
                <span className="font-medium">{pos.phase}</span>
              </div>
            )}
            {pos.status && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium capitalize">{pos.status}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 pt-1">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <CheckSquare className="h-3 w-3" />
            {pendingCount} pending todos
          </span>
          {blockerCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-status-error">
              <AlertTriangle className="h-3 w-3" />
              {blockerCount} blocker{blockerCount > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {state?.velocity && (
          <div className="border-t pt-2 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <Gauge className="h-3 w-3 text-muted-foreground" />
              Velocity
            </div>
            <div className="flex items-center gap-3">
              {state.velocity.total_plans != null && (
                <span className="text-xs text-muted-foreground">{state.velocity.total_plans} plans</span>
              )}
              {state.velocity.avg_duration && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Timer className="h-3 w-3" />
                  avg {state.velocity.avg_duration}
                </span>
              )}
              {state.velocity.total_time && (
                <span className="text-xs text-muted-foreground">total {state.velocity.total_time}</span>
              )}
            </div>
          </div>
        )}

        {(state?.blockers?.length ?? 0) > 0 && (
          <div className="border-t pt-2">
            <div className="flex items-center gap-1.5 text-xs text-status-error">
              <AlertTriangle className="h-3 w-3" />
              {state!.blockers.length} blocker{state!.blockers.length > 1 ? 's' : ''}
            </div>
            <div className="mt-1 space-y-0.5">
              {state!.blockers.map((b, i) => (
                <p key={i} className="text-xs text-muted-foreground pl-4">- {b}</p>
              ))}
            </div>
          </div>
        )}

        {(state?.decisions?.length ?? 0) > 0 && (
          <div className="border-t pt-2">
            <div className="flex items-center gap-1.5 text-xs font-medium mb-1">
              <GitBranch className="h-3 w-3 text-muted-foreground" />
              Decisions
            </div>
            <div className="space-y-0.5">
              {state!.decisions.slice(0, 5).map((d, i) => (
                <p key={i} className="text-xs text-muted-foreground pl-4">- {d}</p>
              ))}
              {state!.decisions.length > 5 && (
                <p className="text-xs text-muted-foreground/60 pl-4">
                  +{state!.decisions.length - 5} more — see GSD &gt; Context tab
                </p>
              )}
            </div>
          </div>
        )}

        {config && (config.workflow_mode || config.model_profile) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground border-t pt-2">
            <Settings2 className="h-3 w-3" />
            {config.workflow_mode && <span>{config.workflow_mode}</span>}
            {config.model_profile && <span>/ {config.model_profile}</span>}
          </div>
        )}

        {config && (config.depth || config.parallelization != null || config.workflow_research != null) && (
          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
            {config.depth && (
              <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground">depth: {config.depth}</span>
            )}
            {config.parallelization != null && (
              <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                parallel: {config.parallelization ? 'on' : 'off'}
              </span>
            )}
            {config.workflow_research != null && (
              <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                research: {config.workflow_research ? 'on' : 'off'}
              </span>
            )}
            {config.workflow_inspection != null && (
              <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                inspect: {config.workflow_inspection ? 'on' : 'off'}
              </span>
            )}
          </div>
        )}

        {!pos && !config && (
          <p className="text-xs text-muted-foreground">No GSD state found. Run /gsd:progress to update.</p>
        )}
      </CardContent>
    </Card>
  );
}
