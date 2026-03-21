---
phase: 4
slug: headless-mode-and-visualizer
status: draft
nyquist_compliant: true
wave_0_complete: true
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

- **After every task commit:** Run `pnpm test && pnpm build`
- **After every plan wave:** Run `pnpm test && pnpm build`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 20 seconds

---

## Verification Strategy

This phase uses a **build + test** verification approach:

1. **`pnpm test`** — Runs the existing vitest suite to catch regressions in existing code. New hooks and components are verified through TypeScript compilation (build) and acceptance criteria grep checks.
2. **`pnpm build`** — TypeScript type-checking + Vite build catches type errors, missing imports, and structural issues in all new files.
3. **`cargo check`** — (Plan 01 only) Verifies Rust backend compiles with all new commands and state management.
4. **Acceptance criteria** — Each task has specific grep-based checks verifying key code patterns exist.

**Rationale:** Phase 4 components are UI-heavy (tab layouts, bar charts, status dots) where behavioral tests provide low signal-to-noise. The existing test suite catches regressions, TypeScript compilation catches structural errors, and the checkpoint:human-verify in Plan 03 catches visual/interactive issues. This approach avoids creating test stubs that would need significant mocking of Tauri IPC and PTY event systems.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Verify Strategy | Automated Command | Status |
|---------|------|------|-------------|-----------------|-------------------|--------|
| 4-01-01 | 01 | 1 | HDLS-01, HDLS-02, HDLS-03, HDLS-05 | cargo check + acceptance criteria | `cargo check` | pending |
| 4-01-02 | 01 | 1 | VIZ-01, VIZ-02, VIZ-03 | cargo check + acceptance criteria | `cargo check` | pending |
| 4-02-01 | 02 | 2 | HDLS-04 | pnpm test + pnpm build | `pnpm test && pnpm build` | pending |
| 4-02-02 | 02 | 2 | HDLS-04 | pnpm test + pnpm build | `pnpm test && pnpm build` | pending |
| 4-03-01 | 03 | 3 | HDLS-06 | pnpm test + pnpm build | `pnpm test && pnpm build` | pending |
| 4-03-02 | 03 | 3 | VIZ-04 | pnpm test + pnpm build | `pnpm test && pnpm build` | pending |
| 4-03-03 | 03 | 3 | HDLS-06, VIZ-04 | pnpm test + pnpm build | `pnpm test && pnpm build` | pending |

*Status: pending | green | red | flaky*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| App close terminates PTY and releases auto.lock | HDLS-06 | Requires actual PTY process + lock file lifecycle | Start headless session, force-quit app, verify no orphaned process and lock file removed |

*All other phase behaviors have automated verification.*

---

## Validation Sign-Off

- [x] All tasks have automated verify commands (`pnpm test && pnpm build` or `cargo check`)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] No watch-mode flags
- [x] Feedback latency < 20s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved
