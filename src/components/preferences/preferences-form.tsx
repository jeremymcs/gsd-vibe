// GSD Vibe - Shared Preferences Form (all 16 sections)
// Consumed by both Gsd2PreferencesTab and GsdPreferencesPage.
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Section, ToggleField, SelectField, NumberField, TextField,
  LinesArrayField, HookEditor,
  ComboboxField, ModelComboboxField, SkillTagField, NotificationsGrid,
  getStr, getBool, getNum, getArr, getNum as _getNum, scopeOf,
} from './preferences-primitives';
import type { ScopeOrigin } from './preferences-primitives';
import type { PreferencesHookEntry } from '@/lib/tauri';
import { useGsd2ListModels } from '@/lib/queries';

// Re-export helper aliases bound to a draft so callers don't need to thread the draft everywhere.
// Prefer using PreferencesForm directly — this is an internal binding.

export interface PreferencesFormProps {
  /** Current draft values */
  draft: Record<string, unknown>;
  /** Called whenever any field changes */
  onChange: (key: string, value: unknown) => void;
  /** If provided, scope badges are shown on each field */
  scopes?: Record<string, string>;
  /** Whether there are unsaved changes */
  dirty: boolean;
  /** Whether the save is in progress */
  saving: boolean;
  /** Save button label suffix — e.g. "Project" or "Global" */
  saveLabel?: string;
  /** Called when Save is clicked */
  onSave: () => void;
}

