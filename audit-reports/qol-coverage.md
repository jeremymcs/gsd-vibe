=== QOL Coverage Audit Report ===
Generated: Tue Mar 31 17:29:42 CDT 2026

Total application views analyzed:      116

## R160: Search/Filter Coverage Analysis

- Potential list/table views:       53
- Views with search/filter:       69
- **Gap: -16 views may need search/filter**

List views without search/filter:
  - src/components/terminal/global-terminals.tsx
  - src/components/project/gsd-validation-plan-tab.tsx
  - src/components/project/activity-feed.tsx
  - src/components/project/tab-group.tsx
  - src/components/project/gsd2-tab-groups.tsx
  - src/components/knowledge/markdown-renderer.tsx
  - src/components/knowledge/knowledge-toc.tsx
  - src/components/theme/theme-provider.tsx
  - src/pages/settings.tsx

## R161: Copy-to-clipboard Coverage Analysis

- Views with copy functionality:       16
- Views displaying IDs/paths:       77
- **Gap: 61 views may need copy buttons**

Views with IDs/paths but no copy functionality:
  - src/contexts/terminal-context.tsx
  - src/components/settings/clear-data-dialog.tsx
  - src/components/settings/export-data-dialog.tsx
  - src/components/layout/main-layout.tsx
  - src/components/layout/breadcrumbs.tsx
  - src/components/layout/keyboard-shortcuts-provider.tsx
  - src/components/projects/plan-preview-cards.tsx
  - src/components/projects/project-card.tsx
  - src/components/projects/import-project-dialog.tsx
  - src/components/projects/project-wizard-dialog.tsx
  - src/components/terminal/interactive-terminal.tsx
  - src/components/terminal/terminal-tabs.tsx
  - src/components/terminal/terminal-page-header.tsx
  - src/components/terminal/auto-command-dialog.tsx
  - src/components/terminal/global-terminals.tsx
  - src/components/terminal/auto-commands-panel.tsx
  - src/components/shared/filter-chips.tsx
  - src/components/shared/project-selector.tsx
  - src/components/project/dependency-alerts-card.tsx
  - src/components/project/gsd2-preferences-tab.tsx
  - src/components/project/gsd2-shared.tsx
  - src/components/project/github-panel.tsx
  - src/components/project/gsd2-session-tab.tsx
  - src/components/project/auto-commands-settings.tsx
  - src/components/project/activity-feed.tsx
  - src/components/project/project-overview-tab.tsx
  - src/components/project/project-terminal-tab.tsx
  - src/components/project/snippet-editor-dialog.tsx
  - src/components/project/command-history-dropdown.tsx
  - src/components/project/gsd-todos-tab.tsx
  - src/components/project/gsd2-chat-tab.tsx
  - src/components/project/gsd2-dashboard-view.tsx
  - src/components/project/gsd2-tasks-tab.tsx
  - src/components/project/codebase-tab.tsx
  - src/components/project/project-header.tsx
  - src/components/project/gsd-debug-tab.tsx
  - src/components/project/tab-group.tsx
  - src/components/project/gsd2-headless-tab.tsx
  - src/components/project/gsd2-roadmap-tab.tsx
  - src/components/project/gsd2-worktrees-tab.tsx
  - src/components/project/knowledge-captures-panel.tsx
  - src/components/project/gsd-verification-tab.tsx
  - src/components/project/knowledge-tab.tsx
  - src/components/project/snippets-panel.tsx
  - src/components/project/gsd2-reports-tab.tsx
  - src/components/project/split-doc-browser.tsx
  - src/components/dashboard/project-row.tsx
  - src/components/dashboard/project-card.tsx
  - src/components/command-palette/command-palette.tsx
  - src/components/knowledge/knowledge-bookmarks.tsx
  - src/components/knowledge/markdown-renderer.tsx
  - src/components/knowledge/knowledge-toc.tsx
  - src/components/knowledge/knowledge-graph-table.tsx
  - src/components/knowledge/knowledge-viewer.tsx
  - src/components/knowledge/knowledge-file-tree.tsx
  - src/components/notifications/notification-panel.tsx
  - src/components/onboarding/first-launch-wizard.tsx
  - src/pages/projects.tsx
  - src/pages/shell.tsx
  - src/pages/todos.tsx
  - src/pages/dashboard.tsx
  - src/pages/logs.tsx
  - src/pages/notifications.tsx
  - src/pages/project.tsx

