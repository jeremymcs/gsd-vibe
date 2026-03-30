// GSD VibeFlow - Close Warning Hook
// Warns user before closing if active processes are running
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { useEffect, useState, useCallback } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { canSafelyClose, forceCloseAll, saveTerminalSessions, type ActiveProcessInfo, type SaveTerminalSessionInput } from "@/lib/tauri";
import { useTerminalContext } from "@/contexts/terminal-context";

interface UseCloseWarningReturn {
  showWarning: boolean;
  processInfo: ActiveProcessInfo | null;
  handleCancel: () => void;
  handleForceClose: () => Promise<void>;
}

export function useCloseWarning(): UseCloseWarningReturn {
  const [showWarning, setShowWarning] = useState(false);
  const [processInfo, setProcessInfo] = useState<ActiveProcessInfo | null>(null);
  const { getAllTerminals, getProjectPaths } = useTerminalContext();

  const saveTerminalSessionsBeforeClose = useCallback(async () => {
    try {
      const terminals = getAllTerminals();
      const projectPaths = getProjectPaths();
      const sessions: SaveTerminalSessionInput[] = [];
      let sortOrder = 0;

      terminals.forEach((projectTerminals, projectId) => {
        const workDir = projectPaths.get(projectId);
        if (!workDir) return;

        for (const tab of projectTerminals.tabs) {
          if (tab.isExited) continue;
          
          // Map command to tab type
          let tabType = "shell";
          if (tab.command?.includes("--dangerously-skip-permissions")) {
            tabType = "yolo";
          } else if (tab.command?.includes("claude")) {
            tabType = "claude";
          }

          sessions.push({
            project_id: projectId,
            tab_name: tab.label,
            tab_type: tabType,
            working_directory: workDir,
            sort_order: sortOrder++,
            tmux_session: tab.tmuxSession ?? undefined,
          });
        }
      });

      await saveTerminalSessions(sessions);
    } catch (error) {
      // Continue with close even if save fails
      console.warn("Failed to save terminal sessions during close:", error);
    }
  }, [getAllTerminals, getProjectPaths]);

  const handleCancel = useCallback(() => {
    setShowWarning(false);
    setProcessInfo(null);
  }, []);

  const handleForceClose = useCallback(async () => {
    try {
      // Save terminal sessions before force closing
      await saveTerminalSessionsBeforeClose();
      await forceCloseAll();
      const window = getCurrentWindow();
      await window.destroy();
    } catch {
      // Force close is best-effort; window may already be closing
    }
  }, [saveTerminalSessionsBeforeClose]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      const window = getCurrentWindow();
      unlisten = await window.onCloseRequested(async (event) => {
        // Prevent default close behavior
        event.preventDefault();

        try {
          const info = await canSafelyClose();
          if (info.can_close) {
            // Save terminal sessions before safe close
            await saveTerminalSessionsBeforeClose();
            // Safe to close, destroy the window
            await window.destroy();
          } else {
            // Show warning dialog
            setProcessInfo(info);
            setShowWarning(true);
          }
        } catch {
          // Allow close on error — can't determine process status
          await window.destroy();
        }
      });
    };

    void setupListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  return {
    showWarning,
    processInfo,
    handleCancel,
    handleForceClose,
  };
}
