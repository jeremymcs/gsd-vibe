# {{project_name}}

A Rust web API built with Axum.

## Running

```bash
cargo run
```

Server starts on `http://localhost:3000`.

## Endpoints

- `GET /health` — health check
- `GET /api/v1` — root endpoint

## Building for Release

```bash
cargo build --release
```
