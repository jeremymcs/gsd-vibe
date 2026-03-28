// GSD Vibe - Unified Sessions View
// Session history browser with search, detail view, rename, and delete
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  RefreshCw, History, Search, Pencil, Trash2, ArrowLeft, User, Bot,
  MessageSquare, Check, X, Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  useGsd2Sessions,
  useGsd2SessionDetail,
  useGsd2RenameSession,
  useGsd2DeleteSession,
} from '@/lib/queries';
import type { GsdSessionEntry } from '@/lib/tauri';

interface Gsd2SessionBrowserProps {
  projectId: string;
  projectPath: string;
}

export function Gsd2SessionBrowser({ projectId }: Gsd2SessionBrowserProps) {
  const [search, setSearch] = useState('');
  const [selectedFilename, setSelectedFilename] = useState<string | null>(null);
  const { data: sessions, isLoading, isError, refetch } = useGsd2Sessions(projectId);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try { await refetch(); } finally { setIsRefreshing(false); }
  };

  const filtered = (sessions ?? []).filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (s.first_message ?? '').toLowerCase().includes(q) ||
      (s.name ?? '').toLowerCase().includes(q) ||
      s.timestamp.toLowerCase().includes(q)
    );
  });

  if (selectedFilename) {
    return (
      <SessionDetailView
        projectId={projectId}
        filename={selectedFilename}
        onBack={() => setSelectedFilename(null)}
      />
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0">
        <History className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Sessions</h2>
        <span className="text-xs text-muted-foreground tabular-nums">
          {sessions?.length ?? 0}
        </span>
        <div className="flex-1" />
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search sessions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="p-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <div className="flex-1 flex items-center justify-center text-sm text-destructive">
          Failed to load sessions
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-2">
            <History className="h-8 w-8 mx-auto text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              {search ? 'No sessions match your search' : 'No sessions found'}
            </p>
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 space-y-2">
            {filtered.map((session) => (
              <SessionCard
                key={session.filename}
                session={session}
                projectId={projectId}
                onSelect={() => setSelectedFilename(session.filename)}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

// ─── Session Card ─────────────────────────────────────────────────────────────

function SessionCard({
  session,
  projectId,
  onSelect,
}: {
  session: GsdSessionEntry;
  projectId: string;
  onSelect: () => void;
}) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const renameMutation = useGsd2RenameSession();
  const deleteMutation = useGsd2DeleteSession();

  useEffect(() => {
    if (isRenaming) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isRenaming]);

  const handleStartRename = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setRenameValue(session.name ?? '');
    setIsRenaming(true);
  }, [session.name]);

  const handleRenameSubmit = useCallback(() => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== (session.name ?? '')) {
      renameMutation.mutate({ projectId, filename: session.filename, newName: trimmed });
    }
    setIsRenaming(false);
  }, [renameValue, session.name, session.filename, projectId, renameMutation]);

  const handleRenameCancel = useCallback(() => {
    setIsRenaming(false);
  }, []);

  const handleDelete = useCallback(() => {
    deleteMutation.mutate({ projectId, filename: session.filename });
    setShowDeleteDialog(false);
  }, [projectId, session.filename, deleteMutation]);

  const date = formatTimestamp(session.timestamp);

  return (
    <>
      <Card
        className="group cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={onSelect}
      >
        <CardContent className="p-3">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              {/* Name or date as title */}
              <div className="flex items-center gap-2 mb-1">
                {isRenaming ? (
                  <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
                    <Input
                      ref={inputRef}
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameSubmit();
                        if (e.key === 'Escape') handleRenameCancel();
                      }}
                      className="h-6 text-xs"
                      placeholder="Session name…"
                    />
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={handleRenameSubmit}>
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={handleRenameCancel}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className="text-sm font-medium truncate">
                      {session.name ?? date}
                    </span>
                    {session.name && (
                      <span className="text-[11px] text-muted-foreground shrink-0">{date}</span>
                    )}
                  </>
                )}
              </div>

              {/* First message preview */}
              {session.first_message && (
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {session.first_message}
                </p>
              )}

              {/* Stats row */}
              <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1 tabular-nums">
                  <MessageSquare className="h-3 w-3" />
                  {session.message_count}
                </span>
                <span className="flex items-center gap-1 tabular-nums">
                  <User className="h-3 w-3" />
                  {session.user_message_count}
                </span>
                <span className="flex items-center gap-1 tabular-nums">
                  <Bot className="h-3 w-3" />
                  {session.assistant_message_count}
                </span>
              </div>
            </div>

            {/* Actions — visible on hover */}
            {!isRenaming && (
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleStartRename}
                  title="Rename session"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); setShowDeleteDialog(true); }}
                  title="Delete session"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this session log. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Session Detail View ──────────────────────────────────────────────────────

