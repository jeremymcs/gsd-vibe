// Track Your Shit - GSD-2 Commands
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
//
// GSD-2 backend: version detection, file resolvers, struct definitions, and helpers.
// All .gsd/ parsing commands live here. gsd.rs (.planning/) is never modified.

use crate::db::Database;
use crate::headless::HeadlessRegistryState;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;
use std::sync::Arc;
use std::time::Duration;

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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Gsd2Health {
    pub budget_spent: f64,
    pub budget_ceiling: Option<f64>,
    pub active_milestone_id: Option<String>,
    pub active_milestone_title: Option<String>,
    pub active_slice_id: Option<String>,
    pub active_slice_title: Option<String>,
    pub active_task_id: Option<String>,
    pub active_task_title: Option<String>,
    pub phase: Option<String>,
    pub blocker: Option<String>,
    pub next_action: Option<String>,
    pub milestones_done: u32,
    pub milestones_total: u32,
    pub slices_done: u32,
    pub slices_total: u32,
    pub tasks_done: u32,
    pub tasks_total: u32,
    pub env_error_count: u32,
    pub env_warning_count: u32,
}

// ============================================================
// Parsing helpers
// ============================================================

/// Sum all `cost` values from `.gsd/metrics.json` for a project.
/// Returns 0.0 if the file is missing, empty, or malformed.
fn sum_costs_from_metrics(project_path: &str) -> f64 {
    let metrics_path = Path::new(project_path).join(".gsd").join("metrics.json");
    let content = match std::fs::read_to_string(&metrics_path) {
        Ok(c) => c,
        Err(_) => return 0.0,
    };
    let json: serde_json::Value = match serde_json::from_str(&content) {
        Ok(v) => v,
        Err(_) => return 0.0,
    };
    json.get("units")
        .and_then(|u| u.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|unit| unit.get("cost").and_then(|c| c.as_f64()))
                .sum()
        })
        .unwrap_or(0.0)
}

/// Struct returned by `parse_gsd2_state_md` holding all parsed fields.
struct Gsd2StateParsed {
    active_milestone: Option<String>,
    active_slice: Option<String>,
    active_task: Option<String>,
    phase: Option<String>,
    blocker: Option<String>,
    next_action: Option<String>,
    budget_ceiling: Option<f64>,
}

/// Parse `.gsd/STATE.md` body sections (NOT YAML frontmatter — GSD-2 STATE.md uses
/// bold markdown key lines and `##` heading sections, not frontmatter).
///
/// Extracts:
/// - `**Active Milestone:**` — ID and title from "M005 — Title" format
/// - `**Active Slice:**` — same format or "None"
/// - `**Active Task:**` — same format or "None"
/// - `**Phase:**` — plain value
/// - `## Blockers` section — first non-"None" bullet item
/// - `## Next Action` section — first non-empty non-heading line
/// - `**Budget Ceiling:**` — f64 if present
fn parse_gsd2_state_md(content: &str) -> Gsd2StateParsed {
    let mut active_milestone: Option<String> = None;
    let mut active_slice: Option<String> = None;
    let mut active_task: Option<String> = None;
    let mut phase: Option<String> = None;
    let mut blocker: Option<String> = None;
    let mut next_action: Option<String> = None;
    let mut budget_ceiling: Option<f64> = None;
    let mut in_blockers_section = false;
    let mut in_next_action_section = false;

    for line in content.lines() {
        let trimmed = line.trim();

        // Handle section transitions
        if trimmed.starts_with("## ") {
            in_blockers_section = trimmed == "## Blockers";
            in_next_action_section = trimmed == "## Next Action";
            continue;
        }

        // Parse bold key lines
        if trimmed.starts_with("**Active Milestone:**") {
            let val = trimmed["**Active Milestone:**".len()..].trim();
            if val != "None" && !val.is_empty() {
                active_milestone = Some(val.to_string());
            }
        } else if trimmed.starts_with("**Active Slice:**") {
            let val = trimmed["**Active Slice:**".len()..].trim();
            if val != "None" && !val.is_empty() {
                active_slice = Some(val.to_string());
            }
        } else if trimmed.starts_with("**Active Task:**") {
            let val = trimmed["**Active Task:**".len()..].trim();
            if val != "None" && !val.is_empty() {
                active_task = Some(val.to_string());
            }
        } else if trimmed.starts_with("**Phase:**") {
            let val = trimmed["**Phase:**".len()..].trim();
            if !val.is_empty() {
                phase = Some(val.to_string());
            }
        } else if trimmed.starts_with("**Budget Ceiling:**") {
            let val = trimmed["**Budget Ceiling:**".len()..].trim();
            // Strip common currency symbols before parsing
            let clean = val.trim_start_matches('$').trim();
            if let Ok(v) = clean.parse::<f64>() {
                budget_ceiling = Some(v);
            }
        }

        // Blockers section: collect first non-"None" bullet item
        if in_blockers_section && trimmed.starts_with("- ") {
            let val = trimmed[2..].trim();
            if val != "None" && !val.is_empty() {
                blocker = Some(val.to_string());
                in_blockers_section = false;
            }
        }

        // Next Action section: first non-empty non-heading line
        if in_next_action_section && !trimmed.is_empty() && !trimmed.starts_with('#') {
            next_action = Some(trimmed.to_string());
            in_next_action_section = false;
        }
    }

    Gsd2StateParsed {
        active_milestone,
        active_slice,
        active_task,
        phase,
        blocker,
        next_action,
        budget_ceiling,
    }
}