export function PreferencesForm({
  draft, onChange, scopes = {}, dirty, saving, saveLabel = '', onSave,
}: PreferencesFormProps) {
  const { data: modelList = [] } = useGsd2ListModels();

  // Accessor helpers — short aliases bound to draft
  const s  = (key: string, fb = '')    => getStr(draft, key, fb);
  const b  = (key: string, fb = false) => getBool(draft, key, fb);
  const n  = (key: string)             => getNum(draft, key);
  const a  = (key: string)             => getArr(draft, key);
  const ns = (key: string, fb = '')    => getStr(draft, key, fb);
  const nb = (key: string, fb = false) => getBool(draft, key, fb);
  const nn = (key: string)             => _getNum(draft, key);

  const scope = (key: string): ScopeOrigin | undefined =>
    scopes && Object.keys(scopes).length > 0 ? scopeOf(scopes, key) : undefined;

  const postHooks = Array.isArray(draft['post_unit_hooks'])
    ? (draft['post_unit_hooks'] as PreferencesHookEntry[]) : [];
  const preHooks = Array.isArray(draft['pre_dispatch_hooks'])
    ? (draft['pre_dispatch_hooks'] as PreferencesHookEntry[]) : [];

  return (
    <div className="flex-1 overflow-y-auto px-6 py-3 space-y-3">

      {/* ── 1. Workflow ── */}
      <Section title="Workflow">
        <SelectField label="Mode"
          description="Configures sensible defaults for git and project settings. solo = auto-push enabled. team = push branches + pre-merge checks."
          scope={scope('mode')} fieldKey="mode" value={s('mode')}
          options={[{value:'',label:'— (manual)'},{value:'solo',label:'solo'},{value:'team',label:'team'}]}
          onChange={onChange} />
        <ToggleField label="Unique Milestone IDs"
          description="Generates milestone IDs in M{seq}-{rand6} format (e.g. M001-eh88as). Prevents collisions in team workflows."
          scope={scope('unique_milestone_ids')} fieldKey="unique_milestone_ids"
          value={b('unique_milestone_ids')} onChange={onChange} />
        <SelectField label="Skill Discovery"
          description="Controls how GSD discovers and applies skills during auto-mode."
          scope={scope('skill_discovery')} fieldKey="skill_discovery"
          value={s('skill_discovery','suggest')}
          options={[{value:'suggest',label:'suggest (default)'},{value:'auto',label:'auto'},{value:'off',label:'off'}]}
          onChange={onChange} />
        <NumberField label="Skill Staleness Days"
          description="Skills unused for this many days get deprioritized. 0 = disable staleness tracking."
          scope={scope('skill_staleness_days')} fieldKey="skill_staleness_days"
          value={n('skill_staleness_days')} min={0} placeholder="60" onChange={onChange} />
        <SelectField label="Token Profile"
          description="Coordinates model selection, phase skipping, and context compression."
          scope={scope('token_profile')} fieldKey="token_profile"
          value={s('token_profile','balanced')}
          options={[{value:'balanced',label:'balanced (default)'},{value:'budget',label:'budget'},{value:'quality',label:'quality'}]}
          onChange={onChange} />
        <SelectField label="Search Provider"
          description="Selects the search backend for research phases."
          scope={scope('search_provider')} fieldKey="search_provider"
          value={s('search_provider','auto')}
          options={[{value:'auto',label:'auto (default)'},{value:'brave',label:'brave'},{value:'tavily',label:'tavily'},{value:'ollama',label:'ollama'},{value:'native',label:'native'}]}
          onChange={onChange} />
        <SelectField label="Context Selection"
          description="Controls how files are inlined into context. smart = semantic chunking."
          scope={scope('context_selection')} fieldKey="context_selection"
          value={s('context_selection','full')}
          options={[{value:'full',label:'full (default)'},{value:'smart',label:'smart'}]}
          onChange={onChange} />
        <ToggleField label="Auto Visualize"
          description="Show a visualizer hint after each milestone completion in auto-mode."
          scope={scope('auto_visualize')} fieldKey="auto_visualize"
          value={b('auto_visualize')} onChange={onChange} />
        <ToggleField label="Auto Report"
          description="Generate an HTML report snapshot after each milestone completion."
          scope={scope('auto_report')} fieldKey="auto_report"
          value={b('auto_report',true)} onChange={onChange} />
        <ToggleField label="UAT Dispatch"
          description="Enable UAT (User Acceptance Testing) dispatch mode."
          scope={scope('uat_dispatch')} fieldKey="uat_dispatch"
          value={b('uat_dispatch')} onChange={onChange} />
      </Section>

      {/* ── 2. Phases ── */}
      <Section title="Phases" defaultOpen={false}>
        <ToggleField label="Skip Research" description="Skip milestone-level research phase."
          scope={scope('phases')} fieldKey="phases.skip_research"
          value={nb('phases.skip_research')} onChange={onChange} />
        <ToggleField label="Reassess After Slice" description="Run roadmap reassessment after each completed slice."
          scope={scope('phases')} fieldKey="phases.reassess_after_slice"
          value={nb('phases.reassess_after_slice')} onChange={onChange} />
        <ToggleField label="Skip Reassess" description="Force-disable roadmap reassessment even if reassess_after_slice is enabled."
          scope={scope('phases')} fieldKey="phases.skip_reassess"
          value={nb('phases.skip_reassess')} onChange={onChange} />
        <ToggleField label="Skip Slice Research" description="Skip per-slice research phase."
          scope={scope('phases')} fieldKey="phases.skip_slice_research"
          value={nb('phases.skip_slice_research')} onChange={onChange} />
      </Section>

      {/* ── 3. Budget ── */}
      <Section title="Budget" defaultOpen={false}>
        <NumberField label="Budget Ceiling ($)"
          description="Maximum dollar amount to spend on auto-mode. Leave blank for no limit."
          scope={scope('budget_ceiling')} fieldKey="budget_ceiling"
          value={n('budget_ceiling')} min={0} placeholder="no limit" onChange={onChange} />
        <SelectField label="Budget Enforcement"
          description="Action taken when budget_ceiling is reached."
          scope={scope('budget_enforcement')} fieldKey="budget_enforcement"
          value={s('budget_enforcement','pause')}
          options={[{value:'pause',label:'pause (default)'},{value:'warn',label:'warn'},{value:'halt',label:'halt'}]}
          onChange={onChange} />
        <NumberField label="Context Pause Threshold (%)"
          description="Context window usage % at which auto-mode should pause. 0 = disabled."
          scope={scope('context_pause_threshold')} fieldKey="context_pause_threshold"
          value={n('context_pause_threshold')} min={0} max={100} placeholder="0" onChange={onChange} />
      </Section>

      {/* ── 4. Git ── */}
      <Section title="Git" defaultOpen={false}>
        <SelectField label="Isolation" description="Auto-mode git isolation strategy."
          scope={scope('git')} fieldKey="git.isolation" value={ns('git.isolation','worktree')}
          options={[{value:'worktree',label:'worktree (default)'},{value:'branch',label:'branch'},{value:'none',label:'none'}]}
          onChange={onChange} />
        <SelectField label="Merge Strategy" description="How worktree branches are merged back."
          scope={scope('git')} fieldKey="git.merge_strategy" value={ns('git.merge_strategy','squash')}
          options={[{value:'squash',label:'squash (default)'},{value:'merge',label:'merge'}]}
          onChange={onChange} />
        <ComboboxField label="Main Branch" description="Primary branch name for new git repos."
          scope={scope('git')} fieldKey="git.main_branch" value={ns('git.main_branch')}
          suggestions={[{value:'main',label:'main'},{value:'master',label:'master'},{value:'develop',label:'develop'},{value:'trunk',label:'trunk'}]}
          placeholder="main" onChange={onChange} />
        <ToggleField label="Auto Push" description="Automatically push commits to remote after committing."
          scope={scope('git')} fieldKey="git.auto_push" value={nb('git.auto_push')} onChange={onChange} />
        <ToggleField label="Push Branches" description="Push the milestone branch to remote after commits."
          scope={scope('git')} fieldKey="git.push_branches" value={nb('git.push_branches')} onChange={onChange} />
        <ToggleField label="Snapshots" description="Create snapshot commits (WIP saves) during long-running tasks."
          scope={scope('git')} fieldKey="git.snapshots" value={nb('git.snapshots',true)} onChange={onChange} />
        <SelectField label="Pre-Merge Check" description="Run pre-merge checks before merging a worktree back."
          scope={scope('git')} fieldKey="git.pre_merge_check"
          value={String(nn('git.pre_merge_check') ?? ns('git.pre_merge_check','auto'))}
          options={[{value:'auto',label:'auto (default)'},{value:'true',label:'always'},{value:'false',label:'never'}]}
          onChange={onChange} />
        <SelectField label="Commit Type" description="Override the conventional commit type prefix."
          scope={scope('git')} fieldKey="git.commit_type" value={ns('git.commit_type')}
          options={[
            {value:'',label:'— (auto-detect)'},
            {value:'feat',label:'feat'},{value:'fix',label:'fix'},
            {value:'refactor',label:'refactor'},{value:'docs',label:'docs'},
            {value:'test',label:'test'},{value:'chore',label:'chore'},
            {value:'perf',label:'perf'},{value:'ci',label:'ci'},
            {value:'build',label:'build'},{value:'style',label:'style'},
          ]}
          onChange={onChange} />
        <ComboboxField label="Remote" description="Git remote name to push to."
          scope={scope('git')} fieldKey="git.remote" value={ns('git.remote')}
          suggestions={[{value:'origin',label:'origin'},{value:'upstream',label:'upstream'},{value:'fork',label:'fork'}]}
          placeholder="origin" onChange={onChange} />
        <ToggleField label="Manage .gitignore"
          description="Allow GSD to add entries to .gitignore. Disable for strictly managed .gitignore files."
          scope={scope('git')} fieldKey="git.manage_gitignore"
          value={nb('git.manage_gitignore',true)} onChange={onChange} />
        <TextField label="Worktree Post-Create Script"
          description="Script path to run after a worktree is created. Receives SOURCE_DIR and WORKTREE_DIR env vars."
          scope={scope('git')} fieldKey="git.worktree_post_create"
          value={ns('git.worktree_post_create')} placeholder="/path/to/setup.sh" onChange={onChange} />
        <ToggleField label="Auto PR"
          description="Automatically create a GitHub PR after a milestone branch is merged. Requires gh CLI."
          scope={scope('git')} fieldKey="git.auto_pr" value={nb('git.auto_pr')} onChange={onChange} />
        <ComboboxField label="PR Target Branch" description="Branch to target when auto_pr is enabled. Defaults to main_branch."
          scope={scope('git')} fieldKey="git.pr_target_branch" value={ns('git.pr_target_branch')}
          suggestions={[{value:'main',label:'main'},{value:'master',label:'master'},{value:'develop',label:'develop'}]}
          placeholder="main" onChange={onChange} />
      </Section>

      {/* ── 5. Notifications ── */}
      <Section title="Notifications" defaultOpen={false}>
        <ToggleField label="Enabled" description="Master toggle for all desktop notifications."
          scope={scope('notifications')} fieldKey="notifications.enabled"
          value={nb('notifications.enabled',true)} onChange={onChange} />
        <NotificationsGrid
          values={{
            'notifications.on_complete': nb('notifications.on_complete',true),
            'notifications.on_error':    nb('notifications.on_error',true),
            'notifications.on_budget':   nb('notifications.on_budget',true),
            'notifications.on_milestone':nb('notifications.on_milestone',true),
            'notifications.on_attention':nb('notifications.on_attention',true),
          }}
          onChange={onChange} />
      </Section>

      {/* ── 6. Skills ── */}
      <Section title="Skill Preferences" defaultOpen={false}>
        <SkillTagField label="Always Use Skills"
          description="Skills GSD should always use when relevant. Click to toggle."
          scope={scope('always_use_skills')} fieldKey="always_use_skills"
          value={a('always_use_skills')} onChange={onChange} />
        <SkillTagField label="Prefer Skills"
          description="Soft defaults GSD should prefer when relevant. Click to toggle."
          scope={scope('prefer_skills')} fieldKey="prefer_skills"
          value={a('prefer_skills')} onChange={onChange} />
        <SkillTagField label="Avoid Skills"
          description="Skills GSD should avoid unless clearly needed. Click to toggle."
          scope={scope('avoid_skills')} fieldKey="avoid_skills"
          value={a('avoid_skills')} onChange={onChange} />
        <LinesArrayField label="Custom Instructions"
          description="Extra durable instructions for skill use. One per line. For operational project knowledge, use .gsd/KNOWLEDGE.md instead."
          scope={scope('custom_instructions')} fieldKey="custom_instructions"
          value={a('custom_instructions')}
          placeholder="Always verify with browser_assert before marking UI work done"
          onChange={onChange} />
      </Section>

      {/* ── 7. Verification ── */}
      <Section title="Verification" defaultOpen={false}>
        <LinesArrayField label="Verification Commands"
          description="Shell commands to run as verification after task execution. One per line. If any fails, the task is marked as needing fixes."
          scope={scope('verification_commands')} fieldKey="verification_commands"
          value={a('verification_commands')} placeholder="npm test&#10;npm run lint" onChange={onChange} />
        <ToggleField label="Verification Auto Fix"
          description="Automatically attempt to fix verification failures instead of just reporting them."
          scope={scope('verification_auto_fix')} fieldKey="verification_auto_fix"
          value={b('verification_auto_fix')} onChange={onChange} />
        <NumberField label="Verification Max Retries"
          description="Maximum number of fix-and-retry cycles for verification failures. 0 = no retries."
          scope={scope('verification_max_retries')} fieldKey="verification_max_retries"
          value={n('verification_max_retries')} min={0} placeholder="0" onChange={onChange} />
      </Section>

      {/* ── 8. Auto Supervisor ── */}
      <Section title="Auto Supervisor" defaultOpen={false}>
        <ModelComboboxField label="Supervisor Model"
          description="Model ID to use for the supervisor process. Defaults to the currently active model."
          scope={scope('auto_supervisor')} fieldKey="auto_supervisor.model"
          value={ns('auto_supervisor.model')} models={modelList} onChange={onChange} />
        <NumberField label="Soft Timeout (minutes)" description="Minutes before the supervisor issues a soft warning."
          scope={scope('auto_supervisor')} fieldKey="auto_supervisor.soft_timeout_minutes"
          value={nn('auto_supervisor.soft_timeout_minutes')} min={1} placeholder="20" onChange={onChange} />
        <NumberField label="Idle Timeout (minutes)" description="Minutes of inactivity before the supervisor intervenes."
          scope={scope('auto_supervisor')} fieldKey="auto_supervisor.idle_timeout_minutes"
          value={nn('auto_supervisor.idle_timeout_minutes')} min={1} placeholder="10" onChange={onChange} />
        <NumberField label="Hard Timeout (minutes)" description="Minutes before the supervisor forces termination."
          scope={scope('auto_supervisor')} fieldKey="auto_supervisor.hard_timeout_minutes"
          value={nn('auto_supervisor.hard_timeout_minutes')} min={1} placeholder="30" onChange={onChange} />
      </Section>

      {/* ── 9. Models ── */}
      <Section title="Models (per-stage)" defaultOpen={false}>
        <p className="text-xs text-muted-foreground -mt-2 mb-2">
          Model to use for each auto-mode stage. Leave blank to use the currently active model.
          Provider-qualified IDs (e.g. <code className="bg-muted px-1 rounded">bedrock/claude-sonnet-4-5</code>) can be typed directly.
        </p>
        {(['research','planning','execution','execution_simple','completion','subagent'] as const).map(stage => (
          <ModelComboboxField key={stage} label={stage.replace('_',' ')}
            scope={scope('models')} fieldKey={`models.${stage}`}
            value={ns(`models.${stage}`)} models={modelList} onChange={onChange} />
        ))}
      </Section>

      {/* ── 10. cmux ── */}
      <Section title="cmux Integration" defaultOpen={false}>
        <ToggleField label="Enabled" description="Master toggle for cmux terminal integration."
          scope={scope('cmux')} fieldKey="cmux.enabled" value={nb('cmux.enabled')} onChange={onChange} />
        <ToggleField label="Notifications" description="Route desktop notifications through cmux."
          scope={scope('cmux')} fieldKey="cmux.notifications" value={nb('cmux.notifications')} onChange={onChange} />
        <ToggleField label="Sidebar" description="Publish status, progress, and log metadata to the cmux sidebar."
          scope={scope('cmux')} fieldKey="cmux.sidebar" value={nb('cmux.sidebar')} onChange={onChange} />
        <ToggleField label="Splits" description="Run supported subagent work in visible cmux splits."
          scope={scope('cmux')} fieldKey="cmux.splits" value={nb('cmux.splits')} onChange={onChange} />
        <ToggleField label="Browser" description="Reserve the future browser integration flag."
          scope={scope('cmux')} fieldKey="cmux.browser" value={nb('cmux.browser')} onChange={onChange} />
      </Section>

      {/* ── 11. Dynamic Routing ── */}
      <Section title="Dynamic Routing" defaultOpen={false}>
        <ToggleField label="Enabled" description="Enable dynamic model routing that adjusts selection based on task complexity."
          scope={scope('dynamic_routing')} fieldKey="dynamic_routing.enabled"
          value={nb('dynamic_routing.enabled')} onChange={onChange} />
        <ToggleField label="Escalate on Failure" description="Escalate to a higher-tier model when the current one fails."
          scope={scope('dynamic_routing')} fieldKey="dynamic_routing.escalate_on_failure"
          value={nb('dynamic_routing.escalate_on_failure',true)} onChange={onChange} />
        <ToggleField label="Budget Pressure" description="Downgrade model tier when budget is under pressure."
          scope={scope('dynamic_routing')} fieldKey="dynamic_routing.budget_pressure"
          value={nb('dynamic_routing.budget_pressure',true)} onChange={onChange} />
        <ToggleField label="Cross Provider" description="Allow routing across different providers."
          scope={scope('dynamic_routing')} fieldKey="dynamic_routing.cross_provider"
          value={nb('dynamic_routing.cross_provider',true)} onChange={onChange} />
        <ToggleField label="Hooks" description="Enable routing hooks."
          scope={scope('dynamic_routing')} fieldKey="dynamic_routing.hooks"
          value={nb('dynamic_routing.hooks',true)} onChange={onChange} />
        <div className="pt-1 border-t border-border/50">
          <p className="text-xs font-medium text-muted-foreground mb-2">Tier Models</p>
          {(['light','standard','heavy'] as const).map(tier => (
            <ModelComboboxField key={tier} label={tier}
              description={tier==='light' ? 'Low-complexity tasks' : tier==='standard' ? 'Medium-complexity tasks' : 'High-complexity tasks'}
              scope={scope('dynamic_routing')} fieldKey={`dynamic_routing.tier_models.${tier}`}
              value={ns(`dynamic_routing.tier_models.${tier}`)} models={modelList} onChange={onChange} />
          ))}
        </div>
      </Section>

      {/* ── 12. Parallel ── */}
      <Section title="Parallel Execution" defaultOpen={false}>
        <ToggleField label="Enabled" description="Enable parallel orchestration for running multiple slices concurrently."
          scope={scope('parallel')} fieldKey="parallel.enabled" value={nb('parallel.enabled')} onChange={onChange} />
        <NumberField label="Max Workers" description="Maximum concurrent workers (1–4)."
          scope={scope('parallel')} fieldKey="parallel.max_workers"
          value={nn('parallel.max_workers')} min={1} max={4} placeholder="2" onChange={onChange} />
        <SelectField label="Merge Strategy" description="When to merge worktree results back."
          scope={scope('parallel')} fieldKey="parallel.merge_strategy"
          value={ns('parallel.merge_strategy','per-milestone')}
          options={[{value:'per-milestone',label:'per-milestone (default)'},{value:'per-slice',label:'per-slice'}]}
          onChange={onChange} />
        <SelectField label="Auto Merge" description="Merge behavior after parallel completion."
          scope={scope('parallel')} fieldKey="parallel.auto_merge"
          value={ns('parallel.auto_merge','confirm')}
          options={[{value:'confirm',label:'confirm (default)'},{value:'auto',label:'auto'},{value:'manual',label:'manual'}]}
          onChange={onChange} />
        <NumberField label="Budget Ceiling ($)" description="Optional per-parallel-run budget ceiling."
          scope={scope('parallel')} fieldKey="parallel.budget_ceiling"
          value={nn('parallel.budget_ceiling')} min={0} placeholder="no limit" onChange={onChange} />
      </Section>

      {/* ── 13. Remote Questions ── */}
      <Section title="Remote Questions" defaultOpen={false}>
        <p className="text-xs text-muted-foreground -mt-2 mb-2">
          Route interactive questions to Slack or Discord for headless auto-mode.
        </p>
        <SelectField label="Channel" description="Messaging channel type."
          scope={scope('remote_questions')} fieldKey="remote_questions.channel"
          value={ns('remote_questions.channel')}
          options={[{value:'',label:'— (disabled)'},{value:'slack',label:'slack'},{value:'discord',label:'discord'}]}
          onChange={onChange} />
        <TextField label="Channel ID" description="Channel ID for the selected service."
          scope={scope('remote_questions')} fieldKey="remote_questions.channel_id"
          value={ns('remote_questions.channel_id')} placeholder="C01234ABCDE" onChange={onChange} />
        <NumberField label="Timeout (minutes)" description="Question timeout in minutes (1–30)."
          scope={scope('remote_questions')} fieldKey="remote_questions.timeout_minutes"
          value={nn('remote_questions.timeout_minutes')} min={1} max={30} placeholder="15" onChange={onChange} />
        <NumberField label="Poll Interval (seconds)" description="How often to poll for answers (2–30 seconds)."
          scope={scope('remote_questions')} fieldKey="remote_questions.poll_interval_seconds"
          value={nn('remote_questions.poll_interval_seconds')} min={2} max={30} placeholder="10" onChange={onChange} />
      </Section>

      {/* ── 14. Experimental ── */}
      <Section title="Experimental" defaultOpen={false}>
        <p className="text-xs text-muted-foreground -mt-2 mb-2">
          Opt-in experimental features. Off by default. May change or be removed without a deprecation cycle.
        </p>
        <ToggleField label="RTK (Real-Time Kompression)"
          description="Wrap shell commands through the RTK binary to reduce token usage. RTK is downloaded automatically on first use. Set GSD_RTK_DISABLED=1 to force-disable."
          scope={scope('experimental')} fieldKey="experimental.rtk"
          value={nb('experimental.rtk')} onChange={onChange} />
      </Section>

      {/* ── 15. Post-Unit Hooks ── */}
      <Section title="Post-Unit Hooks" defaultOpen={false}>
        <p className="text-xs text-muted-foreground -mt-2 mb-3">
          Hooks that fire after a unit (task/slice/milestone) completes. Each hook runs a prompt
          against the LLM and can produce an artifact file.
        </p>
        <HookEditor hookType="post" hooks={postHooks}
          onChange={hooks => onChange('post_unit_hooks', hooks)} />
      </Section>

      {/* ── 16. Pre-Dispatch Hooks ── */}
      <Section title="Pre-Dispatch Hooks" defaultOpen={false}>
        <p className="text-xs text-muted-foreground -mt-2 mb-3">
          Hooks that intercept a unit before it is dispatched. Can modify, skip, or replace the unit prompt.
        </p>
        <HookEditor hookType="pre" hooks={preHooks}
          onChange={hooks => onChange('pre_dispatch_hooks', hooks)} />
      </Section>

      {/* Bottom save button */}
      <div className="flex justify-end pt-2 pb-6">
        <Button disabled={!dirty || saving} onClick={onSave} className="gap-1.5">
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : `Save${saveLabel ? ` ${saveLabel}` : ''} Preferences`}
        </Button>
      </div>
    </div>
  );
}
