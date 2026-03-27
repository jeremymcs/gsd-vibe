from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="{{project_name}}", version="0.1.0")


class HealthResponse(BaseModel):
    status: str
    service: str


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok", service="{{project_name}}")


@app.get("/api/v1")
async def root() -> dict:
    return {"message": "Welcome to {{project_name}} API"}