/// Split a "ID — Title" or "ID - Title" string into (id, title) parts.
/// Returns (full_string, None) if no separator is found.
fn split_id_and_title(value: &str) -> (String, Option<String>) {
    // Try em-dash separator first, then ASCII dash
    for sep in [" — ", " - "] {
        if let Some(pos) = value.find(sep) {
            let id = value[..pos].trim().to_string();
            let title = value[pos + sep.len()..].trim().to_string();
            return (id, Some(title));
        }
    }
    (value.trim().to_string(), None)
}

/// Build a `Gsd2Health` from a project path without touching the DB (testable helper).
pub fn get_health_from_dir(project_path: &str) -> Gsd2Health {
    // 1. Sum costs from metrics.json
    let budget_spent = sum_costs_from_metrics(project_path);

    // 2. Parse STATE.md body sections
    let state_content = std::fs::read_to_string(
        Path::new(project_path).join(".gsd").join("STATE.md"),
    )
    .unwrap_or_default();
    let parsed = parse_gsd2_state_md(&state_content);

    // 3. Derive M/S/T progress counters (reuses existing filesystem walker)
    let progress = derive_state_from_dir(project_path);

    // 4. Split active milestone/slice/task into ID + title
    let (active_milestone_id, active_milestone_title) = parsed
        .active_milestone
        .map(|v| {
            let (id, title) = split_id_and_title(&v);
            (Some(id), title)
        })
        .unwrap_or((None, None));

    let (active_slice_id, active_slice_title) = parsed
        .active_slice
        .map(|v| {
            let (id, title) = split_id_and_title(&v);
            (Some(id), title)
        })
        .unwrap_or((None, None));

    let (active_task_id, active_task_title) = parsed
        .active_task
        .map(|v| {
            let (id, title) = split_id_and_title(&v);
            (Some(id), title)
        })
        .unwrap_or((None, None));

    Gsd2Health {
        budget_spent,
        budget_ceiling: parsed.budget_ceiling,
        active_milestone_id,
        active_milestone_title,
        active_slice_id,
        active_slice_title,
        active_task_id,
        active_task_title,
        phase: parsed.phase,
        blocker: parsed.blocker,
        next_action: parsed.next_action,
        milestones_done: progress.milestones_done,
        milestones_total: progress.milestones_total,
        slices_done: progress.slices_done,
        slices_total: progress.slices_total,
        tasks_done: progress.tasks_done,
        tasks_total: progress.tasks_total,
        env_error_count: 0,
        env_warning_count: 0,
    }
}

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

/// Walk milestones dir and populate tasks for each slice (by reading PLAN.md per slice).
/// This is the shared data-gathering helper for derive_state and get_roadmap_progress.
pub fn walk_milestones_with_tasks(milestones_dir: &Path) -> Vec<Gsd2Milestone> {
    let mut milestones = list_milestones_from_dir(milestones_dir);

    for milestone in milestones.iter_mut() {
        let milestone_dir = milestones_dir.join(&milestone.dir_name);
        for slice in milestone.slices.iter_mut() {
            // Try nested layout first, then flat
            let plan_content = resolve_slice_plan_content(&milestone_dir, &milestone.id, &slice.id);
            if let Some(content) = plan_content {
                slice.tasks = parse_plan_tasks(&content);
            }
        }
        // Recalculate milestone done based on slice done status (task completion drives slice done)
        // A slice is done if either ROADMAP says done OR all its tasks are done (non-empty task list)
        for slice in milestone.slices.iter_mut() {
            if !slice.done && !slice.tasks.is_empty() {
                slice.done = slice.tasks.iter().all(|t| t.done);
            }
        }
        milestone.done = !milestone.slices.is_empty() && milestone.slices.iter().all(|s| s.done);
    }

    milestones
}

/// Resolve the content of a slice's PLAN.md (nested or flat layout).
fn resolve_slice_plan_content(
    milestone_dir: &Path,
    _milestone_id: &str,
    slice_id: &str,
) -> Option<String> {
    // Try nested: milestone_dir/S01[-DESCRIPTOR]/S01-PLAN.md
    if let Some(slice_sub) = resolve_dir_by_id(milestone_dir, slice_id) {
        let nested = milestone_dir.join(&slice_sub);
        if let Some(plan_file) = resolve_file_by_id(&nested, slice_id, "PLAN") {
            if let Ok(content) = std::fs::read_to_string(nested.join(&plan_file)) {
                return Some(content);
            }
        }
    }
    // Try flat: milestone_dir/S01-PLAN.md
    if let Some(plan_file) = resolve_file_by_id(milestone_dir, slice_id, "PLAN") {
        if let Ok(content) = std::fs::read_to_string(milestone_dir.join(&plan_file)) {
            return Some(content);
        }
    }
    None
}

