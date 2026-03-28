// GSD Vibe - Shared Preferences UI Primitives
// Used by both the project preferences tab and the global preferences page.
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2, X, Check, ChevronsUpDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { PreferencesHookEntry } from '@/lib/tauri';

// ── Scope badge ───────────────────────────────────────────────────────────────

export type ScopeOrigin = 'project' | 'global' | 'default';

export function ScopeBadge({ scope }: { scope: ScopeOrigin }) {
  const classes: Record<ScopeOrigin, string> = {
    project: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
    global:  'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
    default: 'bg-muted text-muted-foreground border-border',
  };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${classes[scope]}`}>
      {scope}
    </span>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────

export function Section({ title, defaultOpen = true, children }: {
  title: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/40 hover:bg-muted/60 transition-colors text-left">
        <span className="font-medium text-sm">{title}</span>
        {open
          ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
          : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="p-4 space-y-4">{children}</div>}
    </div>
  );
}

// ── FieldRow ──────────────────────────────────────────────────────────────────

export function FieldRow({ label, description, scope, children }: {
  label: string; description?: string; scope?: ScopeOrigin; children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-medium text-foreground">{label}</span>
          {scope && <ScopeBadge scope={scope} />}
        </div>
        {description && <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>}
      </div>
      <div className="shrink-0 flex items-start pt-0.5">{children}</div>
    </div>
  );
}

// ── ToggleField ───────────────────────────────────────────────────────────────

export function ToggleField({ label, description, scope, fieldKey, value, onChange }: {
  label: string; description?: string; scope?: ScopeOrigin;
  fieldKey: string; value: boolean; onChange: (key: string, val: boolean) => void;
}) {
  const id = `pref-toggle-${fieldKey}`;
  return (
    <FieldRow label={label} description={description} scope={scope}>
      <Switch id={id} checked={value} onCheckedChange={v => onChange(fieldKey, v)} />
      <Label htmlFor={id} className="sr-only">{label}</Label>
    </FieldRow>
  );
}

// ── SelectField ───────────────────────────────────────────────────────────────

const NONE = '__none__';

export function SelectField({ label, description, scope, fieldKey, value, options, onChange }: {
  label: string; description?: string; scope?: ScopeOrigin;
  fieldKey: string; value: string;
  options: { value: string; label: string }[];
  onChange: (key: string, val: string) => void;
}) {
  const sv = value || NONE;
  return (
    <FieldRow label={label} description={description} scope={scope}>
      <Select value={sv} onValueChange={v => onChange(fieldKey, v === NONE ? '' : v)}>
        <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
        <SelectContent>
          {options.map(o => (
            <SelectItem key={o.value || NONE} value={o.value || NONE} className="text-xs">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldRow>
  );
}

// ── NumberField ───────────────────────────────────────────────────────────────

export function NumberField({ label, description, scope, fieldKey, value, min, max, placeholder, onChange }: {
  label: string; description?: string; scope?: ScopeOrigin;
  fieldKey: string; value: number | undefined; min?: number; max?: number; placeholder?: string;
  onChange: (key: string, val: number | undefined) => void;
}) {
  return (
    <FieldRow label={label} description={description} scope={scope}>
      <Input type="number" className="w-24 h-8 text-xs" value={value ?? ''}
        min={min} max={max} placeholder={placeholder ?? '—'}
        onChange={e => onChange(fieldKey, e.target.value === '' ? undefined : Number(e.target.value))} />
    </FieldRow>
  );
}

// ── TextField ─────────────────────────────────────────────────────────────────

export function TextField({ label, description, scope, fieldKey, value, placeholder, onChange }: {
  label: string; description?: string; scope?: ScopeOrigin;
  fieldKey: string; value: string; placeholder?: string;
  onChange: (key: string, val: string) => void;
}) {
  return (
    <FieldRow label={label} description={description} scope={scope}>
      <Input type="text" className="w-48 h-8 text-xs" value={value}
        placeholder={placeholder ?? '—'}
        onChange={e => onChange(fieldKey, e.target.value)} />
    </FieldRow>
  );
}

// ── StringArrayField ──────────────────────────────────────────────────────────

export function StringArrayField({ label, description, scope, fieldKey, value, placeholder, onChange }: {
  label: string; description?: string; scope?: ScopeOrigin;
  fieldKey: string; value: string[]; placeholder?: string;
  onChange: (key: string, val: string[]) => void;
}) {
  const [raw, setRaw] = useState(value.join(', '));
  useEffect(() => { setRaw(value.join(', ')); }, [value]);
  const handleBlur = useCallback(() => {
    onChange(fieldKey, raw.split(/,\s*/).map(s => s.trim()).filter(Boolean));
  }, [raw, fieldKey, onChange]);
  return (
    <FieldRow label={label} description={description} scope={scope}>
      <Input type="text" className="w-72 h-8 text-xs" value={raw}
        placeholder={placeholder ?? 'item1, item2'}
        onChange={e => setRaw(e.target.value)} onBlur={handleBlur} />
    </FieldRow>
  );
}

// ── LinesArrayField ───────────────────────────────────────────────────────────

export function LinesArrayField({ label, description, scope, fieldKey, value, placeholder, onChange }: {
  label: string; description?: string; scope?: ScopeOrigin;
  fieldKey: string; value: string[]; placeholder?: string;
  onChange: (key: string, val: string[]) => void;
}) {
  const [raw, setRaw] = useState(value.join('\n'));
  useEffect(() => { setRaw(value.join('\n')); }, [value]);
  const handleBlur = useCallback(() => {
    onChange(fieldKey, raw.split('\n').map(s => s.trim()).filter(Boolean));
  }, [raw, fieldKey, onChange]);
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {scope && <ScopeBadge scope={scope} />}
      </div>
      {description && <p className="text-xs text-muted-foreground mb-2 leading-relaxed">{description}</p>}
      <Textarea className="text-xs font-mono resize-none" rows={4} value={raw}
        placeholder={placeholder ?? 'one item per line'}
        onChange={e => setRaw(e.target.value)} onBlur={handleBlur} />
    </div>
  );
}

// ── Draft helpers ─────────────────────────────────────────────────────────────

function getNestedVal(obj: Record<string, unknown>, dotKey: string): unknown {
  return dotKey.split('.').reduce<unknown>(
    (cur, p) => cur != null && typeof cur === 'object' ? (cur as Record<string, unknown>)[p] : undefined,
    obj,
  );
}

export function getStr(obj: Record<string, unknown>, key: string, fb = ''): string {
  const v = key.includes('.') ? getNestedVal(obj, key) : obj[key];
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return fb;
}

export function getBool(obj: Record<string, unknown>, key: string, fb = false): boolean {
  const v = key.includes('.') ? getNestedVal(obj, key) : obj[key];
  if (typeof v === 'boolean') return v;
  if (v === 'true') return true;
  if (v === 'false') return false;
  return fb;
}

export function getNum(obj: Record<string, unknown>, key: string): number | undefined {
  const v = key.includes('.') ? getNestedVal(obj, key) : obj[key];
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v !== '') return Number(v);
  return undefined;
}

export function getArr(obj: Record<string, unknown>, key: string): string[] {
  const v = obj[key];
  if (Array.isArray(v)) return v.map(String);
  return [];
}

export function scopeOf(scopes: Record<string, string>, key: string): ScopeOrigin {
  const s = scopes[key];
  if (s === 'project' || s === 'global') return s;
  return 'default';
}

export function setDraftField(draft: Record<string, unknown>, key: string, value: unknown): Record<string, unknown> {
  const parts = key.split('.');
  if (parts.length === 1) return { ...draft, [key]: value };
  const [parent, ...rest] = parts;
  const parentObj = typeof draft[parent] === 'object' && draft[parent] !== null
    ? { ...(draft[parent] as Record<string, unknown>) }
    : {};
  return { ...draft, [parent]: setDraftField(parentObj, rest.join('.'), value) };
}

// ── Hook editor ───────────────────────────────────────────────────────────────

export const KNOWN_UNIT_TYPES = [
  'research-milestone', 'plan-milestone', 'research-slice', 'plan-slice',
  'execute-task', 'complete-slice', 'replan-slice', 'reassess-roadmap', 'run-uat',
];

function CheckboxGroupField({ label, options, value, onChange }: {
  label: string; options: string[]; value: string[]; onChange: (val: string[]) => void;
}) {
  const toggle = (opt: string) =>
    onChange(value.includes(opt) ? value.filter(v => v !== opt) : [...value, opt]);
  return (
    <div>
      <Label className="text-xs font-medium mb-2 block">{label}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button key={opt} type="button" onClick={() => toggle(opt)}
            className={`px-2 py-1 rounded text-xs border transition-colors ${
              value.includes(opt)
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-muted-foreground border-border hover:border-foreground/40'
            }`}
            aria-pressed={value.includes(opt)}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

type HookFormErrors = Partial<Record<string, string>>;

function validateHook(entry: PreferencesHookEntry, hookType: 'post' | 'pre'): HookFormErrors {
  const errors: HookFormErrors = {};
  if (!entry.name?.trim()) errors.name = 'Name is required';
  if (hookType === 'post' && !entry.prompt?.trim()) errors.prompt = 'Prompt is required';
  if (hookType === 'pre' && entry.action === 'replace' && !entry.prompt?.trim())
    errors.prompt = 'Prompt is required for replace action';
  if (hookType === 'pre' && entry.action === 'modify' && !entry.prepend?.trim() && !entry.append?.trim())
    errors.prepend = 'At least one of prepend or append is required for modify action';
  return errors;
}

function HookForm({ hookType, initial, onSave, onCancel }: {
  hookType: 'post' | 'pre'; initial: PreferencesHookEntry;
  onSave: (entry: PreferencesHookEntry) => void; onCancel: () => void;
}) {
  const [form, setForm] = useState<PreferencesHookEntry>({ ...initial });
  const [errors, setErrors] = useState<HookFormErrors>({});
  const set = (key: keyof PreferencesHookEntry, value: unknown) =>
    setForm(prev => ({ ...prev, [key]: value }));
  const action = form.action ?? 'modify';

  const handleSave = () => {
    const errs = validateHook(form, hookType);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    onSave(form);
  };

  return (
    <div className="border border-border rounded-lg p-4 bg-muted/20 space-y-3">
      <div>
        <Label className="text-xs font-medium mb-1 block">Name *</Label>
        <Input className={`h-8 text-xs ${errors.name ? 'border-destructive' : ''}`}
          value={form.name ?? ''} placeholder="my-hook" onChange={e => set('name', e.target.value)} />
        {errors.name && <p className="text-xs text-destructive mt-0.5">{errors.name}</p>}
      </div>

      {hookType === 'post' ? (
        <CheckboxGroupField label="Triggers (after)" options={KNOWN_UNIT_TYPES}
          value={form.after ?? []} onChange={v => set('after', v)} />
      ) : (
        <CheckboxGroupField label="Intercepts (before)" options={KNOWN_UNIT_TYPES}
          value={form.before ?? []} onChange={v => set('before', v)} />
      )}

      {hookType === 'pre' && (
        <div>
          <Label className="text-xs font-medium mb-1 block">Action</Label>
          <Select value={action} onValueChange={v => set('action', v)}>
            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="modify" className="text-xs">modify</SelectItem>
              <SelectItem value="skip" className="text-xs">skip</SelectItem>
              <SelectItem value="replace" className="text-xs">replace</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {(hookType === 'post' || action === 'replace') && (
        <div>
          <Label className="text-xs font-medium mb-1 block">
            Prompt *{' '}
            <span className="text-muted-foreground font-normal">
              Supports {'{milestoneId}'}, {'{sliceId}'}, {'{taskId}'}
            </span>
          </Label>
          <Textarea className={`text-xs font-mono resize-none ${errors.prompt ? 'border-destructive' : ''}`}
            rows={3} value={form.prompt ?? ''}
            placeholder="Summarize what changed in {milestoneId}/{sliceId}/{taskId}"
            onChange={e => set('prompt', e.target.value)} />
          {errors.prompt && <p className="text-xs text-destructive mt-0.5">{errors.prompt}</p>}
        </div>
      )}

      {hookType === 'pre' && action === 'modify' && (
        <>
          <div>
            <Label className="text-xs font-medium mb-1 block">Prepend</Label>
            <Input className={`h-8 text-xs ${errors.prepend ? 'border-destructive' : ''}`}
              value={form.prepend ?? ''} placeholder="Text to prepend to the prompt"
              onChange={e => set('prepend', e.target.value)} />
            {errors.prepend && <p className="text-xs text-destructive mt-0.5">{errors.prepend}</p>}
          </div>
          <div>
            <Label className="text-xs font-medium mb-1 block">Append</Label>
            <Input className="h-8 text-xs" value={form.append ?? ''}
              placeholder="Text to append to the prompt"
              onChange={e => set('append', e.target.value)} />
          </div>
        </>
      )}

      {hookType === 'pre' && action === 'skip' && (
        <div>
          <Label className="text-xs font-medium mb-1 block">Skip If (file path)</Label>
          <Input className="h-8 text-xs" value={form.skip_if ?? ''}
            placeholder="relative/path/to/file"
            onChange={e => set('skip_if', e.target.value)} />
        </div>
      )}

      {hookType === 'pre' && action === 'replace' && (
        <div>
          <Label className="text-xs font-medium mb-1 block">Unit Type Override</Label>
          <Input className="h-8 text-xs" value={form.unit_type ?? ''}
            placeholder="execute-task"
            onChange={e => set('unit_type', e.target.value)} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-medium mb-1 block">Model (override)</Label>
          <Input className="h-8 text-xs" value={form.model ?? ''}
            placeholder="— (use active)" onChange={e => set('model', e.target.value)} />
        </div>
        {hookType === 'post' && (
          <>
            <div>
              <Label className="text-xs font-medium mb-1 block">Max Cycles</Label>
              <Input type="number" className="h-8 text-xs" value={form.max_cycles ?? ''}
                min={1} max={10} placeholder="1"
                onChange={e => set('max_cycles', e.target.value === '' ? undefined : Number(e.target.value))} />
            </div>
            <div>
              <Label className="text-xs font-medium mb-1 block">Artifact</Label>
              <Input className="h-8 text-xs" value={form.artifact ?? ''}
                placeholder="output.md" onChange={e => set('artifact', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs font-medium mb-1 block">Retry On</Label>
              <Input className="h-8 text-xs" value={form.retry_on ?? ''}
                placeholder="RETRY.md" onChange={e => set('retry_on', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs font-medium mb-1 block">Agent</Label>
              <Input className="h-8 text-xs" value={form.agent ?? ''}
                placeholder="worker" onChange={e => set('agent', e.target.value)} />
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Switch id="hook-form-enabled" checked={form.enabled !== false}
          onCheckedChange={v => set('enabled', v)} />
        <Label htmlFor="hook-form-enabled" className="text-xs">Enabled</Label>
      </div>

      <div className="flex gap-2 pt-1">
        <Button size="sm" className="h-7 text-xs gap-1" onClick={handleSave}>
          <Check className="w-3 h-3" /> Save Hook
        </Button>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={onCancel}>
          <X className="w-3 h-3" /> Cancel
        </Button>
      </div>
    </div>
  );
}

export function HookEditor({ hookType, hooks, onChange }: {
  hookType: 'post' | 'pre'; hooks: PreferencesHookEntry[];
  onChange: (hooks: PreferencesHookEntry[]) => void;
}) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  const emptyHook: PreferencesHookEntry = hookType === 'post'
    ? { name: '', after: [], prompt: '', enabled: true }
    : { name: '', before: [], action: 'modify', enabled: true };

  const handleSave = (entry: PreferencesHookEntry, index: number | null) => {
    if (index === null) {
      onChange([...hooks, entry]);
    } else {
      const next = [...hooks]; next[index] = entry; onChange(next);
    }
    setEditingIndex(null); setAddingNew(false);
  };

  const handleDelete = (index: number) => {
    const next = [...hooks]; next.splice(index, 1); onChange(next); setDeleteIndex(null);
  };

  return (
    <div className="space-y-3">
      {hooks.length === 0 && !addingNew && (
        <p className="text-xs text-muted-foreground">No hooks defined.</p>
      )}

      {hooks.map((hook, i) => (
        <div key={i}>
          {editingIndex === i ? (
            <HookForm hookType={hookType} initial={hook}
              onSave={entry => handleSave(entry, i)} onCancel={() => setEditingIndex(null)} />
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg bg-background text-xs">
              <Switch checked={hook.enabled !== false}
                onCheckedChange={v => { const n = [...hooks]; n[i] = { ...n[i], enabled: v }; onChange(n); }}
                className="shrink-0" />
              <span className="font-medium w-32 truncate">{hook.name || '—'}</span>
              <span className="text-muted-foreground flex-1 truncate">
                {hookType === 'post'
                  ? `after: ${(hook.after ?? []).join(', ') || '—'}`
                  : `before: ${(hook.before ?? []).join(', ') || '—'} · ${hook.action ?? 'modify'}`}
              </span>
              {hook.prompt && (
                <span className="text-muted-foreground italic truncate max-w-48">
                  {hook.prompt.slice(0, 60)}{hook.prompt.length > 60 ? '…' : ''}
                </span>
              )}
              <div className="flex gap-1 shrink-0 ml-auto">
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0"
                  onClick={() => { setEditingIndex(i); setAddingNew(false); }} title="Edit">
                  <Pencil className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                  onClick={() => setDeleteIndex(i)} title="Delete">
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}

      {addingNew && (
        <HookForm hookType={hookType} initial={emptyHook}
          onSave={entry => handleSave(entry, null)} onCancel={() => setAddingNew(false)} />
      )}

      {!addingNew && editingIndex === null && (
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5"
          onClick={() => setAddingNew(true)}>
          <Plus className="w-3 h-3" /> Add Hook
        </Button>
      )}

      <AlertDialog open={deleteIndex !== null} onOpenChange={o => { if (!o) setDeleteIndex(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete hook?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove{' '}
              <strong>{deleteIndex !== null ? (hooks[deleteIndex]?.name || 'this hook') : ''}</strong>{' '}
              from the list. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteIndex !== null && handleDelete(deleteIndex)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Portal dropdown helper ────────────────────────────────────────────────────
// Renders dropdown content at a computed viewport position so it escapes all
// overflow:hidden/auto ancestors. Used by ComboboxField and ModelComboboxField.

function useDropdownPosition(triggerRef: React.RefObject<HTMLElement | null>, open: boolean, dropWidth = 288) {
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    if (!open || !triggerRef.current) { setPos(null); return; }
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow > 50 ? rect.bottom + 4 : rect.top - Math.min(320, window.innerHeight - 16) - 4;
    // Right-align to trigger if left-aligned would overflow; always stay within viewport
    const leftAligned = rect.left;
    const rightAligned = rect.right - dropWidth;
    const left = leftAligned + dropWidth > window.innerWidth - 8
      ? Math.max(8, rightAligned)
      : leftAligned;
    setPos({ top, left, width: rect.width });
  }, [open, triggerRef, dropWidth]);

  return pos;
}

// ── ComboboxField ─────────────────────────────────────────────────────────────

export function ComboboxField({ label, description, scope, fieldKey, value, suggestions, placeholder, onChange }: {
  label: string; description?: string; scope?: ScopeOrigin;
  fieldKey: string; value: string;
  suggestions: { value: string; label: string }[];
  placeholder?: string;
  onChange: (key: string, val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [inputVal, setInputVal] = useState(value);
  const triggerRef = useRef<HTMLDivElement>(null);
  const comboW = 192;
  const pos = useDropdownPosition(triggerRef, open, comboW);

  useEffect(() => { setInputVal(value); }, [value]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const commit = (val: string) => {
    setInputVal(val); onChange(fieldKey, val); setOpen(false);
  };

  const filtered = inputVal
    ? suggestions.filter(s =>
        s.value.toLowerCase().includes(inputVal.toLowerCase()) ||
        s.label.toLowerCase().includes(inputVal.toLowerCase()))
    : suggestions;

  return (
    <FieldRow label={label} description={description} scope={scope}>
      <div ref={triggerRef} className="relative w-48">
        <Input className="h-8 text-xs pr-7" value={inputVal}
          placeholder={placeholder ?? '—'}
          onChange={e => { setInputVal(e.target.value); onChange(fieldKey, e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)} />
        <button type="button" onClick={() => setOpen(o => !o)}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
          <ChevronsUpDown className="w-3.5 h-3.5" />
        </button>
        {open && pos && filtered.length > 0 && createPortal(
          <div style={{
            position: 'fixed', top: pos.top, left: pos.left, width: comboW, zIndex: 9999,
            maxHeight: 192, overflowY: 'auto',
            backgroundColor: 'hsl(var(--popover))',
            color: 'hsl(var(--popover-foreground))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '6px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
          }}>
            {filtered.map(s => (
              <button key={s.value} type="button"
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors flex items-center gap-2 ${s.value === inputVal ? 'bg-accent font-medium' : ''}`}
                onMouseDown={e => { e.preventDefault(); commit(s.value); }}>
                {s.value === inputVal && <Check className="w-3 h-3 shrink-0" />}
                <span className="truncate">{s.label}</span>
              </button>
            ))}
          </div>,
          document.body
        )}
      </div>
    </FieldRow>
  );
}

