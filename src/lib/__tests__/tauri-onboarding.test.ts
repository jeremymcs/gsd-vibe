// GSD VibeFlow - Onboarding Tauri Invoke Wrapper Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue(null),
}));

import { invoke } from "@tauri-apps/api/core";
import {
  onboardingDetectDependencies,
  onboardingGetStatus,
  onboardingMarkComplete,
  onboardingValidateAndStoreApiKey,
} from "../tauri";

describe("onboarding invoke wrappers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("onboardingGetStatus calls invoke with command only", async () => {
    await onboardingGetStatus();
    expect(invoke).toHaveBeenCalledWith("onboarding_get_status");
  });

  it("onboardingDetectDependencies calls invoke with command only", async () => {
    await onboardingDetectDependencies();
    expect(invoke).toHaveBeenCalledWith("onboarding_detect_dependencies");
  });

  it("onboardingValidateAndStoreApiKey passes provider and apiKey", async () => {
    await onboardingValidateAndStoreApiKey("anthropic", "sk-ant-test1234567890");
    expect(invoke).toHaveBeenCalledWith("onboarding_validate_and_store_api_key", {
      provider: "anthropic",
      apiKey: "sk-ant-test1234567890",
    });
  });

  it("onboardingMarkComplete passes selected user mode", async () => {
    await onboardingMarkComplete("guided");
    expect(invoke).toHaveBeenCalledWith("onboarding_mark_complete", {
      userMode: "guided",
    });
  });
});
