// VCCA - Guided Project View Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { render, screen, waitFor } from "@/test/test-utils";
import userEvent from "@testing-library/user-event";
import { GuidedProjectView } from "../guided-project-view";
import type { UseHeadlessSessionReturn } from "@/hooks/use-headless-session";

vi.mock("@/components/terminal", () => ({
  TerminalTabs: ({ projectId }: { projectId: string }) => (
    <div data-testid="mock-terminal-tabs">Terminal for {projectId}</div>
  ),
}));

vi.mock("@/lib/queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/queries")>();
  return {
    ...actual,
    useGsd2Health: vi.fn(),
    useGsd2VisualizerData: vi.fn(),
    useGsd2HeadlessQuery: vi.fn(),
    useGsd2HeadlessStart: vi.fn(),
    useGsd2HeadlessStop: vi.fn(),
  };
});

vi.mock("@/lib/tauri", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/tauri")>();
  return {
    ...actual,
    gsd2HeadlessGetSession: vi.fn(),
  };
});

import {
  useGsd2Health,
  useGsd2VisualizerData,
  useGsd2HeadlessQuery,
  useGsd2HeadlessStart,
  useGsd2HeadlessStop,
} from "@/lib/queries";
import { gsd2HeadlessGetSession } from "@/lib/tauri";

function makeSession(overrides: Partial<UseHeadlessSessionReturn> = {}): UseHeadlessSessionReturn {
  return {
    status: "idle",
    sessionId: null,
    logs: [],
    lastSnapshot: null,
    startedAt: null,
    completedAt: null,
    setSessionId: vi.fn(),
    setStatus: vi.fn(),
    clearLogs: vi.fn(),
    ...overrides,
  };
}

describe("GuidedProjectView", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (gsd2HeadlessGetSession as Mock).mockResolvedValue(null);

    (useGsd2Health as Mock).mockReturnValue({
      data: {
        budget_spent: 1.25,
        budget_ceiling: null,
        active_milestone_id: "M012",
        active_milestone_title: "Guided Project View",
        active_slice_id: "S04",
        active_slice_title: "Guided Project View",
        active_task_id: "T02",
        active_task_title: "Build guided workspace",
        phase: "execution",
        blocker: null,
        next_action: "Finish tests",
        milestones_done: 0,
        milestones_total: 1,
        slices_done: 2,
        slices_total: 4,
        tasks_done: 5,
        tasks_total: 10,
        env_error_count: 0,
        env_warning_count: 0,
      },
      isLoading: false,
    });

    (useGsd2VisualizerData as Mock).mockReturnValue({
      data: {
        milestones: [
          {
            id: "M012",
            title: "Guided Project View",
            done: false,
            status: "active",
            dependencies: [],
            slices: [
              {
                id: "S04",
                title: "Guided Workspace",
                done: false,
                status: "active",
                risk: null,
                dependencies: [],
                tasks: [],
                verification: null,
                changelog: [],
              },
            ],
            discussion_state: "discussed",
            cost: 0,
          },
        ],
      },
      isLoading: false,
    });

    (useGsd2HeadlessQuery as Mock).mockReturnValue({
      data: {
        state: "planning",
        next: "execution",
        cost: 0.4,
      },
    });

    (useGsd2HeadlessStart as Mock).mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue("session-123"),
    });

    (useGsd2HeadlessStop as Mock).mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue(undefined),
    });
  });

  it("renders guided status and progress cards", () => {
    const session = makeSession();

    render(
      <GuidedProjectView
        projectId="proj-1"
        projectPath="/tmp/proj-1"
        session={session}
      />
    );

    expect(screen.getByTestId("guided-status-badge")).toHaveTextContent("idle");
    expect(screen.getByTestId("guided-phase")).toHaveTextContent("planning");
    expect(screen.getByTestId("guided-task-count")).toHaveTextContent("5/10 complete");
    expect(screen.getByTestId("guided-slice-count")).toHaveTextContent("2/4 complete");
    expect(screen.getByTestId("guided-active-milestone")).toHaveTextContent("M012 · Guided Project View");
    expect(screen.getByTestId("guided-active-slice")).toHaveTextContent("S04 · Guided Workspace");
    expect(screen.getByTestId("guided-budget-spent")).toHaveTextContent("$1.25");
  });

  it("wires Start and Resume buttons to start mutation", async () => {
    const user = userEvent.setup();
    const session = makeSession();
    const startMutateAsync = vi.fn().mockResolvedValue("session-abc");

    (useGsd2HeadlessStart as Mock).mockReturnValue({
      isPending: false,
      mutateAsync: startMutateAsync,
    });

    render(
      <GuidedProjectView
        projectId="proj-2"
        projectPath="/tmp/proj-2"
        session={session}
      />
    );

    await user.click(screen.getByTestId("guided-start-btn"));
    await user.click(screen.getByTestId("guided-resume-btn"));

    expect(session.clearLogs).toHaveBeenCalledTimes(2);
    expect(session.setStatus).toHaveBeenCalledWith("running");
    expect(startMutateAsync).toHaveBeenCalledTimes(2);
    expect(startMutateAsync).toHaveBeenCalledWith("proj-2");
    expect(session.setSessionId).toHaveBeenCalledWith("session-abc");
  });

  it("wires Pause button to stop mutation when session is running", async () => {
    const user = userEvent.setup();
    const stopMutateAsync = vi.fn().mockResolvedValue(undefined);
    const session = makeSession({
      status: "running",
      sessionId: "session-live",
    });

    (useGsd2HeadlessStop as Mock).mockReturnValue({
      isPending: false,
      mutateAsync: stopMutateAsync,
    });

    render(
      <GuidedProjectView
        projectId="proj-3"
        projectPath="/tmp/proj-3"
        session={session}
      />
    );

    await user.click(screen.getByTestId("guided-pause-btn"));

    expect(stopMutateAsync).toHaveBeenCalledWith("session-live");
    expect(session.setStatus).toHaveBeenCalledWith("idle");
    expect(session.setSessionId).toHaveBeenCalledWith(null);
  });

  it("toggles the collapsible terminal section", async () => {
    const user = userEvent.setup();

    render(
      <GuidedProjectView
        projectId="proj-4"
        projectPath="/tmp/proj-4"
        session={makeSession()}
      />
    );

    expect(screen.queryByTestId("guided-terminal-body")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("guided-terminal-toggle"));

    await waitFor(() => {
      expect(screen.getByTestId("guided-terminal-body")).toBeInTheDocument();
      expect(screen.getByTestId("mock-terminal-tabs")).toHaveTextContent("proj-4");
    });
  });
});
