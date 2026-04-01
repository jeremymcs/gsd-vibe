// VCCA - Guided Execution Hook
// Orchestrates scaffold -> import -> headless start for guided project creation
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { useCallback, useState } from "react";
import {
  useGsd2HeadlessStart,
  useGsd2HeadlessStartWithModel,
  useImportProjectEnhanced,
} from "@/lib/queries";
import { scaffoldProject, type ProjectTemplate } from "@/lib/tauri";

const FALLBACK_EXECUTION_ERROR =
  "Unable to start headless execution. You can open the project and start it manually.";

export type GuidedExecutionPhase = "scaffold" | "import" | "start";

export interface GuidedExecutionInput {
  template: ProjectTemplate;
  projectName: string;
  parentDir: string;
  gitInit: boolean;
  selectedModel: string;
}

export interface GuidedExecutionResult {
  projectId: string;
  sessionId: string;
}

export interface GuidedExecutionError extends Error {
  phase: GuidedExecutionPhase;
  projectId: string | null;
  rawMessage: string;
}

export function toGuidedExecutionErrorMessage(rawMessage: string): string {
  const normalized = rawMessage.trim();
  const lower = normalized.toLowerCase();

  if (lower.includes("already running")) {
    return "A headless session is already running for this project. Open the project and stop the existing session first.";
  }

  if (lower.includes("project not found")) {
    return "The imported project could not be resolved. Refresh the projects list and try guided creation again.";
  }

  if (
    lower.includes("api key") ||
    lower.includes("authentication") ||
    lower.includes("unauthorized") ||
    lower.includes("invalid_api_key")
  ) {
    return "Headless execution failed authentication. Add your provider API keys in Settings → Secrets, then try again.";
  }

  if (
    lower.includes("failed to spawn shell") ||
    lower.includes("failed to run gsd") ||
    lower.includes("no such file") ||
    lower.includes("command not found")
  ) {
    return "Headless execution could not launch the gsd CLI. Verify gsd is installed and available on PATH.";
  }

  if (!normalized) {
    return FALLBACK_EXECUTION_ERROR;
  }

  return normalized;
}

function createGuidedExecutionError(
  phase: GuidedExecutionPhase,
  projectId: string | null,
  rawMessage: string
): GuidedExecutionError {
  const error = new Error(toGuidedExecutionErrorMessage(rawMessage)) as GuidedExecutionError;
  error.phase = phase;
  error.projectId = projectId;
  error.rawMessage = rawMessage;
  return error;
}

export function useGuidedExecution() {
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const importProject = useImportProjectEnhanced();
  const startHeadless = useGsd2HeadlessStart();
  const startHeadlessWithModel = useGsd2HeadlessStartWithModel();

  const clearStartError = useCallback(() => {
    setStartError(null);
  }, []);

  const startGuidedExecution = useCallback(
    async (input: GuidedExecutionInput): Promise<GuidedExecutionResult> => {
      const { template, projectName, parentDir, gitInit, selectedModel } = input;

      let phase: GuidedExecutionPhase = "scaffold";
      let importedProjectId: string | null = null;

      setIsStarting(true);
      setStartError(null);

      try {
        const scaffolded = await scaffoldProject({
          templateId: template.id,
          projectName,
          parentDirectory: parentDir,
          gitInit,
        });

        phase = "import";
        const importResult = await importProject.mutateAsync({
          path: scaffolded.projectPath,
          autoSyncRoadmap: false,
        });
        importedProjectId = importResult.project.id;

        phase = "start";
        const sessionId =
          selectedModel !== "auto"
            ? await startHeadlessWithModel.mutateAsync({
                projectId: importedProjectId,
                model: selectedModel,
              })
            : await startHeadless.mutateAsync(importedProjectId);

        return {
          projectId: importedProjectId,
          sessionId,
        };
      } catch (error) {
        const rawMessage = error instanceof Error ? error.message : String(error);
        const wrapped = createGuidedExecutionError(phase, importedProjectId, rawMessage);
        setStartError(wrapped.message);
        throw wrapped;
      } finally {
        setIsStarting(false);
      }
    },
    [importProject, startHeadless, startHeadlessWithModel]
  );

  return {
    isStarting,
    startError,
    clearStartError,
    startGuidedExecution,
  };
}
