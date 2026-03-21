---
phase: 5
slug: gsd2-milestones-slices-tasks-ui
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-21
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vite.config.ts` (test section) |
| **Quick run command** | `pnpm test` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 5-01-00 | 01 | 1 | PARS-01..05 | unit (W0) | `pnpm test --run src/lib/__tests__/tauri-gsd2.test.ts src/lib/__tests__/queries-gsd2.test.ts` | YES (Wave 0) | ⬜ pending |
| 5-01-01 | 01 | 1 | PARS-01,02,03,04,05 | unit | `pnpm test --run src/lib/__tests__/tauri-gsd2.test.ts` | YES | ⬜ pending |
| 5-01-02 | 01 | 1 | PARS-01,02,03,04,05 | unit | `pnpm test --run src/lib/__tests__/queries-gsd2.test.ts` | YES | ⬜ pending |
| 5-02-01 | 02 | 2 | PARS-01,02 | build | `pnpm build` | N/A | ⬜ pending |
| 5-02-02 | 02 | 2 | PARS-03,04,05 | build | `pnpm build` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `src/lib/__tests__/tauri-gsd2.test.ts` — tests for PARS-01..05 invoke wrappers (verifies correct command names and argument shapes)
- [x] `src/lib/__tests__/queries-gsd2.test.ts` — tests for GSD-2 query key factory entries (verifies unique, correct key arrays)

Wave 0 is Task 0 of Plan 01. Test files are created first, fail initially (RED), then pass (GREEN) after Tasks 1 and 2.

*Note: Existing vitest infrastructure in `vite.config.ts` covers all phase requirements — no framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Accordion expand/collapse renders slice list with task counts | PARS-02 | Requires Tauri runtime | Open Milestones tab, click milestone row, verify slices appear with "X/Y tasks" counts |
| Active task pulse animation renders | PARS-05 | CSS animation not testable in jsdom | Open Tasks tab, verify active task row shows pulsing amber icon |
| Loading skeleton displays during fetch | PARS-01..05 | Network timing | Add artificial delay, verify skeleton renders before data |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready
