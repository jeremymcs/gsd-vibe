// Track Your Shit - GSD-2 Commands
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
//
// GSD-2 backend: version detection, file resolvers, struct definitions, and helpers.
// All .gsd/ parsing commands live here. gsd.rs (.planning/) is never modified.

use crate::db::Database;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;
use std::sync::Arc;

type DbState = Arc<crate::db::DbPool>;

// ============================================================
// Helpers (copied from gsd.rs — do NOT import across module boundary)
// ============================================================

/// Resolve project path from DB by project_id
fn get_project_path(db: &Database, project_id: &str) -> Result<String, String> {
    db.conn()
        .query_row(
            "SELECT path FROM projects WHERE id = ?1",
            params![project_id],
            |row| row.get::<_, String>(0),
        )
        .map_err(|e| format!("Project not found: {}", e))
}

/// Parse YAML-like frontmatter from markdown content.
/// Handles both standard position (start of file) and GSD summary files
/// where frontmatter appears after a heading/copyright block.
fn parse_frontmatter(content: &str) -> (HashMap<String, String>, String) {
    let mut frontmatter = HashMap::new();
    let mut body = content.to_string();

    // Find the first `---` delimiter (may not be at position 0 for GSD summaries)
    let fm_start = if content.starts_with("---") {
        Some(0)
    } else {
        // Look for `---` on its own line (preceded by newline)
        content.find("\n---").map(|idx| idx + 1)
    };

    if let Some(start) = fm_start {
        let after_open = start + 3;
        if after_open < content.len() {
            if let Some(end_offset) = content[after_open..].find("\n---") {
                let fm_str = &content[after_open..after_open + end_offset];
                let after_close = after_open + end_offset + 4; // skip past \n---
                let body_start = if after_close < content.len() {
                    after_close
                } else {
                    content.len()
                };

                // Body is everything before the frontmatter + everything after it
                let pre_fm = if start > 0 { &content[..start] } else { "" };
                let post_fm = &content[body_start..];
                body = format!("{}{}", pre_fm.trim(), post_fm);

                // Parse frontmatter key-value pairs (skip multiline YAML lists)
                for line in fm_str.lines() {
                    let trimmed = line.trim();
                    // Skip empty lines, list items, and indented continuation lines
                    if trimmed.is_empty()
                        || trimmed.starts_with('-')
                        || line.starts_with(' ')
                        || line.starts_with('\t')
                    {
                        continue;
                    }
                    if let Some(colon_idx) = trimmed.find(':') {
                        let key = trimmed[..colon_idx].trim().to_string();
                        let val = trimmed[colon_idx + 1..].trim().to_string();
                        if !key.is_empty() && !key.contains(' ') {
                            frontmatter.insert(key, val);
                        }
                    }
                }
            }
        }
    }

    (frontmatter, body)
}

// ============================================================
// Three-tier resolvers (RESEARCH.md Patterns 4 & 5)
// ============================================================

/// Resolve a directory by ID under a parent directory.
///
/// Tier 1: exact match — directory name == id_prefix
/// Tier 2: prefix match — directory name starts with "{id_prefix}-"
/// Tier 3: None
pub fn resolve_dir_by_id(parent_dir: &Path, id_prefix: &str) -> Option<String> {
    let entries = std::fs::read_dir(parent_dir).ok()?;
    let mut prefix_match: Option<String> = None;

    for entry in entries.flatten() {
        let file_name = entry.file_name();
        let name = file_name.to_string_lossy();
        if !entry.path().is_dir() {
            continue;
        }
        if name == id_prefix {
            return Some(name.into_owned());
        }
        if prefix_match.is_none() && name.starts_with(&format!("{}-", id_prefix)) {
            prefix_match = Some(name.into_owned());
        }
    }

    prefix_match
}

