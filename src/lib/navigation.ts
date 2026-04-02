// VCCA - Shared Navigation Configuration
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  LayoutDashboard,
  Inbox,
  Briefcase,
  Search,
  SearchCheck,
  CheckSquare,
  Terminal,
  Bell,
  Settings,
  Settings2,
  LucideIcon,
} from 'lucide-react';

export interface NavItem {
  type: 'link';
  name: string;
  href: string;
  icon: LucideIcon;
}

export interface NavSection {
  type: 'section';
  label: string;
}

export type NavigationItem = NavItem | NavSection;

export const navigation: NavigationItem[] = [
  { type: 'section', label: 'Workspace' },
  { type: 'link', name: 'Projects', href: '/', icon: LayoutDashboard },
  { type: 'link', name: 'Inbox', href: '/inbox', icon: Inbox },
  { type: 'link', name: 'Portfolio', href: '/portfolio', icon: Briefcase },
  { type: 'link', name: 'Search', href: '/search', icon: Search },
  { type: 'link', name: 'Review', href: '/review', icon: SearchCheck },
  { type: 'link', name: 'Todos', href: '/todos', icon: CheckSquare },
  { type: 'link', name: 'Terminal', href: '/terminal', icon: Terminal },

  { type: 'section', label: 'System' },
  { type: 'link', name: 'Notifications', href: '/notifications', icon: Bell },
  { type: 'link', name: 'GSD Preferences', href: '/gsd-preferences', icon: Settings2 },
  { type: 'link', name: 'Settings', href: '/settings', icon: Settings },
];

/** Flat array of link-only navigation items (used by command palette + breadcrumbs) */
export const navLinks: NavItem[] = navigation.filter(
  (item): item is NavItem => item.type === 'link'
);

/**
 * Return global nav links visible for the active user mode.
 * Guided mode hides advanced global entries.
 */
export function getVisibleNavLinks(userMode: string): NavItem[] {
  if (userMode === 'guided') {
    return navLinks.filter((item) => item.name !== 'Todos' && item.name !== 'GSD Preferences');
  }

  return navLinks;
}

/**
 * Return sectioned navigation visible for the active user mode.
 * Guided mode prunes hidden links and drops now-empty sections.
 */
export function getVisibleNavigation(userMode: string): NavigationItem[] {
  const visibleLinks = getVisibleNavLinks(userMode);
  const visibleHrefs = new Set(visibleLinks.map((item) => item.href));
  const result: NavigationItem[] = [];

  for (let i = 0; i < navigation.length; i += 1) {
    const item = navigation[i];

    if (item.type === 'section') {
      const hasVisibleLinkInSection = navigation
        .slice(i + 1)
        .some((next) => next.type === 'link' && visibleHrefs.has(next.href));

      if (hasVisibleLinkInSection) {
        result.push(item);
      }
      continue;
    }

    if (visibleHrefs.has(item.href)) {
      result.push(item);
    }
  }

  return result;
}
