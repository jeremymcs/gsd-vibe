// VCCA - Workspace Inbox Page
// Cross-project triage surface for blockers, notifications, active runs, and stale work
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { open as openExternal } from '@tauri-apps/plugin-shell';
import {
  Inbox,
  AlertTriangle,
  Bell,
  Play,
  Clock3,
  ArrowRight,
  FolderOpen,
  Activity,
  CheckSquare2,
  ShieldAlert,
  ExternalLink,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/page-header';
import { queryKeys } from '@/lib/query-keys';
import { useAllGsdTodos, useNotifications, useProjectsWithStats, useUnreadNotificationCount } from '@/lib/queries';
import { getTopVulnerability } from '@/lib/dependency-utils';
import type { ActivityEntry, DependencyStatus, Gsd2Health, GsdTodoWithProject, Notification, ProjectWithStats } from '@/lib/tauri';
import * as api from '@/lib/tauri';

function relativeTime(isoDate: string | null | undefined): string {
  if (!isoDate) return 'No recent activity';

  const target = new Date(isoDate);
  const diffMs = target.getTime() - Date.now();
  const diffAbs = Math.abs(diffMs);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffAbs < minute) return 'just now';
  if (diffAbs < hour) return `${Math.round(diffMs / minute)}m`;
  if (diffAbs < day) return `${Math.round(diffMs / hour)}h`;
  return `${Math.round(diffMs / day)}d`;
}

