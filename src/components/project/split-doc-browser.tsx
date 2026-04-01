// VCCA - Split Doc Browser
// Reusable left-list / right-content browser for markdown documents.
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { type LucideIcon, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MarkdownRenderer } from '@/components/knowledge/markdown-renderer';

export interface DocItem {
  id: string;
  label: string;
  icon?: LucideIcon;
}

interface SplitDocBrowserProps {
  /** All items to show in the left sidebar */
  items: DocItem[];
  /** Currently selected item id */
  selectedId: string;
  onSelect: (id: string) => void;
  /** Markdown content for the selected item */
  content: string | null | undefined;
  contentLoading?: boolean;
  projectId: string;
  /** File path label for the markdown renderer */
  filePath?: string;
  /** Message shown when content area has no selection */
  emptyMessage?: string;
}

/**
 * Left sidebar list + right markdown panel pattern.
 * Used by CodebaseTab and the ResearchBrowser inside KnowledgeTab.
 */
export function SplitDocBrowser({
  items,
  selectedId,
  onSelect,
  content,
  contentLoading,
  projectId,
  filePath = '',
  emptyMessage = 'Select a document to view',
}: SplitDocBrowserProps) {
  return (
    <div className="flex gap-4 h-full min-h-0">
      {/* Left sidebar */}
      <div className="w-56 flex-shrink-0 border rounded-lg bg-card overflow-y-auto">
        <div className="p-2 space-y-0.5">
          {items.map((item) => {
            const Icon = item.icon ?? FileText;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                className={cn(
                  'w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors',
                  selectedId === item.id
                    ? 'bg-accent text-foreground font-medium'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 min-w-0 border rounded-lg bg-card overflow-y-auto p-6">
        {contentLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : content ? (
          <MarkdownRenderer content={content} projectId={projectId} filePath={filePath} />
        ) : (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
            {emptyMessage}
          </div>
        )}
      </div>
    </div>
  );
}
