// VCCA - Keyboard Shortcut Definitions
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

export function isMac(): boolean {
  return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
}

export function modKey(): string {
  return isMac() ? '\u2318' : 'Ctrl';
}

export interface ShortcutDef {
  /** Hotkey string for react-hotkeys-hook (e.g. "mod+k") */
  keys: string;
  /** Human-readable description */
  description: string;
  /** Grouping category */
  category: 'Navigation' | 'Search' | 'Shell' | 'General' | 'Project Views';
  /** Display keys shown in UI (platform aware) */
  displayKeys: () => string[];
}

export const SHORTCUTS: ShortcutDef[] = [
  // Search
  {
    keys: 'mod+k',
    description: 'Open command palette',
    category: 'Search',
    displayKeys: () => [modKey(), 'K'],
  },

  // Navigation (global — overridden inside project context)
  {
    keys: 'mod+1',
    description: 'Go to Dashboard / Overview',
    category: 'Navigation',
    displayKeys: () => [modKey(), '1'],
  },
  {
    keys: 'mod+2',
    description: 'Go to Projects / Files',
    category: 'Navigation',
    displayKeys: () => [modKey(), '2'],
  },
  {
    keys: 'mod+3',
    description: 'Go to Terminal / Dependencies',
    category: 'Navigation',
    displayKeys: () => [modKey(), '3'],
  },

  // Project-specific view shortcuts
  {
    keys: 'mod+4',
    description: 'Knowledge (in project)',
    category: 'Project Views',
    displayKeys: () => [modKey(), '4'],
  },
  {
    keys: 'mod+5',
    description: 'Shell (in project)',
    category: 'Project Views',
    displayKeys: () => [modKey(), '5'],
  },
  {
    keys: 'mod+6',
    description: 'Env Vars (in project)',
    category: 'Project Views',
    displayKeys: () => [modKey(), '6'],
  },

  // Shell
  {
    keys: 'mod+\\',
    description: 'Toggle shell panel',
    category: 'Shell',
    displayKeys: () => [modKey(), '\\'],
  },
  {
    keys: 'mod+shift+\\',
    description: 'Split terminal',
    category: 'Shell',
    displayKeys: () => [modKey(), 'Shift', '\\'],
  },

  // General
  {
    keys: 'shift+/',
    description: 'Show keyboard shortcuts',
    category: 'General',
    displayKeys: () => ['?'],
  },
  {
    keys: 'mod+,',
    description: 'Open settings',
    category: 'General',
    displayKeys: () => [modKey(), ','],
  },
];
