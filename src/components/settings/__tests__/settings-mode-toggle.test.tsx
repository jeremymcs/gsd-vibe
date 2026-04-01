// VCCA - Settings Mode Toggle Tests
// Verifies interface mode persists immediately without save button interaction
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "@/test/test-utils";
import { SettingsPage } from "@/pages/settings";
import type { Settings } from "@/lib/tauri";
import { useSettings, useUpdateSettings, useResetSettings, useImportSettings } from "@/lib/queries";

const mockMutateAsync = vi.fn();
const mockSetTheme = vi.fn();

vi.mock("@/lib/queries", () => ({
  useSettings: vi.fn(),
  useUpdateSettings: vi.fn(),
  useResetSettings: vi.fn(),
  useImportSettings: vi.fn(),
}));

vi.mock("@/hooks/use-theme", () => ({
  useTheme: () => ({ theme: "system", setTheme: mockSetTheme }),
}));

vi.mock("@/components/settings", () => ({
  ExportDataDialog: () => null,
  ClearDataDialog: () => null,
  ThemeCustomization: () => <div>Theme Customization</div>,
  SecretsManager: () => <div>Secrets Manager</div>,
}));

vi.mock("@/components/layout/page-header", () => ({
  PageHeader: ({ title, actions }: { title: string; actions?: ReactNode }) => (
    <div>
      <h1>{title}</h1>
      {actions}
    </div>
  ),
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, children }: { value: string; onValueChange: (value: string) => void; children: ReactNode }) => (
    <select
      aria-label="settings-select"
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

const baseSettings: Settings = {
  theme: "system",
  start_on_login: false,
  default_cost_limit: 25,
  notifications_enabled: true,
  notify_on_complete: true,
  notify_on_error: true,
  notify_cost_threshold: null,
  accent_color: "blue",
  ui_density: "comfortable",
  font_size_scale: "100",
  font_family: "inter",
  auto_open_last_project: false,
  window_state: "normal",
  notify_on_phase_complete: true,
  notify_on_cost_warning: true,
  debug_logging: false,
  use_tmux: true,
  user_mode: "guided",
};

describe("SettingsPage mode toggle", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (useSettings as Mock).mockReturnValue({
      data: baseSettings,
      isLoading: false,
    });

    (useUpdateSettings as Mock).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });

    (useResetSettings as Mock).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    (useImportSettings as Mock).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    mockMutateAsync.mockResolvedValue({ ...baseSettings, user_mode: "expert" });
  });

  it("persists interface mode immediately when selection changes", async () => {
    const user = userEvent.setup();

    render(<SettingsPage />);

    const modeSelect = screen.getAllByRole("combobox")[0];
    await user.selectOptions(modeSelect, "expert");

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        ...baseSettings,
        user_mode: "expert",
      });
    });

    expect(screen.queryByRole("button", { name: /save changes/i })).not.toBeInTheDocument();
  });
});
