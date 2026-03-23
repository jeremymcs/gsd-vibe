// GSD VibeFlow - GSD-2 Health Tab Component
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Activity, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useGsd2Health } from '@/lib/queries';
import { formatCost } from '@/lib/utils';

interface Gsd2HealthTabProps {
  projectId: string;
  projectPath: string;
}

export function Gsd2HealthTab({ projectId }: Gsd2HealthTabProps) {
  const { data: health, isLoading, isError } = useGsd2Health(projectId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4" /> GSD Health
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4" /> GSD Health
          </CardTitle>
        </CardHeader>
        <CardContent className="py-4 text-center text-sm text-status-error">
          Failed to load health data — check that the project path is accessible.
        </CardContent>
      </Card>
    );
  }

  if (!health || (health.budget_spent === 0 && !health.active_milestone_id)) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4" /> GSD Health
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No health data yet — run a GSD-2 session to populate metrics.
        </CardContent>
      </Card>
    );
  }

  const budgetPct = health.budget_ceiling
    ? Math.round((health.budget_spent / health.budget_ceiling) * 100)
    : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Activity className="h-4 w-4" /> GSD Health
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Budget row */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span>Budget</span>
            <span>
              {formatCost(health.budget_spent)}
              {health.budget_ceiling ? ` / ${formatCost(health.budget_ceiling)}` : ''}
            </span>
          </div>
          {budgetPct !== null && (
            <Progress
              value={budgetPct}
              variant={budgetPct > 80 ? 'warning' : 'brand'}
              size="sm"
            />
          )}
        </div>

        {/* Blocker row (conditional) */}
        {health.blocker && (
          <div className="flex items-center gap-2 p-2 rounded border border-status-error/20 bg-status-error/10">
            <AlertCircle className="h-4 w-4 text-status-error flex-shrink-0" />
            <span className="text-sm text-status-error">{health.blocker}</span>
          </div>
        )}

        {/* Active unit row */}
        {health.active_milestone_id && (
          <div className="text-xs space-y-1">
            <div>
              <span className="text-muted-foreground">Active Milestone:</span>{' '}
              {health.active_milestone_id}
              {health.active_milestone_title ? ` — ${health.active_milestone_title}` : ''}
            </div>
            <div>
              <span className="text-muted-foreground">Active Slice:</span>{' '}
              {health.active_slice_id
                ? `${health.active_slice_id}${health.active_slice_title ? ` — ${health.active_slice_title}` : ''}`
                : 'None'}
            </div>
            {health.phase && (
              <div>
                <span className="text-muted-foreground">Phase:</span> {health.phase}
              </div>
            )}
            {health.next_action && (
              <div className="text-xs p-2 rounded bg-muted/40 border border-border/30">
                <span className="text-muted-foreground font-medium">Next: </span>
                {health.next_action}
              </div>
            )}
          </div>
        )}

        {/* Env error/warning counts */}
        {(health.env_error_count > 0 || health.env_warning_count > 0) && (
          <div className="flex items-center gap-2">
            {health.env_error_count > 0 && (
              <Badge variant="error" size="sm">
                {health.env_error_count} error{health.env_error_count !== 1 ? 's' : ''}
              </Badge>
            )}
            {health.env_warning_count > 0 && (
              <Badge variant="warning" size="sm">
                {health.env_warning_count} warning{health.env_warning_count !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        )}

        {/* Progress counters */}
        <div className="grid grid-cols-3 gap-2 text-xs text-center">
          <div>
            <div className="font-semibold">
              {health.milestones_done}/{health.milestones_total}
            </div>
            <div className="text-muted-foreground">Milestones</div>
          </div>
          <div>
            <div className="font-semibold">
              {health.slices_done}/{health.slices_total}
            </div>
            <div className="text-muted-foreground">Slices</div>
          </div>
          <div>
            <div className="font-semibold">
              {health.tasks_done}/{health.tasks_total}
            </div>
            <div className="text-muted-foreground">Tasks</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
