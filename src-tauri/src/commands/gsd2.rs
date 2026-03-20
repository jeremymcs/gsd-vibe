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
// Parsing helpers
// ============================================================

/// Parse the `## Slices` section of a ROADMAP.md file.
/// Returns a Vec of Gsd2Slice with tasks left empty (populated separately by get_slice).
fn parse_roadmap_slices(content: &str) -> Vec<Gsd2Slice> {
    let mut slices = Vec::new();

    // Find the "## Slices" section (case-insensitive)
    let lower = content.to_lowercase();
    let section_start = lower
        .lines()
        .enumerate()
        .find_map(|(i, line)| {
            let t = line.trim();
            if t == "## slices" || t.starts_with("## slices ") || t.starts_with("## slices\t") {
                Some(i)
            } else {
                None
            }
        });

    let start_line = match section_start {
        Some(i) => i + 1,
        None => return slices,
    };

    let lines: Vec<&str> = content.lines().collect();

    // Regex-like parsing: match `- [ ] **ID: Title** rest`
    // We avoid the regex crate — use manual string parsing.
    for line in &lines[start_line..] {
        let trimmed = line.trim();

        // Stop at the next `##` heading
        if trimmed.starts_with("## ") || trimmed == "##" {
            break;
        }

        // Match: `- [ ] **ID: Title** rest` or `- [x] ...`
        if let Some(slice) = parse_checkbox_item(trimmed, true) {
            slices.push(Gsd2Slice {
                id: slice.0,
                title: slice.1,
                done: slice.2,
                risk: slice.3,
                dependencies: slice.4,
                tasks: Vec::new(),
            });
        }
    }

    slices
}

/// Parse the `## Tasks` section of a PLAN.md file.
fn parse_plan_tasks(content: &str) -> Vec<Gsd2Task> {
    let mut tasks = Vec::new();

    // Find the "## Tasks" section
    let lower = content.to_lowercase();
    let section_start = lower
        .lines()
        .enumerate()
        .find_map(|(i, line)| {
            let t = line.trim();
            if t == "## tasks" || t.starts_with("## tasks ") || t.starts_with("## tasks\t") {
                Some(i)
            } else {
                None
            }
        });

    let start_line = match section_start {
        Some(i) => i + 1,
        None => return tasks,
    };

    let lines: Vec<&str> = content.lines().collect();
    let mut i = start_line;

    while i < lines.len() {
        let line = lines[i];
        let trimmed = line.trim();

        // Stop at next `##` heading
        if trimmed.starts_with("## ") || trimmed == "##" {
            break;
        }

        // Match checkbox item
        if let Some(item) = parse_checkbox_item(trimmed, false) {
            let (id, title, done, _risk, _deps) = item;
            // Extract estimate from the rest of the line (from parse_checkbox_item rest field)
            // We need to re-parse the line to get the "rest" for estimate
            let estimate = extract_tag(trimmed, "est");

            let mut files: Vec<String> = Vec::new();
            let mut verify: Option<String> = None;

            // Look ahead for sub-lines (Files:, Verify:)
            let mut j = i + 1;
            while j < lines.len() {
                let sub = lines[j].trim();
                // Stop if we hit a new checkbox item or heading
                if sub.starts_with("- [") || sub.starts_with("## ") {
                    break;
                }
                if sub.starts_with("- Files:") || sub.starts_with("- files:") {
                    // Extract backtick-delimited file paths
                    let rest = &sub[8..];
                    files = extract_backtick_values(rest);
                } else if sub.starts_with("- Verify:") || sub.starts_with("- verify:") {
                    verify = Some(sub[9..].trim().to_string());
                }
                j += 1;
            }

            tasks.push(Gsd2Task {
                id,
                title,
                done,
                estimate,
                files,
                verify,
            });

            i = j;
            continue;
        }

        i += 1;
    }

    tasks
}

