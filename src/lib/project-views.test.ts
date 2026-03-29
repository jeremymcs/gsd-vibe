// GSD VibeFlow - Project Views Mode Filtering Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { describe, expect, it } from 'vitest';
import {
  DEFAULT_VIEW,
  getViewSections,
  getVisibleViews,
  resolveViewFromTab,
} from './project-views';

describe('project-views mode filtering', () => {
  it('hides expert-only GSD2 views in guided mode', () => {
    const views = getVisibleViews({ isGsd2: true, isGsd1: false, userMode: 'guided' });
    const ids = new Set(views.map((view) => view.id));

    expect(ids.has('gsd2-dashboard')).toBe(true);
    expect(ids.has('gsd2-health')).toBe(true);
    expect(ids.has('gsd2-worktrees')).toBe(true);

    expect(ids.has('gsd2-milestones')).toBe(false);
    expect(ids.has('gsd2-slices')).toBe(false);
    expect(ids.has('gsd2-tasks')).toBe(false);
    expect(ids.has('gsd2-doctor')).toBe(false);
    expect(ids.has('gsd2-reports')).toBe(false);
  });

  it('keeps core views visible in guided mode', () => {
    const views = getVisibleViews({ isGsd2: true, isGsd1: false, userMode: 'guided' });
    const ids = new Set(views.map((view) => view.id));

    expect(ids.has('overview')).toBe(true);
    expect(ids.has('files')).toBe(true);
    expect(ids.has('dependencies')).toBe(true);
    expect(ids.has('knowledge')).toBe(true);
    expect(ids.has('shell')).toBe(true);
    expect(ids.has('envvars')).toBe(true);
  });

  it('falls back expert-only view tab to default view in guided mode', () => {
    const resolved = resolveViewFromTab('gsd2-milestones', {
      isGsd2: true,
      isGsd1: false,
      userMode: 'guided',
    });

    expect(resolved).toBe(DEFAULT_VIEW);
  });

  it('keeps expert-only view tab in expert mode', () => {
    const resolved = resolveViewFromTab('gsd2-milestones', {
      isGsd2: true,
      isGsd1: false,
      userMode: 'expert',
    });

    expect(resolved).toBe('gsd2-milestones');
  });

  it('removes empty diagnostics section in guided mode', () => {
    const sections = getViewSections({ isGsd2: true, isGsd1: false, userMode: 'guided' });
    const sectionNames = sections.map((section) => section.section);

    expect(sectionNames.includes('Core')).toBe(true);
    expect(sectionNames.includes('GSD')).toBe(true);
    expect(sectionNames.includes('Diagnostics')).toBe(false);
  });
});
