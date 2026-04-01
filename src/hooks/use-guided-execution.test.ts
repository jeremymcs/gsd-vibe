// VCCA - Guided Execution Hook Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { describe, expect, it } from "vitest";
import { toGuidedExecutionErrorMessage } from "./use-guided-execution";

describe("toGuidedExecutionErrorMessage", () => {
  it("maps headless session conflict errors to actionable guidance", () => {
    const message = toGuidedExecutionErrorMessage(
      "A headless session is already running for this project"
    );

    expect(message).toContain("already running");
    expect(message).toContain("stop the existing session");
  });

  it("maps auth/api key failures to settings guidance", () => {
    const message = toGuidedExecutionErrorMessage("Authentication failed: invalid_api_key");

    expect(message).toContain("Settings → Secrets");
  });

  it("maps spawn/path errors to CLI installation guidance", () => {
    const message = toGuidedExecutionErrorMessage("Failed to spawn shell: No such file or directory");

    expect(message).toContain("gsd CLI");
    expect(message).toContain("PATH");
  });

  it("falls back to raw message when no mapping applies", () => {
    const raw = "Unexpected upstream timeout";
    expect(toGuidedExecutionErrorMessage(raw)).toBe(raw);
  });
});