// ── ModelComboboxField ────────────────────────────────────────────────────────

import type { GsdModelEntry } from '@/lib/tauri';

// Strip trailing context/pricing info from model names returned by gsd --list-models.
// Raw format example: "Z.ai: GLM 5 Turbo 202.752K 131.072K yes"
// We keep everything up to the first token that looks like a size (NNN.NNNk).
function cleanModelName(name: string, id: string): string {
  if (!name || name === id) return id;
  let n = name.trim();
  // Remove leading model ID if CLI accidentally prepended it
  if (n.toLowerCase().startsWith(id.toLowerCase())) n = n.slice(id.length).trim();
  // Strip trailing size/numeric tokens: "202.752K 131.072K yes"
  n = n.replace(/\s+\d[\d.]*[KMBTkmbt].*$/i, '').trim();
  n = n.replace(/\s+\d[\d.]*\s*$/, '').trim();
  return n || id;
}

export function ModelComboboxField({ label, description, scope, fieldKey, value, models, onChange }: {
  label: string; description?: string; scope?: ScopeOrigin;
  fieldKey: string; value: string;
  models: GsdModelEntry[];
  onChange: (key: string, val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [inputVal, setInputVal] = useState(value);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pos = useDropdownPosition(triggerRef, open);

  useEffect(() => { setInputVal(value); }, [value]);

  useEffect(() => {
    if (!open) return;
    setTimeout(() => searchRef.current?.focus(), 50);
    const handler = (e: MouseEvent) => {
      const inTrigger = triggerRef.current?.contains(e.target as Node);
      const inDrop = dropdownRef.current?.contains(e.target as Node);
      if (!inTrigger && !inDrop) { setOpen(false); setSearch(''); }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const commit = (id: string) => {
    setInputVal(id); onChange(fieldKey, id); setOpen(false); setSearch('');
  };

  const groups = models.reduce<Record<string, GsdModelEntry[]>>((acc, m) => {
    (acc[m.provider] ??= []).push(m);
    return acc;
  }, {});

  const filterStr = search.toLowerCase();
  const filteredGroups = Object.entries(groups).reduce<Record<string, GsdModelEntry[]>>((acc, [provider, entries]) => {
    const matched = filterStr
      ? entries.filter(e =>
          e.id.toLowerCase().includes(filterStr) ||
          cleanModelName(e.name, e.id).toLowerCase().includes(filterStr) ||
          provider.toLowerCase().includes(filterStr))
      : entries;
    if (matched.length) acc[provider] = matched;
    return acc;
  }, {});

  const matchedModel = models.find(m => m.id === inputVal);
  const displayLabel = matchedModel ? cleanModelName(matchedModel.name, matchedModel.id) : inputVal;

  return (
    <FieldRow label={label} description={description} scope={scope}>
      <div className="w-64">
        <button ref={triggerRef} type="button" onClick={() => setOpen(o => !o)}
          className="w-full h-8 px-3 text-xs border border-input rounded-md bg-background flex items-center justify-between gap-2 hover:bg-accent/50 transition-colors">
          <span className={`truncate ${inputVal ? 'text-foreground' : 'text-muted-foreground'}`}>
            {inputVal ? displayLabel : '— (use active model)'}
          </span>
          <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        </button>

        {open && pos && createPortal(
          <div ref={dropdownRef}
            style={{
              position: 'fixed',
              top: pos.top,
              left: pos.left,
              width: 288,
              zIndex: 9999,
              backgroundColor: 'hsl(var(--popover))',
              color: 'hsl(var(--popover-foreground))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
            }}>

            {/* Search */}
            <div className="p-2 border-b border-border shrink-0" style={{ backgroundColor: 'hsl(var(--popover))' }}>
              <div className="flex items-center gap-1.5 px-2 py-1 border border-input rounded bg-background">
                <Search className="w-3 h-3 text-muted-foreground shrink-0" />
                <input ref={searchRef}
                  className="flex-1 text-xs bg-transparent outline-none placeholder:text-muted-foreground"
                  placeholder="Search models…" value={search}
                  onChange={e => setSearch(e.target.value)} />
              </div>
            </div>

            <div style={{ overflowY: 'auto', maxHeight: Math.min(320, window.innerHeight - pos.top - 8) - 88 }}>
              {/* Clear */}
              <button type="button" onMouseDown={e => { e.preventDefault(); commit(''); }}
                className={`w-full text-left px-3 py-1.5 text-xs text-muted-foreground italic hover:bg-accent transition-colors ${!inputVal ? 'bg-accent' : ''}`}>
                — (use active model)
              </button>

              {/* Custom value not in list */}
              {inputVal && !models.find(m => m.id === inputVal) && (
                <button type="button" onMouseDown={e => { e.preventDefault(); commit(inputVal); }}
                  className="w-full text-left px-3 py-1.5 text-xs bg-accent font-medium flex items-center gap-2">
                  <Check className="w-3 h-3 shrink-0" />
                  <span className="truncate font-mono">{inputVal}</span>
                  <span className="text-muted-foreground ml-auto shrink-0">(custom)</span>
                </button>
              )}

              {Object.entries(filteredGroups).sort(([a], [b]) => a.localeCompare(b)).map(([provider, entries]) => (
                <div key={provider}>
                  <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/40 sticky top-0">
                    {provider}
                  </div>
                  {entries.map(m => {
                    const name = cleanModelName(m.name, m.id);
                    return (
                      <button key={m.id} type="button"
                        onMouseDown={e => { e.preventDefault(); commit(m.id); }}
                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors flex items-center gap-2 ${m.id === inputVal ? 'bg-accent' : ''}`}>
                        {m.id === inputVal && <Check className="w-3 h-3 shrink-0" />}
                        <div className="min-w-0">
                          <div className="truncate">{name}</div>
                          <div className="text-[10px] text-muted-foreground font-mono truncate">{m.id}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}

              {Object.keys(filteredGroups).length === 0 && search && (
                <div className="px-3 py-3 text-xs text-muted-foreground text-center">
                  No models match "{search}"
                  <br />
                  <button type="button" className="text-primary underline mt-1"
                    onMouseDown={e => { e.preventDefault(); commit(search); }}>
                    Use "{search}" as custom ID
                  </button>
                </div>
              )}
            </div>

            {/* Free-type footer */}
            <div className="border-t border-border p-2 shrink-0" style={{ backgroundColor: 'hsl(var(--popover))' }}>
              <input
                className="w-full h-7 px-2 text-xs border border-input rounded bg-background font-mono placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring"
                placeholder="bedrock/claude-sonnet-4-5 (custom)"
                value={inputVal}
                onChange={e => { setInputVal(e.target.value); onChange(fieldKey, e.target.value); }} />
            </div>
          </div>,
          document.body
        )}
      </div>
    </FieldRow>
  );
}

// ── SkillTagField ─────────────────────────────────────────────────────────────
// Tag chip selector for skill lists. Click to toggle. Unknown skills shown
// as removable custom chips.

export const KNOWN_SKILLS = [
  'accessibility', 'agent-browser', 'best-practices', 'code-optimizer',
  'core-web-vitals', 'create-gsd-extension', 'create-skill', 'create-workflow',
  'debug-like-expert', 'frontend-design', 'gh', 'github-workflows',
  'lint', 'make-interfaces-feel-better', 'react-best-practices',
  'review', 'swiftui', 'test', 'userinterface-wiki',
  'web-design-guidelines', 'web-quality-audit',
].sort();

export function SkillTagField({ label, description, scope, fieldKey, value, onChange }: {
  label: string; description?: string; scope?: ScopeOrigin;
  fieldKey: string; value: string[];
  onChange: (key: string, val: string[]) => void;
}) {
  const [customInput, setCustomInput] = useState('');

  const toggle = (skill: string) => {
    const next = value.includes(skill) ? value.filter(s => s !== skill) : [...value, skill];
    onChange(fieldKey, next);
  };

  const addCustom = () => {
    const trimmed = customInput.trim();
    if (trimmed && !value.includes(trimmed)) onChange(fieldKey, [...value, trimmed]);
    setCustomInput('');
  };

  // Custom skills = in value but not in KNOWN_SKILLS
  const customSkills = value.filter(s => !KNOWN_SKILLS.includes(s));

  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {scope && <ScopeBadge scope={scope} />}
      </div>
      {description && <p className="text-xs text-muted-foreground mb-2 leading-relaxed">{description}</p>}

      {/* Known skill chips */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {KNOWN_SKILLS.map(skill => {
          const active = value.includes(skill);
          return (
            <button key={skill} type="button" onClick={() => toggle(skill)}
              className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${
                active
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground'
              }`}
              aria-pressed={active}>
              {active && <Check className="w-2.5 h-2.5 inline mr-0.5" />}
              {skill}
            </button>
          );
        })}
      </div>

      {/* Custom skill chips */}
      {customSkills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {customSkills.map(skill => (
            <span key={skill} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
              {skill}
              <button type="button" onClick={() => onChange(fieldKey, value.filter(s => s !== skill))}
                className="hover:text-destructive transition-colors">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Add custom skill */}
      <div className="flex items-center gap-1.5">
        <Input className="h-7 text-xs w-48" value={customInput}
          placeholder="custom-skill-name"
          onChange={e => setCustomInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }} />
        <Button type="button" variant="outline" size="sm" className="h-7 text-xs px-2"
          onClick={addCustom} disabled={!customInput.trim()}>
          <Plus className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

// ── NotificationsGrid ─────────────────────────────────────────────────────────
// Compact 2-column grid for the notifications section instead of 6 stacked rows.

export function NotificationsGrid({ values, onChange }: {
  values: Record<string, boolean>;
  onChange: (key: string, val: boolean) => void;
}) {
  const fields: { key: string; label: string; description: string }[] = [
    { key: 'notifications.on_complete', label: 'On Complete', description: 'Unit completes' },
    { key: 'notifications.on_error', label: 'On Error', description: 'Error occurs' },
    { key: 'notifications.on_budget', label: 'On Budget', description: 'Budget threshold reached' },
    { key: 'notifications.on_milestone', label: 'On Milestone', description: 'Milestone finishes' },
    { key: 'notifications.on_attention', label: 'On Attention', description: 'Manual attention needed' },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {fields.map(f => {
        const id = `notif-${f.key}`;
        return (
          <label key={f.key} htmlFor={id}
            className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border bg-background hover:bg-accent/30 transition-colors cursor-pointer">
            <Switch id={id} checked={values[f.key] ?? true}
              onCheckedChange={v => onChange(f.key, v)} />
            <div>
              <div className="text-xs font-medium">{f.label}</div>
              <div className="text-[10px] text-muted-foreground">{f.description}</div>
            </div>
          </label>
        );
      })}
    </div>
  );
}

