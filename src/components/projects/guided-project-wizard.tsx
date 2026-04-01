// GSD VibeFlow - Guided Project Wizard
// 4-step guided project creation with AI preview and one-click headless start
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  FolderOpen,
  Loader2,
  Rocket,
  Sparkles,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  useGsd2GeneratePlanPreview,
  useGsd2HeadlessStart,
  useGsd2HeadlessStartWithModel,
  useGsd2Models,
  useImportProjectEnhanced,
  useProjectTemplates,
} from "@/lib/queries";
import { checkProjectPath, pickFolder, scaffoldProject, type Gsd2PlanPreview, type ProjectTemplate } from "@/lib/tauri";
import { PlanPreviewCards } from "./plan-preview-cards";

interface GuidedProjectWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type GuidedStep = "template" | "intent" | "preview" | "approve";

const PROJECT_NAME_REGEX = /^[a-z0-9][a-z0-9-]*$/;

const STEPS: Array<{ id: GuidedStep; label: string }> = [
  { id: "template", label: "Template" },
  { id: "intent", label: "Intent" },
  { id: "preview", label: "Preview" },
  { id: "approve", label: "Approve" },
];

function validateProjectName(name: string): string | null {
  if (name.length < 2) return "Name must be at least 2 characters.";
  if (!PROJECT_NAME_REGEX.test(name)) {
    return "Use lowercase letters, numbers, and hyphens only.";
  }
  return null;
}

function StepIndicator({ step }: { step: GuidedStep }) {
  const currentIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <div className="flex items-center justify-center gap-1.5 py-2 border-b border-border/40">
      {STEPS.map((item, idx) => (
        <div key={item.id} className="flex items-center gap-1.5">
          <div
            className={cn(
              "h-5 w-5 rounded-full border text-[10px] font-semibold flex items-center justify-center",
              idx < currentIndex && "bg-primary border-primary text-primary-foreground",
              idx === currentIndex && "border-primary bg-primary/10 text-primary",
              idx > currentIndex && "border-border text-muted-foreground"
            )}
          >
            {idx < currentIndex ? <CheckCircle className="h-3 w-3" /> : idx + 1}
          </div>
          <span
            className={cn(
              "text-xs hidden sm:inline",
              idx === currentIndex ? "text-foreground font-medium" : "text-muted-foreground"
            )}
          >
            {item.label}
          </span>
          {idx < STEPS.length - 1 && (
            <div className={cn("h-px w-4", idx < currentIndex ? "bg-primary" : "bg-border")} />
          )}
        </div>
      ))}
    </div>
  );
}

