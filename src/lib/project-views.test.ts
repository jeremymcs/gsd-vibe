// VCCA - Project Views Mode Filtering Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { describe, expect, it } from 'vitest';
import {
  DEFAULT_VIEW,
  getViewSections,
  getVisibleViews,
  resolveViewFromTab,
} from './project-views';

describe('project-views mode filtering', () => {
  it('shows gsd2 group views for gsd2 projects', () => {
    const views = getVisibleViews({ isGsd2: true, isGsd1: false, userMode: 'expert' });
    const ids = new Set(views.map((view) => view.id));

    expect(ids.has('gsd2-group-progress')).toBe(true);
    expect(ids.has('gsd2-group-planning')).toBe(true);
    expect(ids.has('gsd2-group-metrics')).toBe(true);
    expect(ids.has('gsd2-group-commands')).toBe(true);
    expect(ids.has('gsd2-group-diagnostics')).toBe(true);
    expect(ids.has('gsd2-headless')).toBe(true);
    expect(ids.has('gsd2-worktrees')).toBe(true);
    expect(ids.has('gsd2-sessions')).toBe(true);
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

  it('hides gsd2 views for non-gsd2 projects', () => {
    const views = getVisibleViews({ isGsd2: false, isGsd1: false, userMode: 'expert' });
    const ids = new Set(views.map((view) => view.id));

    expect(ids.has('gsd2-group-progress')).toBe(false);
    expect(ids.has('gsd2-group-planning')).toBe(false);
    expect(ids.has('gsd2-headless')).toBe(false);
  });

  it('resolves unknown tab to default view', () => {
    const resolved = resolveViewFromTab('nonexistent-tab', {
      isGsd2: true,
      isGsd1: false,
      userMode: 'expert',
    });

    expect(resolved).toBe(DEFAULT_VIEW);
  });

  it('resolves gsd tab to gsd2 view for gsd2 projects', () => {
    const resolved = resolveViewFromTab('gsd', {
      isGsd2: true,
      isGsd1: false,
      userMode: 'expert',
    });

    expect(resolved).toBe('gsd2-dashboard');
  });

  it('groups views into correct sections', () => {
    const sections = getViewSections({ isGsd2: true, isGsd1: false, userMode: 'expert' });
    const sectionNames = sections.map((section) => section.section);

    expect(sectionNames.includes('Core')).toBe(true);
    expect(sectionNames.includes('GSD')).toBe(true);
    expect(sectionNames.includes('Diagnostics')).toBe(true);
  });
});
