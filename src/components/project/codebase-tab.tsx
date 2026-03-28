// GSD Vibe - Codebase Tab (structured .planning/codebase/ browser)
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { useState, useEffect } from 'react';
import { useCodebaseDoc } from '@/lib/queries';
import { SplitDocBrowser, type DocItem } from './split-doc-browser';
import {
  Layers,
  Building2,
  FolderTree,
  ScrollText,
  TestTube,
  Plug,
  AlertTriangle,
  Loader2,
  FileSearch,
} from 'lucide-react';

interface CodebaseTabProps {
  projectId: string;
  projectPath: string;
}

const CODEBASE_DOCS: DocItem[] = [
  { id: 'STACK.md',         label: 'Tech Stack',    icon: Layers      },
  { id: 'ARCHITECTURE.md',  label: 'Architecture',  icon: Building2   },
  { id: 'STRUCTURE.md',     label: 'Structure',     icon: FolderTree  },
  { id: 'CONVENTIONS.md',   label: 'Conventions',   icon: ScrollText  },
  { id: 'TESTING.md',       label: 'Testing',       icon: TestTube    },
  { id: 'INTEGRATIONS.md',  label: 'Integrations',  icon: Plug        },
  { id: 'CONCERNS.md',      label: 'Concerns',      icon: AlertTriangle },
];

/**
 * Probes a single codebase doc and returns whether it exists.
 * Extracted into its own component so we don't call hooks inside map().
 */
function DocProbe({
  projectPath,
  filename,
  onResult,
}: {
  projectPath: string;
  filename: string;
  onResult: (filename: string, exists: boolean) => void;
}) {
  const { data } = useCodebaseDoc(projectPath, filename);
  useEffect(() => {
    onResult(filename, !!data);
  }, [filename, data, onResult]);
  return null;
}

export function CodebaseTab({ projectId, projectPath }: CodebaseTabProps) {
  const [selectedDoc, setSelectedDoc] = useState(CODEBASE_DOCS[0].id);
  const [availableDocs, setAvailableDocs] = useState<Set<string>>(new Set());

  const probe = useCodebaseDoc(projectPath, CODEBASE_DOCS[0].id);
  const { data: content, isLoading: contentLoading } = useCodebaseDoc(projectPath, selectedDoc);

  const handleProbeResult = (filename: string, exists: boolean) => {
    setAvailableDocs((prev) => {
      if (exists === prev.has(filename)) return prev;
      const next = new Set(prev);
      if (exists) next.add(filename); else next.delete(filename);
      return next;
    });
  };

  // Auto-select first available doc when availability changes
  useEffect(() => {
    if (availableDocs.size > 0 && !availableDocs.has(selectedDoc)) {
      const first = CODEBASE_DOCS.find((d) => availableDocs.has(d.id));
      if (first) setSelectedDoc(first.id);
    }
  }, [availableDocs, selectedDoc]);

  return (
    <>
      {/* Probe each doc in a clean component — no hooks-in-map */}
      {CODEBASE_DOCS.map((doc) => (
        <DocProbe
          key={doc.id}
          projectPath={projectPath}
          filename={doc.id}
          onResult={handleProbeResult}
        />
      ))}

      {probe.isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : availableDocs.size === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <FileSearch className="h-10 w-10 mb-3 opacity-30" />
          <p className="text-sm font-medium">No codebase analysis found</p>
          <p className="text-xs mt-1 text-center max-w-xs">
            Run <code className="font-mono text-[11px]">/gsd:map-codebase</code> to generate
            structured analysis documents for this project.
          </p>
        </div>
      ) : (
        <SplitDocBrowser
          items={CODEBASE_DOCS.filter((d) => availableDocs.has(d.id))}
          selectedId={selectedDoc}
          onSelect={setSelectedDoc}
          content={content}
          contentLoading={contentLoading}
          projectId={projectId}
          filePath={`.planning/codebase/${selectedDoc}`}
          emptyMessage="Select a document to view"
        />
      )}
    </>
  );
}