function TemplateCard({
  template,
  selected,
  onSelect,
}: {
  template: ProjectTemplate;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "text-left rounded-lg border p-3 transition-colors",
        selected
          ? "border-primary bg-primary/5"
          : "border-border/50 hover:bg-muted/40 hover:border-border"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{template.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {template.description}
          </p>
        </div>
        {selected && <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />}
      </div>
      <div className="flex gap-1.5 mt-2 flex-wrap">
        <Badge variant="outline" size="sm">
          {template.language}
        </Badge>
        <Badge variant="outline" size="sm">
          {template.archetype}
        </Badge>
      </div>
    </button>
  );
}

export function GuidedProjectWizard({ open, onOpenChange }: GuidedProjectWizardProps) {
  const navigate = useNavigate();

  const [step, setStep] = useState<GuidedStep>("template");
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
  const [projectName, setProjectName] = useState("");
  const [parentDir, setParentDir] = useState("");
  const [gitInit, setGitInit] = useState(true);
  const [nameError, setNameError] = useState<string | null>(null);
  const [checkingPath, setCheckingPath] = useState(false);
  const [pathAvailable, setPathAvailable] = useState<boolean | null>(null);

  const [intent, setIntent] = useState("");
  const [preview, setPreview] = useState<Gsd2PlanPreview | null>(null);
  const [adjustment, setAdjustment] = useState("");
  const [approved, setApproved] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>("auto");

  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const { data: templates = [], isLoading: templatesLoading } = useProjectTemplates();
  const { data: models = [] } = useGsd2Models(undefined, open);

  const importProject = useImportProjectEnhanced();
  const generatePreview = useGsd2GeneratePlanPreview();
  const startHeadless = useGsd2HeadlessStart();
  const startHeadlessWithModel = useGsd2HeadlessStartWithModel();

  const resetState = useCallback(() => {
    setStep("template");
    setSelectedTemplate(null);
    setProjectName("");
    setParentDir("");
    setGitInit(true);
    setNameError(null);
    setCheckingPath(false);
    setPathAvailable(null);
    setIntent("");
    setPreview(null);
    setAdjustment("");
    setApproved(false);
    setSelectedModel("auto");
    setIsStarting(false);
    setStartError(null);
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        resetState();
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange, resetState]
  );

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
    }, 300);

    return () => clearTimeout(timer);
  }, [projectName, parentDir]);

  const canContinueTemplate = !!selectedTemplate && !!projectName && !!parentDir && !nameError && pathAvailable === true;
  const canGeneratePreview = intent.trim().length >= 12;
  const canStart = !!preview && approved && !isStarting;

  const pathPreview = useMemo(() => {
    if (!parentDir) return "Select a parent directory";
    if (!projectName) return `${parentDir}/…`;
    return `${parentDir.replace(/\/$/, "")}/${projectName}`;
  }, [parentDir, projectName]);

  const handlePickFolder = useCallback(async () => {
    try {
      const picked = await pickFolder();
      if (picked) setParentDir(picked);
    } catch {
      toast.error("Failed to open folder picker");
    }
  }, []);

  const runGeneratePreview = useCallback(
    async (prompt: string) => {
      const value = prompt.trim();
      if (value.length < 12) {
        toast.error("Please add a little more detail before generating a preview");
        return;
      }

      const nextPreview = await generatePreview.mutateAsync(value);
      setPreview(nextPreview);
      setStartError(null);
    },
    [generatePreview]
  );

  const handleGenerateInitialPreview = useCallback(async () => {
    try {
      await runGeneratePreview(intent);
      setStep("preview");
    } catch {
      // Toast comes from hook
    }
  }, [intent, runGeneratePreview]);

  const handleRegenerateWithAdjustment = useCallback(async () => {
    if (!preview) return;

    const compositePrompt = adjustment.trim()
      ? `${intent.trim()}\n\nPlease adjust the plan to account for:\n${adjustment.trim()}`
      : intent;

    try {
      await runGeneratePreview(compositePrompt);
      toast.success("Plan preview regenerated");
      setStep("preview");
    } catch {
      // Toast comes from hook
    }
  }, [adjustment, intent, preview, runGeneratePreview]);

  const handleStartBuilding = useCallback(async () => {
    if (!selectedTemplate || !preview || !projectName || !parentDir) return;

    setIsStarting(true);
    setStartError(null);

    let importedProjectId: string | null = null;

    try {
      const scaffolded = await scaffoldProject({
        templateId: selectedTemplate.id,
        projectName,
        parentDirectory: parentDir,
        gitInit,
      });

      const importResult = await importProject.mutateAsync({
        path: scaffolded.projectPath,
        autoSyncRoadmap: false,
      });
      importedProjectId = importResult.project.id;

      if (selectedModel !== "auto") {
        await startHeadlessWithModel.mutateAsync({
          projectId: importedProjectId,
          model: selectedModel,
        });
      } else {
        await startHeadless.mutateAsync(importedProjectId);
      }

      toast.success("Project created and headless build started", {
        description: preview.milestone.title,
      });

      handleOpenChange(false);
      void navigate(`/projects/${importedProjectId}?view=overview`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      setStartError(msg);

      if (importedProjectId) {
        toast.error("Project was created, but failed to start headless execution", {
          description: "Opening project so you can start headless manually.",
        });
        handleOpenChange(false);
        void navigate(`/projects/${importedProjectId}?view=overview`);
      }
    } finally {
      setIsStarting(false);
    }
  }, [
    selectedTemplate,
    preview,
    projectName,
    parentDir,
    gitInit,
    importProject,
    selectedModel,
    startHeadlessWithModel,
    startHeadless,
    handleOpenChange,
    navigate,
  ]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Guided Project Wizard
          </DialogTitle>
          <DialogDescription>
            Describe what you want to build, review the AI plan, then launch execution.
          </DialogDescription>
        </DialogHeader>

        <StepIndicator step={step} />

        <div className="flex-1 min-h-0 overflow-y-auto py-4 px-1">
          {step === "template" && (
            <div className="space-y-4 px-3">
              <div>
                <h3 className="text-sm font-medium">Choose a template</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Start with a project shape that matches your stack.
                </p>
              </div>

              {templatesLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading templates…
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-2">
                  {templates.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      selected={selectedTemplate?.id === template.id}
                      onSelect={() => setSelectedTemplate(template)}
                    />
                  ))}
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-border/40">
                <div className="space-y-1.5">
                  <Label htmlFor="guided-project-name">Project name</Label>
                  <Input
                    id="guided-project-name"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="my-awesome-project"
                    className={cn(nameError && "border-destructive focus-visible:ring-destructive")}
                  />
                  {nameError ? (
                    <p className="text-xs text-destructive">{nameError}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Lowercase, numbers, hyphens only.</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>Project location</Label>
                  <div className="flex gap-2">
                    <Input readOnly value={parentDir} placeholder="Choose a parent folder" className="text-sm" />
                    <Button type="button" variant="outline" onClick={() => void handlePickFolder()}>
                      <FolderOpen className="h-4 w-4 mr-1.5" /> Browse
                    </Button>
                  </div>
                  <div
                    className={cn(
                      "rounded-md border px-2.5 py-1.5 text-xs font-mono text-muted-foreground bg-muted/30",
                      pathAvailable === true && "text-status-success border-status-success/30",
                      pathAvailable === false && "text-destructive border-destructive/30"
                    )}
                  >
                    {pathPreview}
                    {checkingPath && <Loader2 className="inline h-3 w-3 animate-spin ml-2" />}
                    {!checkingPath && pathAvailable === true && <span className="ml-2">✓ available</span>}
                    {!checkingPath && pathAvailable === false && <span className="ml-2">✗ exists</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="guided-git-init"
                  checked={gitInit}
                  onCheckedChange={(value) => setGitInit(value === true)}
                />
                <Label htmlFor="guided-git-init" className="text-sm font-normal">
                  Initialize git repository
                </Label>
              </div>
            </div>
          )}

          {step === "intent" && (
            <div className="space-y-4 px-3">
              <div>
                <h3 className="text-sm font-medium">Describe your intent</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Explain the product outcome, major features, and constraints you care about.
                </p>
              </div>

              <Textarea
                value={intent}
                onChange={(e) => setIntent(e.target.value)}
                placeholder="Build a SaaS dashboard for customer support teams with inbox triage, SLA reporting, role-based access, and Stripe billing..."
                className="min-h-[180px]"
              />

              <p className="text-xs text-muted-foreground">
                Tip: include target users, core workflows, and any must-have integrations.
              </p>
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-4 px-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-medium">AI plan preview</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Review milestone and slices before launching execution.
                  </p>
                </div>
                {generatePreview.isPending && (
                  <Badge variant="pending" className="gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Generating
                  </Badge>
                )}
              </div>

              {preview ? (
                <PlanPreviewCards preview={preview} />
              ) : (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No preview yet. Go back and generate one from your intent.
                </div>
              )}
            </div>
          )}

          {step === "approve" && (
            <div className="space-y-4 px-3">
              <div>
                <h3 className="text-sm font-medium">Approve or adjust</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Optionally request changes, then start building with one click.
                </p>
              </div>

              <div className="rounded-lg border bg-muted/20 p-3 space-y-1.5">
                <p className="text-xs text-muted-foreground">Selected template</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline">{selectedTemplate?.name ?? "None"}</Badge>
                  <Badge variant="outline">{projectName || "Unnamed"}</Badge>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="guided-adjustment">Adjustment notes (optional)</Label>
                <Textarea
                  id="guided-adjustment"
                  value={adjustment}
                  onChange={(e) => setAdjustment(e.target.value)}
                  placeholder="Ask for changes like API-first order, lower-risk slices first, or specific integrations."
                  className="min-h-[120px]"
                />
                <p className="text-xs text-muted-foreground">
                  Use this if you want to regenerate the preview before launching.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Execution model</Label>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Auto-select model" />
                  </SelectTrigger>
                  <SelectContent className="min-w-[280px]">
                    <SelectItem value="auto" className="text-sm py-2">Auto-select model</SelectItem>
                    {(() => {
                      const providers = [...new Set(models.map((m) => m.provider))];
                      return providers.map((provider) => (
                        <SelectGroup key={provider}>
                          <SelectLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-2 pt-2 pb-1">
                            {provider}
                          </SelectLabel>
                          {models.filter((m) => m.provider === provider).map((model) => (
                            <SelectItem key={`${model.provider}:${model.id}`} value={model.id} className="text-sm py-1.5">
                              {model.name.split(/\s/)[0]}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ));
                    })()}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 rounded-md border p-2.5">
                <Checkbox
                  id="guided-approve"
                  checked={approved}
                  onCheckedChange={(value) => setApproved(value === true)}
                />
                <Label htmlFor="guided-approve" className="text-sm font-normal">
                  I approve this plan preview and want to start execution.
                </Label>
              </div>

              {startError && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 text-destructive text-xs p-2.5 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5" />
                  <span>{startError}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-border/40 pt-4">
          {step === "template" && (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button disabled={!canContinueTemplate} onClick={() => setStep("intent")}>
                Next
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </>
          )}

          {step === "intent" && (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button variant="outline" onClick={() => setStep("template")}>
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Back
              </Button>
              <Button disabled={!canGeneratePreview || generatePreview.isPending} onClick={() => void handleGenerateInitialPreview()}>
                {generatePreview.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    Generating
                  </>
                ) : (
                  <>
                    Generate Plan
                    <Sparkles className="h-4 w-4 ml-1.5" />
                  </>
                )}
              </Button>
            </>
          )}

          {step === "preview" && (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button variant="outline" onClick={() => setStep("intent")}>
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Back
              </Button>
              <Button disabled={!preview} onClick={() => setStep("approve")}>
                Approve / Adjust
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </>
          )}

          {step === "approve" && (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isStarting}>
                Cancel
              </Button>
              <Button variant="outline" onClick={() => setStep("preview")} disabled={isStarting}>
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Back
              </Button>
              <Button variant="secondary" onClick={() => void handleRegenerateWithAdjustment()} disabled={generatePreview.isPending || isStarting}>
                {generatePreview.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Regenerate Preview"}
              </Button>
              <Button onClick={() => void handleStartBuilding()} disabled={!canStart}>
                {isStarting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    Starting
                  </>
                ) : (
                  <>
                    Start Building
                    <Rocket className="h-4 w-4 ml-1.5" />
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
