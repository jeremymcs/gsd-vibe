// GSD VibeFlow - GSD-2 Preferences Tab Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import { Gsd2PreferencesTab } from '../gsd2-preferences-tab';

vi.mock('@/lib/queries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/queries')>();
  return {
    ...actual,
    useGsd2Preferences: vi.fn(),
    useGsd2SavePreferences: vi.fn(),
    useGsd2Models: vi.fn(),
  };
});

import { useGsd2Preferences, useGsd2SavePreferences, useGsd2Models } from '@/lib/queries';

const MOCK_PREFS_DATA = {
  merged: {
    mode: 'solo',
    budget_ceiling: 10.0,
    budget_enforcement: 'pause',
    unique_milestone_ids: true,
    skill_discovery: 'suggest',
    git: {
      auto_push: false,
      isolation: 'worktree',
      merge_strategy: 'squash',
    },
    phases: {
      skip_research: false,
    },
  },
  scopes: {
    mode: 'project',
    budget_ceiling: 'global',
    budget_enforcement: 'default',
    unique_milestone_ids: 'project',
    skill_discovery: 'default',
    git: 'project',
    phases: 'default',
  },
  global_raw: { budget_ceiling: 10.0 },
  project_raw: { mode: 'solo', unique_milestone_ids: true, git: { auto_push: false } },
};

