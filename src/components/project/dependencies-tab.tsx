// VCCA - Dependencies Tab Component
// Package dependency analysis and vulnerability detection for project page tab context
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useDependencyStatus } from '@/lib/queries';
import { invalidateDependencyCache } from '@/lib/tauri';
import { queryKeys } from '@/lib/query-keys';
import { useQueryClient } from '@tanstack/react-query';
import { useCopyToClipboard } from '@/hooks';
import {
  formatRelativeTime,
  getErrorMessage,
  isMajorBump,
  getRegistryUrl,
} from '@/lib/utils';
import {
  Package,
  Box,
  AlertTriangle,
  ShieldAlert,
  Clock,
  RefreshCw,
  Loader2,
  Search,
  ExternalLink,
  CheckCircle2,
  ShieldCheck,
  Copy,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';

interface OutdatedEntry {
  current: string;
  wanted: string;
  latest: string;
}

interface AuditVulnerability {
  severity: string;
  title?: string;
  url?: string;
  range?: string;
  via?: unknown[];
}

function parseOutdatedPackages(
  details: Record<string, unknown> | null
): [string, OutdatedEntry][] {
  if (!details || typeof details !== 'object') return [];
  let resolved = details;
  if (typeof resolved === 'string') {
    try {
      resolved = JSON.parse(resolved) as Record<string, unknown>;
    } catch {
      return [];
    }
  }
  let outdated = resolved.outdated as Record<string, OutdatedEntry> | undefined;
  if (typeof outdated === 'string') {
    try {
      outdated = JSON.parse(outdated) as Record<string, OutdatedEntry>;
    } catch {
      outdated = undefined;
    }
  }
  if (!outdated || typeof outdated !== 'object' || Array.isArray(outdated)) {
    const firstValue = Object.values(resolved)[0];
    if (
      firstValue &&
      typeof firstValue === 'object' &&
      firstValue !== null &&
      'current' in firstValue
    ) {
      outdated = resolved as unknown as Record<string, OutdatedEntry>;
    } else {
      return [];
    }
  }
  return Object.entries(outdated)
    .filter(([, v]) => v && typeof v === 'object' && 'current' in v)
    .sort(([a], [b]) => a.localeCompare(b));
}

function parseVulnerablePackages(
  details: Record<string, unknown> | null
): [string, AuditVulnerability][] {
  if (!details) return [];
  const audit = details.audit as Record<string, unknown> | undefined;
  if (!audit) return [];
  const vulns = audit.vulnerabilities as
    | Record<string, AuditVulnerability>
    | undefined;
  if (!vulns || typeof vulns !== 'object') return [];
  return Object.entries(vulns)
    .filter(([, v]) => v.severity && v.severity !== 'info')
    .map(([name, v]) => {
      // npm audit v2: title/url live inside via[] advisory objects, not on the top-level entry
      let title = v.title;
      let url = v.url;
      if ((!title || !url) && Array.isArray(v.via)) {
        for (const entry of v.via) {
          if (entry && typeof entry === 'object' && 'title' in entry) {
            const advisory = entry as { title?: string; url?: string };
            if (!title && advisory.title) title = advisory.title;
            if (!url && advisory.url) url = advisory.url;
            if (title && url) break;
          }
        }
      }
      return [name, { ...v, title, url }] as [string, AuditVulnerability];
    })
    .sort(([, a], [, b]) => {
      const order: Record<string, number> = {
        critical: 0,
        high: 1,
        moderate: 2,
        low: 3,
      };
      return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
    });
}

function severityBadgeVariant(
  severity: string
): 'error' | 'warning' | 'secondary' {
  switch (severity.toLowerCase()) {
    case 'critical':
    case 'high':
      return 'error';
    case 'moderate':
      return 'warning';
    default:
      return 'secondary';
  }
}

function PackageManagerIcon({
  pm,
  className,
}: {
  pm: string;
  className?: string;
}) {
  switch (pm.toLowerCase()) {
    case 'cargo':
      return <Box className={className} />;
    default:
      return <Package className={className} />;
  }
}

function computeHealthScore(outdated: number): number {
  if (outdated === 0) return 100;
  return Math.max(20, 100 - outdated * 5);
}

function healthVariant(score: number): 'success' | 'warning' | 'error' {
  if (score >= 80) return 'success';
  if (score >= 50) return 'warning';
  return 'error';
}

function EmptyTabState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <Icon className="h-10 w-10 mb-3 opacity-30" />
      <p className="font-medium">{title}</p>
      <p className="text-sm mt-1">{description}</p>
    </div>
  );
}

