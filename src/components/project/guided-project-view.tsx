// GSD VibeFlow - Guided Project Workspace View
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { useEffect, useMemo, useState } from "react";
import { Play, Pause, RotateCcw, TerminalSquare, ChevronDown, ChevronUp, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { TerminalTabs } from "@/components/terminal";
import type { UseHeadlessSessionReturn } from "@/hooks/use-headless-session";
import { useGsd2HeadlessQuery, useGsd2HeadlessStart, useGsd2HeadlessStop, useGsd2Health, useGsd2VisualizerData } from "@/lib/queries";
import { gsd2HeadlessGetSession } from "@/lib/tauri";
import { cn, formatCost } from "@/lib/utils";

interface GuidedProjectViewProps {
  projectId: string;
  projectPath: string;
  session: UseHeadlessSessionReturn;
}

export function GuidedProjectView({ projectId, projectPath, session }: GuidedProjectViewProps) {
  const [terminalCollapsed, setTerminalCollapsed] = useState(true);

  const {
    status,
    sessionId,
    setSessionId,
    setStatus,
    clearLogs,
    lastSnapshot,
  } = session;

  const healthQuery = useGsd2Health(projectId);
  const visualizerQuery = useGsd2VisualizerData(projectId);
  const headlessQuery = useGsd2HeadlessQuery(projectId, status === "idle");
  const startMutation = useGsd2HeadlessStart();
  const stopMutation = useGsd2HeadlessStop();

  useEffect(() => {
    void gsd2HeadlessGetSession(projectId).then((sid) => {
      if (sid && !sessionId) {
        setSessionId(sid);
        setStatus("running");
      }
    });
    // Keep mount-only behavior aligned with existing headless tab logic.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const activeMilestone = useMemo(
    () => visualizerQuery.data?.milestones.find((milestone) => milestone.status === "active") ?? null,
    [visualizerQuery.data]
  );
  const activeSlice = useMemo(
    () => activeMilestone?.slices.find((slice) => slice.status === "active") ?? null,
    [activeMilestone]
  );

  const tasksDone = healthQuery.data?.tasks_done ?? 0;
  const tasksTotal = healthQuery.data?.tasks_total ?? 0;
  const slicesDone = healthQuery.data?.slices_done ?? 0;
  const slicesTotal = healthQuery.data?.slices_total ?? 0;
  const taskProgress = tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : 0;
  const sliceProgress = slicesTotal > 0 ? Math.round((slicesDone / slicesTotal) * 100) : 0;

  const executionPhase =
    lastSnapshot?.state ??
    headlessQuery.data?.state ??
    healthQuery.data?.phase ??
    "idle";

  const handleStart = async () => {
    clearLogs();
    setStatus("running");

    try {
      const sid = await startMutation.mutateAsync(projectId);
      setSessionId(sid);
    } catch {
      setStatus("failed");
    }
  };

  const handlePause = async () => {
    if (!sessionId) return;

    try {
      await stopMutation.mutateAsync(sessionId);
      setStatus("idle");
      setSessionId(null);
    } catch {
      setStatus("failed");
    }
  };

  const isStarting = startMutation.isPending;
  const isPausing = stopMutation.isPending;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Guided Execution
            </span>
            <Badge
              variant="outline"
              className={cn(
                "capitalize",
                status === "running" && "border-status-success/40 text-status-success",
                status === "failed" && "border-status-error/40 text-status-error"
              )}
              data-testid="guided-status-badge"
            >
              {status}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-muted-foreground" data-testid="guided-phase">
            Phase: <span className="font-medium text-foreground">{executionPhase}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={() => void handleStart()}
              disabled={status === "running" || isStarting}
              data-testid="guided-start-btn"
            >
              <Play className="h-4 w-4 mr-1" />
              Start
            </Button>

            <Button
              size="sm"
              variant="secondary"
              onClick={() => void handlePause()}
              disabled={status !== "running" || isPausing || !sessionId}
              data-testid="guided-pause-btn"
            >
              <Pause className="h-4 w-4 mr-1" />
              Pause
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => void handleStart()}
              disabled={status === "running" || isStarting}
              data-testid="guided-resume-btn"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Resume
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Task Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {healthQuery.isLoading ? (
              <Skeleton className="h-4 w-full" />
            ) : (
              <>
                <div className="text-sm" data-testid="guided-task-count">
                  {tasksDone}/{tasksTotal} complete
                </div>
                <Progress value={taskProgress} size="sm" data-testid="guided-task-progress" />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Slice Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {healthQuery.isLoading ? (
              <Skeleton className="h-4 w-full" />
            ) : (
              <>
                <div className="text-sm" data-testid="guided-slice-count">
                  {slicesDone}/{slicesTotal} complete
                </div>
                <Progress value={sliceProgress} size="sm" data-testid="guided-slice-progress" />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Current Unit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {visualizerQuery.isLoading ? (
              <Skeleton className="h-4 w-full" />
            ) : (
              <>
                <div data-testid="guided-active-milestone">
                  Milestone: {activeMilestone ? `${activeMilestone.id} · ${activeMilestone.title}` : "—"}
                </div>
                <div data-testid="guided-active-slice">
                  Slice: {activeSlice ? `${activeSlice.id} · ${activeSlice.title}` : "—"}
                </div>
                <div className="text-muted-foreground" data-testid="guided-budget-spent">
                  Cost: {formatCost(healthQuery.data?.budget_spent ?? 0)}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="py-3">
          <button
            type="button"
            onClick={() => setTerminalCollapsed((prev) => !prev)}
            className="w-full flex items-center justify-between text-left"
            data-testid="guided-terminal-toggle"
          >
            <span className="text-sm font-medium flex items-center gap-2">
              <TerminalSquare className="h-4 w-4" />
              Terminal
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-2">
              {executionPhase}
              {terminalCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </span>
          </button>
        </CardHeader>

        {!terminalCollapsed && (
          <CardContent className="pt-0" data-testid="guided-terminal-body">
            <div className="h-[360px] border rounded-md overflow-hidden">
              <TerminalTabs
                projectId={projectId}
                workingDirectory={projectPath}
                className="h-full"
              />
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
