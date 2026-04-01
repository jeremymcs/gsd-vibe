// VCCA - First Launch Wizard Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "@/test/test-utils";
import { FirstLaunchWizard } from "../first-launch-wizard";
import type { ApiKeyValidationResult, DependencyCheck, OnboardingStatus } from "@/lib/tauri";

vi.mock("@/lib/queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/queries")>();
  return {
    ...actual,
    useOnboardingStatus: vi.fn(),
    useOnboardingDependencies: vi.fn(),
    useOnboardingValidateAndStoreApiKey: vi.fn(),
    useOnboardingMarkComplete: vi.fn(),
  };
});

import {
  useOnboardingDependencies,
  useOnboardingMarkComplete,
  useOnboardingStatus,
  useOnboardingValidateAndStoreApiKey,
} from "@/lib/queries";

interface MockSetupOptions {
  statusData?: OnboardingStatus;
  dependencies?: DependencyCheck[];
  dependencyError?: Error | null;
  validateResult?: ApiKeyValidationResult;
}

function setupHookMocks(options: MockSetupOptions = {}) {
  const refetch = vi.fn();

  const statusData: OnboardingStatus = options.statusData ?? {
    completed: false,
    completed_at: null,
    user_mode: "expert",
    has_api_keys: false,
  };

  const dependencies: DependencyCheck[] =
    options.dependencies ??
    [
      { name: "git", installed: true, version: "git version 2.49.0", message: null },
      { name: "node", installed: true, version: "v22.15.0", message: null },
      { name: "pnpm", installed: false, version: null, message: "not found" },
    ];

  const validateAsync = vi.fn().mockResolvedValue(
    options.validateResult ?? {
      provider: "anthropic",
      key_name: "ANTHROPIC_API_KEY",
      valid: true,
      stored: true,
      message: "API key validated and stored securely",
    },
  );

  const completeAsync = vi.fn().mockResolvedValue({
    completed: true,
    completed_at: "2026-03-28T20:00:00Z",
    user_mode: "guided",
    has_api_keys: true,
  });

  (useOnboardingStatus as Mock).mockReturnValue({
    data: statusData,
    isLoading: false,
    isError: false,
    error: null,
  });

  (useOnboardingDependencies as Mock).mockReturnValue({
    data: { checked_at: "2026-03-28T19:55:00Z", dependencies },
    isLoading: false,
    isFetching: false,
    isError: Boolean(options.dependencyError),
    error: options.dependencyError ?? null,
    refetch,
  });

  (useOnboardingValidateAndStoreApiKey as Mock).mockReturnValue({
    mutateAsync: validateAsync,
    isPending: false,
    isError: false,
    error: null,
  });

  (useOnboardingMarkComplete as Mock).mockReturnValue({
    mutateAsync: completeAsync,
    isPending: false,
    isError: false,
    error: null,
  });

  return { validateAsync, completeAsync, refetch };
}

