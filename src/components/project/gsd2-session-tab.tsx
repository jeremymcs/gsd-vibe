// GSD Vibe - GSD-2 Session Tab
// Left: status bar + terminal + command bar + input. Right: milestone tree.
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { useState, useCallback, useRef } from 'react';
import {
  Play, Square, Zap, SkipForward, RotateCcw,
  Send, Target, Layers, CheckCircle2, Circle, Loader2,
  ChevronRight, ChevronDown, Pause, BarChart3, ListOrdered, Compass,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { UseHeadlessSessionReturn } from '@/hooks/use-headless-session';
import type { Gsd2Health } from '@/lib/tauri';
import { ptyWrite } from '@/lib/tauri';
import {
  useGsd2Models,
  useGsd2Health,
} from '@/lib/queries';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { InteractiveTerminal, type InteractiveTerminalRef } from '@/components/terminal/interactive-terminal';
import { useTerminalContext } from '@/contexts/terminal-context';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Gsd2SessionTabProps {
  projectId: string;
  projectPath: string;
  session: UseHeadlessSessionReturn;
}

// ─── Root component ───────────────────────────────────────────────────────────

export function Gsd2SessionTab({ projectId, projectPath }: Gsd2SessionTabProps) {
  const [selectedModel, setSelectedModel] = useState('__default__');
  const [headlessKey, setHeadlessKey] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const headlessRef = useRef<InteractiveTerminalRef>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: health } = useGsd2Health(projectId);
  const modelsQuery = useGsd2Models();
  const { terminalFontSize, headlessRunning, headlessSessionId, setHeadlessState } = useTerminalContext();

  // Note: auto-expand of bottom terminal panel is handled by main-layout.tsx
  // when activeView === 'gsd2-headless'

  const providers = Array.from(new Set((modelsQuery.data ?? []).map((m) => m.provider)));

  const headlessCommand = selectedModel && selectedModel !== '__default__'
    ? `gsd headless --model ${selectedModel}`
    : 'gsd headless';

  const writeToHeadless = useCallback((text: string) => {
    if (headlessSessionId) {
      void ptyWrite(headlessSessionId, new TextEncoder().encode(text + '\r'));
    }
  }, [headlessSessionId]);

  const handleStart = useCallback(() => {
    setHeadlessState(true, null);
    setHeadlessKey((k) => k + 1);
  }, [setHeadlessState]);

  const handleStop = useCallback(() => { writeToHeadless('/gsd stop'); }, [writeToHeadless]);
  const handleNext = useCallback(() => { writeToHeadless('/gsd next'); }, [writeToHeadless]);
  const handleRestart = useCallback(() => { writeToHeadless('/gsd restart'); }, [writeToHeadless]);
  const handlePause = useCallback(() => { writeToHeadless('/gsd pause'); }, [writeToHeadless]);
  const handleStatus = useCallback(() => { writeToHeadless('/gsd status'); }, [writeToHeadless]);
  const handleQueue = useCallback(() => {
    setInputValue('/gsd queue ');
    inputRef.current?.focus();
  }, []);
  const handleSteer = useCallback(() => {
    setInputValue('/gsd steer ');
    inputRef.current?.focus();
  }, []);

  const handleStartAuto = useCallback(() => {
    const modelFlag = selectedModel && selectedModel !== '__default__'
      ? ` --model ${selectedModel}`
      : '';
    writeToHeadless(`/gsd auto${modelFlag}`);
  }, [selectedModel, writeToHeadless]);

  const handleSendInput = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    writeToHeadless(trimmed);
    setInputValue('');
    inputRef.current?.focus();
  }, [inputValue, writeToHeadless]);

  const handleHeadlessSessionCreated = useCallback((sid: string) => {
    setHeadlessState(true, sid);
  }, [setHeadlessState]);

  const handleHeadlessExit = useCallback(() => {
    setHeadlessState(false, null);
  }, [setHeadlessState]);

  const phase = health?.phase ?? 'unknown';
  const cost = health?.budget_spent ?? 0;
  const completedUnits = (health?.tasks_done ?? 0) + (health?.slices_done ?? 0) + (health?.milestones_done ?? 0);

  return (
    <div className="flex h-full overflow-hidden">
      <Group orientation="horizontal" className="h-full w-full">
        {/* ── Main session panel ──────────────────────────────── */}
        <Panel defaultSize="80%" minSize="50%">
          <div className="flex flex-col h-full">
            {/* Status bar */}
            <div className="flex items-center gap-3 px-4 py-2 border-b bg-muted/20 shrink-0">
              <span className={cn(
                'h-2.5 w-2.5 rounded-full shrink-0',
                headlessRunning ? 'bg-green-500' : 'bg-muted-foreground/40'
              )} />
              <span className="text-sm font-semibold">
                {headlessRunning ? 'Running' : 'Idle'}
              </span>
              <span className="text-sm text-muted-foreground">{phase}</span>

              <div className="flex-1" />

              <span className="text-sm text-muted-foreground tabular-nums">
                ${cost.toFixed(2)} so far
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {completedUnits} units
              </span>

              {headlessRunning ? (
                <div className="flex items-center gap-1.5">
                  <Button variant="default" size="sm" className="h-7 text-xs px-3" onClick={handleRestart}>
                    <Play className="h-3 w-3 mr-1" /> Restart
                  </Button>
                  <Button variant="destructive" size="sm" className="h-7 text-xs px-3" onClick={handleStop}>
                    <Square className="h-3 w-3 mr-1" /> Stop
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  {providers.length > 0 && (
                    <Select value={selectedModel} onValueChange={setSelectedModel}>
                      <SelectTrigger className="h-7 text-xs w-[130px]">
                        <SelectValue placeholder="Default model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__default__">Default</SelectItem>
                        {providers.map((provider) => (
                          <span key={provider}>
                            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">{provider}</div>
                            {modelsQuery.data?.filter((m) => m.provider === provider).map((model) => (
                              <SelectItem key={model.id} value={model.id}>{model.name}</SelectItem>
                            ))}
                          </span>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Button variant="default" size="sm" className="h-7 text-xs px-3" onClick={handleStart}>
                    <Play className="h-3 w-3 mr-1" /> Start
                  </Button>
                </div>
              )}
            </div>

            {/* Terminal */}
            <div className="flex-1 min-h-0 bg-[hsl(var(--terminal-bg))]">
              {headlessRunning ? (
                <InteractiveTerminal
                  key={headlessKey}
                  ref={headlessRef}
                  persistKey={`${projectId}:gsd-headless`}
                  workingDirectory={projectPath}
                  command={headlessCommand}
                  fontSize={terminalFontSize}
                  readOnly
                  onSessionCreated={handleHeadlessSessionCreated}
                  onExit={handleHeadlessExit}
                  className="h-full"
                />
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center space-y-3">
                    <Play className="h-10 w-10 mx-auto opacity-20" />
                    <div>
                      <p className="text-sm font-medium">GSD Headless</p>
                      <p className="text-xs text-muted-foreground/70 mt-1">Start a session to run GSD auto-mode</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Workflow controls + input */}
            {headlessRunning && (
              <div className="flex items-center gap-2 px-3 py-2 border-t bg-background shrink-0">
                <Button variant="outline" size="sm" className="h-8 text-xs px-2.5 shrink-0" onClick={handleStartAuto}>
                  <Zap className="h-3 w-3 mr-1" /> Auto
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs px-2.5 shrink-0" onClick={handleNext}>
                  <SkipForward className="h-3 w-3 mr-1" /> Next
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs px-2.5 shrink-0" onClick={handlePause}>
                  <Pause className="h-3 w-3 mr-1" /> Pause
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs px-2.5 shrink-0" onClick={handleStop}>
                  <Square className="h-3 w-3 mr-1" /> Stop
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs px-2.5 shrink-0" onClick={handleRestart}>
                  <RotateCcw className="h-3 w-3 mr-1" /> Restart
                </Button>

                <div className="w-px h-5 bg-border mx-0.5 shrink-0" />

                <Button variant="outline" size="sm" className="h-8 text-xs px-2.5 shrink-0" onClick={handleStatus}>
                  <BarChart3 className="h-3 w-3 mr-1" /> Status
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs px-2.5 shrink-0" onClick={handleQueue}>
                  <ListOrdered className="h-3 w-3 mr-1" /> Queue
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs px-2.5 shrink-0" onClick={handleSteer}>
                  <Compass className="h-3 w-3 mr-1" /> Steer
                </Button>

                <div className="w-px h-5 bg-border mx-0.5 shrink-0" />

                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSendInput(); }}
                  placeholder="Send a message or /gsd command…"
                  className="flex-1 h-8 text-sm min-w-0"
                />
                <Button
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={handleSendInput}
                  disabled={!inputValue.trim()}
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </Panel>

        <Separator className="w-1.5 bg-border/50 hover:bg-primary/30 transition-colors data-[resize-handle-active]:bg-primary/50 cursor-col-resize" />

        {/* ── Milestone tree sidebar ──────────────────────────── */}
        <Panel defaultSize="20%" minSize="12%" maxSize="35%">
          <MilestoneTree health={health} />
        </Panel>
      </Group>
    </div>
  );
}

// ─── Milestone Tree Sidebar ───────────────────────────────────────────────────

function MilestoneTree({ health }: { health: Gsd2Health | undefined }) {
  if (!health) {
    return (
      <div className="h-full border-l border-border/50 bg-muted/5 p-3 flex items-center justify-center">
        <span className="text-xs text-muted-foreground">No milestone data</span>
      </div>
    );
  }

  const {
    active_milestone_id,
    active_milestone_title,
    active_slice_id,
    active_slice_title,
    active_task_id,
    active_task_title,
    milestones_done,
    milestones_total,
    slices_done,
    slices_total,
    tasks_done,
    tasks_total,
    phase,
    budget_spent,
    budget_ceiling,
  } = health;

  return (
    <div className="h-full border-l border-border/50 bg-muted/5 overflow-y-auto flex flex-col">
      <div className="px-3 py-2 border-b border-border/30">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Milestones</div>
        {phase && (
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {active_milestone_id}/{active_slice_id} — <span className="text-foreground/70">{phase}</span>
          </div>
        )}
      </div>

      <div className="px-3 py-2 space-y-1.5 border-b border-border/30">
        <ProgressRow label="Milestones" done={milestones_done} total={milestones_total} />
        <ProgressRow label="Slices" done={slices_done} total={slices_total} />
        <ProgressRow label="Tasks" done={tasks_done} total={tasks_total} />
      </div>

      <div className="flex-1 px-1 py-2 overflow-y-auto">
        {active_milestone_id ? (
          <TreeNode
            icon={<Target className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />}
            label={active_milestone_id}
            sublabel={active_milestone_title ?? undefined}
            active
            defaultOpen
          >
            {active_slice_id && (
              <TreeNode
                icon={<Layers className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />}
                label={active_slice_id}
                sublabel={active_slice_title ?? undefined}
                active
                defaultOpen
              >
                {active_task_id && (
                  <TreeNode
                    icon={<ProgressIcon done={tasks_done} total={tasks_total} />}
                    label={active_task_id}
                    sublabel={active_task_title ?? undefined}
                    active
                  />
                )}
              </TreeNode>
            )}
          </TreeNode>
        ) : (
          <div className="px-2 text-xs text-muted-foreground">No active milestone</div>
        )}
      </div>

      {budget_spent > 0 && (
        <div className="px-3 py-2 border-t border-border/30">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Budget</span>
            <span className="tabular-nums font-medium">
              ${budget_spent.toFixed(2)}
              {budget_ceiling != null && budget_ceiling > 0 && (
                <span className="text-muted-foreground"> / ${budget_ceiling.toFixed(2)}</span>
              )}
            </span>
          </div>
          {budget_ceiling != null && budget_ceiling > 0 && (
            <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-1">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  budget_spent / budget_ceiling > 0.9
                    ? 'bg-red-500'
                    : budget_spent / budget_ceiling > 0.7
                      ? 'bg-yellow-600 dark:bg-yellow-500'
                      : 'bg-green-600 dark:bg-green-500'
                )}
                style={{ width: `${Math.min(100, (budget_spent / budget_ceiling) * 100)}%` }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tree helpers ─────────────────────────────────────────────────────────────

function ProgressIcon({ done, total }: { done: number; total: number }) {
  if (total === 0) return <Circle className="h-3 w-3 text-muted-foreground/50" />;
  if (done === total) return <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" />;
  if (done > 0) return <Loader2 className="h-3 w-3 text-blue-600 dark:text-blue-400 animate-spin" />;
  return <Circle className="h-3 w-3 text-muted-foreground/50" />;
}

function TreeNode({
  icon, label, sublabel, active, defaultOpen, children,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  active?: boolean;
  defaultOpen?: boolean;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const hasChildren = !!children;

  return (
    <div>
      <button
        onClick={() => hasChildren && setOpen(!open)}
        className={cn(
          'flex items-center gap-1.5 w-full text-left px-2 py-1 rounded-md text-xs transition-colors',
          active ? 'bg-accent/50 text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
          hasChildren && 'cursor-pointer',
        )}
      >
        {hasChildren ? (
          open ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />
        ) : (
          <span className="w-3" />
        )}
        {icon}
        <span className="font-medium truncate">{label}</span>
      </button>
      {sublabel && (
        <div className={cn('text-[10px] text-muted-foreground truncate', hasChildren ? 'pl-[52px]' : 'pl-[40px]')} title={sublabel}>
          {sublabel}
        </div>
      )}
      {open && children && (
        <div className="pl-3 border-l border-border/20 ml-4 mt-0.5">
          {children}
        </div>
      )}
    </div>
  );
}

function ProgressRow({ label, done, total }: { label: string; done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums font-medium">{done}/{total}</span>
      </div>
      <div className="h-1 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            done === total && total > 0 ? 'bg-green-600 dark:bg-green-500' : 'bg-blue-600 dark:bg-blue-500',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
