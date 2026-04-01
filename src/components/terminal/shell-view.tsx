// VCCA - Shell View (wraps TerminalTabs with consistent font size controls)
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { cn } from '@/lib/utils';
import { TerminalTabs } from '@/components/terminal';

interface ShellViewProps {
  projectId: string;
  projectPath: string;
  className?: string;
}

export function ShellView({ projectId, projectPath, className }: ShellViewProps) {
  return (
    <div className={cn('flex h-full flex-col', className)}>
      <TerminalTabs
        projectId={projectId}
        workingDirectory={projectPath}
        className="flex-1 min-h-0"
      />
    </div>
  );
}
