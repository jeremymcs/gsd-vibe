---
phase: 4
slug: headless-mode-and-visualizer
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-20
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vite.config.ts |
| **Quick run command** | `pnpm test` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 4-01-01 | 01 | 1 | HDLS-01 | unit | `pnpm test` | ❌ W0 | ⬜ pending |
| 4-01-02 | 01 | 1 | HDLS-02 | unit | `pnpm test` | ❌ W0 | ⬜ pending |
| 4-01-03 | 01 | 1 | HDLS-03 | unit | `pnpm test` | ❌ W0 | ⬜ pending |
| 4-01-04 | 01 | 2 | HDLS-04 | unit | `pnpm test` | ❌ W0 | ⬜ pending |
| 4-01-05 | 01 | 2 | HDLS-05 | unit | `pnpm test` | ❌ W0 | ⬜ pending |
| 4-01-06 | 01 | 2 | HDLS-06 | manual | N/A | N/A | ⬜ pending |
| 4-02-01 | 02 | 1 | VIZ-01 | unit | `pnpm test` | ❌ W0 | ⬜ pending |
| 4-02-02 | 02 | 1 | VIZ-02 | unit | `pnpm test` | ❌ W0 | ⬜ pending |
| 4-02-03 | 02 | 2 | VIZ-03 | unit | `pnpm test` | ❌ W0 | ⬜ pending |
| 4-02-04 | 02 | 2 | VIZ-04 | unit | `pnpm test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/components/project/headless/__tests__/HeadlessTab.test.tsx` — stubs for HDLS-01, HDLS-02, HDLS-03
- [ ] `src/components/project/headless/__tests__/useHeadlessSession.test.ts` — stubs for HDLS-04, HDLS-05
- [ ] `src/components/project/visualizer/__tests__/VisualizerTab.test.tsx` — stubs for VIZ-01, VIZ-02, VIZ-03, VIZ-04
- [ ] `src/test/setup.ts` — existing setup covers all fixtures

*Existing vitest infrastructure covers the framework; only stub files needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| App close terminates PTY and releases auto.lock | HDLS-06 | Requires actual PTY process + lock file lifecycle | Start headless session, force-quit app, verify no orphaned process and lock file removed |

*All other phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