/// Parse a checkbox item line: `- [ ] **ID: Title** rest`
/// Returns (id, title, done, risk, dependencies) or None if not a match.
/// `with_slice_fields` indicates whether to extract risk/depends (for slices).
fn parse_checkbox_item(
    line: &str,
    with_slice_fields: bool,
) -> Option<(String, String, bool, Option<String>, Vec<String>)> {
    // Must start with `- [` (possibly with leading spaces already trimmed)
    if !line.starts_with("- [") {
        return None;
    }

    // Check done flag: `- [ ]` or `- [x]` or `- [X]`
    let done = if line.starts_with("- [x]") || line.starts_with("- [X]") {
        true
    } else if line.starts_with("- [ ]") {
        false
    } else {
        return None;
    };

    // After `- [x] ` or `- [ ] ` (5 chars), find `**`
    let after_check = line[5..].trim_start();
    if !after_check.starts_with("**") {
        return None;
    }
    let inner = &after_check[2..]; // strip leading `**`

    // Find closing `**` to get `ID: Title`
    let close_bold = inner.find("**")?;
    let id_title = &inner[..close_bold];
    let rest = inner[close_bold + 2..].trim();

    // Split `ID: Title`
    let colon_pos = id_title.find(':')?;
    let id = id_title[..colon_pos].trim().to_string();
    let title = id_title[colon_pos + 1..].trim().to_string();

    if id.is_empty() || title.is_empty() {
        return None;
    }

    let risk = if with_slice_fields {
        extract_tag(rest, "risk")
    } else {
        None
    };

    let dependencies = if with_slice_fields {
        extract_depends(rest)
    } else {
        Vec::new()
    };

    Some((id, title, done, risk, dependencies))
}

/// Extract a backtick tag value: `` `key:value` `` → `value`
fn extract_tag(text: &str, key: &str) -> Option<String> {
    let search = format!("`{}:", key);
    if let Some(start) = text.find(&search) {
        let after = &text[start + search.len()..];
        if let Some(end) = after.find('`') {
            return Some(after[..end].trim().to_string());
        }
    }
    None
}

/// Extract `depends:[S01,S02]` from text, returning a Vec of trimmed IDs.
fn extract_depends(text: &str) -> Vec<String> {
    let search = "`depends:[";
    if let Some(start) = text.find(search) {
        let after = &text[start + search.len()..];
        if let Some(end) = after.find(']') {
            return after[..end]
                .split(',')
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .collect();
        }
    }
    Vec::new()
}

/// Extract all backtick-delimited values from a string.
fn extract_backtick_values(text: &str) -> Vec<String> {
    let mut values = Vec::new();
    let mut remaining = text;
    while let Some(start) = remaining.find('`') {
        let after = &remaining[start + 1..];
        if let Some(end) = after.find('`') {
            let val = after[..end].trim().to_string();
            if !val.is_empty() {
                values.push(val);
            }
            remaining = &after[end + 1..];
        } else {
            break;
        }
    }
    values
}

/// Extract the milestone ID from a directory name.
/// `M001-descriptor` → `M001`
/// `M001` → `M001`
fn milestone_id_from_dir_name(name: &str) -> String {
    match name.find('-') {
        Some(pos) => name[..pos].to_string(),
        None => name.to_string(),
    }
}

