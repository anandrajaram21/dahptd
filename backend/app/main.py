from datetime import date, time
from typing import Annotated, Literal

from fastapi import FastAPI, HTTPException, Query, Response
from pydantic import BaseModel

from app.analysis import dashboard

app = FastAPI(
    title="API",
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url=None,
    openapi_url="/api/openapi.json",
)


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"


@app.get("/api/health", response_model=HealthResponse)
async def health(response: Response) -> HealthResponse:
    response.headers["Cache-Control"] = "no-store"
    return HealthResponse()


@app.get("/api/dashboard")
def get_dashboard(
    decision_date: date = date(2026, 1, 15),
    cutoff: Annotated[str, Query(pattern=r"^([01]\d|2[0-3]):[0-5]\d$")] = "10:00",
):
    if not date(2026, 1, 1) <= decision_date <= date(2026, 1, 31):
        raise HTTPException(422, "Decision date must be in January 2026")
    return dashboard(decision_date, time.fromisoformat(cutoff))
