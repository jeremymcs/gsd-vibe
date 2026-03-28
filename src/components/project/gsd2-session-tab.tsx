// GSD Vibe - GSD-2 Session Tab (merged Headless + Chat)
// Start/stop sessions, pick models, view chat output, send commands — all in one surface.
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { useRef, useEffect, useState, useCallback } from 'react';
import {
  MessagesSquare, Send, Play, Zap, Square, Pause, BarChart3,
  LayoutGrid, ListOrdered, History, Compass, PenLine, Inbox,
  Undo2, BookOpen, Settings, FileOutput, Stethoscope,
  ChevronRight, ChevronDown, MoreHorizontal, Terminal, ScrollText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ptyWrite, onPtyOutput, gsd2HeadlessGetSession } from '@/lib/tauri';
import type { PtyOutputEvent } from '@/lib/tauri';
import type { UnlistenFn } from '@tauri-apps/api/event';
import { PtyChatParser, type ChatMessage } from '@/lib/pty-chat-parser';
import type { UseHeadlessSessionReturn, HeadlessLogRow } from '@/hooks/use-headless-session';
import {
  useGsd2HeadlessQuery,
  useGsd2HeadlessStart,
  useGsd2HeadlessStop,
  useGsd2ListModels,
  useGsd2HeadlessStartWithModel,
} from '@/lib/queries';
import { formatCost, formatRelativeTime } from '@/lib/utils';

// ─── /gsd command actions ─────────────────────────────────────────────────────

interface GsdAction {
  label: string;
  command: string;
  icon: React.ElementType;
  description: string;
  category: 'workflow' | 'visibility' | 'correction' | 'knowledge' | 'config';
}

const GSD_ACTIONS: GsdAction[] = [
  { label: 'Auto',     command: '/gsd auto',      icon: Zap,         description: 'Run all queued units continuously',         category: 'workflow'    },
  { label: 'Next',     command: '/gsd next',      icon: Play,        description: 'Execute next task, then pause',             category: 'workflow'    },
  { label: 'Stop',     command: '/gsd stop',      icon: Square,      description: 'Stop auto-mode gracefully',                 category: 'workflow'    },
  { label: 'Pause',    command: '/gsd pause',     icon: Pause,       description: 'Pause auto-mode (preserves state)',         category: 'workflow'    },
  { label: 'Status',   command: '/gsd status',    icon: BarChart3,   description: 'Show progress dashboard',                   category: 'visibility'  },
  { label: 'Visualize',command: '/gsd visualize', icon: LayoutGrid,  description: 'Interactive TUI visualizer',                category: 'visibility'  },
  { label: 'Queue',    command: '/gsd queue',     icon: ListOrdered, description: 'Show queued/dispatched units',              category: 'visibility'  },
  { label: 'History',  command: '/gsd history',   icon: History,     description: 'View execution history',                    category: 'visibility'  },
  { label: 'Steer',    command: '/gsd steer',     icon: Compass,     description: 'Apply user override to active work',        category: 'correction'  },
  { label: 'Capture',  command: '/gsd capture',   icon: PenLine,     description: 'Quick-capture a thought to CAPTURES.md',   category: 'correction'  },
  { label: 'Undo',     command: '/gsd undo',      icon: Undo2,       description: 'Undo last completed unit',                  category: 'correction'  },
  { label: 'Inspect',  command: '/gsd inspect',   icon: Inbox,       description: 'Show project metadata and decision counts', category: 'knowledge'   },
  { label: 'Hooks',    command: '/gsd hooks',     icon: BookOpen,    description: 'Show hook configuration',                   category: 'knowledge'   },
  { label: 'Settings', command: '/gsd settings',  icon: Settings,    description: 'Open settings',                             category: 'config'      },
  { label: 'Export',   command: '/gsd export',    icon: FileOutput,  description: 'Export project progress',                   category: 'config'      },
  { label: 'Doctor',   command: '/gsd doctor',    icon: Stethoscope, description: 'Run project health check',                  category: 'config'      },
];

const TOP_ACTIONS = GSD_ACTIONS.slice(0, 3);
const OVERFLOW_ACTIONS = GSD_ACTIONS.slice(3);

