// GSD VibeFlow - GSD-2 Milestones Tab Component
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { useState } from 'react';
import { ChevronRight, Map, Copy, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ViewEmpty } from '@/components/shared/loading-states';
import { SearchInput } from '@/components/shared/search-input';
import { SingleSelectFilter } from '@/components/shared/filter-chips';
import {
  useGsd2Milestones,
  useGsd2Milestone,
  useGsd2Slice,
  useGsd2DerivedState,
} from '@/lib/queries';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import type { Gsd2DerivedState } from '@/lib/tauri';

interface Gsd2MilestonesTabProps {
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

interface MilestoneSlicesProps {
  projectId: string;
  milestoneId: string;
  expandedSlices: Set<string>;
  toggleSlice: (id: string) => void;
  derivedState: Gsd2DerivedState | undefined;
}

function MilestoneSlices({
  projectId,
  milestoneId,
  expandedSlices,
  toggleSlice,
  derivedState,
}: MilestoneSlicesProps) {
  const { data: milestone, isLoading, isError } = useGsd2Milestone(projectId, milestoneId, true);
  const { copyToClipboard, copiedItems } = useCopyToClipboard();

  const handleCopySliceId = async (sliceId: string) => {
    await copyToClipboard(sliceId, `Slice ID "${sliceId}" copied`);
  };

  if (isLoading) {
    return <Skeleton className="h-8 w-full ml-6" />;
  }

  if (isError || !milestone) {
    return (
      <p className="text-xs text-status-error ml-6">Failed to load milestone details.</p>
    );
  }

  if (!milestone.slices || milestone.slices.length === 0) {
    return (
      <p className="text-xs text-muted-foreground ml-6 py-2">No slices in this milestone</p>
    );
  }

  return (
    <div className="space-y-0.5 mt-0.5">
      {milestone.slices.map((s) => {
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
              <span className="text-xs text-muted-foreground ml-auto mr-2">
                {doneCount}/{totalCount} tasks
              </span>
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
              <div className="ml-12 border-l border-border/50 pl-2 py-1">
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

export function Gsd2MilestonesTab({ projectId }: Gsd2MilestonesTabProps) {
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
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
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-status-error">
            Failed to load milestones — check that the project path is accessible.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!milestones || milestones.length === 0) {
    return (
      <ViewEmpty
        icon={<Map className="h-8 w-8" />}
        message="No milestones yet"
        description="Run a GSD-2 session to get started"
      />
    );
  }

  // Status filter options with counts
  const statusGroups = milestones.reduce((acc, milestone) => {
    const status = getStatus(milestone.done, derivedState?.active_milestone_id ?? null, milestone.id);
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusOptions = [
    { id: 'active', label: 'Active', count: statusGroups.active || 0 },
    { id: 'done', label: 'Done', count: statusGroups.done || 0 },
    { id: 'pending', label: 'Pending', count: statusGroups.pending || 0 },
  ].filter(option => option.count > 0);

  // Apply search and status filters
  const query = search.trim().toLowerCase();
  const filtered = milestones.filter((milestone) => {
    // Status filter
    if (selectedStatus) {
      const status = getStatus(milestone.done, derivedState?.active_milestone_id ?? null, milestone.id);
      if (status !== selectedStatus) return false;
    }
    
    // Search filter
    if (query) {
      return (
        milestone.id.toLowerCase().includes(query) ||
        milestone.title.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Map className="h-4 w-4" /> Milestones
            <span className="text-xs font-normal text-muted-foreground">
              ({milestones.length})
            </span>
          </CardTitle>
        </div>
        <div className="space-y-2">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by ID or title..."
            size="sm"
          />
          {statusOptions.length > 1 && (
            <SingleSelectFilter
              options={statusOptions}
              selected={selectedStatus}
              onSelectionChange={setSelectedStatus}
              size="sm"
              showAllOption={true}
              allLabel="All Status"
            />
          )}
        </div>
      </CardHeader>
      <CardContent className="p-2">
        {filtered.length === 0 && (query || selectedStatus) ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No milestones match {query && selectedStatus ? `"${search}" and ${selectedStatus} status` : query ? `"${search}"` : `${selectedStatus} status`}
          </p>
        ) : (
          <div className="space-y-0.5">
            {filtered.map((m) => {
            const milestoneStatus = getStatus(
              m.done,
              derivedState?.active_milestone_id ?? null,
              m.id,
            );
            const isExpanded = expandedMilestones.has(m.id);
            const isActive = derivedState?.active_milestone_id === m.id;
            const isCopied = copiedItems.has(m.id);

            return (
              <div key={m.id}>
                <div
                  className={`flex items-center gap-2 py-2 px-3 rounded hover:bg-muted/50 transition-colors${isActive ? ' border-l-2 border-primary' : ''}`}
                >
                  <button
                    onClick={() => toggleMilestone(m.id)}
                    className="flex items-center gap-2"
                  >
                    <ChevronRight
                      className="h-4 w-4 transition-transform duration-200 shrink-0"
                      style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                    />
                    <StatusIcon status={milestoneStatus} />
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
                    {isCopied ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3 opacity-50" />
                    )}
                  </button>
                  <span className="text-sm font-medium">{m.title}</span>
                  <Badge
                    variant="outline"
                    className={
                      m.done
                        ? 'bg-status-success/10 text-status-success border-status-success/30 ml-auto text-xs'
                        : 'bg-status-pending/10 text-status-pending border-status-pending/30 ml-auto text-xs'
                    }
                  >
                    {m.done ? 'Done' : 'Pending'}
                  </Badge>
                </div>
                {isExpanded && (
                  <MilestoneSlices
                    projectId={projectId}
                    milestoneId={m.id}
                    expandedSlices={expandedSlices}
                    toggleSlice={toggleSlice}
                    derivedState={derivedState}
                  />
                )}
              </div>
            );
          })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
