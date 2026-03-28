// GSD Vibe - GSD-2 Worktrees Tab Component
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { useState } from 'react';
import {
  GitBranch,
  ChevronRight,
  Trash2,
  Loader2,
  FilePlus,
  FilePenLine,
  FileMinus,
  GitMerge,
  Trash,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useGsd2Worktrees, useGsd2WorktreeDiff, useGsd2RemoveWorktree, useGsd2MergeWorktree, useGsd2CleanWorktrees } from '@/lib/queries';
import type { WorktreeInfo } from '@/lib/tauri';
import { toast } from 'sonner';

interface Gsd2WorktreesTabProps {
  projectId: string;
  projectPath: string;
}

interface WorktreeDiffSectionProps {
  projectId: string;
  worktreeName: string;
}

function WorktreeDiffSection({ projectId, worktreeName }: WorktreeDiffSectionProps) {
  const { data: diff, isLoading, isError } = useGsd2WorktreeDiff(projectId, worktreeName, true);

  if (isLoading) {
    return <Skeleton className="h-8 w-full" />;
  }

  if (isError || !diff) {
    return <p className="text-xs text-status-error">Failed to load diff</p>;
  }

  return (
    <div>
      {diff.added_count > 0 && (
        <div className="mb-2">
          <div className="flex items-center gap-1 text-status-success text-xs font-medium mb-1">
            <FilePlus className="h-3 w-3" /> Added ({diff.added_count})
          </div>
          {diff.added_count > 8 ? (
            <ScrollArea className="max-h-48">
              {diff.added.map((f) => (
                <div className="text-xs font-mono text-status-success/80 py-1 pl-6" key={f}>
                  {f}
                </div>
              ))}
            </ScrollArea>
          ) : (
            diff.added.map((f) => (
              <div className="text-xs font-mono text-status-success/80 py-1 pl-6" key={f}>
                {f}
              </div>
            ))
          )}
        </div>
      )}
      {diff.modified_count > 0 && (
        <div className="mb-2">
          <div className="flex items-center gap-1 text-status-warning text-xs font-medium mb-1">
            <FilePenLine className="h-3 w-3" /> Modified ({diff.modified_count})
          </div>
          {diff.modified_count > 8 ? (
            <ScrollArea className="max-h-48">
              {diff.modified.map((f) => (
                <div className="text-xs font-mono text-status-warning/80 py-1 pl-6" key={f}>
                  {f}
                </div>
              ))}
            </ScrollArea>
          ) : (
            diff.modified.map((f) => (
              <div className="text-xs font-mono text-status-warning/80 py-1 pl-6" key={f}>
                {f}
              </div>
            ))
          )}
        </div>
      )}
      {diff.removed_count > 0 && (
        <div className="mb-2">
          <div className="flex items-center gap-1 text-status-error text-xs font-medium mb-1">
            <FileMinus className="h-3 w-3" /> Removed ({diff.removed_count})
          </div>
          {diff.removed_count > 8 ? (
            <ScrollArea className="max-h-48">
              {diff.removed.map((f) => (
                <div className="text-xs font-mono text-status-error/80 py-1 pl-6" key={f}>
                  {f}
                </div>
              ))}
            </ScrollArea>
          ) : (
            diff.removed.map((f) => (
              <div className="text-xs font-mono text-status-error/80 py-1 pl-6" key={f}>
                {f}
              </div>
            ))
          )}
        </div>
      )}
      {diff.added_count === 0 && diff.modified_count === 0 && diff.removed_count === 0 && (
        <p className="text-xs text-muted-foreground">No changes detected</p>
      )}
    </div>
  );
}

