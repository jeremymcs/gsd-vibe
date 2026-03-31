// GSD VibeFlow - GSD-2 Preferences Tab Component
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { Save, Loader2, ChevronDown, ChevronRight, RotateCcw, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ViewEmpty } from '@/components/shared/loading-states';
import { useGsd2Preferences, useGsd2SavePreferences, useGsd2Models } from '@/lib/queries';

// ============================================================
// Field metadata
// ============================================================

type FieldType = 'boolean' | 'enum' | 'number' | 'string' | 'string[]' | 'model';

interface FieldMeta {
  type: FieldType;
  options?: string[];
  label: string;
  description?: string;
  group: string;
}

/** Known model IDs — used as fallback when gsd --list-models is unavailable. */
const KNOWN_MODELS = [
  // Anthropic
  'claude-opus-4-6',
  'claude-sonnet-4-6',
  'claude-sonnet-4-5',
  'claude-haiku-4-5',
  // OpenRouter — Anthropic
  'openrouter/anthropic/claude-opus-4',
  'openrouter/anthropic/claude-sonnet-4',
  'openrouter/anthropic/claude-haiku-4',
  // OpenRouter — Google
  'openrouter/google/gemini-2.5-pro',
  'openrouter/google/gemini-2.5-flash',
  'openrouter/google/gemini-2.0-flash-001',
  // OpenRouter — OpenAI
  'openrouter/openai/gpt-4.1',
  'openrouter/openai/gpt-4.1-mini',
  'openrouter/openai/o3',
  'openrouter/openai/o4-mini',
  // OpenRouter — Other
  'openrouter/deepseek/deepseek-r1',
  'openrouter/deepseek/deepseek-v3-0324',
  'openrouter/z-ai/glm-5',
  'openrouter/minimax/minimax-m2.5',
  'openrouter/moonshotai/kimi-k2.5',
  // Bedrock
  'bedrock/claude-opus-4-6',
  'bedrock/claude-sonnet-4-6',
  'bedrock/claude-haiku-4-5',
  // Vertex
  'vertex/claude-opus-4-6',
  'vertex/claude-sonnet-4-6',
  'vertex/claude-haiku-4-5',
];

