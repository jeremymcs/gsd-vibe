// GSD VibeFlow - Navigation Mode Filtering Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { describe, expect, it } from 'vitest';
import {
  getVisibleNavigation,
  getVisibleNavLinks,
  navLinks,
  type NavigationItem,
} from './navigation';

function onlyLinkNames(items: NavigationItem[]): string[] {
  return items
    .filter((item) => item.type === 'link')
    .map((item) => item.name);
}

describe('navigation mode filtering', () => {
  it('hides Todos in guided mode', () => {
    const visible = getVisibleNavigation('guided');
    const names = onlyLinkNames(visible);

    expect(names).toEqual(['Home', 'Terminal', 'Notifications', 'Settings']);
  });

  it('keeps all links in expert mode', () => {
    const visible = getVisibleNavigation('expert');
    const names = onlyLinkNames(visible);

    expect(names).toEqual(['Home', 'Todos', 'Terminal', 'Notifications', 'Settings']);
  });

  it('returns only visible links from getVisibleNavLinks', () => {
    const guidedLinks = getVisibleNavLinks('guided').map((link) => link.name);

    expect(guidedLinks).toEqual(['Home', 'Terminal', 'Notifications', 'Settings']);
  });

  it('keeps navLinks as full unfiltered label lookup source', () => {
    const labels = navLinks.map((link) => link.name);

    expect(labels).toContain('Todos');
  });
});
