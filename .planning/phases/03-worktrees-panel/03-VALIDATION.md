---
phase: 3
slug: worktrees-panel
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-20
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + React Testing Library (frontend); `cargo test` (Rust) |
| **Config file** | `vite.config.ts` (test section); standard cargo |
| **Quick run command** | `cargo test -p track-your-shit-lib 2>&1 \| grep -E "test result\|FAILED"` |
| **Full suite command** | `cargo test && pnpm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cargo test -p track-your-shit-lib 2>&1 | grep -E "test result|FAILED"`
- **After every plan wave:** Run `cargo test && pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 0 | WORK-01 | unit (Rust) | `cargo test -p track-your-shit-lib list_worktrees` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 0 | WORK-02 | unit (Rust) | `cargo test -p track-your-shit-lib canonicalize` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 0 | WORK-04 | unit (Rust) | `cargo test -p track-your-shit-lib worktree_diff` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 0 | WORK-05 | unit (React) | `pnpm test src/components/project/gsd2-worktrees-tab.test.tsx` | ❌ W0 | ⬜ pending |
| 03-03-01 | 03 | 1 | WORK-01 | unit (Rust) | `cargo test -p track-your-shit-lib list_worktrees` | ✅ W0 | ⬜ pending |
| 03-03-02 | 03 | 1 | WORK-02 | unit (Rust) | `cargo test -p track-your-shit-lib canonicalize` | ✅ W0 | ⬜ pending |
| 03-03-03 | 03 | 1 | WORK-04 | unit (Rust) | `cargo test -p track-your-shit-lib worktree_diff` | ✅ W0 | ⬜ pending |
| 03-04-01 | 04 | 1 | WORK-03 | unit (Rust) | `cargo test -p track-your-shit-lib remove_worktree` | ❌ W0 | ⬜ pending |
| 03-05-01 | 05 | 2 | WORK-05 | unit (React) | `pnpm test src/components/project/gsd2-worktrees-tab.test.tsx` | ✅ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src-tauri/src/commands/gsd2.rs` — add `parse_worktree_porcelain` pure helper function (testable without subprocess) — covers WORK-01
- [ ] `src-tauri/src/commands/gsd2.rs` — add `canonicalize_path` pure helper (std::fs::canonicalize wrapper) — covers WORK-02
- [ ] `src-tauri/src/commands/gsd2.rs` — add `parse_diff_name_status` pure helper — covers WORK-04
- [ ] `src/components/project/gsd2-worktrees-tab.test.tsx` — render test stubs for list, empty state, loading state — covers WORK-05

*Rust tests follow the established `gsd2.rs` pattern — pure functions with fixture strings, no subprocess calls in tests.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Remove worktree deletes filesystem directory and branch | WORK-03 | Requires real git worktree on disk; not easily mocked in unit test | Create a test worktree with `git worktree add`, click Remove in UI, verify directory gone and branch deleted |
| Worktrees tab visible as second tab in GSD-2 project | WORK-05 | UI tab ordering is a visual/navigation check | Open a GSD-2 project, confirm tabs order: Health → Worktrees → Milestones |
| macOS /var → /private/var path canonicalization in real UI | WORK-02 | Symlink resolution only observable in actual macOS runtime | On macOS, confirm worktrees listed even when project path is under /var/folders |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
