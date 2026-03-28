// GSD Vibe - GSD-2 HTML Reports Tab Component
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { FileText, ExternalLink, Loader2 } from 'lucide-react';
import { open } from '@tauri-apps/plugin-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ViewEmpty } from '@/components/shared/loading-states';
import { useGsd2ReportsIndex, useGsd2GenerateHtmlReport } from '@/lib/queries';
import { formatCost } from '@/lib/utils';
import type { ReportEntry } from '@/lib/tauri';

interface Gsd2ReportsTabProps {
  projectId: string;
  projectPath: string;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  // dateStr may be ISO string or YYYY-MM-DD or epoch seconds as string
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

interface ReportRowProps {
  entry: ReportEntry;
  reportsDir: string;
}

function ReportRow({ entry, reportsDir }: ReportRowProps) {
  const filePath = `${reportsDir}/${entry.filename}`;

  const handleOpen = () => {
    void open(filePath);
  };

  return (
    <tr className="border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors">
      <td className="py-2 pr-3 text-xs font-mono text-foreground truncate max-w-[160px]" title={entry.filename}>
        {entry.label || entry.filename}
      </td>
      <td className="py-2 pr-3 text-xs text-muted-foreground whitespace-nowrap">
        {formatDate(entry.generated_at)}
      </td>
      <td className="py-2 pr-3 text-xs text-muted-foreground whitespace-nowrap">
        {entry.milestone_id}
        {entry.milestone_title ? ` — ${entry.milestone_title}` : ''}
      </td>
      <td className="py-2 pr-3 text-xs text-right whitespace-nowrap">
        {formatCost(entry.total_cost)}
      </td>
      <td className="py-2 pr-3 text-xs text-right whitespace-nowrap">
        {formatTokens(entry.total_tokens)}
      </td>
      <td className="py-2 pr-3 text-xs text-muted-foreground whitespace-nowrap">
        {entry.kind}
      </td>
      <td className="py-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={handleOpen}
          title={`Open ${entry.filename} in browser`}
        >
          <ExternalLink className="h-3 w-3 mr-1" />
          Open
        </Button>
      </td>
    </tr>
  );
}

export function Gsd2ReportsTab({ projectId, projectPath: _projectPath }: Gsd2ReportsTabProps) {
  const { data: index, isLoading, isError } = useGsd2ReportsIndex(projectId);
  const generate = useGsd2GenerateHtmlReport(projectId);

  // Reports are stored at <project_path>/.gsd/reports/
  const reportsDir = index?.project_path
    ? `${index.project_path}/.gsd/reports`
    : '';

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4" /> HTML Reports
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4" /> HTML Reports
          </CardTitle>
        </CardHeader>
        <CardContent className="py-4 text-center text-sm text-status-error">
          Failed to load reports index — check that the project path is accessible.
        </CardContent>
      </Card>
    );
  }

  const entries = index?.entries ?? [];

  if (entries.length === 0) {
    return (
      <ViewEmpty
        icon={<FileText className="h-8 w-8" />}
        message="No reports yet"
        description='Click "Generate Report" to create one'
      />
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4" /> HTML Reports
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            disabled={generate.isPending}
            onClick={() => generate.mutate()}
          >
            {generate.isPending ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <FileText className="h-3 w-3 mr-1" />
                Generate Report
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="pb-2 pr-3 text-left text-xs font-medium text-muted-foreground">Name</th>
                  <th className="pb-2 pr-3 text-left text-xs font-medium text-muted-foreground">Generated</th>
                  <th className="pb-2 pr-3 text-left text-xs font-medium text-muted-foreground">Milestone</th>
                  <th className="pb-2 pr-3 text-right text-xs font-medium text-muted-foreground">Cost</th>
                  <th className="pb-2 pr-3 text-right text-xs font-medium text-muted-foreground">Tokens</th>
                  <th className="pb-2 pr-3 text-left text-xs font-medium text-muted-foreground">Kind</th>
                  <th className="pb-2 text-left text-xs font-medium text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <ReportRow
                    key={entry.filename}
                    entry={entry}
                    reportsDir={reportsDir}
                  />
                ))}
              </tbody>
            </table>
          </div>
      </CardContent>
    </Card>
  );
}
