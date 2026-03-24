// GSD VibeFlow - Command Palette (Cmd+K)
// Global search with cmdk for projects, phases, decisions, knowledge, pages, and project views
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Command } from 'cmdk';
import {
  Search,
  FolderOpen,
  GitBranch,
  BookOpen,
  Layers,
  Clock,
  ArrowRight,
  X,
  Plus,
  Settings,
} from 'lucide-react';
import { navLinks } from '@/lib/navigation';
import { useGlobalSearch, useProject } from '@/lib/queries';
import {
  getRecentSearches,
  addRecentSearch,
  clearRecentSearches,
} from '@/lib/recent-searches';
import { modKey } from '@/hooks/use-keyboard-shortcuts';
import { getVisibleViews, type ProjectViewContext } from '@/lib/project-views';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Extract project ID from current pathname */
function useCurrentProjectId(): string | null {
  const location = useLocation();
  const match = location.pathname.match(/^\/projects\/([^/]+)/);
  return match ? match[1] : null;
}

export function CommandPalette({ onOpenChange }: CommandPaletteProps) {
  const [inputValue, setInputValue] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const navigate = useNavigate();
  const recentSearches = getRecentSearches();

  // Detect if we're inside a project
  const projectId = useCurrentProjectId();
  const { data: project } = useProject(projectId ?? '');
  const [searchParams] = useSearchParams();
  const currentView = searchParams.get('view') ?? searchParams.get('tab') ?? 'overview';

  // Compute visible project views
  const viewCtx: ProjectViewContext = useMemo(() => {
    const hasPlanning = project?.tech_stack?.has_planning ?? false;
    const isGsd2 = project?.gsd_version === 'gsd2';
    const isGsd1 = hasPlanning && !isGsd2;
    return { isGsd2, isGsd1 };
  }, [project]);

  const visibleViews = useMemo(
    () => (projectId ? getVisibleViews(viewCtx) : []),
    [projectId, viewCtx]
  );

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(inputValue);
    }, 200);
    return () => clearTimeout(timer);
  }, [inputValue]);

  // Determine effective query (strip prefix for type filtering)
  const effectiveQuery = debouncedQuery.replace(/^[/@?]\s*/, '');
  const prefix = debouncedQuery.match(/^([/@?])/)?.[1] ?? '';

  const { data: results } = useGlobalSearch(effectiveQuery);

  const handleSelect = useCallback(
    (value: string) => {
      if (effectiveQuery.length >= 2) {
        addRecentSearch(inputValue);
      }
      onOpenChange(false);
      setInputValue('');

      // Parse the value format: "type:path"
      if (value.startsWith('nav:')) {
        void navigate(value.slice(4));
      } else if (value.startsWith('view:')) {
        // Project view navigation
        const viewId = value.slice(5);
        if (projectId) void navigate(`/projects/${projectId}?view=${viewId}`);
      } else if (value.startsWith('action:')) {
        const action = value.slice(7);
        if (action === 'new-project' || action === 'import-project') {
          void navigate('/projects');
        } else if (action === 'settings') {
          void navigate('/settings');
        }
      } else if (value.startsWith('project:')) {
        void navigate(`/projects/${value.slice(8)}`);
      } else if (value.startsWith('phase:')) {
        const [, pid] = value.slice(6).split('|');
        if (pid) void navigate(`/projects/${pid}?view=gsd`);
      } else if (value.startsWith('decision:')) {
        void navigate('/decisions');
      } else if (value.startsWith('knowledge:')) {
        const [, pid] = value.slice(10).split('|');
        if (pid) void navigate(`/projects/${pid}?view=knowledge`);
      } else if (value.startsWith('recent:')) {
        setInputValue(value.slice(7));
      }
    },
    [navigate, onOpenChange, effectiveQuery, inputValue, projectId]
  );

  const showResults = effectiveQuery.length >= 2 && results;
  const showRecent = !inputValue && recentSearches.length > 0;
  const showPages = !inputValue || prefix === '/';

  // Filter results based on prefix
  const showProjects =
    showResults && (!prefix || prefix === '@');
  const showPhases =
    showResults && !prefix;
  const showDecisions =
    showResults && (!prefix || prefix === '?');
  const showKnowledge =
    showResults && !prefix;

  const hasResults =
    showResults &&
    ((showProjects && results.projects.length > 0) ||
      (showPhases && results.phases.length > 0) ||
      (showDecisions && results.decisions.length > 0) ||
      (showKnowledge && results.knowledge.length > 0));

  // Filter project views by search query
  const filteredViews = useMemo(() => {
    if (!visibleViews.length) return [];
    const q = effectiveQuery.toLowerCase();
    if (!q) return visibleViews.filter((v) => v.id !== currentView);
    return visibleViews.filter(
      (v) =>
        v.id !== currentView &&
        (v.label.toLowerCase().includes(q) ||
          v.section.toLowerCase().includes(q))
    );
  }, [visibleViews, effectiveQuery, currentView]);

  const showViewShortcuts = projectId && filteredViews.length > 0 && (!prefix || prefix === '/');

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Palette container */}
      <div className="relative flex justify-center pt-[20vh]">
        <Command
          className="w-full max-w-xl bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl overflow-hidden"
          shouldFilter={false}
          loop
        >
          {/* Search input */}
          <div className="flex items-center gap-2 px-4 border-b border-border/30">
            <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Command.Input
              value={inputValue}
              onValueChange={setInputValue}
              placeholder={
                projectId
                  ? "Search views, projects, phases... or type / for pages"
                  : "Search projects, phases, decisions... or type / for pages"
              }
              className="flex-1 py-3 text-sm bg-transparent outline-none placeholder:text-muted-foreground/60"
              autoFocus
            />
            {inputValue && (
              <button
                onClick={() => setInputValue('')}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Results list */}
          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
              {effectiveQuery.length >= 2
                ? 'No results found.'
                : 'Type to search...'}
            </Command.Empty>

            {/* Project View Shortcuts — shown when inside a project */}
            {showViewShortcuts && (
              <Command.Group heading="Go to View">
                {filteredViews.slice(0, 8).map((view) => {
                  const Icon = view.icon;
                  return (
                    <Command.Item
                      key={view.id}
                      value={`view:${view.id}`}
                      onSelect={handleSelect}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm cursor-pointer data-[selected=true]:bg-accent/50"
                    >
                      <Icon className="h-4 w-4 text-gsd-cyan" />
                      <span className="flex-1">{view.label}</span>
                      <span className="text-[10px] text-muted-foreground/50">{view.section}</span>
                    </Command.Item>
                  );
                })}
              </Command.Group>
            )}

            {/* Recent searches */}
            {showRecent && (
              <Command.Group
                heading={
                  <div className="flex items-center justify-between">
                    <span>Recent Searches</span>
                    <button
                      className="text-[10px] text-muted-foreground/60 hover:text-muted-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearRecentSearches();
                      }}
                    >
                      Clear
                    </button>
                  </div>
                }
              >
                {recentSearches.map((recent) => (
                  <Command.Item
                    key={recent.timestamp}
                    value={`recent:${recent.query}`}
                    onSelect={handleSelect}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm cursor-pointer data-[selected=true]:bg-accent/50"
                  >
                    <Clock className="h-3.5 w-3.5 text-muted-foreground/60" />
                    <span className="text-muted-foreground">{recent.query}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Quick Actions - always visible */}
            {showPages && (
              <Command.Group heading="Quick Actions">
                <Command.Item
                  value="action:new-project"
                  onSelect={handleSelect}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm cursor-pointer data-[selected=true]:bg-accent/50"
                >
                  <Plus className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span>New Project</span>
                  <span className="ml-auto text-[10px] text-muted-foreground/50">{modKey()}+N</span>
                </Command.Item>
                <Command.Item
                  value="action:import-project"
                  onSelect={handleSelect}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm cursor-pointer data-[selected=true]:bg-accent/50"
                >
                  <FolderOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>Import Project</span>
                </Command.Item>
                <Command.Item
                  value="action:settings"
                  onSelect={handleSelect}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm cursor-pointer data-[selected=true]:bg-accent/50"
                >
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <span>Open Settings</span>
                </Command.Item>
              </Command.Group>
            )}

            {/* Pages group */}
            {showPages && (
              <Command.Group heading="Pages">
                {navLinks
                  .filter(
                    (link) =>
                      !effectiveQuery ||
                      link.name
                        .toLowerCase()
                        .includes(effectiveQuery.toLowerCase())
                  )
                  .map((link) => (
                    <Command.Item
                      key={link.href}
                      value={`nav:${link.href}`}
                      onSelect={handleSelect}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm cursor-pointer data-[selected=true]:bg-accent/50"
                    >
                      <link.icon className="h-4 w-4 text-muted-foreground" />
                      <span>{link.name}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground/40 ml-auto" />
                    </Command.Item>
                  ))}
              </Command.Group>
            )}

            {/* Project results */}
            {showProjects && results.projects.length > 0 && (
              <Command.Group heading="Projects">
                {results.projects.map((project) => (
                  <Command.Item
                    key={project.id}
                    value={`project:${project.id}`}
                    onSelect={handleSelect}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm cursor-pointer data-[selected=true]:bg-accent/50"
                  >
                    <FolderOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="flex-1 truncate">{project.name}</span>
                    <span className="text-[10px] text-muted-foreground/60 bg-muted rounded px-1.5 py-0.5">
                      {project.status}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Phase results */}
            {showPhases && results.phases.length > 0 && (
              <Command.Group heading="Phases">
                {results.phases.map((phase) => (
                  <Command.Item
                    key={phase.id}
                    value={`phase:${phase.id}|${phase.project_id}`}
                    onSelect={handleSelect}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm cursor-pointer data-[selected=true]:bg-accent/50"
                  >
                    <Layers className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <span className="flex-1 truncate">{phase.name}</span>
                    <span className="text-[10px] text-muted-foreground/60 truncate max-w-32">
                      {phase.project_name}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Decision results */}
            {showDecisions && results.decisions.length > 0 && (
              <Command.Group heading="Decisions">
                {results.decisions.map((decision) => (
                  <Command.Item
                    key={decision.id}
                    value={`decision:${decision.id}`}
                    onSelect={handleSelect}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm cursor-pointer data-[selected=true]:bg-accent/50"
                  >
                    <GitBranch className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="flex-1 truncate">{decision.question}</span>
                    <span className="text-[10px] text-muted-foreground/60 truncate max-w-32">
                      {decision.project_name}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Knowledge results */}
            {showKnowledge && results.knowledge.length > 0 && (
              <Command.Group heading="Knowledge">
                {results.knowledge.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={`knowledge:${item.id}|${item.project_id}`}
                    onSelect={handleSelect}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm cursor-pointer data-[selected=true]:bg-accent/50"
                  >
                    <BookOpen className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    <span className="flex-1 truncate">{item.title}</span>
                    <span className="text-[10px] text-muted-foreground/60 bg-muted rounded px-1.5 py-0.5">
                      {item.category}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* No results state when there IS a query */}
            {effectiveQuery.length >= 2 && !hasResults && !showPages && !showViewShortcuts && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No results found.
              </div>
            )}
          </Command.List>

          {/* Footer with keyboard hints */}
          <div className="flex items-center gap-4 px-4 py-2 border-t border-border/30 text-[11px] text-muted-foreground/60">
            <span className="flex items-center gap-1">
              <kbd className="bg-muted rounded px-1 py-0.5 font-mono border border-border/30">
                ↑↓
              </kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-muted rounded px-1 py-0.5 font-mono border border-border/30">
                ↵
              </kbd>
              Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-muted rounded px-1 py-0.5 font-mono border border-border/30">
                esc
              </kbd>
              Close
            </span>
            <span className="ml-auto flex items-center gap-1">
              <span className="text-muted-foreground/40">
                {modKey()}+K to toggle
              </span>
            </span>
          </div>
        </Command>
      </div>
    </div>
  );
}
