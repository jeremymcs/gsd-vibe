// GSD VibeFlow - Dependency Status Commands
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

use crate::models::DependencyStatus;
use rusqlite::params;
use std::path::Path;
use std::sync::Arc;

type DbState = Arc<crate::db::DbPool>;

/// Get dependency status for a project by checking its package manager
/// Caches results in dependency_cache table
#[tauri::command]
pub async fn get_dependency_status(
    db: tauri::State<'_, DbState>,
    project_id: String,
    project_path: String,
) -> Result<DependencyStatus, String> {
    // Check cache first (within 15 minutes)
    {
        let db_guard = db.write().await;
        let conn = db_guard.conn();

        let cached: Option<(String, String)> = conn
            .query_row(
                "SELECT status, checked_at FROM dependency_cache
                 WHERE project_id = ?1
                 AND datetime(checked_at, '+15 minutes') > datetime('now')",
                params![project_id],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .ok();

        if let Some((status_json, checked_at)) = cached {
            if let Ok(mut status) = serde_json::from_str::<DependencyStatus>(&status_json) {
                status.checked_at = checked_at;
                return Ok(status);
            }
        }
    }

    // Detect package manager and run audit
    let path = Path::new(&project_path);
    let status = if path.join("package.json").exists() {
        run_npm_audit(&project_path).await
    } else if path.join("Cargo.toml").exists() {
        run_cargo_audit(&project_path).await
    } else if path.join("pyproject.toml").exists() || path.join("requirements.txt").exists() {
        run_pip_audit(&project_path).await
    } else {
        Ok(DependencyStatus {
            package_manager: "unknown".to_string(),
            outdated_count: 0,
            vulnerable_count: 0,
            details: None,
            checked_at: String::new(),
        })
    }?;

    // Cache the result
    let status_json = serde_json::to_string(&status).map_err(|e| e.to_string())?;
    {
        let db_guard = db.write().await;
        let conn = db_guard.conn();

        conn.execute(
            "INSERT INTO dependency_cache (project_id, status, checked_at)
             VALUES (?1, ?2, datetime('now'))
             ON CONFLICT(project_id) DO UPDATE SET status = ?2, checked_at = datetime('now')",
            params![project_id, status_json],
        )
        .map_err(|e| e.to_string())?;

        // Get the actual checked_at from DB
        let checked_at: String = conn
            .query_row(
                "SELECT checked_at FROM dependency_cache WHERE project_id = ?1",
                params![project_id],
                |row| row.get(0),
            )
            .unwrap_or_else(|_| "unknown".to_string());

        let mut result = status;
        result.checked_at = checked_at;
        Ok(result)
    }
}

async fn run_npm_audit(project_path: &str) -> Result<DependencyStatus, String> {
    let output: std::process::Output = tokio::time::timeout(
        std::time::Duration::from_secs(30),
        tokio::process::Command::new("npm")
            .args(["audit", "--json"])
            .current_dir(project_path)
            .output(),
    )
    .await
    .map_err(|_| "npm audit timed out after 30s".to_string())?
    .map_err(|e| format!("Failed to run npm audit: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let details: Option<serde_json::Value> = serde_json::from_str(&stdout).ok();

    let vulnerable_count = details
        .as_ref()
        .and_then(|d| d.get("metadata"))
        .and_then(|m| m.get("vulnerabilities"))
        .and_then(|v| v.as_object())
        .map(|vulns| vulns.values().filter_map(|v| v.as_i64()).sum::<i64>() as i32)
        .unwrap_or(0);

    // Check outdated
    let outdated_output: std::process::Output = tokio::time::timeout(
        std::time::Duration::from_secs(30),
        tokio::process::Command::new("npm")
            .args(["outdated", "--json"])
            .current_dir(project_path)
            .output(),
    )
    .await
    .map_err(|_| "npm outdated timed out".to_string())?
    .map_err(|e| format!("Failed to run npm outdated: {}", e))?;

    let outdated_stdout = String::from_utf8_lossy(&outdated_output.stdout);
    let outdated_json: Option<serde_json::Value> = serde_json::from_str(&outdated_stdout).ok();
    let outdated_count = outdated_json
        .as_ref()
        .and_then(|v| v.as_object().map(|o| o.len() as i32))
        .unwrap_or(0);

    // Merge audit + outdated into a single details object
    let merged_details = {
        let mut obj = serde_json::Map::new();
        if let Some(audit) = details {
            obj.insert("audit".to_string(), audit);
        }
        if let Some(outdated) = outdated_json {
            obj.insert("outdated".to_string(), outdated);
        }
        Some(serde_json::Value::Object(obj))
    };

    Ok(DependencyStatus {
        package_manager: "npm".to_string(),
        outdated_count,
        vulnerable_count,
        details: merged_details,
        checked_at: String::new(),
    })
}

async fn run_cargo_audit(project_path: &str) -> Result<DependencyStatus, String> {
    let output = tokio::time::timeout(
        std::time::Duration::from_secs(30),
        tokio::process::Command::new("cargo")
            .args(["audit", "--json"])
            .current_dir(project_path)
            .output(),
    )
    .await;

    match output {
        Ok(Ok(out)) => {
            let stdout = String::from_utf8_lossy(&out.stdout);
            let details: Option<serde_json::Value> = serde_json::from_str(&stdout).ok();

            let vulnerable_count = details
                .as_ref()
                .and_then(|d| d.get("vulnerabilities"))
                .and_then(|v| v.get("found"))
                .and_then(|f| f.as_i64())
                .unwrap_or(0) as i32;

            Ok(DependencyStatus {
                package_manager: "cargo".to_string(),
                outdated_count: 0,
                vulnerable_count,
                details,
                checked_at: String::new(),
            })
        }
        _ => {
            // cargo-audit may not be installed
            Ok(DependencyStatus {
                package_manager: "cargo".to_string(),
                outdated_count: 0,
                vulnerable_count: 0,
                details: Some(serde_json::json!({"note": "cargo-audit not available"})),
                checked_at: String::new(),
            })
        }
    }
}

/// Invalidate the dependency cache for a project, forcing a fresh scan on next query
#[tauri::command]
pub async fn invalidate_dependency_cache(
    db: tauri::State<'_, DbState>,
    project_id: String,
) -> Result<bool, String> {
    let db_guard = db.write().await;
    let conn = db_guard.conn();

    conn.execute(
        "DELETE FROM dependency_cache WHERE project_id = ?1",
        params![project_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(true)
}

async fn run_pip_audit(project_path: &str) -> Result<DependencyStatus, String> {
    let output = tokio::time::timeout(
        std::time::Duration::from_secs(30),
        tokio::process::Command::new("pip-audit")
            .args(["--format", "json"])
            .current_dir(project_path)
            .output(),
    )
    .await;

    match output {
        Ok(Ok(out)) => {
            let stdout = String::from_utf8_lossy(&out.stdout);
            let details: Option<serde_json::Value> = serde_json::from_str(&stdout).ok();

            let vulnerable_count = details
                .as_ref()
                .and_then(|d| d.as_array())
                .map(|arr| arr.len() as i32)
                .unwrap_or(0);

            Ok(DependencyStatus {
                package_manager: "pip".to_string(),
                outdated_count: 0,
                vulnerable_count,
                details,
                checked_at: String::new(),
            })
        }
        _ => Ok(DependencyStatus {
            package_manager: "pip".to_string(),
            outdated_count: 0,
            vulnerable_count: 0,
            details: Some(serde_json::json!({"note": "pip-audit not available"})),
            checked_at: String::new(),
        }),
    }
}

