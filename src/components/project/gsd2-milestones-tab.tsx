// GSD Vibe - GSD-2 Milestones Tab Component
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { useState } from 'react';
import { ChevronRight, Map } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ViewEmpty } from '@/components/shared/loading-states';
import {
  useGsd2Milestones,
  useGsd2Milestone,
  useGsd2Slice,
  useGsd2DerivedState,
} from '@/lib/queries';
import type { Gsd2DerivedState } from '@/lib/tauri';
import {
  Gsd2StatusIcon,
  getGsd2Status,
  Gsd2LoadingCard,
  Gsd2ErrorCard,
  StatusBadge,
} from './gsd2-shared';

interface Gsd2MilestonesTabProps {
  projectId: string;
  projectPath: string;
}

interface SliceTasksSectionProps {
  projectId: string;
  milestoneId: string;
  sliceId: string;
}

function SliceTasksSection({ projectId, milestoneId, sliceId }: SliceTasksSectionProps) {
  const { data: slice, isLoading, isError } = useGsd2Slice(projectId, milestoneId, sliceId, true);

  if (isLoading) return <Skeleton className="h-8 w-full" />;
  if (isError || !slice) return <p className="text-xs text-status-error">Failed to load tasks for this slice.</p>;
  if (!slice.tasks || slice.tasks.length === 0) return <p className="text-xs text-muted-foreground py-2">No tasks in this slice</p>;

  return (
    <div className="space-y-0.5">
      {[...slice.tasks].sort((a, b) => a.id.localeCompare(b.id)).map((task) => {
        const status = task.done ? 'done' : 'pending';
        return (
          <div key={task.id} className="flex items-center gap-2 py-1.5 px-3">
            <Gsd2StatusIcon status={status} />
            <span className="text-xs font-mono text-muted-foreground">{task.id}</span>
            <span className="text-sm">{task.title}</span>
            <StatusBadge status={status} />
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

  if (isLoading) return <Skeleton className="h-8 w-full ml-6" />;
  if (isError || !milestone) return <p className="text-xs text-status-error ml-6">Failed to load milestone details.</p>;
  if (!milestone.slices || milestone.slices.length === 0) return <p className="text-xs text-muted-foreground ml-6 py-2">No slices in this milestone</p>;

  return (
    <div className="space-y-0.5 mt-0.5">
      {[...milestone.slices].sort((a, b) => a.id.localeCompare(b.id)).map((s) => {
        const doneCount = s.tasks.filter((t) => t.done).length;
        const sliceStatus = getGsd2Status(s.done, derivedState?.active_slice_id ?? null, s.id);
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
              <Gsd2StatusIcon status={sliceStatus} />
              <span className="text-xs font-mono text-muted-foreground">{s.id}</span>
              <span className="text-sm">{s.title}</span>
              <span className="text-xs text-muted-foreground ml-auto mr-2">
                {doneCount}/{s.tasks.length} tasks
              </span>
              <StatusBadge status={s.done ? 'done' : 'pending'} />
            </div>
            {isExpanded && (
              <div className="ml-12 border-l border-border/50 pl-2 py-1">
                <SliceTasksSection projectId={projectId} milestoneId={milestoneId} sliceId={s.id} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function Gsd2MilestonesTab({ projectId }: Gsd2MilestonesTabProps) {
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set());
  const [expandedSlices, setExpandedSlices] = useState<Set<string>>(new Set());

  const { data: milestones, isLoading, isError } = useGsd2Milestones(projectId);
  const { data: derivedState } = useGsd2DerivedState(projectId);

  const toggle = (_set: Set<string>, setFn: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) => {
    setFn((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (isLoading) return <Gsd2LoadingCard rows={3} />;
  if (isError) return <Gsd2ErrorCard message="Failed to load milestones — check that the project path is accessible." />;
  if (!milestones || milestones.length === 0) {
    return <ViewEmpty icon={<Map className="h-8 w-8" />} message="No milestones yet" description="Run a GSD-2 session to get started" />;
  }

  return (
    <Card>
      <CardContent className="p-2">
        <div className="space-y-0.5">
          {milestones.map((m) => {
            const milestoneStatus = getGsd2Status(m.done, derivedState?.active_milestone_id ?? null, m.id);
            const isExpanded = expandedMilestones.has(m.id);
            const isActive = derivedState?.active_milestone_id === m.id;

            return (
              <div key={m.id}>
                <div
                  className={`flex items-center gap-2 py-2 px-3 rounded cursor-pointer hover:bg-muted/50 transition-colors${isActive ? ' border-l-2 border-primary' : ''}`}
                  onClick={() => toggle(expandedMilestones, setExpandedMilestones, m.id)}
                >
                  <ChevronRight
                    className="h-4 w-4 transition-transform duration-200 shrink-0"
                    style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                  />
                  <Gsd2StatusIcon status={milestoneStatus} />
                  <span className="text-xs font-mono text-muted-foreground">{m.id}</span>
                  <span className="text-sm font-medium">{m.title}</span>
                  <StatusBadge status={m.done ? 'done' : 'pending'} />
                </div>
                {isExpanded && (
                  <MilestoneSlices
                    projectId={projectId}
                    milestoneId={m.id}
                    expandedSlices={expandedSlices}
                    toggleSlice={(id) => toggle(expandedSlices, setExpandedSlices, id)}
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
