// VCCA - GSD-2 Activity Tab
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { useState } from 'react';
import { Activity, Copy, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ViewEmpty } from '@/components/shared/loading-states';
import { SearchInput } from '@/components/shared/search-input';
import { FilterChips } from '@/components/shared/filter-chips';
import { useGsd2History } from '@/lib/queries';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { formatCost, formatTokenCount, formatDuration } from '@/lib/utils';

interface Gsd2ActivityTabProps {
  projectId: string;
  projectPath: string;
}

function phaseBadgeClass(phase: string): string {
  switch (phase) {
    case 'execution':   return 'bg-status-success/15 text-status-success border-status-success/30';
    case 'completion':  return 'bg-status-info/15 text-status-info border-status-info/30';
    case 'planning':    return 'bg-status-warning/15 text-status-warning border-status-warning/30';
    case 'research':    return 'bg-primary/15 text-primary border-primary/30';
    case 'reassessment': return 'bg-muted text-muted-foreground border-border';
    default:            return 'bg-muted text-muted-foreground border-border';
  }
}

function classifyPhase(unitType: string): string {
  if (unitType.startsWith('research-')) return 'research';
  if (unitType.startsWith('plan-') || unitType === 'plan-milestone' || unitType === 'plan-slice' || unitType === 'plan-task') return 'planning';
  if (unitType === 'execute-task') return 'execution';
  if (unitType.startsWith('complete-') || unitType === 'complete-milestone') return 'completion';
  if (unitType === 'reassess-roadmap') return 'reassessment';
  return 'execution';
}

export function Gsd2ActivityTab({ projectId }: Gsd2ActivityTabProps) {
  const [search, setSearch] = useState('');
  const [selectedPhases, setSelectedPhases] = useState<string[]>([]);
  const { data, isLoading, error } = useGsd2History(projectId);
  const { copyToClipboard, copiedItems } = useCopyToClipboard();

  const handleCopyUnitId = async (unitId: string) => {
    await copyToClipboard(unitId, `Unit ID "${unitId}" copied`);
  };

  const handleCopyPhase = async (phase: string) => {
    await copyToClipboard(phase, `Phase "${phase}" copied`);
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
        </div>
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <p className="text-sm text-status-error">Failed to load activity: {String(error)}</p>
      </div>
    );
  }

  const totals = data?.totals;
  const units = [...(data?.units ?? [])].sort((a, b) => b.started_at - a.started_at);

  // Phase filter options with counts
  const phaseGroups = units.reduce((acc, unit) => {
    const phase = classifyPhase(unit.unit_type);
    acc[phase] = (acc[phase] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const phaseOptions = [
    { id: 'research', label: 'Research', count: phaseGroups.research || 0 },
    { id: 'planning', label: 'Planning', count: phaseGroups.planning || 0 },
    { id: 'execution', label: 'Execution', count: phaseGroups.execution || 0 },
    { id: 'completion', label: 'Completion', count: phaseGroups.completion || 0 },
    { id: 'reassessment', label: 'Reassessment', count: phaseGroups.reassessment || 0 },
  ].filter(option => option.count > 0);

  // Apply search and phase filters
  const query = search.trim().toLowerCase();
  const filtered = units.filter((unit) => {
    // Phase filter
    if (selectedPhases.length > 0) {
      const phase = classifyPhase(unit.unit_type);
      if (!selectedPhases.includes(phase)) return false;
    }
    
    // Search filter
    if (query) {
      return (
        unit.id.toLowerCase().includes(query) ||
        unit.unit_type.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  if (!totals || units.length === 0) {
    return (
      <ViewEmpty
        icon={<Activity className="h-8 w-8" />}
        message="No unit history yet"
        description="Activity will appear here after a GSD-2 session runs"
      />
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-2 p-3 pb-0 shrink-0 sm:grid-cols-4">
        <Card className="py-2">
          <CardContent className="p-3 text-center">
            <p className="text-lg font-semibold tabular-nums">{formatCost(totals.total_cost)}</p>
            <p className="text-[11px] text-muted-foreground">Total Cost</p>
          </CardContent>
        </Card>
        <Card className="py-2">
          <CardContent className="p-3 text-center">
            <p className="text-lg font-semibold tabular-nums">{formatTokenCount(totals.total_tokens)}</p>
            <p className="text-[11px] text-muted-foreground">Tokens</p>
          </CardContent>
        </Card>
        <Card className="py-2">
          <CardContent className="p-3 text-center">
            <p className="text-lg font-semibold tabular-nums">{totals.units}</p>
            <p className="text-[11px] text-muted-foreground">Units</p>
          </CardContent>
        </Card>
        <Card className="py-2">
          <CardContent className="p-3 text-center">
            <p className="text-lg font-semibold tabular-nums">{formatDuration(totals.duration_ms)}</p>
            <p className="text-[11px] text-muted-foreground">Duration</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and filters */}
      <div className="p-3 space-y-2 shrink-0">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by unit ID or type..."
          size="sm"
        />
        {phaseOptions.length > 1 && (
          <FilterChips
            options={phaseOptions}
            selected={selectedPhases}
            onSelectionChange={setSelectedPhases}
            allowMultiple={true}
            size="sm"
            showAllOption={true}
            allLabel="All Phases"
          />
        )}
      </div>

      {/* Unit list */}
      <div className="flex-1 overflow-y-auto p-3 pt-0 space-y-1">
        {filtered.length === 0 && (query || selectedPhases.length > 0) ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No units match {query && selectedPhases.length > 0 ? `"${search}" and selected phases` : query ? `"${search}"` : 'selected phases'}
          </p>
        ) : (
          filtered.map((unit) => {
            const phase = classifyPhase(unit.unit_type);
            const duration = unit.finished_at > 0 ? unit.finished_at - unit.started_at : 0;
            const isUnitCopied = copiedItems.has(unit.id);
            const isPhaseCopied = copiedItems.has(phase);
            
            return (
              <div
                key={unit.id}
                className="flex items-center gap-2 rounded-md border border-border/40 bg-muted/20 px-3 py-2 text-xs hover:bg-muted/40 transition-colors"
              >
                <button
                  onClick={() => handleCopyPhase(phase)}
                  title="Click to copy phase name"
                  className="shrink-0"
                >
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${phaseBadgeClass(phase)} cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1`}>
                    {phase}
                    {isPhaseCopied ? (
                      <Check className="h-2 w-2 text-green-500" />
                    ) : (
                      <Copy className="h-2 w-2 opacity-50" />
                    )}
                  </Badge>
                </button>
                <button
                  onClick={() => handleCopyUnitId(unit.id)}
                  className="flex-1 truncate font-mono text-foreground/80 hover:text-foreground transition-colors text-left flex items-center gap-1"
                  title="Click to copy unit ID"
                >
                  <span className="truncate">{unit.id}</span>
                  {isUnitCopied ? (
                    <Check className="h-3 w-3 text-green-500 shrink-0" />
                  ) : (
                    <Copy className="h-3 w-3 opacity-50 shrink-0" />
                  )}
                </button>
                <span className="shrink-0 text-muted-foreground tabular-nums">{formatCost(unit.cost)}</span>
                <span className="shrink-0 text-muted-foreground tabular-nums">{formatTokenCount(unit.total_tokens)}</span>
                {duration > 0 && (
                  <span className="shrink-0 text-muted-foreground/70 tabular-nums">{formatDuration(duration)}</span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