/// Derive GSD-2 state from a project path (testable helper without DB).
pub fn derive_state_from_dir(project_path: &str) -> Gsd2State {
    let milestones_dir = Path::new(project_path).join(".gsd").join("milestones");
    let milestones = walk_milestones_with_tasks(&milestones_dir);

    let mut milestones_done: u32 = 0;
    let mut milestones_total: u32 = 0;
    let mut slices_done: u32 = 0;
    let mut slices_total: u32 = 0;
    let mut tasks_done: u32 = 0;
    let mut tasks_total: u32 = 0;

    let mut active_milestone_id: Option<String> = None;
    let mut active_slice_id: Option<String> = None;
    let mut active_task_id: Option<String> = None;

    for milestone in &milestones {
        milestones_total += 1;
        if milestone.done {
            milestones_done += 1;
        } else if active_milestone_id.is_none() {
            active_milestone_id = Some(milestone.id.clone());
        }

        for slice in &milestone.slices {
            slices_total += 1;
            if slice.done {
                slices_done += 1;
            } else if active_milestone_id.as_deref() == Some(&milestone.id)
                && active_slice_id.is_none()
            {
                active_slice_id = Some(slice.id.clone());
            }

            for task in &slice.tasks {
                tasks_total += 1;
                if task.done {
                    tasks_done += 1;
                } else if active_slice_id.as_deref() == Some(&slice.id)
                    && active_task_id.is_none()
                {
                    active_task_id = Some(task.id.clone());
                }
            }
        }
    }

    // Read .gsd/STATE.md for phase value
    let state_path = Path::new(project_path).join(".gsd").join("STATE.md");
    let phase = if state_path.exists() {
        std::fs::read_to_string(&state_path)
            .ok()
            .and_then(|content| {
                let (fm, _) = parse_frontmatter(&content);
                fm.get("phase").cloned()
            })
    } else {
        None
    };

    Gsd2State {
        active_milestone_id,
        active_slice_id,
        active_task_id,
        phase,
        milestones_done,
        milestones_total,
        slices_done,
        slices_total,
        tasks_done,
        tasks_total,
    }
}

/// Get roadmap progress counts from a project path (testable helper without DB).
pub fn get_roadmap_progress_from_dir(project_path: &str) -> Gsd2RoadmapProgress {
    let state = derive_state_from_dir(project_path);
    Gsd2RoadmapProgress {
        milestones_done: state.milestones_done,
        milestones_total: state.milestones_total,
        slices_done: state.slices_done,
        slices_total: state.slices_total,
        tasks_done: state.tasks_done,
        tasks_total: state.tasks_total,
    }
}

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

/// Derive GSD-2 project state: active milestone/slice/task IDs and M/S/T progress counters.
#[tauri::command]
pub async fn gsd2_derive_state(
    db: tauri::State<'_, DbState>,
    project_id: String,
) -> Result<Gsd2State, String> {
    let db_guard = db.write().await;
    let project_path = get_project_path(&db_guard, &project_id)?;
    Ok(derive_state_from_dir(&project_path))
}

/// Return milestone/slice/task completion counts for a GSD-2 project.
#[tauri::command]
pub async fn gsd2_get_roadmap_progress(
    db: tauri::State<'_, DbState>,
    project_id: String,
) -> Result<Gsd2RoadmapProgress, String> {
    let db_guard = db.write().await;
    let project_path = get_project_path(&db_guard, &project_id)?;
    Ok(get_roadmap_progress_from_dir(&project_path))
}

/// Return health data for a GSD-2 project: budget spend, active unit, blockers,
/// progress counters. Reads `.gsd/STATE.md` and `.gsd/metrics.json` directly —
/// never via subprocess (per HLTH-02).
#[tauri::command]
pub async fn gsd2_get_health(
    db: tauri::State<'_, DbState>,
    project_id: String,
) -> Result<Gsd2Health, String> {
    let db_guard = db.write().await;
    let project_path = get_project_path(&db_guard, &project_id)?;
    Ok(get_health_from_dir(&project_path))
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
// Worktree structs and commands
// ============================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorktreeInfo {
    pub name: String,
    pub branch: String,
    pub path: String,
    pub exists: bool,
    pub added_count: u32,
    pub modified_count: u32,
    pub removed_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorktreeDiff {
    pub added: Vec<String>,
    pub modified: Vec<String>,
    pub removed: Vec<String>,
    pub added_count: u32,
    pub modified_count: u32,
    pub removed_count: u32,
}

fn canonicalize_path(p: &str) -> String {
    std::fs::canonicalize(std::path::Path::new(p))
        .map(|c| c.to_string_lossy().to_string())
        .unwrap_or_else(|_| p.to_string())
}

/// Parse `git worktree list --porcelain` output into a vec of (name, branch, path, exists).
/// The first block is always the main worktree — skip it.
fn parse_worktree_porcelain(output: &str) -> Vec<(String, String, String, bool)> {
    let mut result = Vec::new();

    // Split on blank lines (double newline separates worktree blocks)
    let blocks: Vec<&str> = output.split("\n\n").collect();

    // Skip the first block (main worktree)
    for block in blocks.iter().skip(1) {
        let block = block.trim();
        if block.is_empty() {
            continue;
        }

        let mut worktree_path = String::new();
        let mut branch = String::new();

        for line in block.lines() {
            if let Some(p) = line.strip_prefix("worktree ") {
                worktree_path = p.trim().to_string();
            } else if let Some(b) = line.strip_prefix("branch refs/heads/") {
                branch = b.trim().to_string();
            }
        }

        if worktree_path.is_empty() {
            continue;
        }

        // Derive name: strip "worktree/" prefix from branch if present, else use branch as-is
        let name = if branch.starts_with("worktree/") {
            branch["worktree/".len()..].to_string()
        } else if !branch.is_empty() {
            branch.clone()
        } else {
            // Fallback: last path component
            worktree_path
                .split('/')
                .last()
                .unwrap_or(&worktree_path)
                .to_string()
        };

        let exists = std::path::Path::new(&worktree_path).is_dir();
        let canonical = canonicalize_path(&worktree_path);

        result.push((name, branch, canonical, exists));
    }

    result
}

/// Parse `git diff --name-status` output into a WorktreeDiff.
/// Status chars: A/C → added, M/R → modified, D → removed.
fn parse_diff_name_status(output: &str) -> WorktreeDiff {
    let mut added = Vec::new();
    let mut modified = Vec::new();
    let mut removed = Vec::new();

    for line in output.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        // Lines are: <status_char>\t<filepath> (possibly with rename: R100\told\tnew)
        let parts: Vec<&str> = line.splitn(2, '\t').collect();
        if parts.len() < 2 {
            continue;
        }
        let status = parts[0].trim();
        let filepath = parts[1].trim().to_string();

        // For renames (R100\told\tnew), take the new path
        let filepath = if status.starts_with('R') {
            filepath.split('\t').last().unwrap_or(&filepath).to_string()
        } else {
            filepath
        };

        let status_char = status.chars().next().unwrap_or(' ');
        match status_char {
            'A' | 'C' => added.push(filepath),
            'M' | 'R' => modified.push(filepath),
            'D' => removed.push(filepath),
            _ => {}
        }
    }

    let added_count = added.len() as u32;
    let modified_count = modified.len() as u32;
    let removed_count = removed.len() as u32;

    WorktreeDiff {
        added,
        modified,
        removed,
        added_count,
        modified_count,
        removed_count,
    }
}

