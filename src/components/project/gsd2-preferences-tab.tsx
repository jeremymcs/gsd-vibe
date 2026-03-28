// GSD Vibe - GSD-2 Preferences Tab (project nav-rail view)
// Thin shell: data loading + scope toggle. All form logic lives in @/components/preferences.
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { useState, useEffect, useCallback } from 'react';
import { Settings2, RefreshCw, Save, Globe, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PreferencesForm, setDraftField } from '@/components/preferences';
import { useGsd2GetPreferences, useGsd2SavePreferences } from '@/lib/queries';

export interface Gsd2PreferencesTabProps {
  projectId: string;
  projectPath: string;
}

export function Gsd2PreferencesTab({ projectId }: Gsd2PreferencesTabProps) {
  const { data, isLoading, isError, error, refetch } = useGsd2GetPreferences(projectId);
  const saveMutation = useGsd2SavePreferences();

  const [editScope, setEditScope] = useState<'global' | 'project'>('project');
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!data) return;
    const source = editScope === 'global' ? data.global : data.project;
    setDraft({ ...source });
    setDirty(false);
  }, [data, editScope]);

  const handleChange = useCallback((key: string, value: unknown) => {
    setDraft(prev => setDraftField(prev, key, value));
    setDirty(true);
  }, []);

  const handleSave = useCallback(() => {
    saveMutation.mutate({ projectId, scope: editScope, payload: draft });
    setDirty(false);
  }, [saveMutation, projectId, editScope, draft]);

  // ── Loading / error ────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm gap-2">
        <RefreshCw className="w-4 h-4 animate-spin" /> Loading preferences…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3">
        <p className="text-sm text-destructive">Failed to load preferences</p>
        <p className="text-xs text-muted-foreground">{String(error ?? 'Unknown error')}</p>
        <Button variant="outline" size="sm" onClick={() => void refetch()}>Retry</Button>
      </div>
    );
  }

  const scopes: Record<string, string> = data.scopes ?? {};

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <Settings2 className="w-5 h-5 text-muted-foreground" />
          <div>
            <h2 className="text-base font-semibold">Preferences</h2>
            <p className="text-xs text-muted-foreground">GSD-2 configuration for this project and your global defaults</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void refetch()} className="h-8 text-xs gap-1.5">
            <RefreshCw className="w-3 h-3" /> Reload
          </Button>
          <Button size="sm" disabled={!dirty || saveMutation.isPending} onClick={handleSave} className="h-8 text-xs gap-1.5">
            <Save className="w-3 h-3" />{saveMutation.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Scope toggle */}
      <div className="flex items-center gap-2 px-6 py-3 border-b border-border bg-muted/20 shrink-0">
        <span className="text-xs text-muted-foreground mr-1">Editing:</span>
        <Button variant={editScope === 'project' ? 'default' : 'outline'} size="sm"
          className="h-7 text-xs gap-1.5" aria-pressed={editScope === 'project'}
          onClick={() => setEditScope('project')}>
          <FolderOpen className="w-3 h-3" />
          Project
          {!data.project_exists && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 ml-0.5">new</Badge>
          )}
        </Button>
        <Button variant={editScope === 'global' ? 'default' : 'outline'} size="sm"
          className="h-7 text-xs gap-1.5" aria-pressed={editScope === 'global'}
          onClick={() => setEditScope('global')}>
          <Globe className="w-3 h-3" />
          Global (~/.gsd)
          {!data.global_exists && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 ml-0.5">new</Badge>
          )}
        </Button>
        <span className="text-xs text-muted-foreground ml-2">
          {editScope === 'global'
            ? <span className="text-yellow-600 dark:text-yellow-400">⚠ Global changes apply to all projects</span>
            : <span>{data.project_path}</span>}
        </span>
        {dirty && (
          <Badge variant="outline" className="ml-auto text-[10px] text-yellow-600 dark:text-yellow-400 border-yellow-500/40">
            Unsaved changes
          </Badge>
        )}
      </div>

      <PreferencesForm
        draft={draft}
        onChange={handleChange}
        scopes={editScope === 'project' ? scopes : {}}
        dirty={dirty}
        saving={saveMutation.isPending}
        saveLabel={editScope === 'global' ? 'Global' : 'Project'}
        onSave={handleSave}
      />
    </div>
  );
}
