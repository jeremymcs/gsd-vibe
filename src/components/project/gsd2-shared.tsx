// VCCA - GSD-2 Shared Primitives
// Shared components and utilities used across GSD-2 tab components.
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCost, formatTokenCount, formatDuration } from '@/lib/utils';
import type { ProjectTotals } from '@/lib/tauri';

// ─── Status icon ─────────────────────────────────────────────────────────────

/**
 * Renders a small inline status icon for done / active / pending states.
 * Used by milestones, slices, and tasks tabs.
 */
export function Gsd2StatusIcon({ status }: { status: string }) {
  if (status === 'done') {
    return <span className="text-status-success">✔</span>;
  }
  if (status === 'active') {
    return <span className="text-yellow-600 dark:text-yellow-500 animate-pulse">▶</span>;
  }
  return <span className="text-muted-foreground">○</span>;
}

/**
 * Derives a 'done' | 'active' | 'pending' status from raw fields.
 */
export function getGsd2Status(
  done: boolean,
  activeId: string | null,
  id: string,
): 'done' | 'active' | 'pending' {
  if (done) return 'done';
  if (activeId && id === activeId) return 'active';
  return 'pending';
}

// ─── Phase badge ─────────────────────────────────────────────────────────────

/**
 * Returns Tailwind className string for a GSD-2 execution phase badge.
 * Shared by the Activity tab and the History panel.
 */
export function phaseBadgeClass(phase: string): string {
  switch (phase) {
    case 'execution':    return 'bg-status-success/15 text-status-success border-status-success/30';
    case 'completion':   return 'bg-status-info/15 text-status-info border-status-info/30';
    case 'planning':     return 'bg-status-warning/15 text-status-warning border-status-warning/30';
    case 'research':     return 'bg-primary/15 text-primary border-primary/30';
    case 'reassessment': return 'bg-muted text-muted-foreground border-border';
    default:             return 'bg-muted text-muted-foreground border-border';
  }
}

/**
 * Maps a raw unit_type string to a phase label.
 */
export function classifyPhase(unitType: string): string {
  if (unitType.startsWith('research-')) return 'research';
  if (
    unitType.startsWith('plan-') ||
    unitType === 'plan-milestone' ||
    unitType === 'plan-slice' ||
    unitType === 'plan-task'
  ) return 'planning';
  if (unitType === 'execute-task') return 'execution';
  if (unitType.startsWith('complete-') || unitType === 'complete-milestone') return 'completion';
  if (unitType === 'reassess-roadmap') return 'reassessment';
  return 'execution';
}

// ─── History summary cards ────────────────────────────────────────────────────

interface HistorySummaryCardsProps {
  totals: ProjectTotals;
  /** When true, renders in a 2-col layout on small screens (Activity tab style).
   *  When false (default), always 4 columns (History panel style). */
  responsive?: boolean;
}

/**
 * Renders the four summary stat cards (Cost / Tokens / Units / Duration).
 * Shared by the Activity tab and the History panel in command-panels.
 */
export function HistorySummaryCards({ totals, responsive = false }: HistorySummaryCardsProps) {
  const items: [string, string][] = [
    ['Total Cost', formatCost(totals.total_cost)],
    ['Tokens',     formatTokenCount(totals.total_tokens)],
    ['Units',      String(totals.units)],
    ['Duration',   formatDuration(totals.duration_ms)],
  ];

  const gridClass = responsive
    ? 'grid grid-cols-2 gap-2 sm:grid-cols-4'
    : 'grid grid-cols-4 gap-2';

  return (
    <div className={gridClass}>
      {items.map(([label, value]) => (
        <Card key={label} className="py-2">
          <CardContent className="p-3 text-center">
            <p className="text-lg font-semibold tabular-nums">{value}</p>
            <p className="text-[11px] text-muted-foreground">{label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Query state triad ────────────────────────────────────────────────────────

/**
 * Standard card-based loading skeleton for GSD-2 list views.
 */
export function Gsd2LoadingCard({ rows = 3 }: { rows?: number }) {
  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * Standard card-based error state for GSD-2 list views.
 */
export function Gsd2ErrorCard({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="py-8 text-center">
        <p className="text-sm text-status-error">{message}</p>
      </CardContent>
    </Card>
  );
}

// ─── Status badge (done / pending / active) ───────────────────────────────────

/**
 * Small outline badge for done/active/pending item status.
 */
export function StatusBadge({ status }: { status: 'done' | 'active' | 'pending' }) {
  const classMap: Record<string, string> = {
    done:    'bg-status-success/10 text-status-success border-status-success/30',
    active:  'bg-status-warning/10 text-status-warning border-status-warning/30',
    pending: 'bg-status-pending/10 text-status-pending border-status-pending/30',
  };
  const labelMap: Record<string, string> = {
    done: 'Done', active: 'Active', pending: 'Pending',
  };
  return (
    <Badge variant="outline" className={`text-xs ${classMap[status] ?? ''}`}>
      {labelMap[status] ?? status}
    </Badge>
  );
}
