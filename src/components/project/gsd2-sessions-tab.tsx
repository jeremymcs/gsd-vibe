// VCCA - GSD-2 Sessions Tab Component
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { useState } from 'react';
import { MessageSquare, Search, Copy, Check, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ViewEmpty } from '@/components/shared/loading-states';
import { useGsd2Sessions } from '@/lib/queries';
import { useCopyToClipboard } from '@/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { formatRelativeTime } from '@/lib/utils';
import type { GsdSessionEntry } from '@/lib/tauri';

interface Gsd2SessionsTabProps {
  projectId: string;
  projectPath: string;
}

interface SessionRowProps {
  session: GsdSessionEntry;
}

function SessionRow({ session }: SessionRowProps) {
  const { copyToClipboard, copiedItems } = useCopyToClipboard();
  const hasBreakdown =
    session.user_message_count > 0 || session.assistant_message_count > 0;

  const displayFilename = session.filename
    ? session.filename.split('/').pop() ?? session.filename
    : '—';

  return (
    <div className="flex flex-col gap-1 py-3 px-4 border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors group">
      <div className="flex items-center justify-between gap-2 min-w-0">
        {/* Name or filename */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-sm font-medium truncate" title={session.name ?? session.filename}>
            {session.name ?? displayFilename}
          </span>
          {session.filename && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => {
                      copyToClipboard(session.filename, `Copied session filename: ${session.filename}`);
                    }}
                  >
                    {copiedItems.has(session.filename) ? (
                      <Check className="h-3 w-3 text-green-600" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  Copy filename: {session.filename}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

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
          <span className="shrink-0 ml-auto">{formatRelativeTime(session.timestamp)}</span>
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
  const [isRefreshing, setIsRefreshing] = useState(false);

  const queryClient = useQueryClient();
  const { data: sessions, isLoading, isError } = useGsd2Sessions(projectId);

  const handleRefresh = () => {
    setIsRefreshing(true);
    queryClient.invalidateQueries({ queryKey: queryKeys.gsd2Sessions(projectId) })
      .finally(() => setIsRefreshing(false));
  };

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
    <TooltipProvider delayDuration={300}>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Sessions
              <span className="text-xs font-normal text-muted-foreground">
                ({sessions.length})
              </span>
            </CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleRefresh}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh sessions</TooltipContent>
            </Tooltip>
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
    </TooltipProvider>
  );
}
