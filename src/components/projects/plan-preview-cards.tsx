// GSD VibeFlow - Guided Plan Preview Cards
// Visual milestone/slice preview cards for guided project creation
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { AlertTriangle, ArrowRight, Flag, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Gsd2PlanPreview } from "@/lib/tauri";

interface PlanPreviewCardsProps {
  preview: Gsd2PlanPreview;
}

function riskVariant(risk: string | null): "success" | "warning" | "error" | "pending" {
  const value = (risk ?? "").toLowerCase();
  if (!value) return "pending";
  if (value.includes("low")) return "success";
  if (value.includes("med")) return "warning";
  if (value.includes("high") || value.includes("critical")) return "error";
  return "pending";
}

export function PlanPreviewCards({ preview }: PlanPreviewCardsProps) {
  const slices = preview.milestone.slices ?? [];

  return (
    <div className="space-y-3">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Flag className="h-4 w-4 text-primary" />
                {preview.milestone.title}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">{preview.milestone.summary}</p>
            </div>
            <Badge variant="info" size="sm">
              {slices.length} slice{slices.length === 1 ? "" : "s"}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {slices.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            No slices were generated for this preview.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {slices.map((slice) => (
            <Card key={slice.id}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <Layers className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-muted-foreground">{slice.id}</span>
                      <h4 className="text-sm font-medium">{slice.title}</h4>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{slice.goal}</p>
                  </div>
                  <Badge variant={riskVariant(slice.risk)} size="sm" className="capitalize">
                    {slice.risk ?? "unspecified risk"}
                  </Badge>
                </div>

                {slice.depends_on.length > 0 && (
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span className="font-medium">Depends on</span>
                    <span className="inline-flex items-center gap-1">
                      {slice.depends_on.map((dep, idx) => (
                        <span key={`${slice.id}-${dep}`} className="inline-flex items-center gap-1">
                          <code className="rounded bg-muted px-1 py-0.5 text-[10px]">{dep}</code>
                          {idx < slice.depends_on.length - 1 && <ArrowRight className="h-3 w-3" />}
                        </span>
                      ))}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