/// Resolve a file by ID under a directory.
///
/// Tier 1: exact — `{id_prefix}-{suffix}.md`
/// Tier 2: legacy — `{id_prefix}-*-{suffix}.md` (any descriptor in middle)
/// Tier 3: bare — `{suffix}.md`
/// Tier 4: None
pub fn resolve_file_by_id(dir: &Path, id_prefix: &str, suffix: &str) -> Option<String> {
    let entries = std::fs::read_dir(dir).ok()?;
    let exact_name = format!("{}-{}.md", id_prefix, suffix);
    let bare_name = format!("{}.md", suffix);
    let legacy_prefix = format!("{}-", id_prefix);
    let legacy_suffix = format!("-{}.md", suffix);

    let mut legacy_match: Option<String> = None;
    let mut bare_match: Option<String> = None;

    for entry in entries.flatten() {
        let file_name = entry.file_name();
        let name = file_name.to_string_lossy();
        if !entry.path().is_file() {
            continue;
        }
        if name == exact_name {
            return Some(name.into_owned());
        }
        if legacy_match.is_none()
            && name.starts_with(&legacy_prefix)
            && name.ends_with(&legacy_suffix)
        {
            legacy_match = Some(name.clone().into_owned());
        }
        if bare_match.is_none() && name == bare_name {
            bare_match = Some(name.into_owned());
        }
    }

    legacy_match.or(bare_match)
}

