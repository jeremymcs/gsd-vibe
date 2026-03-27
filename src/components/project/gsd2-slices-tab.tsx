// GSD Vibe - GSD-2 Slices Tab Component
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useGsd2Milestones,
  useGsd2Milestone,
  useGsd2Slice,
  useGsd2DerivedState,
} from '@/lib/queries';
import type { Gsd2SliceSummary, Gsd2DerivedState } from '@/lib/tauri';

interface Gsd2SlicesTabProps {
  projectId: string;
  projectPath: string;
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'done') {
    return <span className="text-status-success">✔</span>;
  }
  if (status === 'active') {
    return <span className="text-yellow-600 dark:text-yellow-500 animate-pulse">▶</span>;
  }
  return <span className="text-muted-foreground">○</span>;
}

function getStatus(done: boolean, activeId: string | null, id: string): 'done' | 'active' | 'pending' {
  if (done) return 'done';
  if (activeId && id === activeId) return 'active';
  return 'pending';
}

interface SliceTasksSectionProps {
  projectId: string;
  milestoneId: string;
  sliceId: string;
}

function SliceTasksSection({ projectId, milestoneId, sliceId }: SliceTasksSectionProps) {
  const { data: slice, isLoading, isError } = useGsd2Slice(projectId, milestoneId, sliceId, true);

  if (isLoading) {
    return <Skeleton className="h-8 w-full" />;
  }

  if (isError || !slice) {
    return <p className="text-xs text-status-error">Failed to load tasks for this slice.</p>;
  }

  if (!slice.tasks || slice.tasks.length === 0) {
    return <p className="text-xs text-muted-foreground py-2">No tasks in this slice</p>;
  }

  return (
    <div className="space-y-0.5">
      {[...slice.tasks].sort((a, b) => a.id.localeCompare(b.id)).map((task) => {
        const taskStatus = task.done ? 'done' : 'pending';
        return (
          <div key={task.id} className="flex items-center gap-2 py-1.5 px-3">
            <StatusIcon status={taskStatus} />
            <span className="text-xs font-mono text-muted-foreground">{task.id}</span>
            <span className="text-sm">{task.title}</span>
            <Badge
              variant="outline"
              className={
                taskStatus === 'done'
                  ? 'bg-status-success/10 text-status-success border-status-success/30 ml-auto text-xs'
                  : 'bg-status-pending/10 text-status-pending border-status-pending/30 ml-auto text-xs'
              }
            >
              {taskStatus === 'done' ? 'Done' : 'Pending'}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}

interface MilestoneSlicesSectionProps {
  projectId: string;
  milestoneId: string;
  slices: Gsd2SliceSummary[];
  expandedSlices: Set<string>;
  toggleSlice: (id: string) => void;
  derivedState: Gsd2DerivedState | undefined;
}

function MilestoneSlicesSection({
  projectId,
  milestoneId,
  slices,
  expandedSlices,
  toggleSlice,
  derivedState,
}: MilestoneSlicesSectionProps) {
  const { data: fullMilestone, isLoading } = useGsd2Milestone(projectId, milestoneId, true);

  // Use full milestone slices if available (have task arrays); fall back to summary slices
  const displaySlices = [...(fullMilestone?.slices ?? slices)].sort((a, b) => a.id.localeCompare(b.id));

  return (
    <div className="space-y-0.5 mt-0.5">
      {displaySlices.map((s) => {
        const doneCount = s.tasks.filter((t) => t.done).length;
        const totalCount = s.tasks.length;
        const sliceStatus = getStatus(s.done, derivedState?.active_slice_id ?? null, s.id);
        const isExpanded = expandedSlices.has(s.id);

        return (
          <div key={s.id}>
            <div
              className="flex items-center gap-2 py-2 px-3 ml-6 rounded cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => toggleSlice(s.id)}
            >
              <ChevronRight
                className="h-3.5 w-3.5 transition-transform duration-200 shrink-0"
                style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
              />
              <StatusIcon status={sliceStatus} />
              <span className="text-xs font-mono text-muted-foreground">{s.id}</span>
              <span className="text-sm">{s.title}</span>
              {isLoading ? (
                <span className="text-xs text-muted-foreground ml-auto mr-2">loading...</span>
              ) : (
                <span className="text-xs text-muted-foreground ml-auto mr-2">
                  {doneCount}/{totalCount} tasks
                </span>
              )}
              <Badge
                variant="outline"
                className={
                  s.done
                    ? 'bg-status-success/10 text-status-success border-status-success/30 text-xs'
                    : 'bg-status-pending/10 text-status-pending border-status-pending/30 text-xs'
                }
              >
                {s.done ? 'Done' : 'Pending'}
              </Badge>
            </div>
            {isExpanded && (
              <div className="ml-10 border-l border-border/50 pl-2 py-1">
                <SliceTasksSection
                  projectId={projectId}
                  milestoneId={milestoneId}
                  sliceId={s.id}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function Gsd2SlicesTab({ projectId }: Gsd2SlicesTabProps) {
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set());
  const [expandedSlices, setExpandedSlices] = useState<Set<string>>(new Set());

  const { data: milestones, isLoading, isError } = useGsd2Milestones(projectId);
  const { data: derivedState } = useGsd2DerivedState(projectId);

  const toggleMilestone = (id: string) => {
    setExpandedMilestones((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSlice = (id: string) => {
    setExpandedSlices((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4 space-y-2">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-8 w-full mb-1" />
          <Skeleton className="h-8 w-full mb-1" />
          <Skeleton className="h-8 w-1/3 mt-2" />
          <Skeleton className="h-8 w-full mb-1" />
          <Skeleton className="h-8 w-full mb-1" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-status-error">
            Failed to load slices — check that the project path is accessible.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Count total slices across all milestones
  const totalSlices = milestones?.reduce((sum, m) => sum + m.slices.length, 0) ?? 0;

  if (!milestones || milestones.length === 0 || totalSlices === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            No slices yet — run a GSD-2 session to get started
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-2">
        <div className="space-y-1">
          {milestones.map((m) => {
            if (!m.slices || m.slices.length === 0) return null;
            const isExpanded = expandedMilestones.has(m.id);

            return (
              <div key={m.id}>
                {/* Milestone section header */}
                <div
                  className="flex items-center gap-2 py-2 px-3 bg-muted/30 rounded cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleMilestone(m.id)}
                >
                  <ChevronRight
                    className="h-4 w-4 transition-transform duration-200 shrink-0"
                    style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                  />
                  <span className="text-xs font-mono text-muted-foreground">{m.id}</span>
                  <span className="text-sm font-semibold">{m.title}</span>
                </div>
                {/* Expanded slice rows */}
                {isExpanded && (
                  <MilestoneSlicesSection
                    projectId={projectId}
                    milestoneId={m.id}
                    slices={m.slices}
                    expandedSlices={expandedSlices}
                    toggleSlice={toggleSlice}
                    derivedState={derivedState}
                  />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
