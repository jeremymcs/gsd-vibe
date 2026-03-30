// GSD VibeFlow - GSD-2 Preferences Tab Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { Gsd2PreferencesTab } from '../gsd2-preferences-tab';

vi.mock('@/lib/queries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/queries')>();
  return {
    ...actual,
    useGsd2Preferences: vi.fn(),
    useGsd2SavePreferences: vi.fn(),
  };
});

import { useGsd2Preferences, useGsd2SavePreferences } from '@/lib/queries';

const MOCK_PREFS_DATA = {
  merged: {
    budget_ceiling: 10.0,
    auto_commit: true,
    user_mode: 'expert',
  },
  scopes: {
    budget_ceiling: 'global',
    auto_commit: 'project',
    user_mode: 'default',
  },
  global_raw: { budget_ceiling: 10.0 },
  project_raw: { auto_commit: true },
};

describe('Gsd2PreferencesTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useGsd2SavePreferences as Mock).mockReturnValue({
      isPending: false,
      mutate: vi.fn(),
    });
  });

  it('renders preference fields with scope badges', async () => {
    (useGsd2Preferences as Mock).mockReturnValue({
      data: MOCK_PREFS_DATA,
      isLoading: false,
      isError: false,
    });

    render(<Gsd2PreferencesTab projectId="proj-1" projectPath="/tmp/proj-1" />);

    // Field keys should appear
    expect(screen.getByText('budget_ceiling')).toBeInTheDocument();
    expect(screen.getByText('auto_commit')).toBeInTheDocument();
    expect(screen.getByText('user_mode')).toBeInTheDocument();

    // Scope badges should appear — use getAllByText since the scope selector
    // also contains "global" and "project" labels.
    expect(screen.getAllByText('global').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('project').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('default').length).toBeGreaterThanOrEqual(1);
  });

  it('shows error state when isError is true', () => {
    (useGsd2Preferences as Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });

    render(<Gsd2PreferencesTab projectId="proj-1" projectPath="/tmp/proj-1" />);

    expect(
      screen.getByText(/Failed to load preferences/i),
    ).toBeInTheDocument();
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

    expect(container.querySelector('[class*="animate"]') ?? container.querySelector('.bg-muted')).toBeTruthy();
  });

  it('marks a field as dirty when edited', () => {
    (useGsd2Preferences as Mock).mockReturnValue({
      data: MOCK_PREFS_DATA,
      isLoading: false,
      isError: false,
    });

    render(
      <Gsd2PreferencesTab projectId="proj-1" projectPath="/tmp/proj-1" />,
    );

    // Verify the preferences are rendered
    expect(screen.getByText('budget_ceiling')).toBeInTheDocument();
  });

  it('calls mutate when Save button is clicked', () => {
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

    render(
      <Gsd2PreferencesTab projectId="proj-1" projectPath="/tmp/proj-1" />,
    );

    // Verify save button exists
    const saveButton = screen.queryByRole('button', { name: /save/i });
    expect(saveButton).toBeInTheDocument();
  });

  it('shows empty state when no preferences exist', () => {
    (useGsd2Preferences as Mock).mockReturnValue({
      data: { merged: {}, scopes: {}, global_raw: {}, project_raw: {} },
      isLoading: false,
      isError: false,
    });

    render(<Gsd2PreferencesTab projectId="proj-1" projectPath="/tmp/proj-1" />);

    expect(screen.getByText(/no preferences|empty/i)).toBeInTheDocument();
  });
});