function OutdatedTable({
  packages,
  packageManager,
}: {
  packages: [string, OutdatedEntry][];
  packageManager: string;
}) {
  const { copyToClipboard, copiedItems } = useCopyToClipboard();
  
  return (
    <ScrollArea className="max-h-[500px]">
      <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground px-3 py-2 border-b sticky top-0 bg-background z-10">
        <span className="flex-1 min-w-0">Package</span>
        <span className="w-24 text-right shrink-0">Current</span>
        <span className="w-24 text-right shrink-0">Wanted</span>
        <span className="w-32 text-right shrink-0">Latest</span>
      </div>
      {packages.map(([name, info]) => {
        const breaking = isMajorBump(info.current, info.latest);
        return (
          <div
            key={name}
            className="flex items-center gap-2 px-3 py-2 text-sm border-b last:border-b-0 hover:bg-muted/50 transition-colors group"
          >
            <span className="flex-1 min-w-0 truncate flex items-center gap-2" title={name}>
              <a
                href={getRegistryUrl(packageManager, name)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:underline inline-flex items-center gap-1"
              >
                {name}
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => copyToClipboard(name, `Copied package name: ${name}`)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-accent rounded"
                    >
                      {copiedItems.has(name) ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3 text-muted-foreground" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    Copy package name
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </span>
            <span className="w-24 text-right shrink-0 font-mono text-muted-foreground text-xs">
              {info.current}
            </span>
            <span className="w-24 text-right shrink-0 font-mono text-status-warning text-xs">
              {info.wanted}
            </span>
            <span className="w-32 text-right shrink-0 font-mono text-status-success text-xs inline-flex items-center justify-end gap-1.5">
              {info.latest}
              {breaking && (
                <Badge variant="error" size="sm">
                  Breaking
                </Badge>
              )}
            </span>
          </div>
        );
      })}
    </ScrollArea>
  );
}

function VulnerabilityTable({
  packages,
  severityFilter,
}: {
  packages: [string, AuditVulnerability][];
  severityFilter: string;
}) {
  const { copyToClipboard, copiedItems } = useCopyToClipboard();
  
  const filtered =
    severityFilter === 'all'
      ? packages
      : packages.filter(
          ([, v]) => v.severity.toLowerCase() === severityFilter
        );

  if (filtered.length === 0) {
    return (
      <EmptyTabState
        icon={ShieldCheck}
        title="No matches"
        description={
          severityFilter === 'all'
            ? 'No vulnerabilities found'
            : `No ${severityFilter} severity vulnerabilities`
        }
      />
    );
  }

  return (
    <ScrollArea className="max-h-[500px]">
      <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground px-3 py-2 border-b sticky top-0 bg-background z-10">
        <span className="flex-1 min-w-0">Package</span>
        <span className="w-20 shrink-0">Severity</span>
        <span className="flex-1 min-w-0">Title</span>
        <span className="w-20 text-right shrink-0">Advisory</span>
      </div>
      {filtered.map(([name, info]) => (
        <div
          key={name}
          className="flex items-center gap-2 px-3 py-2 text-sm border-b last:border-b-0 hover:bg-muted/50 transition-colors group"
        >
          <span className="flex-1 min-w-0 font-medium truncate flex items-center gap-2" title={name}>
            {name}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => copyToClipboard(name, `Copied package name: ${name}`)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-accent rounded"
                  >
                    {copiedItems.has(name) ? (
                      <Check className="h-3 w-3 text-green-600" />
                    ) : (
                      <Copy className="h-3 w-3 text-muted-foreground" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Copy package name
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </span>
          <span className="w-20 shrink-0">
            <Badge variant={severityBadgeVariant(info.severity)} size="sm">
              {info.severity}
            </Badge>
          </span>
          <span className="flex-1 min-w-0 truncate text-xs">
            {info.title ? (
              info.url ? (
                <a
                  href={info.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground hover:underline"
                  title={info.title}
                >
                  {info.title}
                </a>
              ) : (
                <span className="text-muted-foreground">{info.title}</span>
              )
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </span>
          <span className="w-20 text-right shrink-0">
            {info.url ? (
              <a
                href={info.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Advisory
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <span className="text-xs text-muted-foreground">-</span>
            )}
          </span>
        </div>
      ))}
    </ScrollArea>
  );
}

/** Skeleton row for the outdated packages table */
function SkeletonTableRow({ index }: { index: number }) {
  const widths = [140, 110, 160, 120, 130, 150, 100, 170];
  const w = widths[index % widths.length];
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b last:border-b-0">
      <span className="flex-1 min-w-0 flex items-center gap-2">
        <Skeleton className="h-4" style={{ width: `${w}px` }} />
        <Skeleton className="h-3 w-3 rounded shrink-0" />
      </span>
      <Skeleton className="h-3.5 w-14 shrink-0" />
      <Skeleton className="h-3.5 w-14 shrink-0" />
      <Skeleton className="h-3.5 w-16 shrink-0" />
    </div>
  );
}

/** Summary card skeleton matching the 4-card grid layout */
function SkeletonSummaryCard({ accent }: { accent?: 'warning' | 'error' }) {
  return (
    <Card className={accent === 'warning' ? 'border-status-warning/10' : accent === 'error' ? 'border-status-error/10' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-3.5 w-24" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-7 w-12" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

/** Full-page loading skeleton that mirrors the Dependencies tab layout */
function DependenciesTabSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Summary cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Package Manager card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-3.5 w-28" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-3 w-36" />
          </CardContent>
        </Card>

        {/* Health Score card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-3.5 w-20" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-7 w-14" />
            <Skeleton className="h-2 w-full rounded-full" />
          </CardContent>
        </Card>

        {/* Outdated card */}
        <SkeletonSummaryCard accent="warning" />

        {/* Vulnerabilities card */}
        <SkeletonSummaryCard accent="error" />
      </div>

      {/* Search toolbar */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 flex-1 rounded-md" />
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>

      {/* Tabs + table */}
      <div className="space-y-3">
        {/* Tab triggers */}
        <div className="flex items-center gap-1">
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-36 rounded-md" />
        </div>

        {/* Table card */}
        <Card>
          <CardContent className="p-0">
            {/* Table header */}
            <div className="flex items-center gap-2 px-3 py-2 border-b">
              <Skeleton className="h-2.5 w-16 flex-1" />
              <Skeleton className="h-2.5 w-12" />
              <Skeleton className="h-2.5 w-12" />
              <Skeleton className="h-2.5 w-14" />
            </div>
            {/* Table rows — staggered entrance */}
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="animate-in fade-in slide-in-from-bottom-1 fill-mode-both"
                style={{ animationDelay: `${Math.min(i * 60, 500)}ms`, animationDuration: '300ms' }}
              >
                <SkeletonTableRow index={i} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface DependenciesTabProps {
  projectId: string;
  projectPath: string;
}

export function DependenciesTab({
  projectId,
  projectPath,
}: DependenciesTabProps) {
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: status, isLoading, isError, error } = useDependencyStatus(
    projectId,
    projectPath
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchInput.toLowerCase().trim());
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  const outdatedPackages = useMemo(
    () => parseOutdatedPackages(status?.details ?? null),
    [status?.details]
  );

  const vulnerablePackages = useMemo(
    () => parseVulnerablePackages(status?.details ?? null),
    [status?.details]
  );

  const filteredOutdated = useMemo(
    () =>
      debouncedSearch
        ? outdatedPackages.filter(([name]) =>
            name.toLowerCase().includes(debouncedSearch)
          )
        : outdatedPackages,
    [outdatedPackages, debouncedSearch]
  );

  const filteredVulnerable = useMemo(
    () =>
      debouncedSearch
        ? vulnerablePackages.filter(([name]) =>
            name.toLowerCase().includes(debouncedSearch)
          )
        : vulnerablePackages,
    [vulnerablePackages, debouncedSearch]
  );

  const severityBreakdown = useMemo(() => {
    const counts: Record<string, number> = {
      critical: 0,
      high: 0,
      moderate: 0,
      low: 0,
    };
    for (const [, v] of vulnerablePackages) {
      const s = v.severity.toLowerCase();
      if (s in counts) counts[s]++;
    }
    return counts;
  }, [vulnerablePackages]);

  const healthScore = computeHealthScore(status?.outdated_count ?? 0);
  const variant = healthVariant(healthScore);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await invalidateDependencyCache(projectId);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.dependencyStatus(projectId),
      });
      toast.success('Dependency data refreshed');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return <DependenciesTabSkeleton />;
  }

  if (isError) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-30 text-status-warning" />
        <p className="font-medium">Failed to load dependency data</p>
        <p className="text-sm mt-2 max-w-md mx-auto">{getErrorMessage(error)}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => void handleRefresh()}
          disabled={isRefreshing}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
        <p>No dependency data available for this project.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <PackageManagerIcon
                pm={status.package_manager}
                className="h-4 w-4 text-muted-foreground"
              />
              Package Manager
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary" className="text-sm capitalize">
              {status.package_manager}
            </Badge>
            <p className="text-xs text-muted-foreground mt-2">
              Last checked: {formatRelativeTime(status.checked_at)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              Health Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <span className={`text-2xl font-bold text-status-${variant}`}>
                {healthScore}%
              </span>
            </div>
            <Progress
              value={healthScore}
              variant={variant}
              size="sm"
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card
          className={
            status.outdated_count > 0 ? 'border-status-warning/30' : ''
          }
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock
                className={`h-4 w-4 ${status.outdated_count > 0 ? 'text-status-warning' : 'text-muted-foreground'}`}
              />
              Outdated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${status.outdated_count > 0 ? 'text-status-warning' : ''}`}
            >
              {status.outdated_count}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {status.outdated_count === 0
                ? 'All packages up to date'
                : `${status.outdated_count} package${status.outdated_count !== 1 ? 's' : ''} behind latest`}
            </p>
          </CardContent>
        </Card>

        <Card
          className={
            status.vulnerable_count > 0 ? 'border-status-error/30' : ''
          }
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShieldAlert
                className={`h-4 w-4 ${status.vulnerable_count > 0 ? 'text-status-error' : 'text-muted-foreground'}`}
              />
              Vulnerabilities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${status.vulnerable_count > 0 ? 'text-status-error' : ''}`}
            >
              {status.vulnerable_count}
            </div>
            {status.vulnerable_count > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {severityBreakdown.critical > 0 && (
                  <Badge variant="error" size="sm">
                    {severityBreakdown.critical} critical
                  </Badge>
                )}
                {severityBreakdown.high > 0 && (
                  <Badge variant="error" size="sm">
                    {severityBreakdown.high} high
                  </Badge>
                )}
                {severityBreakdown.moderate > 0 && (
                  <Badge variant="warning" size="sm">
                    {severityBreakdown.moderate} moderate
                  </Badge>
                )}
                {severityBreakdown.low > 0 && (
                  <Badge variant="secondary" size="sm">
                    {severityBreakdown.low} low
                  </Badge>
                )}
              </div>
            )}
            {status.vulnerable_count === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                No known vulnerabilities
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Search + Refresh toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search packages..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void handleRefresh()}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {/* Tabs: Outdated / Vulnerabilities */}
      <Tabs defaultValue="outdated" className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="outdated" className="gap-2">
              <AlertTriangle className="h-3.5 w-3.5" />
              Outdated
              {status.outdated_count > 0 && (
                <Badge variant="warning" size="sm">
                  {debouncedSearch
                    ? `${filteredOutdated.length}/${status.outdated_count}`
                    : status.outdated_count}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="vulnerabilities" className="gap-2">
              <ShieldAlert className="h-3.5 w-3.5" />
              Vulnerabilities
              {status.vulnerable_count > 0 && (
                <Badge variant="error" size="sm">
                  {debouncedSearch
                    ? `${filteredVulnerable.length}/${status.vulnerable_count}`
                    : status.vulnerable_count}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="outdated">
          <Card>
            <CardContent className="p-0">
              {filteredOutdated.length === 0 ? (
                status.outdated_count === 0 ? (
                  <EmptyTabState
                    icon={CheckCircle2}
                    title="All up to date"
                    description="Every package is on the latest version"
                  />
                ) : debouncedSearch ? (
                  <EmptyTabState
                    icon={Search}
                    title="No matches"
                    description={`No outdated packages matching "${debouncedSearch}"`}
                  />
                ) : (
                  <EmptyTabState
                    icon={AlertTriangle}
                    title={`${status.outdated_count} outdated packages detected`}
                    description="Run npm outdated for detailed version info"
                  />
                )
              ) : (
                <OutdatedTable packages={filteredOutdated} packageManager={status.package_manager} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vulnerabilities">
          <Card>
            {status.vulnerable_count > 0 && (
              <CardHeader className="pb-2 pt-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    Filter:
                  </span>
                  <Select
                    value={severityFilter}
                    onValueChange={setSeverityFilter}
                  >
                    <SelectTrigger className="w-[140px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All severities</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
            )}
            <CardContent className="p-0">
              {filteredVulnerable.length === 0 &&
              status.vulnerable_count === 0 ? (
                <EmptyTabState
                  icon={ShieldCheck}
                  title="No vulnerabilities"
                  description="No known security issues found"
                />
              ) : filteredVulnerable.length === 0 && debouncedSearch ? (
                <EmptyTabState
                  icon={Search}
                  title="No matches"
                  description={`No vulnerable packages matching "${debouncedSearch}"`}
                />
              ) : filteredVulnerable.length === 0 ? (
                <EmptyTabState
                  icon={ShieldAlert}
                  title={`${status.vulnerable_count} vulnerabilities detected`}
                  description="Run npm audit for detailed security info"
                />
              ) : (
                <VulnerabilityTable
                  packages={filteredVulnerable}
                  severityFilter={severityFilter}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