/// Walk the `.gsd/milestones/` directory and return all milestones sorted by ID.
/// Slices are populated from ROADMAP.md; tasks within slices are NOT populated here
/// (tasks require a separate PLAN.md per slice).
pub fn list_milestones_from_dir(milestones_dir: &Path) -> Vec<Gsd2Milestone> {
    let read_dir = match std::fs::read_dir(milestones_dir) {
        Ok(r) => r,
        Err(_) => return Vec::new(),
    };

    let mut milestones: Vec<Gsd2Milestone> = Vec::new();

    for entry in read_dir.flatten() {
        if !entry.path().is_dir() {
            continue;
        }
        let dir_name = entry.file_name().to_string_lossy().to_string();
        let id = milestone_id_from_dir_name(&dir_name);
        let milestone_dir = entry.path();

        // Try to find a ROADMAP.md (three-tier resolution)
        let slices = if let Some(roadmap_file) = resolve_file_by_id(&milestone_dir, &id, "ROADMAP")
        {
            let roadmap_path = milestone_dir.join(&roadmap_file);
            match std::fs::read_to_string(&roadmap_path) {
                Ok(content) => parse_roadmap_slices(&content),
                Err(_) => Vec::new(),
            }
        } else {
            Vec::new()
        };

        // Get title from ROADMAP.md frontmatter or use dir_name
        let title = if let Some(roadmap_file) = resolve_file_by_id(&milestone_dir, &id, "ROADMAP")
        {
            let roadmap_path = milestone_dir.join(&roadmap_file);
            std::fs::read_to_string(&roadmap_path)
                .ok()
                .and_then(|content| {
                    let (fm, _) = parse_frontmatter(&content);
                    fm.get("milestone")
                        .or_else(|| fm.get("title"))
                        .cloned()
                })
                .unwrap_or_else(|| dir_name.clone())
        } else {
            dir_name.clone()
        };

        let done = !slices.is_empty() && slices.iter().all(|s| s.done);

        milestones.push(Gsd2Milestone {
            id,
            title,
            dir_name,
            done,
            slices,
            dependencies: Vec::new(),
        });
    }

    // Sort by ID (alphabetical works for M001, M002, etc.)
    milestones.sort_by(|a, b| a.id.cmp(&b.id));
    milestones
}

// ============================================================
// Commands
// ============================================================

/// List all milestones for a GSD-2 project by reading `.gsd/milestones/`.
#[tauri::command]
pub async fn gsd2_list_milestones(
    db: tauri::State<'_, DbState>,
    project_id: String,
) -> Result<Vec<Gsd2Milestone>, String> {
    let db_guard = db.write().await;
    let project_path = get_project_path(&db_guard, &project_id)?;
    let milestones_dir = Path::new(&project_path).join(".gsd").join("milestones");
    Ok(list_milestones_from_dir(&milestones_dir))
}

/// Get a single milestone by ID, parsing its ROADMAP.md slices.
#[tauri::command]
pub async fn gsd2_get_milestone(
    db: tauri::State<'_, DbState>,
    project_id: String,
    milestone_id: String,
) -> Result<Gsd2Milestone, String> {
    let db_guard = db.write().await;
    let project_path = get_project_path(&db_guard, &project_id)?;
    let milestones_dir = Path::new(&project_path).join(".gsd").join("milestones");

    let dir_name = resolve_dir_by_id(&milestones_dir, &milestone_id)
        .ok_or_else(|| format!("Milestone '{}' not found", milestone_id))?;

    let milestone_dir = milestones_dir.join(&dir_name);

    let roadmap_file = resolve_file_by_id(&milestone_dir, &milestone_id, "ROADMAP")
        .ok_or_else(|| format!("ROADMAP.md not found for milestone '{}'", milestone_id))?;

    let roadmap_path = milestone_dir.join(&roadmap_file);
    let content = std::fs::read_to_string(&roadmap_path)
        .map_err(|e| format!("Failed to read ROADMAP.md: {}", e))?;

    let (fm, _) = parse_frontmatter(&content);
    let title = fm
        .get("milestone")
        .or_else(|| fm.get("title"))
        .cloned()
        .unwrap_or_else(|| dir_name.clone());

    let dependencies: Vec<String> = fm
        .get("depends")
        .map(|v| {
            v.split(',')
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .collect()
        })
        .unwrap_or_default();

    let slices = parse_roadmap_slices(&content);
    let done = !slices.is_empty() && slices.iter().all(|s| s.done);

    Ok(Gsd2Milestone {
        id: milestone_id,
        title,
        dir_name,
        done,
        slices,
        dependencies,
    })
}