## R162: Tooltip Coverage Analysis

- Views with tooltips:       16
- Views with icons:       22
- Views with icon buttons:        0
- **Gap: -16 icon button views may need tooltips**

Views with icon buttons but no tooltips:

## R163: Refresh Button Coverage Analysis

- Views with refresh functionality:       15
- Data-fetching views:       26
- **Gap: 11 data views may need refresh buttons**

Data-fetching views without refresh buttons:
  - src/components/shared/loading-states.tsx
  - src/components/project/activity-feed.tsx
  - src/components/project/gsd2-chat-tab.tsx
  - src/components/project/gsd-context-tab.tsx
  - src/components/project/file-browser.tsx
  - src/components/project/gsd2-visualizer-tab.tsx
  - src/components/project/vision-card.tsx
  - src/components/project/knowledge-tab.tsx
  - src/components/dashboard/project-row.tsx
  - src/components/dashboard/project-card.tsx
  - src/components/knowledge/knowledge-graph-table.tsx
  - src/components/knowledge/knowledge-graph.tsx
  - src/components/notifications/notification-bell.tsx
  - src/pages/dashboard.tsx
  - src/pages/logs.tsx

## R164: Confirmation Dialog Coverage Analysis

- Views with confirmation dialogs:       11
- Views with destructive actions:       50
- **Gap: 39 destructive action views may need confirmation**

Views with destructive actions but no confirmation:
  - src/contexts/terminal-context.tsx
  - src/components/settings/secrets-manager.tsx
  - src/components/projects/import-project-dialog.tsx
  - src/components/projects/project-wizard-dialog.tsx
  - src/components/terminal/interactive-terminal.tsx
  - src/components/terminal/terminal-view.tsx
  - src/components/terminal/global-terminals.tsx
  - src/components/terminal/terminal-search-bar.tsx
  - src/components/terminal/auto-commands-panel.tsx
  - src/components/terminal/snippets-panel.tsx
  - src/components/shared/filter-chips.tsx
  - src/components/project/gsd-validation-plan-tab.tsx
  - src/components/project/github-panel.tsx
  - src/components/project/auto-commands-settings.tsx
  - src/components/project/gsd2-command-panels.tsx
  - src/components/project/project-terminal-tab.tsx
  - src/components/project/snippet-editor-dialog.tsx
  - src/components/project/command-history-dropdown.tsx
  - src/components/project/gsd2-chat-tab.tsx
  - src/components/project/gsd2-dashboard-view.tsx
  - src/components/project/gsd2-milestones-tab.tsx
  - src/components/project/gsd2-headless-tab.tsx
  - src/components/project/dependencies-tab.tsx
  - src/components/project/gsd2-roadmap-tab.tsx
  - src/components/project/file-browser.tsx
  - src/components/project/gsd2-status-bar.tsx
  - src/components/project/gsd2-visualizer-tab.tsx
  - src/components/project/snippets-panel.tsx
  - src/components/project/gsd2-slices-tab.tsx
  - src/components/command-palette/command-palette.tsx
  - src/components/knowledge/knowledge-bookmarks.tsx
  - src/components/knowledge/knowledge-search.tsx
  - src/components/knowledge/knowledge-toc.tsx
  - src/components/knowledge/knowledge-graph-table.tsx
  - src/components/theme/theme-provider.tsx
  - src/components/notifications/notification-panel.tsx
  - src/components/onboarding/first-launch-wizard.tsx
  - src/pages/settings.tsx
  - src/pages/projects.tsx
  - src/pages/logs.tsx

## R165: Relative Timestamp Coverage Analysis

- Views with relative timestamps:       13
- Views with time-sensitive data:       29
- **Gap: 16 time-sensitive views may need relative timestamps**

Views with time data but no relative timestamps:
  - src/components/projects/project-wizard-dialog.tsx
  - src/components/terminal/snippets-panel.tsx
  - src/components/project/diagnostics-panels.tsx
  - src/components/project/gsd2-preferences-tab.tsx
  - src/components/project/project-terminal-tab.tsx
  - src/components/project/gsd2-chat-tab.tsx
  - src/components/project/gsd2-dashboard-view.tsx
  - src/components/project/knowledge-captures-panel.tsx
  - src/components/project/file-browser.tsx
  - src/components/project/gsd2-status-bar.tsx
  - src/components/project/knowledge-tab.tsx
  - src/components/project/gsd2-reports-tab.tsx
  - src/components/command-palette/command-palette.tsx
  - src/components/knowledge/knowledge-viewer.tsx
  - src/components/theme/theme-provider.tsx
  - src/components/notifications/notification-bell.tsx
  - src/components/onboarding/first-launch-wizard.tsx
  - src/pages/settings.tsx
  - src/pages/projects.tsx
  - src/pages/logs.tsx
  - src/pages/notifications.tsx


