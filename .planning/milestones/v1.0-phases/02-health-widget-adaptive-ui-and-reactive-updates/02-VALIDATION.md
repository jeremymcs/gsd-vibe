---
phase: 2
slug: health-widget-adaptive-ui-and-reactive-updates
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-20
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 29.x |
| **Config file** | vite.config.ts |
| **Quick run command** | `pnpm test --run` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test --run`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 2-01-01 | 01 | 1 | HLTH-01 | unit | `pnpm test --run` | ❌ W0 | ⬜ pending |
| 2-01-02 | 01 | 1 | HLTH-02 | unit | `pnpm test --run` | ❌ W0 | ⬜ pending |
| 2-01-03 | 01 | 1 | HLTH-03 | unit | `pnpm test --run` | ❌ W0 | ⬜ pending |
| 2-01-04 | 01 | 1 | HLTH-04 | unit | `pnpm test --run` | ❌ W0 | ⬜ pending |
| 2-02-01 | 02 | 2 | TERM-01 | unit | `pnpm test --run` | ❌ W0 | ⬜ pending |
| 2-02-02 | 02 | 2 | TERM-02 | unit | `pnpm test --run` | ❌ W0 | ⬜ pending |
| 2-02-03 | 02 | 2 | TERM-03 | unit | `pnpm test --run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/components/health/__tests__/health-widget.test.tsx` — stubs for HLTH-01, HLTH-02, HLTH-03, HLTH-04
- [ ] `src/components/project/__tests__/adaptive-tabs.test.tsx` — stubs for TERM-01, TERM-02, TERM-03

*Existing vitest infrastructure covers the framework; only test files need to be added.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Health widget updates within 10s of file change | HLTH-02 | Requires live file watcher + Tauri backend | Modify a .gsd/ file and observe widget update in running app |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
