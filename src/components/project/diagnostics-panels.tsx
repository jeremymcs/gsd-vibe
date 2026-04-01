// VCCA - Diagnostics Panel Components
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  AlertTriangle,
  CheckCircle2,
  Info,
  LoaderCircle,
  RefreshCw,
  ShieldAlert,
  Wrench,
  XCircle,
  Copy,
  Check,
} from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SearchInput } from "@/components/shared/search-input";
import type {
  DoctorIssue,
  DoctorFixResult,
  ForensicAnomaly,
  SkillHealthSuggestion,
} from "@/lib/tauri";
import { cn, formatCost } from "@/lib/utils";
import { useCopyToClipboard } from '@/hooks';
import {
  useGsd2DoctorReport,
  useGsd2ApplyDoctorFixes,
  useGsd2ForensicsReport,
  useGsd2SkillHealth,
} from "@/lib/queries";

// ═══════════════════════════════════════════════════════════════════════
// SHARED SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════

function SeverityIcon({
  severity,
  className,
}: {
  severity: string;
  className?: string;
}) {
  const base = cn("h-3.5 w-3.5 shrink-0", className);
  switch (severity) {
    case "error":
    case "critical":
      return <XCircle className={cn(base, "text-destructive")} />;
    case "warning":
      return <AlertTriangle className={cn(base, "text-warning")} />;
    default:
      return <Info className={cn(base, "text-info")} />;
  }
}

function severityBadgeVariant(
  s: string
): "destructive" | "secondary" | "outline" {
  if (s === "error" || s === "critical") return "destructive";
  if (s === "warning") return "secondary";
  return "outline";
}

