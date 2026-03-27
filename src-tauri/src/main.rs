// GSD Vibe - Main Entry Point
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

// Prevents additional console window on Windows in release
#![cfg_attr(all(not(debug_assertions)), windows_subsystem = "windows")]

fn main() {
    gsd_vibeflow_lib::run()
}
