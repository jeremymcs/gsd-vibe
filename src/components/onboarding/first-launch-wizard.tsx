// GSD VibeFlow - First Launch Wizard
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Rocket,
  Wrench,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  useOnboardingDependencies,
  useOnboardingMarkComplete,
  useOnboardingStatus,
  useOnboardingValidateAndStoreApiKey,
} from "@/lib/queries";
import type {
  ApiKeyValidationResult,
  DependencyCheck,
  OnboardingProvider,
  OnboardingStatus,
  OnboardingUserMode,
} from "@/lib/tauri";
import { cn } from "@/lib/utils";

interface FirstLaunchWizardProps {
  className?: string;
  onComplete?: (status: OnboardingStatus) => void;
  onCancel?: () => void;
}

type WizardStep = "dependencies" | "api-keys" | "mode";

interface ProviderConfig {
  id: OnboardingProvider;
  label: string;
  envKey: string;
  placeholder: string;
  hint: string;
}

const STEPS: Array<{ id: WizardStep; label: string }> = [
  { id: "dependencies", label: "Tooling" },
  { id: "api-keys", label: "API Keys" },
  { id: "mode", label: "Interface" },
];

const PROVIDERS: ProviderConfig[] = [
  {
    id: "anthropic",
    label: "Anthropic",
    envKey: "ANTHROPIC_API_KEY",
    placeholder: "sk-ant-…",
    hint: "Starts with sk-ant-",
  },
  {
    id: "openai",
    label: "OpenAI",
    envKey: "OPENAI_API_KEY",
    placeholder: "sk-…",
    hint: "Starts with sk-",
  },
  {
    id: "github",
    label: "GitHub",
    envKey: "GITHUB_TOKEN",
    placeholder: "ghp_… or github_pat_…",
    hint: "Classic PAT (ghp_) or fine-grained token (github_pat_)",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    envKey: "OPENROUTER_API_KEY",
    placeholder: "sk-or-v1-…",
    hint: "Starts with sk-or-v1- (or sk-)",
  },
];

function WizardStepIndicator({ step }: { step: WizardStep }) {
  const activeIndex = STEPS.findIndex((entry) => entry.id === step);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        {STEPS.map((entry, idx) => {
          const complete = idx < activeIndex;
          const active = idx === activeIndex;

          return (
            <div key={entry.id} className="flex items-center gap-2 min-w-0">
              <div
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold",
                  complete && "border-primary bg-primary text-primary-foreground",
                  active && "border-primary bg-primary/10 text-primary",
                  !complete && !active && "border-border text-muted-foreground",
                )}
              >
                {complete ? <CheckCircle2 className="h-3.5 w-3.5" /> : idx + 1}
              </div>
              <span className={cn("text-xs", active ? "text-foreground" : "text-muted-foreground")}>{entry.label}</span>
              {idx < STEPS.length - 1 && <div className="h-px w-8 bg-border" />}
            </div>
          );
        })}
      </div>
      <Progress value={((activeIndex + 1) / STEPS.length) * 100} size="sm" />
    </div>
  );
}

