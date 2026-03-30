// GSD VibeFlow - Project Overview Tab Component
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ActivityFeed } from '@/components/project';
import { QuickActionsBar } from './quick-actions-bar';
import { GitStatusWidget } from './git-status-widget';
import { DependencyAlertsCard } from './dependency-alerts-card';
import { RequirementsCard } from './requirements-card';
import { VisionCard } from './vision-card';
import { RoadmapProgressCard } from './roadmap-progress-card';
import type { Project } from '@/lib/tauri';
import { useGsdState, useGsdTodos, useGsdConfig, useGsdSync, useScannerSummary, useEnvironmentInfo } from '@/lib/queries';
import {
  CheckSquare,
  AlertTriangle,
  Crosshair,
  Settings2,
  Gauge,
  Timer,
  GitBranch,
  Search,
  Monitor,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GSD State — primary card for GSD-1 projects */}
        {isGsd1 && <GsdStateCard projectId={project.id} />}

        {/* Roadmap Progress — phase completion from ROADMAP.md */}
        {isGsd1 && <RoadmapProgressCard projectId={project.id} />}

        {/* Vision (PROJECT.md) */}
        {isGsd1 && <VisionCard projectPath={project.path} />}

        {/* Requirements Coverage (REQUIREMENTS.md) */}
        {isGsd1 && <RequirementsCard projectId={project.id} />}

        {/* Scanner Summary (non-GSD projects) */}
        {!isGsd1 && <ScannerSummaryCard projectPath={project.path} />}

        {/* Environment Info (non-GSD projects) */}
        {!isGsd1 && <EnvironmentInfoCard projectPath={project.path} />}

        {/* Git Status */}
        <GitStatusWidget projectPath={project.path} />

        {/* Dependency Alerts */}
        <DependencyAlertsCard projectId={project.id} projectPath={project.path} />

        {/* Activity Feed */}
        <ActivityFeed projectId={project.id} limit={15} />

        {/* Project Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-medium capitalize">{project.status}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Framework</p>
                <p className="font-medium">{project.tech_stack?.framework || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Language</p>
                <p className="font-medium">{project.tech_stack?.language || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Package Manager</p>
                <p className="font-medium">{project.tech_stack?.package_manager || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Database</p>
                <p className="font-medium">{project.tech_stack?.database || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Test Framework</p>
                <p className="font-medium">{project.tech_stack?.test_framework || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">GSD Planning</p>
                <p className="font-medium">{project.tech_stack?.has_planning ? 'Yes' : 'No'}</p>
              </div>
            </div>
            {project.description && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-1">Description</p>
                <p className="text-sm">{project.description}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// --- GSD State Card ---

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

// --- Scanner Summary Card (for non-GSD projects) ---

function ScannerSummaryCard({ projectPath }: { projectPath: string }) {
  const { data: summary, isLoading, error } = useScannerSummary(projectPath);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Search className="h-4 w-4 text-muted-foreground" />
            Tech Stack
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-xs text-muted-foreground">Scanning...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !summary) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Search className="h-4 w-4 text-muted-foreground" />
            Tech Stack
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground text-center py-4">
            Scanner not available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Search className="h-4 w-4 text-muted-foreground" />
          Project Scanner
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Categories */}
        {summary.categories && summary.categories.length > 0 && (
          <div>
            <div className="text-xs font-medium mb-1">Categories</div>
            <div className="space-y-1">
              {summary.categories.slice(0, 4).map((cat, i) => (
                <div key={i} className="flex items-center justify-between text-xs p-1.5 bg-muted/50 rounded">
                  <span className="font-medium">{cat.name}</span>
                  <span className={cn(
                    'px-1.5 py-0.5 rounded text-[10px] font-medium',
                    cat.grade === 'A' ? 'bg-green-500/20 text-green-700' :
                    cat.grade === 'B' ? 'bg-blue-500/20 text-blue-700' :
                    cat.grade === 'C' ? 'bg-yellow-500/20 text-yellow-700' :
                    'bg-red-500/20 text-red-700'
                  )}>
                    {cat.grade}
                  </span>
                </div>
              ))}
              {summary.categories.length > 4 && (
                <div className="text-xs text-muted-foreground/60">
                  +{summary.categories.length - 4} more categories
                </div>
              )}
            </div>
          </div>
        )}

        {/* Overall grade */}
        {summary.overall_grade && (
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-xs font-medium">Overall Grade</span>
            <span className={cn(
              'px-2 py-1 rounded text-sm font-bold',
              summary.overall_grade === 'A' ? 'bg-green-500/20 text-green-700' :
              summary.overall_grade === 'B' ? 'bg-blue-500/20 text-blue-700' :
              summary.overall_grade === 'C' ? 'bg-yellow-500/20 text-yellow-700' :
              'bg-red-500/20 text-red-700'
            )}>
              {summary.overall_grade}
            </span>
          </div>
        )}

        {/* High priority actions - show more items */}
        {summary.high_priority_actions && summary.high_priority_actions.length > 0 && (
          <div className="pt-2 border-t">
            <div className="text-xs font-medium mb-1 text-orange-700">Priority Actions</div>
            <div className="space-y-0.5">
              {summary.high_priority_actions.slice(0, 5).map((action, i) => (
                <div key={i} className="text-xs text-muted-foreground p-1 bg-orange-500/10 rounded">
                  • {action}
                </div>
              ))}
              {summary.high_priority_actions.length > 5 && (
                <div className="text-xs text-muted-foreground/60">
                  +{summary.high_priority_actions.length - 5} more actions
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stats - gaps and recommendations */}
        {((summary.total_gaps !== undefined && summary.total_gaps !== null) || 
          (summary.total_recommendations !== undefined && summary.total_recommendations !== null)) && (
          <div className="border-t pt-2">
            <div className="text-xs font-medium mb-2">Summary Stats</div>
            <div className="grid grid-cols-2 gap-3">
              {(summary.total_gaps !== undefined && summary.total_gaps !== null) && (
                <div className="flex items-center justify-between p-2 bg-red-500/10 rounded">
                  <span className="text-xs text-muted-foreground">Gaps</span>
                  <span className="text-xs font-bold text-red-700">{summary.total_gaps}</span>
                </div>
              )}
              {(summary.total_recommendations !== undefined && summary.total_recommendations !== null) && (
                <div className="flex items-center justify-between p-2 bg-blue-500/10 rounded">
                  <span className="text-xs text-muted-foreground">Recommendations</span>
                  <span className="text-xs font-bold text-blue-700">{summary.total_recommendations}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Environment Info Card (for non-GSD projects) ---

function EnvironmentInfoCard({ projectPath }: { projectPath: string }) {
  const { data: envInfo, isLoading, error } = useEnvironmentInfo(projectPath);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Monitor className="h-4 w-4 text-muted-foreground" />
            Environment Info
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-xs text-muted-foreground">Loading...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !envInfo) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Monitor className="h-4 w-4 text-muted-foreground" />
            Environment Info
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground text-center py-4">
            Environment info not available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Monitor className="h-4 w-4 text-muted-foreground" />
          Environment Info
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Working Directory */}
        <div>
          <div className="text-xs text-muted-foreground mb-1">Working Directory</div>
          <div className="text-xs font-mono bg-muted/50 p-2 rounded break-all">
            {envInfo.working_directory}
          </div>
        </div>

        {/* Git Branch */}
        {envInfo.git_branch && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Git Branch</div>
            <div className="flex items-center gap-1.5">
              <GitBranch className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-medium">{envInfo.git_branch}</span>
            </div>
          </div>
        )}

        {/* Runtime Versions */}
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">Runtime Versions</div>
          <div className="grid grid-cols-1 gap-2">
            {envInfo.node_version && (
              <div className="flex items-center justify-between text-xs p-1.5 bg-muted/50 rounded">
                <span className="text-muted-foreground">Node.js</span>
                <span className="font-medium">{envInfo.node_version}</span>
              </div>
            )}
            {envInfo.python_version && (
              <div className="flex items-center justify-between text-xs p-1.5 bg-muted/50 rounded">
                <span className="text-muted-foreground">Python</span>
                <span className="font-medium">{envInfo.python_version}</span>
              </div>
            )}
            {envInfo.rust_version && (
              <div className="flex items-center justify-between text-xs p-1.5 bg-muted/50 rounded">
                <span className="text-muted-foreground">Rust</span>
                <span className="font-medium">{envInfo.rust_version}</span>
              </div>
            )}
          </div>
          
          {!envInfo.node_version && !envInfo.python_version && !envInfo.rust_version && (
            <div className="text-xs text-muted-foreground text-center py-2">
              No runtime versions detected
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