export function Gsd2WorktreesTab({ projectId }: Gsd2WorktreesTabProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [removeTarget, setRemoveTarget] = useState<WorktreeInfo | null>(null);
  const [mergeTarget, setMergeTarget] = useState<WorktreeInfo | null>(null);

  const { data: worktrees, isLoading, isError } = useGsd2Worktrees(projectId);
  const removeMutation = useGsd2RemoveWorktree();
  const mergeMutation = useGsd2MergeWorktree();
  const cleanMutation = useGsd2CleanWorktrees();

  const toggleRow = (name: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const confirmRemove = () => {
    if (!removeTarget) return;
    removeMutation.mutate({ projectId, worktreeName: removeTarget.name }, {
      onSuccess: () => {
        toast.success(`Worktree ${removeTarget.name} removed`);
      },
      onError: (error) => {
        toast.error(`Failed to remove worktree: ${error}`);
      },
    });
    setRemoveTarget(null);
  };

  const confirmMerge = () => {
    if (!mergeTarget) return;
    mergeMutation.mutate({ projectId, worktreeName: mergeTarget.name }, {
      onSuccess: (result) => {
        toast.success(result || `Worktree ${mergeTarget.name} merged successfully`);
      },
      onError: (error) => {
        toast.error(`Failed to merge worktree: ${error}`);
      },
    });
    setMergeTarget(null);
  };

  const handleCleanStale = () => {
    cleanMutation.mutate(projectId, {
      onSuccess: (result) => {
        toast.success(result || 'Stale worktrees cleaned');
      },
      onError: (error) => {
        toast.error(`Failed to clean stale worktrees: ${error}`);
      },
    });
  };

  // Check if there are any stale worktrees
  const hasStaleWorktrees = worktrees?.some(wt => !wt.exists) ?? false;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <GitBranch className="h-4 w-4" /> Worktrees
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <GitBranch className="h-4 w-4" /> Worktrees
          </CardTitle>
        </CardHeader>
        <CardContent className="py-4 text-center text-sm text-status-error">
          Failed to load worktrees — check that the project path is accessible.
        </CardContent>
      </Card>
    );
  }

  if (!worktrees || worktrees.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <GitBranch className="h-4 w-4" /> Worktrees
          </CardTitle>
        </CardHeader>
        <CardContent className="py-12 text-center">
          <p className="text-sm font-medium text-muted-foreground">No active worktrees</p>
          <p className="text-xs text-muted-foreground mt-1">
            GSD-2 creates these automatically when running parallel slices.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <GitBranch className="h-4 w-4" /> Worktrees
            {hasStaleWorktrees && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCleanStale}
                disabled={cleanMutation.isPending}
                className="ml-auto"
              >
                {cleanMutation.isPending ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Trash className="h-3 w-3 mr-1" />
                )}
                Clean Stale
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {worktrees.map((wt) => (
              <div key={wt.name}>
                {/* Row header — click to toggle accordion */}
                <div
                  className="py-3 px-4 flex items-center gap-2 cursor-pointer"
                  onClick={() => toggleRow(wt.name)}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    aria-label={`${expandedRows.has(wt.name) ? 'Collapse' : 'Expand'} ${wt.name} diff`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleRow(wt.name);
                    }}
                  >
                    <ChevronRight
                      className="h-4 w-4 transition-transform duration-200"
                      style={{
                        transform: expandedRows.has(wt.name) ? 'rotate(90deg)' : 'rotate(0deg)',
                      }}
                    />
                  </Button>
                  <GitBranch className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-sm font-mono font-medium text-foreground">{wt.name}</span>
                  <Badge variant="outline" className="font-mono text-xs">
                    {wt.branch}
                  </Badge>
                  <span className="text-xs ml-auto">
                    <span className="text-status-success">+{wt.added_count} added</span>
                    <span className="text-muted-foreground"> · </span>
                    <span className="text-status-warning">{wt.modified_count} modified</span>
                    <span className="text-muted-foreground"> · </span>
                    <span className="text-status-error">{wt.removed_count} removed</span>
                  </span>
                  {wt.name !== 'main' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMergeTarget(wt);
                      }}
                      disabled={mergeMutation.isPending}
                    >
                      {mergeMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <GitMerge className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRemoveTarget(wt);
                    }}
                    disabled={removeMutation.isPending}
                  >
                    {removeMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
                {/* Path row */}
                <div className="px-4 pb-2">
                  <span
                    className="text-xs font-mono text-muted-foreground truncate block"
                    title={wt.path}
                  >
                    {wt.path}
                  </span>
                </div>
                {/* Expanded diff section */}
                {expandedRows.has(wt.name) && (
                  <div className="border-t px-4 py-3 bg-muted/30">
                    <WorktreeDiffSection projectId={projectId} worktreeName={wt.name} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removeTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the worktree and branch {removeTarget?.branch}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!mergeTarget} onOpenChange={(open) => !open && setMergeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Merge {mergeTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will squash-merge the worktree branch {mergeTarget?.branch} back into main and remove the worktree.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmMerge}>
              Merge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
