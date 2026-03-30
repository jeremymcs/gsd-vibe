// GSD VibeFlow - GSD Preferences Page
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Settings } from 'lucide-react';
import { Gsd2PreferencesTab } from '@/components/project/gsd2-preferences-tab';

export function GsdPreferencesPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Page header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-md bg-muted">
            <Settings className="h-5 w-5 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">GSD Preferences</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* GSD Preferences Tab requires projectId and projectPath, but this is a global page.
            Since preferences are global (not project-specific), we pass placeholder IDs. */}
        <Gsd2PreferencesTab projectId="" projectPath="" />
      </div>
    </div>
  );
}
