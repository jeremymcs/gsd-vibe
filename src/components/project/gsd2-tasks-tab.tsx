// Track Your Shit - GSD-2 Tasks Tab Component
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useGsd2Milestones,
  useGsd2Milestone,
  useGsd2Slice,
  useGsd2DerivedState,
} from '@/lib/queries';
import type { Gsd2TaskItem } from '@/lib/tauri';

interface Gsd2TasksTabProps {
  projectId: string;
  projectPath: string;
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'done') {
    return <span className="text-status-success">✔</span>;
  }
  if (status === 'active') {
    return <span className="text-yellow-500 animate-pulse">▶</span>;
  }
  return <span className="text-muted-foreground">○</span>;
}

function getTaskStatus(task: Gsd2TaskItem, activeTaskId: string | null): 'done' | 'active' | 'pending' {
  if (task.done) return 'done';
  if (activeTaskId && task.id === activeTaskId) return 'active';
  return 'pending';
}

interface SliceTaskGroupProps {
  projectId: string;
  milestoneId: string;
  sliceId: string;
  sliceTitle: string;
  activeTaskId: string | null;
}

function SliceTaskGroup({
  projectId,
  milestoneId,
  sliceId,
  sliceTitle,
  activeTaskId,
}: SliceTaskGroupProps) {
  const { data: slice, isLoading, isError } = useGsd2Slice(projectId, milestoneId, sliceId, true);

  if (isLoading) {
    return (
      <div className="mb-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
          {sliceTitle}
        </p>
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (isError || !slice) {
    return (
      <div className="mb-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
          {sliceTitle}
        </p>
        <p className="text-xs text-status-error">Failed to load tasks for this slice.</p>
      </div>
    );
  }

  // Filter out done tasks — Tasks tab shows active + pending only
  const activePendingTasks = slice.tasks.filter((t) => !t.done);

  if (activePendingTasks.length === 0) {
    return null;
  }

  // Sort: active task first, then pending
  const sortedTasks = [...activePendingTasks].sort((a, b) => {
    const aStatus = getTaskStatus(a, activeTaskId);
    const bStatus = getTaskStatus(b, activeTaskId);
    if (aStatus === 'active' && bStatus !== 'active') return -1;
    if (bStatus === 'active' && aStatus !== 'active') return 1;
    return 0;
  });

  return (
    <div className="mb-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 px-3">
        {sliceTitle}
      </p>
      <div className="space-y-0.5">
        {sortedTasks.map((task) => {
          const taskStatus = getTaskStatus(task, activeTaskId);
          return (
            <div key={task.id} className="flex items-center gap-2 py-2 px-3">
              <StatusIcon status={taskStatus} />
              <span className="text-xs font-mono text-muted-foreground">{task.id}</span>
              <span className="text-sm">{task.title}</span>
              <Badge
                variant="outline"
                className={
                  taskStatus === 'active'
                    ? 'bg-status-warning/10 text-status-warning border-status-warning/30 ml-auto text-xs'
                    : 'bg-status-pending/10 text-status-pending border-status-pending/30 ml-auto text-xs'
                }
              >
                {taskStatus === 'active' ? 'Active' : 'Pending'}
              </Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ActiveMilestoneTasksProps {
  projectId: string;
  activeMilestoneId: string;
  activeTaskId: string | null;
}

function ActiveMilestoneTasks({
  projectId,
  activeMilestoneId,
  activeTaskId,
}: ActiveMilestoneTasksProps) {
  const { data: milestone, isLoading, isError } = useGsd2Milestone(
    projectId,
    activeMilestoneId,
    true,
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4 space-y-2">
          <Skeleton className="h-4 w-1/4 mb-2" />
          <Skeleton className="h-8 w-full mb-1" />
          <Skeleton className="h-8 w-full mb-1" />
          <Skeleton className="h-8 w-full mb-1" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !milestone) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-status-error">
            Failed to load tasks — check that the project path is accessible.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Get all non-done slices from the active milestone
  const activeSlices = milestone.slices.filter((s) => !s.done);

  if (activeSlices.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            No active or pending tasks — all done, or no GSD-2 session has run yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-2 pt-4">
        {activeSlices.map((s) => (
          <SliceTaskGroup
            key={s.id}
            projectId={projectId}
            milestoneId={activeMilestoneId}
            sliceId={s.id}
            sliceTitle={s.title}
            activeTaskId={activeTaskId}
          />
        ))}
      </CardContent>
    </Card>
  );
}

export function Gsd2TasksTab({ projectId }: Gsd2TasksTabProps) {
  const { data: milestones, isLoading: milestonesLoading, isError: milestonesError } =
    useGsd2Milestones(projectId);
  const { data: derivedState, isLoading: stateLoading } = useGsd2DerivedState(projectId);

  const isLoading = milestonesLoading || stateLoading;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4 space-y-2">
          <Skeleton className="h-4 w-1/4 mb-2" />
          <Skeleton className="h-8 w-full mb-1" />
          <Skeleton className="h-8 w-full mb-1" />
          <Skeleton className="h-8 w-full mb-1" />
        </CardContent>
      </Card>
    );
  }

  if (milestonesError) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-status-error">
            Failed to load tasks — check that the project path is accessible.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!milestones || milestones.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            No active or pending tasks — all done, or no GSD-2 session has run yet
          </p>
        </CardContent>
      </Card>
    );
  }

  const activeMilestoneId = derivedState?.active_milestone_id ?? null;
  const activeTaskId = derivedState?.active_task_id ?? null;

  if (!activeMilestoneId) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            No active or pending tasks — all done, or no GSD-2 session has run yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <ActiveMilestoneTasks
      projectId={projectId}
      activeMilestoneId={activeMilestoneId}
      activeTaskId={activeTaskId}
    />
  );
}