function DiagHeader({
  title,
  subtitle,
  status,
  onRefresh,
  refreshing,
}: {
  title: string;
  subtitle?: string | null;
  status?: ReactNode;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 pb-4">
      <div className="flex items-center gap-2.5">
        <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-foreground/70">
          {title}
        </h3>
        {status}
        {subtitle && (
          <span className="text-[11px] text-muted-foreground">{subtitle}</span>
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onRefresh}
        disabled={refreshing}
        className="h-7 gap-1.5 text-xs"
      >
        <RefreshCw className={cn("h-3 w-3", refreshing && "animate-spin")} />
        Refresh
      </Button>
    </div>
  );
}

function DiagError({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-xs text-destructive">
      {message}
    </div>
  );
}

function DiagLoading({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 py-6 text-xs text-muted-foreground">
      <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
      {label}
    </div>
  );
}

function DiagEmpty({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-border/30 bg-card/30 px-4 py-5 text-center text-xs text-muted-foreground">
      {message}
    </div>
  );
}

function StatPill({
  label,
  value,
  variant,
}: {
  label: string;
  value: number | string;
  variant?: "default" | "error" | "warning" | "info";
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs",
        variant === "error" &&
          "border-destructive/20 bg-destructive/5 text-destructive",
        variant === "warning" &&
          "border-warning/20 bg-warning/5 text-warning",
        variant === "info" && "border-info/20 bg-info/5 text-info",
        (!variant || variant === "default") &&
          "border-border/40 bg-card/50 text-foreground/80"
      )}
    >
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// FORENSICS PANEL
// ═══════════════════════════════════════════════════════════════════════

function AnomalyRow({ anomaly }: { anomaly: ForensicAnomaly }) {
  const { copyToClipboard, copiedItems } = useCopyToClipboard();
  
  return (
    <div className="rounded-lg border border-border/30 bg-card/30 px-3 py-2.5 space-y-1 group">
      <div className="flex items-center gap-2">
        <SeverityIcon severity={anomaly.severity} />
        <Badge
          variant={severityBadgeVariant(anomaly.severity)}
          className="text-[10px] px-1.5 py-0"
        >
          {anomaly.severity}
        </Badge>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
          {anomaly.type_name}
        </Badge>
        {anomaly.unit_id && (
          <span className="text-[10px] text-muted-foreground font-mono truncate">
            {anomaly.unit_type}/{anomaly.unit_id}
          </span>
        )}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => copyToClipboard(anomaly.summary, `Copied anomaly: ${anomaly.summary}`)}
                className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-accent rounded"
              >
                {copiedItems.has(anomaly.summary) ? (
                  <Check className="h-3 w-3 text-green-600" />
                ) : (
                  <Copy className="h-3 w-3 text-muted-foreground" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Copy anomaly summary
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <p className="text-xs text-foreground/90">{anomaly.summary}</p>
      {anomaly.details && anomaly.details !== anomaly.summary && (
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          {anomaly.details}
        </p>
      )}
    </div>
  );
}

export function ForensicsPanel({
  projectId,
  projectPath: _projectPath,
}: {
  projectId: string;
  projectPath: string;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data, error, isFetching, refetch } =
    useGsd2ForensicsReport(projectId);

  const filteredAnomalies = useMemo(() => {
    if (!data?.anomalies || !searchTerm.trim()) {
      return data?.anomalies || [];
    }
    
    const search = searchTerm.toLowerCase();
    return data.anomalies.filter((anomaly) => 
      anomaly.summary.toLowerCase().includes(search) ||
      anomaly.details?.toLowerCase().includes(search) ||
      anomaly.type_name.toLowerCase().includes(search) ||
      anomaly.severity.toLowerCase().includes(search) ||
      (anomaly.unit_id && anomaly.unit_id.toLowerCase().includes(search)) ||
      (anomaly.unit_type && anomaly.unit_type.toLowerCase().includes(search))
    );
  }, [data?.anomalies, searchTerm]);

  const filteredRecentUnits = useMemo(() => {
    if (!data?.recent_units || !searchTerm.trim()) {
      return data?.recent_units || [];
    }
    
    const search = searchTerm.toLowerCase();
    return data.recent_units.filter((unit) =>
      unit.id.toLowerCase().includes(search) ||
      unit.type_name.toLowerCase().includes(search) ||
      unit.model.toLowerCase().includes(search)
    );
  }, [data?.recent_units, searchTerm]);

  return (
    <div className="space-y-4" data-testid="diagnostics-forensics">
      <DiagHeader
        title="Forensic Analysis"
        subtitle={data ? new Date(data.timestamp).toLocaleString() : null}
        status={
          data ? (
            <span
              className={cn(
                "inline-block h-1.5 w-1.5 rounded-full",
                filteredAnomalies.length > 0 ? "bg-warning" : "bg-success"
              )}
            />
          ) : null
        }
        onRefresh={() => void refetch()}
        refreshing={isFetching}
      />

      {/* Search input */}
      {data && (data.anomalies.length > 0 || data.recent_units.length > 0) && (
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search anomalies, units, types..."
          size="sm"
        />
      )}

      {error && <DiagError message={error instanceof Error ? error.message : String(error)} />}
      {isFetching && !data && <DiagLoading label="Running forensic analysis…" />}

      {data && (
        <>
          {/* Metrics summary */}
          {data.metrics && (
            <div className="flex flex-wrap gap-2">
              <StatPill label="Units" value={data.metrics.total_units} />
              <StatPill
                label="Cost"
                value={formatCost(data.metrics.total_cost)}
              />
              <StatPill
                label="Duration"
                value={`${Math.round(data.metrics.total_duration / 1000)}s`}
              />
              <StatPill label="Traces" value={data.unit_trace_count} />
            </div>
          )}

          {/* Crash lock */}
          {data.crash_lock ? (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 space-y-1">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-3.5 w-3.5 text-destructive" />
                <span className="text-xs font-medium text-destructive">
                  Crash Lock Active
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px]">
                <span className="text-muted-foreground">PID</span>
                <span className="font-mono text-foreground/80">
                  {data.crash_lock.pid}
                </span>
                <span className="text-muted-foreground">Started</span>
                <span className="text-foreground/80">
                  {new Date(data.crash_lock.started_at).toLocaleString()}
                </span>
                <span className="text-muted-foreground">Unit</span>
                <span className="font-mono text-foreground/80">
                  {data.crash_lock.unit_type}/{data.crash_lock.unit_id}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-border/30 bg-card/30 px-3 py-2 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              No crash lock
            </div>
          )}

          {/* Anomalies */}
          {filteredAnomalies.length > 0 ? (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-foreground/70">
                Anomalies ({filteredAnomalies.length}{searchTerm && data.anomalies.length !== filteredAnomalies.length ? ` of ${data.anomalies.length}` : ""})
              </h4>
              {filteredAnomalies.map((a, i) => (
                <AnomalyRow key={i} anomaly={a} />
              ))}
            </div>
          ) : searchTerm && data.anomalies.length > 0 ? (
            <DiagEmpty message={`No anomalies match "${searchTerm}"`} />
          ) : data.anomalies.length === 0 ? (
            <DiagEmpty message="No anomalies detected" />
          ) : null}

          {/* Recent units */}
          {filteredRecentUnits.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-foreground/70">
                Recent Units ({filteredRecentUnits.length}{searchTerm && data.recent_units.length !== filteredRecentUnits.length ? ` of ${data.recent_units.length}` : ""})
              </h4>
              <div className="overflow-x-auto rounded-lg border border-border/30">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-border/30 bg-card/40">
                      <th className="px-2.5 py-1.5 text-left font-medium text-muted-foreground">
                        Type
                      </th>
                      <th className="px-2.5 py-1.5 text-left font-medium text-muted-foreground">
                        ID
                      </th>
                      <th className="px-2.5 py-1.5 text-left font-medium text-muted-foreground">
                        Model
                      </th>
                      <th className="px-2.5 py-1.5 text-right font-medium text-muted-foreground">
                        Cost
                      </th>
                      <th className="px-2.5 py-1.5 text-right font-medium text-muted-foreground">
                        Duration
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecentUnits.map((u, i) => (
                      <tr
                        key={i}
                        className="border-b border-border/20 last:border-0"
                      >
                        <td className="px-2.5 py-1.5 font-mono text-foreground/80">
                          {u.type_name}
                        </td>
                        <td className="px-2.5 py-1.5 font-mono text-foreground/80 truncate max-w-[120px]">
                          {u.id}
                        </td>
                        <td className="px-2.5 py-1.5 text-muted-foreground">
                          {u.model}
                        </td>
                        <td className="px-2.5 py-1.5 text-right tabular-nums text-foreground/80">
                          {formatCost(u.cost)}
                        </td>
                        <td className="px-2.5 py-1.5 text-right tabular-nums text-foreground/80">
                          {Math.round(u.duration / 1000)}s
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// DOCTOR PANEL
// ═══════════════════════════════════════════════════════════════════════

function humanizeCode(code: string): string {
  return code
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function IssueRow({ issue }: { issue: DoctorIssue }) {
  const { copyToClipboard, copiedItems } = useCopyToClipboard();
  
  return (
    <div className="rounded-lg border border-border/30 bg-card/30 px-3 py-2.5 space-y-1 group">
      <div className="flex items-center gap-2 flex-wrap">
        <SeverityIcon severity={issue.severity} />
        <Badge
          variant={severityBadgeVariant(issue.severity)}
          className="text-[10px] px-1.5 py-0"
        >
          {issue.severity}
        </Badge>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
          {humanizeCode(issue.code)}
        </Badge>
        {issue.scope && (
          <span className="text-[10px] text-muted-foreground font-mono">
            {issue.scope}
          </span>
        )}
        {issue.fixable && (
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 border-success/30 text-success"
          >
            <Wrench className="h-2.5 w-2.5 mr-0.5" />
            fixable
          </Badge>
        )}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => copyToClipboard(issue.message, `Copied issue: ${issue.message}`)}
                className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-accent rounded"
              >
                {copiedItems.has(issue.message) ? (
                  <Check className="h-3 w-3 text-green-600" />
                ) : (
                  <Copy className="h-3 w-3 text-muted-foreground" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Copy error message
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="flex items-start gap-2">
        <p className="text-xs text-foreground/90 flex-1">{issue.message}</p>
        {issue.file && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => copyToClipboard(issue.file!, `Copied file path: ${issue.file}`)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-accent rounded"
                >
                  {copiedItems.has(issue.file) ? (
                    <Check className="h-3 w-3 text-green-600" />
                  ) : (
                    <Copy className="h-3 w-3 text-muted-foreground" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Copy file path: {issue.file}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      {issue.file && (
        <p className="text-[10px] font-mono text-muted-foreground truncate">
          {issue.file}
        </p>
      )}
    </div>
  );
}

export function DoctorPanel({
  projectId,
  projectPath: _projectPath,
}: {
  projectId: string;
  projectPath: string;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data, error, isFetching, refetch } = useGsd2DoctorReport(projectId);
  const fixMutation = useGsd2ApplyDoctorFixes();

  const filteredIssues = useMemo(() => {
    if (!data?.issues || !searchTerm.trim()) {
      return data?.issues || [];
    }
    
    const search = searchTerm.toLowerCase();
    return data.issues.filter((issue) =>
      issue.message.toLowerCase().includes(search) ||
      issue.code.toLowerCase().includes(search) ||
      issue.severity.toLowerCase().includes(search) ||
      (issue.scope && issue.scope.toLowerCase().includes(search)) ||
      (issue.file && issue.file.toLowerCase().includes(search)) ||
      humanizeCode(issue.code).toLowerCase().includes(search)
    );
  }, [data?.issues, searchTerm]);

  const fixableCount = data?.summary.fixable ?? 0;

  return (
    <div className="space-y-4" data-testid="diagnostics-doctor">
      <DiagHeader
        title="Doctor Health Check"
        status={
          data ? (
            <span
              className={cn(
                "inline-block h-1.5 w-1.5 rounded-full",
                data.ok ? "bg-success" : "bg-destructive"
              )}
            />
          ) : null
        }
        onRefresh={() => void refetch()}
        refreshing={isFetching}
      />

      {/* Search input */}
      {data && data.issues.length > 0 && (
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search issues, codes, files..."
          size="sm"
        />
      )}

      {error && <DiagError message={error instanceof Error ? error.message : String(error)} />}
      {isFetching && !data && <DiagLoading label="Running health check…" />}

      {data && (
        <>
          {/* Summary bar */}
          <div className="flex flex-wrap gap-2">
            <StatPill label="Total" value={data.summary.total} />
            {data.summary.errors > 0 && (
              <StatPill
                label="Errors"
                value={data.summary.errors}
                variant="error"
              />
            )}
            {data.summary.warnings > 0 && (
              <StatPill
                label="Warnings"
                value={data.summary.warnings}
                variant="warning"
              />
            )}
            {data.summary.infos > 0 && (
              <StatPill
                label="Info"
                value={data.summary.infos}
                variant="info"
              />
            )}
            {fixableCount > 0 && (
              <StatPill label="Fixable" value={fixableCount} variant="info" />
            )}
          </div>

          {/* Apply fixes button */}
          {fixableCount > 0 && (
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => fixMutation.mutate(projectId)}
                disabled={fixMutation.isPending}
                className="h-7 gap-1.5 text-xs"
                data-testid="doctor-apply-fixes"
              >
                {fixMutation.isPending ? (
                  <LoaderCircle className="h-3 w-3 animate-spin" />
                ) : (
                  <Wrench className="h-3 w-3" />
                )}
                Apply Fixes ({fixableCount})
              </Button>
              {fixMutation.isError && (
                <span className="text-[11px] text-destructive">
                  {fixMutation.error instanceof Error
                    ? fixMutation.error.message
                    : String(fixMutation.error)}
                </span>
              )}
            </div>
          )}

          {/* Fix results */}
          {fixMutation.isSuccess &&
            (fixMutation.data as DoctorFixResult).fixes_applied.length > 0 && (
              <div className="rounded-lg border border-success/20 bg-success/5 px-3 py-2.5 space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  <span className="text-xs font-medium text-success">
                    Fixes Applied
                  </span>
                </div>
                <ul className="space-y-0.5 pl-5">
                  {(fixMutation.data as DoctorFixResult).fixes_applied.map(
                    (fix, i) => (
                      <li
                        key={i}
                        className="text-[11px] text-foreground/80 list-disc"
                      >
                        {fix}
                      </li>
                    )
                  )}
                </ul>
              </div>
            )}

          {/* Issue list */}
          {filteredIssues.length > 0 ? (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-foreground/70">
                Issues ({filteredIssues.length}{searchTerm && data.issues.length !== filteredIssues.length ? ` of ${data.issues.length}` : ""})
              </h4>
              {filteredIssues.map((issue, i) => (
                <IssueRow key={i} issue={issue} />
              ))}
            </div>
          ) : searchTerm && data.issues.length > 0 ? (
            <DiagEmpty message={`No issues match "${searchTerm}"`} />
          ) : data.issues.length === 0 ? (
            <DiagEmpty message="No issues found — workspace is healthy" />
          ) : null}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SKILL HEALTH PANEL
// ═══════════════════════════════════════════════════════════════════════

function trendArrow(trend: string): string {
  if (trend === "rising") return "↑";
  if (trend === "declining") return "↓";
  return "→";
}

function trendColor(trend: string): string {
  if (trend === "rising") return "text-warning";
  if (trend === "declining") return "text-destructive";
  return "text-muted-foreground";
}

function SuggestionRow({
  suggestion,
}: {
  suggestion: SkillHealthSuggestion;
}) {
  return (
    <div className="rounded-lg border border-border/30 bg-card/30 px-3 py-2.5 space-y-1">
      <div className="flex items-center gap-2 flex-wrap">
        <SeverityIcon severity={suggestion.severity} />
        <Badge
          variant={severityBadgeVariant(suggestion.severity)}
          className="text-[10px] px-1.5 py-0"
        >
          {suggestion.severity}
        </Badge>
        <span className="text-[11px] font-medium text-foreground/80">
          {suggestion.skill_name}
        </span>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
          {suggestion.trigger.replace(/_/g, " ")}
        </Badge>
      </div>
      <p className="text-xs text-foreground/90">{suggestion.message}</p>
    </div>
  );
}

export function SkillHealthPanel({
  projectId,
  projectPath: _projectPath,
}: {
  projectId: string;
  projectPath: string;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data, error, isFetching, refetch } = useGsd2SkillHealth(projectId);

  const filteredSkills = useMemo(() => {
    if (!data?.skills || !searchTerm.trim()) {
      return data?.skills || [];
    }
    
    const search = searchTerm.toLowerCase();
    return data.skills.filter((skill) =>
      skill.name.toLowerCase().includes(search)
    );
  }, [data?.skills, searchTerm]);

  const filteredSuggestions = useMemo(() => {
    if (!data?.suggestions || !searchTerm.trim()) {
      return data?.suggestions || [];
    }
    
    const search = searchTerm.toLowerCase();
    return data.suggestions.filter((suggestion) =>
      suggestion.skill_name.toLowerCase().includes(search) ||
      suggestion.message.toLowerCase().includes(search) ||
      suggestion.trigger.toLowerCase().includes(search)
    );
  }, [data?.suggestions, searchTerm]);

  return (
    <div className="space-y-4" data-testid="diagnostics-skill-health">
      <DiagHeader
        title="Skill Health"
        subtitle={
          data ? new Date(data.generated_at).toLocaleString() : null
        }
        status={
          data ? (
            <span
              className={cn(
                "inline-block h-1.5 w-1.5 rounded-full",
                data.declining_skills.length > 0
                  ? "bg-warning"
                  : "bg-success"
              )}
            />
          ) : null
        }
        onRefresh={() => void refetch()}
        refreshing={isFetching}
      />

      {/* Search input */}
      {data && (data.skills.length > 0 || data.suggestions.length > 0) && (
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search skills, suggestions..."
          size="sm"
        />
      )}

      {error && <DiagError message={error instanceof Error ? error.message : String(error)} />}
      {isFetching && !data && <DiagLoading label="Analyzing skill health…" />}

      {data && (
        <>
          {/* Stats bar */}
          <div className="flex flex-wrap gap-2">
            <StatPill label="Skills" value={data.skills.length} />
            {data.stale_skills.length > 0 && (
              <StatPill
                label="Stale"
                value={data.stale_skills.length}
                variant="warning"
              />
            )}
            {data.declining_skills.length > 0 && (
              <StatPill
                label="Declining"
                value={data.declining_skills.length}
                variant="error"
              />
            )}
            <StatPill
              label="Total units"
              value={data.total_units_with_skills}
            />
          </div>

          {/* Skill table */}
          {filteredSkills.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-foreground/70">
                Skills ({filteredSkills.length}{searchTerm && data.skills.length !== filteredSkills.length ? ` of ${data.skills.length}` : ""})
              </h4>
              <div className="overflow-x-auto rounded-lg border border-border/30">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-border/30 bg-card/40">
                      <th className="px-2.5 py-1.5 text-left font-medium text-muted-foreground">
                        Skill
                      </th>
                      <th className="px-2.5 py-1.5 text-right font-medium text-muted-foreground">
                        Uses
                      </th>
                      <th className="px-2.5 py-1.5 text-right font-medium text-muted-foreground">
                        Success
                      </th>
                      <th className="px-2.5 py-1.5 text-right font-medium text-muted-foreground">
                        Tokens
                      </th>
                      <th className="px-2.5 py-1.5 text-center font-medium text-muted-foreground">
                        Trend
                      </th>
                      <th className="px-2.5 py-1.5 text-right font-medium text-muted-foreground">
                        Stale
                      </th>
                      <th className="px-2.5 py-1.5 text-right font-medium text-muted-foreground">
                        Cost
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSkills.map((skill) => (
                      <tr
                        key={skill.name}
                        className={cn(
                          "border-b border-border/20 last:border-0",
                          skill.flagged && "bg-destructive/[0.03]"
                        )}
                      >
                        <td className="px-2.5 py-1.5 font-mono text-foreground/80">
                          <span className="flex items-center gap-1.5">
                            {skill.name}
                            {skill.flagged && (
                              <AlertTriangle className="h-3 w-3 text-warning shrink-0" />
                            )}
                          </span>
                        </td>
                        <td className="px-2.5 py-1.5 text-right tabular-nums text-foreground/80">
                          {skill.total_uses}
                        </td>
                        <td
                          className={cn(
                            "px-2.5 py-1.5 text-right tabular-nums",
                            skill.success_rate >= 0.9
                              ? "text-success"
                              : skill.success_rate >= 0.7
                                ? "text-warning"
                                : "text-destructive"
                          )}
                        >
                          {(skill.success_rate * 100).toFixed(0)}%
                        </td>
                        <td className="px-2.5 py-1.5 text-right tabular-nums text-foreground/80">
                          {Math.round(skill.avg_tokens)}
                        </td>
                        <td
                          className={cn(
                            "px-2.5 py-1.5 text-center",
                            trendColor(skill.token_trend)
                          )}
                        >
                          {trendArrow(skill.token_trend)}
                        </td>
                        <td
                          className={cn(
                            "px-2.5 py-1.5 text-right tabular-nums",
                            skill.stale_days > 30
                              ? "text-warning"
                              : "text-foreground/80"
                          )}
                        >
                          {skill.stale_days > 0 ? `${skill.stale_days}d` : "—"}
                        </td>
                        <td className="px-2.5 py-1.5 text-right tabular-nums text-foreground/80">
                          {formatCost(skill.avg_cost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Stale skills */}
          {data.stale_skills.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-medium text-foreground/70">
                Stale Skills
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {data.stale_skills.map((name) => (
                  <Badge
                    key={name}
                    variant="secondary"
                    className="text-[10px] font-mono"
                  >
                    {name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Declining skills */}
          {data.declining_skills.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-medium text-foreground/70">
                Declining Skills
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {data.declining_skills.map((name) => (
                  <Badge
                    key={name}
                    variant="destructive"
                    className="text-[10px] font-mono"
                  >
                    {name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {filteredSuggestions.length > 0 ? (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-foreground/70">
                Suggestions ({filteredSuggestions.length}{searchTerm && data.suggestions.length !== filteredSuggestions.length ? ` of ${data.suggestions.length}` : ""})
              </h4>
              {filteredSuggestions.map((s, i) => (
                <SuggestionRow key={i} suggestion={s} />
              ))}
            </div>
          ) : searchTerm && data.suggestions.length > 0 ? (
            <DiagEmpty message={`No suggestions match "${searchTerm}"`} />
          ) : (
            filteredSkills.length === 0 && data.suggestions.length === 0 && (
              <DiagEmpty message="No skill usage data available" />
            )
          )}
        </>
      )}
    </div>
  );
}
