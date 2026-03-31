// GSD VibeFlow - GSD-2 Slices Tab Component
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { useState } from 'react';
import { ChevronRight, Layers, Copy, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ViewEmpty } from '@/components/shared/loading-states';
import {
  useGsd2Milestones,
  useGsd2Milestone,
  useGsd2Slice,
  useGsd2DerivedState,
} from '@/lib/queries';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
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
  const { copyToClipboard, copiedItems } = useCopyToClipboard();

  const handleCopyTaskId = async (taskId: string) => {
    await copyToClipboard(taskId, `Task ID "${taskId}" copied`);
  };

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
      {slice.tasks.map((task) => {
        const taskStatus = task.done ? 'done' : 'pending';
        const isCopied = copiedItems.has(task.id);
        return (
          <div key={task.id} className="flex items-center gap-2 py-1.5 px-3">
            <StatusIcon status={taskStatus} />
            <button
              onClick={() => handleCopyTaskId(task.id)}
              className="flex items-center gap-1 hover:text-foreground transition-colors text-xs font-mono text-muted-foreground"
              title="Click to copy task ID"
            >
              {task.id}
              {isCopied ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3 opacity-50" />
              )}
            </button>
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
  const { copyToClipboard, copiedItems } = useCopyToClipboard();

  const handleCopySliceId = async (sliceId: string) => {
    await copyToClipboard(sliceId, `Slice ID "${sliceId}" copied`);
  };

  // Use full milestone slices if available (have task arrays); fall back to summary slices
  const displaySlices = fullMilestone?.slices ?? slices;

  return (
    <div className="space-y-0.5 mt-0.5">
      {displaySlices.map((s) => {
        const doneCount = s.tasks.filter((t) => t.done).length;
        const totalCount = s.tasks.length;
        const sliceStatus = getStatus(s.done, derivedState?.active_slice_id ?? null, s.id);
        const isExpanded = expandedSlices.has(s.id);
        const isCopied = copiedItems.has(s.id);

        return (
          <div key={s.id}>
            <div
              className="flex items-center gap-2 py-2 px-3 ml-6 rounded hover:bg-muted/50 transition-colors"
            >
              <button
                onClick={() => toggleSlice(s.id)}
                className="flex items-center gap-2"
              >
                <ChevronRight
                  className="h-3.5 w-3.5 transition-transform duration-200 shrink-0"
                  style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                />
                <StatusIcon status={sliceStatus} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopySliceId(s.id);
                }}
                className="flex items-center gap-1 hover:text-foreground transition-colors text-xs font-mono text-muted-foreground"
                title="Click to copy slice ID"
              >
                {s.id}
                {isCopied ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3 opacity-50" />
                )}
              </button>
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
  const { copyToClipboard, copiedItems } = useCopyToClipboard();

  const handleCopyMilestoneId = async (milestoneId: string) => {
    await copyToClipboard(milestoneId, `Milestone ID "${milestoneId}" copied`);
  };

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
      <ViewEmpty
        icon={<Layers className="h-8 w-8" />}
        message="No slices yet"
        description="Run a GSD-2 session to get started"
      />
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
                  className="flex items-center gap-2 py-2 px-3 bg-muted/30 rounded hover:bg-muted/50 transition-colors"
                >
                  <button
                    onClick={() => toggleMilestone(m.id)}
                    className="flex items-center gap-2"
                  >
                    <ChevronRight
                      className="h-4 w-4 transition-transform duration-200 shrink-0"
                      style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                    />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyMilestoneId(m.id);
                    }}
                    className="flex items-center gap-1 hover:text-foreground transition-colors text-xs font-mono text-muted-foreground"
                    title="Click to copy milestone ID"
                  >
                    {m.id}
                    {copiedItems.has(m.id) ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3 opacity-50" />
                    )}
                  </button>
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
