// GSD VibeFlow - Unified Landing View
// Adaptive landing that shows GSD-2 Dashboard or GSD-1 Overview based on project type
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { useProject } from '@/lib/queries';
import { Loader2 } from 'lucide-react';
import { ProjectOverviewTab } from './project-overview-tab';
import { Gsd2DashboardView } from './gsd2-dashboard-view';

interface UnifiedLandingViewProps {
  projectId: string;
  projectPath: string;
  onOpenShell: () => void;
}

export function UnifiedLandingView({ projectId, projectPath, onOpenShell }: UnifiedLandingViewProps) {
  const { data: project, isLoading } = useProject(projectId);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <p className="text-sm text-muted-foreground">Could not load project</p>
      </div>
    );
  }

  const isGsd2 = project.gsd_version === 'gsd2';

  return isGsd2 ? (
    <Gsd2DashboardView projectId={projectId} projectPath={projectPath} />
  ) : (
    <ProjectOverviewTab project={project} onOpenShell={onOpenShell} />
  );
}
