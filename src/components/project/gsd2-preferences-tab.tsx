// GSD VibeFlow - GSD-2 Preferences Tab
// Full preferences editor with scope-aware fields, nested object handling, and hooks CRUD
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { useState, useCallback, type ReactNode } from 'react';
import {
  Settings2,
  RefreshCw,
  Save,
  Globe,
  FolderOpen,
  ChevronDown,
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useGsd2GetPreferences, useGsd2SavePreferences } from '@/lib/queries';
import type { PreferencesHookEntry } from '@/lib/tauri';

interface Gsd2PreferencesTabProps {
  projectId: string;
  projectPath: string;
}

// ============================================================
// Helper: Set deeply nested field in draft state
// ============================================================
function setDraftField(
  draft: Record<string, unknown>,
  keyPath: string,
  value: unknown
): Record<string, unknown> {
  const parts = keyPath.split('.');
  if (parts.length === 1) {
    return { ...draft, [keyPath]: value };
  }

  const newDraft = { ...draft };
  let current = newDraft as Record<string, unknown>;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || typeof current[part] !== 'object' || current[part] === null) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  current[parts[parts.length - 1]] = value;
  return newDraft;
}

// ============================================================
// ScopeBadge: Show field source (project / global / default)
// ============================================================
function ScopeBadge({ scope }: { scope?: string }) {
  if (!scope) return null;

  const variants: Record<string, { bg: string; fg: string }> = {
    project: { bg: 'bg-blue-100 dark:bg-blue-900/30', fg: 'text-blue-700 dark:text-blue-300' },
    global: { bg: 'bg-amber-100 dark:bg-amber-900/30', fg: 'text-amber-700 dark:text-amber-300' },
    merged: { bg: 'bg-gray-100 dark:bg-gray-800', fg: 'text-gray-700 dark:text-gray-300' },
    default: { bg: 'bg-gray-100 dark:bg-gray-800', fg: 'text-gray-600 dark:text-gray-400' },
  };

  const style = variants[scope] || variants.default;
  return (
    <Badge className={`text-xs font-normal ${style.bg} ${style.fg}`} variant="outline">
      {scope}
    </Badge>
  );
}

// ============================================================
// FieldRow: Label + scope badge + input wrapper
// ============================================================
interface FieldRowProps {
  label: string;
  helpText?: string;
  scope?: string;
  children: ReactNode;
  required?: boolean;
}

function FieldRow({ label, helpText, scope, children, required }: FieldRowProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
        {scope && <ScopeBadge scope={scope} />}
      </div>
      {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}
      {children}
    </div>
  );
}

// ============================================================
// StringArrayField: Comma-separated Input
// ============================================================
function StringArrayField({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const arrayValue = Array.isArray(value) ? value : [];
  const textValue = arrayValue.join(', ');

  return (
    <Input
      value={textValue}
      onChange={(e) => {
        const parts = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
        onChange(parts);
      }}
      placeholder="Enter comma-separated values"
      className="text-sm"
    />
  );
}

// ============================================================
// Section: Collapsible preference section
// ============================================================
interface SectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

function Section({ title, children, defaultOpen = false }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card className="border">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
      >
        <h3 className="font-semibold text-sm">{title}</h3>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <div className="px-4 pb-4 border-t space-y-4">{children}</div>}
    </Card>
  );
}

// ============================================================
// HookForm: Editor for both hook types
// ============================================================
interface HookFormProps {
  hook?: PreferencesHookEntry;
  onSave: (hook: PreferencesHookEntry) => void;
  onCancel: () => void;
}