function DependencyStep({
  isLoading,
  isRefreshing,
  error,
  dependencies,
  checkedAt,
  onRefresh,
}: {
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  dependencies: DependencyCheck[];
  checkedAt: string | null;
  onRefresh: () => void;
}) {
  const installedCount = dependencies.filter((item) => item.installed).length;

  if (isLoading) {
    return (
      <div className="flex min-h-[280px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Detecting development tools…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[280px] rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <div className="mb-2 flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <p className="text-sm font-medium">Dependency detection failed</p>
        </div>
        <p className="text-sm text-destructive/90">{error}</p>
        <Button type="button" variant="outline" className="mt-4" onClick={onRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry check
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 p-3">
        <div>
          <p className="text-sm font-medium">Tooling check</p>
          <p className="text-xs text-muted-foreground">
            Found {installedCount}/{dependencies.length} recommended CLI tools
            {checkedAt ? ` • checked ${new Date(checkedAt).toLocaleTimeString()}` : ""}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing}>
          {isRefreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {dependencies.map((dep) => (
          <div key={dep.name} className="rounded-md border border-border/60 bg-card p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{dep.name}</p>
              {dep.installed ? (
                <Badge variant="outline" className="text-status-success border-status-success/30">
                  <CheckCircle2 className="mr-1 h-3 w-3" /> Installed
                </Badge>
              ) : (
                <Badge variant="outline" className="text-status-warning border-status-warning/40">
                  <AlertCircle className="mr-1 h-3 w-3" /> Missing
                </Badge>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {dep.version ?? dep.message ?? "Not detected"}
            </p>
          </div>
        ))}
      </div>

      {installedCount < dependencies.length && (
        <p className="rounded-md border border-status-warning/30 bg-status-warning/10 px-3 py-2 text-xs text-status-warning">
          You can continue setup now and install missing tools later.
        </p>
      )}
    </div>
  );
}

function ApiKeysStep({
  statusHasApiKeys,
  inputs,
  results,
  activeProvider,
  onInputChange,
  onValidate,
}: {
  statusHasApiKeys: boolean;
  inputs: Record<OnboardingProvider, string>;
  results: Partial<Record<OnboardingProvider, ApiKeyValidationResult>>;
  activeProvider: OnboardingProvider | null;
  onInputChange: (provider: OnboardingProvider, value: string) => void;
  onValidate: (provider: OnboardingProvider) => void;
}) {
  const savedCount = Object.values(results).filter((result) => result?.stored).length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Add at least one provider key to unlock model access. Keys are validated with the provider and stored in your OS keychain.
      </p>

      <div className="space-y-3">
        {PROVIDERS.map((provider) => {
          const result = results[provider.id];
          const isLoading = activeProvider === provider.id;

          return (
            <div key={provider.id} className="rounded-lg border border-border/60 bg-card p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{provider.label}</p>
                  <p className="text-xs text-muted-foreground">{provider.envKey} • {provider.hint}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onValidate(provider.id)}
                  disabled={isLoading || !inputs[provider.id].trim()}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Validate"}
                </Button>
              </div>

              <Label htmlFor={`onboarding-${provider.id}`} className="sr-only">
                {provider.label} API key
              </Label>
              <Input
                id={`onboarding-${provider.id}`}
                type="password"
                value={inputs[provider.id]}
                onChange={(event) => onInputChange(provider.id, event.target.value)}
                placeholder={provider.placeholder}
                autoComplete="off"
              />

              {result && (
                <p
                  className={cn(
                    "mt-2 text-xs",
                    result.valid && result.stored ? "text-status-success" : "text-destructive",
                  )}
                >
                  {result.message}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-md border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
        {statusHasApiKeys || savedCount > 0 ? (
          <span className="text-status-success">✓ At least one API key is available.</span>
        ) : (
          <span>At least one provider key is required to continue.</span>
        )}
      </div>
    </div>
  );
}

function ModeStep({
  mode,
  onModeChange,
}: {
  mode: OnboardingUserMode;
  onModeChange: (mode: OnboardingUserMode) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Choose your default interface mode. You can change this later from Settings.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onModeChange("guided")}
          className={cn(
            "rounded-lg border p-4 text-left transition-colors",
            mode === "guided"
              ? "border-primary bg-primary/5"
              : "border-border/60 bg-card hover:border-border",
          )}
        >
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Guided</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Simplified interface with wizard-first flows and reduced visual complexity.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onModeChange("expert")}
          className={cn(
            "rounded-lg border p-4 text-left transition-colors",
            mode === "expert"
              ? "border-primary bg-primary/5"
              : "border-border/60 bg-card hover:border-border",
          )}
        >
          <div className="mb-2 flex items-center gap-2">
            <Rocket className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Expert</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Full feature surface with advanced controls and direct access to all tools.
          </p>
        </button>
      </div>
    </div>
  );
}

export function FirstLaunchWizard({ className, onComplete, onCancel }: FirstLaunchWizardProps) {
  const [step, setStep] = useState<WizardStep>("dependencies");
  const [selectedMode, setSelectedMode] = useState<OnboardingUserMode>("expert");
  const [apiKeyInputs, setApiKeyInputs] = useState<Record<OnboardingProvider, string>>({
    anthropic: "",
    openai: "",
    github: "",
    openrouter: "",
  });
  const [validationResults, setValidationResults] = useState<Partial<Record<OnboardingProvider, ApiKeyValidationResult>>>({});
  const [activeProvider, setActiveProvider] = useState<OnboardingProvider | null>(null);

  const onboardingStatus = useOnboardingStatus();
  const dependencies = useOnboardingDependencies();
  const validateAndStoreApiKey = useOnboardingValidateAndStoreApiKey();
  const markComplete = useOnboardingMarkComplete();

  useEffect(() => {
    if (onboardingStatus.data?.user_mode) {
      setSelectedMode(onboardingStatus.data.user_mode);
    }
  }, [onboardingStatus.data?.user_mode]);

  // Handle Escape key to close wizard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !markComplete.isPending && onCancel) {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [markComplete.isPending, onCancel]);

  const stepIndex = useMemo(() => STEPS.findIndex((entry) => entry.id === step), [step]);

  const dependencyError = dependencies.error instanceof Error ? dependencies.error.message : null;

  const hasAnyStoredKey =
    Boolean(onboardingStatus.data?.has_api_keys) ||
    Object.values(validationResults).some((r) => r?.stored);

  const handleValidate = async (provider: OnboardingProvider) => {
    const candidate = apiKeyInputs[provider]?.trim();
    if (!candidate) return;

    setActiveProvider(provider);

    try {
      const result = await validateAndStoreApiKey.mutateAsync({ provider, apiKey: candidate });
      setValidationResults((previous) => ({ ...previous, [provider]: result }));
      if (result.valid && result.stored) {
        setApiKeyInputs((previous) => ({ ...previous, [provider]: "" }));
      }
    } finally {
      setActiveProvider(null);
    }
  };

  const handleFinish = async () => {
    const result = await markComplete.mutateAsync(selectedMode);
    onComplete?.(result);
  };

  return (
    <div className={cn("fixed inset-0 z-50 flex items-center justify-center bg-background/90 p-4", className)}>
      <Card className="w-full max-w-3xl border-border/60 shadow-xl">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="mb-2 flex items-center gap-2 text-primary">
                <Wrench className="h-5 w-5" />
                <span className="text-xs font-semibold uppercase tracking-wider">First-launch setup</span>
              </div>
              <CardTitle>Welcome to GSD VibeFlow</CardTitle>
              <CardDescription>
                We'll verify local tooling, secure your API keys, and set your default interface mode.
              </CardDescription>
            </div>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={markComplete.isPending}
                className="rounded p-1 hover:bg-muted disabled:opacity-50"
                aria-label="Close wizard"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          <WizardStepIndicator step={step} />
        </CardHeader>

        <CardContent className="min-h-[300px]">
          {onboardingStatus.isLoading ? (
            <div className="flex min-h-[250px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : step === "dependencies" ? (
            <DependencyStep
              isLoading={dependencies.isLoading}
              isRefreshing={dependencies.isFetching}
              error={dependencyError}
              dependencies={dependencies.data?.dependencies ?? []}
              checkedAt={dependencies.data?.checked_at ?? null}
              onRefresh={() => {
                void dependencies.refetch();
              }}
            />
          ) : step === "api-keys" ? (
            <ApiKeysStep
              statusHasApiKeys={Boolean(onboardingStatus.data?.has_api_keys)}
              inputs={apiKeyInputs}
              results={validationResults}
              activeProvider={activeProvider}
              onInputChange={(provider, value) => {
                setApiKeyInputs((previous) => ({ ...previous, [provider]: value }));
              }}
              onValidate={(provider) => {
                void handleValidate(provider);
              }}
            />
          ) : (
            <ModeStep mode={selectedMode} onModeChange={setSelectedMode} />
          )}
        </CardContent>

        <CardFooter className="flex items-center justify-between gap-2 border-t border-border/60 pt-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(STEPS[Math.max(0, stepIndex - 1)].id)}
              disabled={stepIndex === 0 || markComplete.isPending}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            {step === "api-keys" && onCancel && (
              <Button
                type="button"
                variant="ghost"
                onClick={onCancel}
                disabled={markComplete.isPending}
              >
                Cancel
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {step !== "mode" && step !== "api-keys" ? (
              <Button
                type="button"
                onClick={() => setStep(STEPS[Math.min(STEPS.length - 1, stepIndex + 1)].id)}
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : step === "api-keys" ? (
              <Button
                type="button"
                onClick={() => setStep(STEPS[Math.min(STEPS.length - 1, stepIndex + 1)].id)}
                disabled={!hasAnyStoredKey}
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => {
                  void handleFinish();
                }}
                disabled={markComplete.isPending}
              >
                {markComplete.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Complete setup
              </Button>
            )}
          </div>
        </CardFooter>

        {markComplete.isError && (
          <div className="border-t border-destructive/30 bg-destructive/10 px-6 py-3 text-xs text-destructive">
            {markComplete.error instanceof Error
              ? markComplete.error.message
              : "Unable to complete onboarding. Please retry."}
          </div>
        )}

        {validateAndStoreApiKey.isError && (
          <div className="border-t border-destructive/30 bg-destructive/10 px-6 py-3 text-xs text-destructive">
            {validateAndStoreApiKey.error instanceof Error
              ? validateAndStoreApiKey.error.message
              : "Unable to validate API key. Please retry."}
          </div>
        )}

        {onboardingStatus.error && (
          <div className="border-t border-destructive/30 bg-destructive/10 px-6 py-3 text-xs text-destructive">
            {onboardingStatus.error instanceof Error
              ? onboardingStatus.error.message
              : "Unable to read onboarding state."}
          </div>
        )}
      </Card>
    </div>
  );
}
