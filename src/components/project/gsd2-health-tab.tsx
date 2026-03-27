// GSD Vibe - GSD-2 Health Tab Component
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { useState, useEffect } from 'react';
import { Activity, AlertCircle, FileText, CheckCircle2, XCircle, Plus, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useGsd2Health } from '@/lib/queries';
import { formatCost } from '@/lib/utils';
import { readProjectFile, writeProjectFile } from '@/lib/tauri';

interface Gsd2HealthTabProps {
  projectId: string;
  projectPath: string;
}

export function Gsd2HealthTab({ projectId, projectPath }: Gsd2HealthTabProps) {
  const { data: health, isLoading, isError } = useGsd2Health(projectId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4" /> GSD Health
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
            <Activity className="h-4 w-4" /> GSD Health
          </CardTitle>
        </CardHeader>
        <CardContent className="py-4 text-center text-sm text-status-error">
          Failed to load health data — check that the project path is accessible.
        </CardContent>
      </Card>
    );
  }

  if (!health || (health.budget_spent === 0 && !health.active_milestone_id)) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4" /> GSD Health
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No health data yet — run a GSD-2 session to populate metrics.
        </CardContent>
      </Card>
    );
  }

  const budgetPct = health.budget_ceiling
    ? Math.round((health.budget_spent / health.budget_ceiling) * 100)
    : null;

  return (
    <div className="space-y-4">
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Activity className="h-4 w-4" /> GSD Health
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Budget row */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span>Budget</span>
            <span>
              {formatCost(health.budget_spent)}
              {health.budget_ceiling ? ` / ${formatCost(health.budget_ceiling)}` : ''}
            </span>
          </div>
          {budgetPct !== null && (
            <Progress
              value={budgetPct}
              variant={budgetPct > 80 ? 'warning' : 'default'}
              size="sm"
            />
          )}
        </div>

        {/* Blocker row (conditional) */}
        {health.blocker && (
          <div className="flex items-center gap-2 p-2 rounded border border-status-error/20 bg-status-error/10">
            <AlertCircle className="h-4 w-4 text-status-error flex-shrink-0" />
            <span className="text-sm text-status-error">{health.blocker}</span>
          </div>
        )}

        {/* Active unit row */}
        {health.active_milestone_id && (
          <div className="text-xs space-y-1">
            <div>
              <span className="text-muted-foreground">Active Milestone:</span>{' '}
              {health.active_milestone_id}
              {health.active_milestone_title ? ` — ${health.active_milestone_title}` : ''}
            </div>
            <div>
              <span className="text-muted-foreground">Active Slice:</span>{' '}
              {health.active_slice_id
                ? `${health.active_slice_id}${health.active_slice_title ? ` — ${health.active_slice_title}` : ''}`
                : 'None'}
            </div>
            {health.phase && (
              <div>
                <span className="text-muted-foreground">Phase:</span> {health.phase}
              </div>
            )}
            {health.next_action && (
              <div className="text-xs p-2 rounded bg-muted/40 border border-border/30">
                <span className="text-muted-foreground font-medium">Next: </span>
                {health.next_action}
              </div>
            )}
          </div>
        )}

        {/* Env error/warning counts */}
        {(health.env_error_count > 0 || health.env_warning_count > 0) && (
          <div className="flex items-center gap-2">
            {health.env_error_count > 0 && (
              <Badge variant="error" size="sm">
                {health.env_error_count} error{health.env_error_count !== 1 ? 's' : ''}
              </Badge>
            )}
            {health.env_warning_count > 0 && (
              <Badge variant="warning" size="sm">
                {health.env_warning_count} warning{health.env_warning_count !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        )}

        {/* Progress counters */}
        <div className="grid grid-cols-3 gap-2 text-xs text-center">
          <div>
            <div className="font-semibold">
              {health.milestones_done}/{health.milestones_total}
            </div>
            <div className="text-muted-foreground">Milestones</div>
          </div>
          <div>
            <div className="font-semibold">
              {health.slices_done}/{health.slices_total}
            </div>
            <div className="text-muted-foreground">Slices</div>
          </div>
          <div>
            <div className="font-semibold">
              {health.tasks_done}/{health.tasks_total}
            </div>
            <div className="text-muted-foreground">Tasks</div>
          </div>
        </div>
      </CardContent>
    </Card>
    <Gsd2ProjectFilesCard projectPath={projectPath} />
    </div>
  );
}

// ─── Required GSD-2 files with default content ────────────────────────────────

const GSD_REQUIRED_FILES: { filename: string; description: string; defaultContent: string }[] = [
  {
    filename: 'PROJECT.md',
    description: 'Living project description',
    defaultContent: `# Project\n\n## What This Is\n\n<!-- Describe the project here -->\n\n## Current State\n\n<!-- What is the current state of the project? -->\n\n## Architecture / Key Patterns\n\n<!-- Key architectural patterns and decisions -->\n`,
  },
  {
    filename: 'DECISIONS.md',
    description: 'Architectural decision register',
    defaultContent: `# Decisions\n\nAppend-only register of architectural and pattern decisions.\n\n| ID | Decision | Choice | Rationale | Made By | Revisable |\n|---|---|---|---|---|---|\n`,
  },
  {
    filename: 'REQUIREMENTS.md',
    description: 'Requirement contract',
    defaultContent: `# Requirements\n\nExplicit capability and coverage contract for the project.\n\n## Active\n\n<!-- Add requirements here -->\n\n## Validated\n\n<!-- Requirements with proof of implementation -->\n`,
  },
  {
    filename: 'STATE.md',
    description: 'Current project state (system-managed)',
    defaultContent: `# GSD State\n\n**Active Milestone:** None\n**Phase:** idle\n`,
  },
  {
    filename: 'KNOWLEDGE.md',
    description: 'Project-specific rules and lessons',
    defaultContent: `# Project Knowledge\n\nAppend-only register of project-specific rules, patterns, and lessons learned.\n`,
  },
];

interface FileStatus {
  filename: string;
  exists: boolean | null; // null = checking
}

function Gsd2ProjectFilesCard({ projectPath }: { projectPath: string }) {
  const gsdPath = `${projectPath}/.gsd`;
  const [fileStatuses, setFileStatuses] = useState<FileStatus[]>(
    GSD_REQUIRED_FILES.map((f) => ({ filename: f.filename, exists: null }))
  );
  const [creating, setCreating] = useState<string | null>(null);
  const [created, setCreated] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Check each file's existence by attempting to read it
    GSD_REQUIRED_FILES.forEach(({ filename }) => {
      readProjectFile(gsdPath, filename)
        .then(() => {
          setFileStatuses((prev) =>
            prev.map((s) => s.filename === filename ? { ...s, exists: true } : s)
          );
        })
        .catch(() => {
          setFileStatuses((prev) =>
            prev.map((s) => s.filename === filename ? { ...s, exists: false } : s)
          );
        });
    });
  }, [gsdPath]);

  const createFile = async (filename: string) => {
    const def = GSD_REQUIRED_FILES.find((f) => f.filename === filename);
    if (!def) return;
    setCreating(filename);
    try {
      await writeProjectFile(gsdPath, filename, def.defaultContent);
      setFileStatuses((prev) =>
        prev.map((s) => s.filename === filename ? { ...s, exists: true } : s)
      );
      setCreated((prev) => new Set(prev).add(filename));
    } catch (e) {
      console.error('Failed to create', filename, e);
    } finally {
      setCreating(null);
    }
  };

  const createAll = async () => {
    const missing = fileStatuses.filter((s) => s.exists === false);
    for (const { filename } of missing) {
      await createFile(filename);
    }
  };

  const missingCount = fileStatuses.filter((s) => s.exists === false).length;
  const checking = fileStatuses.some((s) => s.exists === null);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4" /> Required Files
          </CardTitle>
          {!checking && missingCount > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1.5"
              disabled={creating !== null}
              onClick={createAll}
            >
              {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              Create all ({missingCount})
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {fileStatuses.map(({ filename, exists }) => {
          const def = GSD_REQUIRED_FILES.find((f) => f.filename === filename)!;
          const isCreating = creating === filename;
          const wasCreated = created.has(filename);

          return (
            <div key={filename} className="flex items-center gap-2 text-xs">
              {exists === null ? (
                <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin shrink-0" />
              ) : exists ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-status-success shrink-0" />
              ) : (
                <XCircle className="h-3.5 w-3.5 text-status-error shrink-0" />
              )}
              <span className={`font-mono flex-1 ${exists === false ? 'text-status-error' : 'text-foreground'}`}>
                .gsd/{filename}
              </span>
              <span className="text-muted-foreground/60 truncate max-w-[120px]">{def.description}</span>
              {exists === false && !isCreating && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-[10px] px-2 gap-1 shrink-0"
                  onClick={() => createFile(filename)}
                >
                  <Plus className="h-2.5 w-2.5" /> Create
                </Button>
              )}
              {isCreating && <Loader2 className="h-3 w-3 animate-spin shrink-0 text-muted-foreground" />}
              {wasCreated && exists && (
                <span className="text-[10px] text-status-success shrink-0">created</span>
              )}
            </div>
          );
        })}
        {!checking && missingCount === 0 && (
          <p className="text-xs text-status-success flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" /> All required files present
          </p>
        )}
      </CardContent>
    </Card>
  );
}
