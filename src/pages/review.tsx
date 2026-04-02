// VCCA - Review Page
// Cross-project GitHub and CI review surface
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { open as openUrl } from '@tauri-apps/plugin-shell';
import {
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  GitPullRequest,
  Github,
  MessageSquareWarning,
  SearchCheck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { queryKeys } from '@/lib/query-keys';
import { useGithubTokenStatus, useProjectsWithStats } from '@/lib/queries';
import * as api from '@/lib/tauri';

function relativeTime(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diffMs < hour) return `${Math.max(1, Math.round(diffMs / minute))}m ago`;
  if (diffMs < day) return `${Math.round(diffMs / hour)}h ago`;
  return `${Math.round(diffMs / day)}d ago`;
}

function ReviewRow({
  title,
  detail,
  badge,
  onOpen,
  onOpenExternal,
}: {
  title: string;
  detail: string;
  badge?: React.ReactNode;
  onOpen: () => void;
  onOpenExternal?: () => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border/50 bg-card px-4 py-3">
      <div className="min-w-0 flex-1">
        <button type="button" onClick={onOpen} className="text-left">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{title}</span>
            {badge}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        </button>
      </div>
      {onOpenExternal && (
        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => void onOpenExternal()}>
          <ExternalLink className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

export function ReviewPage() {
  const navigate = useNavigate();
  const { data: tokenStatus } = useGithubTokenStatus();
  const { data: projects, isLoading } = useProjectsWithStats();

  const activeProjects = useMemo(
    () => (projects ?? []).filter((project) => project.status !== 'archived'),
    [projects]
  );

  const repoQueries = useQueries({
    queries: activeProjects.map((project) => ({
      queryKey: queryKeys.github.repoInfo(project.path),
      queryFn: () => api.githubGetRepoInfo(project.path),
      enabled: Boolean(tokenStatus?.configured && project.path),
      staleTime: 60_000,
      retry: false,
    })),
  });

  const gitInfoQueries = useQueries({
    queries: activeProjects.map((project) => ({
      queryKey: queryKeys.gitInfo(project.path),
      queryFn: () => api.getGitInfo(project.path),
      enabled: Boolean(tokenStatus?.configured && project.path),
      staleTime: 30_000,
      retry: false,
    })),
  });

  const reviewProjects = useMemo(
    () =>
      activeProjects
        .map((project, index) => ({
          project,
          repo: repoQueries[index]?.data,
          branch: gitInfoQueries[index]?.data?.branch ?? '',
        }))
        .filter((item) => Boolean(item.repo)),
    [activeProjects, repoQueries, gitInfoQueries]
  );

  const prQueries = useQueries({
    queries: reviewProjects.map(({ project }) => ({
      queryKey: queryKeys.github.prs(project.path, 'open'),
      queryFn: () => api.githubListPrs(project.path, 'open'),
      enabled: Boolean(tokenStatus?.configured),
      staleTime: 30_000,
      retry: false,
    })),
  });

  const issueQueries = useQueries({
    queries: reviewProjects.map(({ project }) => ({
      queryKey: queryKeys.github.issues(project.path, 'open'),
      queryFn: () => api.githubListIssues(project.path, 'open'),
      enabled: Boolean(tokenStatus?.configured),
      staleTime: 30_000,
      retry: false,
    })),
  });

  const checkQueries = useQueries({
    queries: reviewProjects.map(({ project, branch }) => ({
      queryKey: queryKeys.github.checkRuns(project.path, branch),
      queryFn: () => api.githubListCheckRuns(project.path, branch),
      enabled: Boolean(tokenStatus?.configured && branch),
      staleTime: 20_000,
      refetchInterval: 30_000,
      retry: false,
    })),
  });

  const reviewNeededPrs = useMemo(
    () =>
      reviewProjects.flatMap(({ project }, index) =>
        (prQueries[index]?.data ?? [])
          .filter((pr) => pr.review_decision === 'REVIEW_REQUIRED' || pr.comments > 0 || pr.review_comments > 0)
          .map((pr) => ({ project, pr }))
      ),
    [reviewProjects, prQueries]
  );

  const failingChecks = useMemo(
    () =>
      reviewProjects.flatMap(({ project }, index) =>
        (checkQueries[index]?.data ?? [])
          .filter((check) => check.conclusion === 'failure' || check.conclusion === 'cancelled')
          .map((check) => ({ project, check }))
      ),
    [reviewProjects, checkQueries]
  );

  const openIssues = useMemo(
    () =>
      reviewProjects.flatMap(({ project }, index) =>
        (issueQueries[index]?.data ?? []).slice(0, 3).map((issue) => ({ project, issue }))
      ),
    [reviewProjects, issueQueries]
  );

  const openPrs = useMemo(
    () =>
      reviewProjects.flatMap(({ project }, index) =>
        (prQueries[index]?.data ?? []).map((pr) => ({ project, pr }))
      ),
    [reviewProjects, prQueries]
  );

  if (!tokenStatus?.configured) {
    return (
      <div className="h-full overflow-auto p-8">
        <PageHeader
          title="Review"
          description="Cross-project PR and CI review for connected GitHub repos."
          icon={<SearchCheck className="h-6 w-6 text-muted-foreground" />}
        />
        <Card>
          <CardContent className="pt-8 text-center">
            <Github className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
            <p className="text-sm font-medium">GitHub is not connected</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Connect GitHub from any project's Git view to unlock workspace review.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-8">
      <PageHeader
        title="Review"
        description="Track open PRs, failing checks, and issue pressure across connected repos."
        icon={<SearchCheck className="h-6 w-6 text-muted-foreground" />}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Repos</p>
            <p className="mt-2 text-2xl font-semibold">{reviewProjects.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">Projects with working GitHub integration</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Open PRs</p>
            <p className="mt-2 text-2xl font-semibold">{openPrs.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">Open pull requests across those repos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Needs Review</p>
            <p className="mt-2 text-2xl font-semibold">{reviewNeededPrs.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">PRs with review pressure or unresolved discussion</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Failing Checks</p>
            <p className="mt-2 text-2xl font-semibold">{failingChecks.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">Current CI failures on tracked branches</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <GitPullRequest className="h-4 w-4 text-muted-foreground" />
              PRs Needing Attention
            </CardTitle>
            <CardDescription>Review-required or discussion-heavy pull requests.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading pull requests…</p>
            ) : reviewNeededPrs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No PRs look review-blocked right now.</p>
            ) : (
              reviewNeededPrs.slice(0, 8).map(({ project, pr }) => (
                <ReviewRow
                  key={`${project.id}-pr-${pr.number}`}
                  title={`${project.name} · #${pr.number} ${pr.title}`}
                  detail={`${pr.head_ref} -> ${pr.base_ref} · ${pr.user_login} · updated ${relativeTime(pr.updated_at)}`}
                  badge={
                    pr.review_decision ? (
                      <Badge variant="outline">{pr.review_decision.toLowerCase().replace(/_/g, ' ')}</Badge>
                    ) : (
                      <Badge variant="outline">{pr.comments + pr.review_comments} comments</Badge>
                    )
                  }
                  onOpen={() => void navigate(`/projects/${project.id}?view=git`)}
                  onOpenExternal={() => openUrl(pr.html_url)}
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CircleAlert className="h-4 w-4 text-red-500" />
              Failing Checks
            </CardTitle>
            <CardDescription>The CI failures most likely to block merges.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading checks…</p>
            ) : failingChecks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No failing checks on tracked branches.</p>
            ) : (
              failingChecks.slice(0, 8).map(({ project, check }) => (
                <ReviewRow
                  key={`${project.id}-check-${check.id}`}
                  title={`${project.name} · ${check.name}`}
                  detail={`${check.app_name} · ${check.conclusion ?? check.status}`}
                  badge={<Badge variant="destructive">{check.conclusion ?? check.status}</Badge>}
                  onOpen={() => void navigate(`/projects/${project.id}?view=git`)}
                  onOpenExternal={() => openUrl(check.html_url)}
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquareWarning className="h-4 w-4 text-muted-foreground" />
              Open Issues
            </CardTitle>
            <CardDescription>A quick sample of issue pressure across the workspace.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading issues…</p>
            ) : openIssues.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open issues returned from connected repos.</p>
            ) : (
              openIssues.slice(0, 8).map(({ project, issue }) => (
                <ReviewRow
                  key={`${project.id}-issue-${issue.number}`}
                  title={`${project.name} · #${issue.number} ${issue.title}`}
                  detail={`${issue.user_login} · opened ${relativeTime(issue.created_at)}${issue.comments ? ` · ${issue.comments} comments` : ''}`}
                  badge={<Badge variant="outline">{issue.state}</Badge>}
                  onOpen={() => void navigate(`/projects/${project.id}?view=git`)}
                  onOpenExternal={() => openUrl(issue.html_url)}
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Review Coverage
            </CardTitle>
            <CardDescription>Projects currently included in GitHub review operations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {reviewProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">No GitHub repos detected in active projects.</p>
            ) : (
              reviewProjects.slice(0, 8).map(({ project, repo }) => (
                <ReviewRow
                  key={project.id}
                  title={project.name}
                  detail={`${repo?.full_name ?? 'Unknown repo'} · default branch ${repo?.default_branch ?? 'n/a'}`}
                  badge={<Badge variant="outline">{repo?.visibility ?? 'repo'}</Badge>}
                  onOpen={() => void navigate(`/projects/${project.id}?view=git`)}
                  onOpenExternal={() => (repo?.html_url ? openUrl(repo.html_url) : Promise.resolve())}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