describe("FirstLaunchWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders dependency detection results on the first step", () => {
    setupHookMocks();
    render(<FirstLaunchWizard />);

    expect(screen.getByText("Welcome to VCCA")).toBeInTheDocument();
    expect(screen.getByText("Tooling check")).toBeInTheDocument();
    expect(screen.getByText("git")).toBeInTheDocument();
    expect(screen.getByText("node")).toBeInTheDocument();
    expect(screen.getByText("pnpm")).toBeInTheDocument();
  });

  it("shows dependency detection failures and allows retry", async () => {
    const { refetch } = setupHookMocks({
      dependencyError: new Error("Dependency command failed"),
    });

    const user = userEvent.setup();
    render(<FirstLaunchWizard />);

    expect(screen.getByText("Dependency detection failed")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Retry check/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("requires at least one stored key before leaving the API key step", async () => {
    setupHookMocks();
    const user = userEvent.setup();

    render(<FirstLaunchWizard />);

    await user.click(screen.getByRole("button", { name: /^Next$/i }));

    expect(screen.getByText(/At least one provider key is required to continue\./i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Next$/i })).toBeDisabled();
  });

  it("allows continuing without new key entry when a stored key already exists", async () => {
    setupHookMocks({
      statusData: {
        completed: false,
        completed_at: null,
        user_mode: "expert",
        has_api_keys: true,
      },
    });

    const user = userEvent.setup();
    render(<FirstLaunchWizard />);

    await user.click(screen.getByRole("button", { name: /^Next$/i }));

    expect(screen.getByText(/At least one API key is available\./i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Next$/i })).toBeEnabled();
  });

  it("stores a validated key and enables step progression", async () => {
    const { validateAsync } = setupHookMocks();
    const user = userEvent.setup();

    render(<FirstLaunchWizard />);

    await user.click(screen.getByRole("button", { name: /^Next$/i }));
    await user.type(screen.getByLabelText("Anthropic API key"), "sk-ant-1234567890abcdef");
    await user.click(screen.getAllByRole("button", { name: "Validate" })[0]);

    await waitFor(() => {
      expect(validateAsync).toHaveBeenCalledWith({
        provider: "anthropic",
        apiKey: "sk-ant-1234567890abcdef",
      });
    });

    expect(screen.getByText("API key validated and stored securely")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Next$/i })).toBeEnabled();
    expect(screen.getByLabelText("Anthropic API key")).toHaveValue("");
  });

  it("keeps progression blocked when provider rejects a key", async () => {
    const { validateAsync } = setupHookMocks({
      validateResult: {
        provider: "anthropic",
        key_name: "ANTHROPIC_API_KEY",
        valid: false,
        stored: false,
        message: "API key validation failed",
      },
    });

    const user = userEvent.setup();
    render(<FirstLaunchWizard />);

    await user.click(screen.getByRole("button", { name: /^Next$/i }));
    await user.type(screen.getByLabelText("Anthropic API key"), "sk-ant-invalid");
    await user.click(screen.getAllByRole("button", { name: "Validate" })[0]);

    await waitFor(() => {
      expect(validateAsync).toHaveBeenCalledWith({ provider: "anthropic", apiKey: "sk-ant-invalid" });
    });

    expect(screen.getByText("API key validation failed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Next$/i })).toBeDisabled();
    expect(screen.getByLabelText("Anthropic API key")).toHaveValue("sk-ant-invalid");
  });

  it("completes onboarding with the selected mode and notifies parent", async () => {
    const { completeAsync } = setupHookMocks();
    const onComplete = vi.fn();
    const user = userEvent.setup();

    render(<FirstLaunchWizard onComplete={onComplete} />);

    await user.click(screen.getByRole("button", { name: /^Next$/i }));
    await user.type(screen.getByLabelText("Anthropic API key"), "sk-ant-1234567890abcdef");
    await user.click(screen.getAllByRole("button", { name: "Validate" })[0]);
    await user.click(screen.getByRole("button", { name: /^Next$/i }));
    await user.click(screen.getByRole("button", { name: /Guided/i }));
    await user.click(screen.getByRole("button", { name: /Complete setup/i }));

    await waitFor(() => {
      expect(completeAsync).toHaveBeenCalledWith("guided");
      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({ completed: true, user_mode: "guided" }),
      );
    });
  });

  it("uses persisted user mode as completion default", async () => {
    const { completeAsync } = setupHookMocks({
      statusData: {
        completed: false,
        completed_at: null,
        user_mode: "guided",
        has_api_keys: true,
      },
    });

    const user = userEvent.setup();
    render(<FirstLaunchWizard />);

    await user.click(screen.getByRole("button", { name: /^Next$/i }));
    await user.click(screen.getByRole("button", { name: /^Next$/i }));
    await user.click(screen.getByRole("button", { name: /Complete setup/i }));

    await waitFor(() => {
      expect(completeAsync).toHaveBeenCalledWith("guided");
    });
  });
});
