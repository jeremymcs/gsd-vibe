// VCCA - E2E Guided Flow Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { test, expect, type Page } from '@playwright/test';

type UserMode = 'guided' | 'expert';

async function installTauriMock(page: Page, initialMode: UserMode) {
  await page.addInitScript((mode: UserMode) => {
    const g = window as typeof window & {
      __TAURI_INTERNALS__?: Record<string, unknown>;
      __TAURI_EVENT_PLUGIN_INTERNALS__?: Record<string, unknown>;
      __mockState?: {
        mode: UserMode;
        projects: Array<Record<string, unknown>>;
      };
    };

    g.__TAURI_INTERNALS__ = g.__TAURI_INTERNALS__ || {};
    g.__TAURI_EVENT_PLUGIN_INTERNALS__ = g.__TAURI_EVENT_PLUGIN_INTERNALS__ || {};

    const state = {
      mode,
      projects: [
        {
          id: 'proj-seed-1',
          name: 'Seed Project',
          path: '/tmp/seed-project',
          description: 'Existing project for nav rendering',
          tech_stack: {
            framework: 'React',
            language: 'TypeScript',
            package_manager: 'pnpm',
            database: null,
            test_framework: 'Vitest',
            has_planning: true,
            gsd_phase_count: 0,
            gsd_todo_count: 0,
            gsd_has_requirements: false,
          },
          config: null,
          status: 'active',
          is_favorite: false,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          total_cost: 0,
          roadmap_progress: null,
          last_activity_at: '2026-01-01T00:00:00Z',
          gsd_version: 'gsd2',
        },
      ],
    };

    g.__mockState = state;

    const settingsPayload = () => ({
      theme: 'system',
      start_on_login: false,
      default_cost_limit: 100,
      notifications_enabled: true,
      notify_on_complete: true,
      notify_on_error: true,
      notify_cost_threshold: null,
      accent_color: 'cyan',
      ui_density: 'comfortable',
      font_size_scale: 'md',
      font_family: 'system',
      auto_open_last_project: false,
      window_state: 'normal',
      notify_on_phase_complete: true,
      notify_on_cost_warning: true,
      debug_logging: false,
      use_tmux: false,
      user_mode: state.mode,
    });

    const eventInvoke = (cmd: string, args: Record<string, unknown>) => {
      if (cmd === 'plugin:event|listen') return Promise.resolve(args.handler ?? 1);
      if (cmd === 'plugin:event|unlisten') return Promise.resolve(null);
      if (cmd === 'plugin:event|emit') return Promise.resolve(null);
      return null;
    };

    (g.__TAURI_INTERNALS__ as { invoke?: (cmd: string, args?: Record<string, unknown>) => Promise<unknown> }).invoke = async (
      cmd,
      args = {}
    ) => {
      if (cmd.startsWith('plugin:event|')) {
        return eventInvoke(cmd, args);
      }

      switch (cmd) {
        case 'onboarding_get_status':
          return {
            completed: true,
            completed_at: '2026-01-01T00:00:00Z',
            user_mode: state.mode,
            has_api_keys: true,
          };

        case 'get_settings':
          return settingsPayload();

        case 'update_settings': {
          const next = args.settings as { user_mode?: UserMode };
          if (next?.user_mode) {
            state.mode = next.user_mode;
          }
          return settingsPayload();
        }

        case 'get_projects_with_stats':
        case 'list_projects':
          return state.projects;

        case 'get_project': {
          const id = String(args.id ?? '');
          const project =
            state.projects.find((p) => p.id === id) ??
            state.projects[0] ??
            null;
          return project;
        }

        case 'get_unread_notification_count':
          return 0;

        case 'list_project_templates':
          return [
            {
              id: 'react-ts',
              name: 'React + TypeScript',
              description: 'Vite React app with TypeScript',
              language: 'TypeScript',
              category: 'web',
              archetype: 'frontend',
              tags: ['react', 'vite'],
            },
          ];

        case 'list_gsd_planning_templates':
          return [];

        case 'gsd2_list_models':
          return [];

        case 'pick_folder':
          return '/tmp/gsd-e2e';

        case 'check_project_path':
          return true;

        case 'scaffold_project':
          return {
            projectPath: '/tmp/gsd-e2e/guided-e2e-project',
            projectName: 'guided-e2e-project',
            templateId: 'react-ts',
            filesCreated: ['package.json'],
            gsdSeeded: true,
            gitInitialized: true,
          };

        case 'import_project_enhanced': {
          const createdProject = {
            id: 'proj-guided-e2e',
            name: 'guided-e2e-project',
            path: '/tmp/gsd-e2e/guided-e2e-project',
            description: 'Guided flow E2E project',
            tech_stack: {
              framework: 'React',
              language: 'TypeScript',
              package_manager: 'pnpm',
              database: null,
              test_framework: 'Vitest',
              has_planning: true,
              gsd_phase_count: 1,
              gsd_todo_count: 1,
              gsd_has_requirements: true,
            },
            config: null,
            status: 'active',
            is_favorite: false,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
            total_cost: 0,
            roadmap_progress: null,
            last_activity_at: '2026-01-01T00:00:00Z',
            gsd_version: 'gsd2',
          };

          state.projects.unshift(createdProject);

          return {
            project: createdProject,
            docs: null,
            pty_session_id: null,
            import_mode: 'gsd',
            markdown_scan: null,
          };
        }

        case 'gsd2_generate_plan_preview':
          return {
            intent: 'guided intent',
            milestone: {
              title: 'Guided E2E Milestone',
              summary: 'A generated milestone for e2e validation.',
              slices: [
                {
                  id: 'S01',
                  title: 'Bootstrap UI',
                  goal: 'Create project shell and baseline UI.',
                  risk: 'low',
                  depends_on: [],
                },
              ],
            },
          };

        case 'gsd2_headless_start':
        case 'gsd2_headless_start_with_model':
          return 'sid-guided-e2e';

        case 'gsd2_headless_get_session':
          return null;

        case 'gsd2_get_health':
          return {
            budget_spent: 0,
            budget_ceiling: null,
            active_milestone_id: 'M001',
            active_milestone_title: 'Guided E2E Milestone',
            active_slice_id: 'S01',
            active_slice_title: 'Bootstrap UI',
            active_task_id: 'T01',
            active_task_title: 'Initialize app',
            phase: 'idle',
            blocker: null,
            next_action: null,
            milestones_done: 0,
            milestones_total: 1,
            slices_done: 0,
            slices_total: 1,
            tasks_done: 0,
            tasks_total: 1,
            env_error_count: 0,
            env_warning_count: 0,
          };

        case 'gsd2_get_visualizer_data':
          return {
            milestones: [
              {
                id: 'M001',
                title: 'Guided E2E Milestone',
                done: false,
                status: 'active',
                dependencies: [],
                slices: [
                  {
                    id: 'S01',
                    title: 'Bootstrap UI',
                    done: false,
                    status: 'active',
                    risk: 'low',
                    dependencies: [],
                    tasks: [],
                    verification: null,
                    changelog: [],
                  },
                ],
                discussion_state: 'draft',
                cost: 0,
              },
            ],
            tree: [],
            cost_by_milestone: [],
            cost_by_model: [],
            timeline: [],
            critical_path: { path: [], slack_map: [] },
            agent_activity: {
              is_active: false,
              pid: null,
              current_unit: null,
              completed_units: 0,
              total_slices: 1,
            },
            by_phase: [],
            by_slice: [],
            by_model: [],
            units: [],
            totals: { units: 0, total_cost: 0, total_tokens: 0, duration_ms: 0, tool_calls: 0 },
            knowledge: { exists: false, entry_count: 0 },
            captures: { exists: false, pending_count: 0 },
            health: {
              active_milestone_id: 'M001',
              active_slice_id: 'S01',
              active_task_id: 'T01',
              phase: 'idle',
              milestones_done: 0,
              milestones_total: 1,
              slices_done: 0,
              slices_total: 1,
              tasks_done: 0,
              tasks_total: 1,
            },
            stats: {
              milestones_missing_summary: 0,
              slices_missing_summary: 0,
              recent_changelog: [],
            },
          };

        case 'gsd2_headless_query':
          return { state: 'idle', next: null, cost: 0 };

        case 'watch_project_files':
          return true;

        default:
          return null;
      }
    };
  }, initialMode);
}