## Shared Component Analysis

### SearchInput Component Coverage:
✅ SearchInput component exists
- Used in        9 files

### FilterChips Component Coverage:
✅ FilterChips component exists
- Used in        2 files

### Copy-to-clipboard Hook Coverage:
✅ use-copy-to-clipboard hook exists
- Used in        8 files

### Tooltip Component Coverage:
- Tooltip imported in       17 files

## Key Component Usage Analysis

### SearchInput Usage:
- Used in        9 files:
  - src/components/shared/search-input.tsx
  - src/components/project/diagnostics-panels.tsx
  - src/components/project/env-vars-tab.tsx
  - src/components/project/gsd2-activity-tab.tsx
  - src/components/project/gsd2-milestones-tab.tsx
  - src/components/project/dependencies-tab.tsx
  - src/components/project/gsd2-worktrees-tab.tsx
  - src/components/project/knowledge-captures-panel.tsx
  - src/components/project/gsd2-reports-tab.tsx

### FilterChips Usage:
- Used in        3 files:
  - src/components/shared/filter-chips.tsx
  - src/components/project/gsd2-activity-tab.tsx
  - src/components/project/gsd2-milestones-tab.tsx

### use-copy-to-clipboard Usage:
- Used in        8 files:
  - src/components/project/env-vars-tab.tsx
  - src/components/project/gsd2-activity-tab.tsx
  - src/components/project/gsd2-milestones-tab.tsx
  - src/components/project/git-status-widget.tsx
  - src/components/project/gsd-milestones-tab.tsx
  - src/components/project/gsd2-visualizer-tab.tsx
  - src/components/project/gsd2-slices-tab.tsx
  - src/components/knowledge/code-block.tsx


## Main Page QOL Analysis

### dashboard.tsx:
- Search/Filter: ✅
- Copy-to-clipboard: ❌
- Tooltips: ❌
- Refresh: ❌
- Confirmation: ❌
- Relative Time: ✅

### gsd-preferences.tsx:
- Search/Filter: ❌
- Copy-to-clipboard: ❌
- Tooltips: ❌
- Refresh: ❌
- Confirmation: ❌
- Relative Time: ❌

### logs.tsx:
- Search/Filter: ✅
- Copy-to-clipboard: ❌
- Tooltips: ❌
- Refresh: ❌
- Confirmation: ❌
- Relative Time: ✅

### notifications.tsx:
- Search/Filter: ✅
- Copy-to-clipboard: ❌
- Tooltips: ✅
- Refresh: ❌
- Confirmation: ✅
- Relative Time: ✅

### project.tsx:
- Search/Filter: ✅
- Copy-to-clipboard: ❌
- Tooltips: ❌
- Refresh: ❌
- Confirmation: ✅
- Relative Time: ❌

### projects.tsx:
- Search/Filter: ✅
- Copy-to-clipboard: ❌
- Tooltips: ❌
- Refresh: ❌
- Confirmation: ❌
- Relative Time: ✅

### settings.tsx:
- Search/Filter: ❌
- Copy-to-clipboard: ❌
- Tooltips: ❌
- Refresh: ❌
- Confirmation: ❌
- Relative Time: ❌

### shell.tsx:
- Search/Filter: ❌
- Copy-to-clipboard: ❌
- Tooltips: ❌
- Refresh: ❌
- Confirmation: ❌
- Relative Time: ✅

### todos.tsx:
- Search/Filter: ✅
- Copy-to-clipboard: ❌
- Tooltips: ❌
- Refresh: ❌
- Confirmation: ❌
- Relative Time: ❌

## Project Components QOL Analysis

Total project components:       61

