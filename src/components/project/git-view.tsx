// GSD Vibe - Git Full-Screen View
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
//
// @ts-nocheck — pre-existing: data layer hooks not yet wired
// Full-height split view: Git panel (local ops + history) | GitHub panel (PRs, issues, CI).

import { GitStatusPanel } from './git-status-widget';
import { GitHubPanel } from './github-panel';

interface GitViewProps {
  projectId: string;
  projectPath: string;
}

export function GitView({ projectId, projectPath }: GitViewProps) {
  return (
    <div className="h-full flex overflow-hidden">
      {/* Left: full local git panel — fills height, scrolls internally */}
      <div className="w-[55%] min-w-0 flex flex-col border-r border-border/50 overflow-hidden">
        <GitStatusPanel projectPath={projectPath} />
      </div>

      {/* Right: GitHub integration */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <GitHubPanel projectPath={projectPath} projectId={projectId} />
      </div>
    </div>
  );
}
