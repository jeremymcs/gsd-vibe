// Track Your Shit - Headless Tab Component
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Play, Square } from 'lucide-react';
import { useHeadlessSession } from '@/hooks/use-headless-session';
import type { HeadlessLogRow } from '@/hooks/use-headless-session';
import { useGsd2HeadlessQuery, useGsd2HeadlessStart, useGsd2HeadlessStop } from '@/lib/queries';
import { gsd2HeadlessGetSession } from '@/lib/tauri';
import { formatCost, formatRelativeTime } from '@/lib/utils';

interface Gsd2HeadlessTabProps {
  projectId: string;
  projectPath: string;
}

export function Gsd2HeadlessTab({ projectId }: Gsd2HeadlessTabProps) {
  const {
    status,
    sessionId,
    logs,
    lastSnapshot,
    completedAt,
    setSessionId,
    setStatus,
    clearLogs,
  } = useHeadlessSession();

  const headlessQuery = useGsd2HeadlessQuery(projectId, status === 'idle');
  const startMutation = useGsd2HeadlessStart();
  const stopMutation = useGsd2HeadlessStop();

  const scrollRef = useRef<HTMLDivElement>(null);

  // On mount: recover any session already running in the registry
  useEffect(() => {
    void gsd2HeadlessGetSession(projectId).then(sid => {
      if (sid && !sessionId) {
        setSessionId(sid);
        setStatus('running');
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Auto-scroll to bottom when new log entries arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const handleStart = async () => {
    clearLogs();
    setStatus('running');
    try {
      const sid = await startMutation.mutateAsync(projectId);
      setSessionId(sid);
    } catch {
      setStatus('failed');
    }
  };

  const handleStop = async () => {
    if (!sessionId) return;
    try {
      await stopMutation.mutateAsync(sessionId);
      setStatus('complete');
      setSessionId(null);
    } catch {
      // Stop is best-effort
    }
  };

  // When idle and query data exists, use it as fallback snapshot
  const displaySnapshot = lastSnapshot ?? headlessQuery.data ?? null;

  // Status dot color
  const dotColor =
    status === 'idle'
      ? 'bg-muted-foreground'
      : status === 'running'
        ? 'bg-status-success animate-pulse'
        : status === 'complete'
          ? 'bg-status-success'
          : 'bg-status-error';

  // Status label
  const statusLabel =
    status === 'idle'
      ? 'Idle'
      : status === 'running'
        ? 'Running'
        : status === 'complete'
          ? 'Complete'
          : 'Failed';

  // Cost/time inline display
  let inlineText: string | null = null;
  if (status === 'running') {
    inlineText = `${formatCost(displaySnapshot?.cost ?? 0)} so far`;
  } else if (status === 'complete' && completedAt) {
    inlineText = `Last run ${formatRelativeTime(completedAt)}`;
  } else if (status === 'idle' && completedAt) {
    inlineText = `Last run ${formatRelativeTime(completedAt)}`;
  }

  return (
    <div className="space-y-4">
      {/* Status bar */}
      <div className="flex items-center gap-2 mb-4">
        <span className={`h-2 w-2 rounded-full ${dotColor}`} />
        <span className="text-sm font-semibold">{statusLabel}</span>
        {inlineText && (
          <span className="text-xs text-muted-foreground ml-auto">{inlineText}</span>
        )}
        <Button
          variant="default"
          size="sm"
          disabled={status === 'running'}
          onClick={() => void handleStart()}
          className={inlineText ? '' : 'ml-auto'}
        >
          <Play className="h-4 w-4 mr-1" /> Start Session
        </Button>
        <Button
          variant="destructive"
          size="sm"
          disabled={status !== 'running'}
          onClick={() => void handleStop()}
        >
          <Square className="h-4 w-4 mr-1" /> Stop Session
        </Button>
      </div>

      {/* Snapshot card */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-muted-foreground">State</span>
            <span className="text-sm">{displaySnapshot?.state ?? '—'}</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-muted-foreground">Next</span>
            <span className="text-sm">{displaySnapshot?.next ?? '—'}</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-muted-foreground">Total Cost</span>
            <span className="text-sm">{displaySnapshot ? formatCost(displaySnapshot.cost) : '—'}</span>
          </div>
        </CardContent>
      </Card>

      {/* Log area */}
      {logs.length === 0 && status === 'idle' ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm font-semibold text-muted-foreground">No session started</p>
          <p className="text-xs text-muted-foreground mt-1">Click Start Session to run gsd headless for this project.</p>
        </div>
      ) : (
        <ScrollArea className="h-96 mt-4">
          <div ref={scrollRef}>
            {logs.map((row: HeadlessLogRow, i: number) => (
              <LogRow key={i} row={row} />
            ))}
            {status === 'running' && logs.length === 0 && (
              <div className="space-y-2 p-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

function LogRow({ row }: { row: HeadlessLogRow }) {
  return (
    <div className="flex items-center text-xs font-mono py-1 hover:bg-muted/30">
      <span className="w-20 text-muted-foreground shrink-0">[{row.timestamp}]</span>
      <span className="flex-1 truncate px-2">{row.state}</span>
      {!row.raw && (
        <span className="w-20 text-right text-status-success shrink-0">+{formatCost(row.cost_delta)}</span>
      )}
    </div>
  );
}
