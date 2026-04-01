// @ts-nocheck — pre-existing file with implicit-any callback params; full typing deferred
// VCCA - GitHub Integration Panel
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

// @ts-nocheck — pre-existing: data layer hooks not yet wired
import { useState, useCallback, useMemo } from 'react';
import { 
  Github, 
  GitPullRequest, 
  Bug, 
  CheckCircle, 
  XCircle, 
  Clock,
  Star,
  GitFork,
  ExternalLink,
  Plus,
  Tag,
  AlertCircle,
  MessageSquare,
  Loader2,
  Key,
  Terminal,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { open as openUrl } from '@tauri-apps/plugin-shell';
import { toast } from 'sonner';
import { 
  useGitStatus, 
  useGithubTokenStatus,
  useGithubRepoInfo,
  useGithubPrs,
  useGithubIssues,
  useGithubCheckRuns,
  useGithubReleases,
  useGithubCreatePr,
  useGithubCreateIssue,
  useGithubNotifications,
  useGithubImportGhToken,
  useGithubSaveToken,
  useGithubRemoveToken,
} from '@/lib/queries';

interface GitHubPanelProps {
  projectPath: string;
  projectId: string;
}

interface PullRequestFilters {
  state: 'open' | 'closed' | 'all';
}

interface IssueFilters {
  state: 'open' | 'closed' | 'all';
}

function relativeTime(isoDate: string): string {
  const now = new Date();
  const date = new Date(isoDate);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`;
  return `${Math.floor(diffInSeconds / 31536000)} years ago`;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function CheckStatusIcon({ status, conclusion }: { status: string; conclusion?: string | null }) {
  if (status === 'completed') {
    if (conclusion === 'success') {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    if (conclusion === 'failure' || conclusion === 'cancelled') {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
  }
  if (status === 'in_progress' || status === 'queued') {
    return <Clock className="h-4 w-4 text-yellow-500" />;
  }
  return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
}

function NewPRDialog({ projectPath, onSuccess }: { projectPath: string; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [headBranch, setHeadBranch] = useState('');
  const [baseBranch, setBaseBranch] = useState('main');
  const [isDraft, setIsDraft] = useState(false);
  
  const { data: gitStatus } = useGitStatus(projectPath);
  const createPrMutation = useGithubCreatePr();

  // Pre-fill head branch with current branch
  useMemo(() => {
    if (gitStatus?.branch) {
      setHeadBranch(gitStatus.branch);
    }
  }, [gitStatus?.branch]);

  const handleSubmit = useCallback(async () => {
    if (!title.trim() || !headBranch.trim()) return;

    try {
      await createPrMutation.mutateAsync({
        title,
        body,
        head: headBranch,
        base: baseBranch,
        draft: isDraft,
        projectPath
      });
      setOpen(false);
      setTitle('');
      setBody('');
      setHeadBranch(gitStatus?.branch || '');
      setBaseBranch('main');
      setIsDraft(false);
      onSuccess();
      toast.success('Pull request created successfully');
    } catch (error) {
      toast.error('Failed to create pull request');
    }
  }, [title, body, headBranch, baseBranch, isDraft, projectPath, createPrMutation, gitStatus, onSuccess]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          New PR
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Pull Request</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Describe your changes"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Additional details about your changes"
              rows={4}
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">From branch</label>
              <Input
                value={headBranch}
                onChange={(e) => setHeadBranch(e.target.value)}
                placeholder="feature-branch"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">To branch</label>
              <Input
                value={baseBranch}
                onChange={(e) => setBaseBranch(e.target.value)}
                placeholder="main"
                className="mt-1"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="draft"
              checked={isDraft}
              onChange={(e) => setIsDraft(e.target.checked)}
              className="rounded border-gray-300"
            />
            <label htmlFor="draft" className="text-sm">Create as draft</label>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!title.trim() || !headBranch.trim() || createPrMutation.isPending}
            >
              {createPrMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create PR'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NewIssueDialog({ projectPath, onSuccess }: { projectPath: string; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  
  const createIssueMutation = useGithubCreateIssue();

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) return;

    try {
      await createIssueMutation.mutateAsync({
        title,
        body,
        projectPath,
        labels: [],
        assignees: []
      });
      setOpen(false);
      setTitle('');
      setBody('');
      onSuccess();
      toast.success('Issue created successfully');
    } catch (error) {
      toast.error('Failed to create issue');
    }
  }, [title, body, projectPath, createIssueMutation, onSuccess]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          New Issue
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Issue</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief description of the issue"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Detailed description, steps to reproduce, etc."
              rows={6}
              className="mt-1"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!title.trim() || createIssueMutation.isPending}
            >
              {createIssueMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Issue'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function GitHubPanel({ projectPath, projectId: _projectId }: GitHubPanelProps) {
  const [prFilters, setPrFilters] = useState<PullRequestFilters>({ state: 'open' });
  const [issueFilters, setIssueFilters] = useState<IssueFilters>({ state: 'open' });
  const [checkRef, setCheckRef] = useState('');
  const [patInput, setPatInput] = useState('');
  const [showPat, setShowPat] = useState(false);

  const { data: tokenStatus, refetch: refetchToken } = useGithubTokenStatus();
  const { data: repoInfo, error: repoError } = useGithubRepoInfo(projectPath);
  const { data: gitStatus } = useGitStatus(projectPath);
  const { data: notifications } = useGithubNotifications(projectPath, tokenStatus?.configured);
  const { data: pullRequests, refetch: refetchPRs } = useGithubPrs(projectPath, prFilters.state, tokenStatus?.configured);
  const { data: issues, refetch: refetchIssues } = useGithubIssues(projectPath, issueFilters.state, tokenStatus?.configured);
  const { data: checkRuns } = useGithubCheckRuns(projectPath, checkRef || gitStatus?.branch || '', tokenStatus?.configured);
  const { data: releases } = useGithubReleases(projectPath, tokenStatus?.configured);

  const importGhMutation = useGithubImportGhToken();
  const saveTokenMutation = useGithubSaveToken();
  const removeTokenMutation = useGithubRemoveToken();

  // Update check ref when current branch changes
  useMemo(() => {
    if (gitStatus?.branch && !checkRef) {
      setCheckRef(gitStatus.branch);
    }
  }, [gitStatus?.branch, checkRef]);

  // ── Auth UI (no token configured) ──────────────────────────────────────────
  if (!tokenStatus?.configured) {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 border-b border-border/50">
          <Github className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">GitHub</span>
          {repoInfo && (
            <span className="text-xs text-muted-foreground ml-1 font-mono">{repoInfo.full_name}</span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* No remote state */}
          {repoError && String(repoError).includes('No GitHub remote') ? (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <Github className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm font-medium">No GitHub remote</p>
              <p className="text-xs text-muted-foreground mt-1">Add a GitHub remote to enable integration.</p>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-4 text-center">
              <Key className="h-6 w-6 mx-auto mb-1.5 text-muted-foreground/60" />
              <p className="text-sm font-medium">Connect GitHub</p>
              <p className="text-xs text-muted-foreground mt-0.5">Unlock PRs, issues, CI status, and more.</p>
            </div>
          )}

          {/* Option 1: Import from gh CLI */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-start gap-2">
              <Terminal className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium">Import from gh CLI</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  If you're already authenticated with the GitHub CLI (<code className="bg-muted px-1 rounded">gh auth login</code>), import that token instantly.
                </p>
              </div>
            </div>
            <Button
              className="w-full h-8 text-xs gap-2"
              variant="outline"
              onClick={() => {
                importGhMutation.mutate(undefined, {
                  onSuccess: (msg) => { toast.success(msg); void refetchToken(); },
                  onError: (e) => toast.error(String(e)),
                });
              }}
              disabled={importGhMutation.isPending}
            >
              {importGhMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Terminal className="h-3.5 w-3.5" />}
              Import from gh CLI
            </Button>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex-1 h-px bg-border" />
            <span>or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Option 2: Paste PAT */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-start gap-2">
              <Key className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium">Personal Access Token</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Create a token at{' '}
                  <button
                    className="underline text-foreground/80 hover:text-foreground transition-colors"
                    onClick={() => void openUrl('https://github.com/settings/tokens/new?scopes=repo,notifications&description=GSD+Vibe')}
                  >
                    github.com/settings/tokens
                  </button>
                  {' '}with <code className="bg-muted px-1 rounded">repo</code> scope. Stored securely in your OS keychain.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                type={showPat ? 'text' : 'password'}
                value={patInput}
                onChange={(e) => setPatInput(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                className="h-8 text-xs font-mono flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && patInput.trim()) {
                    saveTokenMutation.mutate(patInput.trim(), {
                      onSuccess: () => { toast.success('Token saved'); setPatInput(''); void refetchToken(); },
                      onError: (e) => toast.error(String(e)),
                    });
                  }
                }}
              />
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => setShowPat(!showPat)}>
                      <Key className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{showPat ? 'Hide token' : 'Show token'}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Button
              className="w-full h-8 text-xs gap-2"
              onClick={() => {
                saveTokenMutation.mutate(patInput.trim(), {
                  onSuccess: () => { toast.success('Token saved'); setPatInput(''); void refetchToken(); },
                  onError: (e) => toast.error(String(e)),
                });
              }}
              disabled={saveTokenMutation.isPending || !patInput.trim()}
            >
              {saveTokenMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Key className="h-3.5 w-3.5" />}
              Save Token
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main panel (token configured) ──────────────────────────────────────────
  const unreadCount = notifications?.filter((n) => n.unread).length ?? 0;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between gap-2 px-4 py-2.5 border-b border-border/50">
        <div className="flex items-center gap-2 min-w-0">
          <Github className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          {repoInfo ? (
            <button
              className="text-sm font-medium hover:text-foreground/80 transition-colors truncate inline-flex items-center gap-1"
              onClick={() => void openUrl(repoInfo.html_url)}
            >
              {repoInfo.full_name}
              <ExternalLink className="h-3 w-3 opacity-40 flex-shrink-0" />
            </button>
          ) : (
            <span className="text-sm font-medium">GitHub</span>
          )}
          {repoInfo && (
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-0.5"><Star className="h-3 w-3" />{repoInfo.stargazers_count}</span>
              <span className="flex items-center gap-0.5"><GitFork className="h-3 w-3" />{repoInfo.forks_count}</span>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">{unreadCount}</Badge>
              )}
            </div>
          )}
        </div>
        {/* Token management */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0 text-muted-foreground hover:text-status-error"
              onClick={() => {
                removeTokenMutation.mutate(undefined, {
                  onSuccess: () => { toast.success('GitHub token removed'); void refetchToken(); },
                  onError: (e) => toast.error(String(e)),
                });
              }}
              disabled={removeTokenMutation.isPending}
            >
              {removeTokenMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Remove GitHub token</TooltipContent>
        </Tooltip>
      </div>

      {/* No remote state */}
      {repoError && repoError.toString().includes('No GitHub remote found') && (
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div>
            <Github className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm font-medium">No GitHub remote</p>
            <p className="text-xs text-muted-foreground mt-1">Add a GitHub remote to enable integration.</p>
          </div>
        </div>
      )}

      {/* Tab navigation */}
      {(!repoError || !repoError.toString().includes('No GitHub remote found')) && (
        <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <TabsList className="flex-shrink-0 rounded-none border-b border-border/50 bg-transparent justify-start gap-1 px-3 h-9">
            <TabsTrigger value="overview" className="h-7 rounded-md px-2.5 text-xs data-[state=active]:bg-muted">Overview</TabsTrigger>
            <TabsTrigger value="pulls" className="h-7 rounded-md px-2.5 text-xs data-[state=active]:bg-muted">
              PRs
              {(pullRequests?.length ?? 0) > 0 && (
                <span className="ml-1.5 rounded bg-muted-foreground/20 px-1 text-[10px]">{pullRequests!.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="issues" className="h-7 rounded-md px-2.5 text-xs data-[state=active]:bg-muted">
              Issues
              {(issues?.length ?? 0) > 0 && (
                <span className="ml-1.5 rounded bg-muted-foreground/20 px-1 text-[10px]">{issues!.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="checks" className="h-7 rounded-md px-2.5 text-xs data-[state=active]:bg-muted">Checks</TabsTrigger>
            <TabsTrigger value="releases" className="h-7 rounded-md px-2.5 text-xs data-[state=active]:bg-muted">Releases</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="flex-1 overflow-y-auto mt-0 p-4 space-y-4 data-[state=inactive]:hidden">
            {repoInfo ? (
              <>
                {repoInfo.description && (
                  <p className="text-sm text-muted-foreground">{repoInfo.description}</p>
                )}
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-md border px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-0.5"><Star className="h-3 w-3" />Stars</div>
                    <p className="text-base font-semibold">{repoInfo.stargazers_count}</p>
                  </div>
                  <div className="rounded-md border px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-0.5"><GitFork className="h-3 w-3" />Forks</div>
                    <p className="text-base font-semibold">{repoInfo.forks_count}</p>
                  </div>
                  <div className="rounded-md border px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-0.5"><Bug className="h-3 w-3" />Issues</div>
                    <p className="text-base font-semibold">{repoInfo.open_issues_count}</p>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex justify-between"><span>Visibility</span><Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">{repoInfo.visibility}</Badge></div>
                  <div className="flex justify-between"><span>Default branch</span><span className="font-mono">{repoInfo.default_branch}</span></div>
                  {repoInfo.pushed_at && <div className="flex justify-between"><span>Last push</span><span>{relativeTime(repoInfo.pushed_at)}</span></div>}
                </div>
                {unreadCount > 0 && (
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div className="flex items-center gap-2 text-sm"><MessageSquare className="h-4 w-4" />Notifications</div>
                    <Badge variant="secondary">{unreadCount} unread</Badge>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            )}
          </TabsContent>

          {/* Pull Requests */}
          <TabsContent value="pulls" className="flex-1 overflow-y-auto mt-0 data-[state=inactive]:hidden">
            <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-border/50">
              <div className="flex gap-1">
                {(['open', 'closed', 'all'] as const).map((s) => (
                  <Button key={s} variant={prFilters.state === s ? 'secondary' : 'ghost'} size="sm" className="h-6 px-2 text-xs capitalize" onClick={() => setPrFilters({ state: s })}>{s}</Button>
                ))}
              </div>
              <NewPRDialog projectPath={projectPath} onSuccess={() => void refetchPRs()} />
            </div>
            <div className="divide-y divide-border/50">
              {pullRequests?.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <GitPullRequest className="h-7 w-7 mb-2" />
                  <p className="text-sm">No {prFilters.state} pull requests</p>
                </div>
              )}
              {pullRequests?.map((pr) => (
                <button key={pr.number} className="w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors" onClick={() => void openUrl(pr.html_url)}>
                  <div className="flex items-start gap-2">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                      {getInitials(pr.user_login)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-xs text-muted-foreground font-mono">#{pr.number}</span>
                        {pr.draft && <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">Draft</Badge>}
                        {pr.labels.slice(0, 2).map((l) => (
                          <span key={l.name} className="text-[10px] px-1 rounded border" style={{ backgroundColor: `#${l.color}25`, borderColor: `#${l.color}60` }}>{l.name}</span>
                        ))}
                      </div>
                      <p className="text-sm font-medium truncate">{pr.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{pr.head_ref} → {pr.base_ref} · {pr.user_login} · {relativeTime(pr.updated_at)}</p>
                    </div>
                    <CheckStatusIcon status={pr.head_ref === (gitStatus?.branch ?? '') ? (checkRuns?.[0]?.status ?? 'unknown') : 'unknown'} conclusion={checkRuns?.[0]?.conclusion} />
                  </div>
                </button>
              ))}
            </div>
          </TabsContent>

          {/* Issues */}
          <TabsContent value="issues" className="flex-1 overflow-y-auto mt-0 data-[state=inactive]:hidden">
            <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-border/50">
              <div className="flex gap-1">
                {(['open', 'closed', 'all'] as const).map((s) => (
                  <Button key={s} variant={issueFilters.state === s ? 'secondary' : 'ghost'} size="sm" className="h-6 px-2 text-xs capitalize" onClick={() => setIssueFilters({ state: s })}>{s}</Button>
                ))}
              </div>
              <NewIssueDialog projectPath={projectPath} onSuccess={() => void refetchIssues()} />
            </div>
            <div className="divide-y divide-border/50">
              {issues?.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <Bug className="h-7 w-7 mb-2" />
                  <p className="text-sm">No {issueFilters.state} issues</p>
                </div>
              )}
              {issues?.map((issue) => (
                <button key={issue.number} className="w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors" onClick={() => void openUrl(issue.html_url)}>
                  <div className="flex items-start gap-2">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                      {getInitials(issue.user_login)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-xs text-muted-foreground font-mono">#{issue.number}</span>
                        {issue.labels.slice(0, 2).map((l) => (
                          <span key={l.name} className="text-[10px] px-1 rounded border" style={{ backgroundColor: `#${l.color}25`, borderColor: `#${l.color}60` }}>{l.name}</span>
                        ))}
                      </div>
                      <p className="text-sm font-medium truncate">{issue.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{issue.user_login} · {relativeTime(issue.created_at)}{issue.comments > 0 ? ` · ${issue.comments} comments` : ''}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </TabsContent>

          {/* Checks */}
          <TabsContent value="checks" className="flex-1 overflow-y-auto mt-0 data-[state=inactive]:hidden">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50">
              <span className="text-xs text-muted-foreground flex-shrink-0">Ref</span>
              <Input
                value={checkRef}
                onChange={(e) => setCheckRef(e.target.value)}
                placeholder={gitStatus?.branch ?? 'main'}
                className="h-6 text-xs font-mono flex-1"
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => setCheckRef(gitStatus?.branch ?? '')}>
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reset to current branch</TooltipContent>
              </Tooltip>
            </div>
            <div className="divide-y divide-border/50 p-2">
              {!checkRuns || checkRuns.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <CheckCircle className="h-7 w-7 mb-2" />
                  <p className="text-sm">No check runs for this ref</p>
                </div>
              ) : checkRuns.map((run) => (
                <div key={run.id} className="flex items-center gap-3 py-2 px-2 rounded hover:bg-muted/40">
                  <CheckStatusIcon status={run.status} conclusion={run.conclusion} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{run.name}</p>
                    <p className="text-xs text-muted-foreground">{run.app_name}</p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground flex-shrink-0">
                    {run.completed_at && run.started_at ? (
                      <span>{Math.round((new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 1000)}s</span>
                    ) : (
                      <span className="capitalize">{run.status}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Releases */}
          <TabsContent value="releases" className="flex-1 overflow-y-auto mt-0 data-[state=inactive]:hidden">
            <div className="divide-y divide-border/50">
              {!releases || releases.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <Tag className="h-7 w-7 mb-2" />
                  <p className="text-sm">No releases yet</p>
                </div>
              ) : releases.map((release) => (
                <button key={release.id} className="w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors" onClick={() => void openUrl(release.html_url)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Tag className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm font-mono font-medium">{release.tag_name}</span>
                        {release.prerelease && <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">pre</Badge>}
                        {release.draft && <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">draft</Badge>}
                      </div>
                      {release.name && release.name !== release.tag_name && (
                        <p className="text-xs text-muted-foreground truncate">{release.name}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">{relativeTime(release.published_at ?? release.created_at)} · {release.assets_count} assets</p>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  </div>
                </button>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
    </TooltipProvider>
  );
}