function SessionDetailView({
  projectId,
  filename,
  onBack,
}: {
  projectId: string;
  filename: string;
  onBack: () => void;
}) {
  const { data: detail, isLoading, isError } = useGsd2SessionDetail(projectId, filename, true);

  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        <DetailHeader onBack={onBack} title="Loading…" />
        <div className="p-4 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-3/4" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !detail) {
    return (
      <div className="h-full flex flex-col">
        <DetailHeader onBack={onBack} title="Error" />
        <div className="flex-1 flex items-center justify-center text-sm text-destructive">
          Failed to load session detail
        </div>
      </div>
    );
  }

  const title = detail.name ?? formatTimestamp(detail.timestamp);

  return (
    <div className="h-full flex flex-col">
      <DetailHeader onBack={onBack} title={title} subtitle={detail.cwd ?? undefined} messageCount={detail.messages.length} />
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-3 max-w-4xl mx-auto">
          {detail.messages.map((msg, i) => (
            <MessageBubble key={i} role={msg.role} text={msg.text} timestamp={msg.timestamp} />
          ))}
          {detail.messages.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-8">
              No messages in this session
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function DetailHeader({
  onBack,
  title,
  subtitle,
  messageCount,
}: {
  onBack: () => void;
  title: string;
  subtitle?: string;
  messageCount?: number;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0">
      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onBack}>
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-semibold truncate">{title}</h2>
        {subtitle && (
          <p className="text-[11px] text-muted-foreground font-mono truncate">{subtitle}</p>
        )}
      </div>
      {messageCount !== undefined && (
        <span className="text-xs text-muted-foreground flex items-center gap-1 tabular-nums shrink-0">
          <MessageSquare className="h-3.5 w-3.5" />
          {messageCount} messages
        </span>
      )}
    </div>
  );
}

function MessageBubble({ role, text, timestamp }: { role: string; text: string; timestamp: string }) {
  const isUser = role === 'user';
  const time = formatTimestamp(timestamp, true);

  return (
    <div className={cn('flex gap-2.5', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="shrink-0 h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
          <Bot className="h-3.5 w-3.5 text-primary" />
        </div>
      )}
      <div
        className={cn(
          'rounded-lg px-3 py-2 max-w-[80%] text-sm leading-relaxed',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted'
        )}
      >
        <p className="whitespace-pre-wrap break-words">{text}</p>
        <div className={cn(
          'flex items-center gap-1 mt-1 text-[10px]',
          isUser ? 'text-primary-foreground/60 justify-end' : 'text-muted-foreground'
        )}>
          <Clock className="h-2.5 w-2.5" />
          {time}
        </div>
      </div>
      {isUser && (
        <div className="shrink-0 h-7 w-7 rounded-full bg-primary flex items-center justify-center mt-0.5">
          <User className="h-3.5 w-3.5 text-primary-foreground" />
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTimestamp(ts: string, timeOnly = false): string {
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return ts;
    if (timeOnly) {
      return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return ts;
  }
}