// ============================================================
// Struct definitions
// ============================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Gsd2Milestone {
    pub id: String,
    pub title: String,
    pub dir_name: String,
    pub done: bool,
    pub slices: Vec<Gsd2Slice>,
    pub dependencies: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Gsd2Slice {
    pub id: String,
    pub title: String,
    pub done: bool,
    pub risk: Option<String>,
    pub dependencies: Vec<String>,
    pub tasks: Vec<Gsd2Task>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Gsd2Task {
    pub id: String,
    pub title: String,
    pub done: bool,
    pub estimate: Option<String>,
    pub files: Vec<String>,
    pub verify: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Gsd2State {
    pub active_milestone_id: Option<String>,
    pub active_slice_id: Option<String>,
    pub active_task_id: Option<String>,
    pub phase: Option<String>,
    pub milestones_done: u32,
    pub milestones_total: u32,
    pub slices_done: u32,
    pub slices_total: u32,
    pub tasks_done: u32,
    pub tasks_total: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Gsd2RoadmapProgress {
    pub milestones_done: u32,
    pub milestones_total: u32,
    pub slices_done: u32,
    pub slices_total: u32,
    pub tasks_done: u32,
    pub tasks_total: u32,
}

// ============================================================
// Commands
// ============================================================

/// Detect the GSD version for a project by inspecting its directory structure.
///
/// Returns:
/// - `"gsd2"` if `.gsd/` directory exists
/// - `"gsd1"` if `.planning/` directory exists (and no `.gsd/`)
/// - `"none"` if neither directory is present
///
/// The detected version is persisted in the `gsd_version` column of the projects table.
#[tauri::command]
pub async fn gsd2_detect_version(
    db: tauri::State<'_, DbState>,
    project_id: String,
) -> Result<String, String> {
    let db_guard = db.write().await;

    let project_path = get_project_path(&db_guard, &project_id)?;

    let path = Path::new(&project_path);
    let version = if path.join(".gsd").is_dir() {
        "gsd2"
    } else if path.join(".planning").is_dir() {
        "gsd1"
    } else {
        "none"
    };

    // Store in DB for persistent access
    db_guard
        .conn()
        .execute(
            "UPDATE projects SET gsd_version = ?1 WHERE id = ?2",
            params![version, &project_id],
        )
        .map_err(|e| format!("Failed to store version: {}", e))?;

    Ok(version.to_string())
}

// ============================================================
// Tests
// ============================================================

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    /// Create a unique temp dir for a test, cleanup on drop via a simple wrapper.
    fn make_temp_dir(name: &str) -> std::path::PathBuf {
        let dir = std::env::temp_dir().join(format!("gsd2_test_{}_{}", name, std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    // ---- detect_version logic ----

    fn detect_version_for_path(path: &Path) -> &'static str {
        if path.join(".gsd").is_dir() {
            "gsd2"
        } else if path.join(".planning").is_dir() {
            "gsd1"
        } else {
            "none"
        }
    }

    #[test]
    fn detect_version_returns_gsd2_when_gsd_dir_exists() {
        let dir = make_temp_dir("detect_gsd2");
        fs::create_dir(dir.join(".gsd")).unwrap();
        assert_eq!(detect_version_for_path(&dir), "gsd2");
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn detect_version_returns_gsd1_when_planning_dir_exists() {
        let dir = make_temp_dir("detect_gsd1");
        fs::create_dir(dir.join(".planning")).unwrap();
        assert_eq!(detect_version_for_path(&dir), "gsd1");
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn detect_version_returns_none_when_neither_exists() {
        let dir = make_temp_dir("detect_none");
        assert_eq!(detect_version_for_path(&dir), "none");
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn detect_version_gsd2_wins_when_both_dirs_exist() {
        let dir = make_temp_dir("detect_both");
        fs::create_dir(dir.join(".gsd")).unwrap();
        fs::create_dir(dir.join(".planning")).unwrap();
        assert_eq!(detect_version_for_path(&dir), "gsd2");
        let _ = fs::remove_dir_all(&dir);
    }

    // ---- parse_frontmatter ----

    #[test]
    fn parse_frontmatter_extracts_key_value_pairs() {
        let content = "---\nphase: 01\nplan: 02\ntitle: My Plan\n---\n\n# Body here";
        let (fm, body) = parse_frontmatter(content);
        assert_eq!(fm.get("phase"), Some(&"01".to_string()));
        assert_eq!(fm.get("plan"), Some(&"02".to_string()));
        assert_eq!(fm.get("title"), Some(&"My Plan".to_string()));
        assert!(body.contains("# Body here"));
    }

    #[test]
    fn parse_frontmatter_skips_list_items() {
        let content = "---\nphase: 01\nitems:\n  - foo\n  - bar\n---\n# Body";
        let (fm, _) = parse_frontmatter(content);
        assert_eq!(fm.get("phase"), Some(&"01".to_string()));
        // List items should not appear as keys
        assert!(fm.get("- foo").is_none());
    }

    #[test]
    fn parse_frontmatter_returns_empty_when_no_frontmatter() {
        let content = "# Just a heading\nSome text";
        let (fm, body) = parse_frontmatter(content);
        assert!(fm.is_empty());
        assert_eq!(body, content);
    }

    // ---- resolve_dir_by_id ----

    #[test]
    fn resolve_dir_by_id_returns_exact_match() {
        let dir = make_temp_dir("resolve_dir_exact");
        fs::create_dir(dir.join("M001")).unwrap();
        fs::create_dir(dir.join("M001-some-title")).unwrap();
        let result = resolve_dir_by_id(&dir, "M001");
        assert_eq!(result, Some("M001".to_string()));
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn resolve_dir_by_id_returns_prefix_match_when_no_exact() {
        let dir = make_temp_dir("resolve_dir_prefix");
        fs::create_dir(dir.join("M001-my-milestone")).unwrap();
        let result = resolve_dir_by_id(&dir, "M001");
        assert_eq!(result, Some("M001-my-milestone".to_string()));
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn resolve_dir_by_id_returns_none_when_no_match() {
        let dir = make_temp_dir("resolve_dir_none");
        fs::create_dir(dir.join("M002-other")).unwrap();
        let result = resolve_dir_by_id(&dir, "M001");
        assert_eq!(result, None);
        let _ = fs::remove_dir_all(&dir);
    }

    // ---- resolve_file_by_id ----

    #[test]
    fn resolve_file_by_id_returns_exact_id_suffix_match() {
        let dir = make_temp_dir("resolve_file_exact");
        fs::write(dir.join("S01-PLAN.md"), "content").unwrap();
        let result = resolve_file_by_id(&dir, "S01", "PLAN");
        assert_eq!(result, Some("S01-PLAN.md".to_string()));
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn resolve_file_by_id_returns_legacy_id_descriptor_suffix_match() {
        let dir = make_temp_dir("resolve_file_legacy");
        fs::write(dir.join("S01-auth-refactor-PLAN.md"), "content").unwrap();
        let result = resolve_file_by_id(&dir, "S01", "PLAN");
        assert_eq!(result, Some("S01-auth-refactor-PLAN.md".to_string()));
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn resolve_file_by_id_returns_bare_suffix_match() {
        let dir = make_temp_dir("resolve_file_bare");
        fs::write(dir.join("PLAN.md"), "content").unwrap();
        let result = resolve_file_by_id(&dir, "S01", "PLAN");
        assert_eq!(result, Some("PLAN.md".to_string()));
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn resolve_file_by_id_returns_none_when_no_match() {
        let dir = make_temp_dir("resolve_file_none");
        fs::write(dir.join("OTHER.md"), "content").unwrap();
        let result = resolve_file_by_id(&dir, "S01", "PLAN");
        assert_eq!(result, None);
        let _ = fs::remove_dir_all(&dir);
    }
}
