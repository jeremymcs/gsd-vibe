// GSD VibeFlow - Project View Definitions
// Canonical list of all project views for sidebar navigation
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  LayoutDashboard,
  FolderTree,
  Package,
  ClipboardList,
  SquareTerminal,
  Key,
  Activity,
  Play,
  GitBranch,
  BarChart3,
  Flag,
  Layers,
  CheckSquare,
  Stethoscope,
  Search,
  Brain,
  BookOpen,
  FileText,
  Lightbulb,
  FlaskConical,
  ClipboardCheck,
  ShieldCheck,
  Bug,
  type LucideIcon,
} from 'lucide-react';

export interface ProjectView {
  id: string;
  label: string;
  icon: LucideIcon;
  section: string;
  /** Show only for gsd2 projects */
  gsd2Only?: boolean;
  /** Show only for gsd1 projects */
  gsd1Only?: boolean;
  /** Show only when project has any GSD planning */
  gsdOnly?: boolean;
}

/**
 * All possible project views.
 * Sections are used to group them visually in the sidebar.
 */
export const projectViews: ProjectView[] = [
  // --- Core ---
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, section: 'Core' },
  { id: 'files', label: 'Files', icon: FolderTree, section: 'Core' },
  { id: 'dependencies', label: 'Dependencies', icon: Package, section: 'Core' },
  { id: 'knowledge', label: 'Knowledge', icon: ClipboardList, section: 'Core' },
  { id: 'shell', label: 'Shell', icon: SquareTerminal, section: 'Core' },
  { id: 'envvars', label: 'Env Vars', icon: Key, section: 'Core' },

  // --- GSD-2 ---
  { id: 'gsd2-health', label: 'Health', icon: Activity, section: 'GSD', gsd2Only: true },
  { id: 'gsd2-headless', label: 'Headless', icon: Play, section: 'GSD', gsd2Only: true },
  { id: 'gsd2-worktrees', label: 'Worktrees', icon: GitBranch, section: 'GSD', gsd2Only: true },
  { id: 'gsd2-visualizer', label: 'Visualizer', icon: BarChart3, section: 'GSD', gsd2Only: true },
  { id: 'gsd2-milestones', label: 'Milestones', icon: Flag, section: 'GSD', gsd2Only: true },
  { id: 'gsd2-slices', label: 'Slices', icon: Layers, section: 'GSD', gsd2Only: true },
  { id: 'gsd2-tasks', label: 'Tasks', icon: CheckSquare, section: 'GSD', gsd2Only: true },
  { id: 'gsd2-doctor', label: 'Doctor', icon: Stethoscope, section: 'Diagnostics', gsd2Only: true },
  { id: 'gsd2-forensics', label: 'Forensics', icon: Search, section: 'Diagnostics', gsd2Only: true },
  { id: 'gsd2-skill-health', label: 'Skill Health', icon: Brain, section: 'Diagnostics', gsd2Only: true },
  { id: 'gsd2-knowledge-captures', label: 'Knowledge', icon: BookOpen, section: 'Diagnostics', gsd2Only: true },
  { id: 'gsd2-reports', label: 'Reports', icon: FileText, section: 'GSD', gsd2Only: true },

  // --- GSD-1 ---
  { id: 'gsd-plans', label: 'Plans', icon: FileText, section: 'GSD', gsd1Only: true },
  { id: 'gsd-context', label: 'Context', icon: Lightbulb, section: 'GSD', gsd1Only: true },
  { id: 'gsd-todos', label: 'Todos', icon: CheckSquare, section: 'GSD', gsd1Only: true },
  { id: 'gsd-validation', label: 'Validation', icon: FlaskConical, section: 'GSD', gsd1Only: true },
  { id: 'gsd-uat', label: 'UAT', icon: ClipboardCheck, section: 'GSD', gsd1Only: true },
  { id: 'gsd-verification', label: 'Verification', icon: ShieldCheck, section: 'GSD', gsd1Only: true },
  { id: 'gsd-milestones', label: 'Milestones', icon: Flag, section: 'GSD', gsd1Only: true },
  { id: 'gsd-debug', label: 'Debug', icon: Bug, section: 'GSD', gsd1Only: true },
];

export interface ProjectViewContext {
  isGsd2: boolean;
  isGsd1: boolean;
}

/** Filter views based on project GSD version */
export function getVisibleViews(ctx: ProjectViewContext): ProjectView[] {
  return projectViews.filter((v) => {
    if (v.gsd2Only && !ctx.isGsd2) return false;
    if (v.gsd1Only && !ctx.isGsd1) return false;
    if (v.gsdOnly && !ctx.isGsd2 && !ctx.isGsd1) return false;
    return true;
  });
}

/** Group visible views by section, preserving order */
export function getViewSections(ctx: ProjectViewContext): { section: string; views: ProjectView[] }[] {
  const visible = getVisibleViews(ctx);
  const sections: { section: string; views: ProjectView[] }[] = [];
  const seen = new Set<string>();

  for (const view of visible) {
    if (!seen.has(view.section)) {
      seen.add(view.section);
      sections.push({ section: view.section, views: [] });
    }
    sections.find((s) => s.section === view.section)!.views.push(view);
  }

  return sections;
}

/** Map old ?tab= values to new view IDs for backwards compat */
const TAB_TO_VIEW: Record<string, string> = {
  overview: 'overview',
  project: 'files',
  knowledge: 'knowledge',
  shell: 'shell',
  envvars: 'envvars',
  gsd: 'gsd2-health', // default GSD landing — caller should pick gsd1 vs gsd2
};

export function resolveViewFromTab(tab: string | null, ctx: ProjectViewContext): string {
  if (!tab) return 'overview';

  // Direct view ID match
  const allIds = new Set(projectViews.map((v) => v.id));
  if (allIds.has(tab)) return tab;

  // Legacy ?tab= mapping
  if (tab === 'gsd') {
    return ctx.isGsd2 ? 'gsd2-health' : ctx.isGsd1 ? 'gsd-plans' : 'overview';
  }

  return TAB_TO_VIEW[tab] ?? 'overview';
}

export const DEFAULT_VIEW = 'overview';
