// GSD Vibe - GSD-2 Tauri Invoke Wrapper Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue(null),
}));

import { invoke } from '@tauri-apps/api/core';
import {
  gsd2ListMilestones,
  gsd2GetMilestone,
  gsd2GetSlice,
  gsd2DeriveState,
} from '../tauri';

describe('GSD-2 invoke wrappers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('gsd2ListMilestones calls invoke with correct command and args', async () => {
    await gsd2ListMilestones('proj-1');
    expect(invoke).toHaveBeenCalledWith('gsd2_list_milestones', { projectId: 'proj-1' });
  });

  it('gsd2GetMilestone calls invoke with projectId and milestoneId', async () => {
    await gsd2GetMilestone('proj-1', 'M001');
    expect(invoke).toHaveBeenCalledWith('gsd2_get_milestone', { projectId: 'proj-1', milestoneId: 'M001' });
  });

  it('gsd2GetSlice calls invoke with THREE args: projectId, milestoneId, sliceId', async () => {
    await gsd2GetSlice('proj-1', 'M001', 'S01');
    expect(invoke).toHaveBeenCalledWith('gsd2_get_slice', { projectId: 'proj-1', milestoneId: 'M001', sliceId: 'S01' });
  });

  it('gsd2DeriveState calls invoke with projectId', async () => {
    await gsd2DeriveState('proj-1');
    expect(invoke).toHaveBeenCalledWith('gsd2_derive_state', { projectId: 'proj-1' });
  });
});
