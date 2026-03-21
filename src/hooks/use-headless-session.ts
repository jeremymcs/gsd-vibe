// Track Your Shit - Headless Session Hook
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { useState, useRef, useCallback, useEffect } from 'react';
import { onPtyOutput, onPtyExit, gsd2HeadlessUnregister } from '@/lib/tauri';
import type { HeadlessSnapshot, PtyOutputEvent, PtyExitEvent } from '@/lib/tauri';
import type { UnlistenFn } from '@tauri-apps/api/event';

export type HeadlessStatus = 'idle' | 'running' | 'complete' | 'failed';

export interface HeadlessLogRow {
  timestamp: string;
  state: string;
  cost_delta: number;
  raw?: boolean;
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

  // Strip ANSI/VT escape sequences from a string.
  // Covers: CSI (ESC[...), OSC (ESC]...), character set (ESC( ESC)), keypad mode (ESC= ESC>),
  // and all other Fe/Fs two-char sequences.
  const stripAnsi = (str: string): string =>
    str
      // CSI sequences: ESC [ ... final
      .replace(/\x1b\[[0-9;?<>=!]*[A-Za-z@`]/g, '')
      // OSC sequences: ESC ] ... BEL
      .replace(/\x1b\][^\x07]*\x07/g, '')
      // Character set designations: ESC ( ) * + followed by a char
      .replace(/\x1b[()#*+][A-Za-z0-9=<>]/g, '')
      // Two-char nF sequences: ESC 0x20-0x2F then 0x30-0x7E
      .replace(/\x1b[\x20-\x2f][\x30-\x7e]/g, '')
      // Single-char Fe sequences: ESC 0x40-0x5F (includes @,A-Z,[\]^_)
      .replace(/\x1b[\x40-\x5f]/g, '')
      // Keypad / other short sequences: ESC = ESC > ESC ~ etc.
      .replace(/\x1b[=>~]/g, '')
      // Stray ESC followed by anything remaining
      .replace(/\x1b./g, '');

  // Process a complete JSON line from PTY output
  const processLine = useCallback((line: string) => {
    const trimmed = stripAnsi(line).trim();
    if (!trimmed) return;
    // Skip terminal status bar / shell prompt artifacts (box-drawing lines, DA responses).
    // All meaningful gsd headless output starts with '[' (e.g. [headless], [gsd], [status]).
    // Non-JSON lines that don't start with '[' are terminal noise.
    const looksLikeTagged = trimmed.startsWith('[');
    let isJson = false;
    try { JSON.parse(trimmed); isJson = true; } catch { /* not json */ }
    if (!looksLikeTagged && !isJson) return;
    try {
      const parsed = JSON.parse(trimmed);
      // Only treat as a headless snapshot if it has the expected shape
      if (typeof parsed !== 'object' || parsed === null || typeof parsed.state !== 'string') {
        throw new Error('not a headless snapshot');
      }
      const now = new Date();
      const timestamp = [
        now.getHours().toString().padStart(2, '0'),
        now.getMinutes().toString().padStart(2, '0'),
        now.getSeconds().toString().padStart(2, '0'),
      ].join(':');

      const state = parsed.state;
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
      // Non-JSON line — show as raw text row
      const now = new Date();
      const timestamp = [
        now.getHours().toString().padStart(2, '0'),
        now.getMinutes().toString().padStart(2, '0'),
        now.getSeconds().toString().padStart(2, '0'),
      ].join(':');
      setLogs(prev => [...prev, { timestamp, state: trimmed, cost_delta: 0, raw: true }]);
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
        // Unregister from the Rust registry so a new session can start
        void gsd2HeadlessUnregister(sessionId);
        setSessionId(null);
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