function HookForm({ hook, onSave, onCancel }: HookFormProps) {
  const [form, setForm] = useState<PreferencesHookEntry>(
    hook || {
      name: '',
      action: 'replace',
      event: 'pre-unit',
      prompt: '',
      prepend: '',
      append: '',
      enabled: true,
    }
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.name.trim()) newErrors.name = 'Name required';

    if (form.event === 'post-unit' && !form.prompt?.trim()) {
      newErrors.prompt = 'Post-unit hooks require a prompt';
    }

    if (form.event === 'pre-unit' && form.action === 'replace' && !form.prompt?.trim()) {
      newErrors.prompt = 'Replace action requires a prompt';
    }

    if (form.event === 'pre-unit' && form.action === 'modify') {
      if (!form.prepend?.trim() && !form.append?.trim()) {
        newErrors.modify = 'Modify action requires prepend and/or append';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      onSave(form);
    }
  };

  return (
    <div className="space-y-4 p-4 bg-muted/30 rounded border">
      <div className="grid grid-cols-2 gap-4">
        <FieldRow label="Name" required>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g., add-credits"
            className="text-sm"
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
        </FieldRow>

        <FieldRow label="Event">
          <Select value={form.event} onValueChange={(v) => setForm({ ...form, event: v as 'pre-unit' | 'post-unit' })}>
            <SelectTrigger className="text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pre-unit">Pre-unit</SelectItem>
              <SelectItem value="post-unit">Post-unit</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>
      </div>

      {form.event === 'pre-unit' && (
        <FieldRow label="Action">
          <Select value={form.action} onValueChange={(v) => setForm({ ...form, action: v })}>
            <SelectTrigger className="text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="replace">Replace</SelectItem>
              <SelectItem value="modify">Modify</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>
      )}

      {(form.event === 'post-unit' || form.action === 'replace') && (
        <FieldRow label="Prompt" required>
          <Textarea
            value={form.prompt || ''}
            onChange={(e) => setForm({ ...form, prompt: e.target.value })}
            placeholder="Enter prompt text"
            className="text-sm min-h-20 font-mono text-xs"
          />
          {errors.prompt && <p className="text-xs text-destructive">{errors.prompt}</p>}
        </FieldRow>
      )}

      {form.event === 'pre-unit' && form.action === 'modify' && (
        <>
          <FieldRow label="Prepend">
            <Textarea
              value={form.prepend || ''}
              onChange={(e) => setForm({ ...form, prepend: e.target.value })}
              placeholder="Text to prepend to messages"
              className="text-sm min-h-16 font-mono text-xs"
            />
          </FieldRow>
          <FieldRow label="Append">
            <Textarea
              value={form.append || ''}
              onChange={(e) => setForm({ ...form, append: e.target.value })}
              placeholder="Text to append to messages"
              className="text-sm min-h-16 font-mono text-xs"
            />
          </FieldRow>
          {errors.modify && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.modify}</p>}
        </>
      )}

      <div className="flex gap-2 justify-end pt-2 border-t">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleSave}>
          Save
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// HookEditor: Table with CRUD
// ============================================================
interface HookEditorProps {
  hooks: PreferencesHookEntry[];
  onChange: (hooks: PreferencesHookEntry[]) => void;
}

