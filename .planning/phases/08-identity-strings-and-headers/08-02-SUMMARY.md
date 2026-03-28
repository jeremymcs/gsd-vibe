---
phase: 08-identity-strings-and-headers
plan: 02
subsystem: branding
tags: [rebrand, strings, ui, documentation, website]
dependency_graph:
  requires: [08-01]
  provides: [user-visible-strings, documentation-rebrand, website-rebrand]
  affects: [main-layout, settings, project-pages, test-assertions, website]
tech_stack:
  added: []
  patterns: [string-replacement]
key_files:
  created: []
  modified:
    - index.html
    - src/components/layout/main-layout.tsx
    - src/components/settings/theme-customization.tsx
    - src/components/settings/export-data-dialog.tsx
    - src/components/projects/import-project-dialog.tsx
    - src/pages/settings.tsx
    - src/pages/project.tsx
    - src/pages/projects.test.tsx
    - src/styles/globals.css
    - src-tauri/src/commands/pty.rs
    - src-tauri/src/pty/mod.rs
    - src-tauri/src/commands/git.rs
    - README.md
    - CLAUDE.md
    - website/index.html
decisions:
  - "Hero H1 on website updated from 'Track Your' / 'Shit.' to 'GSD' / 'VibeFlow.' adjusting two-line layout"
  - "CTA heading updated from 'Ready to track your shit?' to 'Ready to get shit done?' for brand alignment"
  - "Pre-existing test failures (Dashboard, Import, New Project text lookups) confirmed out-of-scope; not caused by this plan's changes"
metrics:
  duration: "9 minutes"
  completed_date: "2026-03-21"
  tasks_completed: 2
  files_modified: 15
---

# Phase 08 Plan 02: Identity Strings and Headers Summary

Replace all user-facing "Track Your Shit" strings with "GSD VibeFlow" across UI components, test files, Rust doc comments, documentation, root HTML, and the marketing website.

## What Was Built

All 15 files listed in the plan were updated. After both tasks, a grep for "Track Your Shit" across all source, doc, and HTML files returns zero non-header results — only line-1 file headers remain (deferred to plan 08-03).

## Tasks Completed

### Task 1: Replace all UI strings, page title, and Rust doc comments (commit: c2b319d)

Updated 12 files:
- `index.html` page title: `<title>GSD VibeFlow</title>`
- `src/components/layout/main-layout.tsx` sidebar header text
- `src/components/settings/theme-customization.tsx` CardDescription
- `src/components/settings/export-data-dialog.tsx` export description
- `src/components/projects/import-project-dialog.tsx` importing status string
- `src/pages/settings.tsx` page description and start-on-login text (2 locations)
- `src/pages/project.tsx` remove-project confirmation dialog
- `src/pages/projects.test.tsx` mock project name and assertion text
- `src/styles/globals.css` brand color comments (light and dark sections)
- `src-tauri/src/commands/pty.rs` doc comment
- `src-tauri/src/pty/mod.rs` two doc comments
- `src-tauri/src/commands/git.rs` git stash message string

### Task 2: Update README.md, CLAUDE.md, and website/index.html (commit: 4b78f4f)

Updated 3 files:
- `README.md`: title `# GSD VibeFlow`, header comment updated; zero remaining legacy name references
- `CLAUDE.md`: project overview and file header convention example updated; `track-your-shit.db` filename preserved
- `website/index.html`: all 9 occurrences replaced — comment, `<title>`, OG title, nav brand, hero h1 (two-line), dashboard alt text, body text, project-detail alt text, features section, CTA heading, footer copyright

## Verification

```
grep -rn "Track Your Shit" src/ src-tauri/src/ README.md CLAUDE.md index.html website/index.html \
  --include="*.tsx" --include="*.ts" --include="*.css" --include="*.rs" --include="*.md" --include="*.html" \
  | grep -v "^.*:1:"
```
Returns zero lines. Only line-1 file headers remain across all files.

Build: `pnpm build` exits 0 (chunk size warnings are pre-existing).

Tests: `pnpm test` shows 128 passing. 4 pre-existing failures in `main-layout.test.tsx` and `projects.test.tsx` (failing on "Dashboard", "Import", "New Project" text lookups) confirmed to pre-date this plan.

## Deviations from Plan

### Out-of-Scope Discoveries

The website/index.html `<title>` tag (line 8) already contained a partial update: `Track Your Shit - The Official GSD VibeFlow Desktop App`. Both halves of the title were updated to produce the clean `GSD VibeFlow - The Official Desktop App`. This was handled inline per Rule 1.

No architectural changes required. Plan executed as specified.

## Self-Check: PASSED
