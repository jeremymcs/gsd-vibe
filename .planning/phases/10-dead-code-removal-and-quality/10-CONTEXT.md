# Phase 10: Dead Code Removal and Quality - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Clean the codebase: remove dead Rust commands and their full frontend stacks, audit and remove unused React components/hooks/TypeScript types, fix 4 pre-existing stale test failures, and ship a warning-free build. No new features — this phase is purely cleanup and quality.

</domain>

<decisions>
## Implementation Decisions

### Test Fix Strategy
- Update the tests to match current UI — tests are stale, not the code
- projects.test.tsx: update text from "Import"/"New Project" to match actual button labels ("Add Project")
- main-layout.test.tsx: update from "Dashboard" to match actual nav label ("Home")
- Minimal fix: change text expectations only, preserve existing behavioral assertions (click opens dialog, sidebar collapses, etc.)
- Do NOT rewrite the tests or change their structure

### Dead Rust Command Disposal
- Full stack removal for both `gsd2_detect_version` and `gsd2_get_roadmap_progress`
- Remove: Rust function in gsd2.rs + lib.rs registration + lib/tauri.ts invoke wrapper + any associated query hook in queries.ts
- Leave nothing orphaned — no half-removed stacks
- Also run a full audit: cross-reference every command registered in lib.rs against frontend callers in lib/tauri.ts to catch any other orphaned commands beyond the two known ones

### Dead Code Audit Scope
- Full audit: check every file in src/components/, src/hooks/, and exported types for unused imports and dead exports
- Systematic — not just known suspects from STATE.md
- Disposal policy: delete dead code entirely. No commented-out code, no archive folder. Git history preserves removed code if ever needed.

### Build Quality Bar
- Zero TypeScript errors AND zero warnings (matches ROADMAP.md success criteria exactly)
- Rust backend also must compile warning-free — no unused import warnings, no dead_code warnings after command removal
- Full stack clean: both `pnpm build` and `cargo build` must be warning-free

### Claude's Discretion
- Order of operations within plans (e.g., Rust audit before or after React audit)
- Specific tooling used for dead code detection (tsc --noUnusedLocals, manual grep, etc.)
- Whether to address IDNT-03 (About dialog — pending requirement) if discovered in-scope during audit

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase requirements
- `.planning/REQUIREMENTS.md` §Dead Code — DEAD-01 through DEAD-04 define what must be removed
- `.planning/REQUIREMENTS.md` §Quality — QLTY-01 (test failures), QLTY-02 (clean build)
- `.planning/ROADMAP.md` §Phase 10 — Success criteria, plan breakdown (10-01, 10-02)

### Known dead code (from STATE.md)
- `.planning/STATE.md` §Decisions — documents gsd2_detect_version and gsd2_get_roadmap_progress as known dead code

### Implementation files to audit
- `src-tauri/src/lib.rs` — command registration list (source of truth for registered commands)
- `src-tauri/src/commands/gsd2.rs` — Rust functions for gsd2 commands
- `src/lib/tauri.ts` — invoke wrappers (must match lib.rs registrations)
- `src/lib/queries.ts` — TanStack Query hooks (check for unused hooks after command removal)
- `src/pages/projects.test.tsx` — 2 of 4 failing tests live here
- `src/components/layout/main-layout.test.tsx` — 2 of 4 failing tests live here
- `src/lib/navigation.ts` — current nav labels (tests must match these)

No external specs — requirements are fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/test/test-utils.tsx` — custom render helper; use for any test rewrites
- `pnpm test` — Vitest runner; single run for CI-style verification

### Established Patterns
- Tests mock `@/lib/queries` and `@/lib/tauri` at module level — test fixes should preserve this pattern
- Dead code removal follows "delete entirely" convention per existing codebase (no commented-out blocks observed)
- Rust command removal: always remove from lib.rs handler list AND the function itself (no half-removed stacks)

### Integration Points
- lib.rs `generate_handler![]` macro — removing a command here is the authoritative "unregister" step
- lib/tauri.ts exports — removing an invoke wrapper here breaks any downstream query hook
- queries.ts imports from lib/tauri.ts — cascade: command removed → wrapper removed → hook removed → component updated

### Failing Tests (Scout Findings)
- projects.test.tsx looks for `screen.getAllByText("Import")` and `screen.getAllByText("New Project")` — actual button is "Add Project"
- main-layout.test.tsx looks for `screen.getByText("Dashboard")` — actual nav item `name` is "Home" in navigation.ts
- All 4 failures are text-mismatch only; behavioral logic of the tests is sound

</code_context>

<specifics>
## Specific Ideas

- No specific UI references — this is a cleanup phase
- The "full stack removal" decision means: if gsd2_get_roadmap_progress goes, so does gsd2GetRoadmapProgress in lib/tauri.ts AND any associated query key in query-keys.ts and hook in queries.ts

</specifics>

<deferred>
## Deferred Ideas

- IDNT-03 (About dialog showing correct app name/version) — still pending in REQUIREMENTS.md but not in Phase 10's roadmap requirements. If trivial to add, Claude can include at discretion; otherwise defer to v1.2.
- None raised during discussion — stayed within phase scope.

</deferred>

---

*Phase: 10-dead-code-removal-and-quality*
*Context gathered: 2026-03-21*