test.describe('Guided Mode Flow', () => {
  test('renders correct global navigation for expert and guided modes', async ({ page }) => {
    await installTauriMock(page, 'expert');

    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Todos' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'GSD Preferences' })).toBeVisible();

    await installTauriMock(page, 'guided');
    await page.reload();

    await expect(page.getByRole('button', { name: 'Todos' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'GSD Preferences' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Settings' })).toBeVisible();
  });

  test('guided project wizard routes to guided workspace overview after start', async ({ page }) => {
    await installTauriMock(page, 'guided');

    await page.goto('/projects');
    await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();

    await page.getByRole('button', { name: 'Add Project' }).click();
    await expect(page.getByRole('heading', { name: 'Guided Project Wizard' })).toBeVisible();

    await page.getByRole('button', { name: /React \+ TypeScript/i }).click();
    await page.getByLabel('Project name').fill('guided-e2e-project');
    await page.getByRole('button', { name: 'Browse' }).click();

    await expect(page.getByText(/available/i)).toBeVisible();

    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByPlaceholder(/Build a SaaS dashboard/i).fill(
      'Build a guided starter project with auth, dashboard analytics, and CI.'
    );

    await page.getByRole('button', { name: /Generate Plan/i }).click();
    await expect(page.getByText('Guided E2E Milestone')).toBeVisible();

    await page.getByRole('button', { name: 'Approve / Adjust' }).click();
    await page.getByLabel(/I approve this plan preview/i).click();
    await page.getByRole('button', { name: 'Start Building' }).click();

    await expect(page).toHaveURL(/\/projects\/proj-guided-e2e\?view=/);
    await expect(page.getByRole('button', { name: /Start Session/i })).toBeVisible();
  });
});
