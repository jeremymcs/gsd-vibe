// GSD Vibe - GSD-2 Query Key Factory Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { describe, it, expect } from 'vitest';
import { queryKeys } from '../query-keys';

describe('GSD-2 query keys', () => {
  it('gsd2Milestones generates key with projectId', () => {
    expect(queryKeys.gsd2Milestones('proj-1')).toEqual(['gsd2', 'milestones', 'proj-1']);
  });

  it('gsd2Milestone generates key with projectId and milestoneId', () => {
    expect(queryKeys.gsd2Milestone('proj-1', 'M001')).toEqual(['gsd2', 'milestone', 'proj-1', 'M001']);
  });

  it('gsd2Slice generates key with projectId, milestoneId, and sliceId', () => {
    expect(queryKeys.gsd2Slice('proj-1', 'M001', 'S01')).toEqual(['gsd2', 'slice', 'proj-1', 'M001', 'S01']);
  });

  it('gsd2DerivedState generates key with projectId', () => {
    expect(queryKeys.gsd2DerivedState('proj-1')).toEqual(['gsd2', 'derived-state', 'proj-1']);
  });

  it('generates unique keys across GSD-2 resources', () => {
    const keys = [
      queryKeys.gsd2Milestones('proj-1'),
      queryKeys.gsd2Milestone('proj-1', 'M001'),
      queryKeys.gsd2Slice('proj-1', 'M001', 'S01'),
      queryKeys.gsd2DerivedState('proj-1'),
    ];
    const uniqueKeys = new Set(keys.map(k => JSON.stringify(k)));
    expect(uniqueKeys.size).toBe(keys.length);
  });

  it('differentiates keys for different milestones', () => {
    expect(queryKeys.gsd2Milestone('proj-1', 'M001')).not.toEqual(queryKeys.gsd2Milestone('proj-1', 'M002'));
  });

  it('differentiates keys for different slices', () => {
    expect(queryKeys.gsd2Slice('proj-1', 'M001', 'S01')).not.toEqual(queryKeys.gsd2Slice('proj-1', 'M001', 'S02'));
  });
});
