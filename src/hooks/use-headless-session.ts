// GSD Vibe - Headless Session Hook
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { useState, useRef, useCallback, useEffect } from 'react';
import type React from 'react';
import { onPtyOutput, onPtyExit, gsd2HeadlessUnregister, gsd2HeadlessSaveSession, gsd2HeadlessLoadLastSession } from '@/lib/tauri';
import type { HeadlessSnapshot, PtyOutputEvent, PtyExitEvent } from '@/lib/tauri';
import type { UnlistenFn } from '@tauri-apps/api/event';
import type { ChatMessage } from '@/lib/pty-chat-parser';

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
  messages: ChatMessage[];
  lastSnapshot: HeadlessSnapshot | null;
  startedAt: string | null;
  completedAt: string | null;
  setSessionId: (id: string | null) => void;
  setStatus: (status: HeadlessStatus) => void;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  clearLogs: () => void;
  loadPersistedSession: (projectId: string) => Promise<void>;
}

export function useHeadlessSession(projectId: string): UseHeadlessSessionReturn {
  const [status, setStatus] = useState<HeadlessStatus>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [logs, setLogs] = useState<HeadlessLogRow[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [lastSnapshot, setLastSnapshot] = useState<HeadlessSnapshot | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const bufferRef = useRef('');
  // Keep refs to latest logs/messages/snapshot for use in the PTY exit handler
  const logsRef = useRef<HeadlessLogRow[]>([]);
  const messagesRef = useRef<ChatMessage[]>([]);
  const snapshotRef = useRef<HeadlessSnapshot | null>(null);
  const startedAtMsRef = useRef<number | null>(null);

  useEffect(() => { logsRef.current = logs; }, [logs]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { snapshotRef.current = lastSnapshot; }, [lastSnapshot]);

  const clearLogs = useCallback(() => {
    setLogs([]);
    setMessages([]);
    setLastSnapshot(null);
    bufferRef.current = '';
  }, []);

  // Load the last persisted session from DB (called on mount by the tab)
  const loadPersistedSession = useCallback(async (projectId: string) => {
    try {
      const saved = await gsd2HeadlessLoadLastSession(projectId);
      if (!saved) return;
      const parsedLogs: HeadlessLogRow[] = JSON.parse(saved.logs_json);
      const parsedMessages: ChatMessage[] = JSON.parse(saved.messages_json);
      const parsedSnapshot: HeadlessSnapshot | null = saved.last_snapshot_json
        ? JSON.parse(saved.last_snapshot_json)
        : null;
      setLogs(parsedLogs);
      setMessages(parsedMessages);
      setLastSnapshot(parsedSnapshot);
      setStatus(saved.status as HeadlessStatus);
      setStartedAt(new Date(saved.started_at).toISOString());
      setCompletedAt(saved.completed_at ? new Date(saved.completed_at).toISOString() : null);
    } catch {
      // Best-effort — don't surface errors for persisted session loading
    }
  }, []);

  // Strip ANSI/VT escape sequences from a string — matches pty-chat-parser's stripAnsi.
  const stripAnsi = (str: string): string => {
    let s = str;
    // OSC: \x1b] ... (\x07 or \x1b\)
    s = s.replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, '');
    // DCS / PM / APC: \x1bP, \x1b^, \x1b_ ... \x1b\
    s = s.replace(/\x1b[P^_][^\x1b]*\x1b\\/g, '');
    // CSI: \x1b[ ... final byte (0x40–0x7e)
    s = s.replace(/\x1b\[[0-9;:<=>?]*[ -/]*[@-~]/g, '');
    // SS2 / SS3: \x1b(N|O) + one char
    s = s.replace(/\x1b[NO]./g, '');
    // All remaining ESC + one char
    s = s.replace(/\x1b./g, '');
    // Stray lone \x1b
    s = s.replace(/\x1b/g, '');
    // \r followed by content overwrites the current line — keep tail only
    s = s.replace(/[^\n]*\r([^\n])/g, '$1');
    // Remaining bare \r
    s = s.replace(/\r/g, '');
    // 8-bit C1 CSI (0x9b) sequences
    s = s.replace(/\x9b[0-9;]*[@-~]/g, '');
    return s;
  };

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
        return [...prev.slice(-499), { timestamp, state, cost_delta: delta }];
      });
    } catch {
      // Non-JSON line — show as raw text row
      const now = new Date();
      const timestamp = [
        now.getHours().toString().padStart(2, '0'),
        now.getMinutes().toString().padStart(2, '0'),
        now.getSeconds().toString().padStart(2, '0'),
      ].join(':');
      setLogs(prev => [...prev.slice(-499), { timestamp, state: trimmed, cost_delta: 0, raw: true }]);
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
        const now = new Date();
        setCompletedAt(now.toISOString());
        // Unregister from the Rust registry so a new session can start
        void gsd2HeadlessUnregister(sessionId);
        setSessionId(null);

        // Persist session to DB using current ref values
        if (startedAtMsRef.current !== null) {
          void gsd2HeadlessSaveSession({
            projectId,
            startedAt: startedAtMsRef.current,
            completedAt: now.getTime(),
            status: exitStatus,
            logsJson: JSON.stringify(logsRef.current),
            messagesJson: JSON.stringify(messagesRef.current),
            lastSnapshotJson: snapshotRef.current ? JSON.stringify(snapshotRef.current) : null,
          });
        }
      });
    };

    void setup();

    return () => {
      // Clean up listeners on unmount — but do NOT close the PTY session
      if (outputUnlisten) outputUnlisten();
      if (exitUnlisten) exitUnlisten();
    };
  }, [sessionId, processLine]);

  // When sessionId is set, record startedAt
  const wrappedSetSessionId = useCallback((id: string | null) => {
    setSessionId(id);
    if (id) {
      const now = Date.now();
      startedAtMsRef.current = now;
      setStartedAt(new Date(now).toISOString());
      setCompletedAt(null);
    }
  }, []);

  return {
    status,
    sessionId,
    logs,
    messages,
    lastSnapshot,
    startedAt,
    completedAt,
    setSessionId: wrappedSetSessionId,
    setStatus,
    setMessages,
    clearLogs,
    loadPersistedSession,
  };
}