/// Run `git diff --name-status main...HEAD` in the given worktree directory.
/// Returns only counts. If the command fails (e.g., `main` doesn't exist), returns zeros.
fn get_diff_counts(worktree_path: &str) -> (u32, u32, u32) {
    let output = std::process::Command::new("git")
        .args(["diff", "--name-status", "main...HEAD"])
        .current_dir(worktree_path)
        .output();

    match output {
        Ok(out) if out.status.success() => {
            let text = String::from_utf8_lossy(&out.stdout);
            let diff = parse_diff_name_status(&text);
            (diff.added_count, diff.modified_count, diff.removed_count)
        }
        _ => (0, 0, 0),
    }
}

/// List all linked worktrees for a GSD-2 project.
/// Returns name, branch, canonicalized path, existence flag, and diff counts vs main.
#[tauri::command]
pub async fn gsd2_list_worktrees(
    db: tauri::State<'_, DbState>,
    project_id: String,
) -> Result<Vec<WorktreeInfo>, String> {
    let project_path = {
        let db_guard = db.write().await;
        get_project_path(&db_guard, &project_id)?
    };

    let canonical_project = canonicalize_path(&project_path);

    let output = std::process::Command::new("git")
        .args(["worktree", "list", "--porcelain"])
        .current_dir(&canonical_project)
        .output()
        .map_err(|e| format!("Failed to run git worktree list: {}", e))?;

    let text = String::from_utf8_lossy(&output.stdout);
    let entries = parse_worktree_porcelain(&text);

    let worktrees: Vec<WorktreeInfo> = entries
        .into_iter()
        .map(|(name, branch, path, exists)| {
            let (added_count, modified_count, removed_count) = if exists {
                get_diff_counts(&path)
            } else {
                (0, 0, 0)
            };
            WorktreeInfo {
                name,
                branch,
                path,
                exists,
                added_count,
                modified_count,
                removed_count,
            }
        })
        .collect();

    Ok(worktrees)
}

/// Remove a linked worktree and delete its branch.
/// Step 1: `git worktree remove .gsd/worktrees/{name} --force` — if this fails, return Err.
/// Step 2: `git branch -D worktree/{name}` — if this fails, log a warning but return Ok.
#[tauri::command]
pub async fn gsd2_remove_worktree(
    db: tauri::State<'_, DbState>,
    project_id: String,
    worktree_name: String,
) -> Result<(), String> {
    let project_path = {
        let db_guard = db.write().await;
        get_project_path(&db_guard, &project_id)?
    };

    let canonical_project = canonicalize_path(&project_path);
    let worktree_rel = format!(".gsd/worktrees/{}", worktree_name);

    // Step 1: Remove the worktree directory
    let remove_out = std::process::Command::new("git")
        .args(["worktree", "remove", &worktree_rel, "--force"])
        .current_dir(&canonical_project)
        .output()
        .map_err(|e| format!("Failed to run git worktree remove: {}", e))?;

    if !remove_out.status.success() {
        let stderr = String::from_utf8_lossy(&remove_out.stderr);
        return Err(format!("git worktree remove failed: {}", stderr));
    }

    // Step 2: Delete the branch — failure is non-fatal
    let branch_name = format!("worktree/{}", worktree_name);
    let branch_out = std::process::Command::new("git")
        .args(["branch", "-D", &branch_name])
        .current_dir(&canonical_project)
        .output();

    match branch_out {
        Ok(out) if !out.status.success() => {
            let stderr = String::from_utf8_lossy(&out.stderr);
            tracing::warn!(
                "git branch -D {} failed (non-fatal): {}",
                branch_name,
                stderr
            );
        }
        Err(e) => {
            tracing::warn!("Failed to run git branch -D {} (non-fatal): {}", branch_name, e);
        }
        _ => {}
    }

    Ok(())
}