function formatLastSeen(isoDate: string | null | undefined): string {
  if (!isoDate) return 'Never active';

  const date = new Date(isoDate);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function isStaleProject(project: ProjectWithStats): boolean {
  if (project.status === 'archived' || !project.last_activity_at) return false;
  const ageMs = Date.now() - new Date(project.last_activity_at).getTime();
  return ageMs > 3 * 24 * 60 * 60 * 1000;
}

function TriageCard({
  title,
  description,
  icon,
  value,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/30 p-2 text-muted-foreground">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyList({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border/60 px-4 py-6 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{body}</p>
    </div>
  );
}

function BlockerRow({
  todo,
  onOpenProject,
}: {
  todo: GsdTodoWithProject;
  onOpenProject: (projectId: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpenProject(todo.project_id)}
      className="flex w-full items-start gap-3 rounded-lg border border-border/50 bg-card px-4 py-3 text-left transition-colors hover:bg-muted/30"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{todo.title}</span>
          <Badge variant="destructive" className="h-4 px-1.5 py-0 text-[10px]">
            blocker
          </Badge>
          {todo.phase && (
            <Badge variant="outline" className="h-4 px-1.5 py-0 text-[10px]">
              {todo.phase}
            </Badge>
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{todo.project_name}</p>
        {todo.description && (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{todo.description}</p>
        )}
      </div>
      <ArrowRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
    </button>
  );
}

function NotificationRow({
  notification,
  project,
  onOpen,
}: {
  notification: Notification;
  project?: ProjectWithStats;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-start gap-3 rounded-lg border border-border/50 bg-card px-4 py-3 text-left transition-colors hover:bg-muted/30"
    >
      <Bell className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{notification.title}</span>
          {!notification.read && (
            <Badge variant="secondary" className="h-4 px-1.5 py-0 text-[10px]">
              unread
            </Badge>
          )}
          <Badge variant="outline" className="h-4 px-1.5 py-0 text-[10px]">
            {notification.notification_type}
          </Badge>
        </div>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{notification.message}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {project?.name ?? 'Workspace'} · {formatLastSeen(notification.created_at)}
        </p>
      </div>
      <ArrowRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
    </button>
  );
}

function ActiveRunRow({
  project,
  health,
  onOpenProject,
}: {
  project: ProjectWithStats;
  health: Gsd2Health;
  onOpenProject: (projectId: string) => void;
}) {
  const unitLabel =
    health.active_task_title ??
    health.active_slice_title ??
    health.active_milestone_title ??
    health.next_action ??
    'Run in progress';

  return (
    <button
      type="button"
      onClick={() => onOpenProject(project.id)}
      className="flex w-full items-start gap-3 rounded-lg border border-border/50 bg-card px-4 py-3 text-left transition-colors hover:bg-muted/30"
    >
      <Play className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{project.name}</span>
          <Badge className="h-4 bg-emerald-500/15 px-1.5 py-0 text-[10px] text-emerald-600 hover:bg-emerald-500/15 dark:text-emerald-400">
            {health.phase ?? 'running'}
          </Badge>
          {health.blocker && (
            <Badge variant="destructive" className="h-4 px-1.5 py-0 text-[10px]">
              blocked
            </Badge>
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{unitLabel}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {health.tasks_done}/{health.tasks_total} tasks · ${health.budget_spent.toFixed(2)} spent
        </p>
      </div>
      <ArrowRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
    </button>
  );
}

function StaleProjectRow({
  project,
  onOpenProject,
}: {
  project: ProjectWithStats;
  onOpenProject: (projectId: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpenProject(project.id)}
      className="flex w-full items-center gap-3 rounded-lg border border-border/50 bg-card px-4 py-3 text-left transition-colors hover:bg-muted/30"
    >
      <Clock3 className="h-4 w-4 flex-shrink-0 text-orange-500" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{project.name}</p>
        <p className="text-xs text-muted-foreground">Last active {formatLastSeen(project.last_activity_at)}</p>
      </div>
      <Badge variant="outline" className="hidden sm:inline-flex">
        {project.gsd_version ?? 'bare'}
      </Badge>
    </button>
  );
}

function ActivityRow({
  project,
  entry,
  onOpenProject,
}: {
  project: ProjectWithStats;
  entry?: ActivityEntry;
  onOpenProject: (projectId: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpenProject(project.id)}
      className="flex w-full items-start gap-3 rounded-lg border border-border/50 bg-card px-4 py-3 text-left transition-colors hover:bg-muted/30"
    >
      <Activity className="mt-0.5 h-4 w-4 flex-shrink-0 text-sky-500" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{project.name}</span>
          <span className="text-xs text-muted-foreground">{relativeTime(entry?.created_at ?? project.last_activity_at)} ago</span>
        </div>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
          {entry?.message ?? 'Recent activity detected for this project.'}
        </p>
      </div>
    </button>
  );
}

function SecurityFindingRow({
  project,
  status,
  onOpenProject,
}: {
  project: ProjectWithStats;
  status: DependencyStatus;
  onOpenProject: (projectId: string) => void;
}) {
  const topVulnerability = getTopVulnerability(status.details);

  const handleOpenAdvisory = (e: React.MouseEvent, url?: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!url) return;
    void openExternal(url);
  };

  return (
    <div className="flex items-start gap-3 rounded-lg border border-border/50 bg-card px-4 py-3 transition-colors hover:bg-muted/30">
      <button
        type="button"
        onClick={() => onOpenProject(project.id)}
        className="flex min-w-0 flex-1 items-start gap-3 text-left"
      >
        <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-status-error" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{project.name}</span>
            {status.vulnerable_count > 0 && (
              <Badge variant="destructive" className="h-4 px-1.5 py-0 text-[10px]">
                {status.vulnerable_count} vuln{status.vulnerable_count === 1 ? '' : 's'}
              </Badge>
            )}
            {status.outdated_count > 0 && (
              <Badge variant="outline" className="h-4 px-1.5 py-0 text-[10px]">
                {status.outdated_count} outdated
              </Badge>
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {topVulnerability
              ? `${topVulnerability.packageName}: ${topVulnerability.vulnerability.title ?? topVulnerability.vulnerability.severity}`
              : `Dependency scan found ${status.outdated_count + status.vulnerable_count} issue${status.outdated_count + status.vulnerable_count === 1 ? '' : 's'}.`}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>Scanned {formatLastSeen(status.checked_at)}</span>
            <span className="capitalize">{status.package_manager}</span>
          </div>
        </div>
      </button>
      <div className="mt-0.5 flex flex-shrink-0 items-center gap-2">
        {topVulnerability?.vulnerability.url ? (
          <button
            type="button"
            onClick={(e) => handleOpenAdvisory(e, topVulnerability.vulnerability.url)}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Advisory
            <ExternalLink className="h-3 w-3" />
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onOpenProject(project.id)}
          className="text-muted-foreground"
          aria-label={`Open dependency findings for ${project.name}`}
        >
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function InboxPage() {
  const navigate = useNavigate();
  const { data: projects, isLoading: projectsLoading } = useProjectsWithStats();
  const { data: todos, isLoading: todosLoading } = useAllGsdTodos();
  const { data: notifications, isLoading: notificationsLoading } = useNotifications(25);
  const { data: unreadCount } = useUnreadNotificationCount();

  const activeProjects = useMemo(
    () => (projects ?? []).filter((project) => project.status !== 'archived'),
    [projects]
  );

  const gsd2Projects = useMemo(
    () => activeProjects.filter((project) => project.gsd_version === 'gsd2'),
    [activeProjects]
  );

  const activeRunsQueries = useQueries({
    queries: gsd2Projects.map((project) => ({
      queryKey: queryKeys.gsd2Health(project.id),
      queryFn: () => api.gsd2GetHealth(project.id),
      staleTime: 5_000,
      refetchInterval: 10_000,
    })),
  });

  const dependencyStatusQueries = useQueries({
    queries: activeProjects.map((project) => ({
      queryKey: queryKeys.dependencyStatus(project.id),
      queryFn: () => api.getDependencyStatus(project.id, project.path),
      staleTime: 60 * 60 * 1000,
      refetchInterval: 15 * 60 * 1000,
      enabled: Boolean(project.id && project.path),
    })),
  });

  const recentProjects = useMemo(
    () =>
      [...activeProjects]
        .sort((a, b) => {
          const aTime = a.last_activity_at ? new Date(a.last_activity_at).getTime() : 0;
          const bTime = b.last_activity_at ? new Date(b.last_activity_at).getTime() : 0;
          return bTime - aTime;
        })
        .slice(0, 6),
    [activeProjects]
  );

  const recentActivityQueries = useQueries({
    queries: recentProjects.map((project) => ({
      queryKey: queryKeys.activity(project.id, 3),
      queryFn: () => api.getActivityLog(project.id, 3),
      staleTime: 30_000,
      refetchInterval: 60_000,
    })),
  });

  const projectMap = useMemo(
    () => new Map((projects ?? []).map((project) => [project.id, project])),
    [projects]
  );

  const blockerTodos = useMemo(
    () =>
      (todos ?? [])
        .filter((todo) => todo.is_blocker && todo.status !== 'done')
        .sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''))
        .slice(0, 8),
    [todos]
  );

  const unreadNotifications = useMemo(
    () => (notifications ?? []).filter((notification) => !notification.read).slice(0, 8),
    [notifications]
  );

  const activeRuns = useMemo(
    () =>
      gsd2Projects
        .map((project, index) => ({
          project,
          health: activeRunsQueries[index]?.data,
        }))
        .filter(
          (
            item
          ): item is {
            project: ProjectWithStats;
            health: Gsd2Health;
          } => Boolean(item.health && (item.health.phase === 'running' || item.health.phase === 'executing' || item.health.active_task_id || item.health.active_slice_id))
        )
        .sort((a, b) => b.health.budget_spent - a.health.budget_spent)
        .slice(0, 6),
    [gsd2Projects, activeRunsQueries]
  );

  const securityFindings = useMemo(
    () =>
      activeProjects
        .map((project, index) => ({
          project,
          status: dependencyStatusQueries[index]?.data,
        }))
        .filter(
          (
            item
          ): item is {
            project: ProjectWithStats;
            status: DependencyStatus;
          } =>
            Boolean(
              item.status &&
                (item.status.vulnerable_count > 0 || item.status.outdated_count > 0)
            )
        )
        .sort((a, b) => {
          const vulnDelta = b.status.vulnerable_count - a.status.vulnerable_count;
          if (vulnDelta !== 0) return vulnDelta;
          return b.status.outdated_count - a.status.outdated_count;
        })
        .slice(0, 8),
    [activeProjects, dependencyStatusQueries]
  );

  const staleProjects = useMemo(
    () =>
      activeProjects
        .filter(isStaleProject)
        .sort((a, b) => {
          const aTime = a.last_activity_at ? new Date(a.last_activity_at).getTime() : 0;
          const bTime = b.last_activity_at ? new Date(b.last_activity_at).getTime() : 0;
          return aTime - bTime;
        })
        .slice(0, 6),
    [activeProjects]
  );

  const recentActivity = useMemo(
    () =>
      recentProjects
        .map((project, index) => ({
          project,
          entry: recentActivityQueries[index]?.data?.[0],
        }))
        .filter((item) => item.entry || item.project.last_activity_at)
        .slice(0, 6),
    [recentProjects, recentActivityQueries]
  );

  const loading = projectsLoading || todosLoading || notificationsLoading;

  const openProject = (projectId: string) => {
    void navigate(`/projects/${projectId}`);
  };

  return (
    <div className="h-full overflow-auto p-8">
      <PageHeader
        title="Inbox"
        description="Triage the workspace: blockers, unread alerts, active runs, and stale projects."
        icon={<Inbox className="h-6 w-6 text-muted-foreground" />}
        actions={
          <Button variant="outline" size="sm" onClick={() => void navigate('/notifications')}>
            <Bell className="h-4 w-4" />
            Notifications
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <TriageCard
          title="Blockers"
          description="Open blocking todos across all projects"
          icon={<AlertTriangle className="h-4 w-4" />}
          value={blockerTodos.length}
        />
        <TriageCard
          title="Unread"
          description="Notifications that still need attention"
          icon={<Bell className="h-4 w-4" />}
          value={unreadCount ?? unreadNotifications.length}
        />
        <TriageCard
          title="Active Runs"
          description="GSD-2 projects currently executing"
          icon={<Play className="h-4 w-4" />}
          value={activeRuns.length}
        />
        <TriageCard
          title="Stale"
          description="Active projects idle for more than 3 days"
          icon={<Clock3 className="h-4 w-4" />}
          value={staleProjects.length}
        />
        <TriageCard
          title="Security"
          description="Projects with dependency findings"
          icon={<ShieldAlert className="h-4 w-4" />}
          value={securityFindings.length}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Blockers
            </CardTitle>
            <CardDescription>The fastest way to unblock the workspace.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading blockers…</p>
            ) : blockerTodos.length === 0 ? (
              <EmptyList title="No active blockers" body="Nothing is currently marked as a blocker." />
            ) : (
              blockerTodos.map((todo) => (
                <BlockerRow key={`${todo.project_id}:${todo.id}`} todo={todo} onOpenProject={openProject} />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4 text-amber-500" />
              Unread Notifications
            </CardTitle>
            <CardDescription>Recent alerts that have not been reviewed yet.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading notifications…</p>
            ) : unreadNotifications.length === 0 ? (
              <EmptyList title="Inbox is quiet" body="No unread notifications right now." />
            ) : (
              unreadNotifications.map((notification) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  project={notification.project_id ? projectMap.get(notification.project_id) : undefined}
                  onOpen={() =>
                    notification.project_id
                      ? openProject(notification.project_id)
                      : void navigate('/notifications')
                  }
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Play className="h-4 w-4 text-emerald-500" />
              Active Runs
            </CardTitle>
            <CardDescription>Projects that look actively in progress right now.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {projectsLoading ? (
              <p className="text-sm text-muted-foreground">Loading active runs…</p>
            ) : activeRuns.length === 0 ? (
              <EmptyList title="Nothing is running" body="No GSD-2 projects appear to be executing right now." />
            ) : (
              activeRuns.map(({ project, health }) => (
                <ActiveRunRow key={project.id} project={project} health={health} onOpenProject={openProject} />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="h-4 w-4 text-status-error" />
              Security Findings
            </CardTitle>
            <CardDescription>Projects with dependency vulnerabilities or stale packages.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {projectsLoading ? (
              <p className="text-sm text-muted-foreground">Loading security findings…</p>
            ) : securityFindings.length === 0 ? (
              <EmptyList title="No active findings" body="No current dependency vulnerabilities or outdated packages were surfaced." />
            ) : (
              securityFindings.map(({ project, status }) => (
                <SecurityFindingRow key={project.id} project={project} status={status} onOpenProject={(projectId) => void navigate(`/projects/${projectId}?view=dependencies`)} />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock3 className="h-4 w-4 text-orange-500" />
              Stale Projects
            </CardTitle>
            <CardDescription>Active projects that may need a push or cleanup.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {projectsLoading ? (
              <p className="text-sm text-muted-foreground">Loading stale projects…</p>
            ) : staleProjects.length === 0 ? (
              <EmptyList title="No stale projects" body="All active projects were touched within the last 3 days." />
            ) : (
              staleProjects.map((project) => (
                <StaleProjectRow key={project.id} project={project} onOpenProject={openProject} />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-sky-500" />
              Recent Workspace Activity
            </CardTitle>
            <CardDescription>Latest signal from your most recently active projects.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {projectsLoading ? (
              <p className="text-sm text-muted-foreground">Loading activity…</p>
            ) : recentActivity.length === 0 ? (
              <EmptyList title="No recent activity" body="Open a project or run a workflow to populate workspace activity." />
            ) : (
              recentActivity.map(({ project, entry }) => (
                <ActivityRow key={project.id} project={project} entry={entry} onOpenProject={openProject} />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
              Queue Summary
            </CardTitle>
            <CardDescription>Quick links back into the main operating surfaces.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <button
              type="button"
              onClick={() => void navigate('/todos')}
              className="flex w-full items-center gap-3 rounded-lg border border-border/50 bg-card px-4 py-3 text-left transition-colors hover:bg-muted/30"
            >
              <CheckSquare2 className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Global Todos</p>
                <p className="text-xs text-muted-foreground">{(todos ?? []).filter((todo) => todo.status !== 'done').length} open items across the workspace</p>
              </div>
              <ArrowRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            </button>

            <button
              type="button"
              onClick={() => void navigate('/')}
              className="flex w-full items-center gap-3 rounded-lg border border-border/50 bg-card px-4 py-3 text-left transition-colors hover:bg-muted/30"
            >
              <FolderOpen className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Projects Dashboard</p>
                <p className="text-xs text-muted-foreground">{activeProjects.length} active projects ready for review</p>
              </div>
              <ArrowRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            </button>

            <button
              type="button"
              onClick={() => void navigate('/notifications')}
              className="flex w-full items-center gap-3 rounded-lg border border-border/50 bg-card px-4 py-3 text-left transition-colors hover:bg-muted/30"
            >
              <Bell className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Notification Center</p>
                <p className="text-xs text-muted-foreground">{notifications?.length ?? 0} recent alerts in the system log</p>
              </div>
              <ArrowRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
