// GSD Vibe - Project Page
// Sidebar-driven views — no more nested tabs
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useParams, Link, useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ProjectHeader,
  UnifiedLandingView,
  FileBrowser,
  GsdPlansTab,
  GsdTodosTab,
  GsdDebugTab,
  GsdMilestonesTab,
  GsdVerificationTab,
  GsdContextTab,
  GsdValidationPlanTab,
  GsdUatTab,
  DependenciesTab,
  KnowledgeTab,
  EnvVarsTab,
  Gsd2HealthTab,
  Gsd2WorktreesTab,
  Gsd2HeadlessTab,
  Gsd2ChatTab,
  Gsd2StatusBar,
  Gsd2VisualizerTab,
  Gsd2MilestonesTab,
  Gsd2SlicesTab,
  Gsd2TasksTab,
  DoctorPanel,
  ForensicsPanel,
  SkillHealthPanel,
  KnowledgeCapturesPanel,
  Gsd2ReportsTab,
  Gsd2DashboardView,
  // Tab groups
  Gsd2ProgressGroup,
  Gsd2PlanningGroup,
  Gsd2MetricsGroup,
  Gsd2CommandsGroup,
  Gsd2DiagnosticsGroup,
} from "@/components/project";
import { ShellView } from "@/components/terminal";
import { watchProjectFiles } from "@/lib/tauri";
import { useGsdFileWatcher } from "@/hooks/use-gsd-file-watcher";
import { useHeadlessSession } from "@/hooks/use-headless-session";
import {
  useProject,
  useGsdSync,
  useDeleteProject,
} from "@/lib/queries";
import { truncatePath } from "@/lib/utils";
import { resolveViewFromTab } from "@/lib/project-views";
import { Skeleton } from "@/components/ui/skeleton";

