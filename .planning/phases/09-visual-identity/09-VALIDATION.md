---
phase: 9
slug: visual-identity
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + React Testing Library |
| **Config file** | `vite.config.ts` |
| **Quick run command** | `pnpm build` (TypeScript + Vite — primary gate for token renames) |
| **Full suite command** | `pnpm test --run` |
| **Estimated runtime** | ~30 seconds (build), ~60 seconds (test suite) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm build` — zero TypeScript errors required
- **After every plan wave:** Run `pnpm test --run`
- **Before `/gsd:verify-work`:** Full `pnpm test --run` must be green + `pnpm build` green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 1 | VISL-01 | build | `pnpm build` | ✅ | ⬜ pending |
| 09-01-02 | 01 | 1 | VISL-04 | build + grep | `pnpm build && grep -rn "brand-blue\|brand-purple\|brand-yellow" src/ --include="*.tsx" --include="*.ts" --include="*.css"` (expects 0 results) | ✅ | ⬜ pending |
| 09-01-03 | 01 | 1 | VISL-01 | build | `pnpm build` | ✅ | ⬜ pending |
| 09-02-01 | 02 | 2 | VISL-02 | file check | `ls src-tauri/icons/32x32.png src-tauri/icons/128x128.png src-tauri/icons/128x128@2x.png src-tauri/icons/icon.icns src-tauri/icons/icon.ico src-tauri/icons/icon.png src-tauri/icons/icon.svg` | ✅ | ⬜ pending |
| 09-02-02 | 02 | 2 | VISL-03 | grep | `grep -n "backgroundColor" src-tauri/tauri.conf.json` (expects `"#000000"`) | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

None — existing test infrastructure covers all phase requirements. No new test files needed.

The pre-existing 4 test failures in `projects.test.tsx` and `main-layout.test.tsx` are unrelated to this phase (confirmed in Phase 8 STATE.md) and are deferred to Phase 10.

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| App renders black background, white text, cyan accents | VISL-01 | CSS visual — not testable with Vitest | Run `pnpm tauri dev`, visually verify palette matches gsd.build |
| App icon displays correctly at all sizes | VISL-02 | Icon rendering — requires OS rendering context | Run `pnpm tauri build`, inspect `.app` bundle icon in Finder at small and large sizes |
| No white flash on app launch | VISL-03 | Window initialization — requires native app context | Run `pnpm tauri build`, launch app and observe initial render (should be black, not white) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
