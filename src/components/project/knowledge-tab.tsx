// GSD Vibe - Knowledge Tab Component
// Knowledge viewer with Research sub-tab for .planning/research/ files
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { useState } from 'react';
import { useProject, useKnowledgeFiles, useKnowledgeFileContent } from '@/lib/queries';
import { KnowledgeViewer } from '@/components/knowledge';
import { SplitDocBrowser } from './split-doc-browser';
import { BookOpen, FlaskConical, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KnowledgeTabProps {
  projectId: string;
}

type SubTab = 'knowledge' | 'research';

export function KnowledgeTab({ projectId }: KnowledgeTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('knowledge');
  const { data: project, isLoading } = useProject(projectId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <BookOpen className="h-8 w-8 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Could not load project knowledge</p>
      </div>
    );
  }

  const hasPlanning = project.tech_stack?.has_planning ?? false;

  return (
    <div className="flex flex-col h-full min-h-0 space-y-3">
      {/* Sub-tab bar — only shown for GSD projects with .planning/ */}
      {hasPlanning && (
        <div className="flex items-center gap-1 border-b pb-2">
          <SubTabButton
            active={activeSubTab === 'knowledge'}
            onClick={() => setActiveSubTab('knowledge')}
            icon={<BookOpen className="h-3.5 w-3.5" />}
            label="Knowledge"
          />
          <SubTabButton
            active={activeSubTab === 'research'}
            onClick={() => setActiveSubTab('research')}
            icon={<FlaskConical className="h-3.5 w-3.5" />}
            label="Research"
          />
        </div>
      )}

      <div className="flex-1 min-h-0">
        {activeSubTab === 'knowledge' || !hasPlanning ? (
          <KnowledgeViewer project={project} />
        ) : (
          <ResearchBrowser projectId={project.id} projectPath={project.path} />
        )}
      </div>
    </div>
  );
}

function SubTabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors',
        active
          ? 'bg-accent text-foreground font-medium'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function ResearchBrowser({ projectId, projectPath }: { projectId: string; projectPath: string }) {
  const [selectedFile, setSelectedFile] = useState<string>('');

  const researchPath = `${projectPath}/.planning/research`;
  const { data: fileTree, isLoading: treeLoading } = useKnowledgeFiles(researchPath);

  const allFiles = (fileTree?.folders ?? []).flatMap((folder) => folder.files);

  // Auto-select first file when tree loads
  const resolvedSelected = selectedFile || (allFiles[0]?.relative_path ?? '');

  const { data: content, isLoading: contentLoading } = useKnowledgeFileContent(
    projectId,
    researchPath,
    resolvedSelected,
  );

  if (treeLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (allFiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <FlaskConical className="h-10 w-10 mb-3 opacity-30" />
        <p className="text-sm font-medium">No research files found</p>
        <p className="text-xs mt-1 text-center max-w-xs">
          Research docs live in <code className="font-mono text-[11px]">.planning/research/</code>.
          Run /gsd:research to populate this folder.
        </p>
      </div>
    );
  }

  const items = allFiles.map((f) => ({ id: f.relative_path, label: f.display_name }));

  return (
    <SplitDocBrowser
      items={items}
      selectedId={resolvedSelected}
      onSelect={setSelectedFile}
      content={content}
      contentLoading={contentLoading}
      projectId={projectId}
      filePath={resolvedSelected}
      emptyMessage="Select a file to view its contents"
    />
  );
}
