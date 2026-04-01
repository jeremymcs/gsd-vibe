// VCCA - GSD-2 Dual Terminal Tab
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { useRef } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { InteractiveTerminal, type InteractiveTerminalRef } from '@/components/terminal/interactive-terminal';

interface Gsd2DualTerminalTabProps {
  projectId: string;
  projectPath: string;
}

export function Gsd2DualTerminalTab({ projectId, projectPath }: Gsd2DualTerminalTabProps) {
  const leftRef = useRef<InteractiveTerminalRef>(null);
  const rightRef = useRef<InteractiveTerminalRef>(null);

  return (
    <div className="h-full">
      <Group orientation="horizontal" className="h-full">
        <Panel defaultSize={50} minSize={20}>
          <InteractiveTerminal
            ref={leftRef}
            persistKey={`${projectId}:dual-left`}
            workingDirectory={projectPath}
          />
        </Panel>
        <Separator className="w-1 bg-border/50 hover:bg-border cursor-col-resize transition-colors" />
        <Panel defaultSize={50} minSize={20}>
          <InteractiveTerminal
            ref={rightRef}
            persistKey={`${projectId}:dual-right`}
            workingDirectory={projectPath}
          />
        </Panel>
      </Group>
    </div>
  );
}