// ─── Props ────────────────────────────────────────────────────────────────────

interface Gsd2SessionTabProps {
  projectId: string;
  projectPath: string;
  session: UseHeadlessSessionReturn;
}

// ─── Session header (status + start/stop controls) ────────────────────────────

interface SessionHeaderProps {
  projectId: string;
  session: UseHeadlessSessionReturn;
  selectedModel: string;
  setSelectedModel: (m: string) => void;
}

function SessionHeader({ projectId, session, selectedModel, setSelectedModel }: SessionHeaderProps) {
  const {
    status, sessionId, lastSnapshot, completedAt,
    setSessionId, setStatus, clearLogs,
  } = session;

  const statusRef = useRef(status);
  useEffect(() => { statusRef.current = status; }, [status]);

  const headlessQuery = useGsd2HeadlessQuery(projectId, status === 'idle');
  const modelsQuery = useGsd2ListModels();
  const startMutation = useGsd2HeadlessStart();
  const startWithModelMutation = useGsd2HeadlessStartWithModel();
  const stopMutation = useGsd2HeadlessStop();

  // Group models by provider for the picker
  const providers = modelsQuery.data
    ? Array.from(new Set(modelsQuery.data.map((m) => m.provider)))
    : [];

  const displaySnapshot = lastSnapshot ?? headlessQuery.data ?? null;

  const dotColor =
    status === 'idle'     ? 'bg-muted-foreground' :
    status === 'running'  ? 'bg-status-success animate-pulse' :
    status === 'complete' ? 'bg-status-success' :
                            'bg-status-error';

  const statusLabel =
    status === 'idle'     ? 'Idle' :
    status === 'running'  ? 'Running' :
    status === 'complete' ? 'Complete' : 'Failed';

  let inlineText: string | null = null;
  if (status === 'running' && displaySnapshot) {
    inlineText = formatCost(displaySnapshot.cost) + ' so far';
  } else if (completedAt && (status === 'complete' || status === 'idle')) {
    inlineText = 'Last run ' + formatRelativeTime(completedAt);
  }

  const handleStart = async () => {
    clearLogs();
    setStatus('running');
    try {
      const sid = selectedModel && selectedModel !== '__default__'
        ? await (async () => {
            await startWithModelMutation.mutateAsync({ projectId, model: selectedModel });
            return await gsd2HeadlessGetSession(projectId);
          })()
        : await startMutation.mutateAsync(projectId);

      if (!sid) { setStatus('failed'); return; }
      setSessionId(sid);
      // Safety poll: if GSD exits before listeners attach, catch it
      setTimeout(() => {
        void gsd2HeadlessGetSession(projectId).then((liveSid) => {
          if (liveSid !== sid && statusRef.current === 'running') setStatus('failed');
        });
      }, 3000);
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
      // best-effort
    }
  };

  return (
    <div className="shrink-0 border-b border-border/50 bg-muted/10 px-3 py-2 space-y-2">
      {/* Status row */}
      <div className="flex items-center gap-2">
        <span className={cn('h-2 w-2 rounded-full shrink-0', dotColor)} />
        <span className="text-sm font-semibold">{statusLabel}</span>
        {displaySnapshot?.state && status === 'running' && (
          <span className="text-xs text-muted-foreground truncate max-w-[200px]" title={displaySnapshot.state}>
            {displaySnapshot.state}
          </span>
        )}
        {inlineText && (
          <span className="text-xs text-muted-foreground ml-auto">{inlineText}</span>
        )}
        <div className={cn('flex items-center gap-1', inlineText ? '' : 'ml-auto')}>
          <Button
            variant="default"
            size="sm"
            className="h-7 text-xs"
            disabled={status === 'running'}
            onClick={() => void handleStart()}
          >
            <Play className="h-3.5 w-3.5 mr-1" />
            {status === 'idle' ? 'Start' : 'Restart'}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="h-7 text-xs"
            disabled={status !== 'running'}
            onClick={() => void handleStop()}
          >
            <Square className="h-3.5 w-3.5 mr-1" /> Stop
          </Button>
        </div>
      </div>

      {/* Model picker row — only when idle */}
      {status === 'idle' && providers.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground shrink-0">Model override:</span>
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="h-7 text-xs flex-1">
              <SelectValue placeholder="Default (from preferences)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__default__">Default (from preferences)</SelectItem>
              {providers.map((provider) => (
                <span key={provider}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{provider}</div>
                  {modelsQuery.data?.filter((m) => m.provider === provider).map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))}
                </span>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

// ─── Log view (raw PTY rows) ──────────────────────────────────────────────────

function LogView({ logs, status }: { logs: HeadlessLogRow[]; status: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [logs]);

  if (logs.length === 0 && status === 'idle') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center p-8">
        <ScrollText className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No log output yet</p>
        <p className="text-xs text-muted-foreground/60">Start a session to see execution logs here.</p>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto p-2 font-mono text-xs">
      {logs.map((row, i) => (
        <div key={i} className="flex items-center py-0.5 hover:bg-muted/20 px-1 rounded">
          <span className="w-20 text-muted-foreground shrink-0">[{row.timestamp}]</span>
          <span className="flex-1 truncate px-2 text-foreground/80">{row.state}</span>
          {!row.raw && row.cost_delta > 0 && (
            <span className="w-20 text-right text-status-success shrink-0">+{formatCost(row.cost_delta)}</span>
          )}
        </div>
      ))}
      {status === 'running' && logs.length === 0 && (
        <div className="space-y-2 p-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      )}
    </div>
  );
}

// ─── Chat view (parsed message bubbles) ──────────────────────────────────────

function ToolCallBlock({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false);
  const lines = content.trim().split('\n');
  const header = lines[0] ?? '';
  const rest = lines.slice(1).join('\n');

  return (
    <div className="my-1 rounded border border-border/50 bg-muted/30 text-xs font-mono overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-muted-foreground hover:text-foreground transition-colors"
      >
        {expanded ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
        <Terminal className="h-3 w-3 shrink-0 text-status-info" />
        <span className="truncate">{header}</span>
      </button>
      {expanded && rest && (
        <pre className="border-t border-border/50 px-3 py-2 text-[11px] whitespace-pre-wrap break-words text-muted-foreground">
          {rest}
        </pre>
      )}
    </div>
  );
}

function isToolCallLine(line: string): boolean {
  return /^(Bash|Read|Write|Edit|lsp|browser_|bg_shell|async_bash|await_job|subagent|web_search|fetch_page|mac_|mcp_|secure_env|github_|gsd_|discover_configs|Skill)\b/.test(line.trim());
}

function splitIntoSegments(content: string): Array<{ type: 'text' | 'tool'; content: string }> {
  const segments: Array<{ type: 'text' | 'tool'; content: string }> = [];
  const lines = content.split('\n');
  let currentType: 'text' | 'tool' | null = null;
  let current: string[] = [];
  const flush = () => {
    if (current.length > 0 && currentType) segments.push({ type: currentType, content: current.join('\n') });
    current = [];
  };
  for (const line of lines) {
    const lineType: 'text' | 'tool' = isToolCallLine(line) ? 'tool' : 'text';
    if (lineType !== currentType) { flush(); currentType = lineType; }
    current.push(line);
  }
  flush();
  return segments;
}

function AssistantBubble({ message }: { message: ChatMessage }) {
  if (message.prompt?.kind === 'select' && message.prompt.options.length >= 2) {
    return (
      <div className="flex justify-start mb-3">
        <Card className="max-w-[85%] border-status-info/30 bg-status-info/5">
          <CardContent className="p-3 text-sm">
            {message.prompt.label && <p className="mb-2 font-medium text-foreground">{message.prompt.label}</p>}
            <div className="space-y-1">
              {message.prompt.options.map((opt, i) => (
                <div key={i} className={cn('flex items-center gap-2 px-2 py-1 rounded text-xs', i === message.prompt!.selectedIndex ? 'bg-primary/15 text-primary font-medium' : 'text-muted-foreground')}>
                  <span className="shrink-0">{i === message.prompt!.selectedIndex ? '›' : ' '}</span>
                  <span>{i + 1}. {opt}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (message.prompt?.kind === 'text' || message.prompt?.kind === 'password') {
    return (
      <div className="flex justify-start mb-3">
        <Card className="max-w-[85%] border-status-warning/30 bg-status-warning/5">
          <CardContent className="p-3 text-sm">
            <p className="text-foreground">{message.prompt.kind === 'password' ? '🔑' : '◆'} {message.prompt.label}</p>
            <p className="mt-1 text-xs text-muted-foreground italic">
              {message.prompt.kind === 'password' ? 'Awaiting API key input…' : 'Awaiting text input…'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const segments = splitIntoSegments(message.content);
  if (!message.content.trim() && message.complete) return null;

  return (
    <div className="flex justify-start mb-3">
      <div className="max-w-[85%]">
        <div className="flex items-center gap-1.5 mb-1">
          <MessagesSquare className="h-3 w-3 text-status-info" />
          <span className="text-[10px] text-muted-foreground">assistant</span>
          {!message.complete && <span className="inline-block h-1.5 w-1.5 rounded-full bg-status-info animate-pulse" />}
        </div>
        <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-foreground">
          {segments.map((seg, i) =>
            seg.type === 'tool'
              ? <ToolCallBlock key={i} content={seg.content} />
              : <p key={i} className="whitespace-pre-wrap break-words leading-relaxed">{seg.content}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function UserBubble({ message }: { message: ChatMessage }) {
  if (!message.content.trim()) return null;
  return (
    <div className="flex justify-end mb-3">
      <div className="max-w-[80%]">
        <div className="flex justify-end items-center gap-1.5 mb-1">
          <span className="text-[10px] text-muted-foreground">you</span>
        </div>
        <div className="rounded-lg bg-primary/10 px-3 py-2 text-sm text-foreground">
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>
      </div>
    </div>
  );
}

function SystemBubble({ message }: { message: ChatMessage }) {
  return (
    <div className="flex justify-center mb-2">
      <span className="text-[11px] text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-full">{message.content}</span>
    </div>
  );
}

function ChatView({ sessionId, status }: { sessionId: string | null; status: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const parserRef = useRef<PtyChatParser | null>(null);
  const unlistenRef = useRef<UnlistenFn | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  if (!parserRef.current) {
    parserRef.current = new PtyChatParser('vibeflow');
    parserRef.current.onMessage((msg) => {
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === msg.id);
        if (idx === -1) return [...prev, { ...msg }];
        const next = [...prev];
        next[idx] = { ...msg };
        return next;
      });
    });
  }

  useEffect(() => {
    if (!sessionId) {
      parserRef.current?.reset();
      setMessages([]);
      return;
    }
    const parser = parserRef.current!;
    parser.reset();
    setMessages([]);
    let cancelled = false;
    onPtyOutput(sessionId, (event: PtyOutputEvent) => {
      if (cancelled) return;
      parser.feed(new TextDecoder().decode(new Uint8Array(event.data)));
    }).then((unlisten) => {
      if (cancelled) { unlisten(); return; }
      unlistenRef.current = unlisten;
    });
    return () => {
      cancelled = true;
      unlistenRef.current?.();
      unlistenRef.current = null;
    };
  }, [sessionId]);

  useEffect(() => {
    if (isAtBottomRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 40;
  };

  if (status === 'idle' && messages.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center p-8">
        <MessagesSquare className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No active session</p>
        <p className="text-xs text-muted-foreground/60">Start a session above to begin chatting.</p>
      </div>
    );
  }

  if (status === 'failed' && messages.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center p-8">
        <MessagesSquare className="h-8 w-8 text-status-error/40" />
        <p className="text-sm font-medium">Session failed to start</p>
        <p className="text-xs text-muted-foreground">GSD may have exited immediately. Another session may already be running.</p>
        <Badge variant="outline" className="text-xs text-status-error border-status-error/30">failed</Badge>
      </div>
    );
  }

  if (status === 'running' && messages.length === 0) {
    return (
      <div className="flex h-full flex-col gap-3 p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="h-2 w-2 rounded-full bg-status-success animate-pulse" />
          <span className="text-xs text-muted-foreground">Session starting…</span>
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8" style={{ width: `${70 + (i % 3) * 10}%` }} />
        ))}
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="h-full overflow-y-auto px-3 py-3"
    >
      {messages.length === 0 ? (
        <div className="flex h-full items-center justify-center">
          <p className="text-xs text-muted-foreground">Waiting for output…</p>
        </div>
      ) : (
        messages.map((msg) => {
          if (msg.role === 'user') return <UserBubble key={msg.id} message={msg} />;
          if (msg.role === 'system') return <SystemBubble key={msg.id} message={msg} />;
          return <AssistantBubble key={msg.id} message={msg} />;
        })
      )}
    </div>
  );
}

// ─── Command bar (shared input + quick actions) ───────────────────────────────

function CommandBar({ sessionId }: { sessionId: string | null }) {
  const [input, setInput] = useState('');

  const sendText = useCallback((text: string) => {
    if (!sessionId || !text.trim()) return;
    ptyWrite(sessionId, new TextEncoder().encode(text + '\n'));
  }, [sessionId]);

  const handleSend = useCallback(() => {
    if (!input.trim()) return;
    sendText(input);
    setInput('');
  }, [input, sendText]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  return (
    <div className="shrink-0 border-t border-border/50 p-2 space-y-2 bg-background">
      {/* Quick action buttons */}
      <div className="flex gap-1 flex-wrap">
        {TOP_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.command}
              variant="outline"
              size="sm"
              className="h-7 text-xs px-2 gap-1"
              disabled={!sessionId}
              onClick={() => sendText(action.command)}
              title={action.description}
            >
              <Icon className="h-3 w-3" />
              {action.label}
            </Button>
          );
        })}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs px-2" disabled={!sessionId}>
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            {OVERFLOW_ACTIONS.map((action, i) => {
              const Icon = action.icon;
              const prevCategory = i > 0 ? OVERFLOW_ACTIONS[i - 1].category : action.category;
              return (
                <span key={action.command}>
                  {i > 0 && prevCategory !== action.category && <DropdownMenuSeparator />}
                  <DropdownMenuItem onClick={() => sendText(action.command)} className="gap-2 text-xs">
                    <Icon className="h-3 w-3" />
                    <span className="flex-1">{action.label}</span>
                    <span className="text-muted-foreground/60 truncate max-w-[100px]">{action.description}</span>
                  </DropdownMenuItem>
                </span>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Text input */}
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={sessionId ? 'Send a message or /gsd command…' : 'Start a session to chat'}
          disabled={!sessionId}
          className="h-8 text-sm"
        />
        <Button
          size="sm"
          className="h-8 px-3"
          disabled={!sessionId || !input.trim()}
          onClick={handleSend}
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────

type ViewMode = 'chat' | 'log';

export function Gsd2SessionTab({ projectId, session }: Gsd2SessionTabProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('chat');
  const [selectedModel, setSelectedModel] = useState('__default__');
  const { status, sessionId, logs } = session;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Session controls (start/stop/model) */}
      <SessionHeader
        projectId={projectId}
        session={session}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
      />

      {/* View mode toggle */}
      <div className="shrink-0 flex items-center gap-1 px-3 py-1.5 border-b border-border/30 bg-muted/5">
        <button
          onClick={() => setViewMode('chat')}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
            viewMode === 'chat'
              ? 'bg-accent text-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
          )}
        >
          <MessagesSquare className="h-3 w-3" />
          Chat
        </button>
        <button
          onClick={() => setViewMode('log')}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
            viewMode === 'log'
              ? 'bg-accent text-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
          )}
        >
          <ScrollText className="h-3 w-3" />
          Log
          {logs.length > 0 && (
            <span className="ml-1 text-[10px] text-muted-foreground tabular-nums">{logs.length}</span>
          )}
        </button>
      </div>

      {/* Main content area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {viewMode === 'chat'
          ? <ChatView sessionId={sessionId} status={status} />
          : <LogView logs={logs} status={status} />
        }
      </div>

      {/* Command bar — always visible */}
      <CommandBar sessionId={sessionId} />
    </div>
  );
}