/// Get the full diff for a worktree vs main (file lists + counts).
#[tauri::command]
pub async fn gsd2_get_worktree_diff(
    db: tauri::State<'_, DbState>,
    project_id: String,
    worktree_name: String,
) -> Result<WorktreeDiff, String> {
    let project_path = {
        let db_guard = db.write().await;
        get_project_path(&db_guard, &project_id)?
    };

    let canonical_project = canonicalize_path(&project_path);
    let worktree_path = format!("{}/.gsd/worktrees/{}", canonical_project, worktree_name);
    let canonical_worktree = canonicalize_path(&worktree_path);

    let output = std::process::Command::new("git")
        .args(["diff", "--name-status", "main...HEAD"])
        .current_dir(&canonical_worktree)
        .output();

    match output {
        Ok(out) if out.status.success() => {
            let text = String::from_utf8_lossy(&out.stdout);
            Ok(parse_diff_name_status(&text))
        }
        _ => Ok(WorktreeDiff {
            added: Vec::new(),
            modified: Vec::new(),
            removed: Vec::new(),
            added_count: 0,
            modified_count: 0,
            removed_count: 0,
        }),
    }
}

// ============================================================
// Headless session structs and commands
// ============================================================

/// Snapshot returned by gsd2_headless_query (headless --json next output).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HeadlessSnapshot {
    pub state: String,
    pub next: Option<String>,
    pub cost: f64,
}

/// Info about active processes for safe-close checking.
#[derive(Debug, Clone, Serialize)]
pub struct ActiveProcessInfo {
    pub can_close: bool,
    pub active_terminals: usize,
}

/// Query the current GSD headless state for a project by running
/// `gsd headless --json next` as a subprocess (NOT PTY).
#[tauri::command]
pub async fn gsd2_headless_query(
    project_id: String,
    db: tauri::State<'_, DbState>,
) -> Result<HeadlessSnapshot, String> {
    let project_path = {
        let db_guard = db.write().await;
        get_project_path(&db_guard, &project_id)?
    };

    let output = std::process::Command::new("gsd")
        .args(["headless", "--json", "next"])
        .current_dir(&project_path)
        .output()
        .map_err(|e| format!("Failed to run gsd headless: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);

    // Parse last valid JSON line from stdout (gsd may emit multiple lines)
    let snapshot: serde_json::Value = stdout
        .lines()
        .rev()
        .find_map(|line| serde_json::from_str(line).ok())
        .unwrap_or_else(|| serde_json::json!({}));

    Ok(HeadlessSnapshot {
        state: snapshot
            .get("state")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown")
            .to_string(),
        next: snapshot
            .get("next")
            .and_then(|v| v.as_str())
            .map(String::from),
        cost: snapshot
            .get("cost")
            .and_then(|v| v.as_f64())
            .unwrap_or(0.0),
    })
}

/// Start a headless GSD session for a project via PTY (creates a real terminal session).
/// Enforces one headless session per project.
#[tauri::command]
pub async fn gsd2_headless_start(
    app: tauri::AppHandle,
    project_id: String,
    db: tauri::State<'_, DbState>,
    terminal_manager: tauri::State<'_, crate::pty::TerminalManagerState>,
    registry: tauri::State<'_, HeadlessRegistryState>,
) -> Result<String, String> {
    let project_id_i64: i64 = project_id
        .parse()
        .map_err(|_| format!("Invalid project_id: {}", project_id))?;

    // Check for existing session for this project
    {
        let reg = registry.lock().await;
        if reg.session_for_project(project_id_i64).is_some() {
            return Err("A headless session is already running for this project".to_string());
        }
    }

    // Get project path from DB
    let project_path = {
        let db_guard = db.write().await;
        get_project_path(&db_guard, &project_id)?
    };

    let session_id = uuid::Uuid::new_v4().to_string();

    // Create PTY session
    {
        let mut manager = terminal_manager.lock().await;
        manager.create_session(
            &app,
            session_id.clone(),
            &project_path,
            Some("gsd headless"),
            80,
            24,
        )?;
    }

    // Register in headless registry
    {
        let mut reg = registry.lock().await;
        reg.register(session_id.clone(), project_id_i64);
    }

    Ok(session_id)
}

/// Stop a headless GSD session: sends SIGINT (ETX), polls for up to 5s,
/// then force-kills if still running, and unregisters from registry.
#[tauri::command]
pub async fn gsd2_headless_stop(
    app: tauri::AppHandle,
    session_id: String,
    terminal_manager: tauri::State<'_, crate::pty::TerminalManagerState>,
    registry: tauri::State<'_, HeadlessRegistryState>,
) -> Result<(), String> {
    // Send ETX (Ctrl-C / SIGINT) to the process
    {
        let mut manager = terminal_manager.lock().await;
        let _ = manager.write(&session_id, &[0x03]);
    }

    // Poll for up to 5 seconds (25 * 200ms) for graceful exit
    for _ in 0..25 {
        tokio::time::sleep(Duration::from_millis(200)).await;
        let still_active = {
            let mut manager = terminal_manager.lock().await;
            manager.is_active(&session_id)
        };
        if !still_active {
            break;
        }
    }

    // Force-kill if still active
    {
        let mut manager = terminal_manager.lock().await;
        if manager.is_active(&session_id) {
            let _ = manager.close(&app, &session_id);
        }
    }

    // Unregister from headless registry
    {
        let mut reg = registry.lock().await;
        reg.unregister(&session_id);
    }

    Ok(())
}

/// Check if it's safe to close the app (no active terminal or headless sessions).
#[tauri::command]
pub async fn can_safely_close(
    terminal_manager: tauri::State<'_, crate::pty::TerminalManagerState>,
    registry: tauri::State<'_, HeadlessRegistryState>,
) -> Result<ActiveProcessInfo, String> {
    let terminal_active = {
        let mut manager = terminal_manager.lock().await;
        manager.active_count()
    };

    let headless_active = {
        let reg = registry.lock().await;
        reg.active_count()
    };

    let total = terminal_active + headless_active;
    Ok(ActiveProcessInfo {
        can_close: total == 0,
        active_terminals: total,
    })
}

/// Force-close all sessions: gracefully stop headless sessions, then close all PTY sessions.
#[tauri::command]
pub async fn force_close_all(
    _app: tauri::AppHandle,
    terminal_manager: tauri::State<'_, crate::pty::TerminalManagerState>,
    registry: tauri::State<'_, HeadlessRegistryState>,
) -> Result<(), String> {
    // Get all headless session IDs
    let headless_ids = {
        let reg = registry.lock().await;
        reg.all_session_ids()
    };

    // Send SIGINT to each headless session
    for session_id in &headless_ids {
        let mut manager = terminal_manager.lock().await;
        let _ = manager.write(session_id, &[0x03]);
    }

    // Give processes a moment for graceful exit
    tokio::time::sleep(Duration::from_secs(2)).await;

    // Force-close all PTY sessions (includes headless and interactive)
    {
        let mut manager = terminal_manager.lock().await;
        manager.close_all();
    }

    // Clear headless registry
    {
        let mut reg = registry.lock().await;
        reg.sessions.clear();
    }

    Ok(())
}

// ============================================================
// Visualizer structs and commands
// ============================================================

/// Tree node for visualizer (milestone -> slice -> task).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VisualizerNode {
    pub id: String,
    pub title: String,
    pub status: String, // "done" | "active" | "pending"
    pub children: Vec<VisualizerNode>,
}

/// Cost aggregated by a string key (milestone_id or model name).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CostByKey {
    pub key: String,
    pub cost: f64,
}