export function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: project, isLoading: projectLoading } = useProject(id!);
  const syncProject = useGsdSync();
  const deleteProject = useDeleteProject();

  const hasPlanning = project?.tech_stack?.has_planning ?? false;
  const isGsd2 = project?.gsd_version === 'gsd2';
  const isGsd1 = hasPlanning && !isGsd2;
  const showGsdTab = isGsd2 || isGsd1;

  // Resolve active view from ?view= or legacy ?tab= param
  const viewCtx = useMemo(() => ({ isGsd2, isGsd1 }), [isGsd2, isGsd1]);
  const rawView = searchParams.get('view') ?? searchParams.get('tab') ?? null;
  const activeView = useMemo(
    () => resolveViewFromTab(rawView, viewCtx),
    [rawView, viewCtx]
  );

  // Sync URL: if no ?view= param, set it so the URL is shareable
  useEffect(() => {
    if (!searchParams.get('view') && !searchParams.get('tab') && id) {
      void navigate(`/projects/${id}?view=${activeView}`, { replace: true });
    }
  }, [id, activeView, searchParams, navigate]);

  // Stable ref to avoid listener leaks in useGsdFileWatcher
  const syncProjectRef = useRef(syncProject);
  syncProjectRef.current = syncProject;

  const isGsd1Ref = useRef(isGsd1);
  isGsd1Ref.current = isGsd1;

  const handleGsdSync = useCallback(() => {
    if (id && isGsd1Ref.current && !syncProjectRef.current.isPending) {
      syncProjectRef.current.mutate(id);
    }
  }, [id]);

  // Real-time GSD file watcher
  useGsdFileWatcher(id!, project?.path ?? '', showGsdTab, handleGsdSync);

  // Headless session state — lifted to page level so logs survive view navigation
  const headlessSession = useHeadlessSession();

  // Start file watcher for GSD projects on mount
  useEffect(() => {
    if (project?.path && showGsdTab) {
      void watchProjectFiles(project.path);
    }
  }, [project?.path, showGsdTab]);

  // Auto-sync GSD data on project load (GSD-1 only)
  const syncAttemptedRef = useRef<string | null>(null);
  useEffect(() => {
    if (
      project &&
      isGsd1 &&
      !syncProject.isPending &&
      syncAttemptedRef.current !== project.id
    ) {
      syncAttemptedRef.current = project.id;
      syncProject.mutate(project.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id, project?.tech_stack]);

  const handleDeleteProject = () => {
    deleteProject.mutate(project!.id, {
      onSuccess: () => {
        void navigate("/");
      },
    });
  };

  if (projectLoading) {
    return (
      <div className="p-8">
        <div className="space-y-3">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-10 w-full mt-4" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8">
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">Project not found</p>
          <Button asChild variant="outline">
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const projectId = project.id;
  const projectPath = project.path;

  return (
    <div className="h-full flex flex-col">
      <ProjectHeader
        project={project}
        onDelete={() => setShowDeleteDialog(true)}
      />

      {/* Active view content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {/* Shell is always mounted (CSS hidden) to preserve xterm.js sessions */}
        <div className={activeView === 'shell' ? 'h-full flex flex-col' : 'hidden'}>
          <ShellView
            projectId={projectId}
            projectPath={projectPath}
            className="flex-1 min-h-0"
          />
        </div>

        {/* All other views render conditionally */}
        {activeView !== 'shell' && (() => {
          // Tab-group views and full-height views need h-full with no padding/scroll wrapper
          const isFullHeight = activeView.startsWith('gsd2-group-') || activeView === 'gsd2-chat';
          return isFullHeight ? (
            <div key={activeView} className="h-full overflow-hidden animate-fade-in">
              <ViewRenderer
                activeView={activeView}
                project={project}
                isGsd2={isGsd2}
                isGsd1={isGsd1}
                headlessSession={headlessSession}
                onOpenShell={() => void navigate(`/projects/${projectId}?view=shell`)}
              />
            </div>
          ) : (
            <div key={activeView} className="h-full overflow-y-auto p-6 animate-fade-in">
              <ViewRenderer
                activeView={activeView}
                project={project}
                isGsd2={isGsd2}
                isGsd1={isGsd1}
                headlessSession={headlessSession}
                onOpenShell={() => void navigate(`/projects/${projectId}?view=shell`)}
              />
            </div>
          );
        })()}
      </div>

      {/* GSD-2 status bar — persistent at bottom of project layout */}
      {isGsd2 && <Gsd2StatusBar projectId={projectId} />}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove <span className="font-semibold">{project.name}</span> from GSD Vibe.
              <br /><br />
              <span className="text-foreground">Your project files will NOT be deleted.</span> The project folder at{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">{truncatePath(projectPath, 50)}</code>{" "}
              will remain untouched. You can re-import this project at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteProject.isPending ? "Removing..." : "Remove Project"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** Renders the active view component based on the view ID */
function ViewRenderer({
  activeView,
  project,
  isGsd2: _isGsd2,
  isGsd1: _isGsd1,
  headlessSession,
  onOpenShell,
}: {
  activeView: string;
  project: NonNullable<ReturnType<typeof useProject>['data']>;
  isGsd2: boolean;
  isGsd1: boolean;
  headlessSession: ReturnType<typeof useHeadlessSession>;
  onOpenShell: () => void;
}) {
  const projectId = project.id;
  const projectPath = project.path;

  switch (activeView) {
    // Core views
    case 'overview':
      return <UnifiedLandingView projectId={projectId} projectPath={projectPath} onOpenShell={onOpenShell} />;
    case 'files':
      return <FileBrowser projectId={projectId} projectPath={projectPath} />;
    case 'dependencies':
      return <DependenciesTab projectId={projectId} projectPath={projectPath} />;
    case 'knowledge':
      return <KnowledgeTab projectId={projectId} />;
    case 'envvars':
      return <EnvVarsTab projectId={projectId} projectPath={projectPath} />;

    // GSD-2 views
    case 'gsd2-dashboard':
      return <Gsd2DashboardView projectId={projectId} projectPath={projectPath} />;
    case 'gsd2-health':
      return <Gsd2HealthTab projectId={projectId} projectPath={projectPath} />;
    case 'gsd2-headless':
      return <Gsd2HeadlessTab projectId={projectId} projectPath={projectPath} session={headlessSession} />;
    case 'gsd2-chat':
      return <Gsd2ChatTab projectId={projectId} projectPath={projectPath} session={headlessSession} />;
    case 'gsd2-worktrees':
      return <Gsd2WorktreesTab projectId={projectId} projectPath={projectPath} />;
    case 'gsd2-visualizer':
      return <Gsd2VisualizerTab projectId={projectId} projectPath={projectPath} />;
    case 'gsd2-milestones':
      return <Gsd2MilestonesTab projectId={projectId} projectPath={projectPath} />;
    case 'gsd2-slices':
      return <Gsd2SlicesTab projectId={projectId} projectPath={projectPath} />;
    case 'gsd2-tasks':
      return <Gsd2TasksTab projectId={projectId} projectPath={projectPath} />;
    case 'gsd2-reports':
      return <Gsd2ReportsTab projectId={projectId} projectPath={projectPath} />;
    case 'gsd2-doctor':
      return <DoctorPanel projectId={projectId} projectPath={projectPath} />;
    case 'gsd2-forensics':
      return <ForensicsPanel projectId={projectId} projectPath={projectPath} />;
    case 'gsd2-skill-health':
      return <SkillHealthPanel projectId={projectId} projectPath={projectPath} />;
    case 'gsd2-knowledge-captures':
      return <KnowledgeCapturesPanel projectId={projectId} projectPath={projectPath} />;

    // GSD-2 tab groups
    case 'gsd2-group-progress':
      return <Gsd2ProgressGroup projectId={projectId} projectPath={projectPath} />;
    case 'gsd2-group-planning':
      return <Gsd2PlanningGroup projectId={projectId} projectPath={projectPath} />;
    case 'gsd2-group-metrics':
      return <Gsd2MetricsGroup projectId={projectId} projectPath={projectPath} />;
    case 'gsd2-group-commands':
      return <Gsd2CommandsGroup projectId={projectId} projectPath={projectPath} />;
    case 'gsd2-group-diagnostics':
      return <Gsd2DiagnosticsGroup projectId={projectId} projectPath={projectPath} />;

    // GSD-1 views
    case 'gsd-plans':
      return <GsdPlansTab projectId={projectId} />;
    case 'gsd-context':
      return <GsdContextTab projectId={projectId} />;
    case 'gsd-todos':
      return <GsdTodosTab projectId={projectId} />;
    case 'gsd-validation':
      return <GsdValidationPlanTab projectId={projectId} />;
    case 'gsd-uat':
      return <GsdUatTab projectId={projectId} />;
    case 'gsd-verification':
      return <GsdVerificationTab projectId={projectId} />;
    case 'gsd-milestones':
      return <GsdMilestonesTab projectId={projectId} />;
    case 'gsd-debug':
      return <GsdDebugTab projectId={projectId} />;

    default:
      return <UnifiedLandingView projectId={projectId} projectPath={projectPath} onOpenShell={onOpenShell} />;
  }
}
