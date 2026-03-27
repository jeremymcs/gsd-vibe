// GSD VibeFlow - Design Token System
// Centralized spacing, sizing, animation, and status utilities
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

/**
 * Status type definition
 */
export type Status =
  | "pending"
  | "in_progress"
  | "completed"
  | "blocked"
  | "failed"
  | "skipped"
  | "archived"
  | "running"
  | "paused"
  | "cancelled";

/**
 * Status color classes using CSS variables
 */
export const statusColors: Record<Status, {
  bg: string;
  text: string;
  border: string;
  dot: string;
  combined: string;
}> = {
  pending: {
    bg: "bg-status-pending/10",
    text: "text-status-pending",
    border: "border-status-pending/30",
    dot: "bg-status-pending",
    combined: "bg-status-pending/10 text-status-pending border-status-pending/30",
  },
  in_progress: {
    bg: "bg-status-info/10",
    text: "text-status-info",
    border: "border-status-info/30",
    dot: "bg-status-info animate-pulse",
    combined: "bg-status-info/10 text-status-info border-status-info/30",
  },
  running: {
    bg: "bg-status-info/10",
    text: "text-status-info",
    border: "border-status-info/30",
    dot: "bg-status-info animate-pulse",
    combined: "bg-status-info/10 text-status-info border-status-info/30",
  },
  completed: {
    bg: "bg-status-success/10",
    text: "text-status-success",
    border: "border-status-success/30",
    dot: "bg-status-success",
    combined: "bg-status-success/10 text-status-success border-status-success/30",
  },
  blocked: {
    bg: "bg-status-blocked/10",
    text: "text-status-blocked",
    border: "border-status-blocked/30",
    dot: "bg-status-blocked",
    combined: "bg-status-blocked/10 text-status-blocked border-status-blocked/30",
  },
  paused: {
    bg: "bg-status-paused/10",
    text: "text-status-paused",
    border: "border-status-paused/30",
    dot: "bg-status-paused",
    combined: "bg-status-paused/10 text-status-paused border-status-paused/30",
  },
  failed: {
    bg: "bg-status-error/10",
    text: "text-status-error",
    border: "border-status-error/30",
    dot: "bg-status-error",
    combined: "bg-status-error/10 text-status-error border-status-error/30",
  },
  cancelled: {
    bg: "bg-status-error/10",
    text: "text-status-error",
    border: "border-status-error/30",
    dot: "bg-status-error",
    combined: "bg-status-error/10 text-status-error border-status-error/30",
  },
  skipped: {
    bg: "bg-muted",
    text: "text-muted-foreground",
    border: "border-muted",
    dot: "bg-muted-foreground",
    combined: "bg-muted text-muted-foreground border-muted",
  },
  archived: {
    bg: "bg-muted",
    text: "text-muted-foreground",
    border: "border-muted",
    dot: "bg-muted-foreground",
    combined: "bg-muted text-muted-foreground border-muted",
  },
};

/**
 * Get status classes for a given status
 */
export function getStatusClasses(status: Status) {
  return statusColors[status] || statusColors.pending;
}

/**
 * Project type derived from TechStack flags + GSD version
 */
export type ProjectType = "gsd2" | "gsd1" | "bare";

/**
 * Project type display metadata
 */
export const projectTypeConfig: Record<
  ProjectType,
  { label: string; classes: string; tooltip: string }
> = {
  gsd2: {
    label: "GSD-2",
    classes:
      "bg-blue-500/10 text-blue-400 border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30",
    tooltip: "GSD-2 project (.gsd/ — milestone-based agent workflow)",
  },
  gsd1: {
    label: "GSD-1",
    classes:
      "bg-violet-500/10 text-violet-400 border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/30",
    tooltip: "GSD-1 project (.planning/ — phase-based workflow)",
  },
  bare: {
    label: "Bare",
    classes: "bg-muted text-muted-foreground border-muted",
    tooltip: "No GSD workflow detected",
  },
};

/**
 * Derive project type from TechStack flags + optional gsd_version string.
 * If .gsd/ exists → gsd2. If .planning/ exists (and no .gsd/) → gsd1. Otherwise → bare.
 */
export function getProjectType(
  techStack: { has_planning: boolean } | null | undefined,
  gsdVersion?: string | null,
): ProjectType {
  if (!techStack) return "bare";
  if (!techStack.has_planning) return "bare";
  // gsd_version is the authoritative signal set at import time
  if (gsdVersion === "gsd2") return "gsd2";
  if (gsdVersion === "gsd1") return "gsd1";
  // Fallback: has_planning with no version → treat as gsd1 (legacy import)
  return "gsd1";
}

/**
 * System group type for project visual delineation
 */
export type SystemGroup = "gsd";

export const systemGroupConfig: Record<
  SystemGroup,
  { label: string; color: string; bgTint: string }
> = {
  gsd: {
    label: "GSD",
    color: "text-foreground",
    bgTint: "bg-muted",
  },
};
