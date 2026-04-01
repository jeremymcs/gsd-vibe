// VCCA - Headless Session Registry
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
//
// Tracks active headless GSD sessions (session_id -> project_id mapping).
// Enforces one headless session per project and supports app lifecycle cleanup.

use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;

/// Registry tracking active headless GSD sessions.
///
/// Maps session_id to project_id. Enforces one-session-per-project constraint.
/// Used alongside TerminalManager: registry tracks headless sessions separately
/// from interactive terminal sessions.
pub struct HeadlessSessionRegistry {
    /// session_id -> project_id mapping
    pub sessions: HashMap<String, String>,
}

impl HeadlessSessionRegistry {
    pub fn new() -> Self {
        Self {
            sessions: HashMap::new(),
        }
    }

    /// Register a headless session for a project.
    pub fn register(&mut self, session_id: String, project_id: String) {
        self.sessions.insert(session_id, project_id);
    }

    /// Unregister a headless session by session_id.
    pub fn unregister(&mut self, session_id: &str) {
        self.sessions.remove(session_id);
    }

    /// Get the project_id associated with a session_id.
    #[allow(dead_code)]
    pub fn get_project_id(&self, session_id: &str) -> Option<&str> {
        self.sessions.get(session_id).map(|s| s.as_str())
    }

    /// Find the session_id for a given project_id (for one-per-project enforcement).
    pub fn session_for_project(&self, project_id: &str) -> Option<String> {
        self.sessions
            .iter()
            .find(|(_, pid)| pid.as_str() == project_id)
            .map(|(sid, _)| sid.clone())
    }

    /// Get all registered session IDs.
    pub fn all_session_ids(&self) -> Vec<String> {
        self.sessions.keys().cloned().collect()
    }

    /// Count of active headless sessions.
    pub fn active_count(&self) -> usize {
        self.sessions.len()
    }
}

/// Managed Tauri state type for HeadlessSessionRegistry.
pub type HeadlessRegistryState = Arc<Mutex<HeadlessSessionRegistry>>;
