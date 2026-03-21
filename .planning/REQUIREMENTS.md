# Requirements: GSD VibeFlow

**Defined:** 2026-03-21
**Milestone:** v1.1 GSD VibeFlow Rebrand
**Core Value:** Per-project version detection drives everything — correctly identify .gsd/ vs .planning/ and render the right data and terminology for each project.

## v1.1 Requirements

### Identity

- [x] **IDNT-01**: App name updated to "GSD VibeFlow" in tauri.conf.json, package.json, and Cargo.toml
- [x] **IDNT-02**: Window title displays "GSD VibeFlow" instead of "Track Your Shit"
- [ ] **IDNT-03**: About dialog shows correct app name, version, and copyright for GSD VibeFlow
- [x] **IDNT-04**: Bundle identifier updated to com.gsd-vibeflow (or equivalent)

### Strings

- [ ] **STRN-01**: All hardcoded "Track Your Shit" string literals in TSX/TS files replaced with "GSD VibeFlow"
- [ ] **STRN-02**: Page titles and document.title references updated to GSD VibeFlow
- [ ] **STRN-03**: User-facing error messages and toast strings referencing old name updated
- [ ] **STRN-04**: README.md and CLAUDE.md updated to reflect GSD VibeFlow name and description

### Visual

- [ ] **VISL-01**: Color palette migrated to gsd.build brand (black background, white text, cyan accent)
- [ ] **VISL-02**: New app icon created and applied for all target sizes (macOS, Windows, Linux)
- [ ] **VISL-03**: Splash/loading screen updated with GSD VibeFlow branding (if splash exists)
- [ ] **VISL-04**: CSS design token names updated to remove old brand references

### Headers

- [ ] **HDRS-01**: All .rs source file headers updated from "Track Your Shit" to "GSD VibeFlow"
- [ ] **HDRS-02**: All .ts/.tsx source file headers updated from "Track Your Shit" to "GSD VibeFlow"

### Dead Code

- [ ] **DEAD-01**: Unused Rust commands identified and removed from gsd2.rs / gsd.rs / lib.rs
- [ ] **DEAD-02**: Unused React components identified and removed from src/components/
- [ ] **DEAD-03**: Unused hooks and TypeScript types/interfaces identified and removed
- [ ] **DEAD-04**: Orphaned files (no imports, no references) identified and removed

### Quality

- [ ] **QLTY-01**: Pre-existing 4 test failures in projects.test.tsx and main-layout.test.tsx fixed
- [ ] **QLTY-02**: Build passes with no TypeScript errors after all changes

## Future Requirements

*(None identified for v1.2+ at this time)*

## Out of Scope

| Feature | Reason |
|---------|--------|
| New feature development | v1.1 is rebrand + cleanup only — no new capabilities |
| GSD-2 LLM orchestration | TYS monitors/controls; does not replace the gsd CLI |
| Migration tooling (.planning/ → .gsd/) | Not a TYS responsibility |
| VS Code extension features | Separate product |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| IDNT-01 | Phase 8 | Complete |
| IDNT-02 | Phase 8 | Complete |
| IDNT-03 | Phase 8 | Pending |
| IDNT-04 | Phase 8 | Complete |
| STRN-01 | Phase 8 | Pending |
| STRN-02 | Phase 8 | Pending |
| STRN-03 | Phase 8 | Pending |
| STRN-04 | Phase 8 | Pending |
| HDRS-01 | Phase 8 | Pending |
| HDRS-02 | Phase 8 | Pending |
| VISL-01 | Phase 9 | Pending |
| VISL-02 | Phase 9 | Pending |
| VISL-03 | Phase 9 | Pending |
| VISL-04 | Phase 9 | Pending |
| DEAD-01 | Phase 10 | Pending |
| DEAD-02 | Phase 10 | Pending |
| DEAD-03 | Phase 10 | Pending |
| DEAD-04 | Phase 10 | Pending |
| QLTY-01 | Phase 10 | Pending |
| QLTY-02 | Phase 10 | Pending |

**Coverage:**
- v1.1 requirements: 20 total
- Mapped to phases: 20 (Phase 8: 10, Phase 9: 4, Phase 10: 6)
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-21*
*Last updated: 2026-03-21 — traceability populated after roadmap creation*
