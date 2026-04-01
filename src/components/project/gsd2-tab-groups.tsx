// VCCA - GSD-2 Tab Group Views
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
//
// Five tab-group containers that each embed multiple related views as sub-tabs.
// Reduces the sidebar from ~26 items to ~14 without losing any functionality.

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// Sub-view components
import { Gsd2VisualizerTab } from './gsd2-visualizer-tab';
import { Gsd2DashboardView } from './gsd2-dashboard-view';
import { Gsd2RoadmapTab } from './gsd2-roadmap-tab';
import { Gsd2ActivityTab } from './gsd2-activity-tab';
import { Gsd2MilestonesTab } from './gsd2-milestones-tab';
import { Gsd2SlicesTab } from './gsd2-slices-tab';
import { Gsd2TasksTab } from './gsd2-tasks-tab';
import { Gsd2HistoryPanel, Gsd2ExportPanel, } from './gsd2-command-panels';
import { Gsd2ReportsTab } from './gsd2-reports-tab';
import {
  Gsd2InspectPanel,
  Gsd2SteerPanel,
  Gsd2HooksPanel,
  Gsd2UndoPanel,
  Gsd2GitPanel,
  Gsd2RecoveryPanel,
} from './gsd2-command-panels';
import { DoctorPanel, ForensicsPanel, SkillHealthPanel } from './diagnostics-panels';
import { KnowledgeCapturesPanel } from './knowledge-captures-panel';
import { Gsd2FilesTab } from './gsd2-files-tab';

interface GroupProps {
  projectId: string;
  projectPath: string;
}

// ─── Shared tab chrome ────────────────────────────────────────────────────────

