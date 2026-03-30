// GSD VibeFlow - GSD-2 Sessions Tab Component
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { useState } from 'react';
import { MessageSquare, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ViewEmpty } from '@/components/shared/loading-states';
import { useGsd2Sessions } from '@/lib/queries';
import type { ParsedSessionEntry } from '@/lib/tauri';

interface Gsd2SessionsTabProps {
  projectId: string;
  projectPath: string;
}

function formatTimestamp(ts: string): string {
  if (!ts) return '—';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return ts;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface SessionRowProps {
  session: ParsedSessionEntry;
}

function SessionRow({ session }: SessionRowProps) {
  const hasBreakdown =
    session.user_message_count > 0 || session.assistant_message_count > 0;

  const displayFilename = session.filename
    ? session.filename.split('/').pop() ?? session.filename
    : '—';

  return (
    <div className="flex flex-col gap-1 py-3 px-4 border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors">
      <div className="flex items-center justify-between gap-2 min-w-0">
        {/* Name or filename */}
        <span className="text-sm font-medium truncate" title={session.name ?? session.filename}>
          {session.name ?? displayFilename}
        </span>

        {/* Message count badge */}
        <Badge
          variant="outline"
          size="sm"
          className="shrink-0 tabular-nums"
        >
          {session.message_count > 0 ? `${session.message_count} msgs` : 'Unknown'}
        </Badge>
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {/* Filename (when session has a name, show filename as secondary) */}
        {session.name && (
          <span className="font-mono truncate max-w-[200px]" title={session.filename}>
            {displayFilename}
          </span>
        )}

        {/* User / Assistant breakdown */}
        {hasBreakdown && (
          <span className="shrink-0">
            <span className="text-status-info">{session.user_message_count}u</span>
            {' / '}
            <span className="text-status-success">{session.assistant_message_count}a</span>
          </span>
        )}

        {/* Timestamp */}
        {session.timestamp && (
          <span className="shrink-0 ml-auto">{formatTimestamp(session.timestamp)}</span>
        )}
      </div>

      {/* First message preview */}
      {session.first_message && (
        <p className="text-xs text-muted-foreground italic truncate" title={session.first_message}>
          &ldquo;{session.first_message}&rdquo;
        </p>
      )}
    </div>
  );
}

export function Gsd2SessionsTab({ projectId }: Gsd2SessionsTabProps) {
  const [search, setSearch] = useState('');
  const { data: sessions, isLoading, isError } = useGsd2Sessions(projectId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> Sessions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> Sessions
          </CardTitle>
        </CardHeader>
        <CardContent className="py-4 text-center text-sm text-status-error">
          Failed to load sessions — check that the project path is accessible.
        </CardContent>
      </Card>
    );
  }

  if (!sessions || sessions.length === 0) {
    return (
      <ViewEmpty
        icon={<MessageSquare className="h-8 w-8" />}
        message="No sessions yet"
        description="Run a GSD-2 session to see it here"
      />
    );
  }

  const query = search.trim().toLowerCase();
  const filtered = query
    ? sessions.filter(
        (s) =>
          s.filename.toLowerCase().includes(query) ||
          (s.name?.toLowerCase().includes(query) ?? false) ||
          (s.first_message?.toLowerCase().includes(query) ?? false),
      )
    : sessions;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> Sessions
            <span className="text-xs font-normal text-muted-foreground">
              ({sessions.length})
            </span>
          </CardTitle>
        </div>
        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or filename…"
            className="pl-8 h-8 text-xs"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No sessions match &ldquo;{search}&rdquo;
          </p>
        ) : (
          filtered.map((session, idx) => (
            <SessionRow
              key={session.filename || `session-${idx}`}
              session={session}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}