### activity-feed.tsx:
- Search: ❌, Copy: ❌, Tooltip: ❌, Refresh: ❌
### auto-commands-settings.tsx:
- Search: ✅, Copy: ❌, Tooltip: ❌, Refresh: ❌
### codebase-health-card.tsx:
- Search: ✅, Copy: ❌, Tooltip: ❌, Refresh: ❌
### codebase-tab.tsx:
- Search: ✅, Copy: ❌, Tooltip: ❌, Refresh: ❌
### command-history-dropdown.tsx:
- Search: ❌, Copy: ❌, Tooltip: ❌, Refresh: ❌
### dependencies-tab.tsx:
- Search: ✅, Copy: ✅, Tooltip: ✅, Refresh: ✅
### dependency-alerts-card.tsx:
- Search: ✅, Copy: ❌, Tooltip: ❌, Refresh: ✅
### diagnostics-panels.tsx:
- Search: ✅, Copy: ✅, Tooltip: ✅, Refresh: ✅
### env-vars-tab.tsx:
- Search: ✅, Copy: ✅, Tooltip: ✅, Refresh: ❌
### file-browser.tsx:
- Search: ✅, Copy: ✅, Tooltip: ✅, Refresh: ❌
### git-status-widget.tsx:
- Search: ✅, Copy: ✅, Tooltip: ✅, Refresh: ❌
### git-view.tsx:
- Search: ❌, Copy: ❌, Tooltip: ❌, Refresh: ❌
### github-panel.tsx:
- Search: ✅, Copy: ❌, Tooltip: ✅, Refresh: ❌
### gsd-context-tab.tsx:
- Search: ❌, Copy: ❌, Tooltip: ❌, Refresh: ❌
### gsd-debug-tab.tsx:
- Search: ✅, Copy: ❌, Tooltip: ❌, Refresh: ❌
### gsd-milestones-tab.tsx:
- Search: ✅, Copy: ✅, Tooltip: ❌, Refresh: ❌
### gsd-plans-tab.tsx:
- Search: ✅, Copy: ❌, Tooltip: ❌, Refresh: ❌
### gsd-todos-tab.tsx:
- Search: ✅, Copy: ❌, Tooltip: ❌, Refresh: ❌
### gsd-uat-tab.tsx:
- Search: ✅, Copy: ❌, Tooltip: ❌, Refresh: ❌
### gsd-validation-plan-tab.tsx:
- Search: ❌, Copy: ✅, Tooltip: ❌, Refresh: ❌
### gsd-verification-tab.tsx:
- Search: ✅, Copy: ❌, Tooltip: ❌, Refresh: ❌
### gsd2-activity-tab.tsx:
- Search: ✅, Copy: ✅, Tooltip: ❌, Refresh: ❌
### gsd2-chat-tab.tsx:
- Search: ✅, Copy: ❌, Tooltip: ❌, Refresh: ❌
### gsd2-command-panels.tsx:
- Search: ✅, Copy: ✅, Tooltip: ❌, Refresh: ❌
### gsd2-dashboard-view.tsx:
- Search: ✅, Copy: ❌, Tooltip: ❌, Refresh: ❌
### gsd2-dual-terminal-tab.tsx:
- Search: ❌, Copy: ❌, Tooltip: ❌, Refresh: ❌
### gsd2-files-tab.tsx:
- Search: ❌, Copy: ❌, Tooltip: ❌, Refresh: ❌
### gsd2-headless-tab.tsx:
- Search: ✅, Copy: ❌, Tooltip: ❌, Refresh: ❌
### gsd2-health-tab.tsx:
- Search: ❌, Copy: ❌, Tooltip: ❌, Refresh: ❌
### gsd2-milestones-tab.tsx:
- Search: ✅, Copy: ✅, Tooltip: ❌, Refresh: ❌
### gsd2-preferences-tab.tsx:
- Search: ✅, Copy: ❌, Tooltip: ❌, Refresh: ❌
### gsd2-reports-tab.tsx:
- Search: ✅, Copy: ❌, Tooltip: ❌, Refresh: ❌
### gsd2-roadmap-tab.tsx:
- Search: ✅, Copy: ❌, Tooltip: ❌, Refresh: ❌
### gsd2-session-tab.tsx:
- Search: ✅, Copy: ❌, Tooltip: ✅, Refresh: ❌
### gsd2-sessions-tab.tsx:
- Search: ✅, Copy: ✅, Tooltip: ✅, Refresh: ❌
### gsd2-shared.tsx:
- Search: ✅, Copy: ❌, Tooltip: ❌, Refresh: ❌
### gsd2-slices-tab.tsx:
- Search: ✅, Copy: ✅, Tooltip: ❌, Refresh: ❌
### gsd2-status-bar.tsx:
- Search: ❌, Copy: ❌, Tooltip: ❌, Refresh: ❌
### gsd2-tab-groups.tsx:
- Search: ❌, Copy: ❌, Tooltip: ❌, Refresh: ❌
### gsd2-tasks-tab.tsx:
- Search: ✅, Copy: ❌, Tooltip: ❌, Refresh: ❌
### gsd2-visualizer-tab.tsx:
- Search: ✅, Copy: ✅, Tooltip: ❌, Refresh: ❌
### gsd2-worktrees-tab.tsx:
- Search: ✅, Copy: ❌, Tooltip: ❌, Refresh: ❌
### guided-project-view.tsx:
- Search: ❌, Copy: ❌, Tooltip: ❌, Refresh: ❌
### knowledge-captures-panel.tsx:
- Search: ✅, Copy: ❌, Tooltip: ❌, Refresh: ✅
### knowledge-tab.tsx:
- Search: ✅, Copy: ❌, Tooltip: ❌, Refresh: ❌
### project-header.tsx:
- Search: ❌, Copy: ❌, Tooltip: ✅, Refresh: ❌
### project-overview-tab.tsx:
- Search: ✅, Copy: ❌, Tooltip: ❌, Refresh: ❌
### project-terminal-tab.tsx:
- Search: ✅, Copy: ❌, Tooltip: ❌, Refresh: ❌
### quick-actions-bar.tsx:
- Search: ❌, Copy: ❌, Tooltip: ✅, Refresh: ❌
### requirements-card.tsx:
- Search: ❌, Copy: ❌, Tooltip: ❌, Refresh: ❌
### roadmap-progress-card.tsx:
- Search: ❌, Copy: ❌, Tooltip: ❌, Refresh: ❌
### snippet-editor-dialog.tsx:
- Search: ❌, Copy: ❌, Tooltip: ❌, Refresh: ❌
### snippets-panel.tsx:
- Search: ❌, Copy: ❌, Tooltip: ❌, Refresh: ❌
### split-doc-browser.tsx:
- Search: ✅, Copy: ❌, Tooltip: ❌, Refresh: ❌
### tab-group.tsx:
- Search: ❌, Copy: ❌, Tooltip: ❌, Refresh: ❌
### unified-landing-view.tsx:
- Search: ❌, Copy: ❌, Tooltip: ❌, Refresh: ❌
### vision-card.tsx:
- Search: ❌, Copy: ❌, Tooltip: ❌, Refresh: ❌

