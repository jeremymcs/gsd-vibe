// VCCA - Knowledge & Captures Panel Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { render, screen, act } from "@/test/test-utils";
import userEvent from "@testing-library/user-event";
import { KnowledgeCapturesPanel } from "../knowledge-captures-panel";
import type { KnowledgeData, CapturesData } from "@/lib/tauri";

// ---------------------------------------------------------------------------
// Mock @/lib/queries — spread real module, override only knowledge/captures hooks
// ---------------------------------------------------------------------------
vi.mock("@/lib/queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/queries")>();
  return {
    ...actual,
    useGsd2KnowledgeData: vi.fn(),
    useGsd2CapturesData: vi.fn(),
    useGsd2ResolveCapture: vi.fn(),
  };
});

import {
  useGsd2KnowledgeData,
  useGsd2CapturesData,
  useGsd2ResolveCapture,
} from "@/lib/queries";

// ---------------------------------------------------------------------------
// Fixture factories
// ---------------------------------------------------------------------------

function makeKnowledgeData(): KnowledgeData {
  return {
    file_path: "/projects/test/.gsd/KNOWLEDGE.md",
    last_modified: "2026-01-15T10:00:00Z",
    entries: [
      {
        id: "K001",
        title: "Always validate inputs",
        content: "Validate all user inputs before processing to prevent injection attacks.",
        type: "rule",
      },
      {
        id: "P001",
        title: "Factory pattern for fixtures",
        content: "Use factory functions to create test fixtures — avoids shared state between tests.",
        type: "pattern",
      },
      {
        id: "L001",
        title: "Rust borrow checker gotcha",
        content: "When you move a value into a struct field and also use it in format!, add .clone() on the field assignment.",
        type: "lesson",
      },
      {
        id: "FREE001",
        title: "Misc note",
        content: "Some freeform content without a strict type category.",
        type: "freeform",
      },
    ],
  };
}

function makeCapturesDataWithPending(): CapturesData {
  return {
    pending_count: 2,
    actionable_count: 2,
    entries: [
      {
        id: "CAP-001",
        text: "Need to add retry logic to the network layer",
        timestamp: "2026-01-15T09:00:00Z",
        status: "pending",
      },
      {
        id: "CAP-002",
        text: "Consider caching the parsed KNOWLEDGE.md on startup",
        timestamp: "2026-01-15T09:30:00Z",
        status: "pending",
      },
      {
        id: "CAP-003",
        text: "Refactor the main loop for clarity",
        timestamp: "2026-01-14T14:00:00Z",
        status: "resolved",
        classification: "defer",
        resolution: "Classified as defer",
        rationale: "",
        resolved_at: "2026-01-15T08:00:00Z",
      },
    ],
  };
}

function makeCapturesDataAllResolved(): CapturesData {
  return {
    pending_count: 0,
    actionable_count: 0,
    entries: [
      {
        id: "CAP-010",
        text: "Already handled",
        timestamp: "2026-01-13T12:00:00Z",
        status: "resolved",
        classification: "quick-task",
        resolution: "Classified as quick-task",
        rationale: "",
        resolved_at: "2026-01-14T08:00:00Z",
      },
    ],
  };
}

function makeEmptyKnowledgeData(): KnowledgeData {
  return {
    file_path: "/projects/test/.gsd/KNOWLEDGE.md",
    last_modified: null,
    entries: [],
  };
}

function makeEmptyCapturesData(): CapturesData {
  return {
    pending_count: 0,
    actionable_count: 0,
    entries: [],
  };
}

// ---------------------------------------------------------------------------
// Setup helpers
// ---------------------------------------------------------------------------

function setupKnowledgeMock(
  data: KnowledgeData | undefined = undefined,
  overrides: Record<string, unknown> = {}
) {
  (useGsd2KnowledgeData as Mock).mockReturnValue({
    data,
    error: null,
    isError: false,
    isFetching: false,
    isLoading: false,
    refetch: vi.fn(),
    ...overrides,
  });
}

function setupCapturesMock(
  data: CapturesData | undefined = undefined,
  overrides: Record<string, unknown> = {}
) {
  (useGsd2CapturesData as Mock).mockReturnValue({
    data,
    error: null,
    isError: false,
    isFetching: false,
    isLoading: false,
    refetch: vi.fn(),
    ...overrides,
  });
}

function setupResolveMutation(mutateFn = vi.fn()) {
  (useGsd2ResolveCapture as Mock).mockReturnValue({
    mutate: mutateFn,
    isPending: false,
    isError: false,
    isSuccess: false,
    error: null,
    data: undefined,
  });
}