describe('Gsd2PreferencesTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useGsd2SavePreferences as Mock).mockReturnValue({
      isPending: false,
      mutate: vi.fn(),
    });
    (useGsd2Models as Mock).mockReturnValue({
      data: [
        { provider: 'anthropic', id: 'claude-opus-4-6', name: 'Claude Opus' },
        { provider: 'anthropic', id: 'claude-sonnet-4-6', name: 'Claude Sonnet' },
        { provider: 'anthropic', id: 'claude-haiku-4-5', name: 'Claude Haiku' },
      ],
    });
  });

  it('renders grouped preference fields with scope badges', () => {
    (useGsd2Preferences as Mock).mockReturnValue({
      data: MOCK_PREFS_DATA,
      isLoading: false,
      isError: false,
    });

    render(<Gsd2PreferencesTab projectId="proj-1" projectPath="/tmp/proj-1" />);

    // Group headers should appear
    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('Git')).toBeInTheDocument();
    expect(screen.getByText('Budget & Tokens')).toBeInTheDocument();

    // Scope badges — use getAllByText since scope selector also has "project"/"global"
    expect(screen.getAllByText('project').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('global').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('default').length).toBeGreaterThanOrEqual(1);
  });

  it('hides scope badges and project toggle in global-only mode', () => {
    (useGsd2Preferences as Mock).mockReturnValue({
      data: MOCK_PREFS_DATA,
      isLoading: false,
      isError: false,
    });

    render(<Gsd2PreferencesTab projectId="" projectPath="" />);

    // Should mention "global preferences" in the subtitle
    expect(screen.getByText(/editing global preferences/)).toBeInTheDocument();

    // Scope selector buttons should not be rendered
    expect(screen.queryByText('Save to project')).not.toBeInTheDocument();
  });

  it('renders enum fields as select dropdowns', () => {
    (useGsd2Preferences as Mock).mockReturnValue({
      data: MOCK_PREFS_DATA,
      isLoading: false,
      isError: false,
    });

    render(<Gsd2PreferencesTab projectId="proj-1" projectPath="/tmp/proj-1" />);

    expect(screen.getByLabelText('Mode')).toBeInTheDocument();
    expect(screen.getByLabelText('Budget Enforcement')).toBeInTheDocument();
  });

  it('renders boolean fields as switches', () => {
    (useGsd2Preferences as Mock).mockReturnValue({
      data: MOCK_PREFS_DATA,
      isLoading: false,
      isError: false,
    });

    render(<Gsd2PreferencesTab projectId="proj-1" projectPath="/tmp/proj-1" />);

    const toggle = screen.getByLabelText('Unique Milestone IDs');
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveAttribute('role', 'switch');
    expect(toggle).toHaveAttribute('data-state', 'checked');
  });

  it('renders number fields as number inputs', () => {
    (useGsd2Preferences as Mock).mockReturnValue({
      data: MOCK_PREFS_DATA,
      isLoading: false,
      isError: false,
    });

    render(<Gsd2PreferencesTab projectId="proj-1" projectPath="/tmp/proj-1" />);

    const budgetInput = screen.getByLabelText('Budget Ceiling ($)');
    expect(budgetInput).toBeInTheDocument();
    expect(budgetInput).toHaveAttribute('type', 'number');
    expect(budgetInput).toHaveValue(10);
  });

  it('shows error state when isError is true', () => {
    (useGsd2Preferences as Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });

    render(<Gsd2PreferencesTab projectId="proj-1" projectPath="/tmp/proj-1" />);

    expect(screen.getByText(/Failed to load preferences/i)).toBeInTheDocument();
  });

  it('shows loading skeleton when isLoading is true', () => {
    (useGsd2Preferences as Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    const { container } = render(
      <Gsd2PreferencesTab projectId="proj-1" projectPath="/tmp/proj-1" />,
    );

    expect(
      container.querySelector('[class*="animate"]') ??
        container.querySelector('.bg-muted'),
    ).toBeTruthy();
  });

  it('enables Save button when a field is modified', () => {
    (useGsd2Preferences as Mock).mockReturnValue({
      data: MOCK_PREFS_DATA,
      isLoading: false,
      isError: false,
    });

    render(<Gsd2PreferencesTab projectId="proj-1" projectPath="/tmp/proj-1" />);

    // The exact Save button has an SVG icon + text "Save"
    const saveButton = screen.getByRole('button', { name: /^Save$/ });
    expect(saveButton).toBeDisabled();

    // Toggle a boolean to dirty the form
    const toggle = screen.getByLabelText('Unique Milestone IDs');
    fireEvent.click(toggle);

    expect(saveButton).not.toBeDisabled();
  });

  it('calls mutate with unflattened payload on Save', () => {
    const mockMutate = vi.fn();
    (useGsd2SavePreferences as Mock).mockReturnValue({
      isPending: false,
      mutate: mockMutate,
    });
    (useGsd2Preferences as Mock).mockReturnValue({
      data: MOCK_PREFS_DATA,
      isLoading: false,
      isError: false,
    });

    render(<Gsd2PreferencesTab projectId="proj-1" projectPath="/tmp/proj-1" />);

    // Toggle a field to enable Save
    const toggle = screen.getByLabelText('Unique Milestone IDs');
    fireEvent.click(toggle);

    const saveButton = screen.getByRole('button', { name: /^Save$/ });
    fireEvent.click(saveButton);

    expect(mockMutate).toHaveBeenCalledTimes(1);
    const call = mockMutate.mock.calls[0][0];
    expect(call.scope).toBe('project');
    expect(call.payload.git).toBeDefined();
    expect(typeof call.payload.git).toBe('object');
  });

  it('shows empty state when no preferences exist', () => {
    (useGsd2Preferences as Mock).mockReturnValue({
      data: { merged: {}, scopes: {}, global_raw: {}, project_raw: {} },
      isLoading: false,
      isError: false,
    });

    render(<Gsd2PreferencesTab projectId="proj-1" projectPath="/tmp/proj-1" />);

    expect(screen.getByText(/no preferences/i)).toBeInTheDocument();
  });

  it('resets changes when Reset button is clicked', () => {
    (useGsd2Preferences as Mock).mockReturnValue({
      data: MOCK_PREFS_DATA,
      isLoading: false,
      isError: false,
    });

    render(<Gsd2PreferencesTab projectId="proj-1" projectPath="/tmp/proj-1" />);

    const toggle = screen.getByLabelText('Unique Milestone IDs');
    fireEvent.click(toggle);

    const saveButton = screen.getByRole('button', { name: /^Save$/ });
    expect(saveButton).not.toBeDisabled();

    const resetButton = screen.getByTitle('Discard changes');
    fireEvent.click(resetButton);

    expect(saveButton).toBeDisabled();
  });

  it('groups fields into collapsible sections', () => {
    (useGsd2Preferences as Mock).mockReturnValue({
      data: MOCK_PREFS_DATA,
      isLoading: false,
      isError: false,
    });

    render(<Gsd2PreferencesTab projectId="proj-1" projectPath="/tmp/proj-1" />);

    // Groups with values should be open by default
    expect(screen.getByLabelText('Mode')).toBeInTheDocument();
    expect(screen.getByLabelText('Isolation')).toBeInTheDocument();
  });
});
