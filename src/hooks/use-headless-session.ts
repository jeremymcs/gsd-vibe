// Track Your Shit - Headless Session Hook
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { useState, useRef, useCallback, useEffect } from 'react';
import { onPtyOutput, onPtyExit } from '@/lib/tauri';
import type { HeadlessSnapshot, PtyOutputEvent, PtyExitEvent } from '@/lib/tauri';
import type { UnlistenFn } from '@tauri-apps/api/event';

export type HeadlessStatus = 'idle' | 'running' | 'complete' | 'failed';

export interface HeadlessLogRow {
  timestamp: string;
  state: string;
  cost_delta: number;
}

export interface UseHeadlessSessionReturn {
  status: HeadlessStatus;
  sessionId: string | null;
  logs: HeadlessLogRow[];
  lastSnapshot: HeadlessSnapshot | null;
  startedAt: string | null;
  completedAt: string | null;
  setSessionId: (id: string | null) => void;
  setStatus: (status: HeadlessStatus) => void;
  clearLogs: () => void;
}

export function useHeadlessSession(): UseHeadlessSessionReturn {
  const [status, setStatus] = useState<HeadlessStatus>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [logs, setLogs] = useState<HeadlessLogRow[]>([]);
  const [lastSnapshot, setLastSnapshot] = useState<HeadlessSnapshot | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const bufferRef = useRef('');

  const clearLogs = useCallback(() => {
    setLogs([]);
    setLastSnapshot(null);
    bufferRef.current = '';
  }, []);

  // Process a complete JSON line from PTY output
  const processLine = useCallback((line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      const parsed = JSON.parse(trimmed);
      const now = new Date();
      const timestamp = [
        now.getHours().toString().padStart(2, '0'),
        now.getMinutes().toString().padStart(2, '0'),
        now.getSeconds().toString().padStart(2, '0'),
      ].join(':');

      const state = parsed.state ?? 'unknown';
      const cost = parsed.cost ?? 0;
      const next = parsed.next ?? null;

      // Update last snapshot with running total
      setLastSnapshot({ state, next, cost });

      // Calculate cost delta from previous snapshot
      setLogs(prev => {
        const prevCost = prev.length > 0
          ? prev.reduce((sum, row) => sum + row.cost_delta, 0)
          : 0;
        const delta = Math.max(0, cost - prevCost);
        return [...prev, { timestamp, state, cost_delta: delta }];
      });
    } catch {
      // Non-JSON line (startup messages, etc.) — skip
    }
  }, []);

  // Subscribe to PTY output and exit events when sessionId is set
  useEffect(() => {
    if (!sessionId) return;

    let outputUnlisten: UnlistenFn | undefined;
    let exitUnlisten: UnlistenFn | undefined;

    const setup = async () => {
      outputUnlisten = await onPtyOutput(sessionId, (event: PtyOutputEvent) => {
        const text = new TextDecoder().decode(new Uint8Array(event.data));
        bufferRef.current += text;

        // Split on newlines, process complete lines
        const lines = bufferRef.current.split('\n');
        bufferRef.current = lines.pop() ?? '';
        for (const line of lines) {
          processLine(line);
        }
      });

      exitUnlisten = await onPtyExit(sessionId, (event: PtyExitEvent) => {
        // Process any remaining buffer content
        if (bufferRef.current.trim()) {
          processLine(bufferRef.current);
          bufferRef.current = '';
        }
        const exitStatus = event.exit_code === 0 ? 'complete' : 'failed';
        setStatus(exitStatus as HeadlessStatus);
        setCompletedAt(new Date().toISOString());
      });
    };

    void setup();

    return () => {
      // Clean up listeners on unmount — but do NOT close the PTY session
      if (outputUnlisten) outputUnlisten();
      if (exitUnlisten) exitUnlisten();
    };
  }, [sessionId, processLine]);

  // When sessionId is set and status becomes 'running', record startedAt
  const wrappedSetSessionId = useCallback((id: string | null) => {
    setSessionId(id);
    if (id) {
      setStartedAt(new Date().toISOString());
      setCompletedAt(null);
    }
  }, []);

  return {
    status,
    sessionId,
    logs,
    lastSnapshot,
    startedAt,
    completedAt,
    setSessionId: wrappedSetSessionId,
    setStatus,
    clearLogs,
  };
}
