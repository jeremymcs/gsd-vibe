// GSD Vibe - GSD-2 Chat Mode Tab
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  MessagesSquare, Send, Play, Zap, Square, Pause, BarChart3,
  LayoutGrid, ListOrdered, History, Compass, PenLine, Inbox,
  Undo2, BookOpen, Settings, FileOutput, Stethoscope, ChevronRight,
  ChevronDown, MoreHorizontal, Terminal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ptyWrite, onPtyOutput } from '@/lib/tauri';
import type { PtyOutputEvent } from '@/lib/tauri';
import type { UnlistenFn } from '@tauri-apps/api/event';
import { PtyChatParser, type ChatMessage } from '@/lib/pty-chat-parser';
import type { UseHeadlessSessionReturn } from '@/hooks/use-headless-session';

// ─── GSD Command Actions ──────────────────────────────────────────────────────

interface GsdAction {
  label: string;
  command: string;
  icon: React.ElementType;
  description: string;
  category: 'workflow' | 'visibility' | 'correction' | 'knowledge' | 'config';
}

const GSD_ACTIONS: GsdAction[] = [
  // Top actions (shown as standalone buttons)
  { label: 'Auto',    command: '/gsd auto',      icon: Zap,         description: 'Run all queued units continuously',         category: 'workflow' },
  { label: 'Next',    command: '/gsd next',      icon: Play,        description: 'Execute next task, then pause',             category: 'workflow' },
  { label: 'Stop',    command: '/gsd stop',      icon: Square,      description: 'Stop auto-mode gracefully',                category: 'workflow' },
  { label: 'Pause',   command: '/gsd pause',     icon: Pause,       description: 'Pause auto-mode (preserves state)',        category: 'workflow' },
  // Overflow: Visibility
  { label: 'Status',    command: '/gsd status',    icon: BarChart3,   description: 'Show progress dashboard',                  category: 'visibility' },
  { label: 'Visualize', command: '/gsd visualize', icon: LayoutGrid,  description: 'Interactive TUI visualizer',               category: 'visibility' },
  { label: 'Queue',     command: '/gsd queue',     icon: ListOrdered, description: 'Show queued/dispatched units',             category: 'visibility' },
  { label: 'History',   command: '/gsd history',   icon: History,     description: 'View execution history',                   category: 'visibility' },
  // Overflow: Course correction
  { label: 'Steer',   command: '/gsd steer',    icon: Compass,   description: 'Apply user override to active work',        category: 'correction' },
  { label: 'Capture', command: '/gsd capture',  icon: PenLine,   description: 'Quick-capture a thought to CAPTURES.md',    category: 'correction' },
  { label: 'Undo',    command: '/gsd undo',     icon: Undo2,     description: 'Undo last completed unit',                  category: 'correction' },
  // Overflow: Knowledge
  { label: 'Inspect', command: '/gsd inspect',  icon: Inbox,     description: 'Show project metadata and decision counts', category: 'knowledge' },
  { label: 'Hooks',   command: '/gsd hooks',    icon: BookOpen,  description: 'Show hook configuration',                  category: 'knowledge' },
  // Overflow: Config
  { label: 'Settings', command: '/gsd settings', icon: Settings,    description: 'Open settings',                           category: 'config' },
  { label: 'Export',   command: '/gsd export',   icon: FileOutput,  description: 'Export project progress',                 category: 'config' },
  { label: 'Doctor',   command: '/gsd doctor',   icon: Stethoscope, description: 'Run project health check',                category: 'config' },
];

const TOP_ACTIONS = GSD_ACTIONS.slice(0, 3);
const OVERFLOW_ACTIONS = GSD_ACTIONS.slice(3);

// ─── Helper: update-or-append message in list ─────────────────────────────────

function updateOrAppend(prev: ChatMessage[], msg: ChatMessage): ChatMessage[] {
  const idx = prev.findIndex((m) => m.id === msg.id);
  if (idx === -1) return [...prev, { ...msg }];
  const next = [...prev];
  next[idx] = { ...msg };
  return next;
}

// ─── Message Bubble Components ────────────────────────────────────────────────

function ToolCallBlock({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false);
  // Extract first line as the tool name/signature
  const lines = content.trim().split('\n');
  const header = lines[0] ?? '';
  const rest = lines.slice(1).join('\n');

  return (
    <div className="my-1 rounded border border-border/50 bg-muted/30 text-xs font-mono overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-muted-foreground hover:text-foreground transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0" />
        )}
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

/** Detect whether a content line is a tool-call line */
function isToolCallLine(line: string): boolean {
  return /^(Bash|Read|Write|Edit|lsp|browser_|bg_shell|async_bash|await_job|subagent|web_search|fetch_page|mac_|mcp_|secure_env|github_|gsd_|discover_configs|Skill)\b/.test(line.trim());
}

/** Split content into segments: regular text vs tool-call blocks */
function splitIntoSegments(content: string): Array<{ type: 'text' | 'tool'; content: string }> {
  const segments: Array<{ type: 'text' | 'tool'; content: string }> = [];
  const lines = content.split('\n');
  let currentType: 'text' | 'tool' | null = null;
  let current: string[] = [];

  const flush = () => {
    if (current.length > 0 && currentType) {
      segments.push({ type: currentType, content: current.join('\n') });
    }
    current = [];
  };

  for (const line of lines) {
    const lineType: 'text' | 'tool' = isToolCallLine(line) ? 'tool' : 'text';
    if (lineType !== currentType) {
      flush();
      currentType = lineType;
    }
    current.push(line);
  }
  flush();
  return segments;
}