/// A single timeline entry from the metrics ledger.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimelineEntry {
    pub id: String,
    pub title: String,
    pub entry_type: String, // "slice" | "task"
    pub completed_at: Option<String>,
    pub cost: f64,
}

/// Full visualizer dataset: tree + cost breakdowns + timeline.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VisualizerData {
    pub tree: Vec<VisualizerNode>,
    pub cost_by_milestone: Vec<CostByKey>,
    pub cost_by_model: Vec<CostByKey>,
    pub timeline: Vec<TimelineEntry>,
}

/// Return visualizer data for a GSD-2 project: milestone->slice->task tree with
/// status tags, cost breakdowns by milestone and model, and a completed timeline.
#[tauri::command]
pub async fn gsd2_get_visualizer_data(
    project_id: String,
    db: tauri::State<'_, DbState>,
) -> Result<VisualizerData, String> {
    let project_path = {
        let db_guard = db.write().await;
        get_project_path(&db_guard, &project_id)?
    };

    let milestones_dir = Path::new(&project_path).join(".gsd").join("milestones");

    // Get all milestones with their slices and tasks
    let milestones = walk_milestones_with_tasks(&milestones_dir);

    // Get active IDs from health (for status tagging)
    let health = get_health_from_dir(&project_path);
    let active_milestone_id = health.active_milestone_id.as_deref().unwrap_or("");
    let active_slice_id = health.active_slice_id.as_deref().unwrap_or("");
    let active_task_id = health.active_task_id.as_deref().unwrap_or("");

    // Build tree
    let tree: Vec<VisualizerNode> = milestones
        .iter()
        .map(|milestone| {
            let m_status = if milestone.done {
                "done"
            } else if milestone.id == active_milestone_id {
                "active"
            } else {
                "pending"
            };

            let slice_nodes: Vec<VisualizerNode> = milestone
                .slices
                .iter()
                .map(|slice| {
                    let s_status = if slice.done {
                        "done"
                    } else if slice.id == active_slice_id {
                        "active"
                    } else {
                        "pending"
                    };

                    let task_nodes: Vec<VisualizerNode> = slice
                        .tasks
                        .iter()
                        .map(|task| {
                            let t_status = if task.done {
                                "done"
                            } else if task.id == active_task_id {
                                "active"
                            } else {
                                "pending"
                            };
                            VisualizerNode {
                                id: task.id.clone(),
                                title: task.title.clone(),
                                status: t_status.to_string(),
                                children: Vec::new(),
                            }
                        })
                        .collect();

                    VisualizerNode {
                        id: slice.id.clone(),
                        title: slice.title.clone(),
                        status: s_status.to_string(),
                        children: task_nodes,
                    }
                })
                .collect();

            VisualizerNode {
                id: milestone.id.clone(),
                title: milestone.title.clone(),
                status: m_status.to_string(),
                children: slice_nodes,
            }
        })
        .collect();

    // Parse metrics.json for cost breakdowns and timeline
    let metrics_path = Path::new(&project_path).join(".gsd").join("metrics.json");
    let metrics_content = std::fs::read_to_string(&metrics_path).unwrap_or_default();
    let metrics_json: serde_json::Value =
        serde_json::from_str(&metrics_content).unwrap_or_else(|_| serde_json::json!({}));

    let empty_vec = Vec::new();
    let units = metrics_json
        .get("units")
        .and_then(|u| u.as_array())
        .unwrap_or(&empty_vec);

    let mut cost_by_milestone_map: HashMap<String, f64> = HashMap::new();
    let mut cost_by_model_map: HashMap<String, f64> = HashMap::new();
    let mut timeline: Vec<TimelineEntry> = Vec::new();

    for unit in units {
        let milestone_id = unit
            .get("milestone_id")
            .and_then(|v| v.as_str())
            .unwrap_or("unattributed")
            .to_string();
        let model = unit
            .get("model")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown")
            .to_string();
        let cost = unit.get("cost").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let completed_at = unit
            .get("completed_at")
            .and_then(|v| v.as_str())
            .map(String::from);
        let id = unit
            .get("id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let title = unit
            .get("title")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let entry_type = unit
            .get("type")
            .and_then(|v| v.as_str())
            .unwrap_or("task")
            .to_string();

        *cost_by_milestone_map.entry(milestone_id).or_insert(0.0) += cost;
        *cost_by_model_map.entry(model).or_insert(0.0) += cost;

        if completed_at.is_some() {
            timeline.push(TimelineEntry {
                id,
                title,
                entry_type,
                completed_at,
                cost,
            });
        }
    }

    // cost_by_milestone sorted by key
    let mut cost_by_milestone: Vec<CostByKey> = cost_by_milestone_map
        .into_iter()
        .map(|(key, cost)| CostByKey { key, cost })
        .collect();
    cost_by_milestone.sort_by(|a, b| a.key.cmp(&b.key));

    // cost_by_model sorted by cost descending
    let mut cost_by_model: Vec<CostByKey> = cost_by_model_map
        .into_iter()
        .map(|(key, cost)| CostByKey { key, cost })
        .collect();
    cost_by_model.sort_by(|a, b| b.cost.partial_cmp(&a.cost).unwrap_or(std::cmp::Ordering::Equal));

    // timeline sorted by completed_at descending (most recent first)
    timeline.sort_by(|a, b| {
        b.completed_at
            .as_deref()
            .cmp(&a.completed_at.as_deref())
    });

    Ok(VisualizerData {
        tree,
        cost_by_milestone,
        cost_by_model,
        timeline,
    })
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

    // ---- walk_milestones / derive_state_from_dir / get_roadmap_progress_from_dir ----

    /// Helper to build a fixture .gsd project with milestones, slices, and tasks.
    fn make_fixture_project(
        base_name: &str,
        milestones: &[(&str, &[(&str, bool, &[(&str, bool)])])],
    ) -> std::path::PathBuf {
        let dir = make_temp_dir(base_name);
        let milestones_dir = dir.join(".gsd").join("milestones");
        fs::create_dir_all(&milestones_dir).unwrap();

        for (m_id, slices) in milestones {
            let m_dir = milestones_dir.join(m_id);
            fs::create_dir_all(&m_dir).unwrap();

            let slice_lines: Vec<String> = slices
                .iter()
                .map(|(s_id, s_done, _)| {
                    let check = if *s_done { "x" } else { " " };
                    format!("- [{}] **{}: Slice Title**", check, s_id)
                })
                .collect();

            let roadmap = format!("## Slices\n{}\n", slice_lines.join("\n"));
            fs::write(m_dir.join(format!("{}-ROADMAP.md", m_id)), roadmap).unwrap();

            for (s_id, _, tasks) in slices.iter() {
                let task_lines: Vec<String> = tasks
                    .iter()
                    .map(|(t_id, t_done)| {
                        let check = if *t_done { "x" } else { " " };
                        format!("- [{}] **{}: Task Title**", check, t_id)
                    })
                    .collect();
                let plan = format!("## Tasks\n{}\n", task_lines.join("\n"));
                fs::write(m_dir.join(format!("{}-PLAN.md", s_id)), plan).unwrap();
            }
        }

        dir
    }

    #[test]
    fn walk_milestones_returns_empty_when_no_milestones_dir() {
        let dir = make_temp_dir("wm_empty");
        let milestones_dir = dir.join(".gsd").join("milestones");
        // Don't create the directory
        let result = walk_milestones_with_tasks(&milestones_dir);
        assert!(result.is_empty());
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn walk_milestones_returns_milestones_with_populated_tasks() {
        let dir = make_fixture_project(
            "wm_tasks",
            &[("M001", &[("S01", false, &[("T01", false), ("T02", true)])])],
        );
        let milestones_dir = dir.join(".gsd").join("milestones");
        let result = walk_milestones_with_tasks(&milestones_dir);
        assert_eq!(result.len(), 1);
        let m = &result[0];
        assert_eq!(m.slices.len(), 1);
        let s = &m.slices[0];
        assert_eq!(s.tasks.len(), 2);
        assert!(!s.tasks[0].done);
        assert!(s.tasks[1].done);
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn derive_state_returns_none_active_when_no_milestones() {
        let dir = make_temp_dir("ds_empty");
        fs::create_dir_all(dir.join(".gsd").join("milestones")).unwrap();
        let state = derive_state_from_dir(dir.to_str().unwrap());
        assert!(state.active_milestone_id.is_none());
        assert!(state.active_slice_id.is_none());
        assert!(state.active_task_id.is_none());
        assert_eq!(state.milestones_total, 0);
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn derive_state_returns_first_non_complete_milestone_as_active() {
        // M001: S01 done → M001 is complete
        // M002: S01 not done → M002 is the first non-complete milestone
        let dir = make_fixture_project(
            "ds_active_m",
            &[
                ("M001", &[("S01", true, &[("T01", true)])]),   // complete
                ("M002", &[("S01", false, &[("T01", false)])]), // not complete
            ],
        );
        let state = derive_state_from_dir(dir.to_str().unwrap());
        assert_eq!(state.active_milestone_id, Some("M002".to_string()));
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn derive_state_returns_first_nondone_slice_as_active_slice() {
        let dir = make_fixture_project(
            "ds_active_s",
            &[(
                "M001",
                &[
                    ("S01", true, &[("T01", true)]),   // done
                    ("S02", false, &[("T01", false)]), // not done
                ],
            )],
        );
        let state = derive_state_from_dir(dir.to_str().unwrap());
        assert_eq!(state.active_milestone_id, Some("M001".to_string()));
        assert_eq!(state.active_slice_id, Some("S02".to_string()));
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn derive_state_returns_first_nondone_task_as_active_task() {
        let dir = make_fixture_project(
            "ds_active_t",
            &[(
                "M001",
                &[("S01", false, &[("T01", true), ("T02", false)])],
            )],
        );
        let state = derive_state_from_dir(dir.to_str().unwrap());
        assert_eq!(state.active_task_id, Some("T02".to_string()));
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn derive_state_returns_none_active_when_all_milestones_complete() {
        let dir = make_fixture_project(
            "ds_all_done",
            &[
                ("M001", &[("S01", true, &[("T01", true)])]),
                ("M002", &[("S01", true, &[("T01", true)])]),
            ],
        );
        let state = derive_state_from_dir(dir.to_str().unwrap());
        assert!(state.active_milestone_id.is_none());
        assert_eq!(state.milestones_done, 2);
        assert_eq!(state.milestones_total, 2);
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn derive_state_counts_done_and_total_correctly() {
        let dir = make_fixture_project(
            "ds_counts",
            &[
                ("M001", &[("S01", true, &[("T01", true), ("T02", true)])]),
                (
                    "M002",
                    &[
                        ("S01", true, &[("T01", true)]),
                        ("S02", false, &[("T01", false), ("T02", false)]),
                    ],
                ),
            ],
        );
        let state = derive_state_from_dir(dir.to_str().unwrap());
        // M001: S01 done → M001 complete
        // M002: S01 done, S02 not done → M002 not complete
        assert_eq!(state.milestones_done, 1); // only M001 all-slices-done
        assert_eq!(state.milestones_total, 2);
        // slices: M001-S01 (done), M002-S01 (done), M002-S02 (not done) → 2 done, 3 total
        assert_eq!(state.slices_done, 2);
        assert_eq!(state.slices_total, 3);
        // tasks: M001-S01: T01 done, T02 done = 2; M002-S01: T01 done = 1; M002-S02: T01+T02 not done = 0
        assert_eq!(state.tasks_done, 3);
        assert_eq!(state.tasks_total, 5);
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn get_roadmap_progress_returns_correct_counts() {
        let dir = make_fixture_project(
            "rp_counts",
            &[
                ("M001", &[("S01", true, &[("T01", true)])]),
                ("M002", &[("S01", false, &[("T01", false)])]),
            ],
        );
        let progress = get_roadmap_progress_from_dir(dir.to_str().unwrap());
        assert_eq!(progress.milestones_done, 1);
        assert_eq!(progress.milestones_total, 2);
        assert_eq!(progress.slices_done, 1);
        assert_eq!(progress.slices_total, 2);
        assert_eq!(progress.tasks_done, 1);
        assert_eq!(progress.tasks_total, 2);
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn get_roadmap_progress_returns_zeros_when_no_milestones() {
        let dir = make_temp_dir("rp_empty");
        fs::create_dir_all(dir.join(".gsd").join("milestones")).unwrap();
        let progress = get_roadmap_progress_from_dir(dir.to_str().unwrap());
        assert_eq!(progress.milestones_done, 0);
        assert_eq!(progress.milestones_total, 0);
        assert_eq!(progress.slices_done, 0);
        assert_eq!(progress.slices_total, 0);
        assert_eq!(progress.tasks_done, 0);
        assert_eq!(progress.tasks_total, 0);
        let _ = fs::remove_dir_all(&dir);
    }
}