const FIELD_META: Record<string, FieldMeta> = {
  // ── General ──
  version: { type: 'number', label: 'Version', description: 'Schema version', group: 'General' },
  mode: { type: 'enum', options: ['solo', 'team'], label: 'Mode', description: 'Workflow mode — sets sensible defaults', group: 'General' },

  // ── Models ──
  'models.research': { type: 'model', label: 'Research', description: 'Model for milestone research', group: 'Models' },
  'models.planning': { type: 'model', label: 'Planning', description: 'Model for planning phases', group: 'Models' },
  'models.discuss': { type: 'model', label: 'Discuss', description: 'Falls back to planning if unset', group: 'Models' },
  'models.execution': { type: 'model', label: 'Execution', description: 'Model for task execution', group: 'Models' },
  'models.execution_simple': { type: 'model', label: 'Execution (Simple)', description: 'Model for simple tasks', group: 'Models' },
  'models.completion': { type: 'model', label: 'Completion', description: 'Model for slice/milestone completion', group: 'Models' },
  'models.validation': { type: 'model', label: 'Validation', description: 'Falls back to planning if unset', group: 'Models' },
  'models.subagent': { type: 'model', label: 'Subagent', description: 'Model for subagent processes', group: 'Models' },

  // ── Skills ──
  skill_discovery: { type: 'enum', options: ['auto', 'suggest', 'off'], label: 'Skill Discovery', description: 'How GSD discovers and applies skills', group: 'Skills' },
  skill_staleness_days: { type: 'number', label: 'Skill Staleness (days)', description: '0 = disabled', group: 'Skills' },
  always_use_skills: { type: 'string[]', label: 'Always Use Skills', description: 'Skills always loaded when relevant', group: 'Skills' },
  prefer_skills: { type: 'string[]', label: 'Prefer Skills', description: 'Soft-preference skills', group: 'Skills' },
  avoid_skills: { type: 'string[]', label: 'Avoid Skills', description: 'Skills to avoid unless clearly needed', group: 'Skills' },

  // ── Budget & Tokens ──
  budget_ceiling: { type: 'number', label: 'Budget Ceiling ($)', description: 'Max spend for auto-mode', group: 'Budget & Tokens' },
  budget_enforcement: { type: 'enum', options: ['warn', 'pause', 'halt'], label: 'Budget Enforcement', description: 'Action when ceiling is reached', group: 'Budget & Tokens' },
  context_pause_threshold: { type: 'number', label: 'Context Pause (%)', description: '0 = disabled', group: 'Budget & Tokens' },
  token_profile: { type: 'enum', options: ['budget', 'balanced', 'quality'], label: 'Token Profile', description: 'Coordinates model selection and phase skipping', group: 'Budget & Tokens' },

  // ── Git ──
  'git.auto_push': { type: 'boolean', label: 'Auto Push', description: 'Push commits to remote automatically', group: 'Git' },
  'git.push_branches': { type: 'boolean', label: 'Push Branches', description: 'Push milestone branches to remote', group: 'Git' },
  'git.remote': { type: 'string', label: 'Remote', description: 'Git remote name', group: 'Git' },
  'git.snapshots': { type: 'boolean', label: 'Snapshots', description: 'Create WIP snapshot commits', group: 'Git' },
  'git.pre_merge_check': { type: 'enum', options: ['true', 'false', 'auto'], label: 'Pre-Merge Check', description: 'Run checks before worktree merge', group: 'Git' },
  'git.commit_type': { type: 'enum', options: ['feat', 'fix', 'refactor', 'docs', 'test', 'chore', 'perf', 'ci', 'build', 'style'], label: 'Commit Type', description: 'Conventional commit prefix override', group: 'Git' },
  'git.main_branch': { type: 'string', label: 'Main Branch', description: 'Primary branch name', group: 'Git' },
  'git.merge_strategy': { type: 'enum', options: ['squash', 'merge'], label: 'Merge Strategy', description: 'How worktree branches merge back', group: 'Git' },
  'git.isolation': { type: 'enum', options: ['worktree', 'branch', 'none'], label: 'Isolation', description: 'Auto-mode git isolation strategy', group: 'Git' },
  'git.manage_gitignore': { type: 'boolean', label: 'Manage .gitignore', description: 'Let GSD modify .gitignore', group: 'Git' },
  'git.auto_pr': { type: 'boolean', label: 'Auto PR', description: 'Create GitHub PR after milestone merge', group: 'Git' },
  'git.pr_target_branch': { type: 'string', label: 'PR Target Branch', description: 'Branch to target for auto PRs', group: 'Git' },
  unique_milestone_ids: { type: 'boolean', label: 'Unique Milestone IDs', description: 'M001-rand6 format to avoid collisions', group: 'Git' },

  // ── Phases ──
  'phases.skip_research': { type: 'boolean', label: 'Skip Research', description: 'Skip milestone-level research', group: 'Phases' },
  'phases.skip_reassess': { type: 'boolean', label: 'Skip Reassess', description: 'Disable roadmap reassessment', group: 'Phases' },
  'phases.reassess_after_slice': { type: 'boolean', label: 'Reassess After Slice', description: 'Reassess roadmap after each slice', group: 'Phases' },
  'phases.skip_slice_research': { type: 'boolean', label: 'Skip Slice Research', description: 'Skip per-slice research', group: 'Phases' },

  // ── Notifications ──
  'notifications.enabled': { type: 'boolean', label: 'Enabled', description: 'Master toggle', group: 'Notifications' },
  'notifications.on_complete': { type: 'boolean', label: 'On Complete', description: 'Notify on unit completion', group: 'Notifications' },
  'notifications.on_error': { type: 'boolean', label: 'On Error', description: 'Notify on errors', group: 'Notifications' },
  'notifications.on_budget': { type: 'boolean', label: 'On Budget', description: 'Notify on budget thresholds', group: 'Notifications' },
  'notifications.on_milestone': { type: 'boolean', label: 'On Milestone', description: 'Notify on milestone completion', group: 'Notifications' },
  'notifications.on_attention': { type: 'boolean', label: 'On Attention', description: 'Notify when manual attention needed', group: 'Notifications' },

  // ── cmux ──
  'cmux.enabled': { type: 'boolean', label: 'Enabled', description: 'Master toggle for cmux', group: 'cmux' },
  'cmux.notifications': { type: 'boolean', label: 'Notifications', description: 'Route through cmux', group: 'cmux' },
  'cmux.sidebar': { type: 'boolean', label: 'Sidebar', description: 'Publish status to sidebar', group: 'cmux' },
  'cmux.splits': { type: 'boolean', label: 'Splits', description: 'Subagents in visible splits', group: 'cmux' },
  'cmux.browser': { type: 'boolean', label: 'Browser', description: 'Browser integration', group: 'cmux' },

  // ── Verification ──
  verification_commands: { type: 'string[]', label: 'Verification Commands', description: 'Shell commands after task execution', group: 'Verification' },
  verification_auto_fix: { type: 'boolean', label: 'Auto Fix', description: 'Auto-fix verification failures', group: 'Verification' },
  verification_max_retries: { type: 'number', label: 'Max Retries', description: 'Max fix-and-retry cycles', group: 'Verification' },
  uat_dispatch: { type: 'boolean', label: 'UAT Dispatch', description: 'Enable UAT dispatch', group: 'Verification' },

  // ── Auto Mode ──
  auto_visualize: { type: 'boolean', label: 'Auto Visualize', description: 'Visualizer after milestone completion', group: 'Auto Mode' },
  auto_report: { type: 'boolean', label: 'Auto Report', description: 'HTML report after milestone', group: 'Auto Mode' },
  search_provider: { type: 'enum', options: ['auto', 'brave', 'tavily', 'ollama', 'native'], label: 'Search Provider', description: 'Research-phase web search backend', group: 'Auto Mode' },
  context_selection: { type: 'enum', options: ['full', 'smart'], label: 'Context Selection', description: 'How files are inlined into context', group: 'Auto Mode' },

  // ── Parallel ──
  'parallel.enabled': { type: 'boolean', label: 'Enabled', description: 'Enable parallel execution', group: 'Parallel' },
  'parallel.max_workers': { type: 'number', label: 'Max Workers', description: '1-4', group: 'Parallel' },
  'parallel.budget_ceiling': { type: 'number', label: 'Budget Ceiling', description: 'Per-run budget limit', group: 'Parallel' },
  'parallel.merge_strategy': { type: 'enum', options: ['per-slice', 'per-milestone'], label: 'Merge Strategy', description: 'When to merge results', group: 'Parallel' },
  'parallel.auto_merge': { type: 'enum', options: ['auto', 'confirm', 'manual'], label: 'Auto Merge', description: 'Merge behavior after completion', group: 'Parallel' },

  // ── Dynamic Routing ──
  'dynamic_routing.enabled': { type: 'boolean', label: 'Enabled', description: 'Enable dynamic model routing', group: 'Dynamic Routing' },
  'dynamic_routing.escalate_on_failure': { type: 'boolean', label: 'Escalate on Failure', description: 'Higher-tier model on failure', group: 'Dynamic Routing' },
  'dynamic_routing.budget_pressure': { type: 'boolean', label: 'Budget Pressure', description: 'Downgrade under pressure', group: 'Dynamic Routing' },
  'dynamic_routing.cross_provider': { type: 'boolean', label: 'Cross Provider', description: 'Route across providers', group: 'Dynamic Routing' },
  'dynamic_routing.hooks': { type: 'boolean', label: 'Hooks', description: 'Enable routing hooks', group: 'Dynamic Routing' },
  'dynamic_routing.tier_models.light': { type: 'model', label: 'Light Tier', description: 'Model for simple tasks', group: 'Dynamic Routing' },
  'dynamic_routing.tier_models.standard': { type: 'model', label: 'Standard Tier', description: 'Model for regular tasks', group: 'Dynamic Routing' },
  'dynamic_routing.tier_models.heavy': { type: 'model', label: 'Heavy Tier', description: 'Model for complex tasks', group: 'Dynamic Routing' },

  // ── Remote Questions ──
  'remote_questions.channel': { type: 'enum', options: ['slack', 'discord'], label: 'Channel', description: 'Channel type', group: 'Remote Questions' },
  'remote_questions.channel_id': { type: 'string', label: 'Channel ID', description: 'Channel identifier', group: 'Remote Questions' },
  'remote_questions.timeout_minutes': { type: 'number', label: 'Timeout (min)', description: '1-30', group: 'Remote Questions' },
  'remote_questions.poll_interval_seconds': { type: 'number', label: 'Poll Interval (sec)', description: '2-30', group: 'Remote Questions' },

  // ── Auto Supervisor ──
  'auto_supervisor.model': { type: 'model', label: 'Model', description: 'Supervisor model ID', group: 'Auto Supervisor' },
  'auto_supervisor.soft_timeout_minutes': { type: 'number', label: 'Soft Timeout (min)', description: 'Minutes before soft warning', group: 'Auto Supervisor' },
  'auto_supervisor.idle_timeout_minutes': { type: 'number', label: 'Idle Timeout (min)', description: 'Minutes before intervention', group: 'Auto Supervisor' },
  'auto_supervisor.hard_timeout_minutes': { type: 'number', label: 'Hard Timeout (min)', description: 'Minutes before termination', group: 'Auto Supervisor' },
};

