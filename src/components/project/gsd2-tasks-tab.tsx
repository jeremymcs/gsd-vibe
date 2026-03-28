// GSD Vibe - GSD-2 Tasks Tab Component
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CircleDot } from 'lucide-react';
import { ViewEmpty } from '@/components/shared/loading-states';
import {
  useGsd2Milestones,
  useGsd2Milestone,
  useGsd2Slice,
  useGsd2DerivedState,
} from '@/lib/queries';
import type { Gsd2TaskItem } from '@/lib/tauri';
import {
  Gsd2StatusIcon,
  Gsd2LoadingCard,
  Gsd2ErrorCard,
  StatusBadge,
} from './gsd2-shared';

interface Gsd2TasksTabProps {
  projectId: string;
  projectPath: string;
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

function SliceTaskGroup({ projectId, milestoneId, sliceId, sliceTitle, activeTaskId }: SliceTaskGroupProps) {
  const { data: slice, isLoading, isError } = useGsd2Slice(projectId, milestoneId, sliceId, true);

  if (isLoading) {
    return (
      <div className="mb-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{sliceTitle}</p>
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (isError || !slice) {
    return (
      <div className="mb-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{sliceTitle}</p>
        <p className="text-xs text-status-error">Failed to load tasks for this slice.</p>
      </div>
    );
  }

  const activePendingTasks = slice.tasks.filter((t) => !t.done);
  if (activePendingTasks.length === 0) return null;

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
          const status = getTaskStatus(task, activeTaskId);
          return (
            <div key={task.id} className="flex items-center gap-2 py-2 px-3">
              <Gsd2StatusIcon status={status} />
              <span className="text-xs font-mono text-muted-foreground">{task.id}</span>
              <span className="text-sm">{task.title}</span>
              <StatusBadge status={status} />
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

function ActiveMilestoneTasks({ projectId, activeMilestoneId, activeTaskId }: ActiveMilestoneTasksProps) {
  const { data: milestone, isLoading, isError } = useGsd2Milestone(projectId, activeMilestoneId, true);

  if (isLoading) return <Gsd2LoadingCard rows={4} />;
  if (isError || !milestone) return <Gsd2ErrorCard message="Failed to load tasks — check that the project path is accessible." />;

  const activeSlices = milestone.slices.filter((s) => !s.done);
  if (activeSlices.length === 0) {
    return (
      <ViewEmpty
        icon={<CircleDot className="h-8 w-8" />}
        message="No active or pending tasks"
        description="All done, or no GSD-2 session has run yet"
      />
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

const emptyState = (
  <ViewEmpty
    icon={<CircleDot className="h-8 w-8" />}
    message="No active or pending tasks"
    description="All done, or no GSD-2 session has run yet"
  />
);

export function Gsd2TasksTab({ projectId }: Gsd2TasksTabProps) {
  const { data: milestones, isLoading: milestonesLoading, isError: milestonesError } = useGsd2Milestones(projectId);
  const { data: derivedState, isLoading: stateLoading } = useGsd2DerivedState(projectId);

  if (milestonesLoading || stateLoading) return <Gsd2LoadingCard rows={4} />;
  if (milestonesError) return <Gsd2ErrorCard message="Failed to load tasks — check that the project path is accessible." />;
  if (!milestones || milestones.length === 0) return emptyState;

  const activeMilestoneId = derivedState?.active_milestone_id ?? null;
  const activeTaskId = derivedState?.active_task_id ?? null;
  if (!activeMilestoneId) return emptyState;

  return (
    <ActiveMilestoneTasks
      projectId={projectId}
      activeMilestoneId={activeMilestoneId}
      activeTaskId={activeTaskId}
    />
  );
}