## R166: Build and Test Integrity Check

✅ Build: PASS

✅ Tests: PASS (2 tests)


## Final Audit Summary

### Overall QOL Infrastructure Status:
✅ **Strong Foundation**: Core QOL components (SearchInput, FilterChips, use-copy-to-clipboard) are well-implemented
✅ **Build Integrity**: Current build passes with no TypeScript errors  
⚠️  **Test Coverage**: Only 2 tests currently passing (below R166 requirement of 218+)

### Key Findings:

1. **R160 (Search/Filter)**: Good coverage with SearchInput used in 9 files, FilterChips in 3 files
2. **R161 (Copy-to-clipboard)**: Significant gap - copy hook used in only 8 files vs. 77+ files with IDs/paths  
3. **R162 (Tooltips)**: Moderate usage (16 files) but needs manual icon button audit
4. **R163 (Refresh)**: Moderate gap - 15 files have refresh vs. 26 data-fetching views
5. **R164 (Confirmation)**: Major gap - 11 files have confirmation vs. 50+ with destructive actions
6. **R165 (Relative Time)**: Moderate gap - 13 files use relative time vs. 29+ with timestamps
7. **R166 (Build/Test)**: Build passes ✅ but test count critical issue ❌

### Critical Actions Required:

**IMMEDIATE**: 
- Address test count shortfall (2 vs. 218+ required)
- Manual audit of icon buttons for tooltip gaps
- Systematic copy button addition to ID/path displays

**HIGH PRIORITY**:
- Add confirmation dialogs to destructive actions  
- Implement refresh buttons on data views without auto-polling
- Add relative timestamps to time-sensitive displays

**RECOMMENDATION**: 
Proceed to T02 for manual tooltip audit and targeted gap fixes, then T03 for comprehensive testing verification.

### Files Ready for Gap Analysis:
All audit data captured in:
- `audit-reports/qol-coverage.md` (this file)
- `audit-reports/requirement-evidence.md` (detailed evidence)

