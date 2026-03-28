---
phase: 1
slug: gsd-2-backend-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-20
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Rust `cargo test` (built-in) |
| **Config file** | `src-tauri/Cargo.toml` |
| **Quick run command** | `cargo test -p track-your-shit 2>&1 | tail -20` |
| **Full suite command** | `cargo test -p track-your-shit -- --nocapture 2>&1` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cargo test -p track-your-shit 2>&1 | tail -20`
- **After every plan wave:** Run `cargo test -p track-your-shit -- --nocapture 2>&1`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | VERS-01 | unit | `cargo test detect_gsd_version` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 1 | VERS-02 | unit | `cargo test gsd1_version_guard` | ❌ W0 | ⬜ pending |
| 1-01-03 | 01 | 1 | VERS-03 | unit | `cargo test gsd1_commands_reject_gsd2` | ❌ W0 | ⬜ pending |
| 1-01-04 | 01 | 1 | VERS-04 | unit | `cargo test gsd_version_db_migration` | ❌ W0 | ⬜ pending |
| 1-02-01 | 02 | 2 | PARS-01 | unit | `cargo test gsd2_list_milestones` | ❌ W0 | ⬜ pending |
| 1-02-02 | 02 | 2 | PARS-02 | unit | `cargo test milestone_directory_resolver` | ❌ W0 | ⬜ pending |
| 1-02-03 | 02 | 2 | PARS-03 | unit | `cargo test gsd2_derive_state` | ❌ W0 | ⬜ pending |
| 1-02-04 | 02 | 2 | PARS-04 | unit | `cargo test gsd2_file_watcher` | ❌ W0 | ⬜ pending |
| 1-02-05 | 02 | 2 | PARS-05 | manual | — | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src-tauri/src/commands/gsd2/mod.rs` — stub module for new gsd2 commands
- [ ] `src-tauri/src/commands/gsd2/tests.rs` — test stubs for VERS-01 through PARS-04
- [ ] All test functions must exist and compile (can `todo!()` initially)

*Wave 0 ensures test stubs compile before implementation begins.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `gsd2:file-changed` events reach frontend subscribers | PARS-05 | Requires live Tauri app + file system mutation | 1. `pnpm tauri dev`, 2. open GSD-2 project, 3. edit a `.gsd/` file, 4. observe event in devtools console |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