const DEFAULT_PROPS = {
  projectId: "proj-test-123",
  projectPath: "/projects/test",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("KnowledgeCapturesPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: both tabs have data, resolve mutation is idle
    setupKnowledgeMock(makeKnowledgeData());
    setupCapturesMock(makeCapturesDataWithPending());
    setupResolveMutation();
  });

  // -------------------------------------------------------------------------
  // Knowledge tab rendering
  // -------------------------------------------------------------------------

  it("renders knowledge entries with type badges", () => {
    render(<KnowledgeCapturesPanel {...DEFAULT_PROPS} />);

    // Knowledge tab is active by default
    expect(screen.getByTestId("knowledge-tab-content")).toBeInTheDocument();

    // All four entries should be visible
    expect(screen.getByText("Always validate inputs")).toBeInTheDocument();
    expect(screen.getByText("Factory pattern for fixtures")).toBeInTheDocument();
    expect(screen.getByText("Rust borrow checker gotcha")).toBeInTheDocument();
    expect(screen.getByText("Misc note")).toBeInTheDocument();

    // Type badges
    expect(screen.getByTestId("knowledge-type-badge-rule")).toBeInTheDocument();
    expect(screen.getByTestId("knowledge-type-badge-pattern")).toBeInTheDocument();
    expect(screen.getByTestId("knowledge-type-badge-lesson")).toBeInTheDocument();
    expect(screen.getByTestId("knowledge-type-badge-freeform")).toBeInTheDocument();

    // Badge labels
    expect(screen.getByText("rule")).toBeInTheDocument();
    expect(screen.getByText("pattern")).toBeInTheDocument();
    expect(screen.getByText("lesson")).toBeInTheDocument();
    expect(screen.getByText("freeform")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Captures tab — pending count badge
  // -------------------------------------------------------------------------

  it("renders captures with pending count badge", async () => {
    const user = userEvent.setup();
    render(<KnowledgeCapturesPanel {...DEFAULT_PROPS} />);

    // Switch to captures tab
    await act(async () => {
      await user.click(screen.getByTestId("tab-captures"));
    });

    // Captures content should be visible
    expect(screen.getByTestId("captures-tab-content")).toBeInTheDocument();

    // Pending count badge
    expect(screen.getByTestId("pending-count-badge")).toBeInTheDocument();
    expect(screen.getByText("2 pending")).toBeInTheDocument();

    // Capture entries
    expect(screen.getByText("Need to add retry logic to the network layer")).toBeInTheDocument();
    expect(screen.getByText("Consider caching the parsed KNOWLEDGE.md on startup")).toBeInTheDocument();
    expect(screen.getByText("Refactor the main loop for clarity")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Resolve button triggers mutation
  // -------------------------------------------------------------------------

  it("clicking a classification button calls resolveCapture.mutate with correct args", async () => {
    const mutateFn = vi.fn();
    setupResolveMutation(mutateFn);

    const user = userEvent.setup();
    render(<KnowledgeCapturesPanel {...DEFAULT_PROPS} />);

    // Switch to captures tab
    await act(async () => {
      await user.click(screen.getByTestId("tab-captures"));
    });

    // Click "Quick Task" on the first pending entry (CAP-001)
    const actionButtons = screen.getAllByTestId("classify-btn-quick-task");
    expect(actionButtons.length).toBeGreaterThanOrEqual(1);

    await act(async () => {
      await user.click(actionButtons[0]);
    });

    expect(mutateFn).toHaveBeenCalledOnce();
    expect(mutateFn).toHaveBeenCalledWith({
      projectId: "proj-test-123",
      captureId: "CAP-001",
      classification: "quick-task",
      resolution: "Classified as quick-task",
      rationale: "",
    });
  });

  it("clicking Defer classification button passes correct classification arg", async () => {
    const mutateFn = vi.fn();
    setupResolveMutation(mutateFn);

    const user = userEvent.setup();
    render(<KnowledgeCapturesPanel {...DEFAULT_PROPS} />);

    await act(async () => {
      await user.click(screen.getByTestId("tab-captures"));
    });

    const deferButtons = screen.getAllByTestId("classify-btn-defer");
    await act(async () => {
      await user.click(deferButtons[0]);
    });

    expect(mutateFn).toHaveBeenCalledWith(
      expect.objectContaining({ classification: "defer" })
    );
  });

  // -------------------------------------------------------------------------
  // Loading states
  // -------------------------------------------------------------------------

  it("shows loading state for knowledge tab when isFetching and no data", () => {
    setupKnowledgeMock(undefined, { isFetching: true, isLoading: true });
    render(<KnowledgeCapturesPanel {...DEFAULT_PROPS} />);

    expect(screen.getByText(/Loading knowledge entries/i)).toBeInTheDocument();
  });

  it("shows loading state for captures tab when isFetching and no data", async () => {
    setupCapturesMock(undefined, { isFetching: true, isLoading: true });

    const user = userEvent.setup();
    render(<KnowledgeCapturesPanel {...DEFAULT_PROPS} />);

    await act(async () => {
      await user.click(screen.getByTestId("tab-captures"));
    });

    expect(screen.getByText(/Loading captures/i)).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Error states
  // -------------------------------------------------------------------------

  it("shows error message for knowledge tab when query returns error", () => {
    setupKnowledgeMock(undefined, {
      error: new Error("knowledge fetch failed"),
      isError: true,
    });
    render(<KnowledgeCapturesPanel {...DEFAULT_PROPS} />);

    expect(screen.getByText(/knowledge fetch failed/i)).toBeInTheDocument();
  });

  it("shows error message for captures tab when query returns error", async () => {
    setupCapturesMock(undefined, {
      error: new Error("captures fetch failed"),
      isError: true,
    });

    const user = userEvent.setup();
    render(<KnowledgeCapturesPanel {...DEFAULT_PROPS} />);

    await act(async () => {
      await user.click(screen.getByTestId("tab-captures"));
    });

    expect(screen.getByText(/captures fetch failed/i)).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Empty states
  // -------------------------------------------------------------------------

  it("shows empty state for knowledge tab when no entries", () => {
    setupKnowledgeMock(makeEmptyKnowledgeData());
    render(<KnowledgeCapturesPanel {...DEFAULT_PROPS} />);

    expect(screen.getByText("No knowledge entries found")).toBeInTheDocument();
  });

  it("shows empty state for captures tab when no entries", async () => {
    setupCapturesMock(makeEmptyCapturesData());

    const user = userEvent.setup();
    render(<KnowledgeCapturesPanel {...DEFAULT_PROPS} />);

    await act(async () => {
      await user.click(screen.getByTestId("tab-captures"));
    });

    expect(screen.getByText("No captures found")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Tab switching
  // -------------------------------------------------------------------------

  it("tab switching: knowledge tab is active by default, captures tab switches content", async () => {
    const user = userEvent.setup();
    render(<KnowledgeCapturesPanel {...DEFAULT_PROPS} />);

    // Knowledge tab content visible initially
    expect(screen.getByTestId("knowledge-tab-content")).toBeInTheDocument();
    expect(screen.queryByTestId("captures-tab-content")).not.toBeInTheDocument();

    // Click captures tab
    await act(async () => {
      await user.click(screen.getByTestId("tab-captures"));
    });

    // Captures content now visible
    expect(screen.getByTestId("captures-tab-content")).toBeInTheDocument();
    expect(screen.queryByTestId("knowledge-tab-content")).not.toBeInTheDocument();

    // Click back to knowledge tab
    await act(async () => {
      await user.click(screen.getByTestId("tab-knowledge"));
    });

    expect(screen.getByTestId("knowledge-tab-content")).toBeInTheDocument();
    expect(screen.queryByTestId("captures-tab-content")).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Resolved entries — no action buttons shown
  // -------------------------------------------------------------------------

  it("does not render classification buttons for resolved captures", async () => {
    setupCapturesMock(makeCapturesDataAllResolved());

    const user = userEvent.setup();
    render(<KnowledgeCapturesPanel {...DEFAULT_PROPS} />);

    await act(async () => {
      await user.click(screen.getByTestId("tab-captures"));
    });

    // No pending entries → no action buttons
    expect(screen.queryByTestId("classify-btn-quick-task")).not.toBeInTheDocument();
    expect(screen.queryByTestId("classify-btn-defer")).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // No pending count badge when all resolved
  // -------------------------------------------------------------------------

  it("does not show pending count badge when pending_count is 0", async () => {
    setupCapturesMock(makeCapturesDataAllResolved());

    const user = userEvent.setup();
    render(<KnowledgeCapturesPanel {...DEFAULT_PROPS} />);

    await act(async () => {
      await user.click(screen.getByTestId("tab-captures"));
    });

    expect(screen.queryByTestId("pending-count-badge")).not.toBeInTheDocument();
  });
});