const GROUP_ORDER = [
  'General', 'Models', 'Skills', 'Budget & Tokens', 'Git', 'Phases',
  'Auto Mode', 'Dynamic Routing', 'Verification', 'Notifications',
  'cmux', 'Parallel', 'Remote Questions', 'Auto Supervisor',
];

// ============================================================
// Helpers
// ============================================================

function flattenObj(obj: Record<string, unknown>, prefix = ''): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(result, flattenObj(v as Record<string, unknown>, key));
    } else {
      result[key] = v;
    }
  }
  return result;
}

function unflattenObj(flat: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(flat)) {
    const parts = key.split('.');
    let cursor: Record<string, unknown> = result;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in cursor) || typeof cursor[parts[i]] !== 'object') {
        cursor[parts[i]] = {};
      }
      cursor = cursor[parts[i]] as Record<string, unknown>;
    }
    cursor[parts[parts.length - 1]] = val;
  }
  return result;
}

function valueToDisplay(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (Array.isArray(val)) return val.join(', ');
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

function parseDisplayToValue(str: string, meta: FieldMeta | undefined, originalVal: unknown): unknown {
  if (!meta) {
    if (typeof originalVal === 'number') { const n = Number(str); return isNaN(n) ? str : n; }
    if (typeof originalVal === 'boolean') { return str === 'true'; }
    return str;
  }
  switch (meta.type) {
    case 'boolean': return str === 'true';
    case 'number': { const n = Number(str); return isNaN(n) ? (str === '' ? null : str) : n; }
    case 'enum': return str || null;
    case 'model': return str || null;
    case 'string[]': return str ? str.split(',').map(s => s.trim()).filter(Boolean) : [];
    default: return str;
  }
}

type ScopeBadgeVariant = 'success' | 'info' | 'outline' | 'warning';
function getScopeVariant(scope: string): ScopeBadgeVariant {
  switch (scope) {
    case 'project': return 'success';
    case 'global': return 'info';
    case 'default': return 'outline';
    default: return 'warning';
  }
}

// ============================================================
// Field row
// ============================================================

interface FieldControlProps {
  fieldKey: string;
  meta: FieldMeta | undefined;
  value: unknown;
  draftValue: string;
  scope: string;
  showScope: boolean;
  modelOptions: string[];
  onChange: (key: string, val: string) => void;
}

function FieldControl({ fieldKey, meta, value, draftValue, scope, showScope, modelOptions, onChange }: FieldControlProps) {
  const isDirty = draftValue !== valueToDisplay(value);
  const scopeVariant = getScopeVariant(scope);
  const label = meta?.label ?? fieldKey;
  const description = meta?.description;

  const renderControl = (): ReactNode => {
    if (!meta) {
      return (
        <Input
          value={draftValue}
          onChange={(e) => onChange(fieldKey, e.target.value)}
          className={`h-8 text-xs w-full max-w-sm ${isDirty ? 'border-status-info/60 ring-1 ring-status-info/30' : ''}`}
          aria-label={`Value for ${fieldKey}`}
        />
      );
    }

    switch (meta.type) {
      case 'boolean':
        return (
          <div className="flex items-center gap-2.5">
            <span className="text-xs text-muted-foreground w-8 text-right">
              {draftValue === 'true' ? 'on' : 'off'}
            </span>
            <Switch
              checked={draftValue === 'true'}
              onCheckedChange={(checked) => onChange(fieldKey, String(checked))}
              aria-label={label}
            />
          </div>
        );

      case 'enum':
        return (
          <Select
            value={draftValue || '__unset__'}
            onValueChange={(v) => onChange(fieldKey, v === '__unset__' ? '' : v)}
          >
            <SelectTrigger
              className={`h-8 text-xs w-full max-w-xs ${isDirty ? 'border-status-info/60 ring-1 ring-status-info/30' : ''}`}
              aria-label={label}
            >
              <SelectValue placeholder="— not set —" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__unset__">
                <span className="text-muted-foreground italic">— not set —</span>
              </SelectItem>
              {meta.options?.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  <span>{opt}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'model':
        return (
          <Select
            value={draftValue || '__unset__'}
            onValueChange={(v) => onChange(fieldKey, v === '__unset__' ? '' : v)}
          >
            <SelectTrigger
              className={`h-8 text-xs w-full max-w-sm font-mono ${isDirty ? 'border-status-info/60 ring-1 ring-status-info/30' : ''}`}
              aria-label={label}
            >
              <SelectValue placeholder="— not set —" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              <SelectItem value="__unset__">
                <span className="text-muted-foreground italic">— not set —</span>
              </SelectItem>
              {/* Show current value first if it's not in the list (e.g. provider-prefixed) */}
              {draftValue && !modelOptions.includes(draftValue) && (
                <SelectItem value={draftValue}>
                  <span className="font-mono">{draftValue}</span>
                </SelectItem>
              )}
              {modelOptions.map((m) => (
                <SelectItem key={m} value={m}>
                  <span className="font-mono">{m}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'number':
        return (
          <Input
            type="number"
            value={draftValue}
            onChange={(e) => onChange(fieldKey, e.target.value)}
            className={`h-8 text-xs w-full max-w-[10rem] ${isDirty ? 'border-status-info/60 ring-1 ring-status-info/30' : ''}`}
            aria-label={label}
          />
        );

      case 'string[]':
        return (
          <Input
            value={draftValue}
            onChange={(e) => onChange(fieldKey, e.target.value)}
            placeholder="comma-separated"
            className={`h-8 text-xs w-full max-w-sm ${isDirty ? 'border-status-info/60 ring-1 ring-status-info/30' : ''}`}
            aria-label={label}
          />
        );

      default:
        return (
          <Input
            value={draftValue}
            onChange={(e) => onChange(fieldKey, e.target.value)}
            className={`h-8 text-xs w-full max-w-sm ${isDirty ? 'border-status-info/60 ring-1 ring-status-info/30' : ''}`}
            aria-label={label}
          />
        );
    }
  };

  return (
    <div className="flex items-center gap-4 py-3 px-5 border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
      {/* Left: label + description */}
      <div className="shrink-0 min-w-0" style={{ flex: '0 0 auto' }}>
        <span className="text-sm font-medium text-foreground block leading-tight">
          {label}
        </span>
        {description && (
          <span className="text-xs text-muted-foreground leading-snug block mt-0.5">
            {description}
          </span>
        )}
      </div>

      {/* Spacer pushes control to the right */}
      <div className="flex-1" />

      {/* Right: scope badge + control + dirty dot */}
      <div className="flex items-center gap-3 shrink-0">
        {showScope && (
          <Badge variant={scopeVariant} size="sm" className="w-16 justify-center text-[10px]">
            {scope || 'default'}
          </Badge>
        )}

        {renderControl()}

        <div className="w-2 shrink-0">
          {isDirty && (
            <div className="w-2 h-2 rounded-full bg-status-info" title="Modified" />
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Group section
// ============================================================

interface GroupSectionProps {
  title: string;
  children: ReactNode;
  fieldCount: number;
  dirtyCount: number;
  defaultOpen?: boolean;
}

function GroupSection({ title, children, fieldCount, dirtyCount, defaultOpen = false }: GroupSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border/40 last:border-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-5 py-3 text-sm font-semibold text-foreground/80 hover:text-foreground hover:bg-muted/30 transition-colors"
      >
        {open
          ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
          : <ChevronRight className="h-4 w-4 text-muted-foreground" />
        }
        <span>{title}</span>
        <span className="text-xs font-normal text-muted-foreground ml-1">
          {fieldCount} {fieldCount === 1 ? 'field' : 'fields'}
        </span>
        {dirtyCount > 0 && (
          <Badge variant="info" size="sm" className="ml-auto">
            {dirtyCount} changed
          </Badge>
        )}
      </button>
      {open && <div className="pb-1">{children}</div>}
    </div>
  );
}

// ============================================================
// Main component
// ============================================================

interface Gsd2PreferencesTabProps {
  projectId: string;
  projectPath: string;
}

export function Gsd2PreferencesTab({ projectPath }: Gsd2PreferencesTabProps) {
  const isGlobalOnly = !projectPath;
  const { data: prefsData, isLoading, isError } = useGsd2Preferences(projectPath);
  const { data: modelEntries } = useGsd2Models();
  const savePreferences = useGsd2SavePreferences();

  // Build model options: API results + known defaults as fallback
  const apiModels = (modelEntries ?? []).map((m) => m.id);
  const allModels = new Set([...apiModels, ...KNOWN_MODELS]);

  // Also include any model values currently set in the prefs that aren't in the list
  // (e.g. provider-prefixed like openrouter/anthropic/claude-sonnet-4)
  if (prefsData?.merged) {
    const flat = flattenObj(prefsData.merged as Record<string, unknown>);
    for (const [k, v] of Object.entries(flat)) {
      const meta = FIELD_META[k];
      if (meta?.type === 'model' && typeof v === 'string' && v) {
        allModels.add(v);
      }
    }
  }

  const modelOptions = [...allModels].sort();

  const [saveScope, setSaveScope] = useState<'project' | 'global'>(isGlobalOnly ? 'global' : 'project');
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [draftInitialized, setDraftInitialized] = useState(false);

  useEffect(() => {
    if (prefsData?.merged) {
      const flat = flattenObj(prefsData.merged as Record<string, unknown>);
      const initial: Record<string, string> = {};
      for (const [k, v] of Object.entries(flat)) {
        initial[k] = valueToDisplay(v);
      }
      setDraft(initial);
      setDraftInitialized(true);
    }
  }, [prefsData]);

  const flatScopes: Record<string, string> = {};
  if (prefsData?.scopes) {
    Object.assign(flatScopes, prefsData.scopes);
    if (prefsData.merged) {
      const flat = flattenObj(prefsData.merged as Record<string, unknown>);
      for (const key of Object.keys(flat)) {
        if (!(key in flatScopes)) {
          const parent = key.split('.')[0];
          flatScopes[key] = prefsData.scopes[parent] ?? 'default';
        }
      }
    }
  }

  const flatMerged = prefsData?.merged
    ? flattenObj(prefsData.merged as Record<string, unknown>)
    : {};

  const handleChange = useCallback((key: string, val: string) => {
    setDraft((prev) => ({ ...prev, [key]: val }));
  }, []);

  const handleReset = useCallback(() => {
    if (prefsData?.merged) {
      const flat = flattenObj(prefsData.merged as Record<string, unknown>);
      const initial: Record<string, string> = {};
      for (const [k, v] of Object.entries(flat)) {
        initial[k] = valueToDisplay(v);
      }
      setDraft(initial);
    }
  }, [prefsData]);

  const handleSave = () => {
    if (!prefsData?.merged) return;
    const typedFlat: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(draft)) {
      const meta = FIELD_META[k];
      typedFlat[k] = parseDisplayToValue(v, meta, flatMerged[k]);
    }
    const payload = unflattenObj(typedFlat);
    savePreferences.mutate({ projectPath: projectPath || '', scope: saveScope, payload });
  };

  const isDirty =
    draftInitialized &&
    Object.entries(draft).some(([k, v]) => v !== valueToDisplay(flatMerged[k]));

  if (isLoading) {
    return (
      <div className="space-y-3 rounded-lg border border-border/40 p-6">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-2/3" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-status-error/30 bg-status-error/5 p-6 text-center text-sm text-status-error">
        Failed to load preferences — check that the project path is accessible.
      </div>
    );
  }

  const keys = Object.keys(flatMerged);

  if (keys.length === 0 || !draftInitialized) {
    if (!isLoading && keys.length === 0) {
      return (
        <ViewEmpty
          icon={<Settings className="h-8 w-8" />}
          message="No preferences configured"
          description="Create a PREFERENCES.md in ~/.gsd/ (global) or .gsd/ (project) to get started"
        />
      );
    }
    return (
      <div className="space-y-3 rounded-lg border border-border/40 p-6">
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  // Group fields
  const grouped: Record<string, string[]> = {};
  for (const key of keys) {
    const meta = FIELD_META[key];
    const group = meta?.group ?? 'Other';
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(key);
  }

  const sortedGroups = Object.keys(grouped).sort((a, b) => {
    const ai = GROUP_ORDER.indexOf(a);
    const bi = GROUP_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {keys.length} fields across {sortedGroups.length} sections
          {isGlobalOnly && <span className="ml-1">· editing global preferences</span>}
        </p>

        <div className="flex items-center gap-2">
          {!isGlobalOnly && (
            <div className="flex rounded-md border border-border overflow-hidden text-xs">
              <button
                type="button"
                onClick={() => setSaveScope('project')}
                className={`px-3 py-1.5 transition-colors ${
                  saveScope === 'project'
                    ? 'bg-status-success/20 text-status-success font-medium'
                    : 'bg-transparent text-muted-foreground hover:bg-muted/40'
                }`}
              >
                Save to project
              </button>
              <button
                type="button"
                onClick={() => setSaveScope('global')}
                className={`px-3 py-1.5 transition-colors border-l border-border ${
                  saveScope === 'global'
                    ? 'bg-status-info/20 text-status-info font-medium'
                    : 'bg-transparent text-muted-foreground hover:bg-muted/40'
                }`}
              >
                Save to global
              </button>
            </div>
          )}

          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2"
            disabled={!isDirty}
            onClick={handleReset}
            title="Discard changes"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>

          <Button
            size="sm"
            disabled={!isDirty || savePreferences.isPending}
            onClick={handleSave}
          >
            {savePreferences.isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5 mr-1.5" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Sections */}
      <div className="rounded-lg border border-border/40 bg-card overflow-hidden">
        {sortedGroups.map((group) => {
          const groupKeys = grouped[group];
          const dirtyCount = groupKeys.filter(
            (k) => draft[k] !== valueToDisplay(flatMerged[k])
          ).length;
          const hasValues = groupKeys.some((k) => {
            const v = flatMerged[k];
            return v !== null && v !== undefined && v !== '' && v !== false;
          });

          return (
            <GroupSection
              key={group}
              title={group}
              fieldCount={groupKeys.length}
              dirtyCount={dirtyCount}
              defaultOpen={hasValues}
            >
              {groupKeys.map((key) => (
                <FieldControl
                  key={key}
                  fieldKey={key}
                  meta={FIELD_META[key]}
                  value={flatMerged[key]}
                  draftValue={draft[key] ?? ''}
                  scope={flatScopes[key] ?? 'default'}
                  showScope={!isGlobalOnly}
                  modelOptions={modelOptions}
                  onChange={handleChange}
                />
              ))}
            </GroupSection>
          );
        })}
      </div>
    </div>
  );
}
