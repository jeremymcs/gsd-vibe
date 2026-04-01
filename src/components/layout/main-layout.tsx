// VCCA - Main Layout Component
// Context-aware sidebar: global nav or project-scoped nav
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { ReactNode, useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useTerminalContext } from '@/contexts/terminal-context';
import { APP_VERSION } from '@/lib/version';

const ShellPage = lazy(() =>
  import('@/pages/shell').then((m) => ({ default: m.ShellPage }))
);
import { getVisibleNavigation } from '@/lib/navigation';
import {
  useUnreadNotificationCount,
  useProjectsWithStats,
  useProject,
  useGsd2Health,
  useSettings,
} from '@/lib/queries';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import {
  SquareTerminal,
  ChevronDown,
  ChevronUp,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  FolderOpen,
  ArrowLeft,
} from 'lucide-react';
import { modKey } from '@/hooks/use-keyboard-shortcuts';
import { KeyboardShortcutsProvider } from './keyboard-shortcuts-provider';
import { KeyboardShortcutsDialog } from './keyboard-shortcuts-dialog';
import { Breadcrumbs } from './breadcrumbs';
import {
  getViewSections,
  resolveViewFromTab,
  type ProjectViewContext,
} from '@/lib/project-views';

const CommandPalette = lazy(() =>
  import('@/components/command-palette').then((m) => ({
    default: m.CommandPalette,
  }))
);

interface MainLayoutProps {
  children: ReactNode;
}

/** Extract project ID from pathname if on a project route */
function useProjectRouteId(): string | null {
  const location = useLocation();
  const match = location.pathname.match(/^\/projects\/([^/]+)/);
  return match ? match[1] : null;
}

