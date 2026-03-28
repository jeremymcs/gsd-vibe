// GSD Vibe - Project Wizard Dialog
// Multi-step new project creation wizard with template selection
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ArrowLeft,
  ArrowRight,
  FolderOpen,
  Loader2,
  CheckCircle,
  AlertCircle,
  Sparkles,
  GitBranch,
  FolderPlus,
} from "lucide-react";
import { useProjectTemplates, useGsdPlanningTemplates, useImportProjectEnhanced } from "@/lib/queries";
import { scaffoldProject, pickFolder, checkProjectPath } from "@/lib/tauri";
import type { ProjectTemplate, GsdPlanningTemplate, ScaffoldResult } from "@/lib/tauri";
import { ImportProjectDialog } from "./import-project-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ProjectWizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type CreateStep = "template" | "planning" | "details" | "creating";

type TopTab = "create" | "import";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_ORDER = ["Web", "API/Backend", "CLI", "Desktop", "Other"];

const CATEGORY_LABELS: Record<string, string> = {
  web: "Web",
  "api/backend": "API/Backend",
  api: "API/Backend",
  backend: "API/Backend",
  cli: "CLI",
  desktop: "Desktop",
};

const LANGUAGE_BADGE_COLORS: Record<string, string> = {
  typescript: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  javascript: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
  rust: "border-orange-500/30 bg-orange-500/10 text-orange-400",
  python: "border-green-500/30 bg-green-500/10 text-green-400",
  go: "border-cyan-500/30 bg-cyan-500/10 text-cyan-400",
  none: "border-muted bg-muted/50 text-muted-foreground",
};

const ARCHETYPE_BADGE_COLORS: Record<string, string> = {
  webapp: "border-purple-500/30 bg-purple-500/10 text-purple-400",
  web_app: "border-purple-500/30 bg-purple-500/10 text-purple-400",
  api: "border-green-500/30 bg-green-500/10 text-green-400",
  cli: "border-pink-500/30 bg-pink-500/10 text-pink-400",
  desktop: "border-indigo-500/30 bg-indigo-500/10 text-indigo-400",
  library: "border-orange-500/30 bg-orange-500/10 text-orange-400",
  blank: "border-muted bg-muted/50 text-muted-foreground",
};

const GSD_PLANNING_DESCRIPTIONS: Record<string, string> = {
  none: "Skip GSD planning setup — add it later if needed.",
  web_app: "Web application milestone + slice archetype with frontend/backend slices.",
  cli: "CLI tool planning with commands, parsing, and release slices.",
  api: "REST/GraphQL API planning with data model, auth, and endpoint slices.",
  library: "Library/package planning with API design, implementation, and publish slices.",
};

const PROJECT_NAME_REGEX = /^[a-z0-9][a-z0-9-]*$/;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function normalizeCategory(raw: string): string {
  const lower = raw.toLowerCase().trim();
  return CATEGORY_LABELS[lower] ?? raw;
}

function groupTemplatesByCategory(
  templates: ProjectTemplate[]
): Array<{ category: string; templates: ProjectTemplate[] }> {
  const map = new Map<string, ProjectTemplate[]>();

  for (const t of templates) {
    const cat = normalizeCategory(t.category);
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(t);
  }

  return CATEGORY_ORDER.filter((c) => map.has(c)).map((c) => ({
    category: c,
    templates: map.get(c)!,
  }));
}

function validateProjectName(name: string): string | null {
  if (name.length < 2) return "Name must be at least 2 characters.";
  if (!PROJECT_NAME_REGEX.test(name))
    return "Use only lowercase letters, numbers, and hyphens. Must start with a letter or number.";
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

interface TemplateCardProps {
  template: ProjectTemplate;
  selected: boolean;
  onSelect: () => void;
}

function TemplateCard({ template, selected, onSelect }: TemplateCardProps) {
  const langColor =
    LANGUAGE_BADGE_COLORS[template.language.toLowerCase()] ??
    LANGUAGE_BADGE_COLORS.none;
  const archColor =
    ARCHETYPE_BADGE_COLORS[template.archetype.toLowerCase()] ??
    ARCHETYPE_BADGE_COLORS.blank;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative flex flex-col gap-2 p-3 rounded-lg border text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "border-border/50 bg-card hover:border-border hover:bg-muted/30"
      )}
    >
      {selected && (
        <CheckCircle className="absolute top-2 right-2 h-4 w-4 text-primary" />
      )}
      <span className="font-medium text-sm leading-tight pr-5">{template.name}</span>
      <span className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
        {template.description}
      </span>
      <div className="flex gap-1 flex-wrap mt-auto pt-1">
        <span
          className={cn(
            "inline-flex items-center rounded border px-1.5 py-0 text-[10px] font-semibold",
            langColor
          )}
        >
          {template.language}
        </span>
        {template.archetype !== "blank" && (
          <span
            className={cn(
              "inline-flex items-center rounded border px-1.5 py-0 text-[10px] font-semibold",
              archColor
            )}
          >
            {template.archetype}
          </span>
        )}
      </div>
    </button>
  );
}

