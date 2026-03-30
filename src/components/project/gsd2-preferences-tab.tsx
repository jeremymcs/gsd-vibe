// GSD VibeFlow - GSD-2 Preferences Tab Component
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { useState, useEffect } from 'react';
import { Settings, Save, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ViewEmpty } from '@/components/shared/loading-states';
import { useGsd2Preferences, useGsd2SavePreferences } from '@/lib/queries';

interface Gsd2PreferencesTabProps {
  projectId: string;
  projectPath: string;
}

type ScopeBadgeVariant = 'success' | 'info' | 'outline' | 'warning';

function getScopeVariant(scope: string): ScopeBadgeVariant {
  switch (scope) {
    case 'project':
      return 'success';
    case 'global':
      return 'info';
    case 'default':
      return 'outline';
    default:
      return 'warning'; // unexpected/merged
  }
}

function getScopeLabel(scope: string): string {
  switch (scope) {
    case 'project':
      return 'project';
    case 'global':
      return 'global';
    case 'default':
      return 'default';
    default:
      return scope;
  }
}

function valueToString(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

function stringToValue(str: string, originalVal: unknown): unknown {
  // Attempt to preserve the original type where possible.
  if (typeof originalVal === 'number') {
    const n = Number(str);
    return isNaN(n) ? str : n;
  }
  if (typeof originalVal === 'boolean') {
    if (str === 'true') return true;
    if (str === 'false') return false;
    return str;
  }
  // For objects/arrays, try JSON.parse; fall back to the raw string.
  if (typeof originalVal === 'object') {
    try {
      return JSON.parse(str) as unknown;
    } catch {
      return str;
    }
  }
  return str;
}

interface PreferenceRowProps {
  fieldKey: string;
  originalValue: unknown;
  scope: string;
  draftValue: string;
  onChange: (key: string, val: string) => void;
}

function PreferenceRow({
  fieldKey,
  originalValue,
  scope,
  draftValue,
  onChange,
}: PreferenceRowProps) {
  const scopeVariant = getScopeVariant(scope);
  const isDirty = draftValue !== valueToString(originalValue);

  return (
    <div className="flex items-center gap-3 py-2.5 px-4 border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors">
      {/* Field name */}
      <div className="w-40 shrink-0">
        <span className="text-xs font-mono text-foreground truncate block" title={fieldKey}>
          {fieldKey}
        </span>
      </div>

      {/* Scope badge */}
      <Badge variant={scopeVariant} size="sm" className="shrink-0 w-16 justify-center">
        {getScopeLabel(scope)}
      </Badge>

      {/* Inline edit input */}
      <Input
        value={draftValue}
        onChange={(e) => onChange(fieldKey, e.target.value)}
        className={`h-7 text-xs flex-1 min-w-0 ${isDirty ? 'border-status-info/60 ring-1 ring-status-info/30' : ''}`}
        aria-label={`Value for ${fieldKey}`}
      />
    </div>
  );
}

export function Gsd2PreferencesTab({ projectPath }: Gsd2PreferencesTabProps) {
  const { data: prefsData, isLoading, isError } = useGsd2Preferences(projectPath);
  const savePreferences = useGsd2SavePreferences();

  // Save scope selector: 'project' or 'global'
  const [saveScope, setSaveScope] = useState<'project' | 'global'>('project');

  // Draft state initialized from server data via useEffect — avoids re-render loop.
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [draftInitialized, setDraftInitialized] = useState(false);

  useEffect(() => {
    if (prefsData?.merged) {
      const initial: Record<string, string> = {};
      for (const [k, v] of Object.entries(prefsData.merged)) {
        initial[k] = valueToString(v);
      }
      setDraft(initial);
      setDraftInitialized(true);
    }
  }, [prefsData]);

  const handleChange = (key: string, val: string) => {
    setDraft((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = () => {
    if (!prefsData?.merged) return;

    // Reconstruct the payload using original value types as hints.
    const payload: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(draft)) {
      const original = prefsData.merged[k];
      payload[k] = stringToValue(v, original);
    }

    savePreferences.mutate({ projectPath: projectPath!, scope: saveScope, payload });
  };

  const isDirty =
    prefsData?.merged !== undefined &&
    Object.entries(draft).some(([k, v]) => v !== valueToString(prefsData.merged[k]));

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Settings className="h-4 w-4" /> Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Settings className="h-4 w-4" /> Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="py-4 text-center text-sm text-status-error">
          Failed to load preferences — check that the project path is accessible.
        </CardContent>
      </Card>
    );
  }

  const merged = prefsData?.merged ?? {};
  const scopes = prefsData?.scopes ?? {};
  const keys = Object.keys(merged);

  if (keys.length === 0 || !draftInitialized) {
    if (!isLoading && keys.length === 0) {
      return (
        <ViewEmpty
          icon={<Settings className="h-8 w-8" />}
          message="No preferences configured"
          description="GSD-2 preferences will appear here once a preferences file is detected"
        />
      );
    }
    // Still initializing draft — show skeleton
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Settings className="h-4 w-4" /> Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Settings className="h-4 w-4" /> Preferences
            <span className="text-xs font-normal text-muted-foreground">
              ({keys.length} fields)
            </span>
          </CardTitle>

          {/* Scope selector + Save button */}
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-border overflow-hidden text-xs">
              <button
                type="button"
                onClick={() => setSaveScope('project')}
                className={`px-2 py-1 transition-colors ${
                  saveScope === 'project'
                    ? 'bg-status-success/20 text-status-success font-medium'
                    : 'bg-transparent text-muted-foreground hover:bg-muted/40'
                }`}
              >
                project
              </button>
              <button
                type="button"
                onClick={() => setSaveScope('global')}
                className={`px-2 py-1 transition-colors border-l border-border ${
                  saveScope === 'global'
                    ? 'bg-status-info/20 text-status-info font-medium'
                    : 'bg-transparent text-muted-foreground hover:bg-muted/40'
                }`}
              >
                global
              </button>
            </div>

            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={!isDirty || savePreferences.isPending}
              onClick={handleSave}
            >
              {savePreferences.isPending ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="h-3 w-3 mr-1" />
                  Save
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Column header row */}
        <div className="flex items-center gap-3 mt-3 px-4 pb-1 border-b border-border/60">
          <span className="w-40 shrink-0 text-xs font-medium text-muted-foreground">Field</span>
          <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground">Scope</span>
          <span className="flex-1 text-xs font-medium text-muted-foreground">Value</span>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {keys.map((key) => (
          <PreferenceRow
            key={key}
            fieldKey={key}
            originalValue={merged[key]}
            scope={scopes[key] ?? 'default'}
            draftValue={draft[key] ?? ''}
            onChange={handleChange}
          />
        ))}
      </CardContent>
    </Card>
  );
}