function AssistantBubble({ message }: { message: ChatMessage }) {
  // TUI select prompt override
  if (message.prompt?.kind === 'select' && message.prompt.options.length >= 2) {
    return (
      <div className="flex justify-start mb-3">
        <Card className="max-w-[85%] border-status-info/30 bg-status-info/5">
          <CardContent className="p-3 text-sm">
            {message.prompt.label && (
              <p className="mb-2 font-medium text-foreground">{message.prompt.label}</p>
            )}
            <div className="space-y-1">
              {message.prompt.options.map((opt, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex items-center gap-2 px-2 py-1 rounded text-xs',
                    i === message.prompt!.selectedIndex
                      ? 'bg-primary/15 text-primary font-medium'
                      : 'text-muted-foreground',
                  )}
                >
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

  // TUI text/password prompt
  if (message.prompt?.kind === 'text' || message.prompt?.kind === 'password') {
    return (
      <div className="flex justify-start mb-3">
        <Card className="max-w-[85%] border-status-warning/30 bg-status-warning/5">
          <CardContent className="p-3 text-sm">
            <p className="text-foreground">
              {message.prompt.kind === 'password' ? '🔑' : '◆'} {message.prompt.label}
            </p>
            <p className="mt-1 text-xs text-muted-foreground italic">
              {message.prompt.kind === 'password' ? 'Awaiting API key input…' : 'Awaiting text input…'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const segments = splitIntoSegments(message.content);
  const hasContent = message.content.trim().length > 0;

  if (!hasContent && message.complete) return null;

  return (
    <div className="flex justify-start mb-3">
      <div className="max-w-[85%]">
        <div className="flex items-center gap-1.5 mb-1">
          <MessagesSquare className="h-3 w-3 text-status-info" />
          <span className="text-[10px] text-muted-foreground">assistant</span>
          {!message.complete && (
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-status-info animate-pulse" />
          )}
        </div>
        <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-foreground">
          {segments.map((seg, i) =>
            seg.type === 'tool' ? (
              <ToolCallBlock key={i} content={seg.content} />
            ) : (
              <p key={i} className="whitespace-pre-wrap break-words leading-relaxed">
                {seg.content}
              </p>
            ),
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
      <span className="text-[11px] text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-full">
        {message.content}
      </span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Gsd2ChatTabProps {
  projectId: string;
  projectPath: string;
  session: UseHeadlessSessionReturn;
}

export function Gsd2ChatTab({ projectId: _projectId, session }: Gsd2ChatTabProps) {
  const { status, sessionId, messages, setMessages } = session;

  const [input, setInput] = useState('');
  const parserRef = useRef<PtyChatParser | null>(null);
  const unlistenRef = useRef<UnlistenFn | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  // Create parser instance once
  if (!parserRef.current) {
    parserRef.current = new PtyChatParser('vibeflow');
    parserRef.current.onMessage((msg) => {
      setMessages((prev) => updateOrAppend(prev, msg));
    });
  }

  // Subscribe to PTY output when sessionId is available
  useEffect(() => {
    if (!sessionId) {
      // Reset parser state when session ends
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
      const text = new TextDecoder().decode(new Uint8Array(event.data));
      parser.feed(text);
    }).then((unlisten) => {
      if (cancelled) {
        unlisten();
        return;
      }
      unlistenRef.current = unlisten;
    });

    return () => {
      cancelled = true;
      unlistenRef.current?.();
      unlistenRef.current = null;
    };
  }, [sessionId]);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    if (isAtBottomRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 40;
  }, []);

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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // ── Idle state ──
  if (status === 'idle') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center p-8">
        <MessagesSquare className="h-10 w-10 text-muted-foreground/40" />
        <div>
          <p className="text-sm font-medium text-foreground">No active session</p>
          <p className="text-xs text-muted-foreground mt-1">
            Start a headless session from the <strong>GSD</strong> tab to use chat mode.
          </p>
        </div>
        <Badge variant="outline" className="text-xs text-muted-foreground">
          idle
        </Badge>
      </div>
    );
  }

  // ── Failed with no output (fast exit — e.g. stale PID guard) ──
  if (status === 'failed' && messages.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center p-8">
        <MessagesSquare className="h-10 w-10 text-status-error/40" />
        <div>
          <p className="text-sm font-medium text-foreground">Session failed to start</p>
          <p className="text-xs text-muted-foreground mt-1">
            GSD may have exited immediately. Check the <strong>GSD</strong> tab for details — another session may already be running.
          </p>
        </div>
        <Badge variant="outline" className="text-xs text-status-error border-status-error/30">
          failed
        </Badge>
      </div>
    );
  }

  // ── Starting state ──
  if (status === 'running' && messages.length === 0) {
    return (
      <div className="flex h-full flex-col gap-3 p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="h-2 w-2 rounded-full bg-status-success animate-pulse" />
          <span className="text-xs text-muted-foreground">Session starting…</span>
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" style={{ width: `${70 + (i % 3) * 10}%` }} />
        ))}
      </div>
    );
  }

  // ── Active / complete state ──
  return (
    <div className="flex h-full flex-col">
      {/* Session status bar */}
      <div className="flex items-center justify-between border-b border-border/50 px-3 py-1.5 shrink-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              status === 'running' ? 'bg-status-success animate-pulse' : 'bg-muted-foreground',
            )}
          />
          <span className="text-xs text-muted-foreground">
            {status === 'running' ? 'Active session' : status === 'complete' ? 'Session complete' : 'Session failed'}
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground/60">{messages.length} messages</span>
      </div>

      {/* Message list */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-3 space-y-0"
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

      {/* Command bar */}
      <div className="border-t border-border/50 p-2 shrink-0 space-y-2">
        {/* Quick action buttons */}
        <div className="flex gap-1">
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
    </div>
  );
}
