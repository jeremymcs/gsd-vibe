// VCCA - GSD-1 Plan Utilities
// Shared helpers for GSD-1 plan/phase data manipulation.
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import type { GsdPlan } from '@/lib/tauri';

/**
 * Returns sorted unique phase numbers from a list of plans.
 * Used by both GsdPlansTab and GsdContextTab.
 */
export function getPhaseNumbers(plans: GsdPlan[] | undefined): number[] {
  return Array.from(new Set((plans ?? []).map((p) => p.phase_number))).sort((a, b) => a - b);
}

/**
 * Groups plans by phase number, returning a sorted Map.
 */
export function groupPlansByPhase(plans: GsdPlan[]): Map<number, GsdPlan[]> {
  const groups = new Map<number, GsdPlan[]>();
  for (const plan of plans) {
    const existing = groups.get(plan.phase_number) ?? [];
    existing.push(plan);
    groups.set(plan.phase_number, existing);
  }
  return groups;
}
