// VCCA - Breadcrumb Navigation
// Shows Home > ProjectName > ActiveView with view label from project-views registry
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { ChevronRight, Home, Bookmark, BookOpen } from 'lucide-react';
import { navLinks } from '@/lib/navigation';
import { useProject, useKnowledgeBookmarks, useSettings } from '@/lib/queries';
import { NotificationBell } from '@/components/notifications';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { projectViews, resolveViewFromTab } from '@/lib/project-views';

interface Crumb {
  label: string;
  href?: string;
}

function useProjectName(id: string | undefined): string | null {
  const { data } = useProject(id ?? '');
  return data?.name ?? null;
}

function useProjectGsdContext(id: string | undefined) {
  const { data } = useProject(id ?? '');
  const { data: settings } = useSettings();
  const hasPlanning = data?.tech_stack?.has_planning ?? false;
  const isGsd2 = data?.gsd_version === 'gsd2';
  const isGsd1 = hasPlanning && !isGsd2;
  const userMode = settings?.user_mode ?? 'expert';

  return { isGsd2, isGsd1, userMode };
}

function BookmarkPopover({ projectId }: { projectId: string }) {
  const { data: knowledgeBookmarks } = useKnowledgeBookmarks(projectId);

  const hasBookmarks = knowledgeBookmarks && knowledgeBookmarks.length > 0;

  const recentKnowledge = (knowledgeBookmarks ?? [])
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 5);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground/60 hover:text-foreground"
          aria-label="View bookmarks"
        >
          <Bookmark className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
        <div className="px-3 py-2 border-b border-border/40">
          <span className="text-xs font-semibold text-foreground">
            Bookmarks
          </span>
        </div>
        {!hasBookmarks ? (
          <div className="px-3 py-4 text-xs text-muted-foreground text-center">
            No bookmarks yet
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto">
            {recentKnowledge.length > 0 && (
              <div className="px-3 py-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                  Knowledge
                </span>
                {recentKnowledge.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center gap-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <BookOpen className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{b.heading}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function Breadcrumbs() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const segments = location.pathname.split('/').filter(Boolean);

  // Extract project ID from URL path
  const projectId =
    segments[0] === 'projects' && segments.length >= 2 ? segments[1] : undefined;
  const projectName = useProjectName(projectId);
  const gsdCtx = useProjectGsdContext(projectId);

  // Resolve active view for project routes
  const rawView = searchParams.get('view') ?? searchParams.get('tab') ?? null;
  const activeViewId = projectId ? resolveViewFromTab(rawView, gsdCtx) : null;
  const activeViewDef = activeViewId ? projectViews.find((v) => v.id === activeViewId) : null;

  const crumbs: Crumb[] = [];

  // Home crumb
  crumbs.push({ label: 'Projects', href: '/' });

  // Build crumbs from URL segments
  let currentPath = '';
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += `/${segment}`;

    // The root dashboard crumb already represents the projects area.
    // Skip the literal `/projects` path segment to avoid `Projects > Projects`.
    if (i === 0 && segment === 'projects') {
      continue;
    }

    // Try to match against known nav links
    const navItem = navLinks.find((n) => n.href === currentPath);

    if (navItem) {
      const isLast = i === segments.length - 1 && !activeViewDef;
      crumbs.push({
        label: navItem.name,
        href: isLast ? undefined : navItem.href,
      });
    } else if (projectId && segment === projectId) {
      // Project name crumb — always a link when there's a view after it
      crumbs.push({
        label: projectName ?? 'Loading...',
        href: activeViewDef ? `/projects/${projectId}` : undefined,
      });
    } else {
      // Capitalize generic segment
      const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
      const isLast = i === segments.length - 1;
      crumbs.push({
        label,
        href: isLast ? undefined : currentPath,
      });
    }
  }

  // Append active view as final crumb (if not "overview" — that's the default)
  if (activeViewDef && activeViewId !== 'overview') {
    crumbs.push({ label: activeViewDef.label });
  }

  // Dashboard route (no segments) — render just the notification bell
  const isDashboard = segments.length === 0;

  return (
    <div className="flex items-center px-6 py-2 text-sm text-muted-foreground border-b border-border/30 flex-shrink-0">
      {!isDashboard && (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 flex-1">
          {crumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && (
                <ChevronRight className="h-3 w-3 text-muted-foreground/40 flex-shrink-0" />
              )}
              {crumb.href ? (
                <Link
                  to={crumb.href}
                  className="hover:text-foreground transition-colors flex items-center gap-1"
                >
                  {i === 0 && <Home className="h-3.5 w-3.5" />}
                  <span>{crumb.label}</span>
                </Link>
              ) : (
                <span className="text-foreground font-medium">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      {isDashboard && <div className="flex-1" />}
      <div className="flex items-center gap-1">
        {projectId && <BookmarkPopover projectId={projectId} />}
        <NotificationBell />
      </div>
    </div>
  );
}