function HookEditor({ hooks, onChange }: HookEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  const handleSaveHook = (hook: PreferencesHookEntry) => {
    const updated = [...hooks];
    if (editingIndex !== null) {
      updated[editingIndex] = hook;
      setEditingIndex(null);
    } else {
      updated.push(hook);
      setAddingNew(false);
    }
    onChange(updated);
  };

  const handleToggleHook = (index: number) => {
    const updated = [...hooks];
    updated[index] = { ...updated[index], enabled: !updated[index].enabled };
    onChange(updated);
  };

  const handleDeleteHook = (index: number) => {
    const updated = hooks.filter((_, i) => i !== index);
    onChange(updated);
    setDeleteIndex(null);
  };

  if (addingNew || editingIndex !== null) {
    return (
      <HookForm
        hook={editingIndex !== null ? hooks[editingIndex] : undefined}
        onSave={handleSaveHook}
        onCancel={() => {
          setEditingIndex(null);
          setAddingNew(false);
        }}
      />
    );
  }

  return (
    <div className="space-y-3">
      {hooks.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No hooks configured</p>
      ) : (
        <div className="border rounded divide-y text-sm">
          {hooks.map((hook, idx) => (
            <div
              key={`${hook.name}-${idx}`}
              className="flex items-center gap-3 px-3 py-2 hover:bg-muted/40"
            >
              <Switch
                checked={hook.enabled}
                onCheckedChange={() => handleToggleHook(idx)}
              />
              <div className="flex-1 min-w-0">
                <p className="font-mono text-xs">{hook.name}</p>
                <p className="text-xs text-muted-foreground">
                  {hook.event} • {hook.action}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingIndex(idx)}
                className="h-6 w-6 p-0"
              >
                <Edit2 className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteIndex(idx)}
                className="h-6 w-6 p-0 text-destructive"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => setAddingNew(true)}
        className="w-full gap-2"
      >
        <Plus className="w-3 h-3" />
        Add Hook
      </Button>

      <AlertDialog open={deleteIndex !== null} onOpenChange={(open) => !open && setDeleteIndex(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Hook</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-mono">{hooks[deleteIndex!]?.name}</span>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDeleteHook(deleteIndex!)} className="bg-destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================
export function Gsd2PreferencesTab({ projectPath }: Gsd2PreferencesTabProps) {
  const { data, isLoading, isError, error, refetch } = useGsd2GetPreferences(projectPath);
  const saveMutation = useGsd2SavePreferences();

  const [editScope, setEditScope] = useState<'global' | 'project'>('project');
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [dirty, setDirty] = useState(false);

  // Initialize draft when data loads
  if (data && Object.keys(draft).length === 0) {
    const source = editScope === 'global' ? data.global_raw : data.project_raw;
    setDraft({ ...source });
  }

  const handleChange = useCallback(
    (key: string, value: unknown) => {
      setDraft((prev) => setDraftField(prev, key, value));
      setDirty(true);
    },
    []
  );

  const handleSave = useCallback(() => {
    saveMutation.mutate({ projectPath, scope: editScope, payload: draft });
    setDirty(false);
  }, [saveMutation, projectPath, editScope, draft]);

  // ── Loading ────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm gap-2">
        <RefreshCw className="w-4 h-4 animate-spin" />
        Loading preferences…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3">
        <p className="text-sm text-destructive">Failed to load preferences</p>
        <p className="text-xs text-muted-foreground">{String(error ?? 'Unknown error')}</p>
        <Button variant="outline" size="sm" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const scopes: Record<string, string> = data.scopes ?? {};
  const getScope = (key: string) => scopes[key] ?? 'default';

  // ── Main UI ────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <Settings2 className="w-5 h-5 text-muted-foreground" />
          <div>
            <h2 className="text-base font-semibold">Preferences</h2>
            <p className="text-xs text-muted-foreground">GSD-2 configuration and workflow hooks</p>
          </div>
        </div>
      </div>

      {/* Scope toggle */}
      <div className="flex items-center gap-2 px-6 py-3 border-b border-border bg-muted/20 shrink-0">
        <span className="text-xs text-muted-foreground mr-1">Editing:</span>
        <Button
          variant={editScope === 'project' ? 'default' : 'outline'}
          size="sm"
          className="h-7 text-xs gap-1.5"
          aria-pressed={editScope === 'project'}
          onClick={() => setEditScope('project')}
        >
          <FolderOpen className="w-3 h-3" />
          Project
        </Button>
        <Button
          variant={editScope === 'global' ? 'default' : 'outline'}
          size="sm"
          className="h-7 text-xs gap-1.5"
          aria-pressed={editScope === 'global'}
          onClick={() => setEditScope('global')}
        >
          <Globe className="w-3 h-3" />
          Global (~/.gsd)
        </Button>
        <span className="text-xs text-muted-foreground ml-2">
          {editScope === 'global' ? (
            <span className="text-yellow-600 dark:text-yellow-400">⚠ Global changes apply to all projects</span>
          ) : (
            <span>{projectPath}</span>
          )}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {dirty && (
            <Badge
              variant="outline"
              className="text-[10px] text-yellow-600 dark:text-yellow-400 border-yellow-500/40"
            >
              Unsaved changes
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            className="h-7 text-xs gap-1.5"
          >
            <RefreshCw className="w-3 h-3" />
            Reload
          </Button>
          <Button
            size="sm"
            disabled={!dirty || saveMutation.isPending}
            onClick={handleSave}
            className="h-7 text-xs gap-1.5"
          >
            <Save className="w-3 h-3" />
            {saveMutation.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {/* S02/T01: 8 sections */}

        {/* 1. Workflow */}
        <Section title="Workflow">
          <div className="space-y-4">
            <FieldRow label="Mode" scope={getScope('mode')}>
              <Select
                value={(draft.mode as string) || 'auto'}
                onValueChange={(v) => handleChange('mode', v)}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>

            <FieldRow label="Unique Milestone IDs" scope={getScope('unique_milestone_ids')}>
              <div className="flex items-center">
                <Switch
                  checked={(draft.unique_milestone_ids as boolean) || false}
                  onCheckedChange={(v) => handleChange('unique_milestone_ids', v)}
                />
              </div>
            </FieldRow>

            <FieldRow label="Skill Discovery" scope={getScope('skill_discovery')}>
              <div className="flex items-center">
                <Switch
                  checked={(draft.skill_discovery as boolean) || true}
                  onCheckedChange={(v) => handleChange('skill_discovery', v)}
                />
              </div>
            </FieldRow>

            <FieldRow label="Skill Staleness (days)" scope={getScope('skill_staleness_days')}>
              <Input
                type="number"
                value={(draft.skill_staleness_days as number) || 7}
                onChange={(e) => handleChange('skill_staleness_days', parseInt(e.target.value))}
                className="text-sm"
              />
            </FieldRow>

            <FieldRow label="Token Profile" scope={getScope('token_profile')}>
              <Input
                value={(draft.token_profile as string) || ''}
                onChange={(e) => handleChange('token_profile', e.target.value)}
                placeholder="e.g., light, standard, heavy"
                className="text-sm"
              />
            </FieldRow>

            <FieldRow label="Search Provider" scope={getScope('search_provider')}>
              <Select
                value={(draft.search_provider as string) || 'semantic'}
                onValueChange={(v) => handleChange('search_provider', v)}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semantic">Semantic</SelectItem>
                  <SelectItem value="keyword">Keyword</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>

            <FieldRow label="Context Selection" scope={getScope('context_selection')}>
              <Select
                value={(draft.context_selection as string) || 'auto'}
                onValueChange={(v) => handleChange('context_selection', v)}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>

            <FieldRow label="Auto Visualize" scope={getScope('auto_visualize')}>
              <div className="flex items-center">
                <Switch
                  checked={(draft.auto_visualize as boolean) || false}
                  onCheckedChange={(v) => handleChange('auto_visualize', v)}
                />
              </div>
            </FieldRow>

            <FieldRow label="Auto Report" scope={getScope('auto_report')}>
              <div className="flex items-center">
                <Switch
                  checked={(draft.auto_report as boolean) || false}
                  onCheckedChange={(v) => handleChange('auto_report', v)}
                />
              </div>
            </FieldRow>

            <FieldRow label="UAT Dispatch" scope={getScope('uat_dispatch')}>
              <div className="flex items-center">
                <Switch
                  checked={(draft.uat_dispatch as boolean) || false}
                  onCheckedChange={(v) => handleChange('uat_dispatch', v)}
                />
              </div>
            </FieldRow>
          </div>
        </Section>

        {/* 2. Phases */}
        <Section title="Phases">
          <div className="space-y-4">
            <FieldRow label="Skip Orchestration" scope={getScope('phases.skip_orchestration')}>
              <div className="flex items-center">
                <Switch
                  checked={((draft.phases as any)?.skip_orchestration as boolean) || false}
                  onCheckedChange={(v) => handleChange('phases.skip_orchestration', v)}
                />
              </div>
            </FieldRow>

            <FieldRow label="Skip Planning" scope={getScope('phases.skip_planning')}>
              <div className="flex items-center">
                <Switch
                  checked={((draft.phases as any)?.skip_planning as boolean) || false}
                  onCheckedChange={(v) => handleChange('phases.skip_planning', v)}
                />
              </div>
            </FieldRow>

            <FieldRow label="Skip Execution" scope={getScope('phases.skip_execution')}>
              <div className="flex items-center">
                <Switch
                  checked={((draft.phases as any)?.skip_execution as boolean) || false}
                  onCheckedChange={(v) => handleChange('phases.skip_execution', v)}
                />
              </div>
            </FieldRow>

            <FieldRow label="Skip Verification" scope={getScope('phases.skip_verification')}>
              <div className="flex items-center">
                <Switch
                  checked={((draft.phases as any)?.skip_verification as boolean) || false}
                  onCheckedChange={(v) => handleChange('phases.skip_verification', v)}
                />
              </div>
            </FieldRow>
          </div>
        </Section>

        {/* 3. Budget */}
        <Section title="Budget">
          <div className="space-y-4">
            <FieldRow label="Ceiling ($)" scope={getScope('budget.ceiling')}>
              <Input
                type="number"
                step="0.01"
                value={((draft.budget as any)?.ceiling as number) || 0}
                onChange={(e) => handleChange('budget.ceiling', parseFloat(e.target.value))}
                className="text-sm"
              />
            </FieldRow>

            <FieldRow label="Enforcement" scope={getScope('budget.enforcement')}>
              <Select
                value={((draft.budget as any)?.enforcement as string) || 'warn'}
                onValueChange={(v) => handleChange('budget.enforcement', v)}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="warn">Warn</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>

            <FieldRow
              label="Context Pause Threshold"
              scope={getScope('budget.context_pause_threshold')}
            >
              <Input
                type="number"
                step="0.01"
                value={((draft.budget as any)?.context_pause_threshold as number) || 0}
                onChange={(e) => handleChange('budget.context_pause_threshold', parseFloat(e.target.value))}
                className="text-sm"
              />
            </FieldRow>
          </div>
        </Section>

        {/* 4. Git */}
        <Section title="Git">
          <div className="space-y-4">
            <FieldRow label="Default Branch" scope={getScope('git.default_branch')}>
              <Input
                value={((draft.git as any)?.default_branch as string) || 'main'}
                onChange={(e) => handleChange('git.default_branch', e.target.value)}
                className="text-sm"
              />
            </FieldRow>

            <FieldRow label="Auto Commit" scope={getScope('git.auto_commit')}>
              <div className="flex items-center">
                <Switch
                  checked={((draft.git as any)?.auto_commit as boolean) || true}
                  onCheckedChange={(v) => handleChange('git.auto_commit', v)}
                />
              </div>
            </FieldRow>

            <FieldRow label="Commit Template" scope={getScope('git.commit_template')}>
              <Input
                value={((draft.git as any)?.commit_template as string) || ''}
                onChange={(e) => handleChange('git.commit_template', e.target.value)}
                placeholder="e.g., [GSD] {phase}: {title}"
                className="text-sm"
              />
            </FieldRow>

            <FieldRow label="GPG Sign Commits" scope={getScope('git.gpg_sign')}>
              <div className="flex items-center">
                <Switch
                  checked={((draft.git as any)?.gpg_sign as boolean) || false}
                  onCheckedChange={(v) => handleChange('git.gpg_sign', v)}
                />
              </div>
            </FieldRow>

            <FieldRow label="Author Name" scope={getScope('git.author_name')}>
              <Input
                value={((draft.git as any)?.author_name as string) || ''}
                onChange={(e) => handleChange('git.author_name', e.target.value)}
                className="text-sm"
              />
            </FieldRow>

            <FieldRow label="Author Email" scope={getScope('git.author_email')}>
              <Input
                value={((draft.git as any)?.author_email as string) || ''}
                onChange={(e) => handleChange('git.author_email', e.target.value)}
                className="text-sm"
              />
            </FieldRow>

            <FieldRow label="Push After Commit" scope={getScope('git.auto_push')}>
              <div className="flex items-center">
                <Switch
                  checked={((draft.git as any)?.auto_push as boolean) || false}
                  onCheckedChange={(v) => handleChange('git.auto_push', v)}
                />
              </div>
            </FieldRow>

            <FieldRow label="Create Branches" scope={getScope('git.create_branches')}>
              <div className="flex items-center">
                <Switch
                  checked={((draft.git as any)?.create_branches as boolean) || false}
                  onCheckedChange={(v) => handleChange('git.create_branches', v)}
                />
              </div>
            </FieldRow>

            <FieldRow label="Branch Naming Pattern" scope={getScope('git.branch_pattern')}>
              <Input
                value={((draft.git as any)?.branch_pattern as string) || ''}
                onChange={(e) => handleChange('git.branch_pattern', e.target.value)}
                placeholder="e.g., {phase}/{id}"
                className="text-sm"
              />
            </FieldRow>

            <FieldRow label="Exclude Paths" scope={getScope('git.exclude_paths')}>
              <StringArrayField
                value={((draft.git as any)?.exclude_paths as string[]) || []}
                onChange={(v) => handleChange('git.exclude_paths', v)}
              />
            </FieldRow>

            <FieldRow label="Merge Strategy" scope={getScope('git.merge_strategy')}>
              <Select
                value={((draft.git as any)?.merge_strategy as string) || 'squash'}
                onValueChange={(v) => handleChange('git.merge_strategy', v)}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="squash">Squash</SelectItem>
                  <SelectItem value="merge-commit">Merge Commit</SelectItem>
                  <SelectItem value="rebase">Rebase</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>

            <FieldRow label="Tag Releases" scope={getScope('git.tag_releases')}>
              <div className="flex items-center">
                <Switch
                  checked={((draft.git as any)?.tag_releases as boolean) || false}
                  onCheckedChange={(v) => handleChange('git.tag_releases', v)}
                />
              </div>
            </FieldRow>

            <FieldRow label="Tag Format" scope={getScope('git.tag_format')}>
              <Input
                value={((draft.git as any)?.tag_format as string) || ''}
                onChange={(e) => handleChange('git.tag_format', e.target.value)}
                placeholder="e.g., v{version}"
                className="text-sm"
              />
            </FieldRow>
          </div>
        </Section>

        {/* 5. Notifications */}
        <Section title="Notifications">
          <div className="space-y-4">
            <FieldRow label="Enabled" scope={getScope('notifications.enabled')}>
              <div className="flex items-center">
                <Switch
                  checked={((draft.notifications as any)?.enabled as boolean) || true}
                  onCheckedChange={(v) => handleChange('notifications.enabled', v)}
                />
              </div>
            </FieldRow>

            <FieldRow label="Phase Completion" scope={getScope('notifications.phase_completion')}>
              <div className="flex items-center">
                <Switch
                  checked={((draft.notifications as any)?.phase_completion as boolean) || true}
                  onCheckedChange={(v) => handleChange('notifications.phase_completion', v)}
                />
              </div>
            </FieldRow>

            <FieldRow label="Blocker Alert" scope={getScope('notifications.blocker_alert')}>
              <div className="flex items-center">
                <Switch
                  checked={((draft.notifications as any)?.blocker_alert as boolean) || true}
                  onCheckedChange={(v) => handleChange('notifications.blocker_alert', v)}
                />
              </div>
            </FieldRow>

            <FieldRow label="Budget Threshold" scope={getScope('notifications.budget_threshold')}>
              <div className="flex items-center">
                <Switch
                  checked={((draft.notifications as any)?.budget_threshold as boolean) || true}
                  onCheckedChange={(v) => handleChange('notifications.budget_threshold', v)}
                />
              </div>
            </FieldRow>

            <FieldRow label="Daily Digest" scope={getScope('notifications.daily_digest')}>
              <div className="flex items-center">
                <Switch
                  checked={((draft.notifications as any)?.daily_digest as boolean) || false}
                  onCheckedChange={(v) => handleChange('notifications.daily_digest', v)}
                />
              </div>
            </FieldRow>

            <FieldRow label="Desktop Notifications" scope={getScope('notifications.desktop')}>
              <div className="flex items-center">
                <Switch
                  checked={((draft.notifications as any)?.desktop as boolean) || false}
                  onCheckedChange={(v) => handleChange('notifications.desktop', v)}
                />
              </div>
            </FieldRow>
          </div>
        </Section>

        {/* 6. Skill Preferences */}
        <Section title="Skill Preferences">
          <div className="space-y-4">
            <FieldRow label="Always Load" scope={getScope('skill_preferences.always_load')}>
              <StringArrayField
                value={((draft.skill_preferences as any)?.always_load as string[]) || []}
                onChange={(v) => handleChange('skill_preferences.always_load', v)}
              />
            </FieldRow>

            <FieldRow label="Never Load" scope={getScope('skill_preferences.never_load')}>
              <StringArrayField
                value={((draft.skill_preferences as any)?.never_load as string[]) || []}
                onChange={(v) => handleChange('skill_preferences.never_load', v)}
              />
            </FieldRow>

            <FieldRow label="Prefer" scope={getScope('skill_preferences.prefer')}>
              <StringArrayField
                value={((draft.skill_preferences as any)?.prefer as string[]) || []}
                onChange={(v) => handleChange('skill_preferences.prefer', v)}
              />
            </FieldRow>

            <FieldRow label="Avoid" scope={getScope('skill_preferences.avoid')}>
              <StringArrayField
                value={((draft.skill_preferences as any)?.avoid as string[]) || []}
                onChange={(v) => handleChange('skill_preferences.avoid', v)}
              />
            </FieldRow>
          </div>
        </Section>

        {/* 7. Verification */}
        <Section title="Verification">
          <div className="space-y-4">
            <FieldRow label="Strict Mode" scope={getScope('verification.strict')}>
              <div className="flex items-center">
                <Switch
                  checked={((draft.verification as any)?.strict as boolean) || false}
                  onCheckedChange={(v) => handleChange('verification.strict', v)}
                />
              </div>
            </FieldRow>

            <FieldRow label="Require Manual Signoff" scope={getScope('verification.require_signoff')}>
              <div className="flex items-center">
                <Switch
                  checked={((draft.verification as any)?.require_signoff as boolean) || false}
                  onCheckedChange={(v) => handleChange('verification.require_signoff', v)}
                />
              </div>
            </FieldRow>

            <FieldRow label="Coverage Threshold (%)" scope={getScope('verification.coverage_threshold')}>
              <Input
                type="number"
                min="0"
                max="100"
                value={((draft.verification as any)?.coverage_threshold as number) || 80}
                onChange={(e) => handleChange('verification.coverage_threshold', parseInt(e.target.value))}
                className="text-sm"
              />
            </FieldRow>
          </div>
        </Section>

        {/* 8. Auto Supervisor */}
        <Section title="Auto Supervisor">
          <div className="space-y-4">
            <FieldRow label="Model" scope={getScope('auto_supervisor.model')}>
              <Input
                value={((draft.auto_supervisor as any)?.model as string) || ''}
                onChange={(e) => handleChange('auto_supervisor.model', e.target.value)}
                placeholder="e.g., claude-opus"
                className="text-sm"
              />
            </FieldRow>

            <FieldRow label="Check Interval (s)" scope={getScope('auto_supervisor.check_interval')}>
              <Input
                type="number"
                value={((draft.auto_supervisor as any)?.check_interval as number) || 60}
                onChange={(e) => handleChange('auto_supervisor.check_interval', parseInt(e.target.value))}
                className="text-sm"
              />
            </FieldRow>

            <FieldRow label="Timeout (s)" scope={getScope('auto_supervisor.timeout')}>
              <Input
                type="number"
                value={((draft.auto_supervisor as any)?.timeout as number) || 300}
                onChange={(e) => handleChange('auto_supervisor.timeout', parseInt(e.target.value))}
                className="text-sm"
              />
            </FieldRow>

            <FieldRow label="Retry Limit" scope={getScope('auto_supervisor.retry_limit')}>
              <Input
                type="number"
                value={((draft.auto_supervisor as any)?.retry_limit as number) || 3}
                onChange={(e) => handleChange('auto_supervisor.retry_limit', parseInt(e.target.value))}
                className="text-sm"
              />
            </FieldRow>
          </div>
        </Section>

        {/* S03/T01: 6 sections */}

        {/* 9. Models */}
        <Section title="Models">
          <div className="space-y-4">
            {(['orchestrator', 'large', 'standard', 'light', 'fast', 'embeddings'] as const).map((stage) => (
              <FieldRow key={stage} label={`${stage.charAt(0).toUpperCase() + stage.slice(1)}`} scope={getScope(`models.${stage}`)}>
                <Input
                  value={((draft.models as any)?.[stage] as string) || ''}
                  onChange={(e) => handleChange(`models.${stage}`, e.target.value)}
                  placeholder="e.g., claude-opus-4-5"
                  className="text-sm"
                />
              </FieldRow>
            ))}
          </div>
        </Section>

        {/* 10. cmux */}
        <Section title="cmux">
          <div className="space-y-4">
            <FieldRow label="Enabled" scope={getScope('cmux.enabled')}>
              <div className="flex items-center">
                <Switch
                  checked={((draft.cmux as any)?.enabled as boolean) || false}
                  onCheckedChange={(v) => handleChange('cmux.enabled', v)}
                />
              </div>
            </FieldRow>

            <FieldRow label="Strategy" scope={getScope('cmux.strategy')}>
              <Input
                value={((draft.cmux as any)?.strategy as string) || ''}
                onChange={(e) => handleChange('cmux.strategy', e.target.value)}
                className="text-sm"
              />
            </FieldRow>

            <FieldRow label="Max Parallel" scope={getScope('cmux.max_parallel')}>
              <Input
                type="number"
                value={((draft.cmux as any)?.max_parallel as number) || 2}
                onChange={(e) => handleChange('cmux.max_parallel', parseInt(e.target.value))}
                className="text-sm"
              />
            </FieldRow>

            <FieldRow label="Timeout (s)" scope={getScope('cmux.timeout')}>
              <Input
                type="number"
                value={((draft.cmux as any)?.timeout as number) || 30}
                onChange={(e) => handleChange('cmux.timeout', parseInt(e.target.value))}
                className="text-sm"
              />
            </FieldRow>

            <FieldRow label="Merge Results" scope={getScope('cmux.merge_results')}>
              <div className="flex items-center">
                <Switch
                  checked={((draft.cmux as any)?.merge_results as boolean) || true}
                  onCheckedChange={(v) => handleChange('cmux.merge_results', v)}
                />
              </div>
            </FieldRow>
          </div>
        </Section>

        {/* 11. Dynamic Routing */}
        <Section title="Dynamic Routing">
          <div className="space-y-4">
            <FieldRow label="Enabled" scope={getScope('dynamic_routing.enabled')}>
              <div className="flex items-center">
                <Switch
                  checked={((draft.dynamic_routing as any)?.enabled as boolean) || true}
                  onCheckedChange={(v) => handleChange('dynamic_routing.enabled', v)}
                />
              </div>
            </FieldRow>

            <FieldRow label="Adaptive Tier Selection" scope={getScope('dynamic_routing.adaptive_tier_selection')}>
              <div className="flex items-center">
                <Switch
                  checked={((draft.dynamic_routing as any)?.adaptive_tier_selection as boolean) || true}
                  onCheckedChange={(v) => handleChange('dynamic_routing.adaptive_tier_selection', v)}
                />
              </div>
            </FieldRow>

            <FieldRow label="Cost Optimization" scope={getScope('dynamic_routing.cost_optimization')}>
              <div className="flex items-center">
                <Switch
                  checked={((draft.dynamic_routing as any)?.cost_optimization as boolean) || false}
                  onCheckedChange={(v) => handleChange('dynamic_routing.cost_optimization', v)}
                />
              </div>
            </FieldRow>

            <FieldRow label="Quality-First" scope={getScope('dynamic_routing.quality_first')}>
              <div className="flex items-center">
                <Switch
                  checked={((draft.dynamic_routing as any)?.quality_first as boolean) || true}
                  onCheckedChange={(v) => handleChange('dynamic_routing.quality_first', v)}
                />
              </div>
            </FieldRow>

            <FieldRow label="Fallback on Error" scope={getScope('dynamic_routing.fallback_on_error')}>
              <div className="flex items-center">
                <Switch
                  checked={((draft.dynamic_routing as any)?.fallback_on_error as boolean) || true}
                  onCheckedChange={(v) => handleChange('dynamic_routing.fallback_on_error', v)}
                />
              </div>
            </FieldRow>

            <div className="border-t pt-3">
              <p className="text-xs font-semibold mb-3">Tier Models</p>
              <div className="space-y-3 pl-2">
                {(['light', 'standard', 'heavy'] as const).map((tier) => (
                  <FieldRow
                    key={`tier-${tier}`}
                    label={`${tier.charAt(0).toUpperCase() + tier.slice(1)}`}
                    scope={getScope(`dynamic_routing.tier_models.${tier}`)}
                  >
                    <Input
                      value={((draft.dynamic_routing as any)?.tier_models?.[tier] as string) || ''}
                      onChange={(e) => handleChange(`dynamic_routing.tier_models.${tier}`, e.target.value)}
                      placeholder="e.g., claude-opus"
                      className="text-sm"
                    />
                  </FieldRow>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* 12. Parallel */}
        <Section title="Parallel">
          <div className="space-y-4">
            <FieldRow label="Enabled" scope={getScope('parallel.enabled')}>
              <div className="flex items-center">
                <Switch
                  checked={((draft.parallel as any)?.enabled as boolean) || false}
                  onCheckedChange={(v) => handleChange('parallel.enabled', v)}
                />
              </div>
            </FieldRow>

            <FieldRow label="Max Concurrent" scope={getScope('parallel.max_concurrent')}>
              <Input
                type="number"
                min="1"
                value={((draft.parallel as any)?.max_concurrent as number) || 2}
                onChange={(e) => handleChange('parallel.max_concurrent', parseInt(e.target.value))}
                className="text-sm"
              />
            </FieldRow>

            <FieldRow label="Timeout per Unit (s)" scope={getScope('parallel.timeout_per_unit')}>
              <Input
                type="number"
                value={((draft.parallel as any)?.timeout_per_unit as number) || 300}
                onChange={(e) => handleChange('parallel.timeout_per_unit', parseInt(e.target.value))}
                className="text-sm"
              />
            </FieldRow>

            <FieldRow label="Merge Strategy" scope={getScope('parallel.merge_strategy')}>
              <Select
                value={((draft.parallel as any)?.merge_strategy as string) || 'sequential'}
                onValueChange={(v) => handleChange('parallel.merge_strategy', v)}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sequential">Sequential</SelectItem>
                  <SelectItem value="interleaved">Interleaved</SelectItem>
                  <SelectItem value="aggregated">Aggregated</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>
          </div>
        </Section>

        {/* 13. Remote Questions */}
        <Section title="Remote Questions">
          <div className="space-y-4">
            <FieldRow label="Channel" scope={getScope('remote_questions.channel')}>
              <Select
                value={((draft.remote_questions as any)?.channel as string) || 'slack'}
                onValueChange={(v) => handleChange('remote_questions.channel', v)}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="slack">Slack</SelectItem>
                  <SelectItem value="discord">Discord</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>

            <FieldRow label="Workspace/Guild" scope={getScope('remote_questions.workspace')}>
              <Input
                value={((draft.remote_questions as any)?.workspace as string) || ''}
                onChange={(e) => handleChange('remote_questions.workspace', e.target.value)}
                className="text-sm"
              />
            </FieldRow>

            <FieldRow label="Channel Name" scope={getScope('remote_questions.channel_name')}>
              <Input
                value={((draft.remote_questions as any)?.channel_name as string) || ''}
                onChange={(e) => handleChange('remote_questions.channel_name', e.target.value)}
                className="text-sm"
              />
            </FieldRow>

            <FieldRow label="Timeout (minutes)" scope={getScope('remote_questions.timeout_minutes')}>
              <Input
                type="number"
                value={((draft.remote_questions as any)?.timeout_minutes as number) || 15}
                onChange={(e) => handleChange('remote_questions.timeout_minutes', parseInt(e.target.value))}
                className="text-sm"
              />
            </FieldRow>
          </div>
        </Section>

        {/* 14. Experimental */}
        <Section title="Experimental">
          <div className="space-y-4">
            <FieldRow
              label="RTK Env Override"
              helpText="Set RTK_CONTEXT_TOKENS env var instead of using budget ceiling"
              scope={getScope('experimental.rtk')}
            >
              <div className="flex items-center">
                <Switch
                  checked={((draft.experimental as any)?.rtk as boolean) || false}
                  onCheckedChange={(v) => handleChange('experimental.rtk', v)}
                />
              </div>
            </FieldRow>
          </div>
        </Section>

        {/* S04/T01: Hooks editors */}

        {/* 15. Pre-unit Hooks */}
        <Section title="Pre-unit Hooks">
          <HookEditor
            hooks={((draft.hooks as any)?.pre_unit as PreferencesHookEntry[]) || []}
            onChange={(v) => handleChange('hooks.pre_unit', v)}
          />
        </Section>

        {/* 16. Post-unit Hooks */}
        <Section title="Post-unit Hooks">
          <HookEditor
            hooks={((draft.hooks as any)?.post_unit as PreferencesHookEntry[]) || []}
            onChange={(v) => handleChange('hooks.post_unit', v)}
          />
        </Section>
      </div>
    </div>
  );
}
