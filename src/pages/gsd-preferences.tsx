// GSD Vibe - Global GSD Preferences Page
// Edits ~/.gsd/PREFERENCES.md — applies to all projects.
// Thin shell: data loading + header. All form logic lives in @/components/preferences.
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { useState, useEffect, useCallback } from 'react';
import { Globe, RefreshCw, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/layout/page-header';
import { PreferencesForm, setDraftField } from '@/components/preferences';
import { useGsd2GetGlobalPreferences, useGsd2SaveGlobalPreferences } from '@/lib/queries';

export function GsdPreferencesPage() {
  const { data, isLoading, isError, error, refetch } = useGsd2GetGlobalPreferences();
  const saveMutation = useGsd2SaveGlobalPreferences();

  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!data) return;
    setDraft({ ...data.global });
    setDirty(false);
  }, [data]);

  const handleChange = useCallback((key: string, value: unknown) => {
    setDraft(prev => setDraftField(prev, key, value));
    setDirty(true);
  }, []);

  const handleSave = useCallback(() => {
    saveMutation.mutate(draft);
    setDirty(false);
  }, [saveMutation, draft]);

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

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title="Global GSD Preferences"
        description={data.global_path}
        icon={<Globe className="w-5 h-5 text-purple-500" />}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => void refetch()} className="h-8 text-xs gap-1.5">
              <RefreshCw className="w-3 h-3" /> Reload
            </Button>
            <Button size="sm" disabled={!dirty || saveMutation.isPending} onClick={handleSave} className="h-8 text-xs gap-1.5">
              <Save className="w-3 h-3" />{saveMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        }
      />

      {/* Scope note */}
      <div className="px-6 py-2.5 border-b border-border bg-purple-500/5 shrink-0 flex items-center gap-2">
        <Globe className="w-3.5 h-3.5 text-purple-500 shrink-0" />
        <p className="text-xs text-muted-foreground">
          These settings apply to <strong>all projects</strong>. Project-level preferences in{' '}
          <code className="bg-muted px-1 rounded">.gsd/PREFERENCES.md</code> override them per-project.
          To edit project-specific preferences, open the project and use the Preferences tab.
        </p>
        {dirty && (
          <Badge variant="outline" className="ml-auto text-[10px] text-yellow-600 dark:text-yellow-400 border-yellow-500/40">
            Unsaved changes
          </Badge>
        )}
      </div>

      <PreferencesForm
        draft={draft}
        onChange={handleChange}
        dirty={dirty}
        saving={saveMutation.isPending}
        saveLabel="Global"
        onSave={handleSave}
      />
    </div>
  );
}
