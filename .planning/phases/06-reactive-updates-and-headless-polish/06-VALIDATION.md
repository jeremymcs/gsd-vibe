---
phase: 6
slug: reactive-updates-and-headless-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vite.config.ts |
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
| 6-01-01 | 01 | 1 | WORK-05 | unit | `pnpm test` | ✅ | ⬜ pending |
| 6-01-02 | 01 | 1 | VIZ-04 | unit | `pnpm test` | ✅ | ⬜ pending |
| 6-02-01 | 02 | 1 | HDLS-04 | unit | `pnpm test` | ✅ | ⬜ pending |
| 6-03-01 | 03 | 2 | DOC | manual | n/a | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Worktree list refreshes within 2s on .gsd/ file change | WORK-05 | File watcher timing requires real app | Edit a .gsd/ file, observe worktrees tab updates within 2s |
| Visualizer data refreshes within 2s on .gsd/ file change | VIZ-04 | File watcher timing requires real app | Edit a .gsd/ file, observe visualizer tab updates within 2s |
| Headless log rows survive tab navigation | HDLS-04 | Requires running PTY session and navigation | Start headless session, navigate away and back, verify rows preserved |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
