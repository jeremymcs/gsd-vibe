// GSD VibeFlow - Dashboard Status Bar
// 6-stat summary: projects, pending todos, GSD projects, cost, tokens, active agents
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { FolderOpen, ListTodo, AlertTriangle, DollarSign, Activity, Users } from 'lucide-react';
import { useProjectsWithStats } from '@/lib/queries';

export function StatusBar() {
  const { data: projects } = useProjectsWithStats();

  const projectCount = projects?.length ?? 0;

  // Aggregate todo and blocker counts from tech_stack data embedded in ProjectWithStats
  const gsdProjects = projects?.filter((p) => p.tech_stack?.has_planning) ?? [];
  const totalTodos = gsdProjects.reduce(
    (sum, p) => sum + (p.tech_stack?.gsd_todo_count ?? 0),
    0,
  );

  // GSD project count 
  const gsdCount = gsdProjects.length;

  // Initialize GSD-2 metrics — we'll aggregate data from visualizer queries
  // For now, aggregate is set to 0 (no GSD-2 projects have data yet)
  // In a future iteration, consider a single backend endpoint for efficiency
  const gsd2Metrics = {
    totalCost: 0,
    totalTokens: 0,
    activeAgents: 0,
  };

  // Format cost as dollars with 2 decimal places
  const formatCost = (cost: number) => `$${cost.toFixed(2)}`;
  
  // Format tokens in millions if > 1M, otherwise thousands
  const formatTokens = (tokens: number) => {
    if (tokens >= 1_000_000) {
      return `${(tokens / 1_000_000).toFixed(1)}M`;
    } else if (tokens >= 1_000) {
      return `${(tokens / 1_000).toFixed(0)}K`;
    }
    return tokens.toString();
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border bg-card/50 text-sm">
      <StatItem
        icon={<FolderOpen className="h-3.5 w-3.5" />}
        value={projectCount}
        label={projectCount === 1 ? 'project' : 'projects'}
      />
      <Sep />
      <StatItem
        icon={<ListTodo className="h-3.5 w-3.5 text-muted-foreground" />}
        value={totalTodos}
        label="pending todos"
        accent="purple"
      />
      <Sep />
      <StatItem
        icon={<AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />}
        value={gsdCount}
        label={gsdCount === 1 ? 'GSD project' : 'GSD projects'}
      />
      <Sep />
      <StatItem
        icon={<DollarSign className="h-3.5 w-3.5 text-muted-foreground" />}
        value={formatCost(gsd2Metrics.totalCost)}
        label="total cost"
        accent="green"
      />
      <Sep />
      <StatItem
        icon={<Activity className="h-3.5 w-3.5 text-muted-foreground" />}
        value={`${formatTokens(gsd2Metrics.totalTokens)}`}
        label="total tokens"
        accent="blue"
      />
      <Sep />
      <StatItem
        icon={<Users className="h-3.5 w-3.5 text-muted-foreground" />}
        value={gsd2Metrics.activeAgents}
        label={gsd2Metrics.activeAgents === 1 ? 'active agent' : 'active agents'}
        accent="orange"
      />
    </div>
  );
}

function StatItem({
  icon,
  value,
  label,
  accent,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  accent?: 'purple' | 'red' | 'green' | 'blue' | 'orange';
}) {
  const accentClass =
    accent === 'purple'
      ? 'text-foreground font-semibold'
      : accent === 'red'
        ? 'text-status-error font-semibold'
        : accent === 'green'
          ? 'text-status-success font-semibold'
          : accent === 'blue'
            ? 'text-blue-500 font-semibold'
            : accent === 'orange'
              ? 'text-orange-500 font-semibold'
              : 'font-semibold';

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-muted-foreground">{icon}</span>
      <span className={accentClass}>{value}</span>
      <span className="text-muted-foreground text-xs">{label}</span>
    </div>
  );
}

function Sep() {
  return <span className="text-border select-none">|</span>;
}