interface PlanningOptionProps {
  template: GsdPlanningTemplate | { id: "none"; name: string; description: string; archetype: string };
  selected: boolean;
  onSelect: () => void;
}

function PlanningOption({ template, selected, onSelect }: PlanningOptionProps) {
  const desc = GSD_PLANNING_DESCRIPTIONS[template.id] ?? template.description;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "border-border/50 bg-card hover:border-border hover:bg-muted/30"
      )}
    >
      <div
        className={cn(
          "mt-0.5 h-4 w-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center",
          selected ? "border-primary" : "border-muted-foreground/40"
        )}
      >
        {selected && <div className="h-2 w-2 rounded-full bg-primary" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{template.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step indicators
// ─────────────────────────────────────────────────────────────────────────────

const STEPS: { id: CreateStep; label: string }[] = [
  { id: "template", label: "Template" },
  { id: "planning", label: "Planning" },
  { id: "details", label: "Details" },
  { id: "creating", label: "Creating" },
];

function StepIndicator({ current }: { current: CreateStep }) {
  const currentIdx = STEPS.findIndex((s) => s.id === current);
  return (
    <div className="flex items-center gap-1">
      {STEPS.map((step, i) => (
        <div key={step.id} className="flex items-center gap-1">
          <div
            className={cn(
              "h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-semibold border",
              i < currentIdx
                ? "bg-primary border-primary text-primary-foreground"
                : i === currentIdx
                ? "border-primary text-primary bg-primary/10"
                : "border-border text-muted-foreground"
            )}
          >
            {i < currentIdx ? <CheckCircle className="h-3 w-3" /> : i + 1}
          </div>
          <span
            className={cn(
              "text-xs hidden sm:inline",
              i === currentIdx ? "text-foreground font-medium" : "text-muted-foreground"
            )}
          >
            {step.label}
          </span>
          {i < STEPS.length - 1 && (
            <div
              className={cn(
                "h-px w-4 mx-1",
                i < currentIdx ? "bg-primary" : "bg-border"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function ProjectWizardDialog({ open, onOpenChange }: ProjectWizardDialogProps) {
  const navigate = useNavigate();

  // Top-level tab
  const [activeTab, setActiveTab] = useState<TopTab>("create");

  // Create flow state
  const [step, setStep] = useState<CreateStep>("template");
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
  const [selectedPlanning, setSelectedPlanning] = useState<string>("none");
  const [projectName, setProjectName] = useState("");
  const [parentDir, setParentDir] = useState<string>("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [pathAvailable, setPathAvailable] = useState<boolean | null>(null);
  const [checkingPath, setCheckingPath] = useState(false);
  const [gitInit, setGitInit] = useState(true);
  const [scaffoldResult, setScaffoldResult] = useState<ScaffoldResult | null>(null);
  const [scaffoldError, setScaffoldError] = useState<string | null>(null);
  const [isScaffolding, setIsScaffolding] = useState(false);
  const [importedProjectId, setImportedProjectId] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Data
  const { data: templates = [], isLoading: templatesLoading } = useProjectTemplates();
  const { data: planningTemplates = [], isLoading: planningLoading } = useGsdPlanningTemplates();
  const importProject = useImportProjectEnhanced();

  // Reset all state
  const resetState = useCallback(() => {
    setActiveTab("create");
    setStep("template");
    setSelectedTemplate(null);
    setSelectedPlanning("none");
    setProjectName("");
    setParentDir("");
    setNameError(null);
    setPathAvailable(null);
    setCheckingPath(false);
    setGitInit(true);
    setScaffoldResult(null);
    setScaffoldError(null);
    setIsScaffolding(false);
    setImportedProjectId(null);
    setImportError(null);
  }, []);

  const handleOpenChange = useCallback(
    (val: boolean) => {
      if (!val) resetState();
      onOpenChange(val);
    },
    [onOpenChange, resetState]
  );

  // ── Validation: name + path check ──────────────────────────────────────────

  useEffect(() => {
    if (!projectName) {
      setNameError(null);
      setPathAvailable(null);
      return;
    }
    const err = validateProjectName(projectName);
    setNameError(err);
    if (err || !parentDir) {
      setPathAvailable(null);
      return;
    }

    // Debounced path check
    setCheckingPath(true);
    const timer = setTimeout(async () => {
      try {
        const available = await checkProjectPath(parentDir, projectName);
        setPathAvailable(available);
      } catch {
        setPathAvailable(null);
      } finally {
        setCheckingPath(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [projectName, parentDir]);

  // ── Folder picker ───────────────────────────────────────────────────────────

  const handlePickFolder = useCallback(async () => {
    try {
      const picked = await pickFolder();
      if (picked) setParentDir(picked);
    } catch {
      toast.error("Failed to open folder picker");
    }
  }, []);

  // ── Scaffold ────────────────────────────────────────────────────────────────

  const handleScaffold = useCallback(async () => {
    if (!selectedTemplate || !projectName || !parentDir) return;

    setStep("creating");
    setIsScaffolding(true);
    setScaffoldError(null);
    setImportedProjectId(null);
    setImportError(null);

    try {
      const result = await scaffoldProject({
        templateId: selectedTemplate.id,
        projectName,
        parentDirectory: parentDir,
        gsdPlanningTemplate: selectedPlanning !== "none" ? selectedPlanning : undefined,
        gitInit,
      });

      setScaffoldResult(result);
      setIsScaffolding(false);

      // Auto-register the scaffolded project in the DB so "Open Project" can navigate to it
      try {
        const importResult = await importProject.mutateAsync({
          path: result.projectPath,
          autoSyncRoadmap: false,
        });
        const projectId = importResult.project.id;
        setImportedProjectId(projectId);

        toast.success(`Project "${result.projectName}" created!`, {
          action: {
            label: "Open",
            onClick: () => {
              void navigate(`/projects/${projectId}`);
              handleOpenChange(false);
            },
          },
        });
      } catch (importErr) {
        const msg = importErr instanceof Error ? importErr.message : String(importErr);
        setImportError(msg);
        // Scaffold succeeded, just import failed — still show a toast with path fallback
        toast.success(`Project "${result.projectName}" created!`, {
          description: "Could not register in DB — open it manually from the Projects page.",
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setScaffoldError(msg);
      setIsScaffolding(false);
    }
  }, [selectedTemplate, projectName, parentDir, selectedPlanning, gitInit, navigate, handleOpenChange, importProject]);

  // ── Navigation guards ───────────────────────────────────────────────────────

  const canAdvanceFromDetails =
    !nameError &&
    projectName.length >= 2 &&
    !!parentDir &&
    pathAvailable === true;

  // ── Grouped templates ───────────────────────────────────────────────────────

  const groupedTemplates = groupTemplatesByCategory(templates);

  const allPlanningOptions: Array<
    GsdPlanningTemplate | { id: "none"; name: string; description: string; archetype: string }
  > = [
    { id: "none", name: "No GSD Planning", description: GSD_PLANNING_DESCRIPTIONS.none, archetype: "none" },
    ...planningTemplates,
  ];

  // ── Path preview ────────────────────────────────────────────────────────────

  const pathPreview =
    parentDir && projectName
      ? `${parentDir.replace(/\/$/, "")}/${projectName}`
      : parentDir
      ? `${parentDir}/…`
      : "Select a parent directory first";

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5 text-primary" />
            New Project
          </DialogTitle>
          <DialogDescription>
            Create a new project from a template or import an existing codebase.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            setActiveTab(v as TopTab);
          }}
          className="flex flex-col flex-1 min-h-0"
        >
          <TabsList className="w-full">
            <TabsTrigger value="create" className="flex-1">
              <Sparkles className="h-4 w-4 mr-1.5" />
              Create New
            </TabsTrigger>
            <TabsTrigger value="import" className="flex-1">
              <FolderOpen className="h-4 w-4 mr-1.5" />
              Import Existing
            </TabsTrigger>
          </TabsList>

          {/* ── CREATE TAB ─────────────────────────────────────────────────── */}
          <TabsContent value="create" className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Step indicator */}
            {step !== "creating" && (
              <div className="py-3 flex justify-center border-b border-border/40">
                <StepIndicator current={step} />
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              {/* ── STEP 1: Template Selection ─────────────────────────────── */}
              {step === "template" && (
                <div className="p-4 space-y-4">
                  {templatesLoading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                      <p className="text-sm text-muted-foreground">Loading templates…</p>
                    </div>
                  ) : groupedTemplates.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <AlertCircle className="h-8 w-8 text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground">No templates available.</p>
                    </div>
                  ) : (
                    groupedTemplates.map(({ category, templates: cats }) => (
                      <div key={category}>
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                          {category}
                        </h3>
                        <div className="grid grid-cols-3 gap-2">
                          {cats.map((t) => (
                            <TemplateCard
                              key={t.id}
                              template={t}
                              selected={selectedTemplate?.id === t.id}
                              onSelect={() => setSelectedTemplate(t)}
                            />
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ── STEP 2: GSD Planning ───────────────────────────────────── */}
              {step === "planning" && (
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="text-sm font-medium mb-1">GSD Planning Archetype</h3>
                    <p className="text-xs text-muted-foreground mb-3">
                      Optionally seed your project with a GSD planning structure.{" "}
                      <span className="text-foreground font-medium">
                        You can always add this later.
                      </span>
                    </p>
                  </div>
                  {planningLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {allPlanningOptions.map((opt) => (
                        <PlanningOption
                          key={opt.id}
                          template={opt}
                          selected={selectedPlanning === opt.id}
                          onSelect={() => setSelectedPlanning(opt.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── STEP 3: Project Details ────────────────────────────────── */}
              {step === "details" && (
                <div className="p-4 space-y-4">
                  {/* Project name */}
                  <div className="space-y-1.5">
                    <Label htmlFor="projectName">Project Name</Label>
                    <Input
                      id="projectName"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="my-awesome-project"
                      autoFocus
                      className={cn(nameError && "border-destructive focus-visible:ring-destructive")}
                    />
                    {nameError ? (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {nameError}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Lowercase letters, numbers, and hyphens only.
                      </p>
                    )}
                  </div>

                  {/* Parent directory */}
                  <div className="space-y-1.5">
                    <Label>Parent Directory</Label>
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        value={parentDir}
                        placeholder="Select a parent directory…"
                        className="flex-1 text-sm"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handlePickFolder()}
                        type="button"
                      >
                        <FolderOpen className="h-4 w-4 mr-1.5" />
                        Browse
                      </Button>
                    </div>
                  </div>

                  {/* Path preview */}
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-xs">Project Path Preview</Label>
                    <div
                      className={cn(
                        "rounded-md border px-3 py-2 text-xs font-mono text-muted-foreground bg-muted/30",
                        pathAvailable === true && "text-status-success border-status-success/30",
                        pathAvailable === false && "text-destructive border-destructive/30"
                      )}
                    >
                      {pathPreview}
                      {checkingPath && (
                        <Loader2 className="inline h-3 w-3 animate-spin ml-2" />
                      )}
                      {pathAvailable === true && !checkingPath && (
                        <span className="ml-2 text-status-success">✓ available</span>
                      )}
                      {pathAvailable === false && !checkingPath && (
                        <span className="ml-2 text-destructive">✗ already exists</span>
                      )}
                    </div>
                  </div>

                  {/* Git init toggle */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="gitInit"
                      checked={gitInit}
                      onChange={(e) => setGitInit(e.target.checked)}
                      className="rounded border-border"
                    />
                    <Label htmlFor="gitInit" className="text-sm font-normal flex items-center gap-1.5">
                      <GitBranch className="h-4 w-4 text-muted-foreground" />
                      Initialize git repository
                    </Label>
                  </div>

                  {/* Summary badges */}
                  {selectedTemplate && (
                    <div className="rounded-lg border border-border/40 bg-muted/20 p-3 space-y-1.5">
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                        Summary
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="outline" size="sm">
                          {selectedTemplate.name}
                        </Badge>
                        <Badge variant="outline" size="sm">
                          {selectedTemplate.language}
                        </Badge>
                        {selectedPlanning !== "none" && (
                          <Badge variant="outline" size="sm">
                            GSD: {selectedPlanning}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── STEP 4: Creating ──────────────────────────────────────── */}
              {step === "creating" && (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  {isScaffolding ? (
                    <>
                      <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                      <h3 className="text-lg font-medium">Creating project…</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Scaffolding{" "}
                        <span className="font-mono font-medium text-foreground">
                          {projectName}
                        </span>{" "}
                        from {selectedTemplate?.name}
                      </p>
                    </>
                  ) : scaffoldError ? (
                    <>
                      <AlertCircle className="h-10 w-10 text-destructive mb-4" />
                      <h3 className="text-lg font-medium">Creation Failed</h3>
                      <p className="text-sm text-destructive mt-2 max-w-sm break-words">
                        {scaffoldError}
                      </p>
                    </>
                  ) : scaffoldResult ? (
                    <>
                      <CheckCircle className="h-10 w-10 text-status-success mb-4" />
                      <h3 className="text-lg font-medium">Project Created!</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        <span className="font-mono font-medium text-foreground">
                          {scaffoldResult.projectName}
                        </span>{" "}
                        is ready.
                      </p>
                      <div className="mt-3 rounded-md border border-border/40 bg-muted/20 px-3 py-2 text-xs font-mono text-muted-foreground max-w-full overflow-x-auto">
                        {scaffoldResult.projectPath}
                      </div>
                      <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                        <span>{scaffoldResult.filesCreated.length} files created</span>
                        {scaffoldResult.gsdSeeded && (
                          <span className="text-status-success">✓ GSD seeded</span>
                        )}
                        {scaffoldResult.gitInitialized && (
                          <span className="text-status-success flex items-center gap-1">
                            <GitBranch className="h-3 w-3" />
                            git init
                          </span>
                        )}
                      </div>
                      {importError && (
                        <p className="text-xs text-status-warning mt-2 max-w-sm">
                          Note: Could not register project in DB — you can import it later from the Projects page.
                        </p>
                      )}
                    </>
                  ) : null}
                </div>
              )}
            </div>

            {/* ── Footer navigation ─────────────────────────────────────── */}
            <DialogFooter className="border-t border-border/40 pt-4 flex-shrink-0">
              {step === "template" && (
                <>
                  <Button variant="outline" onClick={() => handleOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button
                    disabled={!selectedTemplate}
                    onClick={() => setStep("planning")}
                  >
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </>
              )}

              {step === "planning" && (
                <>
                  <Button variant="outline" onClick={() => setStep("template")}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button onClick={() => setStep("details")}>
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </>
              )}

              {step === "details" && (
                <>
                  <Button variant="outline" onClick={() => setStep("planning")}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    disabled={!canAdvanceFromDetails}
                    onClick={() => void handleScaffold()}
                  >
                    Create Project
                    <Sparkles className="ml-2 h-4 w-4" />
                  </Button>
                </>
              )}

              {step === "creating" && !isScaffolding && scaffoldError && (
                <>
                  <Button variant="outline" onClick={() => setStep("details")}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button onClick={() => void handleScaffold()}>
                    Retry
                  </Button>
                </>
              )}

              {step === "creating" && !isScaffolding && scaffoldResult && (
                <>
                  <Button variant="outline" onClick={() => handleOpenChange(false)}>
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      if (importedProjectId) {
                        void navigate(`/projects/${importedProjectId}`);
                      } else {
                        void navigate(
                          `/projects?path=${encodeURIComponent(scaffoldResult.projectPath)}`
                        );
                      }
                      handleOpenChange(false);
                    }}
                  >
                    Open Project
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </>
              )}
            </DialogFooter>
          </TabsContent>

          {/* ── IMPORT TAB ────────────────────────────────────────────────── */}
          <TabsContent value="import" className="flex-1 min-h-0">
            {/* Render the import dialog's inner content inline by using its
                onSuccess callback — we wrap it in its own Dialog so it still
                uses the shared Dialog component without a second backdrop. */}
            <ImportProjectDialog
              open={open && activeTab === "import"}
              onOpenChange={(val) => {
                if (!val) handleOpenChange(false);
              }}
              onSuccess={(projectId) => {
                handleOpenChange(false);
                void navigate(`/projects/${projectId}`);
              }}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
