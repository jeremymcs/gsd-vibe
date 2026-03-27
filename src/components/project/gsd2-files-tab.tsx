// GSD Vibe - GSD-2 Files Tab
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { useState } from 'react';
import { Folder, FolderDot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FileBrowser } from './file-browser';

interface Gsd2FilesTabProps {
  projectId: string;
  projectPath: string;
}

export function Gsd2FilesTab({ projectId, projectPath }: Gsd2FilesTabProps) {
  const [root, setRoot] = useState<'project' | 'gsd'>('project');
  const activePath = root === 'gsd' ? `${projectPath}/.gsd` : projectPath;

  return (
    <div className="flex h-full flex-col">
      {/* Root toggle */}
      <div className="flex items-center gap-1 border-b border-border/50 px-3 py-1.5 shrink-0">
        <Button
          variant={root === 'project' ? 'default' : 'ghost'}
          size="sm"
          className="h-7 text-xs gap-1.5"
          onClick={() => setRoot('project')}
        >
          <Folder className="h-3.5 w-3.5" />
          Project Root
        </Button>
        <Button
          variant={root === 'gsd' ? 'default' : 'ghost'}
          size="sm"
          className="h-7 text-xs gap-1.5"
          onClick={() => setRoot('gsd')}
        >
          <FolderDot className="h-3.5 w-3.5" />
          .gsd/
        </Button>
      </div>

      {/* Reuse the existing file browser with the chosen root path */}
      <div className="flex-1 min-h-0">
        <FileBrowser
          key={activePath}
          projectId={projectId}
          projectPath={activePath}
        />
      </div>
    </div>
  );
}
