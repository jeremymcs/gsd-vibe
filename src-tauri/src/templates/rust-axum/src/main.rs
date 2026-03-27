use axum::{routing::get, Json, Router};
use serde_json::{json, Value};
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .init();

    let app = Router::new()
        .route("/health", get(health))
        .route("/api/v1", get(root));

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    tracing::info!("🚀 {{project_name}} listening on {}", listener.local_addr().unwrap());
    axum::serve(listener, app).await.unwrap();
}

async fn health() -> Json<Value> {
    Json(json!({ "status": "ok", "service": "{{project_name}}" }))
}

async fn root() -> Json<Value> {
    Json(json!({ "message": "Welcome to {{project_name}} API" }))
}