/// Get a single slice by ID, parsing its PLAN.md tasks.
#[tauri::command]
pub async fn gsd2_get_slice(
    db: tauri::State<'_, DbState>,
    project_id: String,
    milestone_id: String,
    slice_id: String,
) -> Result<Gsd2Slice, String> {
    let db_guard = db.write().await;
    let project_path = get_project_path(&db_guard, &project_id)?;
    let milestones_dir = Path::new(&project_path).join(".gsd").join("milestones");

    let dir_name = resolve_dir_by_id(&milestones_dir, &milestone_id)
        .ok_or_else(|| format!("Milestone '{}' not found", milestone_id))?;
    let milestone_dir = milestones_dir.join(&dir_name);

    // Try nested layout: M001/S01/ first, then flat M001/S01-PLAN.md
    let (slice_dir, plan_file) =
        if let Some(slice_sub) = resolve_dir_by_id(&milestone_dir, &slice_id) {
            let nested = milestone_dir.join(&slice_sub);
            match resolve_file_by_id(&nested, &slice_id, "PLAN") {
                Some(f) => (nested, f),
                None => {
                    // Fall back to flat
                    let flat_file = resolve_file_by_id(&milestone_dir, &slice_id, "PLAN")
                        .ok_or_else(|| {
                            format!("PLAN.md not found for slice '{}'", slice_id)
                        })?;
                    (milestone_dir.clone(), flat_file)
                }
            }
        } else {
            let flat_file = resolve_file_by_id(&milestone_dir, &slice_id, "PLAN")
                .ok_or_else(|| format!("PLAN.md not found for slice '{}'", slice_id))?;
            (milestone_dir.clone(), flat_file)
        };

    let plan_path = slice_dir.join(&plan_file);
    let content = std::fs::read_to_string(&plan_path)
        .map_err(|e| format!("Failed to read PLAN.md: {}", e))?;

    let tasks = parse_plan_tasks(&content);

    // Also get slice metadata from the parent ROADMAP.md
    let (title, done, risk, dependencies) =
        if let Some(roadmap_file) = resolve_file_by_id(&milestone_dir, &milestone_id, "ROADMAP") {
            let roadmap_path = milestone_dir.join(&roadmap_file);
            std::fs::read_to_string(&roadmap_path)
                .ok()
                .and_then(|rc| {
                    let slices = parse_roadmap_slices(&rc);
                    slices.into_iter().find(|s| s.id == slice_id).map(|s| {
                        (s.title, s.done, s.risk, s.dependencies)
                    })
                })
                .unwrap_or_else(|| (slice_id.clone(), false, None, Vec::new()))
        } else {
            (slice_id.clone(), false, None, Vec::new())
        };

    // Override done status from tasks if no slices metadata
    let computed_done = if done {
        true
    } else {
        !tasks.is_empty() && tasks.iter().all(|t| t.done)
    };

    Ok(Gsd2Slice {
        id: slice_id,
        title,
        done: computed_done,
        risk,
        dependencies,
        tasks,
    })
}

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

    // ---- parse_roadmap_slices ----

    #[test]
    fn parse_roadmap_slices_returns_empty_when_no_slices_section() {
        let content = "# No slices here\n\nJust some text.";
        let slices = parse_roadmap_slices(content);
        assert!(slices.is_empty());
    }

    #[test]
    fn parse_roadmap_slices_returns_slices_with_correct_done_status() {
        let content = "## Slices\n- [ ] **S01: Pending Slice**\n- [x] **S02: Done Slice**\n";
        let slices = parse_roadmap_slices(content);
        assert_eq!(slices.len(), 2);
        assert_eq!(slices[0].id, "S01");
        assert_eq!(slices[0].title, "Pending Slice");
        assert!(!slices[0].done);
        assert_eq!(slices[1].id, "S02");
        assert_eq!(slices[1].title, "Done Slice");
        assert!(slices[1].done);
    }

    #[test]
    fn parse_roadmap_slices_extracts_risk_tag() {
        let content = "## Slices\n- [ ] **S01: Title** `risk:high`\n";
        let slices = parse_roadmap_slices(content);
        assert_eq!(slices.len(), 1);
        assert_eq!(slices[0].risk, Some("high".to_string()));
    }

    #[test]
    fn parse_roadmap_slices_extracts_depends_tag() {
        let content = "## Slices\n- [ ] **S02: Title** `depends:[S01,S00]`\n";
        let slices = parse_roadmap_slices(content);
        assert_eq!(slices.len(), 1);
        assert_eq!(slices[0].dependencies, vec!["S01", "S00"]);
    }

    #[test]
    fn parse_roadmap_slices_stops_at_next_heading() {
        let content = "## Slices\n- [ ] **S01: First**\n## Other\n- [ ] **S02: Should Not Parse**\n";
        let slices = parse_roadmap_slices(content);
        assert_eq!(slices.len(), 1);
        assert_eq!(slices[0].id, "S01");
    }

    // ---- parse_plan_tasks ----

    #[test]
    fn parse_plan_tasks_returns_empty_when_no_tasks_section() {
        let content = "# No tasks here\nJust some text.";
        let tasks = parse_plan_tasks(content);
        assert!(tasks.is_empty());
    }

    #[test]
    fn parse_plan_tasks_returns_tasks_with_correct_done_status() {
        let content = "## Tasks\n- [ ] **T01: Pending Task**\n- [x] **T02: Done Task**\n";
        let tasks = parse_plan_tasks(content);
        assert_eq!(tasks.len(), 2);
        assert_eq!(tasks[0].id, "T01");
        assert_eq!(tasks[0].title, "Pending Task");
        assert!(!tasks[0].done);
        assert_eq!(tasks[1].id, "T02");
        assert!(tasks[1].done);
    }

    #[test]
    fn parse_plan_tasks_extracts_estimate_tag() {
        let content = "## Tasks\n- [ ] **T01: Task** `est:2h`\n";
        let tasks = parse_plan_tasks(content);
        assert_eq!(tasks.len(), 1);
        assert_eq!(tasks[0].estimate, Some("2h".to_string()));
    }

    #[test]
    fn parse_plan_tasks_returns_empty_tasks_vec_when_no_tasks_section() {
        let content = "## Overview\nNo tasks here.";
        let tasks = parse_plan_tasks(content);
        assert!(tasks.is_empty());
    }

    // ---- list_milestones_from_dir (testable helper) ----

    #[test]
    fn list_milestones_from_dir_returns_empty_when_milestones_dir_missing() {
        let dir = make_temp_dir("lm_missing");
        let milestones_dir = dir.join(".gsd").join("milestones");
        // Don't create the directory — it doesn't exist
        let result = list_milestones_from_dir(&milestones_dir);
        assert!(result.is_empty());
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn list_milestones_from_dir_returns_milestones_sorted_by_id() {
        let dir = make_temp_dir("lm_sorted");
        let milestones = dir.join(".gsd").join("milestones");
        fs::create_dir_all(milestones.join("M002-second")).unwrap();
        fs::create_dir_all(milestones.join("M001-first")).unwrap();
        let result = list_milestones_from_dir(&milestones);
        assert_eq!(result.len(), 2);
        assert_eq!(result[0].id, "M001");
        assert_eq!(result[1].id, "M002");
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn list_milestones_from_dir_resolves_id_from_directory_name() {
        let dir = make_temp_dir("lm_id_resolve");
        let milestones = dir.join(".gsd").join("milestones");
        fs::create_dir_all(milestones.join("M001-my-milestone")).unwrap();
        let result = list_milestones_from_dir(&milestones);
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].id, "M001");
        assert_eq!(result[0].dir_name, "M001-my-milestone");
        let _ = fs::remove_dir_all(&dir);
    }

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
