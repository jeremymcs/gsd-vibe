// VCCA - Knowledge Tab Component
// Knowledge viewer with Research sub-tab for .planning/research/ files
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { useState, useCallback, useEffect } from 'react';
import { useProject, useKnowledgeFiles, useKnowledgeFileContent } from '@/lib/queries';
import { KnowledgeViewer } from '@/components/knowledge';
import { MarkdownRenderer } from '@/components/knowledge/markdown-renderer';
import { BookOpen, FlaskConical, Loader2, FileText, Edit3, Save, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { writeProjectFile } from '@/lib/tauri';
import { queryKeys } from '@/lib/query-keys';
import { toast } from 'sonner';
import Editor from 'react-simple-code-editor';
import hljs from 'highlight.js/lib/core';
import markdownLang from 'highlight.js/lib/languages/markdown';

// Register markdown language for the editor highlighter
hljs.registerLanguage('markdown', markdownLang);

function highlightMarkdown(code: string): string {
  try {
    return hljs.highlight(code, { language: 'markdown' }).value;
  } catch {
    return code;
  }
}

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

      {/* Tab content */}
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

function ResearchBrowser({
  projectId,
  projectPath,
}: {
  projectId: string;
  projectPath: string;
}) {
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const queryClient = useQueryClient();

  const editorHighlight = useCallback((code: string) => highlightMarkdown(code), []);

  // List all files under .planning/research
  const researchPath = `${projectPath}/.planning/research`;
  const { data: fileTree, isLoading: treeLoading } = useKnowledgeFiles(researchPath);

  // Flatten all files from the tree for the sidebar
  const allFiles = (fileTree?.folders ?? []).flatMap((folder) => folder.files);

  // Auto-select first file when tree loads
  if (allFiles.length > 0 && !selectedFile) {
    setSelectedFile(allFiles[0].relative_path);
  }

  const { data: content, isLoading: contentLoading } = useKnowledgeFileContent(
    projectId,
    researchPath,
    selectedFile,
  );

  const saveMutation = useMutation({
    mutationFn: ({ filename, content: fileContent }: { filename: string; content: string }) =>
      writeProjectFile(researchPath, filename, fileContent),
    onSuccess: () => {
      toast.success('File saved');
      setEditedContent(editContent);
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.knowledgeFile(projectId, selectedFile) });
    },
    onError: (error) => {
      toast.error(`Failed to save: ${error}`);
    },
  });

  const hasChanges = editContent !== editedContent;

  const handleEdit = () => {
    setEditContent(content || '');
    setEditedContent(content || '');
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditContent('');
    setEditedContent('');
  };

  const handleSave = () => {
    if (selectedFile) {
      saveMutation.mutate({ filename: selectedFile, content: editContent });
    }
  };

  // Reset edit mode when switching files
  useEffect(() => {
    setIsEditing(false);
    setEditContent('');
    setEditedContent('');
  }, [selectedFile]);

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

  return (
    <div className="flex gap-4 h-full min-h-0">
      {/* Left sidebar: file list */}
      <div className="w-56 flex-shrink-0 border rounded-lg bg-card overflow-y-auto">
        <div className="p-2 space-y-0.5">
          {allFiles.map((file) => (
            <button
              key={file.relative_path}
              type="button"
              onClick={() => setSelectedFile(file.relative_path)}
              className={cn(
                'w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors',
                selectedFile === file.relative_path
                  ? 'bg-accent text-foreground font-medium'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
              )}
            >
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate" title={file.display_name}>
                {file.display_name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Right panel: file content with edit controls */}
      <div className="flex-1 min-w-0 border rounded-lg bg-card overflow-hidden flex flex-col">
        {/* Header with edit/save/cancel */}
        {selectedFile && (
          <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30 flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm font-medium truncate text-muted-foreground">
                {selectedFile.split('/').pop()}
              </span>
              <Badge variant="secondary" className="text-xs">markdown</Badge>
            </div>
            <div className="flex items-center gap-1">
              {isEditing ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSave}
                    disabled={saveMutation.isPending || !hasChanges}
                    className="flex-shrink-0"
                  >
                    <Save className="h-4 w-4 mr-1" />
                    {saveMutation.isPending ? 'Saving...' : 'Save'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancel}
                    disabled={saveMutation.isPending}
                    className="flex-shrink-0"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEdit}
                  className="flex-shrink-0"
                >
                  <Edit3 className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Content area */}
        <div className="flex-1 overflow-y-auto">
          {contentLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : isEditing ? (
            <div className="h-full overflow-auto">
              <Editor
                value={editContent}
                onValueChange={(code) => setEditContent(code)}
                highlight={editorHighlight}
                padding={24}
                style={{
                  fontFamily: '"JetBrains Mono Variable", "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  backgroundColor: 'transparent',
                  minHeight: '100%',
                }}
              />
            </div>
          ) : content ? (
            <div className="p-6">
              <MarkdownRenderer
                content={content}
                projectId={projectId}
                filePath={selectedFile}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
              Select a file to view its contents
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
