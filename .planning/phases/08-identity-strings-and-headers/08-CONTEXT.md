# Phase 8: Identity, Strings, and Headers - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Rename the app from "Track Your Shit" to "GSD Vibe" everywhere: metadata files, user-facing UI strings, and all source file headers. No visual identity changes (those are Phase 9). No new features or UI components.

After this phase, a codebase-wide search for "Track Your Shit" returns zero results across all committed files.

</domain>

<decisions>
## Implementation Decisions

### Bundle Identifier
- New bundle identifier: `io.gsd.vibeflow`
- Update in: `tauri.conf.json` (identifier field), and any other location where it appears
- Old value: `net.fluxlabs.track-your-shit`

### About Dialog
- **Skip for Phase 8** — no About dialog currently exists (no React component, no native menu config)
- IDNT-01 and IDNT-02 cover window title and metadata rename; IDNT-03 (About dialog) is deferred
- Window title (`tauri.conf.json` title) and sidebar header (`main-layout.tsx:105`) are the rename targets

### Test Files
- **Full treatment**: update file headers AND replace all string references in test files
- Test files (`.test.tsx`, `.test.ts`, `test-utils.tsx`, `setup.ts`) get the same header update and string replacement as production files
- Goal: zero occurrences of "Track Your Shit" anywhere in the committed codebase

### Metadata Files
- `tauri.conf.json`: productName, identifier, window title
- `package.json`: name, description fields
- `Cargo.toml`: package name
- `capabilities/default.json`: identifier references (also contains old name)
- `target/` directory: excluded — generated, not committed

### Source File Headers
- Pattern to replace: `// Track Your Shit - [purpose]`
- New pattern: `// GSD Vibe - [purpose]`
- Copyright line stays the same: `// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>`
- Scope: all `.rs` files (28 files) and all `.ts`/`.tsx` files (149 files)

### UI Strings
- Replace all hardcoded "Track Your Shit" in user-facing strings across components and pages
- Known locations: theme-customization.tsx, export-data-dialog.tsx, main-layout.tsx, import-project-dialog.tsx, settings.tsx, project.tsx
- README.md and CLAUDE.md: replace name references (keep technical instructions intact — just update the app name)

### Claude's Discretion
- Order of operations within each plan (which files to touch first)
- Whether to use a script or manual search-and-replace for bulk header updates
- Exact wording of description fields in package.json / Cargo.toml (keep existing spirit, update name)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — Full requirement list: IDNT-01 through IDNT-04, STRN-01 through STRN-04, HDRS-01 through HDRS-02 with acceptance criteria

### Phase Plans (pre-defined in roadmap)
- `.planning/ROADMAP.md` §Phase 8 — Three pre-defined plans:
  - 08-01: Metadata files (tauri.conf.json, package.json, Cargo.toml, bundle identifier)
  - 08-02: UI strings, page titles, README.md, CLAUDE.md
  - 08-03: Bulk-update all .rs and .ts/.tsx source file headers

No external design docs or ADRs — requirements are fully captured in decisions above and REQUIREMENTS.md.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- No new components being built — pure rename/replace task

### Established Patterns
- File headers follow `// Track Your Shit - [File Purpose]` pattern (CLAUDE.md convention)
- Bundle identifier in `tauri.conf.json` at `identifier` field — single source of truth for Tauri
- `capabilities/default.json` references the identifier separately and must also be updated

### Integration Points
- `tauri.conf.json` `productName` → drives macOS app bundle name and window title
- `main-layout.tsx:105` → sidebar app name (user-visible string, not a header)
- `projects.test.tsx:49,153` → test assertions referencing old name (full treatment)
- `src/test/test-utils.tsx`, `src/test/setup.ts` → test support files also need headers

</code_context>

<specifics>
## Specific Ideas

- Bundle ID chosen as `io.gsd.vibeflow` (not `net.fluxlabs.gsd-vibeflow`, not `com.gsd-vibeflow`) — cleaner product branding
- About dialog is deferred — do not create a new UI component in this phase

</specifics>

<deferred>
## Deferred Ideas

- About dialog (IDNT-03) — requires creating a new UI component or enabling Tauri native menu. Deferred past Phase 8; note for a future phase or addressed as part of Phase 9 visual identity work.

</deferred>

---

*Phase: 08-identity-strings-and-headers*
*Context gathered: 2026-03-21*