export function MainLayout({ children }: MainLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isShellRoute = location.pathname.startsWith("/terminal");

  // Detect project context
  const projectId = useProjectRouteId();
  const { data: project } = useProject(projectId ?? '');
  const isProjectRoute = !!projectId;

  // Determine active view and whether we're on the Runner page
  const activeView = searchParams.get('view') ?? searchParams.get('tab') ?? '';
  const isRunnerView = isProjectRoute && activeView === 'gsd2-headless';

  const { shellPanelCollapsed, setShellPanelCollapsed } = useTerminalContext();
  const { data: unreadCount } = useUnreadNotificationCount();
  const { data: projectsWithStats } = useProjectsWithStats();
  const { data: settings } = useSettings();
  const userMode = settings?.user_mode ?? 'expert';

  // Project GSD context for view filtering
  const hasPlanning = project?.tech_stack?.has_planning ?? false;
  const isGsd2 = project?.gsd_version === 'gsd2';
  const isGsd1 = hasPlanning && !isGsd2;
  const viewCtx: ProjectViewContext = useMemo(
    () => ({ isGsd2, isGsd1, userMode }),
    [isGsd2, isGsd1, userMode]
  );
  const viewSections = useMemo(() => getViewSections(viewCtx), [viewCtx]);

  // GSD-2 health for status indicator
  const { data: gsdHealth } = useGsd2Health(projectId ?? '', isGsd2);

  // Derive a status color from health data
  const gsdStatusColor = useMemo(() => {
    if (!gsdHealth) return null;
    if (gsdHealth.blocker) return 'bg-red-500'; // blocked
    if (gsdHealth.phase === 'executing' || gsdHealth.phase === 'running') return 'bg-green-500 animate-pulse'; // active
    if (gsdHealth.phase === 'idle' || gsdHealth.phase === 'complete') return 'bg-emerald-500'; // healthy
    if (gsdHealth.env_error_count > 0) return 'bg-amber-500'; // warnings
    return 'bg-muted-foreground/40'; // unknown
  }, [gsdHealth]);

  // Resolve active view ID for highlighting
  const resolvedView = useMemo(
    () => resolveViewFromTab(activeView || null, viewCtx),
    [activeView, viewCtx]
  );

  const visibleNavigation = useMemo(
    () => getVisibleNavigation(userMode),
    [userMode]
  );

  // Recent projects: sorted by last_activity_at, top 3
  const recentProjects = (projectsWithStats ?? [])
    .filter((p) => p.last_activity_at)
    .sort(
      (a, b) =>
        new Date(b.last_activity_at!).getTime() -
        new Date(a.last_activity_at!).getTime()
    )
    .slice(0, 3);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem("sidebar-collapsed") === "true";
  });

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Auto-expand shell panel when entering Runner view, collapse when leaving
  const prevRunnerRef = useRef(isRunnerView);
  useEffect(() => {
    if (isRunnerView && !prevRunnerRef.current) {
      setShellPanelCollapsed(false);
    } else if (!isRunnerView && prevRunnerRef.current) {
      setShellPanelCollapsed(true);
    }
    prevRunnerRef.current = isRunnerView;
  }, [isRunnerView, setShellPanelCollapsed]);

  // Navigate to a project view
  const goToView = (viewId: string) => {
    if (!projectId) return;
    void navigate(`/projects/${projectId}?view=${viewId}`);
  };

  return (
    <KeyboardShortcutsProvider>
      {({ searchOpen, setSearchOpen, helpOpen, setHelpOpen }) => (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-screen bg-background">
        {/* Sidebar */}
        <aside
          className={cn(
            "border-r border-border/40 bg-card flex flex-col transition-all duration-200",
            sidebarCollapsed ? "w-16" : "w-64"
          )}
        >
          {/* Logo / Project header */}
          {isProjectRoute && project ? (
            // ── Project context header ──
            <div
              className={cn(
                "border-b border-border/40 flex-shrink-0",
                sidebarCollapsed ? "px-2 py-3" : "px-3 py-3"
              )}
            >
              {sidebarCollapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => void navigate('/')}
                      className="flex items-center justify-center w-full p-1.5 rounded-md text-muted-foreground/70 hover:text-foreground hover:bg-muted/50 transition-colors"
                      aria-label="Back to Home"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Back to Home</TooltipContent>
                </Tooltip>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => void navigate('/')}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-foreground transition-colors mb-2"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    <span>Home</span>
                  </button>
                  <div className="flex items-center gap-2 px-1">
                    <FolderOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm font-semibold text-foreground truncate">
                      {project.name}
                    </span>
                  </div>
                </>
              )}
            </div>
          ) : (
            // ── Global logo ──
            <div
              className={cn(
                "h-20 flex items-start border-b border-border/40",
                sidebarCollapsed ? "px-3 justify-center" : "px-5"
              )}
            >
              {sidebarCollapsed ? (
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-[10px] font-bold text-foreground font-mono leading-none">GSD</span>
                  <span className="text-[8px] font-semibold text-muted-foreground/60 tracking-widest uppercase leading-none">VF</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 w-full pt-3">
                  <img src="/gsd-logo.svg" alt="GSD" className="h-8 w-full max-w-[160px] object-contain" />
                  <span className="text-[13px] font-semibold tracking-[0.2em] uppercase text-muted-foreground/70">
                    VCCA
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Command palette trigger */}
          <button
            className={cn(
              "flex items-center gap-2 mx-2 mt-2 rounded-md border border-border/40 text-muted-foreground/60 hover:text-foreground hover:border-border/80 hover:bg-muted/50 transition-colors cursor-pointer",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              sidebarCollapsed ? "justify-center p-2" : "px-3 py-1.5"
            )}
            onClick={() => setSearchOpen(true)}
            aria-label="Open command palette"
          >
            <Search className="h-3.5 w-3.5 flex-shrink-0" />
            {!sidebarCollapsed && (
              <>
                <span className="text-xs flex-1 text-left">Search...</span>
                <kbd className="text-[10px] font-mono bg-muted/60 px-1.5 py-0.5 rounded border border-border/30">
                  {modKey()}K
                </kbd>
              </>
            )}
          </button>

          {/* Navigation — context-aware */}
          <nav
            aria-label={isProjectRoute ? "Project navigation" : "Sidebar navigation"}
            className={cn(
            "flex-1 overflow-y-auto",
            sidebarCollapsed ? "p-2 space-y-1" : "p-2"
          )}>
            {isProjectRoute ? (
              // ── Project-scoped navigation ──
              <>
                {viewSections.map((section, sectionIndex) => (
                  <div key={section.section}>
                    {/* Section header */}
                    {sidebarCollapsed ? (
                      <div className={sectionIndex === 0 ? "" : "pt-4"} />
                    ) : (
                      <div
                        className={cn(
                          "text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50 px-3 pb-1.5",
                          sectionIndex === 0 ? "pt-3" : "pt-5"
                        )}
                      >
                        {section.section}
                      </div>
                    )}

                    {/* View items */}
                    {section.views.map((view) => {
                      const isActive = resolvedView === view.id;
                      const Icon = view.icon;

                      const linkContent = (
                        <button
                          key={view.id}
                          type="button"
                          onClick={() => goToView(view.id)}
                          aria-current={isActive ? "page" : undefined}
                          className={cn(
                            "w-full flex items-center rounded-md text-sm font-medium transition-colors duration-150 relative",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                            sidebarCollapsed
                              ? "justify-center px-0 py-2.5"
                              : "gap-3 px-3 py-1.5",
                            isActive
                              ? "text-foreground"
                              : "text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/30"
                          )}
                        >
                          {isActive && !sidebarCollapsed && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-full bg-primary/80" />
                          )}
                          {isActive && sidebarCollapsed && (
                            <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary/80" />
                          )}
                          <Icon className="h-[18px] w-[18px] flex-shrink-0" />
                          {!sidebarCollapsed && (
                            <>
                              <span>{view.label}</span>
                              {/* GSD status dot on Health view */}
                              {view.id === 'gsd2-health' && gsdStatusColor && (
                                <span className={cn('ml-auto w-2 h-2 rounded-full flex-shrink-0', gsdStatusColor)} />
                              )}
                            </>
                          )}
                        </button>
                      );

                      if (sidebarCollapsed) {
                        return (
                          <Tooltip key={view.id}>
                            <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                            <TooltipContent side="right">{view.label}</TooltipContent>
                          </Tooltip>
                        );
                      }

                      return linkContent;
                    })}
                  </div>
                ))}
              </>
            ) : (
              // ── Global navigation ──
              <>
                {visibleNavigation.map((item, index) => {
                  if (item.type === "section") {
                    if (sidebarCollapsed) {
                      return (
                        <div
                          key={`section-${item.label}`}
                          className={index === 0 ? "" : "pt-4"}
                        />
                      );
                    }
                    return (
                      <div
                        key={`section-${item.label}`}
                        className={cn(
                          "text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50 px-3 pb-1.5",
                          index === 0 ? "pt-3" : "pt-5"
                        )}
                      >
                        {item.label}
                      </div>
                    );
                  }

                  const isActive =
                    item.href === "/"
                      ? location.pathname === "/"
                      : location.pathname.startsWith(item.href);

                  const linkContent = (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => void navigate(item.href)}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "w-full flex items-center rounded-md text-sm font-medium transition-colors duration-150 relative",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        sidebarCollapsed
                          ? "justify-center px-0 py-2.5"
                          : "gap-3 px-3 py-2",
                        isActive
                          ? "text-foreground"
                          : "text-muted-foreground/70 hover:text-foreground hover:bg-muted/50"
                      )}
                    >
                      {isActive && !sidebarCollapsed && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-full bg-gsd-cyan" />
                      )}
                      {isActive && sidebarCollapsed && (
                        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-gsd-cyan" />
                      )}

                      <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
                      {!sidebarCollapsed && (
                        <>
                          <span>{item.name}</span>
                          {item.name === 'Notifications' && unreadCount && unreadCount > 0 && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 ml-auto">
                              {unreadCount}
                            </Badge>
                          )}
                        </>
                      )}
                    </button>
                  );

                  if (sidebarCollapsed) {
                    return (
                      <Tooltip key={item.name}>
                        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                        <TooltipContent side="right">{item.name}</TooltipContent>
                      </Tooltip>
                    );
                  }

                  return linkContent;
                })}
              </>
            )}
          </nav>

          {/* Recents section (global mode only, expanded sidebar only) */}
          {!isProjectRoute && !sidebarCollapsed && recentProjects.length > 0 && (
            <div className="px-2 pb-2">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50 px-3 pb-1.5">
                Recents
              </div>
              {recentProjects.map((rp) => (
                <button
                  key={rp.id}
                  type="button"
                  onClick={() => void navigate(`/projects/${rp.id}`)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs text-muted-foreground/70 hover:text-foreground hover:bg-muted/50 transition-colors truncate',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    location.pathname === `/projects/${rp.id}` &&
                      'bg-muted/60 text-foreground'
                  )}
                >
                  <FolderOpen className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{rp.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Collapse toggle + version */}
          <div className="border-t border-border/40">
            <button
              className="flex items-center justify-center p-2 cursor-pointer hover:bg-muted/50 transition-colors w-full"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PanelLeftOpen className="h-4 w-4 text-muted-foreground/60 hover:text-foreground transition-colors" />
                  </TooltipTrigger>
                  <TooltipContent side="right">Expand sidebar</TooltipContent>
                </Tooltip>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground/60 hover:text-foreground transition-colors">
                  <PanelLeftClose className="h-4 w-4" />
                  <span className="text-[11px] font-medium">Collapse</span>
                </div>
              )}
            </button>
            {!sidebarCollapsed && (
              <div className="pb-3 text-center">
                <span className="text-[10px] font-mono text-muted-foreground/40">
                  v{APP_VERSION}
                </span>
              </div>
            )}
          </div>
        </aside>

        {/* Main content - vertical split: page content + persistent shell panel */}
        <div role="main" className="flex-1 flex flex-col overflow-hidden bg-background">
          {/* Top bar: breadcrumbs + notification bell (always visible) */}
          {!isShellRoute && <Breadcrumbs />}

          {/* Page content area */}
          <div className={cn(
            "overflow-hidden min-h-0 transition-all duration-200",
            isShellRoute ? "h-0 invisible" : "flex-1"
          )}>
            {children}
          </div>

          {/* Shell panel collapse toggle — only visible on Runner view */}
          {!isShellRoute && isRunnerView && (
            <button
              className={cn(
                "relative flex items-center gap-2 px-4 py-2 border-t cursor-pointer select-none flex-shrink-0 w-full transition-all duration-200 group",
                shellPanelCollapsed
                  ? "border-border/50 bg-muted/30 hover:bg-muted/50"
                  : "border-border/50 bg-muted/30 hover:bg-muted/50"
              )}
              onClick={() => setShellPanelCollapsed(!shellPanelCollapsed)}
              aria-label={shellPanelCollapsed ? "Expand shell panel" : "Collapse shell panel"}
              aria-expanded={!shellPanelCollapsed}
            >
              <SquareTerminal className="h-4 w-4 text-muted-foreground transition-colors duration-200" />
              <span className={cn(
                "text-xs font-medium transition-colors duration-200",
                shellPanelCollapsed
                  ? "text-foreground/70 group-hover:text-foreground"
                  : "text-muted-foreground"
              )}>
                Terminal
              </span>
              {shellPanelCollapsed && (
                <span className="text-[10px] text-muted-foreground/60 font-mono ml-1">
                  Click to open
                </span>
              )}
              {shellPanelCollapsed ? (
                <ChevronUp className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground ml-auto transition-colors" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
              )}
            </button>
          )}

          {/* Persistent shell panel — visible on /terminal route or Runner view when expanded */}
          <div className={cn(
            "flex-shrink-0 transition-all duration-200",
            isShellRoute
              ? "flex-1"
              : isRunnerView && !shellPanelCollapsed
                ? "h-[300px]"
                : "h-0 invisible"
          )}>
            <Suspense fallback={<div className="flex items-center justify-center h-full text-muted-foreground text-sm">Loading terminal...</div>}>
              <ShellPage />
            </Suspense>
          </div>
        </div>
      </div>

      {/* Command palette (lazy loaded) */}
      {searchOpen && (
        <Suspense fallback={null}>
          <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
        </Suspense>
      )}

      {/* Keyboard shortcuts help */}
      <KeyboardShortcutsDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </TooltipProvider>
      )}
    </KeyboardShortcutsProvider>
  );
}
