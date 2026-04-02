// VCCA - Settings Page
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExportDataDialog, ClearDataDialog, ThemeCustomization, SecretsManager } from "@/components/settings";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useOnboardingStatus, useSettings, useUpdateSettings, useResetSettings, useImportSettings } from "@/lib/queries";
import { Settings } from "@/lib/tauri";
import { useTheme, Theme } from "@/hooks/use-theme";
import { Download, Trash2, Settings as SettingsIcon, RotateCcw, Upload, Bug, Terminal, Bell, Database, ScrollText, Rocket } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { LogsContent } from "./logs";
import { SkeletonCard } from "@/components/ui/skeleton";

function SettingsField({
  title,
  description,
  control,
}: {
  title: string;
  description: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border/50 bg-muted/15 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex-shrink-0">{control}</div>
    </div>
  );
}

function SettingsSelectField({
  htmlFor,
  title,
  description,
  children,
}: {
  htmlFor: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/15 px-4 py-3">
      <Label htmlFor={htmlFor} className="block text-sm font-medium">
        {title}
      </Label>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

export function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const { data: onboardingStatus } = useOnboardingStatus();
  const updateSettings = useUpdateSettings();
  const resetSettings = useResetSettings();
  const importSettingsMutation = useImportSettings();
  const { theme, setTheme } = useTheme();
  const [formData, setFormData] = useState<Settings | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (settings && !formData) {
      setFormData(settings);
    }
  }, [settings, formData]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleInstantModeChange = (value: Settings["user_mode"]) => {
    if (!formData) return;

    const previousMode = formData.user_mode;
    const nextFormData = { ...formData, user_mode: value };
    setFormData(nextFormData);

    const persistedSettings: Settings = settings
      ? { ...settings, user_mode: value }
      : nextFormData;

    void updateSettings.mutateAsync(persistedSettings).catch(() => {
      setFormData({ ...nextFormData, user_mode: previousMode });
    });
  };

  const handleChange = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    if (!formData) return;
    if (key === "theme") {
      setTheme(value as Theme);
      setFormData({ ...formData, [key]: value });
      return;
    }
    if (key === "user_mode") {
      handleInstantModeChange(value as string);
      return;
    }
    setFormData({ ...formData, [key]: value });
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!formData) return;
    await updateSettings.mutateAsync(formData);
    setHasChanges(false);
  };

  const openFirstLaunchSetup = () => {
    window.dispatchEvent(new Event("vcca:open-onboarding"));
  };

  if (isLoading || !formData) {
    return (
      <div className="p-8 space-y-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-8">
      {/* Header */}
      <PageHeader
        title="Settings"
        description="Configure VCCA preferences"
        icon={<SettingsIcon className="h-6 w-6 text-muted-foreground" />}
        actions={
          hasChanges ? (
            <Button onClick={() => void handleSave()} disabled={updateSettings.isPending}>
              {updateSettings.isPending ? "Saving..." : "Save Changes"}
            </Button>
          ) : undefined
        }
      />

      <Tabs defaultValue="general" className="mt-6">
        <div className="sticky top-0 z-10 -mx-8 mb-6 border-b border-border/60 bg-background/95 px-8 pb-4 pt-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <TabsList className="h-auto flex-wrap justify-start gap-2 rounded-xl border border-border/60 bg-card/70 p-1">
            <TabsTrigger value="general" className="rounded-lg px-4 py-2">
              General
            </TabsTrigger>
            <TabsTrigger value="appearance" className="rounded-lg px-4 py-2">
              Appearance
            </TabsTrigger>
            <TabsTrigger value="notifications" className="rounded-lg px-4 py-2">
              Notifications
            </TabsTrigger>
            <TabsTrigger value="data" className="rounded-lg px-4 py-2">
              Data Management
            </TabsTrigger>
            <TabsTrigger value="advanced" className="rounded-lg px-4 py-2">
              Advanced
            </TabsTrigger>
            <TabsTrigger value="logs" className="rounded-lg px-4 py-2">
              <ScrollText className="h-3.5 w-3.5 mr-1.5" />
              Logs
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── General ─────────────────────────────────────── */}
        <TabsContent value="general" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SettingsIcon className="h-5 w-5" />
                  Workspace Experience
                </CardTitle>
                <CardDescription>Core behavior, interface mode, and launch defaults.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <SettingsSelectField
                  htmlFor="settings-interface-mode"
                  title="Interface Mode"
                  description="Guided mode simplifies navigation. Expert mode exposes the full workspace."
                >
                  <Select
                    value={formData.user_mode}
                    onValueChange={(value) => handleChange("user_mode", value)}
                  >
                    <SelectTrigger id="settings-interface-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="guided">Guided — Simplified, wizard-driven interface</SelectItem>
                      <SelectItem value="expert">Expert — Full power UI with all features</SelectItem>
                    </SelectContent>
                  </Select>
                </SettingsSelectField>

                <SettingsSelectField
                  htmlFor="settings-theme"
                  title="Base Theme"
                  description="Pick how VCCA responds to light and dark environments."
                >
                  <Select
                    value={theme}
                    onValueChange={(value) => handleChange("theme", value)}
                  >
                    <SelectTrigger id="settings-theme">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="system">System</SelectItem>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                    </SelectContent>
                  </Select>
                </SettingsSelectField>

                <SettingsField
                  title="Start on login"
                  description="Launch VCCA automatically when you sign into your machine."
                  control={
                    <Switch
                      id="settings-start-login"
                      checked={formData.start_on_login}
                      onCheckedChange={(checked) => handleChange("start_on_login", checked)}
                    />
                  }
                />

                <SettingsField
                  title="Auto-open last project"
                  description="Reopen the last viewed project at startup so you can resume faster."
                  control={
                    <Switch
                      id="settings-auto-open"
                      checked={formData.auto_open_last_project}
                      onCheckedChange={(checked) => handleChange("auto_open_last_project", checked)}
                    />
                  }
                />

                <div className="rounded-lg border border-border/50 bg-muted/15 px-4 py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">First-launch setup</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Reopen the setup wizard to re-check tooling, validate API keys, or change the default interface mode.
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Status: {onboardingStatus?.completed ? "Completed" : "Not completed"}
                        {onboardingStatus?.completed_at ? ` • last completed ${new Date(onboardingStatus.completed_at).toLocaleString()}` : ""}
                      </p>
                    </div>
                    <Button type="button" variant="outline" onClick={openFirstLaunchSetup}>
                      <Rocket className="h-4 w-4 mr-2" />
                      {onboardingStatus?.completed ? "Run Setup Again" : "Open Setup"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Terminal className="h-5 w-5" />
                    Window & Terminal
                  </CardTitle>
                  <CardDescription>Desktop behavior and terminal persistence.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <SettingsSelectField
                    htmlFor="settings-window-state"
                    title="Window State"
                    description="Choose how the application window should open by default."
                  >
                    <Select
                      value={formData.window_state}
                      onValueChange={(value) => handleChange("window_state", value)}
                    >
                      <SelectTrigger id="settings-window-state">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="maximized">Maximized</SelectItem>
                      </SelectContent>
                    </Select>
                  </SettingsSelectField>

                  <SettingsField
                    title="Persistent terminals (tmux)"
                    description="Keep terminal sessions alive across app restarts when tmux is available."
                    control={
                      <Switch
                        id="settings-use-tmux"
                        checked={formData.use_tmux}
                        onCheckedChange={(checked) => handleChange("use_tmux", checked)}
                      />
                    }
                  />
                </CardContent>
              </Card>

              <SecretsManager />
            </div>
          </div>
        </TabsContent>

        {/* ── Appearance ──────────────────────────────────── */}
        <TabsContent value="appearance" className="space-y-6">
          <ThemeCustomization />
        </TabsContent>

        {/* ── Notifications ───────────────────────────────── */}
        <TabsContent value="notifications" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Delivery
                </CardTitle>
                <CardDescription>Choose whether VCCA should interrupt you with alerts.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <SettingsField
                  title="Enable notifications"
                  description="Show system-level notifications for important events."
                  control={
                    <Switch
                      id="settings-notifications"
                      checked={formData.notifications_enabled}
                      onCheckedChange={(checked) => handleChange("notifications_enabled", checked)}
                    />
                  }
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Event Triggers</CardTitle>
                <CardDescription>Control which events generate notifications.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <SettingsField
                  title="On completion"
                  description="Notify when a major workflow or task completes successfully."
                  control={
                    <Switch
                      id="settings-notify-complete"
                      checked={formData.notify_on_complete}
                      onCheckedChange={(checked) => handleChange("notify_on_complete", checked)}
                      disabled={!formData.notifications_enabled}
                    />
                  }
                />

                <SettingsField
                  title="On error"
                  description="Notify when workflows fail, commands error, or recovery is needed."
                  control={
                    <Switch
                      id="settings-notify-error"
                      checked={formData.notify_on_error}
                      onCheckedChange={(checked) => handleChange("notify_on_error", checked)}
                      disabled={!formData.notifications_enabled}
                    />
                  }
                />

                <SettingsField
                  title="On phase complete"
                  description="Notify when a phase boundary is crossed in active planning workflows."
                  control={
                    <Switch
                      id="settings-notify-phase"
                      checked={formData.notify_on_phase_complete}
                      onCheckedChange={(checked) => handleChange("notify_on_phase_complete", checked)}
                      disabled={!formData.notifications_enabled}
                    />
                  }
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Data Management ─────────────────────────────── */}
        <TabsContent value="data" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Storage
                </CardTitle>
                <CardDescription>Where application state lives and how to move it safely.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-border/50 bg-muted/15 px-4 py-3">
                  <p className="text-sm font-medium">Database Location</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Application data is stored locally in the app support directory.
                  </p>
                  <code className="mt-3 block rounded bg-muted px-2 py-1.5 text-xs">
                    ~/Library/Application Support/net.fluxlabs.vcca/vcca.db
                  </code>
                </div>

                <div className="rounded-lg border border-border/50 bg-muted/15 px-4 py-3">
                  <p className="text-sm font-medium">Backups & portability</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Export data before migrations, machine changes, or aggressive cleanup.
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Import & Export</CardTitle>
                  <CardDescription>Move settings and app data in and out of VCCA.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => setShowExportDialog(true)}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Data
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => void importSettingsMutation.mutateAsync().then((imported) => {
                      setFormData(imported);
                      setHasChanges(false);
                    }).catch(() => { /* toast via onError */ })}
                    disabled={importSettingsMutation.isPending}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Import Settings
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-destructive/40">
                <CardHeader>
                  <CardTitle>Danger Zone</CardTitle>
                  <CardDescription>Destructive actions that affect stored state.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="destructive" onClick={() => setShowClearDialog(true)}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear Data
                    </Button>
                    {!showResetConfirm ? (
                      <Button variant="outline" onClick={() => setShowResetConfirm(true)}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Reset to Defaults
                      </Button>
                    ) : null}
                  </div>

                  {showResetConfirm && (
                    <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3">
                      <p className="text-sm font-medium text-destructive">Reset all settings?</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        This clears current preferences and restores built-in defaults.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            void resetSettings.mutateAsync().then((defaults) => {
                              setFormData(defaults);
                              setHasChanges(false);
                              setShowResetConfirm(false);
                              localStorage.removeItem('vcca-theme');
                              localStorage.removeItem('vcca-accent');
                              localStorage.removeItem('vcca-density');
                              localStorage.removeItem('vcca-font-scale');
                              localStorage.removeItem('vcca-font-family');
                            }).catch(() => { /* toast via onError */ });
                          }}
                          disabled={resetSettings.isPending}
                        >
                          Yes, Reset
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setShowResetConfirm(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ── Advanced ────────────────────────────────────── */}
        <TabsContent value="advanced" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bug className="h-5 w-5" />
                  Diagnostics
                </CardTitle>
                <CardDescription>Controls useful for debugging and low-level troubleshooting.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <SettingsField
                  title="Debug logging"
                  description="Enable verbose logging output. Restart required for full effect."
                  control={
                    <Switch
                      id="settings-debug-logging"
                      checked={formData.debug_logging}
                      onCheckedChange={(checked) => handleChange("debug_logging", checked)}
                    />
                  }
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
                <CardDescription>Operational reminders for advanced changes.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="rounded-lg border border-border/50 bg-muted/15 px-4 py-3">
                  Changes to logging may require an app restart before all subsystems pick them up.
                </div>
                <div className="rounded-lg border border-border/50 bg-muted/15 px-4 py-3">
                  Use the Logs tab for live inspection instead of treating this page as a control dump.
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Logs ────────────────────────────────────────── */}
        <TabsContent value="logs" className="space-y-6">
          <LogsContent />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <ExportDataDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
      />
      <ClearDataDialog
        open={showClearDialog}
        onOpenChange={setShowClearDialog}
      />
    </div>
  );
}
