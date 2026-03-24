// GSD VibeFlow - Knowledge & Captures Panel Component
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { useState } from "react";
import type { ReactNode } from "react";
import { BookOpen, MessageSquare, LoaderCircle, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { KnowledgeEntry, CaptureEntry } from "@/lib/tauri";
import { cn } from "@/lib/utils";
import {
  useGsd2KnowledgeData,
  useGsd2CapturesData,
  useGsd2ResolveCapture,
} from "@/lib/queries";

// ═══════════════════════════════════════════════════════════════════════
// SHARED SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════

function KnowHeader({
  title,
  status,
  onRefresh,
  refreshing,
}: {
  title: string;
  status?: ReactNode;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 pb-4">
      <div className="flex items-center gap-2.5">
        <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-foreground/70">
          {title}
        </h3>
        {status}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onRefresh}
        disabled={refreshing}
        className="h-7 gap-1.5 text-xs"
      >
        <RefreshCw className={cn("h-3 w-3", refreshing && "animate-spin")} />
        Refresh
      </Button>
    </div>
  );
}

function KnowError({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-xs text-destructive">
      {message}
    </div>
  );
}

function KnowLoading({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 py-6 text-xs text-muted-foreground">
      <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
      {label}
    </div>
  );
}

function KnowEmpty({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-border/30 bg-card/30 px-4 py-5 text-center text-xs text-muted-foreground">
      {message}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// KNOWLEDGE TAB
// ═══════════════════════════════════════════════════════════════════════

function knowledgeTypeBadgeClass(type: string): string {
  switch (type) {
    case "rule":
      return "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400";
    case "pattern":
      return "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400";
    case "lesson":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400";
    default:
      return "border-border/40 bg-card/50 text-foreground/70";
  }
}

function KnowledgeEntryRow({ entry }: { entry: KnowledgeEntry }) {
  return (
    <div className="rounded-lg border border-border/30 bg-card/30 px-3 py-2.5 space-y-1">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge
          variant="outline"
          className={cn("text-[10px] px-1.5 py-0", knowledgeTypeBadgeClass(entry.type))}
          data-testid={`knowledge-type-badge-${entry.type}`}
        >
          {entry.type}
        </Badge>
        {entry.id && (
          <span className="text-[10px] font-mono text-muted-foreground">{entry.id}</span>
        )}
      </div>
      {entry.title && (
        <p className="text-xs font-medium text-foreground/90">{entry.title}</p>
      )}
      {entry.content && (
        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3">
          {entry.content}
        </p>
      )}
    </div>
  );
}

function KnowledgeTabContent({ projectId }: { projectId: string }) {
  const { data, error, isFetching, refetch } = useGsd2KnowledgeData(projectId);

  return (
    <div className="space-y-4" data-testid="knowledge-tab-content">
      <KnowHeader
        title="Knowledge"
        status={
          data ? (
            <span className="text-[11px] text-muted-foreground">
              {data.entries.length} {data.entries.length === 1 ? "entry" : "entries"}
            </span>
          ) : null
        }
        onRefresh={() => void refetch()}
        refreshing={isFetching}
      />

      {error && (
        <KnowError
          message={error instanceof Error ? error.message : String(error)}
        />
      )}
      {isFetching && !data && <KnowLoading label="Loading knowledge entries…" />}

      {data && (
        <>
          {data.entries.length > 0 ? (
            <div className="space-y-2">
              {data.entries.map((entry) => (
                <KnowledgeEntryRow key={entry.id} entry={entry} />
              ))}
            </div>
          ) : (
            <KnowEmpty message="No knowledge entries found" />
          )}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// CAPTURES TAB
// ═══════════════════════════════════════════════════════════════════════

const CLASSIFICATIONS = [
  { id: "quick-task", label: "Quick Task" },
  { id: "inject", label: "Inject" },
  { id: "defer", label: "Defer" },
  { id: "replan", label: "Replan" },
  { id: "note", label: "Note" },
] as const;

function classificationBadgeClass(classification: string): string {
  switch (classification) {
    case "quick-task":
      return "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400";
    case "inject":
      return "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400";
    case "defer":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400";
    case "replan":
      return "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400";
    case "note":
      return "border-border/40 bg-card/50 text-foreground/70";
    default:
      return "border-border/40 bg-card/50 text-foreground/70";
  }
}

function CaptureEntryRow({
  entry,
  projectId,
}: {
  entry: CaptureEntry;
  projectId: string;
}) {
  const resolveCapture = useGsd2ResolveCapture();

  function handleClassify(classification: string) {
    resolveCapture.mutate({
      projectId,
      captureId: entry.id,
      classification,
      resolution: `Classified as ${classification}`,
      rationale: "",
    });
  }

  return (
    <div className="rounded-lg border border-border/30 bg-card/30 px-3 py-2.5 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] px-1.5 py-0",
            entry.status === "pending"
              ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
              : "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400"
          )}
          data-testid={`capture-status-badge-${entry.id}`}
        >
          {entry.status}
        </Badge>
        {entry.classification && (
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] px-1.5 py-0",
              classificationBadgeClass(entry.classification)
            )}
            data-testid={`capture-classification-badge-${entry.id}`}
          >
            {entry.classification}
          </Badge>
        )}
        <span className="text-[10px] font-mono text-muted-foreground">{entry.id}</span>
        {entry.timestamp && (
          <span className="text-[10px] text-muted-foreground">{entry.timestamp}</span>
        )}
      </div>

      {entry.text && (
        <p className="text-xs text-foreground/90 leading-relaxed">{entry.text}</p>
      )}

      {entry.status === "pending" && (
        <div className="flex flex-wrap gap-1.5 pt-1" data-testid={`capture-actions-${entry.id}`}>
          {CLASSIFICATIONS.map((cls) => (
            <Button
              key={cls.id}
              type="button"
              variant="outline"
              size="sm"
              disabled={resolveCapture.isPending}
              onClick={() => handleClassify(cls.id)}
              className="h-6 px-2 text-[10px]"
              data-testid={`classify-btn-${cls.id}`}
            >
              {cls.label}
            </Button>
          ))}
        </div>
      )}

      {entry.status === "resolved" && entry.resolution && (
        <p className="text-[11px] text-muted-foreground italic">{entry.resolution}</p>
      )}
    </div>
  );
}

function CapturesTabContent({ projectId }: { projectId: string }) {
  const { data, error, isFetching, refetch } = useGsd2CapturesData(projectId);

  return (
    <div className="space-y-4" data-testid="captures-tab-content">
      <KnowHeader
        title="Captures"
        status={
          data && data.pending_count > 0 ? (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
              data-testid="pending-count-badge"
            >
              {data.pending_count} pending
            </Badge>
          ) : null
        }
        onRefresh={() => void refetch()}
        refreshing={isFetching}
      />

      {error && (
        <KnowError
          message={error instanceof Error ? error.message : String(error)}
        />
      )}
      {isFetching && !data && <KnowLoading label="Loading captures…" />}

      {data && (
        <>
          {data.entries.length > 0 ? (
            <div className="space-y-2">
              {data.entries.map((entry) => (
                <CaptureEntryRow
                  key={entry.id}
                  entry={entry}
                  projectId={projectId}
                />
              ))}
            </div>
          ) : (
            <KnowEmpty message="No captures found" />
          )}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN PANEL EXPORT
// ═══════════════════════════════════════════════════════════════════════

type ActiveTab = "knowledge" | "captures";

export function KnowledgeCapturesPanel({
  projectId,
  projectPath: _projectPath,
}: {
  projectId: string;
  projectPath: string;
}) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("knowledge");

  return (
    <div className="space-y-4" data-testid="knowledge-captures-panel">
      {/* Tab switcher */}
      <div className="flex gap-1 rounded-md border border-border/30 bg-card/20 p-1 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("knowledge")}
          className={cn(
            "flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors",
            activeTab === "knowledge"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
          data-testid="tab-knowledge"
        >
          <BookOpen className="h-3 w-3" />
          Knowledge
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("captures")}
          className={cn(
            "flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors",
            activeTab === "captures"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
          data-testid="tab-captures"
        >
          <MessageSquare className="h-3 w-3" />
          Captures
        </button>
      </div>

      {/* Tab content */}
      {activeTab === "knowledge" ? (
        <KnowledgeTabContent projectId={projectId} />
      ) : (
        <CapturesTabContent projectId={projectId} />
      )}
    </div>
  );
}
