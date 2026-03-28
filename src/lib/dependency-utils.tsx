// GSD Vibe - Dependency Utilities
// Shared parsing logic and UI helpers for dependency status components.
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Box, Package } from 'lucide-react';

export interface OutdatedEntry {
  current: string;
  wanted: string;
  latest: string;
}

export interface AuditVulnerability {
  severity: string;
  title?: string;
  url?: string;
  range?: string;
  via?: unknown[];
}

// ─── Package manager icon ─────────────────────────────────────────────────────

export function PackageManagerIcon({ pm, className }: { pm: string; className?: string }) {
  switch (pm.toLowerCase()) {
    case 'cargo':
      return <Box className={className} />;
    default:
      return <Package className={className} />;
  }
}

// ─── Severity helpers ─────────────────────────────────────────────────────────

/** Returns a Tailwind text-color class for a severity string. */
export function severityColor(severity: string): string {
  switch (severity.toLowerCase()) {
    case 'critical':
    case 'high':
      return 'text-status-error';
    case 'moderate':
      return 'text-status-warning';
    default:
      return 'text-muted-foreground';
  }
}

/** Returns a Badge variant string for a severity. */
export function severityBadgeVariant(severity: string): 'error' | 'warning' | 'secondary' {
  switch (severity.toLowerCase()) {
    case 'critical':
    case 'high':
      return 'error';
    case 'moderate':
      return 'warning';
    default:
      return 'secondary';
  }
}

// ─── Package data parsers ─────────────────────────────────────────────────────

export function parseOutdatedPackages(
  details: Record<string, unknown> | null,
): [string, OutdatedEntry][] {
  if (!details || typeof details !== 'object') return [];

  let resolved = details;
  if (typeof resolved === 'string') {
    try { resolved = JSON.parse(resolved) as Record<string, unknown>; }
    catch { return []; }
  }

  let outdated = resolved.outdated as Record<string, OutdatedEntry> | undefined;
  if (typeof outdated === 'string') {
    try { outdated = JSON.parse(outdated) as Record<string, OutdatedEntry>; }
    catch { outdated = undefined; }
  }

  if (!outdated || typeof outdated !== 'object' || Array.isArray(outdated)) {
    const firstValue = Object.values(resolved)[0];
    if (firstValue && typeof firstValue === 'object' && firstValue !== null && 'current' in firstValue) {
      outdated = resolved as unknown as Record<string, OutdatedEntry>;
    } else {
      return [];
    }
  }

  return Object.entries(outdated)
    .filter(([, v]) => v && typeof v === 'object' && 'current' in v)
    .sort(([a], [b]) => a.localeCompare(b));
}

export function parseVulnerablePackages(
  details: Record<string, unknown> | null,
): [string, AuditVulnerability][] {
  if (!details) return [];
  const audit = details.audit as Record<string, unknown> | undefined;
  if (!audit) return [];
  const vulns = audit.vulnerabilities as Record<string, AuditVulnerability> | undefined;
  if (!vulns || typeof vulns !== 'object') return [];
  return Object.entries(vulns)
    .filter(([, v]) => v.severity && v.severity !== 'info')
    .sort(([, a], [, b]) => {
      const order: Record<string, number> = { critical: 0, high: 1, moderate: 2, low: 3 };
      return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
    });
}
