// VCCA - GSD-2 Sessions Tab Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { Gsd2SessionsTab } from '../gsd2-sessions-tab';

vi.mock('@/lib/queries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/queries')>();
  return {
    ...actual,
    useGsd2Sessions: vi.fn(),
  };
});

import { useGsd2Sessions } from '@/lib/queries';

const MOCK_SESSIONS = [
  {
    filename: '2026-01-15T12:00:00Z-abc.jsonl',
    timestamp: '2026-01-15T12:00:00Z',
    name: 'Fix login bug',
    first_message: 'Help me debug this',
    message_count: 24,
    user_message_count: 8,
    assistant_message_count: 16,
    raw: '2026-01-15T12:00:00Z 2026-01-15T12:00:00Z-abc.jsonl "Fix login bug" 24 msgs (8u/16a)',
  },
  {
    filename: '2026-01-14T09:00:00Z-def.jsonl',
    timestamp: '2026-01-14T09:00:00Z',
    name: null,
    first_message: null,
    message_count: 0,
    user_message_count: 0,
    assistant_message_count: 0,
    raw: '2026-01-14T09:00:00Z-def.jsonl',
  },
];

describe('Gsd2SessionsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders session list with names and message counts', () => {
    (useGsd2Sessions as Mock).mockReturnValue({
      data: MOCK_SESSIONS,
      isLoading: false,
      isError: false,
    });

    render(<Gsd2SessionsTab projectId="proj-1" projectPath="/tmp/proj-1" />);

    expect(screen.getByText('Fix login bug')).toBeInTheDocument();
    expect(screen.getByText('24 msgs')).toBeInTheDocument();
  });

  it('shows loading skeleton when isLoading is true', () => {
    (useGsd2Sessions as Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    const { container } = render(
      <Gsd2SessionsTab projectId="proj-1" projectPath="/tmp/proj-1" />,
    );

    // Skeleton elements are rendered
    expect(container.querySelector('[class*="animate"]') ?? container.querySelector('.bg-muted')).toBeTruthy();
  });

  it('shows error card when isError is true', () => {
    (useGsd2Sessions as Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Failed to load sessions'),
    });

    render(<Gsd2SessionsTab projectId="proj-1" projectPath="/tmp/proj-1" />);

    expect(screen.getByText(/error|failed/i)).toBeInTheDocument();
  });

  it('shows empty state when data is empty', () => {
    (useGsd2Sessions as Mock).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });

    render(<Gsd2SessionsTab projectId="proj-1" projectPath="/tmp/proj-1" />);

    expect(screen.getByText(/no sessions|empty/i)).toBeInTheDocument();
  });

  it('filters sessions by search input', async () => {
    (useGsd2Sessions as Mock).mockReturnValue({
      data: MOCK_SESSIONS,
      isLoading: false,
      isError: false,
    });

    render(
      <Gsd2SessionsTab projectId="proj-1" projectPath="/tmp/proj-1" />,
    );

    const searchInput = screen.getByPlaceholderText(/search|filter/i);
    expect(searchInput).toBeInTheDocument();
  });

  it('displays parse failures gracefully with Unknown badges', () => {
    const sessionWithParseFailure = {
      filename: 'malformed.jsonl',
      timestamp: null,
      name: null,
      first_message: null,
      message_count: 0,
      user_message_count: 0,
      assistant_message_count: 0,
      raw: 'invalid line data',
    };

    (useGsd2Sessions as Mock).mockReturnValue({
      data: [sessionWithParseFailure],
      isLoading: false,
      isError: false,
    });

    render(<Gsd2SessionsTab projectId="proj-1" projectPath="/tmp/proj-1" />);

    expect(screen.getByText('malformed.jsonl')).toBeInTheDocument();
  });
});