function GroupShell({
  tabs,
  defaultTab,
  children,
}: {
  tabs: { value: string; label: string }[];
  defaultTab: string;
  children: (activeTab: string) => React.ReactNode;
}) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full flex-col">
        <TabsList className="h-10 shrink-0 rounded-none border-b border-border/50 bg-transparent justify-start gap-2 px-3">
          {tabs.map((t) => (
            <TabsTrigger
              key={t.value}
              value={t.value}
              className="h-8 rounded-md px-3 text-sm font-medium data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground/70"
            >
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((t) => (
          <TabsContent key={t.value} value={t.value} className="flex-1 overflow-hidden mt-0 data-[state=inactive]:hidden">
            <div className="h-full overflow-auto p-4">
              {children(t.value)}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

// ─── 1. Progress Group: Visualizer | Dashboard | Roadmap | Activity ───────────

export function Gsd2ProgressGroup({ projectId, projectPath }: GroupProps) {
  const tabs = [
    { value: 'visualizer', label: 'Visualizer' },
    { value: 'dashboard',  label: 'Summary'    },
    { value: 'roadmap',    label: 'Roadmap'    },
    { value: 'activity',   label: 'Activity'   },
  ];

  return (
    <GroupShell tabs={tabs} defaultTab="visualizer">
      {(tab) => {
        if (tab === 'visualizer') return <Gsd2VisualizerTab projectId={projectId} projectPath={projectPath} />;
        if (tab === 'dashboard')  return <Gsd2DashboardView projectId={projectId} projectPath={projectPath} />;
        if (tab === 'roadmap')    return <Gsd2RoadmapTab    projectId={projectId} projectPath={projectPath} />;
        if (tab === 'activity')   return <Gsd2ActivityTab   projectId={projectId} projectPath={projectPath} />;
        return null;
      }}
    </GroupShell>
  );
}

// ─── 2. Planning Group: Milestones | Slices | Tasks ──────────────────────────

export function Gsd2PlanningGroup({ projectId, projectPath }: GroupProps) {
  const tabs = [
    { value: 'milestones', label: 'Milestones' },
    { value: 'slices',     label: 'Slices'     },
    { value: 'tasks',      label: 'Tasks'      },
  ];

  return (
    <GroupShell tabs={tabs} defaultTab="milestones">
      {(tab) => {
        if (tab === 'milestones') return <Gsd2MilestonesTab projectId={projectId} projectPath={projectPath} />;
        if (tab === 'slices')     return <Gsd2SlicesTab     projectId={projectId} projectPath={projectPath} />;
        if (tab === 'tasks')      return <Gsd2TasksTab      projectId={projectId} projectPath={projectPath} />;
        return null;
      }}
    </GroupShell>
  );
}

// ─── 3. Metrics Group: History | Export | Reports ────────────────────────────

export function Gsd2MetricsGroup({ projectId, projectPath }: GroupProps) {
  const tabs = [
    { value: 'history', label: 'History' },
    { value: 'export',  label: 'Export'  },
    { value: 'reports', label: 'Reports' },
  ];

  return (
    <GroupShell tabs={tabs} defaultTab="history">
      {(tab) => {
        if (tab === 'history') return <Gsd2HistoryPanel projectId={projectId} projectPath={projectPath} />;
        if (tab === 'export')  return <Gsd2ExportPanel  projectId={projectId} projectPath={projectPath} />;
        if (tab === 'reports') return <Gsd2ReportsTab   projectId={projectId} projectPath={projectPath} />;
        return null;
      }}
    </GroupShell>
  );
}

// ─── 4. Commands Group: Inspect | Steer | Hooks | Undo | Git | Recovery ───────

export function Gsd2CommandsGroup({ projectId, projectPath }: GroupProps) {
  const tabs = [
    { value: 'inspect',  label: 'Inspect'  },
    { value: 'steer',    label: 'Steer'    },
    { value: 'hooks',    label: 'Hooks'    },
    { value: 'undo',     label: 'Undo'     },
    { value: 'git',      label: 'Git'      },
    { value: 'recovery', label: 'Recovery' },
  ];

  return (
    <GroupShell tabs={tabs} defaultTab="inspect">
      {(tab) => {
        if (tab === 'inspect')  return <Gsd2InspectPanel  projectId={projectId} projectPath={projectPath} />;
        if (tab === 'steer')    return <Gsd2SteerPanel    projectId={projectId} projectPath={projectPath} />;
        if (tab === 'hooks')    return <Gsd2HooksPanel    projectId={projectId} projectPath={projectPath} />;
        if (tab === 'undo')     return <Gsd2UndoPanel     projectId={projectId} projectPath={projectPath} />;
        if (tab === 'git')      return <Gsd2GitPanel      projectId={projectId} projectPath={projectPath} />;
        if (tab === 'recovery') return <Gsd2RecoveryPanel projectId={projectId} projectPath={projectPath} />;
        return null;
      }}
    </GroupShell>
  );
}

// ─── 5. Files Group: Files only (Split Terminal lives in Shell) ──────────────

export function Gsd2FilesTerminalGroup({ projectId, projectPath }: GroupProps) {
  // Single view — no tab bar needed, but keep the component name for sidebar wiring
  return <Gsd2FilesTab projectId={projectId} projectPath={projectPath} />;
}

// ─── 6. Diagnostics Group: Doctor | Forensics | Skill Health | Knowledge ─────

export function Gsd2DiagnosticsGroup({ projectId, projectPath }: GroupProps) {
  const tabs = [
    { value: 'doctor',    label: 'Doctor'      },
    { value: 'forensics', label: 'Forensics'   },
    { value: 'skills',    label: 'Skills'      },
    { value: 'knowledge', label: 'Knowledge'   },
  ];

  return (
    <GroupShell tabs={tabs} defaultTab="doctor">
      {(tab) => {
        if (tab === 'doctor')    return <DoctorPanel          projectId={projectId} projectPath={projectPath} />;
        if (tab === 'forensics') return <ForensicsPanel       projectId={projectId} projectPath={projectPath} />;
        if (tab === 'skills')    return <SkillHealthPanel     projectId={projectId} projectPath={projectPath} />;
        if (tab === 'knowledge') return <KnowledgeCapturesPanel projectId={projectId} projectPath={projectPath} />;
        return null;
      }}
    </GroupShell>
  );
}
