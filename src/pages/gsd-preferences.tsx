// GSD VibeFlow - GSD Preferences Page
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { Settings2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Gsd2PreferencesTab } from '@/components/project/gsd2-preferences-tab';

export function GsdPreferencesPage() {
  return (
    <div className="h-full overflow-auto p-8">
      <PageHeader
        title="GSD Preferences"
        description="Global preferences for GSD workflow — applies to all projects unless overridden"
        icon={<Settings2 className="h-6 w-6 text-muted-foreground" />}
      />
      <Gsd2PreferencesTab projectId="" projectPath="" />
    </div>
  );
}
