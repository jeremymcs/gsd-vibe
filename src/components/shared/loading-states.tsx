// VCCA - Shared Loading State Primitives
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { type ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * ViewSkeleton — renders configurable skeleton placeholder lines.
 *
 * The first line is narrower (w-2/3, simulates a title); remaining lines
 * are full-width (w-full, simulate content rows). Wrap in a parent that
 * sets a reasonable min-height so the layout does not jump on load.
 *
 * Observability: when isLoading is true and you see skeleton shapes, the
 * query is in-flight. If skeletons persist beyond the expected query time,
 * inspect the TanStack Query devtools for the stale / fetching state.
 */
export function ViewSkeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(i === 0 ? "h-4 w-2/3" : "h-8 w-full")}
        />
      ))}
    </div>
  );
}

/**
 * ViewError — renders a styled error card with an icon and contextual message.
 *
 * Defaults to the AlertCircle icon from lucide-react. Pass a custom `icon`
 * ReactNode to override the icon (e.g. a domain-specific icon). The message
 * should describe what failed and hint at the remediation.
 *
 * Observability: error cards are the primary failure surface for TanStack
 * Query `isError` states. To inspect the underlying error, open the TanStack
 * Query devtools → select the failed query → view the "Error" panel.
 */
export function ViewError({
  message,
  icon,
  className,
}: {
  message: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardContent className="py-8 text-center">
        {icon ? (
          <div className="text-status-error mx-auto mb-3 w-fit">{icon}</div>
        ) : (
          <AlertCircle className="h-8 w-8 text-status-error mx-auto mb-3" />
        )}
        <p className="text-sm text-status-error">{message}</p>
      </CardContent>
    </Card>
  );
}

/**
 * ViewEmpty — renders a contextual empty state with an optional icon, a
 * required message, and an optional description hint.
 *
 * Use `description` to tell the user what action they can take next, e.g.
 * "Run `gsd init` in the project root to create a milestone."
 *
 * Observability: empty states indicate a successful query that returned no
 * data. If empty state appears unexpectedly, check that the query returned
 * an empty array rather than undefined (which would skip this branch).
 */
export function ViewEmpty({
  icon,
  message,
  description,
  className,
}: {
  icon?: ReactNode;
  message: string;
  description?: string;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardContent className="py-8 text-center text-muted-foreground">
        {icon ? (
          <div className="mx-auto mb-2 opacity-50 w-fit">{icon}</div>
        ) : null}
        <p className="text-sm">{message}</p>
        {description ? (
          <p className="text-xs mt-1 opacity-70">{description}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
