// VCCA - Guided Project Wizard Tests
// Verifies guided create/start flow routes users to guided overview view
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { act, render, screen, waitFor } from "@/test/test-utils";
import userEvent from "@testing-library/user-event";
import { GuidedProjectWizard } from "../guided-project-wizard";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/queries")>();
  return {
    ...actual,
    useProjectTemplates: vi.fn(),
    useGsd2Models: vi.fn(),
    useImportProjectEnhanced: vi.fn(),
    useGsd2GeneratePlanPreview: vi.fn(),
    useGsd2HeadlessStart: vi.fn(),
    useGsd2HeadlessStartWithModel: vi.fn(),
  };
});

import {
  useGsd2GeneratePlanPreview,
  useGsd2HeadlessStart,
  useGsd2HeadlessStartWithModel,
  useGsd2Models,
  useImportProjectEnhanced,
  useProjectTemplates,
} from "@/lib/queries";

vi.mock("@/lib/tauri", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/tauri")>();
  return {
    ...actual,
    checkProjectPath: vi.fn(),
    pickFolder: vi.fn(),
    scaffoldProject: vi.fn(),
  };
});

import { checkProjectPath, pickFolder, scaffoldProject, type Gsd2PlanPreview } from "@/lib/tauri";

function makePreview(): Gsd2PlanPreview {
  return {
    intent: "Build an internal dashboard for support operations",
    milestone: {
      title: "Guided Milestone",
      summary: "Deliver a guided-mode MVP",
      slices: [
        {
          id: "S01",
          title: "Foundation",
          goal: "Create baseline app skeleton",
          risk: null,
          depends_on: [],
        },
      ],
    },
  };
}

describe("GuidedProjectWizard", () => {
  const mockImportMutateAsync = vi.fn();
  const mockPreviewMutateAsync = vi.fn();
  const mockHeadlessStartMutateAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useProjectTemplates as Mock).mockReturnValue({
      data: [
        {
          id: "react-ts",
          name: "React + TypeScript",
          description: "Modern React SPA with TypeScript and Vite.",
          category: "Web",
          language: "TypeScript",
          archetype: "webapp",
        },
      ],
      isLoading: false,
    });

    (useGsd2Models as Mock).mockReturnValue({ data: [] });

    mockImportMutateAsync.mockResolvedValue({
      project: { id: "proj-guided-001" },
    });
    (useImportProjectEnhanced as Mock).mockReturnValue({
      mutateAsync: mockImportMutateAsync,
    });

    mockPreviewMutateAsync.mockResolvedValue(makePreview());
    (useGsd2GeneratePlanPreview as Mock).mockReturnValue({
      mutateAsync: mockPreviewMutateAsync,
      isPending: false,
    });

    mockHeadlessStartMutateAsync.mockResolvedValue("session-guided-001");
    (useGsd2HeadlessStart as Mock).mockReturnValue({
      mutateAsync: mockHeadlessStartMutateAsync,
    });

    (useGsd2HeadlessStartWithModel as Mock).mockReturnValue({
      mutateAsync: vi.fn(),
    });

    (pickFolder as Mock).mockResolvedValue("/Users/test/projects");
    (checkProjectPath as Mock).mockResolvedValue(true);
    (scaffoldProject as Mock).mockResolvedValue({
      projectName: "guided-app",
      projectPath: "/Users/test/projects/guided-app",
      filesCreated: ["README.md"],
      gsdSeeded: false,
      gitInitialized: true,
    });
  });

  it("routes to guided overview after starting guided project execution", async () => {
    const user = userEvent.setup();

    render(<GuidedProjectWizard open={true} onOpenChange={vi.fn()} />);

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /react \+ typescript/i }));
    });

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /browse/i }));
    });

    await act(async () => {
      await user.type(screen.getByLabelText(/project name/i), "guided-app");
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 400));
    });

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /^next$/i }));
    });

    await act(async () => {
      await user.type(
        screen.getByPlaceholderText(/build a saas dashboard/i),
        "Build a support operations dashboard with SLA tracking and role-based access."
      );
    });

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /generate plan/i }));
    });

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /approve \/ adjust/i }));
    });

    await act(async () => {
      await user.click(
        screen.getByRole("checkbox", {
          name: /i approve this plan preview and want to start execution/i,
        })
      );
    });

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /start building/i }));
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/projects/proj-guided-001?view=overview");
    });

    expect(mockNavigate).not.toHaveBeenCalledWith("/projects/proj-guided-001?view=gsd2-headless");
  });
});
