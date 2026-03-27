// GSD Vibe - Keyboard Shortcuts Provider
// Registers global hotkeys and exposes search/help open state
// Adds project view shortcuts (Cmd+1-6) when inside a project
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { ReactNode, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useHotkeys } from 'react-hotkeys-hook';
import { useTerminalContext } from '@/contexts/terminal-context';

/** The first 6 core views, mapped to Cmd+1 through Cmd+6 when inside a project */
const VIEW_HOTKEYS = [
  'overview',
  'files',
  'dependencies',
  'knowledge',
  'shell',
  'envvars',
] as const;

interface ShortcutsState {
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  helpOpen: boolean;
  setHelpOpen: (open: boolean) => void;
}

interface KeyboardShortcutsProviderProps {
  children: (state: ShortcutsState) => ReactNode;
}

/** Extract project ID from pathname */
function useProjectRouteId(): string | null {
  const location = useLocation();
  const match = location.pathname.match(/^\/projects\/([^/]+)/);
  return match ? match[1] : null;
}

export function KeyboardShortcutsProvider({
  children,
}: KeyboardShortcutsProviderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const navigate = useNavigate();
  const { shellPanelCollapsed, setShellPanelCollapsed } = useTerminalContext();
  const projectId = useProjectRouteId();

  const toggleSearch = useCallback(() => {
    setSearchOpen((prev) => !prev);
  }, []);

  const toggleHelp = useCallback(() => {
    setHelpOpen((prev) => !prev);
  }, []);

  const toggleShell = useCallback(() => {
    setShellPanelCollapsed(!shellPanelCollapsed);
  }, [shellPanelCollapsed, setShellPanelCollapsed]);

  // Search: Cmd/Ctrl+K
  useHotkeys('mod+k', (e) => {
    e.preventDefault();
    toggleSearch();
  }, { enableOnFormTags: false });

  // Navigation shortcuts: Cmd+1-3 (global) or Cmd+1-6 (project views)
  useHotkeys('mod+1', (e) => {
    e.preventDefault();
    if (projectId) {
      void navigate(`/projects/${projectId}?view=${VIEW_HOTKEYS[0]}`);
    } else {
      void navigate('/');
    }
  }, { enableOnFormTags: false }, [projectId]);

  useHotkeys('mod+2', (e) => {
    e.preventDefault();
    if (projectId) {
      void navigate(`/projects/${projectId}?view=${VIEW_HOTKEYS[1]}`);
    } else {
      void navigate('/projects');
    }
  }, { enableOnFormTags: false }, [projectId]);

  useHotkeys('mod+3', (e) => {
    e.preventDefault();
    if (projectId) {
      void navigate(`/projects/${projectId}?view=${VIEW_HOTKEYS[2]}`);
    } else {
      void navigate('/terminal');
    }
  }, { enableOnFormTags: false }, [projectId]);

  useHotkeys('mod+4', (e) => {
    e.preventDefault();
    if (projectId) {
      void navigate(`/projects/${projectId}?view=${VIEW_HOTKEYS[3]}`);
    }
  }, { enableOnFormTags: false }, [projectId]);

  useHotkeys('mod+5', (e) => {
    e.preventDefault();
    if (projectId) {
      void navigate(`/projects/${projectId}?view=${VIEW_HOTKEYS[4]}`);
    }
  }, { enableOnFormTags: false }, [projectId]);

  useHotkeys('mod+6', (e) => {
    e.preventDefault();
    if (projectId) {
      void navigate(`/projects/${projectId}?view=${VIEW_HOTKEYS[5]}`);
    }
  }, { enableOnFormTags: false }, [projectId]);

  // Shell toggle: Cmd/Ctrl+\
  useHotkeys('mod+\\', (e) => {
    e.preventDefault();
    toggleShell();
  }, { enableOnFormTags: false });

  // Help: Shift+/ (i.e. ?)
  useHotkeys('shift+/', (e) => {
    e.preventDefault();
    toggleHelp();
  }, { enableOnFormTags: false });

  // Settings: Cmd/Ctrl+,
  useHotkeys('mod+,', (e) => {
    e.preventDefault();
    void navigate('/settings');
  }, { enableOnFormTags: false });

  // Escape closes search/help
  useHotkeys('escape', () => {
    if (searchOpen) setSearchOpen(false);
    if (helpOpen) setHelpOpen(false);
  });

  return (
    <>
      {children({ searchOpen, setSearchOpen, helpOpen, setHelpOpen })}
    </>
  );
}
